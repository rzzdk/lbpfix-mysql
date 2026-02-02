import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { getCurrentUser, hashPassword, isAdmin } from '@/lib/auth';
import type { User } from '@/lib/types';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

interface UserRow extends RowDataPacket {
  id: string;
  username: string;
  name: string;
  role: 'employee' | 'admin';
  department: string;
  position: string;
  email: string;
  phone: string;
  is_active: boolean;
  created_at: string;
}

type RouteParams = { params: Promise<{ id: string }> };

// GET: Fetch single user by ID
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Tidak terautentikasi' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Users can only view their own profile unless they're admin
    if (currentUser.id !== id && !(await isAdmin())) {
      return NextResponse.json(
        { error: 'Akses ditolak' },
        { status: 403 }
      );
    }

    const userRow = await queryOne<UserRow>(
      'SELECT id, username, name, role, department, position, email, phone, is_active, created_at FROM users WHERE id = ? AND is_active = TRUE',
      [id]
    );

    if (!userRow) {
      return NextResponse.json(
        { error: 'User tidak ditemukan' },
        { status: 404 }
      );
    }

    const user: User = {
      id: userRow.id,
      username: userRow.username,
      password: '',
      name: userRow.name,
      role: userRow.role,
      department: userRow.department,
      position: userRow.position,
      email: userRow.email,
      phone: userRow.phone || '',
      createdAt: userRow.created_at,
    };

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('[API] Get user error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

// PUT: Update user
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Tidak terautentikasi' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Users can only update their own profile unless they're admin
    const isAdminUser = await isAdmin();
    if (currentUser.id !== id && !isAdminUser) {
      return NextResponse.json(
        { error: 'Akses ditolak' },
        { status: 403 }
      );
    }

    // Check if user exists
    const existingUser = await queryOne<UserRow>(
      'SELECT id FROM users WHERE id = ? AND is_active = TRUE',
      [id]
    );

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User tidak ditemukan' },
        { status: 404 }
      );
    }

    // Check if username is taken by another user
    if (body.username) {
      const usernameExists = await queryOne<UserRow>(
        'SELECT id FROM users WHERE username = ? AND id != ?',
        [body.username, id]
      );

      if (usernameExists) {
        return NextResponse.json(
          { error: 'Username sudah digunakan' },
          { status: 400 }
        );
      }
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: unknown[] = [];

    const allowedFields = ['username', 'name', 'department', 'position', 'email', 'phone'];
    
    // Only admin can update role
    if (isAdminUser) {
      allowedFields.push('role');
    }

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(body[field]);
      }
    }

    // Handle password update separately
    if (body.password) {
      const hashedPassword = await hashPassword(body.password);
      updates.push('password = ?');
      values.push(hashedPassword);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'Tidak ada data yang diupdate' },
        { status: 400 }
      );
    }

    values.push(id);

    await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    // Fetch updated user
    const updatedUser = await queryOne<UserRow>(
      'SELECT id, username, name, role, department, position, email, phone, is_active, created_at FROM users WHERE id = ?',
      [id]
    );

    const user: User = {
      id: updatedUser!.id,
      username: updatedUser!.username,
      password: '',
      name: updatedUser!.name,
      role: updatedUser!.role,
      department: updatedUser!.department,
      position: updatedUser!.position,
      email: updatedUser!.email,
      phone: updatedUser!.phone || '',
      createdAt: updatedUser!.created_at,
    };

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('[API] Update user error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

// DELETE: Soft delete user (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Tidak terautentikasi' },
        { status: 401 }
      );
    }

    if (!(await isAdmin())) {
      return NextResponse.json(
        { error: 'Akses ditolak' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Prevent self-deletion
    if (currentUser.id === id) {
      return NextResponse.json(
        { error: 'Tidak dapat menghapus akun sendiri' },
        { status: 400 }
      );
    }

    // Soft delete (set is_active to false)
    const result = await query<ResultSetHeader>(
      'UPDATE users SET is_active = FALSE WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { error: 'User tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'User berhasil dihapus',
    });
  } catch (error) {
    console.error('[API] Delete user error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

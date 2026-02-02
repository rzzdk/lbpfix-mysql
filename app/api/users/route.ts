import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser, createUser, isAdmin } from '@/lib/auth';
import type { User } from '@/lib/types';
import type { RowDataPacket } from 'mysql2';

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

// GET: Fetch all users (admin only)
export async function GET() {
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

    const userRows = await query<UserRow[]>(
      'SELECT id, username, name, role, department, position, email, phone, is_active, created_at FROM users WHERE is_active = TRUE ORDER BY name'
    );

    const users: User[] = userRows.map((row) => ({
      id: row.id,
      username: row.username,
      password: '',
      name: row.name,
      role: row.role,
      department: row.department,
      position: row.position,
      email: row.email,
      phone: row.phone || '',
      createdAt: row.created_at,
    }));

    return NextResponse.json({
      success: true,
      users,
    });
  } catch (error) {
    console.error('[API] Get users error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

// POST: Create new user (admin only)
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { username, password, name, role, department, position, email, phone } = body;

    // Validation
    if (!username || !password || !name || !role || !department || !position || !email) {
      return NextResponse.json(
        { error: 'Semua field wajib diisi' },
        { status: 400 }
      );
    }

    const result = await createUser({
      username,
      password,
      name,
      role,
      department,
      position,
      email,
      phone: phone || '',
    });

    if ('error' in result) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      user: result,
    }, { status: 201 });
  } catch (error) {
    console.error('[API] Create user error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

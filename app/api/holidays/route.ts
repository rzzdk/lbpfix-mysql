import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import type { Holiday } from '@/lib/types';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

interface HolidayRow extends RowDataPacket {
  id: number;
  date: string;
  name: string;
  is_active: boolean;
}

function mapRowToHoliday(row: HolidayRow): Holiday {
  return {
    date: row.date,
    name: row.name,
  };
}

// GET: Fetch holidays
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Tidak terautentikasi' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');

    let sql = 'SELECT * FROM holidays WHERE is_active = TRUE';
    const params: unknown[] = [];

    if (year) {
      sql += ' AND YEAR(date) = ?';
      params.push(parseInt(year, 10));
    }

    sql += ' ORDER BY date';

    const rows = await query<HolidayRow[]>(sql, params);
    const holidays = rows.map(mapRowToHoliday);

    return NextResponse.json({
      success: true,
      holidays,
    });
  } catch (error) {
    console.error('[API] Get holidays error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

// POST: Add holiday (admin only)
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
    const { date, name } = body;

    if (!date || !name) {
      return NextResponse.json(
        { error: 'Tanggal dan nama hari libur wajib diisi' },
        { status: 400 }
      );
    }

    // Check if date already exists
    const existing = await queryOne<HolidayRow>(
      'SELECT * FROM holidays WHERE date = ?',
      [date]
    );

    if (existing) {
      return NextResponse.json(
        { error: 'Tanggal libur sudah ada' },
        { status: 400 }
      );
    }

    await query(
      'INSERT INTO holidays (date, name) VALUES (?, ?)',
      [date, name]
    );

    // Fetch all holidays
    const rows = await query<HolidayRow[]>(
      'SELECT * FROM holidays WHERE is_active = TRUE ORDER BY date'
    );

    return NextResponse.json({
      success: true,
      holidays: rows.map(mapRowToHoliday),
      message: 'Hari libur berhasil ditambahkan',
    }, { status: 201 });
  } catch (error) {
    console.error('[API] Add holiday error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

// PUT: Update holiday (admin only)
export async function PUT(request: NextRequest) {
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
    const { oldDate, date, name } = body;

    if (!oldDate) {
      return NextResponse.json(
        { error: 'Tanggal lama wajib diisi' },
        { status: 400 }
      );
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (date) {
      // Check if new date conflicts with existing
      if (date !== oldDate) {
        const existing = await queryOne<HolidayRow>(
          'SELECT * FROM holidays WHERE date = ?',
          [date]
        );

        if (existing) {
          return NextResponse.json(
            { error: 'Tanggal libur sudah ada' },
            { status: 400 }
          );
        }
      }
      updates.push('date = ?');
      values.push(date);
    }

    if (name) {
      updates.push('name = ?');
      values.push(name);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'Tidak ada data yang diupdate' },
        { status: 400 }
      );
    }

    values.push(oldDate);

    await query(
      `UPDATE holidays SET ${updates.join(', ')} WHERE date = ?`,
      values
    );

    // Fetch all holidays
    const rows = await query<HolidayRow[]>(
      'SELECT * FROM holidays WHERE is_active = TRUE ORDER BY date'
    );

    return NextResponse.json({
      success: true,
      holidays: rows.map(mapRowToHoliday),
      message: 'Hari libur berhasil diupdate',
    });
  } catch (error) {
    console.error('[API] Update holiday error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

// DELETE: Delete holiday (admin only)
export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json(
        { error: 'Tanggal wajib diisi' },
        { status: 400 }
      );
    }

    const result = await query<ResultSetHeader>(
      'DELETE FROM holidays WHERE date = ?',
      [date]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { error: 'Hari libur tidak ditemukan' },
        { status: 404 }
      );
    }

    // Fetch all holidays
    const rows = await query<HolidayRow[]>(
      'SELECT * FROM holidays WHERE is_active = TRUE ORDER BY date'
    );

    return NextResponse.json({
      success: true,
      holidays: rows.map(mapRowToHoliday),
      message: 'Hari libur berhasil dihapus',
    });
  } catch (error) {
    console.error('[API] Delete holiday error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

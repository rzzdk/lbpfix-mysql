import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import type { WorkSchedule } from '@/lib/types';
import type { RowDataPacket } from 'mysql2';

interface WorkScheduleRow extends RowDataPacket {
  id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  min_work_hours: number;
  is_active: boolean;
}

function mapRowToSchedule(row: WorkScheduleRow): WorkSchedule {
  return {
    dayOfWeek: row.day_of_week,
    startTime: row.start_time,
    endTime: row.end_time,
    minWorkHours: row.min_work_hours,
  };
}

// GET: Fetch work schedules
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Tidak terautentikasi' },
        { status: 401 }
      );
    }

    const rows = await query<WorkScheduleRow[]>(
      'SELECT * FROM work_schedules WHERE is_active = TRUE ORDER BY day_of_week'
    );

    const schedules = rows.map(mapRowToSchedule);

    return NextResponse.json({
      success: true,
      schedules,
    });
  } catch (error) {
    console.error('[API] Get schedules error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

// PUT: Update work schedule (admin only)
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
    const { dayOfWeek, startTime, endTime, minWorkHours } = body;

    if (dayOfWeek === undefined || dayOfWeek < 0 || dayOfWeek > 6) {
      return NextResponse.json(
        { error: 'Hari tidak valid' },
        { status: 400 }
      );
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (startTime) {
      updates.push('start_time = ?');
      values.push(startTime);
    }

    if (endTime) {
      updates.push('end_time = ?');
      values.push(endTime);
    }

    if (minWorkHours !== undefined) {
      updates.push('min_work_hours = ?');
      values.push(minWorkHours);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'Tidak ada data yang diupdate' },
        { status: 400 }
      );
    }

    values.push(dayOfWeek);

    await query(
      `UPDATE work_schedules SET ${updates.join(', ')} WHERE day_of_week = ?`,
      values
    );

    // Fetch all schedules
    const rows = await query<WorkScheduleRow[]>(
      'SELECT * FROM work_schedules WHERE is_active = TRUE ORDER BY day_of_week'
    );

    return NextResponse.json({
      success: true,
      schedules: rows.map(mapRowToSchedule),
      message: 'Jadwal berhasil diupdate',
    });
  } catch (error) {
    console.error('[API] Update schedule error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

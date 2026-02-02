import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import type { OvertimeRecord } from '@/lib/types';
import type { RowDataPacket } from 'mysql2';

interface OvertimeRow extends RowDataPacket {
  id: string;
  user_id: string;
  date: string;
  start_time: string;
  end_time: string | null;
  duration: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_by: string | null;
}

interface AttendanceRow extends RowDataPacket {
  check_in_time: string | null;
  check_out_time: string | null;
  work_hours: number;
}

interface WorkScheduleRow extends RowDataPacket {
  min_work_hours: number;
}

function mapRowToOvertimeRecord(row: OvertimeRow): OvertimeRecord {
  return {
    id: row.id,
    userId: row.user_id,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    duration: row.duration,
    reason: row.reason,
    status: row.status,
    approvedBy: row.approved_by,
  };
}

// GET: Fetch overtime records
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
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');

    let sql = 'SELECT * FROM overtime_records WHERE 1=1';
    const params: unknown[] = [];

    // Non-admin can only see their own records
    if (!(await isAdmin())) {
      sql += ' AND user_id = ?';
      params.push(currentUser.id);
    } else if (userId) {
      sql += ' AND user_id = ?';
      params.push(userId);
    }

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY date DESC, start_time DESC';

    const rows = await query<OvertimeRow[]>(sql, params);
    const records = rows.map(mapRowToOvertimeRecord);

    return NextResponse.json({
      success: true,
      records,
    });
  } catch (error) {
    console.error('[API] Get overtime error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

// POST: Start overtime
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Tidak terautentikasi' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { reason } = body;

    if (!reason) {
      return NextResponse.json(
        { error: 'Alasan lembur wajib diisi' },
        { status: 400 }
      );
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const timeString = now.toTimeString().slice(0, 5);
    const dayOfWeek = now.getDay();

    // Check if user has checked in and out today
    const attendance = await queryOne<AttendanceRow>(
      'SELECT * FROM attendance_records WHERE user_id = ? AND date = ?',
      [currentUser.id, today]
    );

    if (!attendance?.check_in_time) {
      return NextResponse.json(
        { error: 'Anda harus check-in terlebih dahulu' },
        { status: 400 }
      );
    }

    if (!attendance.check_out_time) {
      return NextResponse.json(
        { error: 'Anda harus check-out terlebih dahulu' },
        { status: 400 }
      );
    }

    // Check if minimum work hours met
    const schedule = await queryOne<WorkScheduleRow>(
      'SELECT min_work_hours FROM work_schedules WHERE day_of_week = ?',
      [dayOfWeek]
    );

    if (attendance.work_hours < (schedule?.min_work_hours || 8)) {
      return NextResponse.json(
        { error: `Anda harus memenuhi minimal ${schedule?.min_work_hours || 8} jam kerja sebelum lembur` },
        { status: 400 }
      );
    }

    // Check if overtime already exists today
    const existingOvertime = await queryOne<OvertimeRow>(
      'SELECT * FROM overtime_records WHERE user_id = ? AND date = ? AND end_time IS NULL',
      [currentUser.id, today]
    );

    if (existingOvertime) {
      return NextResponse.json(
        { error: 'Anda sudah memiliki lembur yang sedang berjalan' },
        { status: 400 }
      );
    }

    const overtimeId = `ot-${Date.now()}`;

    await query(
      `INSERT INTO overtime_records (id, user_id, date, start_time, reason, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [overtimeId, currentUser.id, today, timeString, reason]
    );

    const newRecord = await queryOne<OvertimeRow>(
      'SELECT * FROM overtime_records WHERE id = ?',
      [overtimeId]
    );

    return NextResponse.json({
      success: true,
      record: mapRowToOvertimeRecord(newRecord!),
      message: 'Lembur dimulai',
    }, { status: 201 });
  } catch (error) {
    console.error('[API] Start overtime error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

// PUT: End overtime or approve/reject (admin)
export async function PUT(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Tidak terautentikasi' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, overtimeId, approved } = body;

    if (action === 'end') {
      // End user's current overtime
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const timeString = now.toTimeString().slice(0, 5);

      const overtime = await queryOne<OvertimeRow>(
        'SELECT * FROM overtime_records WHERE user_id = ? AND date = ? AND end_time IS NULL',
        [currentUser.id, today]
      );

      if (!overtime) {
        return NextResponse.json(
          { error: 'Tidak ada lembur yang sedang berjalan' },
          { status: 400 }
        );
      }

      // Calculate duration
      const startMinutes = parseInt(overtime.start_time.split(':')[0]) * 60 + parseInt(overtime.start_time.split(':')[1]);
      const endMinutes = parseInt(timeString.split(':')[0]) * 60 + parseInt(timeString.split(':')[1]);
      const duration = Math.max(0, (endMinutes - startMinutes) / 60);

      await query(
        'UPDATE overtime_records SET end_time = ?, duration = ? WHERE id = ?',
        [timeString, duration, overtime.id]
      );

      const updatedRecord = await queryOne<OvertimeRow>(
        'SELECT * FROM overtime_records WHERE id = ?',
        [overtime.id]
      );

      return NextResponse.json({
        success: true,
        record: mapRowToOvertimeRecord(updatedRecord!),
        message: 'Lembur selesai',
      });
    }

    if (action === 'approve' || action === 'reject') {
      // Admin only
      if (!(await isAdmin())) {
        return NextResponse.json(
          { error: 'Akses ditolak' },
          { status: 403 }
        );
      }

      if (!overtimeId) {
        return NextResponse.json(
          { error: 'ID lembur wajib diisi' },
          { status: 400 }
        );
      }

      const status = action === 'approve' ? 'approved' : 'rejected';

      await query(
        'UPDATE overtime_records SET status = ?, approved_by = ?, approved_at = NOW() WHERE id = ?',
        [status, currentUser.id, overtimeId]
      );

      const updatedRecord = await queryOne<OvertimeRow>(
        'SELECT * FROM overtime_records WHERE id = ?',
        [overtimeId]
      );

      if (!updatedRecord) {
        return NextResponse.json(
          { error: 'Data lembur tidak ditemukan' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        record: mapRowToOvertimeRecord(updatedRecord),
        message: `Lembur ${status === 'approved' ? 'disetujui' : 'ditolak'}`,
      });
    }

    return NextResponse.json(
      { error: 'Action tidak valid' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[API] Overtime action error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

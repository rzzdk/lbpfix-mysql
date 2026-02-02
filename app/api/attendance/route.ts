import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import type { AttendanceRecord } from '@/lib/types';
import type { RowDataPacket } from 'mysql2';

interface AttendanceRow extends RowDataPacket {
  id: string;
  user_id: string;
  date: string;
  check_in_time: string | null;
  check_in_photo: string | null;
  check_in_latitude: number | null;
  check_in_longitude: number | null;
  check_in_address: string | null;
  check_out_time: string | null;
  check_out_photo: string | null;
  check_out_latitude: number | null;
  check_out_longitude: number | null;
  check_out_address: string | null;
  status: 'present' | 'late' | 'absent' | 'holiday';
  work_hours: number;
}

interface WorkScheduleRow extends RowDataPacket {
  day_of_week: number;
  start_time: string;
  end_time: string;
  min_work_hours: number;
}

function mapRowToAttendanceRecord(row: AttendanceRow): AttendanceRecord {
  return {
    id: row.id,
    userId: row.user_id,
    date: row.date,
    checkIn: row.check_in_time ? {
      time: row.check_in_time,
      photo: row.check_in_photo || '',
      location: {
        latitude: row.check_in_latitude || 0,
        longitude: row.check_in_longitude || 0,
        address: row.check_in_address || '',
      },
    } : null,
    checkOut: row.check_out_time ? {
      time: row.check_out_time,
      photo: row.check_out_photo || '',
      location: {
        latitude: row.check_out_latitude || 0,
        longitude: row.check_out_longitude || 0,
        address: row.check_out_address || '',
      },
    } : null,
    status: row.status,
    workHours: row.work_hours,
    overtime: null,
  };
}

// GET: Fetch attendance records
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
    const date = searchParams.get('date');
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    let sql = 'SELECT * FROM attendance_records WHERE 1=1';
    const params: unknown[] = [];

    // Non-admin can only see their own records
    if (!(await isAdmin())) {
      sql += ' AND user_id = ?';
      params.push(currentUser.id);
    } else if (userId) {
      sql += ' AND user_id = ?';
      params.push(userId);
    }

    if (date) {
      sql += ' AND date = ?';
      params.push(date);
    }

    if (month && year) {
      sql += ' AND MONTH(date) = ? AND YEAR(date) = ?';
      params.push(parseInt(month, 10), parseInt(year, 10));
    }

    sql += ' ORDER BY date DESC, check_in_time DESC';

    const rows = await query<AttendanceRow[]>(sql, params);
    const records = rows.map(mapRowToAttendanceRecord);

    return NextResponse.json({
      success: true,
      records,
    });
  } catch (error) {
    console.error('[API] Get attendance error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

// POST: Check-in
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
    const { action, photo, location } = body;

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const timeString = now.toTimeString().slice(0, 5);
    const dayOfWeek = now.getDay();

    // Get work schedule for today
    const schedule = await queryOne<WorkScheduleRow>(
      'SELECT * FROM work_schedules WHERE day_of_week = ?',
      [dayOfWeek]
    );

    if (!schedule) {
      return NextResponse.json(
        { error: 'Jadwal kerja tidak ditemukan' },
        { status: 400 }
      );
    }

    if (action === 'check-in') {
      // Check if already checked in
      const existing = await queryOne<AttendanceRow>(
        'SELECT * FROM attendance_records WHERE user_id = ? AND date = ?',
        [currentUser.id, today]
      );

      if (existing?.check_in_time) {
        return NextResponse.json(
          { error: 'Anda sudah melakukan check-in hari ini' },
          { status: 400 }
        );
      }

      // Determine if late
      const isLate = timeString > schedule.start_time;
      const status = isLate ? 'late' : 'present';

      const recordId = `att-${Date.now()}`;

      if (existing) {
        // Update existing record
        await query(
          `UPDATE attendance_records SET 
           check_in_time = ?, check_in_photo = ?, check_in_latitude = ?, 
           check_in_longitude = ?, check_in_address = ?, status = ?
           WHERE id = ?`,
          [timeString, photo, location.latitude, location.longitude, location.address, status, existing.id]
        );
      } else {
        // Create new record
        await query(
          `INSERT INTO attendance_records 
           (id, user_id, date, check_in_time, check_in_photo, check_in_latitude, check_in_longitude, check_in_address, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [recordId, currentUser.id, today, timeString, photo, location.latitude, location.longitude, location.address, status]
        );
      }

      // Fetch the updated/created record
      const updatedRecord = await queryOne<AttendanceRow>(
        'SELECT * FROM attendance_records WHERE user_id = ? AND date = ?',
        [currentUser.id, today]
      );

      return NextResponse.json({
        success: true,
        record: mapRowToAttendanceRecord(updatedRecord!),
        message: isLate ? 'Check-in berhasil (Terlambat)' : 'Check-in berhasil',
      });
    }

    if (action === 'check-out') {
      // Check if checked in
      const existing = await queryOne<AttendanceRow>(
        'SELECT * FROM attendance_records WHERE user_id = ? AND date = ?',
        [currentUser.id, today]
      );

      if (!existing?.check_in_time) {
        return NextResponse.json(
          { error: 'Anda belum melakukan check-in hari ini' },
          { status: 400 }
        );
      }

      if (existing.check_out_time) {
        return NextResponse.json(
          { error: 'Anda sudah melakukan check-out hari ini' },
          { status: 400 }
        );
      }

      // Calculate work hours
      const checkInTime = existing.check_in_time.split(':').map(Number);
      const checkOutTime = timeString.split(':').map(Number);
      const checkInMinutes = checkInTime[0] * 60 + checkInTime[1];
      const checkOutMinutes = checkOutTime[0] * 60 + checkOutTime[1];
      const workHours = (checkOutMinutes - checkInMinutes) / 60;

      // Validate minimum work hours
      if (workHours < schedule.min_work_hours) {
        const remainingHours = schedule.min_work_hours - workHours;
        const remainingMinutes = Math.ceil(remainingHours * 60);
        const hours = Math.floor(remainingMinutes / 60);
        const minutes = remainingMinutes % 60;
        const timeRemaining = hours > 0 
          ? `${hours} jam ${minutes} menit` 
          : `${minutes} menit`;
        return NextResponse.json(
          { error: `Anda belum memenuhi jam kerja minimal (${schedule.min_work_hours} jam). Sisa waktu: ${timeRemaining}` },
          { status: 400 }
        );
      }

      // Update record
      await query(
        `UPDATE attendance_records SET 
         check_out_time = ?, check_out_photo = ?, check_out_latitude = ?, 
         check_out_longitude = ?, check_out_address = ?, work_hours = ?
         WHERE id = ?`,
        [timeString, photo, location.latitude, location.longitude, location.address, Math.max(0, workHours), existing.id]
      );

      // Fetch the updated record
      const updatedRecord = await queryOne<AttendanceRow>(
        'SELECT * FROM attendance_records WHERE id = ?',
        [existing.id]
      );

      return NextResponse.json({
        success: true,
        record: mapRowToAttendanceRecord(updatedRecord!),
        message: 'Check-out berhasil',
      });
    }

    return NextResponse.json(
      { error: 'Action tidak valid' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[API] Attendance action error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

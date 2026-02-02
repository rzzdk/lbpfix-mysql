import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import type { RowDataPacket } from 'mysql2';

interface StatsRow extends RowDataPacket {
  present: number;
  late: number;
  absent: number;
  total_work_hours: number;
  total: number;
}

// GET: Fetch attendance statistics
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
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    const now = new Date();
    const targetMonth = month ? parseInt(month, 10) : now.getMonth() + 1; // SQL months are 1-indexed
    const targetYear = year ? parseInt(year, 10) : now.getFullYear();

    // Determine which user's stats to fetch
    let targetUserId: string;
    if (await isAdmin() && userId) {
      targetUserId = userId;
    } else {
      targetUserId = currentUser.id;
    }

    const stats = await query<StatsRow[]>(
      `SELECT 
        COUNT(CASE WHEN status = 'present' THEN 1 END) AS present,
        COUNT(CASE WHEN status = 'late' THEN 1 END) AS late,
        COUNT(CASE WHEN status = 'absent' THEN 1 END) AS absent,
        COALESCE(SUM(work_hours), 0) AS total_work_hours,
        COUNT(*) AS total
      FROM attendance_records
      WHERE user_id = ?
      AND MONTH(date) = ?
      AND YEAR(date) = ?`,
      [targetUserId, targetMonth, targetYear]
    );

    const result = stats[0] || {
      present: 0,
      late: 0,
      absent: 0,
      total_work_hours: 0,
      total: 0,
    };

    return NextResponse.json({
      success: true,
      stats: {
        present: Number(result.present) || 0,
        late: Number(result.late) || 0,
        absent: Number(result.absent) || 0,
        totalWorkHours: Number(result.total_work_hours) || 0,
        total: Number(result.total) || 0,
      },
    });
  } catch (error) {
    console.error('[API] Get stats error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

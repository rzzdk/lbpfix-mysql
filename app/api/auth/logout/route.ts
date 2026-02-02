import { NextResponse } from 'next/server';
import { logoutUser } from '@/lib/auth';

export async function POST() {
  try {
    await logoutUser();

    return NextResponse.json({
      success: true,
      message: 'Berhasil logout',
    });
  } catch (error) {
    console.error('[API] Logout error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}

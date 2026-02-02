import { NextResponse } from 'next/server';
import { checkConnection } from '@/lib/db';

// GET: Health check endpoint
export async function GET() {
  try {
    const dbConnected = await checkConnection();

    const status = {
      status: dbConnected ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: dbConnected ? 'connected' : 'disconnected',
        api: 'running',
      },
      environment: process.env.NODE_ENV || 'development',
    };

    if (!dbConnected) {
      return NextResponse.json(status, { status: 503 });
    }

    return NextResponse.json(status);
  } catch (error) {
    console.error('[API] Health check error:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
      },
      { status: 503 }
    );
  }
}

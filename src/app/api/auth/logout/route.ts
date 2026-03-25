/**
 * Logout API Route
 * Clears user session
 */

import { NextResponse } from 'next/server';
import { clearSession } from '@/lib/auth';

// POST /api/auth/logout - User logout
export async function POST() {
  try {
    await clearSession();
    
    return NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });
    
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'An error occurred during logout' },
      { status: 500 }
    );
  }
}


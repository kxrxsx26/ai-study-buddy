/**
 * Current User API Route
 * Returns the currently authenticated user
 */

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

// GET /api/auth/me - Get current user
export async function GET() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    return NextResponse.json({
      success: true,
      user
    });
    
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }    );
  }
}


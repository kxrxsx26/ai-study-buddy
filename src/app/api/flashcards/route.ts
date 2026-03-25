/**
 * Flashcards API Routes
 * Implements spaced repetition algorithm (SM-2)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// SM-2 Spaced Repetition Algorithm
// Based on: https://www.supermemo.com/en/archives1990-2015/english/ol/sm2
function calculateNextReview(
  quality: number, // 0-5 (0=complete failure, 5=perfect)
  currentInterval: number,
  currentEaseFactor: number,
  currentRepetitions: number
): { nextInterval: number; nextEaseFactor: number; nextRepetitions: number } {
  let nextInterval = currentInterval;
  let nextEaseFactor = currentEaseFactor;
  let nextRepetitions = currentRepetitions;
  
  if (quality >= 3) {
    // Correct response
    if (currentRepetitions === 0) {
      nextInterval = 1;
    } else if (currentRepetitions === 1) {
      nextInterval = 6;
    } else {
      nextInterval = Math.round(currentInterval * currentEaseFactor);
    }
    nextRepetitions += 1;
  } else {
    // Incorrect response
    nextRepetitions = 0;
    nextInterval = 1;
  }
  
  // Update ease factor
  nextEaseFactor = currentEaseFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  nextEaseFactor = Math.max(1.3, nextEaseFactor); // Minimum ease factor
  
  return { nextInterval, nextEaseFactor, nextRepetitions };
}

// GET /api/flashcards - Get user's flashcards
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const topic = searchParams.get('topic');
    const due = searchParams.get('due');
    
    // Build query
    const where: { userId: string; topic?: string; nextReview?: { lte: Date } } = {
      userId: user.id
    };
    
    if (topic) {
      where.topic = topic;
    }
    
    if (due === 'true') {
      where.nextReview = { lte: new Date() };
    }
    
    const flashcards = await db.flashcard.findMany({
      where,
      orderBy: { nextReview: 'asc' }
    });
    
    // Get unique topics
    const topics = await db.flashcard.findMany({
      where: { userId: user.id },
      select: { topic: true },
      distinct: ['topic']
    });
    
    return NextResponse.json({
      success: true,
      flashcards,
      topics: topics.map(t => t.topic)
    });
    
  } catch (error) {
    console.error('Get flashcards error:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching flashcards' },
      { status: 500 }
    );
  }
}

// POST /api/flashcards - Create new flashcard
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { question, answer, topic, difficulty = 1 } = body;
    
    if (!question || !answer) {
      return NextResponse.json(
        { error: 'Question and answer are required' },
        { status: 400 }
      );
    }
    
    const flashcard = await db.flashcard.create({
      data: {
        question,
        answer,
        topic: topic || 'General',
        difficulty,
        userId: user.id
      }
    });
    
    return NextResponse.json({
      success: true,
      flashcard
    });
    
  } catch (error) {
    console.error('Create flashcard error:', error);
    return NextResponse.json(
      { error: 'An error occurred while creating flashcard' },
      { status: 500 }
    );
  }
}

// PUT /api/flashcards - Update flashcard (review)
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { id, quality } = body; // quality: 0-5
    
    if (!id || quality === undefined) {
      return NextResponse.json(
        { error: 'Flashcard ID and quality are required' },
        { status: 400 }
      );
    }
    
    // Get current flashcard
    const flashcard = await db.flashcard.findFirst({
      where: { id, userId: user.id }
    });
    
    if (!flashcard) {
      return NextResponse.json(
        { error: 'Flashcard not found' },
        { status: 404 }
      );
    }
    
    // Calculate next review using SM-2
    const { nextInterval, nextEaseFactor, nextRepetitions } = calculateNextReview(
      quality,
      flashcard.interval,
      flashcard.easeFactor,
      flashcard.repetitions
    );
    
    // Update flashcard
    const updated = await db.flashcard.update({
      where: { id },
      data: {
        nextReview: new Date(Date.now() + nextInterval * 24 * 60 * 60 * 1000),
        interval: nextInterval,
        easeFactor: nextEaseFactor,
        repetitions: nextRepetitions
      }
    });
    
    // Record study session
    await db.studySession.create({
      data: {
        userId: user.id,
        activity: 'flashcard',
        duration: 0,
        itemsStudied: 1
      }
    });
    
    return NextResponse.json({
      success: true,
      flashcard: updated
    });
    
  } catch (error) {
    console.error('Update flashcard error:', error);
    return NextResponse.json(
      { error: 'An error occurred while updating flashcard' },
      { status: 500 }
    );
  }
}

// DELETE /api/flashcards - Delete flashcard
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Flashcard ID is required' },
        { status: 400 }
      );
    }
    
    await db.flashcard.delete({
      where: { id, userId: user.id }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Flashcard deleted'
    });
    
  } catch (error) {
    console.error('Delete flashcard error:', error);
    return NextResponse.json(
      { error: 'An error occurred while deleting flashcard' },
      { status: 500 }
    );
  }
}


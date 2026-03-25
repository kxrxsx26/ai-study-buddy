/**
 * Progress API Route
 * Returns user's learning statistics and achievements
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET /api/progress - Get user progress
export async function GET() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Get flashcard stats
    const totalFlashcards = await db.flashcard.count({
      where: { userId: user.id }
    });
    
    const dueFlashcards = await db.flashcard.count({
      where: {
        userId: user.id,
        nextReview: { lte: new Date() }
      }
    });
    
    // Get quiz stats
    const totalQuizzes = await db.quiz.count({
      where: { userId: user.id }
    });
    
    const quizAttempts = await db.quizAttempt.findMany({
      where: { userId: user.id },
      select: { score: true, correctAnswers: true, totalQuestions: true, timeSpent: true }
    });
    
    const averageScore = quizAttempts.length > 0
      ? Math.round(quizAttempts.reduce((sum, a) => sum + a.score, 0) / quizAttempts.length)
      : 0;
    
    const totalQuestionsAnswered = quizAttempts.reduce((sum, a) => sum + a.totalQuestions, 0);
    const totalCorrectAnswers = quizAttempts.reduce((sum, a) => sum + a.correctAnswers, 0);
    const totalTimeSpent = quizAttempts.reduce((sum, a) => sum + a.timeSpent, 0);
    
    // Get study sessions (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentSessions = await db.studySession.findMany({
      where: {
        userId: user.id,
        createdAt: { gte: sevenDaysAgo }
      },
      orderBy: { createdAt: 'asc' }
    });
    
    // Group sessions by date
    const sessionsByDate = recentSessions.reduce((acc, session) => {
      const date = session.createdAt.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { items: 0, duration: 0 };
      }
      acc[date].items += session.itemsStudied;
      acc[date].duration += session.duration;
      return acc;
    }, {} as Record<string, { items: number; duration: number }>);
    
    // Get achievements
    const achievements = await db.achievement.findMany({
      where: { userId: user.id },
      orderBy: { earnedAt: 'desc' }
    });
    
    // Get topics progress
    const flashcardTopics = await db.flashcard.groupBy({
      by: ['topic'],
      where: { userId: user.id },
      _count: { id: true }
    });
    
    const quizTopics = await db.quiz.groupBy({
      by: ['topic'],
      where: { userId: user.id },
      _count: { id: true }
    });
    
    return NextResponse.json({
      success: true,
      stats: {
        flashcards: {
          total: totalFlashcards,
          due: dueFlashcards,
          mastered: totalFlashcards - dueFlashcards
        },
        quizzes: {
          total: totalQuizzes,
          attempts: quizAttempts.length,
          averageScore,
          totalQuestions: totalQuestionsAnswered,
          correctAnswers: totalCorrectAnswers,
          accuracy: totalQuestionsAnswered > 0 
            ? Math.round((totalCorrectAnswers / totalQuestionsAnswered) * 100) 
            : 0
        },
        time: {
          totalMinutes: totalTimeSpent,
          totalHours: Math.round(totalTimeSpent / 60 * 10) / 10
        },
        sessionsByDate,
        topics: {
          flashcards: flashcardTopics.map(t => ({ topic: t.topic, count: t._count.id })),
          quizzes: quizTopics.map(t => ({ topic: t.topic, count: t._count.id }))
        }
      },
      achievements
    });
    
  } catch (error) {
    console.error('Get progress error:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching progress' },
      { status: 500 }
    );
  }
}


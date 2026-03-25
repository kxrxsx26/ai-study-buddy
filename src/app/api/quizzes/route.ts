/**
 * Quizzes API Routes
 * Handles fetching and submitting quizzes
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET /api/quizzes - Get user's quizzes
export async function GET() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const quizzes = await db.quiz.findMany({
      where: { userId: user.id },
      include: {
        questions: {
          select: {
            id: true,
            question: true,
            options: true,
            correctIndex: true,
            explanation: true
          }
        },
        attempts: {
          orderBy: { id: 'desc' },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Format quizzes for frontend
    const formattedQuizzes = quizzes.map(quiz => ({
      id: quiz.id,
      title: quiz.title,
      topic: quiz.topic,
      description: quiz.description,
      difficulty: quiz.difficulty,
      questionCount: quiz.questionCount,
      createdAt: quiz.createdAt,
      lastAttempt: quiz.attempts[0] ? {
        score: quiz.attempts[0].score,
        date: quiz.attempts[0].id
      } : null,
      questions: quiz.questions.map(q => ({
        id: q.id,
        question: q.question,
        options: JSON.parse(q.options),
        correctIndex: q.correctIndex,
        explanation: q.explanation
      }))
    }));
    
    return NextResponse.json({
      success: true,
      quizzes: formattedQuizzes
    });
    
  } catch (error) {
    console.error('Get quizzes error:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching quizzes' },
      { status: 500 }
    );
  }
}

// POST /api/quizzes - Submit quiz attempt
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
    const { quizId, answers, timeSpent } = body;
    
    // Get quiz with questions
    const quiz = await db.quiz.findUnique({
      where: { id: quizId },
      include: { questions: true }
    });
    
    if (!quiz) {
      return NextResponse.json(
        { error: 'Quiz not found' },
        { status: 404 }
      );
    }
    
    // Calculate score
    let correctAnswers = 0;
    answers.forEach((answer: number, index: number) => {
      if (quiz.questions[index] && answer === quiz.questions[index].correctIndex) {
        correctAnswers++;
      }
    });
    
    const score = Math.round((correctAnswers / quiz.questions.length) * 100);
    
    // Save attempt
    const attempt = await db.quizAttempt.create({
      data: {
        quizId: quizId,
        userId: user.id,
        score: score,
        totalQuestions: quiz.questions.length,
        correctAnswers: correctAnswers,
        timeSpent: timeSpent || 0,
        answers: JSON.stringify(answers)
      }
    });
    
    // Record study session
    await db.studySession.create({
      data: {
        userId: user.id,
        activity: 'quiz',
        duration: Math.ceil((timeSpent || 0) / 60),
        itemsStudied: quiz.questions.length
      }
    });
    
    // Check for achievements
    await checkQuizAchievements(user.id, score);
    
    return NextResponse.json({
      success: true,
      result: {
        score,
        correctAnswers,
        totalQuestions: quiz.questions.length,
        attemptId: attempt.id
      }
    });
    
  } catch (error) {
    console.error('Submit quiz error:', error);
    return NextResponse.json(
      { error: 'An error occurred while submitting quiz' },
      { status: 500 }
    );
  }
}

// Check and award achievements
async function checkQuizAchievements(userId: string, score: number) {
  const achievements = [];
  
  // First quiz attempt
  const attemptCount = await db.quizAttempt.count({ where: { userId } });
  if (attemptCount === 1) {
    achievements.push({
      type: 'first_quiz',
      title: 'Quiz Beginner',
      description: 'Completed your first quiz!'
    });
  }
  
  // Perfect score
  if (score === 100) {
    achievements.push({
      type: 'perfect_score',
      title: 'Perfect Score!',
      description: 'Got 100% on a quiz!'
    });
  }
  
  // Quiz master (10 quizzes)
  if (attemptCount === 10) {
    achievements.push({
      type: 'quiz_master',
      title: 'Quiz Master',
      description: 'Completed 10 quizzes!'
    });
  }
  
  // Create achievements
  for (const achievement of achievements) {
    await db.achievement.create({
      data: {
        userId,
        ...achievement
      }
    }).catch(() => {
      // Ignore if already exists
    });
  }
}


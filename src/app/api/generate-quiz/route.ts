/**
 * AI Quiz Generation API
 * Uses LLM to generate quiz questions on any topic
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import ZAI from 'z-ai-web-dev-sdk';

// POST /api/generate-quiz - Generate AI quiz
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
    const { topic, questionCount = 5, difficulty = 2 } = body;
    
    if (!topic) {
      return NextResponse.json(
        { error: 'Topic is required' },
        { status: 400 }
      );
    }
    
    // Initialize AI SDK
    const zai = await ZAI.create();
    
    // Generate quiz questions using LLM
    const prompt = `Generate a quiz about "${topic}" with ${questionCount} multiple choice questions.
    
Difficulty level: ${difficulty}/5 (1=easy, 5=expert)

Requirements:
- Each question should have 4 options
- Exactly one correct answer per question
- Include a brief explanation for each correct answer
- Questions should be educational and clear

Respond with ONLY a valid JSON array in this exact format:
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0,
    "explanation": "Brief explanation of why this is correct"
  }
]

Do not include any other text or formatting.`;

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'assistant',
          content: 'You are an expert quiz creator. Generate educational, accurate, and engaging quiz questions. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      thinking: { type: 'disabled' }
    });
    
    const responseText = completion.choices[0]?.message?.content || '';
    
    // Parse the JSON response
    let questions;
    try {
      // Extract JSON from response (handle potential markdown code blocks)
      let jsonStr = responseText.trim();
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```/g, '');
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```\n?/g, '').replace(/```/g, '');
      }
      questions = JSON.parse(jsonStr);
    } catch {
      console.error('Failed to parse AI response:', responseText);
      return NextResponse.json(
        { error: 'Failed to generate quiz. Please try again.' },
        { status: 500 }
      );
    }
    
    // Validate questions format
    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json(
        { error: 'Invalid quiz format generated. Please try again.' },
        { status: 500 }
      );
    }
    
    // Create quiz in database
    const quiz = await db.quiz.create({
      data: {
        title: `${topic} Quiz`,
        topic: topic,
        description: `AI-generated quiz about ${topic}`,
        difficulty: difficulty,
        questionCount: questions.length,
        userId: user.id,
        questions: {
          create: questions.map((q: { question: string; options: string[]; correctIndex: number; explanation?: string }) => ({
            question: q.question,
            options: JSON.stringify(q.options),
            correctIndex: q.correctIndex,
            explanation: q.explanation || null
          }))
        }
      },
      include: {
        questions: true
      }
    });
    
    // Format response for frontend
    const formattedQuiz = {
      id: quiz.id,
      title: quiz.title,
      topic: quiz.topic,
      difficulty: quiz.difficulty,
      questionCount: quiz.questionCount,
      questions: quiz.questions.map(q => ({
        id: q.id,
        question: q.question,
        options: JSON.parse(q.options),
        correctIndex: q.correctIndex,
        explanation: q.explanation
      }))
    };
    
    return NextResponse.json({
      success: true,
      quiz: formattedQuiz
    });
    
  } catch (error) {
    console.error('Quiz generation error:', error);
    return NextResponse.json(
      { error: 'An error occurred while generating the quiz' },
      { status: 500 }
    );
  }
}


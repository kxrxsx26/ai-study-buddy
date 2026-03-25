'use client';

/**
 * AI Study Buddy - Main Application
 * A comprehensive learning platform with AI-powered quiz generation
 * and spaced repetition flashcard system
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  Brain, Trophy, Target, Clock, ChevronRight, 
  PlusCircle, Trash2, RotateCcw, CheckCircle, XCircle, 
  LogOut, Sparkles, Play, BarChart3, Layers, Menu, X
} from 'lucide-react';

// Types
interface User {
  id: string;
  email: string;
  name: string;
  avatar: string;
}

interface Flashcard {
  id: string;
  question: string;
  answer: string;
  topic: string;
  difficulty: number;
  nextReview: string;
  interval: number;
  easeFactor: number;
  repetitions: number;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

interface Quiz {
  id: string;
  title: string;
  topic: string;
  difficulty: number;
  questionCount: number;
  questions: QuizQuestion[];
  lastAttempt?: { score: number; date: string };
}

interface Stats {
  flashcards: { total: number; due: number; mastered: number };
  quizzes: { total: number; attempts: number; averageScore: number; accuracy: number };
  time: { totalMinutes: number; totalHours: number };
  topics: { flashcards: { topic: string; count: number }[]; quizzes: { topic: string; count: number }[] };
}

interface Achievement {
  id: string;
  type: string;
  title: string;
  description: string;
  earnedAt: string;
}

// Main App Component
export default function StudyBuddyApp() {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authForm, setAuthForm] = useState({ email: '', password: '', name: '' });
  
  // UI state
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Data state
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  
  // Loading states
  const [loading, setLoading] = useState({ flashcards: false, quizzes: false, stats: false });
  
  // Quiz generation state
  const [quizTopic, setQuizTopic] = useState('');
  const [questionCount, setQuestionCount] = useState('5');
  const [difficulty, setDifficulty] = useState('2');
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  
  // Quiz taking state
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [showExplanation, setShowExplanation] = useState(false);
  const [quizStartTime, setQuizStartTime] = useState<number>(0);
  const [quizResult, setQuizResult] = useState<{ score: number; correct: number; total: number } | null>(null);
  
  // Flashcard review state
  const [reviewMode, setReviewMode] = useState(false);
  const [reviewCards, setReviewCards] = useState<Flashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  
  // New flashcard state
  const [newFlashcard, setNewFlashcard] = useState({ question: '', answer: '', topic: '' });
  const [addCardOpen, setAddCardOpen] = useState(false);

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Fetch data when user logs in
  useEffect(() => {
    if (user) {
      fetchFlashcards();
      fetchQuizzes();
      fetchProgress();
    }
  }, [user]);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch {
      console.log('Not authenticated');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/signup';
      const body = authMode === 'login' 
        ? { email: authForm.email, password: authForm.password }
        : authForm;
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setUser(data.user);
        toast.success(authMode === 'login' ? 'Welcome back!' : 'Account created successfully!');
      } else {
        toast.error(data.error || 'Authentication failed');
      }
    } catch {
      toast.error('An error occurred');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setFlashcards([]);
    setQuizzes([]);
    setStats(null);
    setAchievements([]);
    setActiveTab('dashboard');
    toast.success('Logged out successfully');
  };

  const fetchFlashcards = async () => {
    setLoading(l => ({ ...l, flashcards: true }));
    try {
      const res = await fetch('/api/flashcards');
      if (res.ok) {
        const data = await res.json();
        setFlashcards(data.flashcards);
        setTopics(data.topics);
      }
    } catch {
      toast.error('Failed to load flashcards');
    } finally {
      setLoading(l => ({ ...l, flashcards: false }));
    }
  };

  const fetchQuizzes = async () => {
    setLoading(l => ({ ...l, quizzes: true }));
    try {
      const res = await fetch('/api/quizzes');
      if (res.ok) {
        const data = await res.json();
        setQuizzes(data.quizzes);
      }
    } catch {
      toast.error('Failed to load quizzes');
    } finally {
      setLoading(l => ({ ...l, quizzes: false }));
    }
  };

  const fetchProgress = async () => {
    setLoading(l => ({ ...l, stats: true }));
    try {
      const res = await fetch('/api/progress');
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setAchievements(data.achievements);
      }
    } catch {
      toast.error('Failed to load progress');
    } finally {
      setLoading(l => ({ ...l, stats: false }));
    }
  };

  const generateQuiz = async () => {
    if (!quizTopic.trim()) {
      toast.error('Please enter a topic');
      return;
    }
    
    setGeneratingQuiz(true);
    try {
      const res = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: quizTopic,
          questionCount: parseInt(questionCount),
          difficulty: parseInt(difficulty)
        })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast.success('Quiz generated successfully!');
        fetchQuizzes();
        setQuizTopic('');
      } else {
        toast.error(data.error || 'Failed to generate quiz');
      }
    } catch {
      toast.error('An error occurred');
    } finally {
      setGeneratingQuiz(false);
    }
  };

  const startQuiz = (quiz: Quiz) => {
    setCurrentQuiz(quiz);
    setCurrentQuestion(0);
    setQuizAnswers([]);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setQuizStartTime(Date.now());
    setQuizResult(null);
    setActiveTab('quiz-taking');
  };

  const submitAnswer = () => {
    if (selectedAnswer === null) return;
    setQuizAnswers([...quizAnswers, selectedAnswer]);
    setShowExplanation(true);
  };

  const nextQuestion = () => {
    if (currentQuestion < (currentQuiz?.questions.length || 0) - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      let correct = 0;
      currentQuiz?.questions.forEach((q, i) => {
        if (quizAnswers[i] === q.correctIndex) correct++;
      });
      setQuizResult({ 
        score: Math.round((correct / (currentQuiz?.questions.length || 1)) * 100), 
        correct, 
        total: currentQuiz?.questions.length || 0 
      });
    }
  };

  const finishQuiz = async () => {
    if (!currentQuiz) return;
    
    try {
      await fetch('/api/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizId: currentQuiz.id,
          answers: quizAnswers,
          timeSpent: Math.round((Date.now() - quizStartTime) / 1000)
        })
      });
      
      toast.success('Quiz completed!');
      setCurrentQuiz(null);
      setActiveTab('quizzes');
      fetchQuizzes();
      fetchProgress();
    } catch {
      toast.error('Failed to save quiz results');
    }
  };

  const startReview = (dueOnly = false) => {
    const cards = dueOnly 
      ? flashcards.filter(f => new Date(f.nextReview) <= new Date())
      : flashcards;
    
    if (cards.length === 0) {
      toast.error(dueOnly ? 'No cards due for review!' : 'No flashcards to review!');
      return;
    }
    
    setReviewCards(cards);
    setCurrentCardIndex(0);
    setShowAnswer(false);
    setReviewMode(true);
    setActiveTab('flashcard-review');
  };

  const rateCard = async (quality: number) => {
    const card = reviewCards[currentCardIndex];
    
    try {
      await fetch('/api/flashcards', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: card.id, quality })
      });
    } catch {
      console.error('Failed to update flashcard');
    }
    
    if (currentCardIndex < reviewCards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setShowAnswer(false);
    } else {
      setReviewMode(false);
      setActiveTab('flashcards');
      fetchFlashcards();
      fetchProgress();
      toast.success('Review session completed!');
    }
  };

  const addFlashcard = async () => {
    if (!newFlashcard.question || !newFlashcard.answer) {
      toast.error('Question and answer are required');
      return;
    }
    
    try {
      const res = await fetch('/api/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFlashcard)
      });
      
      if (res.ok) {
        toast.success('Flashcard added!');
        setNewFlashcard({ question: '', answer: '', topic: '' });
        setAddCardOpen(false);
        fetchFlashcards();
      }
    } catch {
      toast.error('Failed to add flashcard');
    }
  };

  const deleteFlashcard = async (id: string) => {
    try {
      await fetch(`/api/flashcards?id=${id}`, { method: 'DELETE' });
      toast.success('Flashcard deleted');
      fetchFlashcards();
    } catch {
      toast.error('Failed to delete flashcard');
    }
  };
  // Loading screen
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center animate-pulse">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Auth screens
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-gray-900 dark:to-gray-800">
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-xl border-0">
            <CardHeader className="text-center pb-2">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl">AI Study Buddy</CardTitle>
              <CardDescription>Your intelligent learning companion</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={authMode} onValueChange={(v) => setAuthMode(v as 'login' | 'signup')}>
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="login">Login</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>
                
                <form onSubmit={handleAuth} className="space-y-4">
                  {authMode === 'signup' && (
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        placeholder="Your name"
                        value={authForm.name}
                        onChange={e => setAuthForm({ ...authForm, name: e.target.value })}
                      />
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={authForm.email}
                      onChange={e => setAuthForm({ ...authForm, email: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={authForm.password}
                      onChange={e => setAuthForm({ ...authForm, password: e.target.value })}
                      required
                    />
                  </div>
                  
                  <Button type="submit" className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700">
                    {authMode === 'login' ? 'Sign In' : 'Create Account'}
                  </Button>
                </form>
              </Tabs>
            </CardContent>
          </Card>
        </div>
        
        <footer className="p-4 text-center text-sm text-muted-foreground">
          <p>🧠 AI-Powered Learning • Spaced Repetition • Smart Quizzes</p>
        </footer>
      </div>
    );
  }

  // Main application
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold hidden sm:block">AI Study Buddy</h1>
          </div>
          
          <nav className="hidden md:flex items-center gap-1">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
              { id: 'quizzes', label: 'Quizzes', icon: Target },
              { id: 'flashcards', label: 'Flashcards', icon: Layers },
            ].map(item => (
              <Button
                key={item.id}
                variant={activeTab === item.id ? 'secondary' : 'ghost'}
                onClick={() => setActiveTab(item.id)}
                className="gap-2"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Button>
            ))}
          </nav>
          
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted">
              <span className="text-lg">{user.avatar}</span>
              <span className="text-sm font-medium">{user.name}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      
      {/* Mobile Navigation */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-background/80 backdrop-blur-sm" onClick={() => setSidebarOpen(false)}>
          <div className="fixed inset-y-0 left-0 w-64 bg-background border-r p-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>
            
            <nav className="space-y-2">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
                { id: 'quizzes', label: 'Quizzes', icon: Target },
                { id: 'flashcards', label: 'Flashcards', icon: Layers },
              ].map(item => (
                <Button
                  key={item.id}
                  variant={activeTab === item.id ? 'secondary' : 'ghost'}
                  onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                  className="w-full justify-start gap-2"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              ))}
            </nav>
          </div>
        </div>
      )}
      
      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6">
        {/* Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">Welcome back, {user.name}! 👋</h2>
                <p className="text-muted-foreground">Track your learning progress</p>
              </div>
              <Button onClick={() => setActiveTab('quizzes')} className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 gap-2">
                <Sparkles className="h-4 w-4" />
                Generate Quiz
              </Button>
            </div>
            
            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Flashcards</CardDescription>
                  <CardTitle className="text-3xl">{stats?.flashcards.total || 0}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Layers className="h-4 w-4" />
                    <span>{stats?.flashcards.due || 0} due for review</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Quizzes Taken</CardDescription>
                  <CardTitle className="text-3xl">{stats?.quizzes.attempts || 0}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Target className="h-4 w-4" />
                    <span>Avg: {stats?.quizzes.averageScore || 0}%</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Accuracy</CardDescription>
                  <CardTitle className="text-3xl">{stats?.quizzes.accuracy || 0}%</CardTitle>
                </CardHeader>
                <CardContent>
                  <Progress value={stats?.quizzes.accuracy || 0} className="h-2" />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Study Time</CardDescription>
                  <CardTitle className="text-3xl">{stats?.time.totalHours || 0}h</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Total learning time</span>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Quick Actions */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => startReview(true)}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                      <RotateCcw className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Review Due Cards</CardTitle>
                      <CardDescription>{stats?.flashcards.due || 0} cards waiting</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
              
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setActiveTab('quizzes')}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <Sparkles className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Create AI Quiz</CardTitle>
                      <CardDescription>Test your knowledge</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </div>
            
            {/* Achievements */}
            {achievements.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    Achievements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {achievements.map(a => (
                      <Badge key={a.id} variant="secondary" className="py-1.5 px-3">
                        {a.title}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Topics */}
            {(stats?.topics.flashcards.length || stats?.topics.quizzes.length) ? (
              <div className="grid md:grid-cols-2 gap-4">
                {stats?.topics.flashcards.length ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Flashcard Topics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {stats.topics.flashcards.map(t => (
                          <Badge key={t.topic} variant="outline">{t.topic} ({t.count})</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ) : null}
                
                {stats?.topics.quizzes.length ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Quiz Topics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {stats.topics.quizzes.map(t => (
                          <Badge key={t.topic} variant="outline">{t.topic} ({t.count})</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            ) : null}
          </div>
        )}
        
        {/* Quizzes Tab */}
        {activeTab === 'quizzes' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">AI Quiz Generator</h2>
              <p className="text-muted-foreground">Create personalized quizzes on any topic</p>
            </div>
            
            {/* Generate Quiz Card */}
            <Card className="border-2 border-dashed">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-500" />
                  Generate New Quiz
                </CardTitle>
                <CardDescription>Our AI will create questions tailored to your topic</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-3 md:col-span-1 space-y-2">
                    <Label>Topic</Label>
                    <Input
                      placeholder="e.g., World History, JavaScript"
                      value={quizTopic}
                      onChange={e => setQuizTopic(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Questions</Label>
                    <Select value={questionCount} onValueChange={setQuestionCount}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[3, 5, 7, 10].map(n => (
                          <SelectItem key={n} value={n.toString()}>{n} questions</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Difficulty</Label>
                    <Select value={difficulty} onValueChange={setDifficulty}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Easy</SelectItem>
                        <SelectItem value="2">Medium</SelectItem>
                        <SelectItem value="3">Hard</SelectItem>
                        <SelectItem value="4">Expert</SelectItem>
                        <SelectItem value="5">Master</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button 
                  onClick={generateQuiz} 
                  disabled={generatingQuiz || !quizTopic.trim()}
                  className="w-full sm:w-auto bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  {generatingQuiz ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Quiz
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
            
            {/* Quiz List */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Your Quizzes</h3>
              {loading.quizzes ? (
                <div className="text-center py-8 text-muted-foreground">Loading quizzes...</div>
              ) : quizzes.length === 0 ? (
                <Card className="text-center py-8">
                  <CardContent>
                    <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No quizzes yet. Generate your first quiz above!</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {quizzes.map(quiz => (
                    <Card key={quiz.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{quiz.title}</CardTitle>
                            <CardDescription>{quiz.questionCount} questions</CardDescription>
                          </div>
                          <Badge variant="outline">Level {quiz.difficulty}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          {quiz.lastAttempt ? (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Last score: </span>
                              <span className={quiz.lastAttempt.score >= 70 ? 'text-green-600 font-medium' : 'text-orange-600 font-medium'}>
                                {quiz.lastAttempt.score}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Not attempted</span>
                          )}
                          <Button size="sm" onClick={() => startQuiz(quiz)}>
                            <Play className="h-4 w-4 mr-1" />
                            Start
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Quiz Taking */}
        {activeTab === 'quiz-taking' && currentQuiz && !quizResult && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">{currentQuiz.title}</h2>
                <p className="text-muted-foreground">Question {currentQuestion + 1} of {currentQuiz.questions.length}</p>
              </div>
              <Badge variant="secondary">
                {Math.round(((Date.now() - quizStartTime) / 1000 / 60) * 10) / 10} min
              </Badge>
            </div>
            
            <Progress value={(currentQuestion / currentQuiz.questions.length) * 100} className="h-2" />
            
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">{currentQuiz.questions[currentQuestion].question}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {currentQuiz.questions[currentQuestion].options.map((option, index) => (
                  <Button
                    key={index}
                    variant={selectedAnswer === index ? 'default' : 'outline'}
                    className={`w-full justify-start text-left h-auto py-3 px-4 ${
                      showExplanation
                        ? index === currentQuiz.questions[currentQuestion].correctIndex
                          ? 'bg-green-500 hover:bg-green-600 text-white'
                          : selectedAnswer === index
                          ? 'bg-red-500 hover:bg-red-600 text-white'
                          : ''
                        : ''
                    }`}
                    onClick={() => !showExplanation && setSelectedAnswer(index)}
                    disabled={showExplanation}
                  >
                    <span className="mr-3 flex-shrink-0 w-6 h-6 rounded-full border flex items-center justify-center text-sm">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span>{option}</span>
                    {showExplanation && index === currentQuiz.questions[currentQuestion].correctIndex && (
                      <CheckCircle className="ml-auto h-5 w-5" />
                    )}
                    {showExplanation && selectedAnswer === index && index !== currentQuiz.questions[currentQuestion].correctIndex && (
                      <XCircle className="ml-auto h-5 w-5" />
                    )}
                  </Button>
                ))}
              </CardContent>
              <CardFooter className="flex justify-between">
                {showExplanation ? (
                  <>
                    {currentQuiz.questions[currentQuestion].explanation && (
                      <p className="text-sm text-muted-foreground flex-1 mr-4">
                        💡 {currentQuiz.questions[currentQuestion].explanation}
                      </p>
                    )}
                    <Button onClick={nextQuestion}>
                      {currentQuestion < currentQuiz.questions.length - 1 ? 'Next Question' : 'See Results'}
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <Button onClick={submitAnswer} disabled={selectedAnswer === null} className="ml-auto">
                    Submit Answer
                  </Button>
                )}
              </CardFooter>
            </Card>
          </div>
        )}
        
        {/* Quiz Result */}
        {activeTab === 'quiz-taking' && quizResult && (
          <div className="max-w-md mx-auto text-center space-y-6">
            <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <span className="text-5xl font-bold text-white">{quizResult.score}%</span>
            </div>
            
            <div>
              <h2 className="text-2xl font-bold">
                {quizResult.score >= 80 ? 'Excellent! 🎉' : quizResult.score >= 60 ? 'Good Job! 👍' : 'Keep Practicing! 💪'}
              </h2>
              <p className="text-muted-foreground">
                You got {quizResult.correct} out of {quizResult.total} questions correct
              </p>
            </div>
            
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => { setCurrentQuiz(null); setActiveTab('quizzes'); }}>
                Back to Quizzes
              </Button>
              <Button onClick={finishQuiz} className="bg-gradient-to-r from-emerald-500 to-teal-600">
                Save & Continue
              </Button>
            </div>
          </div>
        )}
        
        {/* Flashcards Tab */}
        {activeTab === 'flashcards' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">Flashcards</h2>
                <p className="text-muted-foreground">Master knowledge with spaced repetition</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => startReview(true)} disabled={!stats?.flashcards.due}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Review Due ({stats?.flashcards.due || 0})
                </Button>
                <Dialog open={addCardOpen} onOpenChange={setAddCardOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add Card
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Flashcard</DialogTitle>
                      <DialogDescription>Create a new flashcard for your collection</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Question</Label>
                        <Textarea
                          placeholder="Enter your question..."
                          value={newFlashcard.question}
                          onChange={e => setNewFlashcard({ ...newFlashcard, question: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Answer</Label>
                        <Textarea
                          placeholder="Enter the answer..."
                          value={newFlashcard.answer}
                          onChange={e => setNewFlashcard({ ...newFlashcard, answer: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Topic (optional)</Label>
                        <Input
                          placeholder="e.g., Math, History, Science"
                          value={newFlashcard.topic}
                          onChange={e => setNewFlashcard({ ...newFlashcard, topic: e.target.value })}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setAddCardOpen(false)}>Cancel</Button>
                      <Button onClick={addFlashcard}>Add Flashcard</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            
            {loading.flashcards ? (
              <div className="text-center py-8 text-muted-foreground">Loading flashcards...</div>
            ) : flashcards.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Layers className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No flashcards yet</h3>
                  <p className="text-muted-foreground mb-4">Create your first flashcard to start learning!</p>
                  <Button onClick={() => setAddCardOpen(true)}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Create Flashcard
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {flashcards.map(card => (
                  <Card key={card.id} className="group hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <Badge variant="secondary">{card.topic}</Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => deleteFlashcard(card.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="font-medium mb-2">{card.question}</p>
                      <p className="text-sm text-muted-foreground">{card.answer}</p>
                    </CardContent>
                    <CardFooter className="text-xs text-muted-foreground">
                      {new Date(card.nextReview) <= new Date() ? (
                        <span className="text-orange-600">Due for review</span>
                      ) : (
                        <span>Next: {new Date(card.nextReview).toLocaleDateString()}</span>
                      )}
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Flashcard Review Mode */}
        {activeTab === 'flashcard-review' && reviewMode && (
          <div className="max-w-xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Review Session</h2>
                <p className="text-muted-foreground">Card {currentCardIndex + 1} of {reviewCards.length}</p>
              </div>
              <Button variant="ghost" onClick={() => { setReviewMode(false); setActiveTab('flashcards'); }}>
                <X className="h-4 w-4 mr-2" />
                Exit
              </Button>
            </div>
            
            <Progress value={(currentCardIndex / reviewCards.length) * 100} className="h-2" />
            
            <Card className="min-h-[300px]">
              <CardHeader>
                <Badge variant="secondary">{reviewCards[currentCardIndex].topic}</Badge>
              </CardHeader>
              <CardContent className="text-center py-8">
                <p className="text-xl font-medium mb-4">{reviewCards[currentCardIndex].question}</p>
                
                {!showAnswer ? (
                  <Button onClick={() => setShowAnswer(true)} size="lg">
                    Show Answer
                  </Button>
                ) : (
                  <div className="space-y-6">
                    <div className="p-4 rounded-lg bg-muted">
                      <p className="text-lg">{reviewCards[currentCardIndex].answer}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-muted-foreground mb-3">How well did you remember?</p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {[
                          { quality: 0, label: 'Again', color: 'bg-red-500 hover:bg-red-600' },
                          { quality: 1, label: 'Hard', color: 'bg-orange-500 hover:bg-orange-600' },
                          { quality: 3, label: 'Good', color: 'bg-blue-500 hover:bg-blue-600' },
                          { quality: 5, label: 'Easy', color: 'bg-green-500 hover:bg-green-600' },
                        ].map(btn => (
                          <Button
                            key={btn.quality}
                            className={`${btn.color} text-white`}
                            onClick={() => rateCard(btn.quality)}
                          >
                            {btn.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
      
      {/* Footer */}
      <footer className="border-t py-4 text-center text-sm text-muted-foreground">
        <p>AI Study Buddy • Built with Next.js & AI • Spaced Repetition Learning</p>
      </footer>
    </div>
  );
}


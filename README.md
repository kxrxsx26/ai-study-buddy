<div align="center">

```
  ✦ ame
```

# Ame — AI Study Buddy

**A minimal, aesthetic AI-powered learning platform built with Next.js 14 and Tailwind CSS.**

[![Next.js](https://img.shields.io/badge/Next.js-14.2.5-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)](https://typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38BDF8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/License-MIT-purple?style=flat-square)](LICENSE)

[Live Demo](#) · [Report Bug](#) · [Request Feature](#)

</div>

---

## Overview

Ame is a frontend-only study platform with a dark, minimal aesthetic designed to help learners master any subject through interactive flashcards, adaptive quizzes, and visual progress tracking. Built as a portfolio-grade project, it demonstrates advanced UI/UX patterns, smooth animations, and a polished design system — all without a backend.

The name *ame* (雨) means "rain" in Japanese — calm, consistent, and refreshing.

---

## Screenshots

| Landing Page | Dashboard | Flashcards |
|---|---|---|
| Hero with animated orbs | Tab-based workspace | 3D flip card system |

| Quiz | Progress |
|---|---|
| Multi-choice with explanations | Charts, streaks, mastery bars |

---

## Features

### Landing Page
- Animated hero section with floating gradient orbs and a subtle grid background
- Gradient text headlines using the Syne display font
- Live stats (10k+ learners, 98% retention, 3x faster learning)
- Fake browser preview card showing the dashboard UI
- Full features section with 6 feature cards

### Flashcard System
- 3D CSS flip animation (perspective + rotateY transform)
- Know / Still Learning rating system with visual feedback
- Animated dot progress indicator
- Session summary screen with completion state
- Notes-to-cards input area (UI layout, non-functional)

### Quiz Engine
- 4-question multiple choice quiz with A/B/C/D labeling
- Real-time answer feedback with color-coded states (green/pink)
- Per-question explanations revealed after answering
- Results screen with a conic-gradient score ring
- Answer review list showing correct answers for each question
- Retake functionality

### Progress Dashboard
- 4 stat cards: total cards, day streak, hours studied, quizzes taken
- Weekly activity bar chart (pure CSS, no chart library)
- Subject mastery progress bars with per-subject color coding
- 30-day study streak calendar grid

### Design System
- Dark-first color palette (`#0a0a0f` base, `#7c6aff` accent)
- Glassmorphism cards with `backdrop-filter: blur`
- Custom CSS animations: `float`, `pulse-glow`, `slide-up`, `fade-in`
- Responsive navbar with mobile hamburger menu
- Google Fonts: Inter (body) + Syne (display)
- Custom scrollbar styling
- Noise texture overlay for depth

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 3.4 |
| Fonts | Google Fonts (Inter, Syne) |
| Animations | Pure CSS keyframes |
| State | React `useState` hooks |
| Linting | ESLint + eslint-config-next |

No backend. No database. No authentication. No external UI libraries.

---

## Project Structure

```
ai-study-buddy/
├── src/
│   ├── app/
│   │   ├── globals.css          # Design tokens, animations, utility classes
│   │   ├── layout.tsx           # Root layout with metadata
│   │   └── page.tsx             # Client-side router (home / dashboard)
│   └── components/
│       ├── Navbar.tsx           # Fixed nav with mobile menu
│       ├── Hero.tsx             # Landing hero section
│       ├── Features.tsx         # Feature grid section
│       ├── Dashboard.tsx        # Tab container (flashcards / quiz / progress)
│       ├── Flashcards.tsx       # Flip card study system
│       ├── Quiz.tsx             # Multiple choice quiz engine
│       ├── Progress.tsx         # Analytics and streak tracking
│       └── Footer.tsx           # Site footer
├── tailwind.config.ts           # Extended theme (Syne font, accent colors)
├── next.config.mjs              # Next.js config
├── tsconfig.json                # TypeScript config with @/* path alias
└── package.json
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm, yarn, or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/ai-study-buddy.git
cd ai-study-buddy

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server on port 3000 |
| `npm run build` | Create optimized production build |
| `npm start` | Run production server |
| `npm run lint` | Run ESLint across the codebase |

---

## Design Decisions

**Why no UI library?**
Every component is hand-crafted with Tailwind and inline styles to demonstrate full control over the design system. No shadcn/ui, no Radix, no MUI.

**Why CSS animations over Framer Motion?**
Keeping the bundle lean. The `slide-up`, `float`, and `pulse-glow` keyframes are defined once in `globals.css` and reused via utility classes.

**Why inline styles alongside Tailwind?**
Tailwind handles layout and spacing. Dynamic values (colors from data, gradient stops, pixel-precise dimensions) use inline styles to avoid arbitrary value bloat in class names.

**Why a single-page client router?**
The entire app lives in `page.tsx` with a `view` state (`'home'` | `'dashboard'`). This avoids Next.js route transitions and keeps the experience feel like a native SPA.

---

## Customization

### Changing the color palette

Edit the CSS variables in `src/app/globals.css`:

```css
:root {
  --bg: #0a0a0f;
  --surface: #111118;
  --surface2: #1a1a24;
  --accent: #7c6aff;      /* primary purple */
  --accent2: #a78bfa;     /* lighter purple */
  --accent3: #38bdf8;     /* sky blue */
  --text: #e8e8f0;
  --muted: #6b6b80;
}
```

### Adding flashcard content

Edit the `cards` array in `src/components/Flashcards.tsx`:

```ts
const cards = [
  { front: 'Your question here', back: 'Your answer here' },
  // ...
]
```

### Adding quiz questions

Edit the `questions` array in `src/components/Quiz.tsx`:

```ts
const questions = [
  {
    q: 'Your question?',
    options: ['Option A', 'Option B', 'Option C', 'Option D'],
    answer: 0,  // index of correct option
    explanation: 'Why this is correct...',
  },
]
```

---

## Roadmap

- [ ] LocalStorage persistence for flashcard progress
- [ ] Dark/light theme toggle
- [ ] Keyboard navigation for flashcards (spacebar to flip, arrow keys to rate)
- [ ] Animated page transitions between home and dashboard
- [ ] More quiz subjects and larger card decks
- [ ] Export progress as PDF
- [ ] PWA support for offline use

---

## Contributing

Contributions are welcome. Please open an issue first to discuss what you'd like to change.

```bash
# Fork the repo, then:
git checkout -b feature/your-feature-name
git commit -m 'feat: add your feature'
git push origin feature/your-feature-name
# Open a pull request
```

---

## License

MIT © 2026 — feel free to use this for your own portfolio.

---

<div align="center">

Built with Next.js · Tailwind CSS · React · TypeScript

*Study smarter, not harder.*

</div>

# 🧠 FlashCard – Intelligent TOEIC Learning Platform

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Gemini AI](https://img.shields.io/badge/Gemini%20AI-4285F4?style=for-the-badge&logo=google-gemini&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

FlashCard is a modern, feature-rich web application designed to help students master TOEIC vocabulary and grammar through the power of **Spaced Repetition (SRS)** and **Artificial Intelligence**.

---

## 🌟 Key Features

### 🚀 Smart Learning with AI
- **AI-Powered Deck Generation**: Generate high-quality flashcards from any topic instantly using Google Gemini AI.
- **Deep Content**: AI-generated cards include IPA phonetics, example sentences, parts of speech, synonyms, and business collocations tailored for TOEIC.

### 🧠 Advanced Learning Algorithms
- **Spaced Repetition System (SRS)**: Uses an SM-2 inspired algorithm to optimize review intervals based on your performance.
- **Interactive Quizzes**: Multiple quiz types (Fill-in-the-blank, multiple choice) with real-time feedback and timers.

### 🏆 Gamification & Engagement
- **XP & Leveling System**: Earn experience points for every card studied and quiz completed.
- **Streaks & Daily Activity**: Track your learning consistency with daily goals and study streaks.
- **Achievements**: Unlock badges as you reach milestones.

### 📊 Comprehensive Analytics
- **Personal Dashboard**: Visualize your progress with interactive charts powered by Recharts.
- **Progress Tracking**: Monitor cards studied, accuracy rates, and time spent on learning.

### 🛠 Administrative Tools
- **Admin Portal**: Dedicated dashboard for managing users, decks, and content moderation.
- **Bulk Import**: Quickly create decks by importing CSV, JSON, or TXT files.

---

## 🛠 Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database**: [PostgreSQL](https://www.postgresql.org/) (via [Supabase](https://supabase.com/))
- **ORM**: [Prisma](https://www.prisma.io/)
- **Authentication**: [NextAuth.js](https://next-auth.js.org/)
- **AI Engine**: [Google Generative AI (Gemini)](https://ai.google.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [shadcn/ui](https://ui.shadcn.com/)
- **Charts**: [Recharts](https://recharts.org/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/) & [Canvas Confetti](https://www.npmjs.com/package/canvas-confetti)

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/Hocpham1102/FlashCard.git
cd FlashCard
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Setup
Create a `.env` file in the root directory and add the following:

```env
# Database
DATABASE_URL="your_postgresql_url"
DIRECT_URL="your_direct_url"

# Authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your_secret_key"

# AI
GEMINI_API_KEY="your_gemini_api_key"
```

### 4. Database Setup
```bash
npx prisma generate
npx prisma db push
```

### 5. Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---

## 📸 Screenshots

*(Add your screenshots here to make it more professional)*

| Dashboard | Learning View | Admin Portal |
| :---: | :---: | :---: |
| ![Dashboard Placeholder](https://via.placeholder.com/400x250?text=Dashboard) | ![Learning Placeholder](https://via.placeholder.com/400x250?text=Learning+View) | ![Admin Placeholder](https://via.placeholder.com/400x250?text=Admin+Portal) |

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Developed with ❤️ by [Hocpham1102](https://github.com/Hocpham1102)**

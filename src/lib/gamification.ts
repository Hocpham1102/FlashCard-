import prisma from "./prisma";

// Config
export const XP_PER_REVIEW = 5;
export const XP_PER_CORRECT_QUIZ = 10;
export const XP_PER_WRONG_QUIZ = 2;
export const BASE_XP_PER_LEVEL = 100;

// Level formula: level = floor(sqrt(xp / BASE_XP_PER_LEVEL)) + 1
// XP required for next level = (current_level)^2 * BASE_XP_PER_LEVEL
export function calculateLevel(xp: number): number {
  return Math.floor(Math.sqrt(xp / BASE_XP_PER_LEVEL)) + 1;
}

export function getXpForNextLevel(currentLevel: number): number {
  return Math.pow(currentLevel, 2) * BASE_XP_PER_LEVEL;
}

export function getLevelProgress(xp: number, currentLevel: number): number {
  const currentLevelXp = Math.pow(currentLevel - 1, 2) * BASE_XP_PER_LEVEL;
  const nextLevelXp = getXpForNextLevel(currentLevel);
  const xpInCurrentLevel = xp - currentLevelXp;
  const xpRequiredForNext = nextLevelXp - currentLevelXp;
  
  return Math.min(100, Math.max(0, Math.round((xpInCurrentLevel / xpRequiredForNext) * 100)));
}

function getLocalDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function addStudyActivity(userId: string, quality: number) {
  const dateStr = getLocalDateString();
  const isCorrect = quality >= 3;
  const xpEarned = isCorrect ? XP_PER_REVIEW : Math.floor(XP_PER_REVIEW / 2);

  return await updateGamification(userId, dateStr, xpEarned, 1, 0, isCorrect ? 1 : 0, isCorrect ? 0 : 1);
}

export async function addQuizActivity(userId: string, correctCount: number, totalQuestions: number) {
  const dateStr = getLocalDateString();
  const wrongCount = totalQuestions - correctCount;
  const xpEarned = (correctCount * XP_PER_CORRECT_QUIZ) + (wrongCount * XP_PER_WRONG_QUIZ);

  return await updateGamification(userId, dateStr, xpEarned, 0, 1, correctCount, wrongCount);
}

async function updateGamification(
  userId: string, 
  dateStr: string, 
  xpEarned: number, 
  cardsStudied: number, 
  quizzesTaken: number,
  correct: number,
  wrong: number
) {
  // Update or create UserStats
  const stats = await prisma.userStats.findUnique({ where: { userId } });
  
  const now = new Date();
  let currentStreak = stats?.currentStreak || 0;
  let longestStreak = stats?.longestStreak || 0;

  if (stats) {
    if (stats.todayDate !== dateStr) {
      // New day
      // Check if streak is broken (difference > 1 day)
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
      
      if (stats.todayDate === yesterdayStr) {
        // Continue streak
        currentStreak += 1;
      } else if (stats.todayDate < yesterdayStr) {
        // Break streak
        currentStreak = 1;
      }
      
      if (currentStreak > longestStreak) longestStreak = currentStreak;
    }
  } else {
    currentStreak = 1;
    longestStreak = 1;
  }

  const newXp = (stats?.totalXP || 0) + xpEarned;
  const newLevel = calculateLevel(newXp);
  const leveledUp = stats ? newLevel > stats.level : false;

  const updatedStats = await prisma.userStats.upsert({
    where: { userId },
    create: {
      userId,
      totalXP: xpEarned,
      level: newLevel,
      currentStreak,
      longestStreak,
      lastStudyDate: now,
      totalCardsStudied: cardsStudied,
      totalQuizzesTaken: quizzesTaken,
      totalCorrect: correct,
      totalWrong: wrong,
      todayCards: cardsStudied,
      todayDate: dateStr,
    },
    update: {
      totalXP: { increment: xpEarned },
      level: newLevel,
      currentStreak,
      longestStreak,
      lastStudyDate: now,
      totalCardsStudied: { increment: cardsStudied },
      totalQuizzesTaken: { increment: quizzesTaken },
      totalCorrect: { increment: correct },
      totalWrong: { increment: wrong },
      todayCards: stats?.todayDate === dateStr ? { increment: cardsStudied } : cardsStudied,
      todayDate: dateStr,
    }
  });

  // Update DailyActivity
  await prisma.dailyActivity.upsert({
    where: {
      userId_date: {
        userId,
        date: dateStr,
      }
    },
    create: {
      userId,
      date: dateStr,
      xpEarned,
      cardsStudied,
      quizzesTaken,
    },
    update: {
      xpEarned: { increment: xpEarned },
      cardsStudied: { increment: cardsStudied },
      quizzesTaken: { increment: quizzesTaken },
    }
  });

  return { updatedStats, leveledUp, xpEarned, newLevel };
}

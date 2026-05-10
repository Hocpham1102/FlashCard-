import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { deckId, type = "multiple_choice", questionCount = 10 } = body;

    if (!deckId) {
      return NextResponse.json({ error: "deckId is required" }, { status: 400 });
    }

    const validTypes = ["multiple_choice", "fill_blank", "listening", "meaning_match"];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: "Invalid quiz type" }, { status: 400 });
    }

    // Fetch all cards from the deck
    const cards = await prisma.card.findMany({
      where: { deckId },
      select: {
        id: true,
        front: true,
        back: true,
        phonetic: true,
        example: true,
        partOfSpeech: true,
      },
    });

    if (cards.length < 4) {
      return NextResponse.json(
        { error: "Cần ít nhất 4 thẻ trong bộ để tạo quiz" },
        { status: 400 }
      );
    }

    // Shuffle and pick cards for questions
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(questionCount, cards.length));

    // Generate questions based on type
    const questions = selected.map((card) => {
      // Get wrong answer options from other cards
      const otherCards = cards.filter((c) => c.id !== card.id);
      const wrongOptions = otherCards
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);

      switch (type) {
        case "multiple_choice": {
          // Show English word -> pick correct Vietnamese meaning
          const options = [
            { text: card.back, isCorrect: true },
            ...wrongOptions.map((w) => ({ text: w.back, isCorrect: false })),
          ].sort(() => Math.random() - 0.5);

          return {
            cardId: card.id,
            question: card.front,
            phonetic: card.phonetic || "",
            type: "multiple_choice",
            options,
            correctAnswer: card.back,
          };
        }

        case "meaning_match": {
          // Show Vietnamese meaning -> pick correct English word
          const options = [
            { text: card.front, isCorrect: true },
            ...wrongOptions.map((w) => ({ text: w.front, isCorrect: false })),
          ].sort(() => Math.random() - 0.5);

          return {
            cardId: card.id,
            question: card.back,
            type: "meaning_match",
            options,
            correctAnswer: card.front,
          };
        }

        case "fill_blank": {
          // Use example sentence with blank, or just show meaning
          let sentence = "";
          if (card.example) {
            // Replace the word in the example with blanks
            const regex = new RegExp(card.front.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
            sentence = card.example.replace(regex, "_____");
            // If no replacement happened, use generic prompt
            if (sentence === card.example) {
              sentence = "";
            }
          }

          return {
            cardId: card.id,
            question: sentence || `Điền từ tiếng Anh có nghĩa: "${card.back}"`,
            hint: card.phonetic || "",
            type: "fill_blank",
            correctAnswer: card.front,
          };
        }

        case "listening": {
          // Listen to word -> pick correct meaning (same as MC but with audio hint)
          const options = [
            { text: card.back, isCorrect: true },
            ...wrongOptions.map((w) => ({ text: w.back, isCorrect: false })),
          ].sort(() => Math.random() - 0.5);

          return {
            cardId: card.id,
            question: card.front, // Will be spoken via TTS
            type: "listening",
            options,
            correctAnswer: card.back,
          };
        }

        default:
          return null;
      }
    }).filter(Boolean);

    // Create quiz session in DB
    const quizSession = await prisma.quizSession.create({
      data: {
        userId: session.user.id,
        deckId,
        quizType: type,
        totalCards: questions.length,
      },
    });

    return NextResponse.json({
      sessionId: quizSession.id,
      questions,
      totalQuestions: questions.length,
    });
  } catch (error) {
    console.error("Quiz generate error:", error);
    return NextResponse.json({ error: "Failed to generate quiz" }, { status: 500 });
  }
}

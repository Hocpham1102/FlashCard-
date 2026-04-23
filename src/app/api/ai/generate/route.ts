import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ message: "Chưa đăng nhập" }, { status: 401 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ message: "Chưa cấu hình Gemini API Key. Vui lòng thêm GEMINI_API_KEY vào file .env" }, { status: 500 });
    }

    const { topic, cardCount = 10 } = await req.json();

    if (!topic?.trim()) {
      return NextResponse.json({ message: "Vui lòng nhập chủ đề" }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `Bạn là một chuyên gia giáo dục. Hãy tạo một bộ flashcard học tập chất lượng cao về chủ đề: "${topic}".

Yêu cầu:
- Tạo đúng ${cardCount} thẻ flashcard
- Mỗi thẻ phải có nội dung rõ ràng, chính xác và hữu ích
- Mặt trước (front): câu hỏi, thuật ngữ, hoặc khái niệm ngắn gọn
- Mặt sau (back): câu trả lời, định nghĩa, hoặc giải thích chi tiết (1-3 câu)
- Ngôn ngữ: phù hợp với chủ đề (nếu là ngoại ngữ thì mặt trước là từ/câu ngoại ngữ, mặt sau là nghĩa tiếng Việt và ví dụ)

Trả về CHÍNH XÁC định dạng JSON sau (không có markdown, không có text thừa):
{
  "title": "Tên bộ thẻ phù hợp với chủ đề",
  "description": "Mô tả ngắn gọn (1 câu) về bộ thẻ này",
  "cards": [
    { "front": "Nội dung mặt trước", "back": "Nội dung mặt sau" }
  ]
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Parse JSON from AI response - clean up possible markdown wrapping
    let jsonText = text.trim();
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.slice(7);
    }
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.slice(3);
    }
    if (jsonText.endsWith("```")) {
      jsonText = jsonText.slice(0, -3);
    }
    jsonText = jsonText.trim();

    let aiData: { title: string; description: string; cards: { front: string; back: string }[] };
    try {
      aiData = JSON.parse(jsonText);
    } catch {
      return NextResponse.json({ message: "AI trả về dữ liệu không đúng định dạng. Vui lòng thử lại." }, { status: 500 });
    }

    if (!aiData.title || !aiData.cards || !Array.isArray(aiData.cards)) {
      return NextResponse.json({ message: "Dữ liệu AI không hợp lệ. Vui lòng thử lại." }, { status: 500 });
    }

    // Save to database in a transaction
    const deck = await prisma.$transaction(async (tx) => {
      const newDeck = await tx.deck.create({
        data: {
          title: aiData.title,
          description: aiData.description || "",
          cardCount: aiData.cards.length,
          userId: session.user!.id,
        },
      });

      await tx.card.createMany({
        data: aiData.cards.map((card) => ({
          deckId: newDeck.id,
          front: card.front,
          back: card.back,
        })),
      });

      return newDeck;
    });

    return NextResponse.json({
      message: "Tạo bộ thẻ AI thành công!",
      deck: {
        id: deck.id,
        title: deck.title,
        description: deck.description,
        cardCount: deck.cardCount,
      },
    }, { status: 201 });

  } catch (error: any) {
    console.error("AI generate error:", error);
    if (error?.message?.includes("API_KEY_INVALID") || error?.message?.includes("API key")) {
      return NextResponse.json({ message: "API Key không hợp lệ. Vui lòng kiểm tra lại GEMINI_API_KEY trong file .env" }, { status: 500 });
    }
    return NextResponse.json({ message: "Có lỗi xảy ra khi gọi AI. Vui lòng thử lại sau." }, { status: 500 });
  }
}

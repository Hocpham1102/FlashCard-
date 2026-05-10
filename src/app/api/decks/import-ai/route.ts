import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// ─── Loại file hỗ trợ ────────────────────────────────────────────────
// TEXT: đọc thẳng nội dung text → gửi vào prompt
const TEXT_EXTS = new Set(["txt", "md", "csv", "json", "html", "htm", "xml", "yaml", "yml"]);
// INLINE: encode base64 → Gemini đọc nội dung trực tiếp
const INLINE_MIME: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
};

const GEMINI_PROMPT = `Bạn là chuyên gia giáo dục. Hãy phân tích nội dung tài liệu được cung cấp và tạo ra một bộ flashcard học tập chất lượng cao.

Yêu cầu:
- Tạo 10–25 thẻ từ những khái niệm, từ vựng, hoặc kiến thức quan trọng nhất trong tài liệu
- Mỗi thẻ cần có: front (thuật ngữ/câu hỏi ngắn), back (định nghĩa/đáp án bằng tiếng Việt, rõ ràng)
- Nếu là từ vựng tiếng Anh: thêm phonetic (phiên âm IPA) và example (câu ví dụ)
- Nếu là kiến thức/khái niệm: front là câu hỏi, back là giải thích ngắn gọn

Trả về CHÍNH XÁC định dạng JSON sau (không có markdown, không có text thừa):
{
  "title": "Tên bộ thẻ phù hợp với nội dung tài liệu",
  "description": "Mô tả ngắn (1 câu)",
  "cards": [
    {
      "front": "thuật ngữ hoặc câu hỏi",
      "back": "định nghĩa hoặc đáp án bằng tiếng Việt",
      "phonetic": "/phiên âm IPA/ (để trống nếu không phải từ vựng tiếng Anh)",
      "example": "câu ví dụ (để trống nếu không cần thiết)",
      "partOfSpeech": "noun/verb/adj/... (để trống nếu không phải từ vựng)"
    }
  ]
}`;

function getExt(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

function cleanJsonResponse(text: string): string {
  let s = text.trim();
  // Bóc bọc markdown code block nếu có
  const fence = "```";
  if (s.startsWith(fence + "json")) s = s.slice(7);
  else if (s.startsWith(fence)) s = s.slice(3);
  if (s.endsWith(fence)) s = s.slice(0, -3);
  return s.trim();
}

export async function POST(req: NextRequest) {
  try {
    // ─── Auth ────────────────────────────────────────────────────────
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Chưa cấu hình GEMINI_API_KEY." },
        { status: 500 }
      );
    }

    // ─── File ────────────────────────────────────────────────────────
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const customTitle = (formData.get("title") as string | null)?.trim();

    if (!file) {
      return NextResponse.json({ error: "Không tìm thấy file." }, { status: 400 });
    }

    const MAX_SIZE = 20 * 1024 * 1024; // 20MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File quá lớn. Tối đa 20MB." },
        { status: 400 }
      );
    }

    const ext = getExt(file.name);

    // ─── Xây dựng parts cho Gemini ───────────────────────────────────
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    let parts: any[];

    if (TEXT_EXTS.has(ext)) {
      // Đọc nội dung text và đưa vào prompt
      const text = await file.text();
      if (!text.trim()) {
        return NextResponse.json({ error: "File rỗng, không có nội dung để phân tích." }, { status: 400 });
      }
      parts = [
        {
          text: `Tài liệu (${file.name}):\n\n${text.slice(0, 100_000)}\n\n---\n\n${GEMINI_PROMPT}`,
        },
      ];
    } else if (INLINE_MIME[ext]) {
      // Gửi file dưới dạng base64 inline (PDF, ảnh…)
      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      parts = [
        {
          inlineData: {
            mimeType: INLINE_MIME[ext],
            data: base64,
          },
        },
        { text: GEMINI_PROMPT },
      ];
    } else if (ext === "docx" || ext === "pptx" || ext === "xlsx") {
      // Thử đọc như text (DOCX/PPTX là ZIP + XML, có thể có chút text)
      // Cách tốt nhất là báo user chuyển sang PDF, nhưng ta vẫn thử
      return NextResponse.json(
        {
          error: `File .${ext} không được hỗ trợ trực tiếp. Vui lòng chuyển sang PDF rồi thử lại (Mở file → In → Lưu dưới dạng PDF).`,
        },
        { status: 400 }
      );
    } else {
      // Thử đọc như text cho mọi định dạng còn lại
      try {
        const text = await file.text();
        if (!text.trim()) throw new Error("empty");
        parts = [
          {
            text: `Tài liệu (${file.name}):\n\n${text.slice(0, 100_000)}\n\n---\n\n${GEMINI_PROMPT}`,
          },
        ];
      } catch {
        return NextResponse.json(
          {
            error: `Định dạng file .${ext || "không xác định"} chưa được hỗ trợ. Thử chuyển sang PDF, TXT, hoặc ảnh chụp nội dung.`,
          },
          { status: 400 }
        );
      }
    }

    // ─── Gọi Gemini ──────────────────────────────────────────────────
    const result = await model.generateContent(parts);
    const rawText = result.response.text();
    const jsonText = cleanJsonResponse(rawText);

    let aiData: {
      title: string;
      description: string;
      cards: {
        front: string;
        back: string;
        phonetic?: string;
        example?: string;
        partOfSpeech?: string;
      }[];
    };

    try {
      aiData = JSON.parse(jsonText);
    } catch {
      console.error("Gemini raw response:", rawText);
      return NextResponse.json(
        { error: "AI trả về dữ liệu không đúng định dạng. Vui lòng thử lại." },
        { status: 500 }
      );
    }

    if (!aiData.title || !Array.isArray(aiData.cards) || aiData.cards.length === 0) {
      return NextResponse.json(
        { error: "AI không thể trích xuất nội dung từ file này. Hãy thử với file khác." },
        { status: 500 }
      );
    }

    // Lọc thẻ hợp lệ
    const validCards = aiData.cards.filter(
      (c) => c.front?.trim() && c.back?.trim()
    );
    if (validCards.length === 0) {
      return NextResponse.json(
        { error: "Không tìm thấy thẻ hợp lệ trong kết quả AI." },
        { status: 500 }
      );
    }

    // Override title nếu user nhập tên tùy chỉnh
    const deckTitle = customTitle || aiData.title;

    // ─── Lưu vào DB ──────────────────────────────────────────────────
    const deck = await prisma.$transaction(async (tx) => {
      const newDeck = await tx.deck.create({
        data: {
          title: deckTitle,
          description: aiData.description || "",
          cardCount: validCards.length,
          userId: session.user!.id,
        },
      });

      await tx.card.createMany({
        data: validCards.map((card) => ({
          deckId: newDeck.id,
          front: card.front.trim(),
          back: card.back.trim(),
          phonetic: card.phonetic?.trim() || "",
          example: card.example?.trim() || "",
          partOfSpeech: card.partOfSpeech?.trim() || "",
          synonyms: "",
          collocations: "",
          toeicPart: "",
        })),
      });

      return newDeck;
    });

    return NextResponse.json(
      {
        message: "Tạo bộ thẻ từ file thành công!",
        deck: {
          id: deck.id,
          title: deck.title,
          cardCount: deck.cardCount,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("AI import error:", error);
    if (error?.message?.includes("API_KEY_INVALID") || error?.message?.includes("API key")) {
      return NextResponse.json(
        { error: "API Key không hợp lệ. Kiểm tra GEMINI_API_KEY trong .env." },
        { status: 500 }
      );
    }
    if (error?.message?.includes("quota") || error?.status === 429) {
      return NextResponse.json(
        { error: "Đã vượt quá giới hạn API. Vui lòng thử lại sau vài phút." },
        { status: 429 }
      );
    }
    return NextResponse.json(
      { error: error?.message || "Có lỗi xảy ra khi phân tích file." },
      { status: 500 }
    );
  }
}

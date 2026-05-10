import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

interface ParsedCard {
  front: string;
  back: string;
  phonetic?: string;
  example?: string;
  partOfSpeech?: string;
  synonyms?: string;
  collocations?: string;
  toeicPart?: string;
}

interface ParsedDeck {
  title: string;
  description: string;
  cards: ParsedCard[];
}

// ───────────────────────────── CSV Parser ─────────────────────────────
// Hỗ trợ CSV với dấu phẩy hoặc chấm phẩy, có thể có quoted fields.
// Dòng đầu tiên là header (case-insensitive).
// Tên cột: front/term, back/definition/meaning, phonetic, example,
//          partOfSpeech/part_of_speech, synonyms, collocations, toeicPart/toeic_part
function parseCSVLine(line: string, sep: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === sep[0] && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function detectSeparator(headerLine: string): string {
  const tabCount = (headerLine.match(/\t/g) || []).length;
  const semicolonCount = (headerLine.match(/;/g) || []).length;
  const commaCount = (headerLine.match(/,/g) || []).length;
  if (tabCount > commaCount && tabCount > semicolonCount) return "\t";
  if (semicolonCount > commaCount) return ";";
  return ",";
}

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[\s_-]/g, "");
}

const HEADER_MAP: Record<string, keyof ParsedCard> = {
  front: "front",
  term: "front",
  word: "front",
  back: "back",
  definition: "back",
  meaning: "back",
  translation: "back",
  phonetic: "phonetic",
  pronunciation: "phonetic",
  example: "example",
  sentence: "example",
  partofspeech: "partOfSpeech",
  pos: "partOfSpeech",
  type: "partOfSpeech",
  synonyms: "synonyms",
  synonym: "synonyms",
  collocations: "collocations",
  collocation: "collocations",
  toeicpart: "toeicPart",
  toeic: "toeicPart",
};

function parseCSV(text: string, fileName: string): ParsedDeck {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) throw new Error("File CSV phải có ít nhất 1 dòng header và 1 dòng dữ liệu.");

  const sep = detectSeparator(lines[0]);
  const headers = parseCSVLine(lines[0], sep).map(normalizeHeader);

  const fieldMap: (keyof ParsedCard | null)[] = headers.map(
    (h) => HEADER_MAP[h] ?? null
  );

  const frontIdx = fieldMap.indexOf("front");
  const backIdx = fieldMap.indexOf("back");
  if (frontIdx === -1 || backIdx === -1) {
    throw new Error(
      'File CSV thiếu cột "front" (hoặc term/word) và "back" (hoặc definition/meaning). Vui lòng kiểm tra header.'
    );
  }

  const cards: ParsedCard[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i], sep);
    const front = cols[frontIdx]?.trim();
    const back = cols[backIdx]?.trim();
    if (!front || !back) continue;

    const card: ParsedCard = { front, back };
    fieldMap.forEach((field, idx) => {
      if (field && field !== "front" && field !== "back" && cols[idx]?.trim()) {
        (card as any)[field] = cols[idx].trim();
      }
    });
    cards.push(card);
  }

  if (cards.length === 0) throw new Error("Không tìm thấy dữ liệu hợp lệ trong file CSV.");

  const title = fileName.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ");
  return { title, description: `Nhập từ file ${fileName}`, cards };
}

// ───────────────────────────── TXT Parser (Anki/tab-separated) ─────────────────────────────
// Format: front\tback  hoặc front::back mỗi dòng
function parseTXT(text: string, fileName: string): ParsedDeck {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith("#"));
  const cards: ParsedCard[] = [];

  for (const line of lines) {
    let parts: string[];
    if (line.includes("\t")) {
      parts = line.split("\t");
    } else if (line.includes("::")) {
      parts = line.split("::");
    } else if (line.includes(";")) {
      parts = line.split(";");
    } else {
      continue;
    }
    const front = parts[0]?.trim();
    const back = parts[1]?.trim();
    if (front && back) cards.push({ front, back, phonetic: parts[2]?.trim() || "" });
  }

  if (cards.length === 0) throw new Error("Không đọc được dữ liệu. File TXT cần định dạng: front\\tback hoặc front::back mỗi dòng.");

  const title = fileName.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ");
  return { title, description: `Nhập từ file ${fileName}`, cards };
}

// ───────────────────────────── JSON Parser ─────────────────────────────
// Hỗ trợ 2 dạng:
// 1. { title, description, cards: [{front, back, ...}] }
// 2. [{front, back, ...}]  (array)
function parseJSON(text: string, fileName: string): ParsedDeck {
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("File JSON không hợp lệ. Vui lòng kiểm tra lại cú pháp.");
  }

  // Dạng mảng
  if (Array.isArray(data)) {
    const cards = validateCards(data);
    const title = fileName.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ");
    return { title, description: `Nhập từ file ${fileName}`, cards };
  }

  // Dạng object
  if (typeof data === "object" && data !== null) {
    const title = (data.title as string) || fileName.replace(/\.[^.]+$/, "");
    const description = (data.description as string) || "";
    const rawCards = Array.isArray(data.cards) ? data.cards : Array.isArray(data.flashcards) ? data.flashcards : [];
    const cards = validateCards(rawCards);
    return { title, description, cards };
  }

  throw new Error("Định dạng JSON không được hỗ trợ. Cần là object {title, cards:[]} hoặc mảng [{front,back}].");
}

function validateCards(rawCards: any[]): ParsedCard[] {
  if (!rawCards.length) throw new Error("Không có thẻ nào trong file.");
  const cards: ParsedCard[] = [];
  for (const c of rawCards) {
    const front = c.front?.trim() || c.term?.trim() || c.word?.trim();
    const back = c.back?.trim() || c.definition?.trim() || c.meaning?.trim() || c.translation?.trim();
    if (!front || !back) continue;
    cards.push({
      front,
      back,
      phonetic: c.phonetic?.trim() || "",
      example: c.example?.trim() || "",
      partOfSpeech: c.partOfSpeech?.trim() || c.part_of_speech?.trim() || "",
      synonyms: c.synonyms?.trim() || "",
      collocations: c.collocations?.trim() || "",
      toeicPart: c.toeicPart?.trim() || c.toeic_part?.trim() || "",
    });
  }
  if (!cards.length) throw new Error("Không tìm thấy thẻ hợp lệ (cần có trường front và back).");
  return cards;
}

// ───────────────────────────── Route Handler ─────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const customTitle = (formData.get("title") as string | null)?.trim();

    if (!file) {
      return NextResponse.json({ error: "Không tìm thấy file" }, { status: 400 });
    }

    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File quá lớn. Kích thước tối đa là 5MB." }, { status: 400 });
    }

    const fileName = file.name;
    const ext = fileName.split(".").pop()?.toLowerCase();

    if (!["csv", "json", "txt"].includes(ext || "")) {
      return NextResponse.json(
        { error: "Chỉ hỗ trợ file CSV, JSON, và TXT." },
        { status: 400 }
      );
    }

    const text = await file.text();

    let parsed: ParsedDeck;
    if (ext === "csv") {
      parsed = parseCSV(text, fileName);
    } else if (ext === "json") {
      parsed = parseJSON(text, fileName);
    } else {
      parsed = parseTXT(text, fileName);
    }

    // Override title nếu user nhập tên tùy chỉnh
    if (customTitle) parsed.title = customTitle;

    // Lưu vào DB
    const deck = await prisma.$transaction(async (tx) => {
      const newDeck = await tx.deck.create({
        data: {
          title: parsed.title,
          description: parsed.description,
          cardCount: parsed.cards.length,
          userId: session.user!.id,
        },
      });

      await tx.card.createMany({
        data: parsed.cards.map((card) => ({
          deckId: newDeck.id,
          front: card.front,
          back: card.back,
          phonetic: card.phonetic || "",
          example: card.example || "",
          partOfSpeech: card.partOfSpeech || "",
          synonyms: card.synonyms || "",
          collocations: card.collocations || "",
          toeicPart: card.toeicPart || "",
        })),
      });

      return newDeck;
    });

    return NextResponse.json(
      {
        message: "Nhập file thành công!",
        deck: {
          id: deck.id,
          title: deck.title,
          cardCount: deck.cardCount,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Import deck error:", error);
    return NextResponse.json(
      { error: error?.message || "Có lỗi xảy ra khi xử lý file." },
      { status: 500 }
    );
  }
}

import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decks = await prisma.deck.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
    });
    const result = decks.map((d) => ({ ...d, _id: d.id }));
    return NextResponse.json(result);
  } catch (err) {
    console.error("GET /api/decks error:", err);
    return NextResponse.json(
      { error: "Failed to fetch decks" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, description } = body;

    if (!title || typeof title !== "string") {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const deck = await prisma.deck.create({
      data: { 
        title, 
        description: description || "",
        userId: session.user.id 
      },
    });

    return NextResponse.json({ ...deck, _id: deck.id }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create deck" },
      { status: 500 },
    );
  }
}

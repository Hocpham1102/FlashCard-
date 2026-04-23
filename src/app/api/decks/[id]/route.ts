import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const deck = await prisma.deck.findUnique({ where: { id } });

    if (!deck || deck.userId !== session.user.id) {
      return NextResponse.json({ error: "Deck not found" }, { status: 404 });
    }

    return NextResponse.json({ ...deck, _id: deck.id });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch deck" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const existingDeck = await prisma.deck.findUnique({ where: { id } });
    if (!existingDeck || existingDeck.userId !== session.user.id) {
      return NextResponse.json({ error: "Deck not found" }, { status: 404 });
    }

    const body = await request.json();
    const { title, description } = body;

    const updateData: { title?: string; description?: string } = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;

    const deck = await prisma.deck.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ ...deck, _id: deck.id });
  } catch {
    return NextResponse.json(
      { error: "Failed to update deck" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const existingDeck = await prisma.deck.findUnique({ where: { id } });
    if (!existingDeck || existingDeck.userId !== session.user.id) {
      return NextResponse.json({ error: "Deck not found" }, { status: 404 });
    }

    await prisma.deck.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete deck" },
      { status: 500 },
    );
  }
}

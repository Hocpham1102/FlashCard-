import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;
    const deck = await prisma.deck.findUnique({ where: { id } });

    if (!deck) {
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
    const { id } = params;
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
    const { id } = params;

    await prisma.deck.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete deck" },
      { status: 500 },
    );
  }
}

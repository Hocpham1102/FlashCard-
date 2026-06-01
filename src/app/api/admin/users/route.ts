export const dynamic = "force-dynamic";

import { canAccessAdminArea } from "@/lib/admin";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session?.user?.id ||
      !canAccessAdminArea({ role: session.user.role })
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      orderBy: { emailVerified: "desc" },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        emailVerified: true,
        _count: {
          select: { decks: true },
        },
      },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("GET /api/admin/users error:", error);
    return NextResponse.json(
      { error: "Không thể tải danh sách người dùng" },
      { status: 500 },
    );
  }
}

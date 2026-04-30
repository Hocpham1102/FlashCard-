import { canAccessAdminArea } from "@/lib/admin";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

const allowedRoles = new Set<UserRole>(["USER", "ADMIN"]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session?.user?.id ||
      !canAccessAdminArea({
        role: session.user.role,
      })
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role } = await request.json();

    if (!allowedRoles.has(role)) {
      return NextResponse.json({ error: "Role không hợp lệ" }, { status: 400 });
    }

    if (session.user.id === params.id && role !== "ADMIN") {
      return NextResponse.json(
        { error: "Không thể tự hạ quyền admin của chính bạn" },
        { status: 400 },
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: { role },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
      },
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error("PATCH /api/admin/users/[id]/role error:", error);
    return NextResponse.json(
      { error: "Không thể cập nhật quyền tài khoản" },
      { status: 500 },
    );
  }
}

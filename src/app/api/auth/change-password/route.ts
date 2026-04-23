import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ hasPassword: false }, { status: 401 });
    }
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true }
    });
    return NextResponse.json({ hasPassword: !!dbUser?.password }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ hasPassword: false }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ message: "Chưa đăng nhập" }, { status: 401 });
    }

    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ message: "Vui lòng nhập đủ thông tin" }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ message: "Mật khẩu mới phải từ 6 ký tự trở lên" }, { status: 400 });
    }

    // Find user
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!dbUser) {
      return NextResponse.json({ message: "Không tìm thấy tài khoản" }, { status: 404 });
    }

    if (!dbUser.password) {
      return NextResponse.json({ message: "Tài khoản của bạn được liên kết với Google, không sử dụng mật khẩu." }, { status: 400 });
    }

    const isMatch = await bcrypt.compare(currentPassword, dbUser.password);
    if (!isMatch) {
      return NextResponse.json({ message: "Mật khẩu hiện tại không đúng" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: dbUser.id },
      data: { password: hashedPassword },
    });

    return NextResponse.json({ message: "Đổi mật khẩu thành công" }, { status: 200 });

  } catch (error: any) {
    console.error("Change password error:", error);
    return NextResponse.json({ message: "Có lỗi xảy ra trong quá trình xử lý" }, { status: 500 });
  }
}

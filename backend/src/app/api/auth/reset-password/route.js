import { NextResponse } from "next/server";
import prisma from "@/lib/prisma"; // fixed relative path
import bcrypt from "bcryptjs";
import Cors from "cors";

// Initialize CORS middleware
const cors = Cors({
  origin: "*", // For testing; restrict to your extension ID in production
  methods: ["POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});

// Helper to run middleware in Next.js
function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) return reject(result);
      return resolve(result);
    });
  });
}

export async function POST(req) {
  const res = new NextResponse();

  // Run CORS middleware
  await runMiddleware(req, res, cors);

  try {
    const { token, newPassword } = await req.json();

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken || resetToken.expiresAt < new Date()) {
      return NextResponse.json(
        { message: "Invalid or expired token" },
        { status: 400 }
      );
    }

    // hash password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // update user password
    await prisma.user.update({
      where: { id: resetToken.userId },
      data: { password: hashedPassword },
    });

    // delete token after use
    await prisma.passwordResetToken.delete({ where: { id: resetToken.id } });

    return NextResponse.json({ message: "Password reset successful" });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Error resetting password" },
      { status: 500 }
    );
  }
}

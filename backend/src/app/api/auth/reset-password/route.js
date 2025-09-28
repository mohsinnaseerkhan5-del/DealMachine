import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req) {
  try {
    const { token, newPassword } = await req.json();

    if (!token || !newPassword) {
      return NextResponse.json(
        { message: "Token and new password are required" },
        {
          status: 400,
          headers: corsHeaders(),
        }
      );
    }

    // Find reset token in DB
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken || resetToken.expiresAt < new Date()) {
      return NextResponse.json(
        { message: "Invalid or expired token" },
        {
          status: 400,
          headers: corsHeaders(),
        }
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await prisma.user.update({
      where: { id: resetToken.userId },
      data: { password: hashedPassword },
    });

    // Delete reset token (prevent reuse)
    await prisma.passwordResetToken.delete({ where: { id: resetToken.id } });

    return NextResponse.json(
      { message: "Password reset successful" },
      { status: 200, headers: corsHeaders() }
    );
  } catch (error) {
    console.error("Reset error:", error);
    return NextResponse.json(
      { message: "Error resetting password" },
      { status: 500, headers: corsHeaders() }
    );
  }
}

// Common CORS headers
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*", // later restrict to your extension ID
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

// Handle CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200, headers: corsHeaders() });
}

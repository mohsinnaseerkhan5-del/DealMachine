import { NextResponse } from "next/server";
import prisma from "../../../lib/prisma"; // correct relative path

import crypto from "crypto";

export async function POST(req) {
  try {
    const { email } = await req.json();

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // generate token
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // save token to DB (you may need a PasswordResetToken model in prisma schema)
    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt: expires,
      },
    });

    // TODO: send email with link (use nodemailer or similar)
    console.log(`Password reset link: https://yourdomain.com/reset-password?token=${token}`);

    return NextResponse.json({ message: "Reset link sent to email" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Error sending reset link" }, { status: 500 });
  }
}

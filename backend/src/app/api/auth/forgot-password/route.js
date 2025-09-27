import { NextResponse } from "next/server";
import prisma from "@/lib/prisma"; // correct relative path
import crypto from "crypto";
import Cors from "cors";

// Initialize CORS middleware
const cors = Cors({
  origin: "*", // For testing; in production, restrict to your extension ID
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
    const { email } = await req.json();

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    // generate token
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // save token to DB
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
    return NextResponse.json(
      { message: "Error sending reset link" },
      { status: 500 }
    );
  }
}

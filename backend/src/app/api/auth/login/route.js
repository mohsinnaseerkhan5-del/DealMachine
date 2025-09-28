import { NextResponse } from "next/server";
import { prisma, verifyPassword, generateToken } from "@/lib/auth";

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400, headers: corsHeaders() }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401, headers: corsHeaders() }
      );
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401, headers: corsHeaders() }
      );
    }

    // Check approval (unless admin)
    if (!user.isAdmin && !user.isApproved) {
      return NextResponse.json(
        { error: "Account pending admin approval" },
        { status: 403, headers: corsHeaders() }
      );
    }

    // Generate JWT token
    const token = generateToken({ userId: user.id });

    // Exclude password from response
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json(
      { token, user: userWithoutPassword },
      { status: 200, headers: corsHeaders() }
    );
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders() }
    );
  }
}

// Common CORS headers
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*", // later replace with your extension ID
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

// Handle preflight (CORS)
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200, headers: corsHeaders() });
}

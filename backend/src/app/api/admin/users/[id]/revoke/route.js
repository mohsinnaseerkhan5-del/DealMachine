import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
};

export async function POST(request, { params }) {
  try {
    const authResult = await requireAdmin(request);
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status, headers }
      );
    }

    const { id } = params; // keep ID as string, do NOT parse

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        isApproved: true,
        isAdmin: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404, headers });
    }

    if (user.isAdmin) {
      return NextResponse.json({ error: "Cannot revoke an admin user" }, { status: 400, headers });
    }

    if (!user.isApproved) {
      return NextResponse.json({ error: "User is already not approved" }, { status: 400, headers });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isApproved: false },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        isApproved: true,
        isAdmin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      { message: "User access revoked successfully", user: updatedUser },
      { headers }
    );
  } catch (error) {
    console.error("Revoke user error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers });
  }
}

// Handle OPTIONS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

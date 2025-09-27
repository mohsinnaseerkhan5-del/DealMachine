import { NextResponse } from 'next/server';
import { prisma, verifyPassword, generateToken } from '@/lib/auth';
import Cors from 'cors';

// Initialize CORS middleware
const cors = Cors({
  origin: '*', // For testing: allow all. For production, restrict to your Chrome extension ID
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
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

export async function POST(request) {
  // Create a dummy response object for middleware
  const res = new NextResponse();

  // Run CORS middleware
  await runMiddleware(request, res, cors);

  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if user is approved (unless admin)
    if (!user.isAdmin && !user.isApproved) {
      return NextResponse.json(
        { error: 'Account pending admin approval' },
        { status: 403 }
      );
    }

    // Generate JWT token
    const token = generateToken({ userId: user.id });

    // Return user data (excluding password)
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      token,
      user: userWithoutPassword,
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

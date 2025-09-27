import { NextResponse } from 'next/server';
import { prisma, hashPassword } from '@/lib/auth';
import Cors from 'cors';

// Initialize CORS middleware
const cors = Cors({
  origin: '*', // For testing: allow all. For production, restrict to your extension ID
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
  const res = new NextResponse();
  
  // Run CORS middleware
  await runMiddleware(request, res, cors);

  try {
    const { firstName, lastName, email, password } = await request.json();

    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const emailLower = email.toLowerCase();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: emailLower },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user (unapproved by default)
    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email: emailLower,
        password: hashedPassword,
        isApproved: false,
        isAdmin: false,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        isApproved: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      message: 'Registration successful. Awaiting admin approval.',
      user,
    });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

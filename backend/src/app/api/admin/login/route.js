import { NextResponse } from 'next/server';
import { prisma, verifyPassword, generateToken } from '@/lib/auth';
import Cors from 'cors';

// Initialize CORS middleware
const cors = Cors({
  origin: '*', // For testing; restrict to extension ID in production
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
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find admin user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: 'Invalid admin credentials' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid admin credentials' },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = generateToken({ userId: user.id });

    // Return admin data (excluding password)
    const { password: _, ...adminWithoutPassword } = user;

    return NextResponse.json({
      token,
      admin: adminWithoutPassword,
    });

  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

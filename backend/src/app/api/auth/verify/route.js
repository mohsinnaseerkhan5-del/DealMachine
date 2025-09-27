import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import Cors from 'cors';

// Initialize CORS middleware
const cors = Cors({
  origin: '*', // For testing; in production, restrict to your extension ID
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
    const authResult = await requireAuth(request);

    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    return NextResponse.json({
      user: authResult.user,
    });

  } catch (error) {
    console.error('Token verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

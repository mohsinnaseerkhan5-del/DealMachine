import { NextResponse } from 'next/server';
import { requireAuth, prisma } from '@/lib/auth';
import Cors from 'cors';

// Initialize CORS middleware
const cors = Cors({
  origin: '*', // For testing; restrict to your extension ID in production
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

    const user = authResult.user;

    // Check if user is approved
    if (!user.isApproved) {
      return NextResponse.json(
        { error: 'User not approved for scraping' },
        { status: 403 }
      );
    }

    const { dataCount, status } = await request.json();

    if (typeof dataCount !== 'number' || !status) {
      return NextResponse.json(
        { error: 'Invalid data format' },
        { status: 400 }
      );
    }

    // Log the scraping session
    const scrapingSession = await prisma.scrapingSession.create({
      data: {
        userId: user.id,
        dataCount,
        status,
      },
    });

    return NextResponse.json({
      message: 'Scraping session logged successfully',
      session: scrapingSession,
    });

  } catch (error) {
    console.error('Log scraping session error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { requireAuth, prisma } from '@/lib/auth';

export async function POST(request) {
  try {
    const authResult = await requireAuth(request);

    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const user = authResult.user;

    // Check if user is approved
    if (!user.isApproved) {
      return NextResponse.json(
        { error: 'User not approved for scraping' },
        { status: 403, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const { dataCount, status } = await request.json();

    if (typeof dataCount !== 'number' || !status) {
      return NextResponse.json(
        { error: 'Invalid data format' },
        { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
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

    return NextResponse.json(
      {
        message: 'Scraping session logged successfully',
        session: scrapingSession,
      },
      { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } }
    );

  } catch (error) {
    console.error('Log scraping session error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}

// For preflight OPTIONS (needed for Chrome extension)
export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  );
}

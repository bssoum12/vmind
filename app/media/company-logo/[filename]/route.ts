import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: { filename: string } }
) {
  const filename = params?.filename;
  if (!filename || !/^[a-zA-Z0-9_\-]+(\.[a-zA-Z0-9]+)?$/i.test(filename)) {
    return new NextResponse('Invalid logo identifier', { status: 400 });
  }

  const s3Url = `https://prospeo-static-assets.s3.us-east-1.amazonaws.com/company_logo/${filename}`;

  try {
    const upstreamRes = await fetch(s3Url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    });

    if (!upstreamRes.ok) {
      return new NextResponse('Logo not found', { status: upstreamRes.status });
    }

    const contentType = upstreamRes.headers.get('content-type') || 'image/jpeg';
    const imageBuffer = await upstreamRes.arrayBuffer();

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=604800, immutable',
      },
    });
  } catch {
    return new NextResponse('Failed to retrieve logo', { status: 502 });
  }
}

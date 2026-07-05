import { NextRequest, NextResponse } from 'next/server';

// Sentry tunnel route — proxies Sentry events to avoid ad blockers
export async function POST(request: NextRequest) {
  try {
    const envelope = await request.text();
    const piece = envelope.split('\n')[0];
    const header = JSON.parse(piece);
    const dsn = header.dsn;

    if (!dsn) {
      return NextResponse.json({ error: 'missing dsn' }, { status: 400 });
    }

    const dsnUrl = new URL(dsn);
    const projectId = dsnUrl.pathname.replace('/', '');
    const sentryHost = dsnUrl.host;

    // SSRF protection: only allow legitimate Sentry hosts
    const allowedPattern = /^[a-z0-9]+\.ingest\.(us\.)?sentry\.io$/;
    if (!allowedPattern.test(sentryHost) && sentryHost !== 'sentry.io') {
      return NextResponse.json({ error: 'invalid dsn host' }, { status: 400 });
    }

    const upstreamUrl = `https://${sentryHost}/api/${projectId}/envelope/`;
    const upstreamResponse = await fetch(upstreamUrl, {
      method: 'POST',
      body: envelope,
      headers: { 'Content-Type': 'application/x-sentry-envelope' },
    });

    return new NextResponse(upstreamResponse.body, {
      status: upstreamResponse.status,
    });
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }
}

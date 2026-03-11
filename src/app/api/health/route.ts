import { NextResponse } from 'next/server';

const startTime = Date.now();

export async function GET() {
  const uptime = Math.floor((Date.now() - startTime) / 1000);

  return NextResponse.json(
    {
      status: 'ok',
      version: process.env.npm_package_version ?? '1.0.0',
      uptime,
      dependencies: {
        nextjs: 'ok',
        react: 'ok',
      },
    },
    { status: 200 }
  );
}

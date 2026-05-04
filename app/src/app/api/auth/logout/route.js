import { NextResponse } from 'next/server';
import { logout, getSiteBase } from '@/lib/auth.js';

export async function POST(req) {
  await logout();
  return NextResponse.redirect(new URL('/', getSiteBase(req)));
}

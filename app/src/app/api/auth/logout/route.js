import { NextResponse } from 'next/server';
import { logout } from '@/lib/auth.js';

export async function POST() {
  logout();
  return NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'));
}

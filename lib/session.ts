import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

export const SESSION_COOKIE_NAME = 'trip_session';

function getJwtSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET || 'default_dev_session_secret_min_32_bytes_long_123456';
  return new TextEncoder().encode(secret);
}

/**
 * Creates a signed JWT session token for the user.
 */
export async function createSessionToken(userId: string): Promise<string> {
  const secretKey = getJwtSecretKey();
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secretKey);
}

/**
 * Verifies a signed JWT session token.
 * Returns the userId if valid, or null if missing/tampered/expired.
 * Never throws an error to the caller.
 */
export async function verifySessionToken(token: string | undefined | null): Promise<string | null> {
  if (!token) return null;

  try {
    const secretKey = getJwtSecretKey();
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ['HS256'],
    });

    if (payload && typeof payload.userId === 'string') {
      return payload.userId;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Extracts and verifies the session token from cookies in a server context.
 */
export async function getSessionUserId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

/**
 * Sets the signed session cookie in Next.js response context.
 */
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

/**
 * Clears the session cookie.
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

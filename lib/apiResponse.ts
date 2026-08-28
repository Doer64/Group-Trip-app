import { NextResponse } from 'next/server';

export function jsonSuccess<T>(data: T, status: number = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(
  message: string,
  status: number = 400,
  code: string = 'BAD_REQUEST'
) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
      },
    },
    { status }
  );
}

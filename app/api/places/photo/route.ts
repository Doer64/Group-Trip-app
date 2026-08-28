import { NextRequest, NextResponse } from 'next/server';
import { fetchPlacePhotoStream } from '@/lib/services/placesService';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const photoRef = searchParams.get('photoRef');
    const maxWidthStr = searchParams.get('maxWidth');
    const maxWidth = maxWidthStr ? parseInt(maxWidthStr, 10) : 800;

    if (!photoRef) {
      return new NextResponse('Photo reference required', { status: 400 });
    }

    const photoData = await fetchPlacePhotoStream(photoRef, isNaN(maxWidth) ? 800 : maxWidth);

    if (!photoData) {
      return new NextResponse('Photo not found', { status: 404 });
    }

    return new NextResponse(photoData.buffer, {
      status: 200,
      headers: {
        'Content-Type': photoData.contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200',
      },
    });
  } catch (error) {
    console.error('Error proxying photo:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}

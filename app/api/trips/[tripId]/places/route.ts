import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSessionUserId } from '@/lib/session';
import { searchPlaces } from '@/lib/services/placesService';
import { jsonSuccess, jsonError } from '@/lib/apiResponse';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params;
    const currentUserId = await getSessionUserId();

    if (!currentUserId) {
      return jsonError('Unauthorized: Please identify first', 401, 'UNAUTHORIZED');
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query');

    if (!query || query.trim().length === 0) {
      return jsonError('Search query is required', 400, 'QUERY_REQUIRED');
    }

    const supabase = createServerSupabaseClient();

    // 1. Verify membership
    const { data: membership, error: memberError } = await supabase
      .from('trip_members')
      .select('user_id')
      .eq('trip_id', tripId)
      .eq('user_id', currentUserId)
      .maybeSingle();

    if (memberError || !membership) {
      return jsonError('You are not a member of this trip', 403, 'FORBIDDEN');
    }

    // 2. Fetch trip destination for contextual search
    const { data: trip } = await supabase
      .from('trips')
      .select('destination')
      .eq('id', tripId)
      .maybeSingle();

    const destination = trip?.destination;

    // 3. Search Google Places
    try {
      const places = await searchPlaces(query.trim(), destination);
      return jsonSuccess({ places });
    } catch (placesError: any) {
      console.error('Google Places API search failed:', placesError);
      return jsonError(
        'Places search is currently unavailable. Please try again in a moment.',
        502,
        'UPSTREAM_SERVICE_ERROR'
      );
    }
  } catch (error) {
    console.error('Error in GET /api/trips/[tripId]/places:', error);
    return jsonError('Internal server error', 500, 'INTERNAL_SERVER_ERROR');
  }
}

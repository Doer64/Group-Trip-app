import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSessionUserId } from '@/lib/session';
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

    // 2. Fetch trip info
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select(`
        id,
        destination,
        creator_id,
        invite_token,
        created_at,
        creator:creator_id (
          id,
          name,
          email
        )
      `)
      .eq('id', tripId)
      .maybeSingle();

    if (tripError || !trip) {
      return jsonError('Trip not found', 404, 'NOT_FOUND');
    }

    // 3. Fetch all members
    const { data: memberRows } = await supabase
      .from('trip_members')
      .select(`
        joined_at,
        user:user_id (
          id,
          name,
          email
        )
      `)
      .eq('trip_id', tripId)
      .order('joined_at', { ascending: true });

    const members = (memberRows || []).map((m: any) => m.user).filter(Boolean);

    return jsonSuccess({
      trip: {
        id: trip.id,
        destination: trip.destination,
        creator_id: trip.creator_id,
        invite_token: trip.invite_token,
        created_at: trip.created_at,
        creator: trip.creator,
        members,
        isCreator: trip.creator_id === currentUserId,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/trips/[tripId]:', error);
    return jsonError('Internal server error', 500, 'INTERNAL_SERVER_ERROR');
  }
}

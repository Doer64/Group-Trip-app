import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSessionUserId } from '@/lib/session';
import { jsonSuccess, jsonError } from '@/lib/apiResponse';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    if (!token) {
      return jsonError('Invite token is required', 400, 'INVALID_TOKEN');
    }

    const supabase = createServerSupabaseClient();

    // Look up trip by invite_token
    const { data: trip, error } = await supabase
      .from('trips')
      .select(`
        id,
        destination,
        creator_id,
        invite_token,
        created_at,
        users:creator_id (
          id,
          name,
          email
        )
      `)
      .eq('invite_token', token)
      .maybeSingle();

    if (error || !trip) {
      return jsonError('Trip invite link not found or expired', 404, 'NOT_FOUND');
    }

    // Check if the requesting user is already a member
    const currentUserId = await getSessionUserId();
    let isMember = false;

    if (currentUserId) {
      const { data: memberRow } = await supabase
        .from('trip_members')
        .select('user_id')
        .eq('trip_id', trip.id)
        .eq('user_id', currentUserId)
        .maybeSingle();

      if (memberRow) {
        isMember = true;
      }
    }

    return jsonSuccess({
      tripId: trip.id,
      destination: trip.destination,
      creatorName: (trip.users as any)?.name || 'An organizer',
      isMember,
      currentUserId,
    });
  } catch (error) {
    console.error('Error in GET /api/trips/by-invite/[token]:', error);
    return jsonError('Internal server error', 500, 'INTERNAL_SERVER_ERROR');
  }
}

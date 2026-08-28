import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSessionUserId } from '@/lib/session';
import { jsonSuccess, jsonError } from '@/lib/apiResponse';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ tripId: string; attractionId: string }> }
) {
  try {
    const { tripId, attractionId } = await params;
    const currentUserId = await getSessionUserId();

    if (!currentUserId) {
      return jsonError('Unauthorized: Please identify first', 401, 'UNAUTHORIZED');
    }

    const supabase = createServerSupabaseClient();

    // 1. Fetch trip and attraction
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('id, creator_id')
      .eq('id', tripId)
      .maybeSingle();

    if (tripError || !trip) {
      return jsonError('Trip not found', 404, 'NOT_FOUND');
    }

    const { data: attraction, error: attrError } = await supabase
      .from('attractions')
      .select('id, trip_id, added_by_user_id')
      .eq('id', attractionId)
      .eq('trip_id', tripId)
      .maybeSingle();

    if (attrError || !attraction) {
      return jsonError('Attraction not found', 404, 'NOT_FOUND');
    }

    // 2. Check permissions: Organizer or original proposer
    const isOrganizer = trip.creator_id === currentUserId;
    const isProposer = attraction.added_by_user_id === currentUserId;

    if (!isOrganizer && !isProposer) {
      return jsonError(
        'Only the trip organizer or the person who proposed this attraction can delete it',
        403,
        'FORBIDDEN'
      );
    }

    // 3. Delete votes for this attraction
    await supabase.from('votes').delete().eq('attraction_id', attractionId);

    // 4. Delete the attraction
    const { error: deleteError } = await supabase
      .from('attractions')
      .delete()
      .eq('id', attractionId);

    if (deleteError) {
      console.error('Error deleting attraction:', deleteError);
      return jsonError('Failed to delete attraction', 500, 'DATABASE_ERROR');
    }

    return jsonSuccess({
      success: true,
      deletedId: attractionId,
    });
  } catch (error) {
    console.error('Error in DELETE /api/trips/[tripId]/attractions/[attractionId]:', error);
    return jsonError('Internal server error', 500, 'INTERNAL_SERVER_ERROR');
  }
}

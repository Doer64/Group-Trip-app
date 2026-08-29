import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSessionUserId } from '@/lib/session';
import { jsonSuccess, jsonError } from '@/lib/apiResponse';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params;

    // 1. Require authenticated session
    const userId = await getSessionUserId();
    if (!userId) {
      return jsonError('You must be signed in to join a trip', 401, 'UNAUTHORIZED');
    }

    const supabase = createServerSupabaseClient();

    // 2. Verify trip exists
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('id, destination')
      .eq('id', tripId)
      .maybeSingle();

    if (tripError || !trip) {
      return jsonError('Trip not found', 404, 'NOT_FOUND');
    }

    // 3. Verify user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (userError || !user) {
      return jsonError('User account not found', 404, 'NOT_FOUND');
    }

    // 4. Add to trip_members if not already member
    const { error: memberInsertError } = await supabase
      .from('trip_members')
      .upsert(
        {
          trip_id: tripId,
          user_id: user.id,
        },
        { onConflict: 'trip_id,user_id' }
      );

    if (memberInsertError) {
      console.error('Error adding member to trip:', memberInsertError);
      return jsonError('Failed to join trip', 500, 'DATABASE_ERROR');
    }

    return jsonSuccess({
      success: true,
      tripId,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error('Error in POST /api/trips/[tripId]/members:', error);
    return jsonError('Internal server error', 500, 'INTERNAL_SERVER_ERROR');
  }
}

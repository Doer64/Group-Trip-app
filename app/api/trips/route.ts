import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createTripSchema } from '@/lib/validations/schemas';
import { getSessionUserId } from '@/lib/session';
import { jsonSuccess, jsonError } from '@/lib/apiResponse';

export async function POST(req: NextRequest) {
  try {
    // 1. Require authenticated session
    const userId = await getSessionUserId();
    if (!userId) {
      return jsonError('You must be signed in to create a trip', 401, 'UNAUTHORIZED');
    }

    const body = await req.json().catch(() => ({}));
    const parseResult = createTripSchema.safeParse(body);

    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]?.message || 'Invalid input';
      return jsonError(firstError, 400, 'VALIDATION_ERROR');
    }

    const { destination } = parseResult.data;
    const supabase = createServerSupabaseClient();

    // 2. Look up the authenticated user
    const { data: creator, error: findUserError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (findUserError || !creator) {
      console.error('Error finding creator:', findUserError);
      return jsonError('User account not found', 404, 'NOT_FOUND');
    }

    // 3. Generate a unique cryptographically random invite token
    const inviteToken = crypto.randomBytes(6).toString('hex');

    // 4. Create the trip
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .insert({
        destination: destination.trim(),
        creator_id: creator.id,
        invite_token: inviteToken,
      })
      .select()
      .single();

    if (tripError || !trip) {
      console.error('Error creating trip:', tripError);
      return jsonError('Failed to create trip', 500, 'DATABASE_ERROR');
    }

    // 5. Add creator as a trip member
    const { error: memberError } = await supabase
      .from('trip_members')
      .insert({
        trip_id: trip.id,
        user_id: creator.id,
      });

    if (memberError) {
      console.error('Error adding creator to trip_members:', memberError);
    }

    const origin = req.headers.get('origin') || '';
    const inviteUrl = `${origin}/invite/${trip.invite_token}`;

    return jsonSuccess(
      {
        tripId: trip.id,
        destination: trip.destination,
        inviteToken: trip.invite_token,
        inviteUrl,
      },
      201
    );
  } catch (error) {
    console.error('Error in POST /api/trips:', error);
    return jsonError('Internal server error', 500, 'INTERNAL_SERVER_ERROR');
  }
}

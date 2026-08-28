import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createTripSchema } from '@/lib/validations/schemas';
import { createSessionToken, setSessionCookie } from '@/lib/session';
import { jsonSuccess, jsonError } from '@/lib/apiResponse';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parseResult = createTripSchema.safeParse(body);

    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]?.message || 'Invalid input';
      return jsonError(firstError, 400, 'VALIDATION_ERROR');
    }

    const { destination, creatorEmail, creatorName } = parseResult.data;
    const supabase = createServerSupabaseClient();

    // 1. Find or create the creator user
    let { data: creator, error: findUserError } = await supabase
      .from('users')
      .select('*')
      .eq('email', creatorEmail)
      .maybeSingle();

    if (findUserError) {
      console.error('Error finding creator:', findUserError);
      return jsonError('Database query failed', 500, 'DATABASE_ERROR');
    }

    if (!creator) {
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          email: creatorEmail,
          name: creatorName.trim(),
        })
        .select()
        .single();

      if (createError || !newUser) {
        console.error('Error creating creator user:', createError);
        return jsonError('Failed to create user account', 500, 'DATABASE_ERROR');
      }
      creator = newUser;
    }

    // 2. Generate a unique cryptographically random invite token
    const inviteToken = crypto.randomBytes(6).toString('hex');

    // 3. Create the trip
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

    // 4. Add creator as a trip member
    const { error: memberError } = await supabase
      .from('trip_members')
      .insert({
        trip_id: trip.id,
        user_id: creator.id,
      });

    if (memberError) {
      console.error('Error adding creator to trip_members:', memberError);
    }

    // 5. Issue session cookie
    const token = await createSessionToken(creator.id);
    await setSessionCookie(token);

    const origin = req.headers.get('origin') || '';
    const inviteUrl = `${origin}/invite/${trip.invite_token}`;

    return jsonSuccess(
      {
        tripId: trip.id,
        destination: trip.destination,
        inviteToken: trip.invite_token,
        inviteUrl,
        user: {
          id: creator.id,
          email: creator.email,
          name: creator.name,
        },
      },
      201
    );
  } catch (error) {
    console.error('Error in POST /api/trips:', error);
    return jsonError('Internal server error', 500, 'INTERNAL_SERVER_ERROR');
  }
}

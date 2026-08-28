import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { addMemberSchema } from '@/lib/validations/schemas';
import { createSessionToken, setSessionCookie } from '@/lib/session';
import { jsonSuccess, jsonError } from '@/lib/apiResponse';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params;
    const body = await req.json().catch(() => ({}));
    const parseResult = addMemberSchema.safeParse(body);

    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]?.message || 'Invalid input';
      return jsonError(firstError, 400, 'VALIDATION_ERROR');
    }

    const { email, name } = parseResult.data;
    const supabase = createServerSupabaseClient();

    // 1. Verify trip exists
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('id, destination')
      .eq('id', tripId)
      .maybeSingle();

    if (tripError || !trip) {
      return jsonError('Trip not found', 404, 'NOT_FOUND');
    }

    // 2. Find or create user
    let { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (userError) {
      console.error('Error finding user:', userError);
      return jsonError('Database query failed', 500, 'DATABASE_ERROR');
    }

    if (!user) {
      if (!name || name.trim().length === 0) {
        return jsonError(
          'Your name is required to join for the first time',
          400,
          'NAME_REQUIRED'
        );
      }

      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          email,
          name: name.trim(),
        })
        .select()
        .single();

      if (insertError || !newUser) {
        console.error('Error creating user:', insertError);
        return jsonError('Failed to create user account', 500, 'DATABASE_ERROR');
      }
      user = newUser;
    }

    // 3. Add to trip_members if not already member
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

    // 4. Issue session cookie
    const token = await createSessionToken(user.id);
    await setSessionCookie(token);

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

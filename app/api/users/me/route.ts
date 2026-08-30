import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSessionUserId, clearSessionCookie } from '@/lib/session';
import { jsonSuccess, jsonError } from '@/lib/apiResponse';

export async function GET() {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return jsonError('Unauthorized: No active session', 401, 'UNAUTHORIZED');
    }

    const supabase = createServerSupabaseClient();

    // Fetch user profile
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, name, created_at')
      .eq('id', userId)
      .maybeSingle();

    if (userError || !user) {
      return jsonError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Fetch trips where user is a member with member and attraction counts
    const { data: memberRows, error: tripsError } = await supabase
      .from('trip_members')
      .select(`
        trip_id,
        joined_at,
        trips (
          id,
          destination,
          creator_id,
          invite_token,
          image_url,
          created_at,
          trip_members(user_id),
          attractions(id, image_url)
        )
      `)
      .eq('user_id', userId)
      .order('joined_at', { ascending: false });

    if (tripsError) {
      console.error('Error fetching user trips:', tripsError);
    }

    const trips = (memberRows || [])
      .map((row: any) => {
        const t = row.trips;
        if (!t) return null;
        const membersList = Array.isArray(t.trip_members) ? t.trip_members : [];
        const attractionsList = Array.isArray(t.attractions) ? t.attractions : [];
        const coverImage = t.image_url || attractionsList.find((a: any) => !!a.image_url)?.image_url || null;

        return {
          id: t.id,
          destination: t.destination,
          creator_id: t.creator_id,
          invite_token: t.invite_token,
          image_url: t.image_url,
          created_at: t.created_at,
          memberCount: membersList.length || 1,
          attractionCount: attractionsList.length || 0,
          coverImage,
        };
      })
      .filter(Boolean);

    return jsonSuccess({
      user,
      trips,
    });
  } catch (error) {
    console.error('Error in GET /api/users/me:', error);
    return jsonError('Internal server error', 500, 'INTERNAL_SERVER_ERROR');
  }
}

export async function POST() {
  // Logout endpoint: clear session cookie
  await clearSessionCookie();
  return jsonSuccess({ message: 'Logged out successfully' });
}

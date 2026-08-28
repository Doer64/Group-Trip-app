import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSessionUserId } from '@/lib/session';
import { jsonSuccess, jsonError } from '@/lib/apiResponse';
import { RankedAttraction } from '@/lib/types/database.types';

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

    // 2. Fetch trip info & member count
    const { data: trip } = await supabase
      .from('trips')
      .select('id, destination, creator_id')
      .eq('id', tripId)
      .maybeSingle();

    const { count: memberCount } = await supabase
      .from('trip_members')
      .select('*', { count: 'exact', head: true })
      .eq('trip_id', tripId);

    // 3. Fetch attractions with author
    const { data: attractions, error: attrError } = await supabase
      .from('attractions')
      .select(`
        *,
        users:added_by_user_id (
          id,
          name,
          email
        )
      `)
      .eq('trip_id', tripId);

    if (attrError) {
      console.error('Error fetching attractions for results:', attrError);
      return jsonError('Database error', 500, 'DATABASE_ERROR');
    }

    // 4. Fetch all votes for this trip
    const { data: votes, error: votesError } = await supabase
      .from('votes')
      .select('*')
      .eq('trip_id', tripId);

    if (votesError) {
      console.error('Error fetching votes for results:', votesError);
    }

    const allVotes = votes || [];

    // 5. Score and rank attractions
    const rankedList: RankedAttraction[] = (attractions || [])
      .map((attr: any) => {
        const attrVotes = allVotes.filter((v: any) => v.attraction_id === attr.id);
        const likes = attrVotes.filter((v: any) => v.vote_type === 'like').length;
        const dislikes = attrVotes.filter((v: any) => v.vote_type === 'dislike').length;
        const score = likes - dislikes;
        const myVoteRow = attrVotes.find((v: any) => v.user_id === currentUserId);
        const myVote = myVoteRow ? (myVoteRow.vote_type as 'like' | 'dislike') : null;

        const locationObj = attr.location && typeof attr.location === 'object' ? attr.location : null;
        const placeUri =
          locationObj?.placeUri ||
          (attr.place_id ? `https://www.google.com/maps/place/?q=place_id:${attr.place_id}` : undefined);

        return {
          id: attr.id,
          trip_id: attr.trip_id,
          name: attr.name,
          description: attr.description,
          image_url: attr.image_url,
          location: locationObj ? { lat: locationObj.lat, lng: locationObj.lng } : null,
          place_id: attr.place_id,
          added_by_user_id: attr.added_by_user_id,
          created_at: attr.created_at,
          likes,
          dislikes,
          score,
          myVote,
          rank: 0,
          added_by_name: attr.users?.name || 'A trip member',
          place_uri: placeUri,
        };
      })
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.likes !== a.likes) return b.likes - a.likes;
        return new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime();
      })
      .map((item, index) => ({
        ...item,
        rank: index + 1,
      }));

    return jsonSuccess({
      trip: {
        id: trip?.id || tripId,
        destination: trip?.destination || '',
      },
      results: rankedList,
      totalParticipants: memberCount || 1,
      totalVotes: allVotes.length,
    });
  } catch (error) {
    console.error('Error in GET /api/trips/[tripId]/results:', error);
    return jsonError('Internal server error', 500, 'INTERNAL_SERVER_ERROR');
  }
}

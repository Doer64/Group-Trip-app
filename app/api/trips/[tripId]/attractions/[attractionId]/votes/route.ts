import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSessionUserId } from '@/lib/session';
import { voteSchema } from '@/lib/validations/schemas';
import { jsonSuccess, jsonError } from '@/lib/apiResponse';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tripId: string; attractionId: string }> }
) {
  try {
    const { tripId, attractionId } = await params;
    const currentUserId = await getSessionUserId();

    if (!currentUserId) {
      return jsonError('Unauthorized: Please identify first', 401, 'UNAUTHORIZED');
    }

    const body = await req.json().catch(() => ({}));
    const parseResult = voteSchema.safeParse(body);

    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]?.message || 'Invalid vote type';
      return jsonError(firstError, 400, 'VALIDATION_ERROR');
    }

    const { voteType } = parseResult.data;
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

    // 2. Verify attraction belongs to this trip
    const { data: attraction, error: attrError } = await supabase
      .from('attractions')
      .select('id')
      .eq('id', attractionId)
      .eq('trip_id', tripId)
      .maybeSingle();

    if (attrError || !attraction) {
      return jsonError('Attraction not found in this trip', 404, 'NOT_FOUND');
    }

    // 3. Check existing vote
    const { data: existingVote } = await supabase
      .from('votes')
      .select('id, vote_type')
      .eq('attraction_id', attractionId)
      .eq('user_id', currentUserId)
      .maybeSingle();

    let newVoteState: 'like' | 'dislike' | null = voteType;

    if (existingVote) {
      if (existingVote.vote_type === voteType) {
        // Toggle OFF: remove existing vote
        await supabase.from('votes').delete().eq('id', existingVote.id);
        newVoteState = null;
      } else {
        // Update to new vote type
        await supabase
          .from('votes')
          .update({ vote_type: voteType })
          .eq('id', existingVote.id);
      }
    } else {
      // Insert new vote
      await supabase.from('votes').insert({
        attraction_id: attractionId,
        trip_id: tripId,
        user_id: currentUserId,
        vote_type: voteType,
      });
    }

    // 4. Calculate fresh counts
    const { data: allVotes } = await supabase
      .from('votes')
      .select('vote_type')
      .eq('attraction_id', attractionId);

    const votesList = allVotes || [];
    const likes = votesList.filter((v: any) => v.vote_type === 'like').length;
    const dislikes = votesList.filter((v: any) => v.vote_type === 'dislike').length;

    return jsonSuccess({
      attractionId,
      likes,
      dislikes,
      myVote: newVoteState,
    });
  } catch (error) {
    console.error('Error in POST votes:', error);
    return jsonError('Internal server error', 500, 'INTERNAL_SERVER_ERROR');
  }
}

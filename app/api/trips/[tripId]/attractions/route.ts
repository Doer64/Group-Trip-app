import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSessionUserId } from '@/lib/session';
import { createAttractionSchema } from '@/lib/validations/schemas';
import { jsonSuccess, jsonError } from '@/lib/apiResponse';
import { AttractionWithVotes } from '@/lib/types/database.types';

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

    // 2. Fetch all attractions for this trip
    const { data: attractions, error: attractionsError } = await supabase
      .from('attractions')
      .select(`
        *,
        users:added_by_user_id (
          id,
          name,
          email
        )
      `)
      .eq('trip_id', tripId)
      .order('created_at', { ascending: true });

    if (attractionsError) {
      console.error('Error fetching attractions:', attractionsError);
      return jsonError('Failed to fetch attractions', 500, 'DATABASE_ERROR');
    }

    // 3. Fetch all votes for this trip
    const { data: votes, error: votesError } = await supabase
      .from('votes')
      .select('*')
      .eq('trip_id', tripId);

    if (votesError) {
      console.error('Error fetching votes:', votesError);
    }

    const allVotes = votes || [];

    // 4. Aggregate likes, dislikes and caller's vote
    const enrichedAttractions: AttractionWithVotes[] = (attractions || []).map((attr: any) => {
      const attrVotes = allVotes.filter((v: any) => v.attraction_id === attr.id);
      const likes = attrVotes.filter((v: any) => v.vote_type === 'like').length;
      const dislikes = attrVotes.filter((v: any) => v.vote_type === 'dislike').length;
      const myVoteRow = attrVotes.find((v: any) => v.user_id === currentUserId);
      const myVote = myVoteRow ? (myVoteRow.vote_type as 'like' | 'dislike') : null;

      // Extract placeUri if stored in location json or derived
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
        myVote,
        added_by_name: attr.users?.name || 'A trip member',
        place_uri: placeUri,
      };
    });

    return jsonSuccess({ attractions: enrichedAttractions });
  } catch (error) {
    console.error('Error in GET /api/trips/[tripId]/attractions:', error);
    return jsonError('Internal server error', 500, 'INTERNAL_SERVER_ERROR');
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params;
    const currentUserId = await getSessionUserId();

    if (!currentUserId) {
      return jsonError('Unauthorized: Please identify first', 401, 'UNAUTHORIZED');
    }

    const body = await req.json().catch(() => ({}));
    const parseResult = createAttractionSchema.safeParse(body);

    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]?.message || 'Invalid input';
      return jsonError(firstError, 400, 'VALIDATION_ERROR');
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

    const { name, description, imageUrl, photoRef, placeId, location, placeUri } = parseResult.data;

    let finalImageUrl = imageUrl;
    if (!finalImageUrl && photoRef) {
      finalImageUrl = `/api/places/photo?photoRef=${encodeURIComponent(photoRef)}`;
    }

    const locationData = location
      ? {
          lat: location.lat,
          lng: location.lng,
          placeUri: placeUri || (placeId ? `https://www.google.com/maps/place/?q=place_id:${placeId}` : undefined),
        }
      : placeUri
      ? { placeUri }
      : null;

    // 2. Insert attraction
    const { data: attraction, error: insertError } = await supabase
      .from('attractions')
      .insert({
        trip_id: tripId,
        name: name.trim(),
        description: description?.trim() || null,
        image_url: finalImageUrl || null,
        location: locationData,
        place_id: placeId || null,
        added_by_user_id: currentUserId,
      })
      .select(`
        *,
        users:added_by_user_id (
          id,
          name,
          email
        )
      `)
      .single();

    if (insertError || !attraction) {
      console.error('Error inserting attraction:', insertError);
      if (
        insertError?.code === '23505' ||
        insertError?.message?.includes('duplicate key') ||
        insertError?.message?.includes('unique_trip_place') ||
        insertError?.details?.includes('already exists')
      ) {
        return jsonError('Place already in trip', 409, 'ALREADY_EXISTS');
      }
      return jsonError('Failed to add attraction', 500, 'DATABASE_ERROR');
    }

    return jsonSuccess(
      {
        attraction: {
          ...attraction,
          likes: 0,
          dislikes: 0,
          myVote: null,
          added_by_name: (attraction as any).users?.name || 'You',
          place_uri: placeUri,
        },
      },
      201
    );
  } catch (error) {
    console.error('Error in POST /api/trips/[tripId]/attractions:', error);
    return jsonError('Internal server error', 500, 'INTERNAL_SERVER_ERROR');
  }
}

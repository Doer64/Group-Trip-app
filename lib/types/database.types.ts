export interface User {
  id: string;
  email: string;
  name: string;
  created_at?: string;
}

export interface Trip {
  id: string;
  destination: string;
  creator_id: string;
  invite_token: string;
  created_at?: string;
  image_url?: string | null;
  memberCount?: number;
  attractionCount?: number;
  coverImage?: string | null;
}

export interface TripMember {
  trip_id: string;
  user_id: string;
  joined_at?: string;
  user?: User;
}

export interface AttractionLocation {
  lat: number;
  lng: number;
}

export interface Attraction {
  id: string;
  trip_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  location: AttractionLocation | null;
  place_id: string | null;
  added_by_user_id: string;
  created_at?: string;
}

export interface Vote {
  id: string;
  attraction_id: string;
  trip_id: string;
  user_id: string;
  vote_type: 'like' | 'dislike';
  created_at?: string;
}

export interface AttractionWithVotes extends Attraction {
  likes: number;
  dislikes: number;
  myVote: 'like' | 'dislike' | null;
  added_by_name?: string;
  place_uri?: string;
}

export interface RankedAttraction extends AttractionWithVotes {
  score: number;
  rank: number;
}

export interface TripWithDetails extends Trip {
  creator?: User;
  members: User[];
  isCreator?: boolean;
  isMember?: boolean;
}

export interface PlaceSearchResult {
  placeId: string;
  name: string;
  formattedAddress?: string;
  photoRef?: string;
  location?: AttractionLocation;
  placeUri?: string;
}

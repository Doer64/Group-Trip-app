import { PlaceSearchResult } from '../types/database.types';

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || '';

interface GoogleNewPlacePhoto {
  name?: string;
  widthPx?: number;
  heightPx?: number;
}

interface GoogleNewPlace {
  id?: string;
  displayName?: {
    text?: string;
    languageCode?: string;
  };
  formattedAddress?: string;
  location?: {
    latitude?: number;
    longitude?: number;
  };
  photos?: GoogleNewPlacePhoto[];
  googleMapsUri?: string;
}

interface GoogleLegacyPlace {
  place_id?: string;
  name?: string;
  formatted_address?: string;
  geometry?: {
    location?: {
      lat?: number;
      lng?: number;
    };
  };
  photos?: Array<{
    photo_reference?: string;
  }>;
}

/**
 * Searches Google Places API using Text Search.
 * Tries the New Places API (places:searchText) first, and falls back to Legacy Places API if needed.
 */
export async function searchPlaces(
  query: string,
  destination?: string
): Promise<PlaceSearchResult[]> {
  if (!GOOGLE_PLACES_API_KEY) {
    throw new Error('GOOGLE_PLACES_API_KEY is not configured on the server');
  }

  const searchQuery = destination ? `${query} in ${destination}` : query;

  try {
    // 1. Try Google Places API (New)
    const newApiUrl = 'https://places.googleapis.com/v1/places:searchText';
    const newApiResponse = await fetch(newApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
        'X-Goog-FieldMask':
          'places.id,places.displayName,places.formattedAddress,places.location,places.photos,places.googleMapsUri',
      },
      body: JSON.stringify({
        textQuery: searchQuery,
        languageCode: 'en',
        maxResultCount: 8,
      }),
    });

    if (newApiResponse.ok) {
      const data = await newApiResponse.json();
      if (Array.isArray(data.places)) {
        return data.places.map((place: GoogleNewPlace): PlaceSearchResult => {
          const lat = place.location?.latitude;
          const lng = place.location?.longitude;
          const photoName = place.photos?.[0]?.name;

          return {
            placeId: place.id || '',
            name: place.displayName?.text || 'Unnamed Attraction',
            formattedAddress: place.formattedAddress,
            photoRef: photoName,
            location:
              typeof lat === 'number' && typeof lng === 'number'
                ? { lat, lng }
                : undefined,
            placeUri:
              place.googleMapsUri ||
              (place.id ? `https://www.google.com/maps/place/?q=place_id:${place.id}` : undefined),
          };
        });
      }
    }

    // 2. Fallback: Google Places API (Legacy Text Search)
    const legacyUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
      searchQuery
    )}&key=${GOOGLE_PLACES_API_KEY}`;

    const legacyResponse = await fetch(legacyUrl);
    if (!legacyResponse.ok) {
      throw new Error(`Google Places API returned status ${legacyResponse.status}`);
    }

    const legacyData = await legacyResponse.json();
    if (legacyData.status === 'OK' && Array.isArray(legacyData.results)) {
      return legacyData.results.slice(0, 8).map((place: GoogleLegacyPlace): PlaceSearchResult => {
        const lat = place.geometry?.location?.lat;
        const lng = place.geometry?.location?.lng;
        const photoRef = place.photos?.[0]?.photo_reference;

        return {
          placeId: place.place_id || '',
          name: place.name || 'Unnamed Attraction',
          formattedAddress: place.formatted_address,
          photoRef,
          location:
            typeof lat === 'number' && typeof lng === 'number'
              ? { lat, lng }
              : undefined,
          placeUri: place.place_id
            ? `https://www.google.com/maps/place/?q=place_id:${place.place_id}`
            : undefined,
        };
      });
    } else if (legacyData.status === 'ZERO_RESULTS') {
      return [];
    } else {
      throw new Error(`Google Places legacy error: ${legacyData.status} - ${legacyData.error_message || ''}`);
    }
  } catch (error) {
    console.error('Error in searchPlaces:', error);
    throw error;
  }
}

/**
 * Fetches photo stream from Google Places Photo API using the server key.
 */
export async function fetchPlacePhotoStream(
  photoRef: string,
  maxWidth: number = 800
): Promise<{ buffer: ArrayBuffer; contentType: string } | null> {
  if (!GOOGLE_PLACES_API_KEY || !photoRef) return null;

  try {
    let photoUrl = '';

    // Check if it's the New Places API photo format (e.g. places/PLACE_ID/photos/PHOTO_ID)
    if (photoRef.startsWith('places/')) {
      photoUrl = `https://places.googleapis.com/v1/${photoRef}/media?maxHeightPx=600&maxWidthPx=${maxWidth}&key=${GOOGLE_PLACES_API_KEY}`;
    } else {
      photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${encodeURIComponent(
        photoRef
      )}&key=${GOOGLE_PLACES_API_KEY}`;
    }

    const response = await fetch(photoUrl, {
      redirect: 'follow',
    });

    if (!response.ok) {
      console.warn(`Failed to fetch photo from Google, status: ${response.status}`);
      return null;
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = await response.arrayBuffer();
    return { buffer, contentType };
  } catch (error) {
    console.error('Error fetching place photo:', error);
    return null;
  }
}

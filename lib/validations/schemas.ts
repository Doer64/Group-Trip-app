import { z } from 'zod';

export const identifyUserSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email({ message: 'Invalid email address format' }),
  name: z
    .string()
    .trim()
    .min(1, { message: 'Name must be at least 1 character' })
    .max(50, { message: 'Name cannot exceed 50 characters' })
    .optional(),
});

export const createTripSchema = z.object({
  destination: z
    .string()
    .trim()
    .min(1, { message: 'Destination is required' })
    .max(100, { message: 'Destination cannot exceed 100 characters' }),
});

export const addMemberSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email({ message: 'Valid email is required' }),
  name: z
    .string()
    .trim()
    .min(1, { message: 'Name must be at least 1 character' })
    .max(50, { message: 'Name cannot exceed 50 characters' })
    .optional(),
});

export const createAttractionSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: 'Attraction name is required' })
    .max(150, { message: 'Attraction name cannot exceed 150 characters' }),
  description: z.string().trim().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  photoRef: z.string().optional().nullable(),
  placeId: z.string().optional().nullable(),
  location: z
    .object({
      lat: z.number(),
      lng: z.number(),
    })
    .optional()
    .nullable(),
  placeUri: z.string().optional().nullable(),
});

export const voteSchema = z.object({
  voteType: z.enum(['like', 'dislike'], {
    message: "Vote must be either 'like' or 'dislike'",
  }),
});

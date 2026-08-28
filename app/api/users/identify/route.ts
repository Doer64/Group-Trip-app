import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { identifyUserSchema } from '@/lib/validations/schemas';
import { createSessionToken, setSessionCookie } from '@/lib/session';
import { jsonSuccess, jsonError } from '@/lib/apiResponse';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parseResult = identifyUserSchema.safeParse(body);

    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]?.message || 'Invalid input';
      return jsonError(firstError, 400, 'VALIDATION_ERROR');
    }

    const { email, name } = parseResult.data;
    const supabase = createServerSupabaseClient();

    // Check if user already exists
    const { data: existingUser, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (findError) {
      console.error('Error finding user:', findError);
      return jsonError('Database query failed', 500, 'DATABASE_ERROR');
    }

    let user = existingUser;

    if (!user) {
      if (!name || name.trim().length === 0) {
        return jsonError(
          'Your name is required for first-time registration',
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

      if (insertError) {
        console.error('Error creating user:', insertError);
        return jsonError('Failed to create user profile', 500, 'DATABASE_ERROR');
      }

      user = newUser;
    } else if (name && name.trim().length > 0 && (!user.name || user.name !== name.trim())) {
      // Update name if changed
      const { data: updatedUser } = await supabase
        .from('users')
        .update({ name: name.trim() })
        .eq('id', user.id)
        .select()
        .single();

      if (updatedUser) {
        user = updatedUser;
      }
    }

    // Generate signed session token and set HTTP-only cookie
    const token = await createSessionToken(user.id);
    await setSessionCookie(token);

    return jsonSuccess({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error('Error in /api/users/identify:', error);
    return jsonError('Internal server error', 500, 'INTERNAL_SERVER_ERROR');
  }
}

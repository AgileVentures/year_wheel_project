import { supabase } from '../lib/supabase';

/**
 * Update user profile (name and email)
 * @param {Object} updates - { full_name, email }
 * @returns {Promise<Object>}
 */
export async function updateUserProfile(updates) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('No user logged in');
  }

  // Check if user signed in with OAuth provider
  const authProvider = user.app_metadata?.provider;
  if (authProvider && authProvider !== 'email') {
    throw new Error(`Cannot update profile for ${authProvider} users`);
  }

  const profileUpdates = {};
  const authUpdates = {};

  // Update profile table
  if (updates.full_name !== undefined) {
    profileUpdates.full_name = updates.full_name;
  }

  // Update auth email if provided
  if (updates.email !== undefined && updates.email !== user.email) {
    authUpdates.email = updates.email;
  }

  // Update profile in profiles table
  if (Object.keys(profileUpdates).length > 0) {
    const { error: profileError } = await supabase
      .from('profiles')
      .update(profileUpdates)
      .eq('id', user.id);

    if (profileError) throw profileError;
  }

  // Update auth email if changed
  if (Object.keys(authUpdates).length > 0) {
    const { error: authError } = await supabase.auth.updateUser(authUpdates);
    if (authError) throw authError;
  }

  return { success: true };
}

/**
 * Get current user profile
 * @returns {Promise<Object>}
 */
export async function getUserProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('No user logged in');
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) throw error;

  return {
    ...profile,
    auth_provider: user.app_metadata?.provider || 'email'
  };
}

/**
 * Delete user account and all associated data
 * @returns {Promise<void>}
 */
export async function deleteUserAccount() {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('No user logged in');
  }

  // Call edge function to handle account deletion
  // This will cascade delete all wheels, activities, etc.
  const { error } = await supabase.functions.invoke('delete-user-account', {
    body: { userId: user.id }
  });

  if (error) throw error;

  // Sign out the user
  await supabase.auth.signOut();
}

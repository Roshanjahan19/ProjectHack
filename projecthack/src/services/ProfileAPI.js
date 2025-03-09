// ProfileAPI.js - API service for handling user profile-related operations
import { supabase } from '../supabaseClient';

export const ProfileAPI = {
  /**
   * Get the current user's profile
   * @returns {Promise} - Promise resolving to profile data
   */
  getUserProfile: async () => {
    try {
      // Get current user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;
      if (!userData.user) throw new Error('Not authenticated');
      
      // Fetch profile data
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userData.user.id)
        .single();
      
      if (error) {
        // If profile doesn't exist (PGRST116 error), create a new one
        if (error.code === 'PGRST116') {
          return await ProfileAPI.createUserProfile();
        }
        throw error;
      }
      
      return {
        data,
        success: true
      };
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return {
        error: error.message,
        success: false
      };
    }
  },
  
  /**
   * Create a new profile for the current user
   * @param {Object} initialData - Initial profile data
   * @returns {Promise} - Promise resolving to the created profile
   */
  createUserProfile: async (initialData = {}) => {
    try {
      // Get current user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;
      if (!userData.user) throw new Error('Not authenticated');
      
      // Create default profile
      const newProfile = {
        id: userData.user.id,
        username: initialData.username || '',
        full_name: initialData.full_name || '',
        phone: initialData.phone || '',
        location: initialData.location || '',
        balance: initialData.balance || 0,
        created_at: new Date(),
        updated_at: new Date()
      };
      
      // Insert profile
      const { data, error } = await supabase
        .from('profiles')
        .insert(newProfile)
        .select()
        .single();
      
      if (error) throw error;
      
      return {
        data,
        success: true,
        message: 'Profile created successfully'
      };
    } catch (error) {
      console.error('Error creating user profile:', error);
      return {
        error: error.message,
        success: false
      };
    }
  },
  
  /**
   * Update the current user's profile
   * @param {Object} profileData - Updated profile data
   * @returns {Promise} - Promise resolving to operation result
   */
  updateUserProfile: async (profileData) => {
    try {
      // Get current user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError) throw userError;
      if (!userData.user) throw new Error('Not authenticated');
      
      // Validate username if provided
      if (profileData.username) {
        // Check if username is already taken by someone else
        const { data: existingUser, error: checkError } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', profileData.username)
          .neq('id', userData.user.id)
          .single();
        
        if (!checkError && existingUser) {
          throw new Error('Username is already taken');
        }
      }
      
      // Prepare update data
      const updateData = {
        ...profileData,
        updated_at: new Date()
      };
      
      // Don't allow direct balance updates through this endpoint
      delete updateData.balance;
      
      // Update profile
      const { data, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userData.user.id)
        .select()
        .single();
      
      if (error) throw error;
      
      return {
        data,
        success: true,
        message: 'Profile updated successfully'
      };
    } catch (error) {
      console.error('Error updating user profile:', error);
      return {
        error: error.message,
        success: false
      };
    }
  },
  
  /**
   * Check if a username is available
   * @param {string} username - Username to check
   * @returns {Promise} - Promise resolving to availability status
   */
  checkUsernameAvailability: async (username) => {
    try {
      if (!username || username.trim() === '') {
        return {
          available: false,
          message: 'Username cannot be empty',
          success: true
        };
      }
      
      // Get current user to exclude from check
      const { data: userData } = await supabase.auth.getUser();
      const currentUserId = userData?.user?.id;
      
      // Query to check if username exists
      let query = supabase
        .from('profiles')
        .select('id')
        .eq('username', username.trim());
      
      // If user is logged in, exclude their current username from check
      if (currentUserId) {
        query = query.neq('id', currentUserId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      const isAvailable = !data || data.length === 0;
      
      return {
        available: isAvailable,
        message: isAvailable ? 'Username is available' : 'Username is already taken',
        success: true
      };
    } catch (error) {
      console.error('Error checking username availability:', error);
      return {
        error: error.message,
        success: false
      };
    }
  },
  
  /**
   * Update user account settings
   * @param {Object} settings - Settings to update (email, password)
   * @returns {Promise} - Promise resolving to operation result
   */
  updateAccountSettings: async (settings) => {
    try {
      // Validate what we're updating
      if (!settings.email && !settings.password) {
        throw new Error('No settings to update');
      }
      
      const updateData = {};
      
      if (settings.email) {
        updateData.email = settings.email;
      }
      
      if (settings.password) {
        updateData.password = settings.password;
      }
      
      // Update user auth details
      const { data, error } = await supabase.auth.updateUser(updateData);
      
      if (error) throw error;
      
      return {
        success: true,
        message: 'Account settings updated successfully'
      };
    } catch (error) {
      console.error('Error updating account settings:', error);
      return {
        error: error.message,
        success: false
      };
    }
  },
  
  /**
   * Get user account information
   * @returns {Promise} - Promise resolving to user account data
   */
  getUserAccount: async () => {
    try {
      // Get current user and session
      const { data: userData, error: userError } = await supabase.auth.getUser();
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (userError) throw userError;
      if (sessionError) throw sessionError;
      
      if (!userData.user) throw new Error('Not authenticated');
      
      return {
        data: {
          user: userData.user,
          session: sessionData.session
        },
        success: true
      };
    } catch (error) {
      console.error('Error fetching user account:', error);
      return {
        error: error.message,
        success: false
      };
    }
  }
};

export default ProfileAPI;
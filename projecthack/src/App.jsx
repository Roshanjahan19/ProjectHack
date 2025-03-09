import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import UserProfile from './components/UserProfile';
import LoginPage from './components/LoginPage';
import { supabase } from './supabaseClient'; // Assuming you have this file

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser(); // Updated to getUser in v2
        if (error) {
          console.error('Error getting user:', error);
        } else {
          console.log('User data:', data);
          setUser(data.user);
        }
      } catch (error) {
        console.error('Error getting user:', error);
      } finally {
        setLoading(false);
      }
    };

    getCurrentUser();

    // Subscribe to auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user);
      setLoading(false);
    });

    return () => {
      if (authListener?.unsubscribe) {
        authListener.unsubscribe(); // Unsubscribe correctly
      }
    };
  }, []);

  if (loading) {
    return <div>Loading...</div>; // Show loading spinner while fetching user data
  }

  return (
    <Router>
      <Routes>
        {/* If there's a user, navigate to UserProfile, else to LoginPage */}
        <Route path="/" element={user ? <UserProfile /> : <Navigate to="/login" />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/profile" element={user ? <UserProfile /> : <Navigate to="/login" />} />
        <Route path="*" element={<Navigate to={user ? "/" : "/login"} />} />
      </Routes>
    </Router>
  );
};

export default App;
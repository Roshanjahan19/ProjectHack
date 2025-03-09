import React, { useState } from 'react';
import { supabase } from '../supabaseClient'; // Adjust the path to your Supabase client setup

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false); // Add loading state

  // Handle Email/Password Login
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);  // Set loading to true when the form is submitted
    setError('');      // Reset the error message

    try {
      const { user, session, error } = await supabase.auth.signIn({
        email,
        password,
      });

      if (error) {
        setError(error.message); // Display error message if authentication fails
      } else {
        console.log('Logged in with email:', user);  // Handle successful login
      }
    } catch (err) {
      setError('An unexpected error occurred'); // Catch any unexpected errors
    } finally {
      setLoading(false);  // Set loading to false after the request is completed
    }
  };

  // Handle Google Login
  const handleGoogleLogin = async () => {
    setLoading(true);  // Set loading to true while logging in

    try {
      const { user, session, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
      });

      if (error) {
        setError(error.message); // Display error message if authentication fails
      } else {
        console.log('Logged in with Google:', user); // Handle successful login
      }
    } catch (err) {
      setError('An unexpected error occurred'); // Catch any unexpected errors
    } finally {
      setLoading(false);  // Set loading to false after the request is completed
    }
  };

  return (
    <div className="homepage-container">
      <div className="homepage-card w-full max-w-lg bg-white rounded-xl shadow-xl p-8 sm:p-6 md:p-8">
        {/* Logo and Title */}
        <div className="homepage-header text-center mb-6">
          <img src="/Lotus.png" alt="Logo" className="homepage-logo w-16 h-16 mx-auto rounded-full object-cover" />
          <h1 className="text-3xl font-bold text-gray-800 mt-4">Welcome to Lotus</h1>
          <p className="text-lg text-gray-600">Sign in to manage your finances</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleEmailLogin} className="space-y-4">
          {error && <div className="text-red-500 mb-4">{error}</div>} {/* Show error message */}

          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email address</label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="Enter your email"
              className="mt-2 p-3 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="Enter your password"
              className="mt-2 p-3 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {/* Remember Me and Forgot Password */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="remember-me"
                checked={rememberMe}
                onChange={() => setRememberMe(!rememberMe)}
                className="h-4 w-4 border-gray-300 rounded text-indigo-600 focus:ring-2 focus:ring-indigo-500"
              />
              <label htmlFor="remember-me" className="ml-2 text-sm text-gray-600">Remember me</label>
            </div>
            <a href="#" className="text-sm text-indigo-600 hover:text-indigo-800">Forgot password?</a>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full bg-indigo-600 text-white py-3 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={loading}  // Disable button while loading
          >
            {loading ? 'Logging In...' : 'Sign in'}
          </button>

          {/* Google Login Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full bg-blue-500 text-white py-3 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 mt-4"
            disabled={loading}  // Disable button while loading
          >
            {loading ? 'Logging In with Google...' : 'Login with Google'}
          </button>

          {/* Sign up Link */}
          <div className="text-center mt-4">
            <p className="text-sm text-gray-600">
              Don’t have an account? <a href="/signup" className="text-indigo-600 hover:text-indigo-800">Sign up</a>
            </p>
          </div>
        </form>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-500">
          By signing in, you agree to our <a href="#" className="text-indigo-600 hover:text-indigo-800">Terms of Service</a> and <a href="#" className="text-indigo-600 hover:text-indigo-800">Privacy Policy</a>.
        </div>
      </div>
    </div>
  );
};

export default Login;

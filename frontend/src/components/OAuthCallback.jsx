import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { API_BASE_URL } from '../config/apiBaseUrl';

const OAuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const userStr = params.get('user');

    if (token && userStr) {
      try {
        // Store the token
        localStorage.setItem('token', token);

        // Parse and store the user data
        const user = JSON.parse(decodeURIComponent(userStr));
        localStorage.setItem('user', JSON.stringify(user));
        window.dispatchEvent(new CustomEvent('auth-user-updated', { detail: user }));

        // Set up axios headers
        const axiosInstance = axios.create({
          baseURL: `${API_BASE_URL}/auth`,
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        // Show success toast then navigate (use SPA navigation so toast is visible)
        try {
          console.log('TOAST: OAuth login success - ready to show toast');
          toast.success('Login successful! Redirecting...');
        } catch (e) {
          /* ignore toast failures */
        }
        setTimeout(() => navigate('/home', { replace: true }), 900);
      } catch (error) {
        console.error('Error processing OAuth callback:', error);
        navigate('/login?error=Authentication failed');
      }
    } else {
      navigate('/login?error=Missing authentication data');
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <div className="text-xl text-gray-600">Completing sign-in...</div>
        <div className="text-sm text-gray-400">Please wait while we redirect you</div>
      </div>
    </div>
  );
};

export default OAuthCallback;



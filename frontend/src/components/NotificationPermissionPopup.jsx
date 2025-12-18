import React, { useState, useEffect } from 'react';
import { authService } from '../services/authService';

const NotificationPermissionPopup = () => {
  const [showPopup, setShowPopup] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const user = authService.getCurrentUser();
  const token = localStorage.getItem('token');

  useEffect(() => {
    // Check if user has already been prompted
    const hasBeenPrompted = localStorage.getItem(`notification_prompt_shown_${user?.id}`);
    
    // Only show for alumni, not teachers/admins
    if (!hasBeenPrompted && user && token && user.role !== 'TEACHER' && user.role !== 'ADMIN') {
      // Show popup immediately for alumni
      setShowPopup(true);
    }
  }, [user, token]);

  const handleAllow = async () => {
    try {
      const response = await fetch(`http://localhost:5001/api/auth/notification-preference`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.id,
          notificationEnabled: true,
          promptShown: true
        })
      });

      if (response.ok) {
        localStorage.setItem(`notification_prompt_shown_${user.id}`, 'true');
        localStorage.setItem(`notifications_enabled_${user.id}`, 'true');
        closePopup();
      } else {
        const errorData = await response.json();
        console.error('Failed to save notification preference:', errorData);
        // Still close the popup and save locally even if backend fails
        localStorage.setItem(`notification_prompt_shown_${user.id}`, 'true');
        localStorage.setItem(`notifications_enabled_${user.id}`, 'true');
        closePopup();
      }
    } catch (error) {
      console.error('Error saving notification preference:', error);
      // Still close the popup and save locally even if backend fails
      localStorage.setItem(`notification_prompt_shown_${user.id}`, 'true');
      localStorage.setItem(`notifications_enabled_${user.id}`, 'true');
      closePopup();
    }
  };

  const handleBlock = async () => {
    try {
      const response = await fetch(`http://localhost:5001/api/auth/notification-preference`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.id,
          notificationEnabled: false,
          promptShown: true
        })
      });

      if (response.ok) {
        localStorage.setItem(`notification_prompt_shown_${user.id}`, 'true');
        localStorage.setItem(`notifications_enabled_${user.id}`, 'false');
        closePopup();
      } else {
        const errorData = await response.json();
        console.error('Failed to save notification preference:', errorData);
        // Still close the popup and save locally even if backend fails
        localStorage.setItem(`notification_prompt_shown_${user.id}`, 'true');
        localStorage.setItem(`notifications_enabled_${user.id}`, 'false');
        closePopup();
      }
    } catch (error) {
      console.error('Error saving notification preference:', error);
      // Still close the popup and save locally even if backend fails
      localStorage.setItem(`notification_prompt_shown_${user.id}`, 'true');
      localStorage.setItem(`notifications_enabled_${user.id}`, 'false');
      closePopup();
    }
  };

  const closePopup = () => {
    setIsClosing(true);
    setTimeout(() => {
      setShowPopup(false);
      setIsClosing(false);
    }, 300);
  };

  if (!showPopup) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-end justify-center px-4 py-6 pointer-events-none sm:items-start sm:justify-end sm:p-6 ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}>
      <div className={`max-w-sm w-full bg-white shadow-2xl rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden transition-all duration-300 ${isClosing ? 'transform translate-y-2 opacity-0' : 'transform translate-y-0 opacity-100'}`}>
        <div className="p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
            </div>
            <div className="ml-3 w-0 flex-1">
              <p className="text-sm font-medium text-gray-900">
                Enable Event Notifications?
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Get notified about new events, achievements, and important updates from the alumni community.
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={handleAllow}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Allow
                </button>
                <button
                  onClick={handleBlock}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Block
                </button>
              </div>
            </div>
            <div className="ml-4 flex-shrink-0 flex">
              <button
                onClick={closePopup}
                className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <span className="sr-only">Close</span>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationPermissionPopup;

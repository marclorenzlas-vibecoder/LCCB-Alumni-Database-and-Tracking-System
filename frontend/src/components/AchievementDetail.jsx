import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import achievementService from '../services/achievementService';
import { authService } from '../services/authService';
import { API_BASE_URL, IMAGE_BASE_URL } from '../config/apiBaseUrl';
import { toast } from 'react-toastify';

const AchievementDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = authService.getCurrentUser();
  const isTeacher = authService.isTeacher();
  const [achievement, setAchievement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAchievement = async () => {
    try {
      setLoading(true);
      setError('');

      if (!id || isNaN(Number(id))) {
        console.error("Invalid achievement ID:", id);
        navigate("/achievements");
        return;
      }

      const achievementData = await achievementService.getAchievementById(id);

      if (!achievementData) {
        console.error("Achievement not found");
        navigate("/achievements");
        return;
      }

      setAchievement(achievementData);
    } catch (error) {
      console.error("Error loading achievement details:", error);
      setError("Failed to load achievement details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAchievement();
  }, [id]);

  const formattedDate = achievement?.date
    ? new Date(achievement.date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    : 'Not specified';

  const formattedCreatedAt = achievement?.createdAt
    ? new Date(achievement.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
    : 'Recently';

  const alumni = achievement?.alumni || {};
  const alumniName = `${alumni.first_name || ''} ${alumni.last_name || ''}`.trim() || 'Anonymous Alumni';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900"></div>
            <p className="mt-4 text-gray-600">Loading achievement details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => navigate('/achievements')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-900 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-900"
            >
              Back to Achievements
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!achievement) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Achievement Not Found</h1>
            <p className="text-gray-600 mb-4">The requested achievement could not be found.</p>
            <button
              onClick={() => navigate('/achievements')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-900 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-900"
            >
              Back to Achievements
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <button
              onClick={() => {
                if (alumni?.id) {
                  navigate(`/alumni/profile/${alumni.id}`);
                } else {
                  navigate('/achievements');
                }
              }}
              className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </button>
          </div>
          <div className="mb-8">
            <div className="flex flex-wrap items-baseline gap-3 mb-4">
              <h1 className="text-4xl font-bold text-blue-900">
                {alumniName}
              </h1>
              <span className="text-xl text-gray-600 font-normal">
                {formattedDate}
              </span>
            </div>
            <div className="h-px bg-gray-200"></div>
          </div>

          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(320px,30%)] xl:gap-14 items-start">
            <div className="min-w-0 w-full">
              <div className="prose max-w-none">
                <p className="text-gray-700 leading-relaxed text-lg text-justify mb-6 whitespace-pre-wrap">
                  {achievement.description || 'No description provided'}
                </p>
              </div>

              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Category</h3>
                  <p className="text-gray-600">{achievement.category || 'General'}</p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Posted</h3>
                  <p className="text-gray-600">{formattedCreatedAt}</p>
                </div>
              </div>
            </div>

            <div className="w-full lg:max-w-[420px] lg:justify-self-end">
              {achievement.image ? (
                <div className="rounded-lg overflow-hidden border border-gray-200 bg-white shadow-sm">
                  {/\.(mp4|mov|avi|mkv|webm)$/i.test(achievement.image) ? (
                    <video
                      src={achievement.image.startsWith('/') ? `${IMAGE_BASE_URL}${achievement.image}` : achievement.image}
                      className="w-full h-auto object-cover"
                      controls
                      style={{ borderRadius: '8px', maxHeight: '400px', objectFit: 'cover' }}
                    />
                  ) : (
                    <img
                      src={achievement.image.startsWith('/') ? `${IMAGE_BASE_URL}${achievement.image}` : achievement.image}
                      alt={achievement.title}
                      className="w-full h-auto object-cover"
                      style={{ 
                        borderRadius: '8px',
                        maxHeight: '400px',
                        objectFit: 'cover'
                      }}
                    />
                  )}
                </div>
              ) : (
                <div 
                  className="rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center"
                  style={{ 
                    borderRadius: '8px',
                    minHeight: '200px'
                  }}
                >
                  <div className="text-center p-8">
                    <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-4">
                      <svg 
                        className="w-8 h-8 text-gray-400" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
                        />
                      </svg>
                    </div>
                    <p className="text-gray-500 text-sm">No image available</p>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
    </div>
  );
};

export default AchievementDetail;

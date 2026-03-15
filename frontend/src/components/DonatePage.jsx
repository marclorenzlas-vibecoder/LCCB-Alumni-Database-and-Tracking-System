import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import donationService from '../services/donationService';
import { authService } from '../services/authService';

const DonatePage = () => {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [submitting, setSubmitting] = useState(false);

  // Check if user is logged in
  const user = authService.getCurrentUser();
  const isLoggedIn = authService.isLoggedIn();
  const isAlumni = authService.getRole() === 'alumni';

  useEffect(() => {
    fetchCampaign();
  }, [campaignId]);

  const fetchCampaign = async () => {
    try {
      setLoading(true);
      const allDonations = await donationService.getAllDonations();
      const foundCampaign = allDonations.find(d => d.id === parseInt(campaignId));
      
      if (!foundCampaign) {
        setError('Donation campaign not found');
      } else {
        setCampaign(foundCampaign);
      }
    } catch (err) {
      console.error('Error fetching campaign:', err);
      setError('Failed to load campaign details');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isLoggedIn) {
      alert('Please log in to make a donation');
      navigate('/login', { state: { returnTo: `/donate/${campaignId}` } });
      return;
    }

    if (!isAlumni) {
      alert('Only alumni can make donations. Please log in with your alumni account.');
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      alert('Please enter a valid donation amount');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const payload = {
        amount: parseFloat(formData.amount),
        purpose: campaign.purpose,
        description: `Donation for: ${campaign.purpose}`,
        category: campaign.category || 'General',
        date: formData.date
      };

      await donationService.createDonation(payload);
      
      alert('Thank you for your donation! Your contribution has been recorded.');
      navigate('/donations');
    } catch (err) {
      console.error('Error submitting donation:', err);
      const errorMsg = err.response?.data?.message || err.response?.data?.error || 'Failed to submit donation';
      setError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const calculateProgress = (raised, goal) => {
    if (!goal) return 0;
    return Math.min((raised / goal) * 100, 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading campaign...</p>
        </div>
      </div>
    );
  }

  if (error && !campaign) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Campaign Not Found</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => navigate('/donations')}
              className="px-6 py-2 bg-blue-900 text-white rounded-md hover:bg-blue-800 transition-colors"
            >
              View All Campaigns
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Campaign Details Card */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
          {campaign.image && (
            <img
              src={campaign.image.startsWith('/') ? `http://localhost:5001${campaign.image}` : campaign.image}
              alt={campaign.purpose}
              className="w-full h-64 object-cover"
            />
          )}
          
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="px-3 py-1 bg-blue-100 text-blue-900 rounded-full text-sm font-medium">
                {campaign.category || 'General'}
              </span>
              {campaign.date && (
                <span className="text-gray-500 text-sm">
                  Ends: {new Date(campaign.date).toLocaleDateString()}
                </span>
              )}
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-4">{campaign.purpose}</h1>
            
            {campaign.description && (
              <p className="text-gray-600 mb-6">{campaign.description}</p>
            )}

            {/* Progress Bar */}
            {campaign.goal && (
              <div className="mb-6">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Raised: {formatAmount(campaign.amount)}</span>
                  <span>Goal: {formatAmount(campaign.goal)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-blue-900 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${calculateProgress(campaign.amount, campaign.goal)}%` }}
                  />
                </div>
                <div className="text-right text-sm text-gray-600 mt-1">
                  {Math.round(calculateProgress(campaign.amount, campaign.goal))}% Complete
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Donation Form Card */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Make a Donation</h2>

          {!isLoggedIn && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="font-semibold text-yellow-900 mb-1">Login Required</h3>
                  <p className="text-sm text-yellow-800 mb-3">
                    You need to log in with your alumni account to make a donation.
                  </p>
                  <button
                    onClick={() => navigate('/login', { state: { returnTo: `/donate/${campaignId}` } })}
                    className="px-4 py-2 bg-blue-900 text-white rounded-md hover:bg-blue-800 transition-colors text-sm font-medium"
                  >
                    Log In
                  </button>
                </div>
              </div>
            </div>
          )}

          {isLoggedIn && !isAlumni && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <h3 className="font-semibold text-red-900 mb-1">Alumni Only</h3>
                  <p className="text-sm text-red-800">
                    Only verified alumni can make donations. Please log in with your alumni account.
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Donation Amount (PHP) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₱</span>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  required
                  min="1"
                  step="0.01"
                  disabled={!isLoggedIn || !isAlumni}
                  className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="Enter amount"
                />
              </div>
              <p className="mt-2 text-xs text-gray-500">
                You can make up to 3 donations per week
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                disabled={!isLoggedIn || !isAlumni}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => navigate('/donations')}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isLoggedIn || !isAlumni || submitting}
                className="flex-1 px-6 py-3 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {submitting ? 'Processing...' : 'Donate Now'}
              </button>
            </div>
          </form>

          {/* Alternative Payment Info */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3">Alternative Payment Methods</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <svg className="w-5 h-5 text-blue-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span className="font-semibold text-gray-900">0912-345-6789</span>
              </div>
              <p className="text-sm text-gray-600">GCash / PayMaya / Bank Transfer</p>
              <p className="text-xs text-gray-500 mt-2">
                For direct transfers, please use the number above and register your donation through this form.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DonatePage;

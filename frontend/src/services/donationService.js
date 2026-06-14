import axios from 'axios';
import { API_BASE_URL } from '../config/apiBaseUrl';

// API URL for donation endpoints
const API_URL = `${API_BASE_URL}/donations`;

console.log('Donation Service API URL:', API_URL);

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };
};

const extractLineValue = (text = '', label = '') => {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = String(text || '').match(new RegExp(`^${escapedLabel}:\\s*(.+)$`, 'im'));
  return match?.[1]?.trim() || '';
};

const inferDonationKind = (text = '') => {
  const normalized = String(text || '').toLowerCase();
  if (normalized.includes('money + items') || normalized.includes('money and items')) return 'money and items';
  if (normalized.includes('donation type: items') || normalized.includes('item donation')) return 'items';
  return 'money';
};

const parseDonationActivitiesFromDonation = (donation) => {
  const description = String(donation?.description || '');
  const purpose = donation?.purpose || donation?.category || 'a donation campaign';

  const blocks = description.includes('Donor:')
    ? description
      .split(/\n\s*\n(?=Donation for:)/i)
      .filter((block) => block.includes('Donor:'))
    : [];

  const entries = blocks.map((block, index) => {
    const donorName = extractLineValue(block, 'Donor')
      || [donation?.alumni?.first_name, donation?.alumni?.last_name].filter(Boolean).join(' ').trim()
      || 'Alumnus';

    const amountLabel = extractLineValue(block, 'Amount')
      || (Number(donation?.amount || 0) > 0 ? `PHP ${Number(donation.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '');

    const createdAtRaw = extractLineValue(block, 'Recorded');
    const createdAt = createdAtRaw && !Number.isNaN(new Date(createdAtRaw).getTime())
      ? createdAtRaw
      : donation?.date || new Date().toISOString();

    return {
      id: `donation-${donation?.id || 'x'}-${index}`,
      title: `${donorName} donated ${amountLabel || 'a donation'} to ${purpose}`,
      message: block,
      link: `/donate/${donation?.id}`,
      senderName: donorName,
      senderProfileImage: donation?.alumni?.profile_image || null,
      amountLabel,
      campaignName: purpose,
      donationKind: inferDonationKind(block),
      createdAt
    };
  });

  return entries;
};

const buildActivitiesFromDonations = (donations = []) => {
  const RECENT_ACTIVITY_LIMIT = 100;

  return donations
    .flatMap((donation) => parseDonationActivitiesFromDonation(donation))
    .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime())
    .slice(0, RECENT_ACTIVITY_LIMIT);
};

const donationService = {
  // Get all donations
  getAllDonations: async () => {
    const response = await axios.get(API_URL);
    return response.data;
  },

  // Get a single donation by ID
  getDonationById: async (id) => {
    const response = await axios.get(`${API_URL}/${id}`);
    return response.data;
  },

  // Get recent donation activity for admin dashboard
  getRecentDonationActivity: async () => {
    const response = await axios.get(`${API_URL}/recent`, getAuthHeaders());
    return Array.isArray(response.data) ? response.data : [];
  },

  // Get all donations for an alumni
  getDonationsByAlumni: async (alumniId) => {
    const response = await axios.get(`${API_URL}/alumni/${alumniId}`);
    return response.data;
  },

  // Check weekly donation status for an alumni
  getWeeklyStatus: async (alumniId) => {
    const response = await axios.get(`${API_URL}/alumni/${alumniId}/weekly-status`);
    return response.data;
  },

  // Create new donation (requires authentication)
  createDonation: async (donationData) => {
    const token = localStorage.getItem('token');
    
    if (donationData instanceof FormData) {
      const response = await axios.post(API_URL, donationData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    }
    const response = await axios.post(API_URL, donationData, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  },

  // Update donation (requires authentication)
  updateDonation: async (id, donationData) => {
    const token = localStorage.getItem('token');
    
    if (donationData instanceof FormData) {
      const response = await axios.put(`${API_URL}/${id}`, donationData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    }
    const response = await axios.put(`${API_URL}/${id}`, donationData, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  },

  // Contribute to an existing donation campaign
  contributeToDonation: async (id, donationData) => {
    const token = localStorage.getItem('token');
    const response = await axios.post(`${API_URL}/${id}/contribute`, donationData, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  },

  // Delete donation (requires authentication)
  deleteDonation: async (id) => {
    const token = localStorage.getItem('token');
    const response = await axios.delete(`${API_URL}/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  }
};

export default donationService;

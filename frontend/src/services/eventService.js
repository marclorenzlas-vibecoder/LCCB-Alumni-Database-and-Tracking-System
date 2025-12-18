import axios from 'axios';

const API_URL = 'http://localhost:5001/api/events';

const eventService = {
  // Get all events
  getAllEvents: async () => {
    const response = await axios.get(API_URL);
    return response.data;
  },

  // Get event by ID
  getEventById: async (id) => {
    const response = await axios.get(`${API_URL}/${id}`);
    return response.data;
  },

  // Create new event
  createEvent: async (eventData) => {
    if (eventData instanceof FormData) {
      const response = await axios.post(API_URL, eventData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    }
    const response = await axios.post(API_URL, eventData);
    return response.data;
  },

  // Update event
  updateEvent: async (id, eventData) => {
    if (eventData instanceof FormData) {
      const response = await axios.put(`${API_URL}/${id}`, eventData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    }
    const response = await axios.put(`${API_URL}/${id}`, eventData);
    return response.data;
  },

  // Delete event
  deleteEvent: async (id) => {
    const response = await axios.delete(`${API_URL}/${id}`);
    return response.data;
  },

  // Join event (register attendance)
  joinEvent: async (eventId, alumniId) => {
    const response = await axios.post(`${API_URL}/${eventId}/join`, { alumni_id: alumniId });
    return response.data;
  },

  // Leave event (unregister attendance)
  leaveEvent: async (eventId, alumniId) => {
    const response = await axios.post(`${API_URL}/${eventId}/leave`, { alumni_id: alumniId });
    return response.data;
  },

  // Get event attendees
  getEventAttendees: async (eventId) => {
    const response = await axios.get(`${API_URL}/${eventId}/attendees`);
    return response.data;
  },

  // Check if user is attending
  checkAttendance: async (eventId, alumniId) => {
    const response = await axios.get(`${API_URL}/${eventId}/check-attendance/${alumniId}`);
    return response.data;
  },

  // Event Gallery
  getEventGallery: async (eventId) => {
    const response = await axios.get(`${API_URL}/${eventId}/gallery`);
    return response.data;
  },

  addGalleryPhotos: async (eventId, formData) => {
    const response = await axios.post(`${API_URL}/${eventId}/gallery`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  deleteGalleryPhoto: async (eventId, photoId) => {
    const response = await axios.delete(`${API_URL}/${eventId}/gallery/${photoId}`);
    return response.data;
  }
};

export default eventService;

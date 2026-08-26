import apiClient from './apiClient';

export const eventService = {
  async getAll() {
    const response = await apiClient.get('/events');
    return response.data;
  },

  async getById(eventId) {
    const response = await apiClient.get(`/events/${eventId}`);
    return response.data;
  },

  async getAttendees(eventId) {
    const response = await apiClient.get(`/events/${eventId}/attendees`);
    return response.data;
  },

  async checkAttendance(eventId, alumniId) {
    const response = await apiClient.get(`/events/${eventId}/check-attendance/${alumniId}`);
    return response.data;
  },

  async join(eventId, alumniId) {
    const response = await apiClient.post(`/events/${eventId}/join`, { alumni_id: alumniId });
    return response.data;
  },

  async leave(eventId, alumniId) {
    const response = await apiClient.post(`/events/${eventId}/leave`, { alumni_id: alumniId });
    return response.data;
  },

  async createEvent(formData) {
    const response = await apiClient.post('/events', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  async updateEvent(eventId, formData) {
    const response = await apiClient.put(`/events/${eventId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  async deleteEvent(eventId) {
    const response = await apiClient.delete(`/events/${eventId}`);
    return response.data;
  },

  async getGallery(eventId) {
    const response = await apiClient.get(`/events/${eventId}/gallery`);
    return response.data;
  },

  async uploadGalleryPhotos(eventId, formData) {
    const response = await apiClient.post(`/events/${eventId}/gallery`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  async deleteGalleryPhoto(eventId, photoId) {
    const response = await apiClient.delete(`/events/${eventId}/gallery/${photoId}`);
    return response.data;
  }
};

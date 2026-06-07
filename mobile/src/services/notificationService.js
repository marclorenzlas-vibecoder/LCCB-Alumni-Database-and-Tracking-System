import apiClient from './apiClient';

export const notificationService = {
  async getAll(unreadOnly = false) {
    const response = await apiClient.get('/notifications', {
      params: { unreadOnly }
    });
    return response.data;
  },

  async getUnreadCount() {
    const response = await apiClient.get('/notifications/unread-count');
    return response.data;
  },

  async markAsRead(notificationId) {
    const response = await apiClient.put(`/notifications/${notificationId}/read`);
    return response.data;
  },

  async markAllAsRead() {
    const response = await apiClient.put('/notifications/read-all');
    return response.data;
  },

  async clearAll() {
    const response = await apiClient.delete('/notifications');
    return response.data;
  }
};

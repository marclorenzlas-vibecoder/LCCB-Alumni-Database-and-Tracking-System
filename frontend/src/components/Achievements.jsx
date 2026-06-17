import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import achievementService from '../services/achievementService';
import { realtimeClient } from '../services/realtimeClient';
import ConfirmModal from './ConfirmModal';
import { authService } from '../services/authService';
import UserLayout from './UserLayout';
import { API_BASE_URL, IMAGE_BASE_URL } from '../config/apiBaseUrl';

const Achievements = () => {
  const [achievements, setAchievements] = useState([]);
  const [alumniList, setAlumniList] = useState([]);
  const isTeacher = authService.isTeacher();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    alumni_id: '',
    title: '',
    category: '',
    description: '',
    date: '',
    image: null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    type: 'danger'
  });

  const categories = ['All', 'Professional', 'Leadership', 'Business', 'Community Service', 'Affiliate'];
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Fetch all achievements on component mount
  useEffect(() => {
    fetchAllAchievements();
  }, []);

  // Re-fetch when achievements change via realtime events
  useEffect(() => {
    const unsubCreated = realtimeClient.subscribe('achievement.created', () => {
      fetchAllAchievements();
    });
    const unsubUpdated = realtimeClient.subscribe('achievement.updated', () => {
      fetchAllAchievements();
    });
    const unsubDeleted = realtimeClient.subscribe('achievement.deleted', () => {
      fetchAllAchievements();
    });
    return () => {
      unsubCreated();
      unsubUpdated();
      unsubDeleted();
    };
  }, []);

  const fetchAllAchievements = async () => {
    try {
      setLoading(true);
      const data = await achievementService.getAllAchievements();
      setAchievements(data);
    } catch (err) {
      console.error('Error fetching achievements:', err);
      setError('Failed to load achievements');
    } finally {
      setLoading(false);
    }
  };

  const fetchAlumniList = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/alumni`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      if (response.ok) {
        const data = await response.json();
        setAlumniList(data);
      }
    } catch (err) {
      console.error('Error fetching alumni list:', err);
    }
  };

  useEffect(() => { fetchAlumniList(); }, []);

  const handleInputChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'image') {
      setFormData(prev => ({
        ...prev,
        image: files[0]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let payload = formData;
      if (formData.image) {
        const fd = new FormData();
        fd.append('alumni_id', formData.alumni_id);
        fd.append('title', formData.title);
        fd.append('category', formData.category);
        if (formData.description) fd.append('description', formData.description);
        if (formData.date) fd.append('date', formData.date);
        fd.append('image', formData.image);
        payload = fd;
      } else {
        payload = {
          alumni_id: formData.alumni_id,
          title: formData.title,
          category: formData.category,
          description: formData.description,
          date: formData.date
        };
      }

      if (editingId) {
        // Update existing achievement
        const updated = await achievementService.updateAchievement(editingId, payload);
        setAchievements(prev => prev.map(a => a.id === editingId ? updated : a));
        toast.success('Achievement updated successfully!');
      } else {
        // Create new achievement
        const newAchievement = await achievementService.createAchievement(payload);
        setAchievements(prev => [...prev, newAchievement]);
        toast.success('Achievement added successfully!');
      }
      
      setShowModal(false);
      setEditingId(null);
      setFormData({
        alumni_id: '',
        title: '',
        category: '',
        description: '',
        date: '',
        image: null
      });
    } catch (err) {
      console.error('Error saving achievement:', err);
      setError(err.response?.data?.error || 'Failed to save achievement');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (achievement) => {
    setEditingId(achievement.id);
    setFormData({
      alumni_id: achievement.alumni_id || '',
      title: achievement.title || '',
      category: achievement.category || '',
      description: achievement.description || '',
      date: achievement.date ? achievement.date.split('T')[0] : '',
      image: null
    });
    setShowModal(true);
  };

  const handleDelete = (id) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Achievement',
      message: 'Are you sure you want to delete this achievement? This action cannot be undone.',
      type: 'danger',
      onConfirm: async () => {
        try {
          await achievementService.deleteAchievement(id);
          setAchievements(prev => prev.filter(a => a.id !== id));
          setConfirmModal({ ...confirmModal, isOpen: false });
          toast.success('Achievement deleted successfully!');
        } catch (err) {
          console.error('Error deleting achievement:', err);
          toast.error('Failed to delete achievement');
          setConfirmModal({ ...confirmModal, isOpen: false });
        }
      }
    });
  };

  const filteredAchievements = selectedCategory === 'All' 
    ? achievements 
    : achievements.filter(a => a.category === selectedCategory);

  return (
    <UserLayout>
      <div className="min-h-screen bg-gray-50 py-8">
      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText="Delete"
        cancelText="Cancel"
      />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
          <div className="text-center sm:text-left">
            <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl mb-2">
              Alumni Achievements
            </h1>
            <p className="text-lg text-gray-600">
              Showcasing real alumni accomplishments, leadership roles, event-hosting potential, and affiliate impact.
            </p>
          </div>
          {isTeacher && (
            <button 
              onClick={() => setShowModal(true)}
              className="app-primary-button">
              Add New
            </button>
          )}
        </div>
        </div>

        {/* Categories Filter */}
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${
                selectedCategory === category
                  ? 'bg-blue-900 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              } border border-gray-200`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Achievements Grid */}
        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {loading && <div className="col-span-full text-center">Loading...</div>}
          {error && <div className="col-span-full text-center text-red-600">{error}</div>}
          {!loading && filteredAchievements.length === 0 && (
            <div className="col-span-full text-center text-gray-500">No achievements found</div>
          )}
          {filteredAchievements.map((achievement) => (
            <div
              key={achievement.id}
              className="app-card overflow-hidden group flex h-full flex-col p-0"
            >
              <div className="relative h-48 overflow-hidden">
                {achievement.image ? (
                  <img
                    src={achievement.image.startsWith('/') ? `${IMAGE_BASE_URL}${achievement.image}` : achievement.image}
                    alt={achievement.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-sm font-medium text-slate-500">
                    No image available
                  </div>
                )}
                <div className="absolute left-4 top-4 flex items-center gap-2">
                  <span className="rounded-full bg-white/90 px-3 py-1 text-sm font-medium text-blue-900 shadow-sm backdrop-blur">
                    {achievement.category || 'General'}
                  </span>
                </div>
                <span className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1 text-sm font-medium text-gray-700 shadow-sm backdrop-blur">
                  {achievement.date ? new Date(achievement.date).getFullYear() : 'N/A'}
                </span>
              </div>

              <div className="flex flex-1 flex-col px-6 pb-6 pt-5">
                {(achievement.alumni_name || achievement.alumni) && (
                  <p className="text-sm text-gray-600 mb-3">
                    <span className="font-semibold text-gray-800">
                      {achievement.alumni_name || `${achievement.alumni.first_name} ${achievement.alumni.last_name}`}
                    </span>
                  </p>
                )}
                <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-900 transition-colors duration-300 min-h-[3.5rem]">
                  {achievement.title}
                </h3>
                <p className="text-gray-600 mb-4 h-[7.5rem] overflow-y-auto scrollbar-hide leading-relaxed">
                  {achievement.description || 'No description provided'}
                </p>
                <div className="border-t pt-4 mt-auto">
                  <p className="text-sm text-gray-500">
                    <span className="font-medium text-gray-900">Date:</span> {achievement.date ? new Date(achievement.date).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                {isTeacher && (
                  <div className="mt-4 flex gap-2 pt-1">
                    <button
                      onClick={() => handleEdit(achievement)}
                      className="flex-1 bg-sky-600 text-white px-4 py-2 rounded-md hover:bg-sky-700 transition-colors duration-200 text-sm font-medium shadow-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(achievement.id)}
                      className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors duration-200 text-sm font-medium shadow-sm"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Modal for Adding Achievement */}
        {showModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-hidden h-full w-full z-50">
            <div className="relative mx-auto mt-5 flex h-[calc(100vh-2.5rem)] max-w-3xl flex-col overflow-hidden rounded-xl border bg-white shadow-lg">
              <div className="shrink-0 border-b border-gray-200 bg-white px-6 py-4">
                <h3 className="text-2xl font-semibold text-gray-900">
                  {editingId ? 'Edit Achievement' : 'Add New Achievement'}
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-hide">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Alumni Name *
                      </label>
                      <select
                        name="alumni_id"
                        value={formData.alumni_id}
                        onChange={handleInputChange}
                        required
                        className="app-input"
                      >
                        <option value="">Select an alumni</option>
                        {alumniList.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.first_name} {a.last_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Achievement / Role *
                      </label>
                      <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        required
                        className="app-input"
                        placeholder="e.g. Chief of Staff, White House Military Office"
                        autoComplete="off"
                        spellCheck={false}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Category
                      </label>
                      <select
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        className="app-input"
                      >
                        <option value="">Select a category</option>
                        <option value="Professional">Professional</option>
                        <option value="Leadership">Leadership</option>
                        <option value="Business">Business</option>
                        <option value="Community Service">Community Service</option>
                        <option value="Affiliate">Affiliate</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        className="app-textarea"
                        placeholder="Achievement description"
                        rows="4"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date
                      </label>
                      <input
                        type="date"
                        name="date"
                        value={formData.date}
                        onChange={handleInputChange}
                        className="app-input"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Achievement Image
                      </label>
                      <input
                        type="file"
                        name="image"
                        accept="image/*"
                        onChange={handleInputChange}
                        className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-900 hover:file:bg-blue-200"
                      />
                      {formData.image && (
                        <p className="text-sm text-gray-500 mt-1">Selected: {formData.image.name}</p>
                      )}
                    </div>
                  </div>
                  {error && (
                    <div className="text-red-600 text-sm">
                      {error}
                    </div>
                  )}
                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        setEditingId(null);
                        setError('');
                      }}
                        className="app-secondary-button"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                        className="app-primary-button disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Saving...' : (editingId ? 'Update Achievement' : 'Add Achievement')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </UserLayout>
  );
};

export default Achievements;
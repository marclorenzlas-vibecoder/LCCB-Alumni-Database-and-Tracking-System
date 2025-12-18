import React, { useState, useEffect } from 'react';
import achievementService from '../services/achievementService';
import ConfirmModal from './ConfirmModal';
import { authService } from '../services/authService';

const Achievements = () => {
  const [achievements, setAchievements] = useState([]);
  const isTeacher = authService.isTeacher();
  const [alumniList, setAlumniList] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    alumni_id: '',
    title: '',
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

  const categories = ['All', 'Professional', 'Academic', 'Business', 'Community Service'];
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Fetch all achievements on component mount
  useEffect(() => {
    fetchAllAchievements();
    fetchAlumniList();
  }, []);

  const fetchAlumniList = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/alumni');
      const data = await response.json();
      setAlumniList(data);
    } catch (err) {
      console.error('Error fetching alumni list:', err);
    }
  };

  const fetchAllAchievements = async () => {
    try {
      setLoading(true);
      // Fetch all achievements from all alumni
      const data = await achievementService.getAllAchievements();
      setAchievements(data);
    } catch (err) {
      console.error('Error fetching achievements:', err);
      setError('Failed to load achievements');
    } finally {
      setLoading(false);
    }
  };

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
      // If image present, send as FormData
      if (formData.image) {
        const fd = new FormData();
        fd.append('alumni_id', formData.alumni_id);
        fd.append('title', formData.title);
        if (formData.description) fd.append('description', formData.description);
        if (formData.date) fd.append('date', formData.date);
        fd.append('image', formData.image);
        payload = fd;
      }

      if (editingId) {
        // Update existing achievement
        const updated = await achievementService.updateAchievement(editingId, payload);
        setAchievements(prev => prev.map(a => a.id === editingId ? updated : a));
        alert('Achievement updated successfully!');
      } else {
        // Create new achievement
        const newAchievement = await achievementService.createAchievement(payload);
        setAchievements(prev => [...prev, newAchievement]);
        alert('Achievement added successfully!');
      }
      
      setShowModal(false);
      setEditingId(null);
      setFormData({
        alumni_id: '',
        title: '',
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
          alert('Achievement deleted successfully!');
        } catch (err) {
          console.error('Error deleting achievement:', err);
          alert('Failed to delete achievement');
          setConfirmModal({ ...confirmModal, isOpen: false });
        }
      }
    });
  };

  const filteredAchievements = selectedCategory === 'All' 
    ? achievements 
    : achievements.filter(a => a.category === selectedCategory);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
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
      
      {/* Header Section */}
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
          <div className="text-center sm:text-left">
            <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl mb-2">
              Alumni Achievements
            </h1>
            <p className="text-lg text-gray-600">
              Celebrating the outstanding accomplishments of our LCCB alumni across various fields
            </p>
          </div>
          {isTeacher && (
            <button 
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Add New Achievement
            </button>
          )}
        </div>

        {/* Categories Filter */}
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${
                selectedCategory === category
                  ? 'bg-blue-600 text-white'
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
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 group"
            >
              <div className="relative overflow-hidden">
                {achievement.image && (
                  <img
                    src={achievement.image.startsWith('/') ? `http://localhost:5001${achievement.image}` : achievement.image}
                    alt={achievement.title}
                    className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                )}
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="px-3 py-1 text-sm font-medium text-blue-600 bg-blue-50 rounded-full">
                    {achievement.category || 'General'}
                  </span>
                  <span className="text-gray-500 text-sm">
                    {achievement.date ? new Date(achievement.date).getFullYear() : 'N/A'}
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors duration-300">
                  {achievement.title}
                </h3>
                <p className="text-gray-600 mb-4 max-h-[7.5rem] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100 leading-relaxed">
                  {achievement.description || 'No description provided'}
                </p>
                <div className="border-t pt-4">
                  <p className="text-sm text-gray-500">
                    <span className="font-medium text-gray-900">Date:</span> {achievement.date ? new Date(achievement.date).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                {isTeacher && (
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => handleEdit(achievement)}
                      className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors duration-200 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(achievement.id)}
                      className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors duration-200 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
            </div>
          ))}
        </div>

        {/* Modal for Adding Achievement */}
        {showModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-full max-w-3xl shadow-lg rounded-xl bg-white max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-3 py-4 -mx-5 -mt-5 rounded-t-xl">
                <h3 className="text-2xl font-semibold text-gray-900">
                  {editingId ? 'Edit Achievement' : 'Add New Achievement'}
                </h3>
                <p className="mt-1 text-sm text-gray-500">Enter the details for the {editingId ? 'achievement update' : 'new achievement'}</p>
              </div>
              <div className="mt-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Alumni *
                      </label>
                      <select
                        name="alumni_id"
                        value={formData.alumni_id}
                        onChange={handleInputChange}
                        required
                        className="mt-1 block w-full px-3 py-2.5 text-sm rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Select an alumni</option>
                        {alumniList.map((alumni) => (
                          <option key={alumni.id} value={alumni.id}>
                            {alumni.first_name} {alumni.last_name} - {alumni.email}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Title *
                      </label>
                      <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        required
                        className="mt-1 block w-full px-3 py-2.5 text-sm rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        placeholder="Achievement title"
                        autoComplete="off"
                        spellCheck={false}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        className="mt-1 block w-full px-3 py-2.5 text-sm rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
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
                        className="mt-1 block w-full px-3 py-2.5 text-sm rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
                        className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
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
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-400"
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
  );
};

export default Achievements;
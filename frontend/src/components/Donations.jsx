import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import donationService from '../services/donationService';
import ConfirmModal from './ConfirmModal';
import { authService } from '../services/authService';

const Donations = () => {
  const navigate = useNavigate();
  const [donations, setDonations] = useState([]);
  const isTeacher = authService.isTeacher();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    purpose: '',
    description: '',
    category: '',
    amount: '',
    goal: '',
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

  const categories = ['All', 'Education', 'Infrastructure', 'Community', 'Research'];
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Fetch all donations on component mount
  useEffect(() => {
    fetchAllDonations();
  }, []);

  const fetchAllDonations = async () => {
    try {
      setLoading(true);
      const data = await donationService.getAllDonations();
      setDonations(data);
    } catch (err) {
      console.error('Error fetching donations:', err);
      setError('Failed to load donations');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'image') {
      setFormData(prev => ({ ...prev, image: files[0] }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
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
        fd.append('purpose', formData.purpose);
        fd.append('description', formData.description);
        fd.append('category', formData.category);
        fd.append('amount', formData.amount);
        if (formData.goal) fd.append('goal', formData.goal);
        if (formData.date) fd.append('date', formData.date);
        fd.append('image', formData.image);
        payload = fd;
      }

      if (editingId) {
        const updated = await donationService.updateDonation(editingId, payload);
        setDonations(prev => prev.map(d => d.id === editingId ? updated : d));
        alert('Campaign updated successfully!');
      } else {
        const newDonation = await donationService.createDonation(payload);
        setDonations(prev => [...prev, newDonation]);
        alert('Campaign added successfully!');
      }

      setShowModal(false);
      setEditingId(null);
      setFormData({
        purpose: '',
        description: '',
        category: '',
        amount: '',
        goal: '',
        date: '',
        image: null
      });
    } catch (err) {
      console.error('Error saving donation:', err);
      setError(err.response?.data?.error || 'Failed to save campaign');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (donation) => {
    setEditingId(donation.id);
    setFormData({
      purpose: donation.purpose || '',
      description: donation.description || '',
      category: donation.category || '',
      amount: donation.amount || '',
      goal: donation.goal || '',
      date: donation.date ? donation.date.split('T')[0] : '',
      image: null
    });
    setShowModal(true);
  };

  const handleDelete = (id) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Campaign',
      message: 'Are you sure you want to delete this donation campaign? This action cannot be undone.',
      type: 'danger',
      onConfirm: async () => {
        try {
          await donationService.deleteDonation(id);
          setDonations(prev => prev.filter(d => d.id !== id));
          setConfirmModal({ ...confirmModal, isOpen: false });
          alert('Campaign deleted successfully!');
        } catch (err) {
          console.error('Error deleting donation:', err);
          alert('Failed to delete campaign');
          setConfirmModal({ ...confirmModal, isOpen: false });
        }
      }
    });
  };

  const filteredDonations = selectedCategory === 'All'
    ? donations
    : donations.filter(d => d.category === selectedCategory);

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
      
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
            <div className="text-center sm:text-left">
              <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl mb-2">
                Support Our Causes
              </h1>
              <p className="text-lg text-gray-600">
                Join us in making a difference through your generous contributions
              </p>
            </div>
            {isTeacher && (
              <button 
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                Add Campaign
              </button>
            )}
          </div>
        </div>

        {/* Categories */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
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

        {/* Campaign Cards */}
        {loading && <div className="text-center">Loading...</div>}
        {error && <div className="text-center text-red-600">{error}</div>}
        
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {filteredDonations.map((donation) => (
            <div
              key={donation.id}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
            >
              <img
                src={
                  donation.image 
                    ? (donation.image.startsWith('/') ? `http://localhost:5001${donation.image}` : donation.image)
                    : 'https://placehold.co/600x400/e2e8f0/94a3b8?text=Donation+Campaign'
                }
                alt={donation.purpose}
                className="w-full h-48 object-cover"
              />
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="px-3 py-1 text-sm font-medium text-blue-600 bg-blue-50 rounded-full">
                    {donation.category || 'General'}
                  </span>
                  <span className="text-gray-500 text-sm">
                    {donation.date ? `Ends ${new Date(donation.date).toLocaleDateString()}` : ''}
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {donation.purpose}
                </h3>
                {donation.description && (
                  <p className="text-gray-600 mb-4 text-sm max-h-[7.5rem] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100 leading-relaxed">
                    {donation.description}
                  </p>
                )}
                
                {/* Progress Bar */}
                {donation.goal && (
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Raised: {formatAmount(donation.amount)}</span>
                      <span>Goal: {formatAmount(donation.goal)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${calculateProgress(donation.amount, donation.goal)}%` }}
                      />
                    </div>
                    <div className="text-right text-sm text-gray-600 mt-1">
                      {Math.round(calculateProgress(donation.amount, donation.goal))}% Complete
                    </div>
                  </div>
                )}

                {/* QR Code & Contact Section */}
                {!isTeacher && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3 text-center">Direct Donation</h4>
                      <div className="flex justify-center mb-3">
                        <div className="bg-white p-2 rounded-lg border border-gray-200">
                          <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=Donate to ${encodeURIComponent(donation.purpose)} - LCCB Alumni - 0912-345-6789`}
                            alt={`QR Code for ${donation.purpose}`}
                            className="w-32 h-32"
                          />
                        </div>
                      </div>
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-center gap-2 text-blue-600">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <span className="font-semibold">0912-345-6789</span>
                        </div>
                        <p className="text-center text-gray-600">GCash / PayMaya / Bank Transfer</p>
                        <p className="text-center text-gray-500 text-xs">Scan QR or use number above</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 mt-4">
                  {isTeacher && (
                    <>
                      <button 
                        onClick={() => handleEdit(donation)}
                        className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors duration-200 text-sm">
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(donation.id)}
                        className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors duration-200 text-sm">
                        Delete
                      </button>
                    </>
                  )}
                  <button className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors duration-200 text-sm">
                    Share
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredDonations.length === 0 && !loading && (
          <div className="text-center text-gray-500 py-12">
            No campaigns found. Create your first campaign!
          </div>
        )}

        {/* Modal for Adding/Editing Campaign */}
        {showModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-full max-w-3xl shadow-lg rounded-xl bg-white max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-3 py-4 -mx-5 -mt-5 rounded-t-xl">
                <h3 className="text-2xl font-semibold text-gray-900">
                  {editingId ? 'Edit Campaign' : 'Add New Campaign'}
                </h3>
                <p className="mt-1 text-sm text-gray-500">Enter the details for the {editingId ? 'campaign update' : 'new donation campaign'}</p>
              </div>
              <div className="mt-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Campaign Title *
                      </label>
                      <input
                        type="text"
                        name="purpose"
                        value={formData.purpose}
                        onChange={handleInputChange}
                        required
                        className="mt-1 block w-full px-3 py-2.5 text-sm rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        placeholder="e.g., LCCB Scholarship Fund"
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
                        rows="4"
                        className="mt-1 block w-full px-3 py-2.5 text-sm rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                        placeholder="Describe the purpose and impact of this campaign..."
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Category *
                      </label>
                      <select
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        required
                        className="mt-1 block w-full px-3 py-2.5 text-sm rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Select a category</option>
                        <option value="Education">Education</option>
                        <option value="Infrastructure">Infrastructure</option>
                        <option value="Community">Community</option>
                        <option value="Research">Research</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Current Amount Raised (PHP) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        name="amount"
                        value={formData.amount}
                        onChange={handleInputChange}
                        required
                        className="mt-1 block w-full px-3 py-2.5 text-sm rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        placeholder="750000.00"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Goal Amount (PHP)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        name="goal"
                        value={formData.goal}
                        onChange={handleInputChange}
                        className="mt-1 block w-full px-3 py-2.5 text-sm rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        placeholder="1000000.00"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        End Date
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
                        Campaign Image
                      </label>
                      <input
                        type="file"
                        name="image"
                        accept="image/*"
                        onChange={handleInputChange}
                        className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {formData.image && (
                        <p className="mt-1 text-sm text-gray-500">Selected: {formData.image.name}</p>
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
                        setFormData({
                          purpose: '',
                          description: '',
                          category: '',
                          amount: '',
                          goal: '',
                          date: '',
                          image: null
                        });
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
                      {loading ? 'Saving...' : editingId ? 'Update Campaign' : 'Add Campaign'}
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

export default Donations;
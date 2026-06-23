import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import donationService from '../services/donationService';
import ConfirmModal from './ConfirmModal';
import { authService } from '../services/authService';
import UserLayout from './UserLayout';
import { API_BASE_URL, IMAGE_BASE_URL } from '../config/apiBaseUrl';
import { toast } from 'react-toastify';
import { extractDonationMeta, withDonationMeta } from '../utils/donationMeta';

function DonationCard({ donation, isTeacher, onEdit, onDelete, onDonate, onShare, formatAmount, calculateProgress }) {
  const titleRef = useRef(null);
  const [descLines, setDescLines] = useState(4);
  const navigate = useNavigate();

  const measureTitle = useCallback(() => {
    const el = titleRef.current;
    if (!el) return;
    // card-title-container: font-size 18px, line-height 1.4
    const lineHeight = 18 * 1.4;
    const lines = Math.round(el.scrollHeight / lineHeight);
    setDescLines(lines <= 1 ? 5 : 4);
  }, []);

  useEffect(() => {
    measureTitle();
    window.addEventListener('resize', measureTitle);
    return () => window.removeEventListener('resize', measureTitle);
  }, [measureTitle, donation.purpose]);

  const { cleanDescription, meta } = extractDonationMeta(donation.description || '');
  const progress = calculateProgress(donation.amount, donation.goal);

  return (
    <div className="app-card overflow-hidden group flex h-full flex-col p-0">
      <div className="relative h-48 overflow-hidden">
        <img
          src={
            donation.image
              ? (donation.image.startsWith('/') ? `${IMAGE_BASE_URL}${donation.image}` : donation.image)
              : 'https://placehold.co/600x400/e2e8f0/94a3b8?text=Donation+Campaign'
          }
          alt={donation.purpose}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute left-4 top-4 flex items-center gap-2">
          <span className="rounded-full bg-white/90 px-3 py-1 text-sm font-medium text-blue-900 shadow-sm backdrop-blur">
            {donation.category || 'General'}
          </span>
        </div>
        <span className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1 text-sm font-medium text-gray-700 shadow-sm backdrop-blur">
          {donation.date ? `Ends ${new Date(donation.date).toLocaleDateString()}` : ''}
        </span>
      </div>

      <div className="flex flex-1 flex-col px-6 pb-6 pt-5">
        {/* Title — bounding to 2-line visual footprint */}
        <h3 ref={titleRef} className="card-title-container group-hover:text-blue-900 transition-colors">
          {donation.purpose}
        </h3>

        {/* Description — JS sentence-limit (4 if 2-line title, 5 if 1-line title) */}
        {cleanDescription && (
          <div className="card-description-container">
            <p className={descLines === 5 ? 'desc-clamp-5' : 'desc-clamp-4'}>
              {cleanDescription}
            </p>
          </div>
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
                className="bg-blue-900 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-right text-sm text-gray-600 mt-1">
              {Math.round(progress)}% Complete
            </div>
          </div>
        )}

        {/* Footer — Read More + actions anchored to bottom */}
        <div className="card-footer-wrapper">
          <button
            onClick={() => navigate(`/donate/${donation.id}`)}
            className="read-more-link"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            Read More
          </button>
          <div className={`grid gap-2 ${isTeacher ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'}`}>
            {isTeacher && (
              <>
                <button
                  onClick={() => onEdit(donation)}
                  className="w-full bg-sky-600 text-white px-4 py-2 rounded-md hover:bg-sky-700 transition-colors duration-200 text-sm font-medium shadow-sm"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(donation.id)}
                  className="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors duration-200 text-sm font-medium shadow-sm"
                >
                  Delete
                </button>
              </>
            )}
            <button
              onClick={() => navigate(`/donate/${donation.id}`)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors duration-200 text-sm flex items-center justify-center gap-2"
            >
              Donate
            </button>
            <button
              onClick={() => onShare(donation)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors duration-200 text-sm flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

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
    image: null,
    qrImage: null,
    qrCodeUrl: '',
    qrImagePath: '',
    paymentNumber: '',
    paymentMethods: '',
    deliveryInstructions: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedQrDonation, setSelectedQrDonation] = useState(null);

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

  // Share functionality
  const handleShare = async (donation) => {
    const { cleanDescription } = extractDonationMeta(donation.description || '');
    const shareData = {
      title: donation.purpose,
      text: `${donation.purpose}\n\n${cleanDescription}\n\nGoal: ₱${parseFloat(donation.goal).toLocaleString()}\nRaised: ₱${parseFloat(donation.amount).toLocaleString()}`,
      url: window.location.href
    };

    // Check if Web Share API is supported
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled or error occurred
        if (err.name !== 'AbortError') {
          console.error('Error sharing:', err);
          fallbackShare(donation);
        }
      }
    } else {
      // Fallback for browsers that don't support Web Share API
      fallbackShare(donation);
    }
  };

  const fallbackShare = (donation) => {
    const { cleanDescription } = extractDonationMeta(donation.description || '');
    // Copy to clipboard as fallback
    const shareText = `${donation.purpose}\n\n${cleanDescription}\n\nGoal: ₱${parseFloat(donation.goal).toLocaleString()}\nRaised: ₱${parseFloat(donation.amount).toLocaleString()}\n\n${window.location.href}`;
    
    navigator.clipboard.writeText(shareText).then(() => {
      toast.success('Campaign details copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy:', err);
      toast.error('Unable to share. Please copy the URL manually.');
    });
  };

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
    } else if (name === 'qrImage') {
      setFormData(prev => ({ ...prev, qrImage: files[0] }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const descriptionWithMeta = withDonationMeta(formData.description, {
        qrCodeUrl: formData.qrCodeUrl,
        qrImagePath: formData.qrImagePath,
        paymentNumber: formData.paymentNumber,
        paymentMethods: formData.paymentMethods,
        deliveryInstructions: formData.deliveryInstructions
      });

      let payload = formData;
      
      // If any file is present, send as FormData
      if (formData.image || formData.qrImage) {
        const fd = new FormData();
        fd.append('purpose', formData.purpose);
        fd.append('description', descriptionWithMeta);
        fd.append('category', formData.category);
        fd.append('amount', formData.amount);
        if (formData.goal) fd.append('goal', formData.goal);
        if (formData.date) fd.append('date', formData.date);
        if (formData.image) fd.append('image', formData.image);
        if (formData.qrImage) fd.append('qr_image', formData.qrImage);
        payload = fd;
      } else {
        const { image, qrImage, ...rest } = formData;
        payload = {
          ...rest,
          description: descriptionWithMeta
        };
      }

      if (editingId) {
        const updated = await donationService.updateDonation(editingId, payload);
        setDonations(prev => prev.map(d => d.id === editingId ? updated : d));
        toast.success('Campaign updated successfully!');
      } else {
        const newDonation = await donationService.createDonation(payload);
        setDonations(prev => [...prev, newDonation]);
        toast.success('Campaign added successfully!');
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
        image: null,
        qrImage: null,
        qrCodeUrl: '',
        qrImagePath: '',
        paymentNumber: '',
        paymentMethods: '',
        deliveryInstructions: ''
      });
    } catch (err) {
      console.error('Error saving donation:', err);
      const errorMsg = err.response?.data?.message || err.response?.data?.error || 'Failed to save campaign';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (donation) => {
    const { cleanDescription, meta } = extractDonationMeta(donation.description || '');

    setEditingId(donation.id);
    setFormData({
      purpose: donation.purpose || '',
      description: cleanDescription,
      category: donation.category || '',
      amount: donation.amount || '',
      goal: donation.goal || '',
      date: donation.date ? donation.date.split('T')[0] : '',
      image: null,
      qrImage: null,
      qrCodeUrl: meta.qrCodeUrl || '',
      qrImagePath: meta.qrImagePath || '',
      paymentNumber: meta.paymentNumber || '',
      paymentMethods: meta.paymentMethods || '',
      deliveryInstructions: meta.deliveryInstructions || ''
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
          toast.success('Campaign deleted successfully!');
        } catch (err) {
          console.error('Error deleting donation:', err);
          toast.error('Failed to delete campaign');
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

  const buildGeneratedQrDataUrl = async (donation, paymentNumber, paymentMethods) => {
    const payload = [
      'LCCB Alumni Donation',
      `Campaign: ${donation.purpose || 'General Campaign'}`,
      `Payment Number: ${paymentNumber || 'N/A'}`,
      `Payment Methods: ${paymentMethods || 'GCash / PayMaya / Bank Transfer'}`,
      `Donate Link: ${window.location.origin}/donate/${donation.id}`
    ].join('\n');

    return QRCode.toDataURL(payload, {
      width: 512,
      margin: 2,
      color: {
        dark: '#111827',
        light: '#FFFFFF'
      }
    });
  };

  const resolveQrPreviewData = async (donation, meta) => {
    const normalizedPaymentMethods = meta.paymentMethods || 'GCash / PayMaya / Bank Transfer';

    if (meta.qrImagePath) {
      return {
        qrData: meta.qrImagePath.startsWith('/') ? `${IMAGE_BASE_URL}${meta.qrImagePath}` : meta.qrImagePath,
        paymentMethods: normalizedPaymentMethods
      };
    }

    if (meta.qrCodeUrl) {
      const rawQrValue = meta.qrCodeUrl.trim();
      const looksLikeImage = /\.(png|jpe?g|gif|webp|svg)$/i.test(rawQrValue) || rawQrValue.startsWith('data:image/');

      if (looksLikeImage) {
        return {
          qrData: rawQrValue,
          paymentMethods: normalizedPaymentMethods
        };
      }

      return {
        qrData: await QRCode.toDataURL(rawQrValue, {
          width: 512,
          margin: 2,
          color: {
            dark: '#111827',
            light: '#FFFFFF'
          }
        }),
        paymentMethods: normalizedPaymentMethods
      };
    }

    return {
      qrData: await buildGeneratedQrDataUrl(donation, meta.paymentNumber || '0912-345-6789', normalizedPaymentMethods),
      paymentMethods: normalizedPaymentMethods
    };
  };

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
                Support Our Causes
              </h1>
              <p className="text-lg text-gray-600">
                Join us in making a difference through your generous contributions
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

        {/* Categories */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
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

        {/* Campaign Cards */}
        {loading && <div className="text-center">Loading...</div>}
        {error && <div className="text-center text-red-600">{error}</div>}

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 items-stretch">
          {filteredDonations.map((donation) => (
            <DonationCard
              key={donation.id}
              donation={donation}
              isTeacher={isTeacher}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onDonate={(d) => navigate(`/donate/${d.id}`)}
              onShare={handleShare}
              formatAmount={formatAmount}
              calculateProgress={calculateProgress}
            />
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
            <div className="relative top-10 mx-auto flex h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border bg-white shadow-lg">
              <div className="shrink-0 border-b border-gray-200 bg-white px-6 py-4">
                <h3 className="text-2xl font-semibold text-gray-900">
                  {editingId ? 'Edit Campaign' : 'Add New Campaign'}
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-hide">
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
                        className="app-input"
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
                        className="app-textarea"
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
                        className="app-select"
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
                        className="app-input"
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
                        className="app-input"
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
                        className="app-input"
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



                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Payment Number / Account (Optional)
                      </label>
                      <input
                        type="text"
                        name="paymentNumber"
                        value={formData.paymentNumber}
                        onChange={handleInputChange}
                        className="app-input"
                        placeholder="e.g., 0912-345-6789"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Payment Channel Note (Optional)
                      </label>
                      <input
                        type="text"
                        name="paymentMethods"
                        value={formData.paymentMethods}
                        onChange={handleInputChange}
                        className="app-input"
                        placeholder="e.g., GCash / Maya / Bank Transfer"
                      />
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
                          image: null,
                          qrImage: null,
                          qrCodeUrl: '',
                          qrImagePath: '',
                          paymentNumber: '',
                          paymentMethods: '',
                          deliveryInstructions: ''
                        });
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
                      {loading ? 'Saving...' : editingId ? 'Update Campaign' : 'Add Campaign'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* QR Details Modal */}
        {selectedQrDonation && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-60 flex items-center justify-center p-4 z-[60]">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedQrDonation.purpose}</h3>
                  <p className="text-sm text-gray-500">Scan to donate quickly</p>
                </div>
                <button
                  onClick={() => setSelectedQrDonation(null)}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Close QR modal"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 flex justify-center mb-4">
                <img
                  src={selectedQrDonation._meta.qrData}
                  alt={`QR for ${selectedQrDonation.purpose}`}
                  className="w-52 h-52 rounded-md bg-white p-2 border border-gray-200"
                />
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-gray-600">Payment Number</span>
                  <span className="font-semibold text-gray-900">{selectedQrDonation._meta.paymentNumber}</span>
                </div>
                <p className="text-gray-600">{selectedQrDonation._meta.paymentMethods}</p>
              </div>

              <div className="flex justify-end mt-5">
                <button
                  onClick={() => setSelectedQrDonation(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </UserLayout>
  );
};

export default Donations;
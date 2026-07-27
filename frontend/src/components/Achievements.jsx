import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { toast } from 'react-toastify';
import achievementService from '../services/achievementService';
import { realtimeClient } from '../services/realtimeClient';
import ConfirmModal from './ConfirmModal';
import { authService } from '../services/authService';
import UserLayout from './UserLayout';
import { API_BASE_URL, IMAGE_BASE_URL } from '../config/apiBaseUrl';
import { Link } from 'react-router-dom';
import AchievementVideoPreview from './AchievementVideoPreview';
import FilterMenu from './FilterMenu';

const ACHIEVEMENT_CATEGORIES = ['All', 'Professional', 'Leadership', 'Business', 'Community Service', 'Affiliate'];

const getAchievementYear = (dateValue) => {
  if (!dateValue) return null;

  const dateString = String(dateValue);
  const yearMatch = dateString.match(/^(\d{4})/);
  if (yearMatch) return yearMatch[1];

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;

  return String(date.getFullYear());
};

function AchievementGridCard({ achievement, isTeacher, onEdit, handleDelete }) {
  const titleRef = useRef(null);
  const [descLines, setDescLines] = useState(4);

  const measureTitle = useCallback(() => {
    const el = titleRef.current;
    if (!el) return;
    // card-title-container: font-size 18px, line-height 1.4 → ~25.2px per line
    const lineHeight = 18 * 1.4;
    const lines = Math.round(el.scrollHeight / lineHeight);
    setDescLines(lines <= 1 ? 5 : 4);
  }, []);

  useEffect(() => {
    measureTitle();
    window.addEventListener('resize', measureTitle);
    return () => window.removeEventListener('resize', measureTitle);
  }, [measureTitle, achievement.title]);

  return (
    <div
      key={achievement.id}
      className="app-card overflow-hidden group flex h-full flex-col p-0"
    >
      <div className="relative h-48 overflow-hidden">
        {achievement.image ? (
          /\.(mp4|mov|avi|mkv|webm)$/i.test(achievement.image) ? (
            <AchievementVideoPreview
              src={achievement.image.startsWith('/') ? `${IMAGE_BASE_URL}${achievement.image}` : achievement.image}
              className="h-full w-full"
              videoClassName="h-full w-full object-cover"
              muted
            />
          ) : (
            <img
              src={achievement.image.startsWith('/') ? `${IMAGE_BASE_URL}${achievement.image}` : achievement.image}
              alt={achievement.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          )
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

      <div className="flex flex-col flex-1 px-6 pb-6 pt-5">
        {(achievement.alumni_name || achievement.alumni) && (
          <p className="text-sm text-gray-600 font-semibold mb-1">
            {achievement.alumni_name || `${achievement.alumni.first_name} ${achievement.alumni.last_name}`}
          </p>
        )}

        {/* Title — bounding to 2-line visual footprint */}
        <h3 ref={titleRef} className="card-title-container group-hover:text-blue-900 transition-colors duration-300">
          <Link
            to={`/achievements/${achievement.id}`}
            className="hover:text-blue-900 transition-colors duration-300"
          >
            {achievement.title}
          </Link>
        </h3>

        {/* Description — JS sentence-limit (4 or 5 lines based on title height) */}
        <div className="card-description-container">
          <p
            className={descLines === 5 ? 'desc-clamp-5' : 'desc-clamp-4'}
            style={{ lineHeight: 1.5, wordBreak: 'break-word' }}
          >
            {achievement.description || 'No description provided'}
          </p>
        </div>

        {/* Footer — Read More + date anchored to bottom */}
        <div className="card-footer-wrapper">
          <Link
            to={`/achievements/${achievement.id}`}
            className="read-more-link"
          >
            Read More
          </Link>
          <div className="pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-600">
              <span className="font-semibold text-gray-900">Date:</span> {achievement.date ? new Date(achievement.date).toLocaleDateString() : 'N/A'}
            </p>
          </div>
        </div>

        {isTeacher && (
          <div className="mt-4 flex gap-2 pt-1">
            <button
              onClick={() => onEdit(achievement)}
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
  );
}

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
    image: null,
    video: null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [showYearMenu, setShowYearMenu] = useState(false);
  const categoryMenuRef = useRef(null);
  const yearMenuRef = useRef(null);

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    type: 'danger'
  });

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedYear, setSelectedYear] = useState('All');

  const availableYears = useMemo(() => {
    const years = achievements
      .map((achievement) => getAchievementYear(achievement.date))
      .filter(Boolean);

    return [...new Set(years)].sort((a, b) => Number(b) - Number(a));
  }, [achievements]);

  const categoryMenuSections = useMemo(() => ([
    {
      key: 'ACHIEVEMENT_CATEGORIES',
      title: '',
      items: ACHIEVEMENT_CATEGORIES.map((category) => ({
        value: category,
        label: category === 'All' ? 'All Categories' : category
      }))
    }
  ]), []);

  const yearMenuSections = useMemo(() => ([
    {
      key: 'ACHIEVEMENT_YEARS',
      title: '',
      items: [
        { value: 'All', label: 'All Years' },
        ...availableYears.map((year) => ({ value: year, label: year }))
      ]
    }
  ]), [availableYears]);

  const setOnlyCategoryMenuOpen = (valueOrUpdater) => {
    const nextIsOpen = typeof valueOrUpdater === 'function' ? valueOrUpdater(showCategoryMenu) : valueOrUpdater;
    setShowCategoryMenu(nextIsOpen);
    if (nextIsOpen) {
      setShowYearMenu(false);
    }
  };

  const setOnlyYearMenuOpen = (valueOrUpdater) => {
    const nextIsOpen = typeof valueOrUpdater === 'function' ? valueOrUpdater(showYearMenu) : valueOrUpdater;
    setShowYearMenu(nextIsOpen);
    if (nextIsOpen) {
      setShowCategoryMenu(false);
    }
  };

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

  useEffect(() => {
    if (!showCategoryMenu && !showYearMenu) return undefined;

    const handlePointerDown = (event) => {
      const clickInsideCategory = categoryMenuRef.current && categoryMenuRef.current.contains(event.target);
      const clickInsideYear = yearMenuRef.current && yearMenuRef.current.contains(event.target);

      if (!clickInsideCategory && !clickInsideYear) {
        setShowCategoryMenu(false);
        setShowYearMenu(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setShowCategoryMenu(false);
        setShowYearMenu(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showCategoryMenu, showYearMenu]);

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
    if (name === 'image' || name === 'video') {
      setFormData(prev => ({
        ...prev,
        [name]: files[0]
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
      let payload;
      if (formData.image || formData.video) {
        const fd = new FormData();
        fd.append('alumni_id', formData.alumni_id);
        fd.append('title', formData.title);
        fd.append('category', formData.category);
        if (formData.description) fd.append('description', formData.description);
        if (formData.date) fd.append('date', formData.date);
        if (formData.image) fd.append('image', formData.image);
        if (formData.video) fd.append('video', formData.video);
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
        image: null,
        video: null
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
      image: null,
      video: null
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

  const filteredAchievements = useMemo(() => {
    let result = selectedCategory === 'All'
      ? achievements
      : achievements.filter(a => a.category === selectedCategory);

    if (selectedYear !== 'All') {
      result = result.filter(a => getAchievementYear(a.date) === selectedYear);
    }

    const q = searchTerm.trim().toLowerCase();
    if (q) {
      result = result.filter(a => {
        const alumniName = a.alumni_name || (a.alumni ? `${a.alumni.first_name} ${a.alumni.last_name}` : '');
        return [a.title, a.category, a.description, alumniName]
          .map(v => String(v || '').toLowerCase())
          .some(v => v.includes(q));
      });
    }

    return result;
  }, [achievements, selectedCategory, selectedYear, searchTerm]);

  const clearFilters = () => {
    setSelectedCategory('All');
    setSelectedYear('All');
    setShowCategoryMenu(false);
    setShowYearMenu(false);
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
              Alumni Achievements
            </h1>
            <p className="text-lg text-gray-600">
              Showcasing real alumni accomplishments, leadership roles, event-hosting potential, and affiliate impact.
            </p>
          </div>
          {isTeacher && (
            <button 
              onClick={() => {
                setEditingId(null);
                setFormData({
                  alumni_id: '',
                  title: '',
                  category: '',
                  description: '',
                  date: '',
                  image: null,
                  video: null
                });
                setError('');
                setShowModal(true);
              }}
              className="app-primary-button">
              Add New
            </button>
          )}
        </div>
        </div>

        {/* Unified Search and Filter Card */}
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white shadow-sm px-5 py-4">
          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative group">
              <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-blue-600 transition group-focus-within:text-blue-900">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-transparent bg-transparent">
                  <svg className="h-4.5 w-4.5 text-current" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
              </div>
              <input
                type="text"
                placeholder="Search achievements by name, title, or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-14 pr-12 text-sm text-gray-900 shadow-sm transition placeholder:text-gray-400 focus:border-blue-300 focus:outline-none focus:ring-4 focus:ring-blue-100"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-3 my-auto inline-flex h-7 w-7 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                  aria-label="Clear search"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path fillRule="evenodd" d="M10 8.586 5.707 4.293A1 1 0 0 0 4.293 5.707L8.586 10l-4.293 4.293a1 1 0 1 0 1.414 1.414L10 11.414l4.293 4.293a1 1 0 0 0 1.414-1.414L11.414 10l4.293-4.293a1 1 0 0 0-1.414-1.414L10 8.586Z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-3">
            <FilterMenu
              menuRef={categoryMenuRef}
              isOpen={showCategoryMenu}
              setIsOpen={setOnlyCategoryMenuOpen}
              buttonLabel="Category"
              selectedLabel={selectedCategory === 'All' ? 'All Categories' : selectedCategory}
              selectedValue={selectedCategory}
              icon={<svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" /></svg>}
              sections={categoryMenuSections}
              onSelect={(value) => {
                setSelectedCategory(value);
                setShowCategoryMenu(false);
              }}
              panelTitle="Categories"
              panelWidthClass="w-64"
              alignClass="left-0"
            />

            <FilterMenu
              menuRef={yearMenuRef}
              isOpen={showYearMenu}
              setIsOpen={setOnlyYearMenuOpen}
              buttonLabel="Year"
              selectedLabel={selectedYear === 'All' ? 'All Years' : selectedYear}
              selectedValue={selectedYear}
              icon={<svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3M5 11h14M7 21h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
              sections={yearMenuSections}
              onSelect={(value) => {
                setSelectedYear(value);
                setShowYearMenu(false);
              }}
              panelTitle="Years"
              panelWidthClass="w-48"
              alignClass="left-0"
            />

            {(selectedCategory !== 'All' || selectedYear !== 'All') && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700 shadow-sm transition hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-200"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        <div className="mb-8 text-sm text-gray-600">
          Showing {filteredAchievements.length} of {achievements.length} achievements
        </div>

        {/* Achievements Grid */}
        <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3 items-stretch">
          {loading && <div className="col-span-full text-center">Loading...</div>}
          {error && <div className="col-span-full text-center text-red-600">{error}</div>}
          {!loading && filteredAchievements.length === 0 && (
            <div className="col-span-full text-center text-gray-500">No achievements found</div>
          )}
          {filteredAchievements.map((achievement) => (
            <AchievementGridCard
              key={achievement.id}
              achievement={achievement}
              isTeacher={isTeacher}
              onEdit={handleEdit}
              handleDelete={handleDelete}
            />
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
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Achievement Video
                      </label>
                      <input
                        type="file"
                        name="video"
                        accept="video/*"
                        onChange={handleInputChange}
                        className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-purple-100 file:text-purple-900 hover:file:bg-purple-200"
                      />
                      {formData.video && (
                        <p className="text-sm text-gray-500 mt-1">Selected: {formData.video.name}</p>
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
                        setFormData({
                          alumni_id: '',
                          title: '',
                          category: '',
                          description: '',
                          date: '',
                          image: null,
                          video: null
                        });
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

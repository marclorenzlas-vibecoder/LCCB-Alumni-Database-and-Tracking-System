import React, { useState, useEffect, useMemo } from 'react';
import alumniService from '../services/alumniService';
import achievementService from '../services/achievementService';
import careerService from '../services/careerService';
import donationService from '../services/donationService';
import officerService from '../services/officerService';
import { authService } from '../services/authService';
import ConfirmModal from './ConfirmModal';

// Table header helper for sorting
const TableHeader = ({ label, field, sortOrder, onSort }) => {
  const isActive = sortOrder.field === field;
  const direction = isActive ? sortOrder.direction : null;
  return (
    <th
      scope="col"
      onClick={() => onSort(field)}
      className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer select-none"
    >
      <div className="flex items-center gap-1">
        {label}
        <span className="text-gray-400">
          {direction === 'asc' && ''}
          {direction === 'desc' && ''}
        </span>
      </div>
    </th>
  );
};

const levelOptions = [
  { value: '', label: 'All Levels' },
  { value: 'COLLEGE', label: 'College' },
  { value: 'HIGH_SCHOOL', label: 'High School' },
  { value: 'SENIOR_HIGH_SCHOOL', label: 'Senior High School' }
];

const AlumniDirectory = () => {
  // Role
  const isTeacher = authService.isTeacher();

  // Core data
  const [alumni, setAlumni] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filters / search / sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(''); // Placeholder for future grouping logic
  const [sortOrder, setSortOrder] = useState({ field: 'id', direction: 'desc' });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Viewing / editing / adding
  const [showViewModal, setShowViewModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [viewingAlumni, setViewingAlumni] = useState(null);
  const [editingAlumni, setEditingAlumni] = useState(null);

  // Related record modals
  const [showAchievementModal, setShowAchievementModal] = useState(false);
  const [showCareerModal, setShowCareerModal] = useState(false);
  const [showDonationModal, setShowDonationModal] = useState(false);

  // Related records data
  const [achievements, setAchievements] = useState([]);
  const [careers, setCareers] = useState([]);
  const [donations, setDonations] = useState([]);

  // Batch officers
  const [batchOfficers, setBatchOfficers] = useState([]);
  const [showOfficersModal, setShowOfficersModal] = useState(false);
  const [showAssignOfficerModal, setShowAssignOfficerModal] = useState(false);
  const [officerForm, setOfficerForm] = useState({ alumni_id: '', position: '', batch: '' });

  // New record states
  const [newAchievement, setNewAchievement] = useState({ title: '', description: '', date: '' });
  const [newCareer, setNewCareer] = useState({ job_title: '', company: '', start_date: '', end_date: '', is_current: false, description: '' });
  const [newDonation, setNewDonation] = useState({ amount: '', purpose: '', date: '' });

  // Confirm modal
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {}, type: 'danger' });

  // Alumni form state (used for both add & edit)
  const blankAlumni = {
    firstName: '',
    lastName: '',
    graduationYear: '',
    level: '',
    batch: '',
    course: '',
    currentPosition: '',
    company: '',
    location: '',
    skills: '',
    email: '',
    contactNumber: '',
    profileImage: '',
    profileImageFile: null
  };
  const [newAlumni, setNewAlumni] = useState(blankAlumni);

  // Fetch alumni list
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await alumniService.getAllAlumni();
        setAlumni(data);
      } catch (e) {
        setError(e.message || 'Failed to load alumni');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Derived batches from data
  const batches = useMemo(() => {
    const set = new Set();
    alumni.forEach(a => { if (a.batch) set.add(a.batch); });
    return Array.from(set).sort();
  }, [alumni]);

  // Groups placeholder (for future) - derive by course initial maybe
  const groups = useMemo(() => {
    const set = new Set();
    alumni.forEach(a => { if (a.course) set.add(a.course); });
    return Array.from(set).sort();
  }, [alumni]);

  // Filter + search + sort
  const filteredAlumni = useMemo(() => {
    let data = [...alumni];
    // Search
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      data = data.filter(a => [a.firstName, a.lastName, a.course, a.email, a.company, a.graduationYear?.toString()].some(v => v && v.toLowerCase().includes(term)));
    }
    // Level filter
    if (selectedLevel) data = data.filter(a => a.level === selectedLevel);
    // Batch filter
    if (selectedBatch) data = data.filter(a => String(a.batch) === String(selectedBatch));
    // Group (course) filter
    if (selectedGroup) data = data.filter(a => a.course === selectedGroup);
    // Sort
    data.sort((a, b) => {
      const field = sortOrder.field;
      const dir = sortOrder.direction === 'asc' ? 1 : -1;
      let av = a[field];
      let bv = b[field];
      if (av == null) av = ''; if (bv == null) bv = '';
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return av.toString().localeCompare(bv.toString(), undefined, { numeric: true }) * dir;
    });
    return data;
  }, [alumni, searchTerm, selectedLevel, selectedBatch, selectedGroup, sortOrder]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredAlumni.length / itemsPerPage);
  const paginatedAlumni = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAlumni.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAlumni, currentPage, itemsPerPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedLevel, selectedBatch, selectedGroup]);

  // Load batch officers when a batch is selected
  useEffect(() => {
    const loadBatchOfficers = async () => {
      if (selectedBatch) {
        try {
          const officers = await officerService.getOfficersByBatch(selectedBatch);
          setBatchOfficers(officers);
        } catch (error) {
          console.error('Error loading batch officers:', error);
          setBatchOfficers([]);
        }
      } else {
        setBatchOfficers([]);
      }
    };
    loadBatchOfficers();
  }, [selectedBatch]);

  // Open assign officer modal
  const openAssignOfficerModal = () => {
    setOfficerForm({ alumni_id: '', position: '', batch: selectedBatch || '' });
    setShowAssignOfficerModal(true);
  };

  // Handle officer assignment
  const handleAssignOfficer = async (e) => {
    e.preventDefault();
    if (!officerForm.alumni_id || !officerForm.position || !officerForm.batch) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      await officerService.assignOfficer(officerForm);
      alert('Officer assigned successfully!');
      setShowAssignOfficerModal(false);
      // Reload officers
      if (selectedBatch) {
        const officers = await officerService.getOfficersByBatch(selectedBatch);
        setBatchOfficers(officers);
      }
    } catch (error) {
      console.error('Error assigning officer:', error);
      alert(error.response?.data?.message || 'Failed to assign officer');
    }
  };

  // Handle officer removal
  const handleRemoveOfficer = async (officerId) => {
    if (!window.confirm('Are you sure you want to remove this officer?')) return;

    try {
      await officerService.removeOfficer(officerId);
      alert('Officer removed successfully!');
      // Reload officers
      if (selectedBatch) {
        const officers = await officerService.getOfficersByBatch(selectedBatch);
        setBatchOfficers(officers);
      }
    } catch (error) {
      console.error('Error removing officer:', error);
      alert('Failed to remove officer');
    }
  };

  // Handle sort
  const handleSort = (field) => {
    setSortOrder(prev => {
      if (prev.field === field) {
        const nextDir = prev.direction === 'asc' ? 'desc' : 'asc';
        return { field, direction: nextDir };
      }
      return { field, direction: 'asc' };
    });
  };

  // Input change for alumni form
  const handleInputChange = (e) => {
    const { name, value, files } = e.target;
    if (files && files[0]) {
      const file = files[0];
      const previewUrl = URL.createObjectURL(file);
      setNewAlumni(prev => ({ ...prev, profileImageFile: file, profileImage: previewUrl }));
    } else {
      setNewAlumni(prev => ({ ...prev, [name]: value }));
    }
  };

  // Add alumni
  const handleAddAlumni = async (e) => {
    e.preventDefault();
    try {
      const created = await alumniService.addAlumni(newAlumni);
      setAlumni(prev => [created, ...prev]);
      setShowAddModal(false);
      setNewAlumni(blankAlumni);
    } catch (err) {
      alert(err.message || 'Failed to add alumni');
    }
  };

  // Edit alumni
  const handleEditAlumni = async (e) => {
    e.preventDefault();
    if (!editingAlumni) return;
    try {
      let payload = { ...newAlumni };
      // If a new file selected, use FormData
      if (newAlumni.profileImageFile) {
        const formData = new FormData();
        Object.entries(payload).forEach(([k, v]) => {
          if (k === 'profileImageFile' && v) formData.append('profileImage', v);
          else if (v !== undefined && v !== null && k !== 'profileImage') formData.append(k, v);
        });
        const updated = await alumniService.updateAlumni(editingAlumni.id, formData);
        setAlumni(prev => prev.map(a => a.id === editingAlumni.id ? updated : a));
      } else {
        const updated = await alumniService.updateAlumni(editingAlumni.id, payload);
        setAlumni(prev => prev.map(a => a.id === editingAlumni.id ? updated : a));
      }
      setShowEditModal(false);
      setEditingAlumni(null);
      setNewAlumni(blankAlumni);
    } catch (err) {
      alert(err.message || 'Failed to update alumni');
    }
  };

  // Open view modal & load related records
  const openViewModal = async (alumnus) => {
    // Set initial data and open modal immediately
    setViewingAlumni(alumnus);
    setShowViewModal(true);
    
    try {
      // Fetch fresh alumni data with social links in the background
      const token = localStorage.getItem('token');
      const alumniResponse = await fetch(`http://localhost:5001/api/alumni/${alumnus.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (alumniResponse.ok) {
        const freshAlumniData = await alumniResponse.json();
        console.log('Fresh alumni data with social links:', freshAlumniData);
        // Update with fresh data including social links
        setViewingAlumni(freshAlumniData);
      }

      const [ach, car, don] = await Promise.all([
        achievementService.getAchievementsByAlumni(alumnus.id),
        careerService.getCareersByAlumni(alumnus.id),
        donationService.getDonationsByAlumni(alumnus.id)
      ]);
      setAchievements(ach || []);
      setCareers(car || []);
      setDonations(don || []);
    } catch (e) {
      console.warn('Failed loading related records:', e.message);
      setAchievements([]); setCareers([]); setDonations([]);
    }
  };

  // Delete helpers (achievements/careers/donations)
  const handleDeleteAchievement = (id) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Achievement',
      message: 'This will permanently remove the achievement.',
      type: 'danger',
      onConfirm: async () => {
        try {
          await achievementService.deleteAchievement(id);
          setAchievements(prev => prev.filter(a => a.id !== id));
        } catch (e) {
          alert('Failed to delete');
        } finally {
          setConfirmModal(m => ({ ...m, isOpen: false }));
        }
      }
    });
  };
  const handleDeleteCareer = (id) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Employment Record',
      message: 'Remove this employment entry?',
      type: 'danger',
      onConfirm: async () => {
        try {
          await careerService.deleteCareer(id);
          setCareers(prev => prev.filter(c => c.id !== id));
        } catch (e) {
          alert('Failed to delete');
        } finally {
          setConfirmModal(m => ({ ...m, isOpen: false }));
        }
      }
    });
  };
  const handleDeleteDonation = (id) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Donation',
      message: 'Remove this donation entry?',
      type: 'danger',
      onConfirm: async () => {
        try {
          await donationService.deleteDonation(id);
          setDonations(prev => prev.filter(d => d.id !== id));
        } catch (e) {
          alert('Failed to delete');
        } finally {
          setConfirmModal(m => ({ ...m, isOpen: false }));
        }
      }
    });
  };

  // Create related records
  const handleAddAchievement = async (e) => {
    e.preventDefault();
    if (!viewingAlumni) return;
    try {
      const payload = { ...newAchievement, alumniId: viewingAlumni.id };
      const created = await achievementService.createAchievement(payload);
      setAchievements(prev => [...prev, created]);
      setShowAchievementModal(false);
      setNewAchievement({ title: '', description: '', date: '' });
    } catch (err) { alert('Failed to add achievement'); }
  };
  const handleAddCareer = async (e) => {
    e.preventDefault();
    if (!viewingAlumni) return;
    try {
      const payload = { ...newCareer, alumniId: viewingAlumni.id };
      const created = await careerService.createCareer(payload);
      setCareers(prev => [...prev, created]);
      setShowCareerModal(false);
      setNewCareer({ job_title: '', company: '', start_date: '', end_date: '', is_current: false, description: '' });
    } catch (err) { alert('Failed to add employment'); }
  };
  const handleAddDonation = async (e) => {
    e.preventDefault();
    if (!viewingAlumni) return;
    try {
      const payload = { ...newDonation, alumniId: viewingAlumni.id };
      const created = await donationService.createDonation(payload);
      setDonations(prev => [...prev, created]);
      setShowDonationModal(false);
      setNewDonation({ amount: '', purpose: '', date: '' });
    } catch (err) { alert('Failed to add donation'); }
  };

  // CSV export (teacher only)
  const generateCsv = () => {
    const rows = [
      ['First Name','Last Name','Email','Course','Level','Batch','Graduation Year','Company','Position','Location','Skills'].join(',')
    ];
    filteredAlumni.forEach(a => {
      rows.push([
        a.firstName,
        a.lastName,
        a.email,
        a.course,
        a.level,
        a.batch,
        a.graduationYear,
        a.company,
        a.currentPosition,
        a.location,
        typeof a.skills === 'string' ? a.skills : Array.isArray(a.skills) ? a.skills.join('; ') : ''
      ].map(v => '"' + (v ?? '').toString().replace(/"/g,'""') + '"').join(','));
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const lvl = selectedLevel ? `_${selectedLevel.toLowerCase()}` : '';
    const bat = selectedBatch ? `_${selectedBatch}` : '';
    link.href = url;
    link.download = `alumni_list${lvl}${bat}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Rendering
  const colCount = isTeacher ? 7 : 6;
  return (
    <div className="bg-white shadow sm:rounded-lg">
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(m => ({ ...m, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText="Delete"
        cancelText="Cancel"
      />

      {/* Header */}
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-xl font-semibold text-gray-900">Alumni Directory</h2>
        {isTeacher && (
          <button
            onClick={() => { setNewAlumni(blankAlumni); setShowAddModal(true); }}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
          >
            Add New Alumni
          </button>
        )}
      </div>

      {/* View Profile Modal */}
      {showViewModal && viewingAlumni && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-40">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => { setShowViewModal(false); setViewingAlumni(null); }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="px-8 py-8">
              <div className="flex flex-col sm:flex-row items-center sm:items-start mb-8">
                <img
                  src={(viewingAlumni.profile_image || viewingAlumni.profileImage) ? `http://localhost:5001${viewingAlumni.profile_image || viewingAlumni.profileImage}` : `https://ui-avatars.com/api/?name=${(viewingAlumni.first_name || viewingAlumni.firstName)}+${(viewingAlumni.last_name || viewingAlumni.lastName)}&background=random&size=200`}
                  alt={`${viewingAlumni.first_name || viewingAlumni.firstName} ${viewingAlumni.last_name || viewingAlumni.lastName}`}
                  className="h-32 w-32 rounded-full object-cover border-4 border-gray-200 shadow-lg"
                />
                <div className="mt-4 sm:mt-0 sm:ml-6 text-center sm:text-left flex-1">
                  <h2 className="text-3xl font-bold text-gray-900">{viewingAlumni.first_name || viewingAlumni.firstName} {viewingAlumni.last_name || viewingAlumni.lastName}</h2>
                  <p className="text-lg text-gray-600 mt-1">
                    {(viewingAlumni.current_position || viewingAlumni.currentPosition) && viewingAlumni.company ? `${viewingAlumni.current_position || viewingAlumni.currentPosition} at ${viewingAlumni.company}` : (viewingAlumni.current_position || viewingAlumni.currentPosition) || 'Alumni'}
                  </p>
                  {viewingAlumni.location && (
                    <p className="text-sm text-gray-500 mt-2 flex items-center justify-center sm:justify-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      {viewingAlumni.location}
                    </p>
                  )}
                </div>
              </div>
              <div className="border-t border-gray-200 mb-6" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                <div className="bg-gray-50 rounded-lg p-6 md:col-span-2">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /></svg>Academic Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div><label className="text-sm font-medium text-gray-500">Course</label><p className="text-gray-900 mt-1">{viewingAlumni.course || 'Not provided'}</p></div>
                    <div><label className="text-sm font-medium text-gray-500">Level</label><p className="text-gray-900 mt-1">{viewingAlumni.level === 'COLLEGE' ? 'College' : viewingAlumni.level === 'HIGH_SCHOOL' ? 'High School' : viewingAlumni.level === 'SENIOR_HIGH_SCHOOL' ? 'Senior High School' : 'Not provided'}</p></div>
                    <div><label className="text-sm font-medium text-gray-500">Graduation Year</label><p className="text-gray-900 mt-1">{viewingAlumni.graduation_year || viewingAlumni.graduationYear || 'Not provided'}</p></div>
                    <div><label className="text-sm font-medium text-gray-500">Batch</label><p className="text-gray-900 mt-1">{viewingAlumni.batch || 'Not provided'}</p></div>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Contact Information
                  </h3>
                  <div className="space-y-3">
                    {isTeacher && (
                      <>
                        <div><label className="text-sm font-medium text-gray-500">Email</label><p className="text-gray-900">{(viewingAlumni.user?.email || viewingAlumni.email) || 'Not provided'}</p></div>
                        <div><label className="text-sm font-medium text-gray-500">Contact Number</label><p className="text-gray-900">{(viewingAlumni.contact_number || viewingAlumni.contactNumber) || 'Not provided'}</p></div>
                      </>
                    )}
                    <div>
                      <label className="text-sm font-medium text-gray-500">Social Media</label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {viewingAlumni.social_link && viewingAlumni.social_link.length > 0 ? (
                          viewingAlumni.social_link.map((link, index) => (
                            <a
                              key={index}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-blue-500 transition-colors"
                            >
                              {link.platform === 'Facebook' && (
                                <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                              )}
                              {link.platform === 'LinkedIn' && (
                                <svg className="w-5 h-5" fill="#0A66C2" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                              )}
                              {link.platform === 'Twitter' && (
                                <svg className="w-5 h-5" fill="#1DA1F2" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                              )}
                              {link.platform === 'Instagram' && (
                                <svg className="w-5 h-5" fill="url(#instagram-gradient)" viewBox="0 0 24 24"><defs><linearGradient id="instagram-gradient" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" style={{stopColor: '#FD5949'}} /><stop offset="50%" style={{stopColor: '#D6249F'}} /><stop offset="100%" style={{stopColor: '#285AEB'}} /></linearGradient></defs><path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/></svg>
                              )}
                              {link.platform === 'GitHub' && (
                                <svg className="w-5 h-5" fill="#181717" viewBox="0 0 24 24"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
                              )}
                              {link.platform === 'YouTube' && (
                                <svg className="w-5 h-5" fill="#FF0000" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                              )}
                              {link.platform === 'TikTok' && (
                                <svg className="w-5 h-5" fill="#000000" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
                              )}
                              {(!link.platform || link.platform === 'Other') && (
                                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                              )}
                              <span className="text-sm text-gray-700">{link.platform}</span>
                            </a>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500">No social media links added</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-6 md:col-span-2">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>Professional Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="text-sm font-medium text-gray-500">Current Position</label><p className="text-gray-900">{(viewingAlumni.current_position || viewingAlumni.currentPosition) || 'Not specified'}</p></div><div><label className="text-sm font-medium text-gray-500">Company</label><p className="text-gray-900">{viewingAlumni.company || 'Not specified'}</p></div></div>
                </div>
                {viewingAlumni.skills && (
                  <div className="bg-gray-50 rounded-lg p-6 md:col-span-2">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>Skills</h3>
                    <div className="flex flex-wrap gap-2">{viewingAlumni.skills.split(',').map((skill,i)=>(<span key={i} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">{skill.trim()}</span>))}</div>
                  </div>
                )}
                {/* Achievements */}
                <div className="bg-gray-50 rounded-lg p-6 md:col-span-2">
                  <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold text-gray-900 flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>Achievements</h3>{isTeacher && <button onClick={()=>setShowAchievementModal(true)} className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">+ Add</button>}</div>
                  <div className="space-y-3">{achievements.length===0? <p className="text-gray-500 text-sm">No achievements recorded yet.</p> : achievements.map(a => (<div key={a.id} className="bg-white rounded-lg p-4 border border-gray-200"><div className="flex justify-between items-start"><div className="flex-1"><h4 className="font-medium text-gray-900">{a.title}</h4>{a.description && <p className="text-sm text-gray-600 mt-1">{a.description}</p>}{a.date && <p className="text-xs text-gray-500 mt-2">{new Date(a.date).toLocaleDateString()}</p>}</div>{isTeacher && <button onClick={()=>handleDeleteAchievement(a.id)} className="text-red-600 hover:text-red-800 ml-2"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>}</div></div>))}</div>
                </div>
                {/* Employment */}
                <div className="bg-gray-50 rounded-lg p-6 md:col-span-2">
                  <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold text-gray-900 flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>Employment History</h3>{isTeacher && <button onClick={()=>setShowCareerModal(true)} className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">+ Add</button>}</div>
                  <div className="space-y-3">{careers.length===0? <p className="text-gray-500 text-sm">No employment history recorded yet.</p> : careers.map(c => (<div key={c.id} className="bg-white rounded-lg p-4 border border-gray-200"><div className="flex justify-between items-start"><div className="flex-1"><h4 className="font-medium text-gray-900">{c.job_title}</h4><p className="text-sm text-gray-600">{c.company}</p>{c.description && <p className="text-sm text-gray-600 mt-1">{c.description}</p>}<p className="text-xs text-gray-500 mt-2">{c.start_date? new Date(c.start_date).toLocaleDateString(): 'N/A'} - {c.is_current? 'Present' : (c.end_date? new Date(c.end_date).toLocaleDateString(): 'N/A')}</p></div>{isTeacher && <button onClick={()=>handleDeleteCareer(c.id)} className="text-red-600 hover:text-red-800 ml-2"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>}</div></div>))}</div>
                </div>
                {/* Donations */}
                <div className="bg-gray-50 rounded-lg p-6 md:col-span-2">
                  <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold text-gray-900 flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>Donations</h3>{isTeacher && <button onClick={()=>setShowDonationModal(true)} className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">+ Add</button>}</div>
                  <div className="space-y-3">{donations.length===0? <p className="text-gray-500 text-sm">No donations recorded yet.</p> : donations.map(d => (<div key={d.id} className="bg-white rounded-lg p-4 border border-gray-200"><div className="flex justify-between items-start"><div className="flex-1"><h4 className="font-medium text-gray-900">${d.amount}</h4>{d.purpose && <p className="text-sm text-gray-600 mt-1">{d.purpose}</p>}{d.date && <p className="text-xs text-gray-500 mt-2">{new Date(d.date).toLocaleDateString()}</p>}</div>{isTeacher && <button onClick={()=>handleDeleteDonation(d.id)} className="text-red-600 hover:text-red-800 ml-2"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>}</div></div>))}</div>
                </div>
              </div>
              <div className="mt-8 flex justify-end gap-3"><button onClick={()=>{setShowViewModal(false); setViewingAlumni(null);}} className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Close</button>{isTeacher && <button onClick={()=>{setEditingAlumni(viewingAlumni); setNewAlumni({...viewingAlumni}); setShowViewModal(false); setShowEditModal(true);}} className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">Edit Profile</button>}</div>
            </div>
          </div>
        </div>
      )}

      {/* Add Alumni Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full p-8 relative max-h-[90vh] overflow-y-auto">
            <div className="border-b border-gray-200 pb-4 mb-6"><h3 className="text-2xl font-semibold text-gray-900">Add New Alumni</h3><p className="mt-1 text-sm text-gray-500">Enter the details for the new alumni member</p></div>
            <form onSubmit={handleAddAlumni} className="space-y-6">
              <div className="flex items-start space-x-6">
                <div className="shrink-0"><div className="relative"><img src={newAlumni.profileImage || `https://ui-avatars.com/api/?name=${newAlumni.firstName}+${newAlumni.lastName}&background=random`} alt="Profile Preview" className="h-32 w-32 rounded-full object-cover border-4 border-white shadow-lg" /><label htmlFor="profile-upload-add" className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-2 cursor-pointer hover:bg-blue-700 transition-colors shadow-lg"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" /></svg></label><input id="profile-upload-add" type="file" name="profileImage" accept="image/*" onChange={handleInputChange} className="hidden" /></div></div>
                <div className="flex-1 grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">First Name</label><input type="text" name="firstName" value={newAlumni.firstName} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2.5 text-sm rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" required /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label><input type="text" name="lastName" value={newAlumni.lastName} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2.5 text-sm rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" required /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" name="email" value={newAlumni.email} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2.5 text-sm rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" required /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label><input type="text" name="contactNumber" value={newAlumni.contactNumber} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2.5 text-sm rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Course</label><input type="text" name="course" value={newAlumni.course} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2.5 text-sm rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" required /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Graduation Year</label><input type="number" name="graduationYear" value={newAlumni.graduationYear} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2.5 text-sm rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="YYYY" required /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Level</label><select name="level" value={newAlumni.level} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2.5 text-sm rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"><option value="">Select level</option><option value="COLLEGE">College</option><option value="HIGH_SCHOOL">High School</option><option value="SENIOR_HIGH_SCHOOL">Senior High School</option></select></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Batch</label><input type="number" name="batch" value={newAlumni.batch} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2.5 text-sm rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="e.g. 2015" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Current Position</label><input type="text" name="currentPosition" value={newAlumni.currentPosition} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2.5 text-sm rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Company</label><input type="text" name="company" value={newAlumni.company} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2.5 text-sm rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Location</label><input type="text" name="location" value={newAlumni.location} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2.5 text-sm rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" /></div>
                  <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Skills</label><textarea name="skills" value={newAlumni.skills} onChange={handleInputChange} rows="3" className="mt-1 block w-full px-3 py-2.5 text-sm rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none" placeholder="Comma-separated skills" /></div>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3"><button type="button" onClick={()=>setShowAddModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button><button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">Add Alumni</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Alumni Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-4 z-10">
              <h3 className="text-2xl font-semibold text-gray-900">Edit Alumni Profile</h3>
              <p className="mt-1 text-sm text-gray-500">Update the information for this alumni member</p>
            </div>
            <form onSubmit={handleEditAlumni} className="p-8 space-y-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 bg-gray-50 rounded-lg p-6 relative">
                <div className="shrink-0"><div className="relative group"><img src={newAlumni.profileImage || `https://ui-avatars.com/api/?name=${newAlumni.firstName}+${newAlumni.lastName}&background=random`} alt="Profile Preview" className="h-28 w-28 rounded-full object-cover border-4 border-white shadow-lg" /><label htmlFor="profile-upload" className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-3 cursor-pointer hover:bg-blue-700 transition-all shadow-lg z-[1]" title="Change profile picture"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-white"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" /></svg></label><input id="profile-upload" type="file" name="profileImage" accept="image/*" onChange={handleInputChange} className="hidden" /></div></div>
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">First Name</label><input type="text" name="firstName" value={newAlumni.firstName} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2.5 text-sm rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" required /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label><input type="text" name="lastName" value={newAlumni.lastName} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2.5 text-sm rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" required /></div>
                  <div className="sm:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" name="email" value={newAlumni.email} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2.5 text-sm rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" required /></div>
                  <div className="sm:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label><input type="text" name="contactNumber" value={newAlumni.contactNumber || ''} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2.5 text-sm rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" /></div>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <h4 className="text-lg font-medium text-gray-900">Academic Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Course</label><input type="text" name="course" value={newAlumni.course} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2.5 text-sm rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" required /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Graduation Year</label><input type="number" name="graduationYear" value={newAlumni.graduationYear} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2.5 text-sm rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="YYYY" required /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Level</label><select name="level" value={newAlumni.level || ''} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2.5 text-sm rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"><option value="">Select level</option><option value="COLLEGE">College</option><option value="HIGH_SCHOOL">High School</option><option value="SENIOR_HIGH_SCHOOL">Senior High School</option></select></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Batch</label><input type="number" name="batch" value={newAlumni.batch || ''} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2.5 text-sm rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="e.g. 2015" /></div>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <h4 className="text-lg font-medium text-gray-900">Professional Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Current Position</label><input type="text" name="currentPosition" value={newAlumni.currentPosition} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2.5 text-sm rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Company</label><input type="text" name="company" value={newAlumni.company} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2.5 text-sm rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Location</label><input type="text" name="location" value={newAlumni.location || ''} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2.5 text-sm rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" /></div>
                  <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Skills</label><textarea name="skills" value={newAlumni.skills || ''} onChange={handleInputChange} rows="3" className="mt-1 block w-full px-3 py-2.5 text-sm rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none" placeholder="Comma-separated skills" /></div>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3"><button type="button" onClick={()=>{setShowEditModal(false); setEditingAlumni(null); setNewAlumni(blankAlumni);}} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button><button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">Save Changes</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Achievement Modal */}
      {showAchievementModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-3 sm:p-4 z-[60]">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-5 sm:p-8 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4 sm:mb-6">Add Achievement</h3>
            <form onSubmit={handleAddAchievement} className="space-y-4 sm:space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                <input 
                  type="text" 
                  value={newAchievement.title} 
                  onChange={e=>setNewAchievement(s=>({...s,title:e.target.value}))} 
                  className="mt-1 block w-full px-4 py-3 text-sm rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors" 
                  placeholder="Enter achievement title"
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea 
                  value={newAchievement.description} 
                  onChange={e=>setNewAchievement(s=>({...s,description:e.target.value}))} 
                  rows="4" 
                  className="mt-1 block w-full px-4 py-3 text-sm rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors resize-none" 
                  placeholder="Describe the achievement..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                <input 
                  type="date" 
                  value={newAchievement.date} 
                  onChange={e=>setNewAchievement(s=>({...s,date:e.target.value}))} 
                  className="mt-1 block w-full px-4 py-3 text-sm rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors" 
                />
              </div>
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 mt-6 sm:mt-8 pt-4 border-t border-gray-200">
                <button type="button" onClick={()=>setShowAchievementModal(false)} className="w-full sm:w-auto px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" className="w-full sm:w-auto px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">Add Achievement</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Career Modal */}
      {showCareerModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-3 sm:p-4 z-[60]">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-5 sm:p-8 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4 sm:mb-6">Add Employment Record</h3>
            <form onSubmit={handleAddCareer} className="space-y-4 sm:space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Job Title *</label>
                  <input 
                    type="text" 
                    value={newCareer.job_title} 
                    onChange={e=>setNewCareer(s=>({...s,job_title:e.target.value}))} 
                    className="mt-1 block w-full px-4 py-3 text-sm rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors" 
                    placeholder="e.g., Senior Software Engineer"
                    required 
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Company *</label>
                  <input 
                    type="text" 
                    value={newCareer.company} 
                    onChange={e=>setNewCareer(s=>({...s,company:e.target.value}))} 
                    className="mt-1 block w-full px-4 py-3 text-sm rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors" 
                    placeholder="Company name"
                    required 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                  <input 
                    type="date" 
                    value={newCareer.start_date} 
                    onChange={e=>setNewCareer(s=>({...s,start_date:e.target.value}))} 
                    className="mt-1 block w-full px-4 py-3 text-sm rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                  <input 
                    type="date" 
                    value={newCareer.end_date} 
                    onChange={e=>setNewCareer(s=>({...s,end_date:e.target.value}))} 
                    disabled={newCareer.is_current} 
                    className="mt-1 block w-full px-4 py-3 text-sm rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed" 
                  />
                </div>
                <div className="sm:col-span-2">
                  <div className="flex items-center bg-blue-50 rounded-lg px-4 py-3 border border-blue-200">
                    <input 
                      type="checkbox" 
                      checked={newCareer.is_current} 
                      onChange={e=>setNewCareer(s=>({...s,is_current:e.target.checked,end_date:e.target.checked? '' : s.end_date}))} 
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" 
                    />
                    <label className="ml-3 block text-sm font-medium text-gray-700">I currently work here</label>
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea 
                    value={newCareer.description} 
                    onChange={e=>setNewCareer(s=>({...s,description:e.target.value}))} 
                    rows="4" 
                    className="mt-1 block w-full px-4 py-3 text-sm rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors resize-none" 
                    placeholder="Describe your responsibilities and achievements..."
                  />
                </div>
              </div>
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 mt-6 sm:mt-8 pt-4 border-t border-gray-200">
                <button type="button" onClick={()=>setShowCareerModal(false)} className="w-full sm:w-auto px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" className="w-full sm:w-auto px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">Add Employment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Donation Modal */}
      {showDonationModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-3 sm:p-4 z-[60]">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-5 sm:p-8 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4 sm:mb-6">Add Donation</h3>
            <form onSubmit={handleAddDonation} className="space-y-4 sm:space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount (PHP) *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₱</span>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={newDonation.amount} 
                    onChange={e=>setNewDonation(s=>({...s,amount:e.target.value}))} 
                    className="mt-1 block w-full pl-8 pr-4 py-3 text-sm rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors" 
                    placeholder="0.00"
                    required 
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Purpose</label>
                <input 
                  type="text" 
                  value={newDonation.purpose} 
                  onChange={e=>setNewDonation(s=>({...s,purpose:e.target.value}))} 
                  className="mt-1 block w-full px-4 py-3 text-sm rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors" 
                  placeholder="e.g., Scholarship Fund, Building Renovation"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                <input 
                  type="date" 
                  value={newDonation.date} 
                  onChange={e=>setNewDonation(s=>({...s,date:e.target.value}))} 
                  className="mt-1 block w-full px-4 py-3 text-sm rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors" 
                />
              </div>
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 mt-6 sm:mt-8 pt-4 border-t border-gray-200">
                <button type="button" onClick={()=>setShowDonationModal(false)} className="w-full sm:w-auto px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" className="w-full sm:w-auto px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">Add Donation</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Officers Modal */}
      {showOfficersModal && selectedBatch && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-purple-50 to-blue-50">
              <div>
                <h3 className="text-xl font-bold text-gray-900 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 mr-2 text-purple-600">
                    <path d="M4.5 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM14.25 8.625a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0zM1.5 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63l-.001-.122zM17.25 19.128l-.001.144a2.25 2.25 0 01-.233.96 10.088 10.088 0 005.06-1.01.75.75 0 00.42-.643 4.875 4.875 0 00-6.957-4.611 8.586 8.586 0 011.71 5.157v.003z" />
                  </svg>
                  Batch {selectedBatch} Officers
                </h3>
                <p className="text-sm text-gray-600 mt-1">{batchOfficers.length} officer{batchOfficers.length !== 1 ? 's' : ''} serving the batch</p>
              </div>
              <div className="flex items-center gap-2">
                {isTeacher && (
                  <button
                    onClick={openAssignOfficerModal}
                    className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
                    </svg>
                    Assign Officer
                  </button>
                )}
                <button
                  onClick={() => setShowOfficersModal(false)}
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-2 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {batchOfficers.length === 0 ? (
                <div className="text-center py-12">
                  <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="mt-4 text-gray-500">No officers assigned for this batch yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {batchOfficers.map((officer) => (
                    <div 
                      key={officer.id} 
                      className="bg-gradient-to-br from-white to-gray-50 rounded-lg border border-gray-200 p-5 hover:shadow-lg transition-all duration-200 hover:border-purple-300"
                    >
                      <div className="flex items-start gap-4">
                        <img 
                          src={officer.alumni.profile_image ? `http://localhost:5001${officer.alumni.profile_image}` : `https://ui-avatars.com/api/?name=${officer.alumni.first_name}+${officer.alumni.last_name}&background=random`}
                          alt={`${officer.alumni.first_name} ${officer.alumni.last_name}`}
                          className="w-16 h-16 rounded-full object-cover border-2 border-purple-200 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="text-base font-bold text-gray-900 truncate">
                                {officer.alumni.first_name} {officer.alumni.last_name}
                              </h4>
                              <p className="text-xs text-gray-500 truncate">{officer.alumni.email}</p>
                            </div>
                          </div>
                          <div className="mt-2">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                              {officer.position}
                            </span>
                          </div>
                          {officer.alumni.course && (
                            <p className="text-xs text-gray-600 mt-2 truncate">{officer.alumni.course}</p>
                          )}
                          {(officer.alumni.current_position || officer.alumni.company) && (
                            <p className="text-xs text-gray-500 mt-1 truncate">
                              {officer.alumni.current_position}
                              {officer.alumni.company && ` at ${officer.alumni.company}`}
                            </p>
                          )}
                          {isTeacher && (
                            <button
                              onClick={() => handleRemoveOfficer(officer.id)}
                              className="mt-3 text-xs text-red-600 hover:text-red-800 font-medium flex items-center gap-1"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                              Remove Officer
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowOfficersModal(false)}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[240px]">
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none"><svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg></div>
              <input type="text" placeholder="Search by name, course, email, company, or date..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} autoComplete="off" spellCheck={false} className="w-full pl-10 pr-4 py-2.5 rounded-lg border-0 text-sm bg-white placeholder-gray-400 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-500 shadow-sm" />
              <div className="pointer-events-none absolute inset-x-2 bottom-0 h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-48 min-w-[10rem]">
              <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 14l9-5-9-5-9 5 9 5z" /></svg></div>
              <select value={selectedLevel} onChange={e=>setSelectedLevel(e.target.value)} className={`appearance-none w-full pl-10 pr-10 py-2.5 rounded-lg border-0 bg-white ring-1 ring-inset shadow-sm text-sm transition ${selectedLevel? 'ring-blue-300 text-gray-900':'ring-gray-300 text-gray-700'} focus:ring-2 focus:ring-blue-500`}>
                {levelOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg></div>
            </div>
            <div className="relative w-40 min-w-[9rem]">
              <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 6v6l4 2" /></svg></div>
              <select value={selectedBatch} onChange={e=>setSelectedBatch(e.target.value)} className={`appearance-none w-full pl-10 pr-10 py-2.5 rounded-lg border-0 bg-white ring-1 ring-inset shadow-sm text-sm transition ${selectedBatch? 'ring-blue-300 text-gray-900':'ring-gray-300 text-gray-700'} focus:ring-2 focus:ring-blue-500`}>
                <option value="">All Batches</option>
                {batches.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg></div>
            </div>
            <div className="relative w-56 min-w-[12rem]">
              <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M16 11c1.657 0 3-1.567 3-3.5S17.657 4 16 4s-3 1.567-3 3.5 1.343 3.5 3 3.5zM8 11c1.657 0 3-1.567 3-3.5S9.657 4 8 4 5 5.567 5 7.5 6.343 11 8 11zm0 2c-2.21 0-6 1.12-6 3.333V18a2 2 0 002 2h8.05a5.97 5.97 0 01-.55-2.5c0-1.39.47-2.67 1.26-3.695C10.987 13.22 9.263 13 8 13zm8 0c-2.21 0-6 1.12-6 3.333V18a2 2 0 002 2h8a2 2 0 002-2v-1.667C22 14.12 18.21 13 16 13z" /></svg></div>
              <select value={selectedGroup} onChange={e=>setSelectedGroup(e.target.value)} className={`appearance-none w-full pl-10 pr-10 py-2.5 rounded-lg border-0 bg-white ring-1 ring-inset shadow-sm text-sm transition ${selectedGroup? 'ring-blue-300 text-gray-900':'ring-gray-300 text-gray-700'} focus:ring-2 focus:ring-blue-500`}>
                <option value="">All Groups</option>
                {groups.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg></div>
            </div>
            {selectedGroup && <button type="button" onClick={()=>setSelectedGroup('')} className="inline-flex items-center px-2.5 py-2 rounded-md text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100">Clear</button>}
          </div>
          <div className="ml-auto flex items-center gap-2 mt-2 sm:mt-0">
            {selectedBatch && batchOfficers.length > 0 && (
              <button 
                type="button" 
                onClick={()=>setShowOfficersModal(true)} 
                className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200 hover:bg-purple-100"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 mr-1.5">
                  <path d="M4.5 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM14.25 8.625a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0zM1.5 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63l-.001-.122zM17.25 19.128l-.001.144a2.25 2.25 0 01-.233.96 10.088 10.088 0 005.06-1.01.75.75 0 00.42-.643 4.875 4.875 0 00-6.957-4.611 8.586 8.586 0 011.71 5.157v.003z" />
                </svg>
                Batch {selectedBatch} Officers ({batchOfficers.length})
              </button>
            )}
            {isTeacher && (
              <button type="button" onClick={generateCsv} className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium text-green-700 bg-green-50 border border-green-200 hover:bg-green-100">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 mr-1.5"><path d="M12 16v-4m0 0V8m0 4h4m-4 0H8M5 20h14a2 2 0 002-2V8.828a2 2 0 00-.586-1.414l-4.828-4.828A2 2 0 0014.172 2H5a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                Generate List (CSV)
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <TableHeader label="Profile" field="firstName" sortOrder={sortOrder} onSort={handleSort} />
              <TableHeader label="Course" field="course" sortOrder={sortOrder} onSort={handleSort} />
              <TableHeader label="Email Address" field="email" sortOrder={sortOrder} onSort={handleSort} />
              <TableHeader label="Level" field="level" sortOrder={sortOrder} onSort={handleSort} />
              <TableHeader label="Batch" field="batch" sortOrder={sortOrder} onSort={handleSort} />
              <TableHeader label="Date" field="graduationYear" sortOrder={sortOrder} onSort={handleSort} />
              {isTeacher && (
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {loading && (
              <tr><td colSpan={colCount} className="px-4 py-6 text-center text-sm text-gray-500">Loading...</td></tr>
            )}
            {error && !loading && (
              <tr><td colSpan={colCount} className="px-4 py-6 text-center text-sm text-red-600">{error}</td></tr>
            )}
            {!loading && !error && filteredAlumni.length === 0 && (
              <tr><td colSpan={colCount} className="px-4 py-6 text-center text-sm text-gray-500">No alumni found.</td></tr>
            )}
            {paginatedAlumni.map(a => (
              <tr key={a.id} className="hover:bg-gray-50 hover:shadow-[inset_0_0_0_2000px_rgba(0,0,0,0.03)] cursor-pointer transition-all duration-150" onClick={()=>openViewModal(a)}>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <img src={a.profileImage || `https://ui-avatars.com/api/?name=${a.firstName}+${a.lastName}&background=random`} alt={a.firstName} className="h-10 w-10 rounded-full object-cover mr-3 border" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">{a.firstName} {a.lastName}</div>
                      <div className="text-xs text-gray-500">{a.currentPosition || a.company ? `${a.currentPosition || ''}${a.company ? '  ' + a.company : ''}` : a.course}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 text-sm text-gray-700">{a.course || ''}</td>
                <td className="px-4 py-4 text-sm text-gray-700">{a.email || ''}</td>
                <td className="px-4 py-4 text-sm text-gray-700">{a.level === 'COLLEGE' ? 'College' : a.level === 'HIGH_SCHOOL' ? 'High School' : a.level === 'SENIOR_HIGH_SCHOOL' ? 'Senior HS' : ''}</td>
                <td className="px-4 py-4 text-sm text-gray-700">{a.batch || ''}</td>
                <td className="px-4 py-4 text-sm text-gray-700">{a.graduationYear || ''}</td>
                {isTeacher && (
                  <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e)=>{e.stopPropagation(); setEditingAlumni(a); setNewAlumni({ ...a, profileImageFile: null }); setShowEditModal(true);}}
                        className="px-3 py-1.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                        title="Edit"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={(e)=>{
                          e.stopPropagation();
                          setConfirmModal({
                            isOpen: true,
                            title: 'Delete Alumni',
                            message: 'This will permanently delete this alumni record.',
                            type: 'danger',
                            onConfirm: async () => {
                              try {
                                await alumniService.deleteAlumni(a.id);
                                setAlumni(prev => prev.filter(x => x.id !== a.id));
                              } catch (err) {
                                alert(err.message || 'Failed to delete alumni');
                              } finally {
                                setConfirmModal(m => ({ ...m, isOpen: false }));
                              }
                            }
                          });
                        }}
                        className="px-3 py-1.5 rounded-md bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                        title="Delete"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && !error && filteredAlumni.length > 0 && (
        <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 bg-white">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredAlumni.length)}</span> of{' '}
                <span className="font-medium">{filteredAlumni.length}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Previous</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                      currentPage === page
                        ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Next</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Assign Officer Modal */}
      {showAssignOfficerModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
              <h3 className="text-xl font-bold text-gray-900 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-purple-600" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
                </svg>
                Assign Officer
              </h3>
            </div>
            
            <form onSubmit={handleAssignOfficer} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Batch <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={officerForm.batch}
                    onChange={(e) => setOfficerForm({ ...officerForm, batch: e.target.value })}
                    className="w-full px-4 py-3 text-sm rounded-lg border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-colors"
                    placeholder="e.g., 2015"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alumni <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={officerForm.alumni_id}
                    onChange={(e) => setOfficerForm({ ...officerForm, alumni_id: e.target.value })}
                    className="w-full px-4 py-3 text-sm rounded-lg border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-colors"
                    required
                  >
                    <option value="">Select an alumni</option>
                    {alumni
                      .filter(a => !officerForm.batch || a.batch === parseInt(officerForm.batch))
                      .map(a => (
                        <option key={a.id} value={a.id}>
                          {a.firstName} {a.lastName} - Batch {a.batch}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Position <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={officerForm.position}
                    onChange={(e) => setOfficerForm({ ...officerForm, position: e.target.value })}
                    className="w-full px-4 py-3 text-sm rounded-lg border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-colors"
                    required
                  >
                    <option value="">Select a position</option>
                    {['President', 'Vice President', 'Secretary', 'Treasurer', 'Auditor', 'Public Relations Officer', 'Business Manager']
                      .filter(position => !batchOfficers.some(officer => officer.position === position))
                      .map(position => (
                        <option key={position} value={position}>{position}</option>
                      ))}
                  </select>
                  {batchOfficers.length >= 7 && (
                    <p className="text-xs text-amber-600 mt-1">All positions for this batch are filled.</p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowAssignOfficerModal(false)}
                  className="flex-1 px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-5 py-2.5 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
                >
                  Assign Officer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlumniDirectory;

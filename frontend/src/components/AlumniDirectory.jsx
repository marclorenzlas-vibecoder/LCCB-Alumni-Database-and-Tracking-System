import React, { useState, useEffect, useMemo, useRef } from 'react';
import { toast } from 'react-toastify';
import alumniService from '../services/alumniService';
import achievementService from '../services/achievementService';
import careerService from '../services/careerService';
import { realtimeClient } from '../services/realtimeClient';
import officerService from '../services/officerService';
import { authService } from '../services/authService';
import ConfirmModal from './ConfirmModal';
import FilterMenu from './FilterMenu';
import UserLayout from './UserLayout';
import AlumniChatPanel from './AlumniChatPanel';
import { IMAGE_BASE_URL } from '../config/apiBaseUrl';
import { groupSectionDefinitions, levelOptions as sharedLevelOptions } from '../config/groupSections';
import { getAlumniChatUserId, listenToUserStatuses } from '../services/firebaseChatService';

// Helper function to get display label for level
const getLevelLabel = (level) => {
  const option = sharedLevelOptions.find(opt => opt.value === level);
  return option ? option.label : 'Not provided';
};

const createEducationEntry = (entry = {}) => ({
  level: entry.level || '',
  batch: entry.batch ?? ''
});

const DEFAULT_BATCH_OPTIONS = Array.from({ length: 60 }, (_, index) => String(new Date().getFullYear() - index));

const getGroupLabel = (value) => {
  if (!value) return 'All Program';

  for (const section of registerCourseSections) {
    const item = section.items.find((entry) => entry.value === value);
    if (item) return item.label;
  }

  return value;
};

const getCourseLabel = (value) => {
  if (!value) return 'Select course';

  for (const section of registerCourseSections) {
    const item = section.items.find((entry) => entry.value === value);
    if (item) return item.label;
  }

  return value;
};

const renderCourseOptions = (selectedLevel, currentCourse = '') => {
  const groupedSections = selectedLevel
    ? registerCourseSections.filter((section) => section.key === selectedLevel)
    : registerCourseSections;

  const hasCurrentCourse = currentCourse && groupedSections.some((section) => section.items.some((item) => item.value === currentCourse));
  const fallbackCourse = !hasCurrentCourse && currentCourse
    ? [{ value: currentCourse, label: currentCourse, isFallback: true }]
    : [];

  return (
    <>
      <option value="">Select course</option>
      {fallbackCourse.length > 0 && (
        <option value={fallbackCourse[0].value}>{fallbackCourse[0].label}</option>
      )}
      {groupedSections.map((section) => (
        <optgroup key={section.key} label={section.title}>
          {section.items.map((item) => (
            <option key={item.value} value={item.value}>{item.label}</option>
          ))}
        </optgroup>
      ))}
    </>
  );
};

const getPersonName = (person) => {
  const firstName = person?.first_name || person?.firstName || '';
  const lastName = person?.last_name || person?.lastName || '';
  return `${firstName} ${lastName}`.trim() || 'Unknown Name';
};

const getInitialAvatarSrc = (firstName, lastName, size = 160) => {
  const fullName = `${firstName || ''} ${lastName || ''}`.trim() || 'Alumni';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=2563eb&color=ffffff&size=${size}`;
};

const handleProfileImageError = (event, firstName, lastName, size = 160) => {
  const fallbackSrc = getInitialAvatarSrc(firstName, lastName, size);
  if (event.currentTarget.src !== fallbackSrc) {
    event.currentTarget.src = fallbackSrc;
  }
};

const getOfficerImageSrc = (alumni) => {
  const imagePath = alumni?.profile_image || alumni?.profileImage || alumni?.profile_picture || alumni?.photo;

  if (imagePath) {
    if (/^https?:\/\//i.test(imagePath)) {
      return imagePath;
    }

    return `${IMAGE_BASE_URL}${imagePath}`;
  }

  const name = encodeURIComponent(getPersonName(alumni));
  return `https://ui-avatars.com/api/?name=${name}&background=2563eb&color=ffffff&size=160`;
};

const formatBirthday = (dateStr, includeYear = false) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const opts = includeYear ? { month: 'long', day: 'numeric', year: 'numeric' } : { month: 'long', day: 'numeric' };
  try {
    return d.toLocaleDateString(undefined, opts);
  } catch (e) {
    return null;
  }
};

const buildRegisterCourseSections = (selectedLevel = '') => groupSectionDefinitions
  .map((section) => {
    let items = section.items;
    if (selectedLevel === 'INTEGRATED_SCHOOL' && section.key === 'INTEGRATED_SCHOOL') {
      items = section.items.filter((item) => item.value !== 'Night High');
    } else if (selectedLevel === 'NIGHT_HIGH' && section.key === 'INTEGRATED_SCHOOL') {
      items = section.items.filter((item) => item.value === 'Night High');
    } else if (selectedLevel && section.key !== selectedLevel) {
      items = [];
    }

    if (section.key !== 'SENIOR_HIGH') {
      return { ...section, items };
    }

    return {
      ...section,
      items: items.map((item) => {
        const { description, ...rest } = item;
        return rest;
      })
    };
  })
  .filter((section) => section.items.length > 0);

const registerCourseSections = buildRegisterCourseSections();

const PROGRAM_ALIGNMENT_OPTIONS = [
  { value: '', label: 'Auto-check' },
  { value: 'ALIGNED', label: 'Related' },
  { value: 'NOT_ALIGNED', label: 'Not Related' },
  { value: 'NEEDS_REVIEW', label: 'Needs Checking' }
];

const getProgramAlignmentLabel = (value) => (
  PROGRAM_ALIGNMENT_OPTIONS.find((option) => option.value === value)?.label || 'Needs Checking'
);

const getProgramAlignmentClass = (value) => {
  if (value === 'ALIGNED') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (value === 'NOT_ALIGNED') return 'bg-rose-50 text-rose-700 border-rose-200';
  return 'bg-amber-50 text-amber-700 border-amber-200';
};

const AlumniDirectory = () => {
  // Role
  const isTeacher = authService.isTeacher();
  const currentUser = useMemo(() => authService.getCurrentUser(), []);
  const privateLabel = 'Hidden by User';
  const fieldIsPublic = (record, camelKey, snakeKey) => isTeacher || (record?.[camelKey] ?? record?.[snakeKey] ?? true) !== false;
  const canViewEmploymentHistory = (record) => (
    (record?.isEmploymentPublic ?? record?.is_employment_public ?? false) !== false
  );
  const visibleOrPrivate = (record, value, camelKey, snakeKey, fallback = 'Not specified') => {
    if (!fieldIsPublic(record, camelKey, snakeKey)) return privateLabel;
    return value || fallback;
  };

  // Core data
  const [alumni, setAlumni] = useState([]);
  const [userStatuses, setUserStatuses] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filters / search / sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(''); // Placeholder for future grouping logic
  const [sortOrder] = useState({ field: 'id', direction: 'desc' });
  const [showLevelMenu, setShowLevelMenu] = useState(false);
  const [showBatchMenu, setShowBatchMenu] = useState(false);
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [showAddLevelMenu, setShowAddLevelMenu] = useState(false);
  const [showAddCourseMenu, setShowAddCourseMenu] = useState(false);
  const levelMenuRef = useRef(null);
  const batchMenuRef = useRef(null);
  const groupMenuRef = useRef(null);
  const addLevelMenuRef = useRef(null);
  const addCourseMenuRef = useRef(null);

  // Viewing / editing / adding
  const [showViewModal, setShowViewModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [viewingAlumni, setViewingAlumni] = useState(null);
  const [editingAlumni, setEditingAlumni] = useState(null);

  // Related record modals
  const [showAchievementModal, setShowAchievementModal] = useState(false);
  const [showCareerModal, setShowCareerModal] = useState(false);

  // Related records data
  const [achievements, setAchievements] = useState([]);
  const [careers, setCareers] = useState([]);

  // Batch officers
  const [batchOfficers, setBatchOfficers] = useState([]);
  const [showOfficersModal, setShowOfficersModal] = useState(false);
  const [showAssignOfficerModal, setShowAssignOfficerModal] = useState(false);
  const [officerForm, setOfficerForm] = useState({ alumni_id: '', position: '', batch: '' });

  // New record states
  const [newAchievement, setNewAchievement] = useState({ title: '', description: '', date: '' });
  const [newCareer, setNewCareer] = useState({
    job_title: '',
    company: '',
    start_date: '',
    end_date: '',
    is_current: false,
    program_alignment: '',
    alignment_notes: '',
    description: ''
  });

  // Confirm modal
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: () => { }, type: 'danger' });

  // Alumni form state (used for both add & edit)
  const blankAlumni = {
    firstName: '',
    lastName: '',
    graduationYear: '',
    dateOfBirth: '',
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
    profileImageFile: null,
    educationHistory: []
  };
  const [newAlumni, setNewAlumni] = useState(blankAlumni);
  const [educationHistory, setEducationHistory] = useState([createEducationEntry()]);

  const filterCourseSections = useMemo(() => buildRegisterCourseSections(selectedLevel), [selectedLevel]);

  // Education history helpers
  const handleEducationHistoryChange = (index, field, value) => {
    setEducationHistory((prev) => prev.map((entry, i) => {
      if (i !== index) return entry;
      return { ...entry, [field]: value };
    }));
  };
  const addEducationHistoryEntry = () => setEducationHistory((prev) => [...prev, createEducationEntry()]);
  const removeEducationHistoryEntry = (index) => {
    setEducationHistory((prev) => {
      if (prev.length <= 1) return [createEducationEntry()];
      return prev.filter((_, i) => i !== index);
    });
  };

  // Fetch alumni list
  const fetchAlumni = async () => {
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

  useEffect(() => {
    fetchAlumni();
  }, []);

  const statusUserIdKey = useMemo(() => {
    const ids = new Set();
    alumni.forEach((entry) => {
      const userId = getAlumniChatUserId(entry);
      if (userId) ids.add(userId);
    });
    return Array.from(ids).join('|');
  }, [alumni]);

  useEffect(() => {
    const ids = statusUserIdKey ? statusUserIdKey.split('|') : [];
    return listenToUserStatuses(ids, setUserStatuses);
  }, [statusUserIdKey]);

  // Re-fetch when profile or alumni data changes via realtime events
  useEffect(() => {
    const unsubProfile = realtimeClient.subscribe('profile.updated', () => {
      fetchAlumni();
    });
    const unsubAlumni = realtimeClient.subscribe('alumni.updated', () => {
      fetchAlumni();
    });
    const unsubCreated = realtimeClient.subscribe('alumni.created', () => {
      fetchAlumni();
    });
    const unsubDeleted = realtimeClient.subscribe('alumni.deleted', () => {
      fetchAlumni();
    });
    return () => {
      unsubProfile();
      unsubAlumni();
      unsubCreated();
      unsubDeleted();
    };
  }, []);

  const baseFilteredAlumni = useMemo(() => {
    let data = [...alumni];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      data = data.filter((a) =>
        [a.firstName, a.lastName, a.course, a.email, a.company, a.location, a.graduationYear?.toString()].some(
          (v) => v && v.toLowerCase().includes(term)
        )
      );
    }

    if (selectedLevel) {
      data = data.filter((a) => a.level === selectedLevel);
    }

    if (selectedGroup) {
      data = data.filter((a) => a.course === selectedGroup);
    }

    return data;
  }, [alumni, searchTerm, selectedLevel, selectedGroup]);

  // Derived batches from currently matching alumni only
  const batches = useMemo(() => {
    const set = new Set();
    baseFilteredAlumni.forEach((item) => {
      const batchValue = item.batch;
      if (batchValue !== null && batchValue !== undefined && batchValue !== '') {
        set.add(String(batchValue));
      }
    });
    return Array.from(set).sort((a, b) => Number(a) - Number(b));
  }, [baseFilteredAlumni]);

  useEffect(() => {
    if (selectedBatch && !batches.includes(String(selectedBatch))) {
      setSelectedBatch('');
    }
  }, [selectedBatch, batches]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      const clickInsideLevel = levelMenuRef.current && levelMenuRef.current.contains(event.target);
      const clickInsideBatch = batchMenuRef.current && batchMenuRef.current.contains(event.target);
      const clickInsideGroup = groupMenuRef.current && groupMenuRef.current.contains(event.target);
      const clickInsideAddLevel = addLevelMenuRef.current && addLevelMenuRef.current.contains(event.target);
      const clickInsideAddCourse = addCourseMenuRef.current && addCourseMenuRef.current.contains(event.target);

      if (!clickInsideLevel) setShowLevelMenu(false);
      if (!clickInsideBatch) setShowBatchMenu(false);
      if (!clickInsideGroup) setShowGroupMenu(false);
      if (!clickInsideAddLevel) setShowAddLevelMenu(false);
      if (!clickInsideAddCourse) setShowAddCourseMenu(false);
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setShowLevelMenu(false);
        setShowBatchMenu(false);
        setShowGroupMenu(false);
        setShowAddLevelMenu(false);
        setShowAddCourseMenu(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);



  // Filter + search + sort
  const filteredAlumni = useMemo(() => {
    let data = [...baseFilteredAlumni];

    // Batch filter
    if (selectedBatch) data = data.filter((a) => String(a.batch) === String(selectedBatch));

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
  }, [baseFilteredAlumni, selectedBatch, sortOrder]);

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
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await officerService.assignOfficer(officerForm);
      toast.success('Officer assigned successfully!');
      setShowAssignOfficerModal(false);

      // Reload officers
      if (selectedBatch) {
        const officers = await officerService.getOfficersByBatch(selectedBatch);
        setBatchOfficers(officers);
      }
    } catch (error) {
      console.error('Error assigning officer:', error);

      // Check if it's an authentication error
      if (error.response?.status === 401 || error.response?.status === 403) {
        const errorMsg = error.response?.data?.error || '';
        if (errorMsg.includes('expired') || errorMsg.includes('Invalid')) {
          toast.error('Your session has expired. Please log in again to continue.');
          window.location.href = '/';
        } else {
          toast.error('Access denied. You need teacher privileges to perform this action.');
        }
      } else {
        toast.error(error.response?.data?.message || 'Failed to assign officer');
      }
    }
  };

  // Handle officer removal
  const handleRemoveOfficer = async (officerId) => {
    // Confirmation handled by ConfirmModal
    try {
      await officerService.removeOfficer(officerId);
      toast.success('Officer removed successfully!');
      // Reload officers
      if (selectedBatch) {
        const officers = await officerService.getOfficersByBatch(selectedBatch);
        setBatchOfficers(officers);
      }
    } catch (error) {
      console.error('Error removing officer:', error);

      // Check if it's an authentication error
      if (error.response?.status === 401 || error.response?.status === 403) {
        const errorMsg = error.response?.data?.error || '';
        if (errorMsg.includes('expired') || errorMsg.includes('Invalid')) {
          toast.error('Your session has expired. Please log in again to continue.');
          // Optionally redirect to login
          window.location.href = '/';
        } else {
          toast.error('Access denied. You need teacher privileges to perform this action.');
        }
      } else {
        toast.error('Failed to remove officer. Please try again.');
      }
    }
  };

  // Input change for alumni form
  const handleInputChange = (e) => {
    const { name, value, files } = e.target;
    if (files && files[0]) {
      const file = files[0];
      const previewUrl = URL.createObjectURL(file);
      setNewAlumni(prev => ({ ...prev, profileImageFile: file, profileImage: previewUrl }));
    } else {
      setNewAlumni(prev => ({
        ...prev,
        [name]: value,
        ...(name === 'level' ? { course: '' } : {})
      }));
    }
  };

  const setNewAlumniField = (name, value) => {
    setNewAlumni((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'level' ? { course: '' } : {})
    }));
  };

  // Add alumni
  const handleAddAlumni = async (e) => {
    e.preventDefault();
    try {
      const cleanedHistory = educationHistory
        .filter((entry) => entry.level)
        .map((entry) => ({
          level: entry.level,
          batch: entry.batch ? parseInt(entry.batch, 10) : null
        }));
      const primary = cleanedHistory.length > 0 ? cleanedHistory[cleanedHistory.length - 1] : {};
      const payload = {
        ...newAlumni,
        level: primary.level || newAlumni.level || null,
        batch: primary.batch || newAlumni.batch || null,
        educationHistory: cleanedHistory
      };
      const created = await alumniService.addAlumni(payload);
      setAlumni(prev => [created, ...prev]);
      setShowAddModal(false);
      setNewAlumni(blankAlumni);
      setEducationHistory([createEducationEntry()]);
    } catch (err) {
      toast.error(err.message || 'Failed to add alumni');
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
      toast.error(err.message || 'Failed to update alumni');
    }
  };

  // Open view modal & load related records
  const openViewModal = async (alumnus) => {
    // Set initial data and open modal immediately
    setViewingAlumni(alumnus);
    setAchievements([]);
    setCareers([]);
    setShowViewModal(true);

    try {
      // Fetch fresh normalized alumni data (with profile image URL prepended, social links, etc.)
      const normalized = await alumniService.getAlumniById(alumnus.id);
      if (normalized) {
        setViewingAlumni(normalized);
      }

      const effectiveAlumni = normalized || alumnus;
      const [ach, car] = await Promise.all([
        achievementService.getAchievementsByAlumni(alumnus.id),
        canViewEmploymentHistory(effectiveAlumni)
          ? careerService.getCareersByAlumni(alumnus.id)
          : Promise.resolve([])
      ]);
      setAchievements(ach || []);
      setCareers(car || []);
    } catch (e) {
      console.warn('Failed loading related records:', e.message);
      setAchievements([]);
      setCareers([]);
    }
  };

  // Delete helpers (achievements/careers)
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
          toast.error('Failed to delete achievement');
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
          toast.error('Failed to delete employment record');
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
      const payload = { ...newAchievement, alumni_id: Number(viewingAlumni.id) };
      const created = await achievementService.createAchievement(payload);
      setAchievements(prev => [...prev, created]);
      setShowAchievementModal(false);
      setNewAchievement({ title: '', description: '', date: '' });
    } catch (err) { toast.error('Failed to add achievement'); }
  };
  const handleAddCareer = async (e) => {
    e.preventDefault();
    if (!viewingAlumni) return;
    try {
      const payload = { ...newCareer, alumni_id: Number(viewingAlumni.id) };
      const created = await careerService.createCareer(payload);
      setCareers(prev => [...prev, created]);
      setShowCareerModal(false);
      setNewCareer({
        job_title: '',
        company: '',
        start_date: '',
        end_date: '',
        is_current: false,
        program_alignment: '',
        alignment_notes: '',
        description: ''
      });
    } catch (err) { toast.error('Failed to add employment'); }
  };

  const handleReviewCareerMatch = async (careerId, programAlignment) => {
    try {
      let updated;
      try {
        updated = await careerService.reviewCareerMatch(careerId, {
          program_alignment: programAlignment
        });
      } catch (reviewError) {
        if (reviewError.response?.status !== 404) {
          throw reviewError;
        }
        updated = await careerService.updateCareer(careerId, {
          program_alignment: programAlignment
        });
      }
      setCareers(prev => prev.map(c => (c.id === careerId ? updated : c)));
      toast.success('Employment match updated');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update employment match');
    }
  };
  // CSV export (teacher only)
  const generateCsv = () => {
    const rows = [
      ['First Name', 'Last Name', 'Email', 'Course', 'Level', 'Batch', 'Graduation Year', 'Company', 'Position', 'Location', 'Skills'].join(',')
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
      ].map(v => '"' + (v ?? '').toString().replace(/"/g, '""') + '"').join(','));
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
  const addActionClass = 'inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-800 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-blue-100';
  const hasActiveFilters = selectedLevel || selectedBatch || selectedGroup;
  const clearFiltersButton = hasActiveFilters && (
    <button
      type="button"
      onClick={() => { setSelectedLevel(''); setSelectedBatch(''); setSelectedGroup(''); setSearchTerm(''); }}
      className="inline-flex h-[46px] w-36 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 text-sm font-medium text-red-700 shadow-sm transition hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-200"
    >
      <span className="truncate">Clear Filters</span>
    </button>
  );
  const batchOfficersButton = (
    <button
      type="button"
      onClick={() => {
        if (!selectedBatch) return;
        setShowOfficersModal(true);
      }}
      disabled={!selectedBatch}
      className={`inline-flex h-[46px] w-52 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold shadow-sm transition ${selectedBatch
          ? 'border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-300 hover:bg-blue-100'
          : 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
        }`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M4.5 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM14.25 8.625a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0zM1.5 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63l-.001-.122zM17.25 19.128l-.001.144a2.25 2.25 0 01-.233.96 10.088 10.088 0 005.06-1.01.75.75 0 00.42-.643 4.875 4.875 0 00-6.957-4.611 8.586 8.586 0 011.71 5.157v.003z" />
      </svg>
      <span className="min-w-0 truncate">{selectedBatch ? `Batch ${selectedBatch} Officers (${batchOfficers.length})` : 'Batch Officers'}</span>
    </button>
  );

  return (
    <UserLayout>
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
              className={addActionClass}
            >
              Add New
            </button>
          )}
        </div>

        {/* View Profile Modal */}
        {showViewModal && viewingAlumni && (
          <div className="fixed inset-0 z-[100] bg-gray-50 overflow-y-auto">
            {/* ── Profile Header (no blue background) ── */}
            <div className="relative bg-white" style={{minHeight: '0'}}>
              {/* Top bar */}
              <div className="relative flex items-center justify-between px-5 pt-5 pb-2">
                <button
                  onClick={() => { setShowViewModal(false); setViewingAlumni(null); }}
                  className="inline-flex items-center gap-2 rounded-xl bg-gray-100 border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                  Back to Directory
                </button>
              </div>
              {/* Avatar + Name + Info */}
              <div className="relative px-5 sm:px-8 pt-4 pb-8">
                <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5">
                  <div className="relative flex-shrink-0">
                    <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden shadow-2xl" style={{boxShadow: '0 0 0 4px rgba(255,255,255,0.25), 0 20px 50px rgba(0,0,0,0.08)'}}>
                      <img
                        src={viewingAlumni.profileImage || getInitialAvatarSrc(viewingAlumni.firstName, viewingAlumni.lastName, 200)}
                        onError={(event) => handleProfileImageError(event, viewingAlumni.firstName, viewingAlumni.lastName, 200)}
                        alt={`${viewingAlumni.firstName} ${viewingAlumni.lastName}`}
                        className="w-full h-full object-cover rounded-full"
                      />
                    </div>
                  </div>
                  <div className="text-center sm:text-left flex-1 pb-1">
                    <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">{viewingAlumni.firstName} {viewingAlumni.lastName}</h2>
                    <p className="text-gray-600 text-base sm:text-lg mt-1 font-medium">
                      {fieldIsPublic(viewingAlumni, 'isPositionPublic', 'is_position_public')
                        ? ((viewingAlumni.currentPosition) && fieldIsPublic(viewingAlumni, 'isCompanyPublic', 'is_company_public') && viewingAlumni.company ? `${viewingAlumni.currentPosition} · ${viewingAlumni.company}` : (viewingAlumni.currentPosition) || 'Alumni')
                        : privateLabel}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
                      {viewingAlumni.course && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-100">{viewingAlumni.course}</span>
                      )}
                      {(viewingAlumni.graduation_year || viewingAlumni.graduationYear) && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-100">Class of {viewingAlumni.graduation_year || viewingAlumni.graduationYear}</span>
                      )}
                      {viewingAlumni.batch && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-100">Batch {viewingAlumni.batch}</span>
                      )}
                      {fieldIsPublic(viewingAlumni, 'isLocationPublic', 'is_location_public') && viewingAlumni.location && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-100">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          {viewingAlumni.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t border-gray-200" />
            {/* ── Content below banner ── */}
            <div className="px-4 sm:px-6 py-8">
              <div className="w-full">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                  <div className="rounded-lg border border-transparent bg-transparent p-6 md:col-span-2">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /></svg>Academic Information</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                      {fieldIsPublic(viewingAlumni, 'isStudentIdPublic', 'is_student_id_public') && <div><label className="text-sm font-medium text-gray-500">School ID / Student Number</label><p className="text-gray-900 mt-1 font-mono">{viewingAlumni.student_id || 'Not provided'}</p></div>}
                      {fieldIsPublic(viewingAlumni, 'isCoursePublic', 'is_course_public') && <div><label className="text-sm font-medium text-gray-500">Course</label><p className="text-gray-900 mt-1">{viewingAlumni.course || 'Not provided'}</p></div>}
                      {fieldIsPublic(viewingAlumni, 'isGraduationYearPublic', 'is_graduation_year_public') && <div><label className="text-sm font-medium text-gray-500">Graduation Year</label><p className="text-gray-900 mt-1">{viewingAlumni.graduation_year || viewingAlumni.graduationYear || 'Not provided'}</p></div>}
                    </div>
                    {fieldIsPublic(viewingAlumni, 'isEducationHistoryPublic', 'is_education_history_public') && <div className="pt-6">
                      <h4 className="text-md font-medium text-gray-900 mb-3">Education History</h4>
                      <div className="grid grid-cols-3 gap-3">
                        {viewingAlumni.educationHistory && viewingAlumni.educationHistory.length > 0 ? (
                          viewingAlumni.educationHistory.map((entry, idx) => (
                            <div key={idx} className="rounded-md border border-transparent bg-transparent p-3">
                              <p className="text-sm font-medium text-gray-900">{idx + 1}. {getLevelLabel(entry.level)}</p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {entry.batch && <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-50 text-xs font-semibold text-blue-800 border border-blue-100">Batch: {entry.batch}</span>}
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-gray-500 italic">No education history entries</p>
                        )}
                      </div>
                    </div>}
                  </div>
                  <div className="rounded-lg border border-transparent bg-transparent p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Contact Information
                    </h3>
                    <div className="space-y-3">
                      {isTeacher && (
                        <>
                          <div>
                            <label className="text-sm font-medium text-gray-500">Email</label>
                            <p className="text-gray-900">{(viewingAlumni.user?.email || viewingAlumni.email) || 'Not provided'}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500">Contact Number</label>
                            <p className="text-gray-900">{(viewingAlumni.contact_number || viewingAlumni.contactNumber) || 'Not provided'}</p>
                          </div>
                        </>
                      )}
                      {fieldIsPublic(viewingAlumni, 'isDateOfBirthPublic', 'is_date_of_birth_public') && <div>
                        <label className="text-sm font-medium text-gray-500">Birthday</label>
                        <p className="text-gray-900">{formatBirthday(viewingAlumni.dateOfBirth || viewingAlumni.date_of_birth, isTeacher) || 'Not provided'}</p>
                      </div>}
                      {fieldIsPublic(viewingAlumni, 'isSocialLinksPublic', 'is_social_links_public') && <div>
                        <label className="text-sm font-medium text-gray-500">Social Media</label>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {viewingAlumni.social_link && viewingAlumni.social_link.length > 0 ? (
                            viewingAlumni.social_link.map((link, index) => (
                              <a
                                key={index}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-lg border border-transparent bg-transparent px-3 py-2 transition-colors hover:bg-blue-50/30"
                              >
                                {link.platform === 'Facebook' && (
                                  <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                                )}
                                {link.platform === 'LinkedIn' && (
                                  <svg className="w-5 h-5" fill="#0A66C2" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                                )}
                                {link.platform === 'Twitter' && (
                                  <svg className="w-5 h-5" fill="#1DA1F2" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" /></svg>
                                )}
                                {link.platform === 'Instagram' && (
                                  <svg className="w-5 h-5" fill="url(#instagram-gradient)" viewBox="0 0 24 24"><defs><linearGradient id="instagram-gradient" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" style={{ stopColor: '#FD5949' }} /><stop offset="50%" style={{ stopColor: '#D6249F' }} /><stop offset="100%" style={{ stopColor: '#285AEB' }} /></linearGradient></defs><path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z" /></svg>
                                )}
                                {link.platform === 'GitHub' && (
                                  <svg className="w-5 h-5" fill="#181717" viewBox="0 0 24 24"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" /></svg>
                                )}
                                {link.platform === 'YouTube' && (
                                  <svg className="w-5 h-5" fill="#FF0000" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
                                )}
                                {link.platform === 'TikTok' && (
                                  <svg className="w-5 h-5" fill="#000000" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" /></svg>
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
                      </div>}
                    </div>
                  </div>
                  <div className="rounded-lg border border-transparent bg-transparent p-6 md:col-span-2">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>Professional Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {fieldIsPublic(viewingAlumni, 'isPositionPublic', 'is_position_public') && <div><label className="text-sm font-medium text-gray-500">Current Position</label><p className="text-gray-900">{viewingAlumni.current_position || viewingAlumni.currentPosition || 'Not specified'}</p></div>}
                      {fieldIsPublic(viewingAlumni, 'isCompanyPublic', 'is_company_public') && <div><label className="text-sm font-medium text-gray-500">Company</label><p className="text-gray-900">{viewingAlumni.company || 'Not specified'}</p></div>}
                      {fieldIsPublic(viewingAlumni, 'isLocationPublic', 'is_location_public') && <div><label className="text-sm font-medium text-gray-500">Location</label><p className="text-gray-900">{viewingAlumni.location || 'Not specified'}</p></div>}
                    </div>
                  </div>
                  {fieldIsPublic(viewingAlumni, 'isSkillsPublic', 'is_skills_public') && viewingAlumni.skills && (
                    <div className="bg-gray-50 rounded-lg p-6 md:col-span-2">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>Skills</h3>
                      <div className="flex flex-wrap gap-2">{viewingAlumni.skills.split(',').map((skill, i) => (<span key={i} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">{skill.trim()}</span>))}</div>
                    </div>
                  )}
                  {/* Achievements */}
                  <div className="rounded-lg border border-transparent bg-transparent p-6 md:col-span-2">
                    <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold text-gray-900 flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>Achievements</h3></div>
                    <div className="space-y-3">{achievements.length === 0 ? <p className="text-gray-500 text-sm">No achievements recorded yet.</p> : achievements.map(a => (<div key={a.id} className="rounded-2xl border border-transparent bg-transparent p-4"><div className="flex justify-between items-start"><div className="flex-1"><h4 className="font-medium text-gray-900">{a.title}</h4>{a.description && <p className="text-sm text-gray-600 mt-1" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{a.description}</p>}{a.date && <p className="text-xs text-gray-500 mt-2">{new Date(a.date).toLocaleDateString()}</p>}</div>{isTeacher && <button onClick={() => handleDeleteAchievement(a.id)} className="text-red-600 hover:text-red-800 ml-2"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>}</div></div>))}</div>
                  </div>
                  {/* Employment */}
                  {canViewEmploymentHistory(viewingAlumni) && <div className="rounded-lg border border-transparent bg-transparent p-6 md:col-span-2">
                    <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold text-gray-900 flex items-center"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>Employment History</h3></div>
                    <div className="space-y-2">
                      {careers.length === 0 ? (
                        <p className="text-gray-500 text-sm">No employment history recorded yet.</p>
                      ) : careers.map(c => (
                        <div key={c.id} className="rounded-2xl border border-transparent bg-transparent p-4">
                          <div className="flex justify-between items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-semibold text-gray-900 text-sm">{c.job_title}</h4>
                                <p className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">
                                  {c.start_date ? new Date(c.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'N/A'} - {c.is_current ? 'Present' : (c.end_date ? new Date(c.end_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'N/A')}
                                </p>
                              </div>
                              <p className="text-sm text-blue-600 font-medium">{c.company}</p>
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getProgramAlignmentClass(c.program_alignment)}`}>
                                  {getProgramAlignmentLabel(c.program_alignment)}
                                </span>
                                {c.alignment_notes && <span className="text-xs text-gray-500">{c.alignment_notes}</span>}
                              </div>
                              {isTeacher && (
                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Program Match</label>
                                  <select
                                    value={c.program_alignment || 'NEEDS_REVIEW'}
                                    onChange={(event) => handleReviewCareerMatch(c.id, event.target.value)}
                                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                  >
                                    {PROGRAM_ALIGNMENT_OPTIONS.filter((option) => option.value).map((option) => (
                                      <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                  </select>
                                </div>
                              )}
                              {c.description && <p className="text-xs text-gray-600 mt-1.5 line-clamp-2">{c.description}</p>}
                            </div>
                            {isTeacher && <button onClick={() => handleDeleteCareer(c.id)} className="text-red-600 hover:text-red-800 flex-shrink-0"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Alumni Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
            <div className="mx-auto flex h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
              <div className="shrink-0 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-6 py-5">
                <h3 className="text-2xl font-semibold text-slate-900">Add New Alumni</h3>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-hide">
                <form onSubmit={handleAddAlumni} className="space-y-6">
                  <div className="grid gap-6 lg:grid-cols-[180px_minmax(0,1fr)] lg:items-start">
                    <div className="flex justify-center lg:justify-start">
                      <div className="relative">
                        <img
                          src={newAlumni.profileImage || `https://ui-avatars.com/api/?name=${newAlumni.firstName}+${newAlumni.lastName}&background=random`}
                          alt="Profile Preview"
                          className="h-32 w-32 rounded-full border-4 border-white object-cover shadow-lg"
                        />
                        <label
                          htmlFor="profile-upload-add"
                          className="absolute bottom-0 right-0 cursor-pointer rounded-full bg-blue-600 p-2 shadow-lg transition-colors hover:bg-blue-700"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                          </svg>
                        </label>
                        <input id="profile-upload-add" type="file" name="profileImage" accept="image/*" onChange={handleInputChange} className="hidden" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                        <input type="text" name="firstName" value={newAlumni.firstName} onChange={handleInputChange} className="app-input" required />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                        <input type="text" name="lastName" value={newAlumni.lastName} onChange={handleInputChange} className="app-input" required />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                        <input type="email" name="email" value={newAlumni.email} onChange={handleInputChange} className="app-input" required />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth</label>
                        <input type="date" name="dateOfBirth" value={newAlumni.dateOfBirth || ''} onChange={handleInputChange} className="app-input" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Contact Number</label>
                        <input type="text" name="contactNumber" value={newAlumni.contactNumber} onChange={handleInputChange} className="app-input" />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <h4 className="text-lg font-semibold text-slate-900">Education History</h4>
                        <p className="text-sm text-slate-500">Add level, batch, and graduation year entries.</p>
                      </div>
                      <button
                        type="button"
                        onClick={addEducationHistoryEntry}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                      >
                        + Add Level & Batch
                      </button>
                    </div>
                    <div className="space-y-3">
                      {educationHistory.map((entry, index) => (
                        <div key={`edu-${index}`} className="grid grid-cols-1 gap-3 p-3 rounded-lg border border-gray-200 bg-white sm:grid-cols-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Level</label>
                            <select
                              value={entry.level}
                              onChange={(e) => handleEducationHistoryChange(index, 'level', e.target.value)}
                              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="">Select Level</option>
                              {sharedLevelOptions.filter((opt) => opt.value).map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Batch</label>
                            <select
                              value={entry.batch}
                              onChange={(e) => handleEducationHistoryChange(index, 'batch', e.target.value)}
                              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="">Select Batch</option>
                              {DEFAULT_BATCH_OPTIONS.map((batch) => (
                                <option key={batch} value={batch}>{batch}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex items-end justify-between gap-3">
                            <div className="text-xs text-gray-500">Select the level and matching batch for this entry.</div>
                            {educationHistory.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeEducationHistoryEntry(index)}
                                className="text-xs text-red-600 hover:text-red-700 font-medium"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Course</label>
                        <FilterMenu
                          menuRef={addCourseMenuRef}
                          isOpen={showAddCourseMenu}
                          setIsOpen={setShowAddCourseMenu}
                          buttonLabel="Select course"
                          selectedLabel={getCourseLabel(newAlumni.course)}
                          selectedValue={newAlumni.course}
                          icon={<svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a3 3 0 100 6 3 3 0 000-6zm-5 8a3 3 0 100 6 3 3 0 000-6zm10 0a3 3 0 100 6 3 3 0 000-6z" /></svg>}
                          sections={educationHistory[0]?.level ? registerCourseSections.filter((section) => section.key === educationHistory[0].level) : registerCourseSections}
                          onSelect={(value) => {
                            setNewAlumniField('course', newAlumni.course === value ? '' : value);
                            setShowAddCourseMenu(false);
                          }}
                          panelTitle={educationHistory[0]?.level ? `${getLevelLabel(educationHistory[0].level)} Courses` : 'Select Course'}
                          panelWidthClass="w-full"
                          alignClass="left-0"
                        />
                        <input type="hidden" name="course" value={newAlumni.course} required />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Current Position</label>
                        <input type="text" name="currentPosition" value={newAlumni.currentPosition} onChange={handleInputChange} className="app-input" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Company</label>
                        <input type="text" name="company" value={newAlumni.company} onChange={handleInputChange} className="app-input" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                        <input type="text" name="location" value={newAlumni.location} onChange={handleInputChange} className="app-input" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Skills</label>
                        <textarea name="skills" value={newAlumni.skills} onChange={handleInputChange} rows="3" className="app-textarea" placeholder="Comma-separated skills" />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
                    <button type="button" onClick={() => setShowAddModal(false)} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
                    <button type="submit" className="rounded-md bg-blue-900 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800">Add Alumni</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Edit Alumni Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto scrollbar-hide">
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
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label><input type="date" name="dateOfBirth" value={newAlumni.dateOfBirth || ''} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2.5 text-sm rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" /></div>
                    <div className="sm:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label><input type="text" name="contactNumber" value={newAlumni.contactNumber || ''} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2.5 text-sm rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" /></div>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  <h4 className="text-lg font-medium text-gray-900">Academic Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Course</label><input type="text" name="course" value={newAlumni.course} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2.5 text-sm rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" required /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Graduation Year</label><input type="number" name="graduationYear" value={newAlumni.graduationYear} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2.5 text-sm rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="YYYY" required /></div>
                  </div>
                  <div className="border-t border-gray-300 pt-4">
                    <h5 className="text-md font-medium text-gray-900 mb-3">Education History</h5>
                    <div className="space-y-3">
                      {Array.isArray(newAlumni.educationHistory) && newAlumni.educationHistory.length > 0 ? (
                        newAlumni.educationHistory.map((entry, idx) => (
                          <div key={idx} className="bg-white border border-gray-200 rounded-md p-3 flex justify-between items-start">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{idx + 1}. {getLevelLabel(entry.level)}</p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {entry.batch && <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-50 text-xs font-semibold text-blue-800 border border-blue-100">Batch: {entry.batch}</span>}
                                {entry.graduationYear && <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-green-50 text-xs font-semibold text-green-800 border border-green-100">Year: {entry.graduationYear}</span>}
                              </div>
                            </div>
                            <button type="button" onClick={() => setNewAlumni(prev => ({ ...prev, educationHistory: prev.educationHistory.filter((_, i) => i !== idx) }))} className="ml-2 text-red-600 hover:text-red-700 font-medium text-xs">Remove</button>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-gray-500 italic">No education history entries</p>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mt-2">Education history is read-only. Update through your profile if needed.</p>
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
                <div className="mt-6 flex justify-end space-x-3"><button type="button" onClick={() => { setShowEditModal(false); setEditingAlumni(null); setNewAlumni(blankAlumni); }} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button><button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-900 rounded-md hover:bg-blue-800">Save Changes</button></div>
              </form>
            </div>
          </div>
        )}

        {/* Achievement Modal */}
        {showAchievementModal && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-3 sm:p-4 z-[110]">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-5 sm:p-8 max-h-[90vh] overflow-y-auto scrollbar-hide">
              <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4 sm:mb-6">Add Achievement</h3>
              <form onSubmit={handleAddAchievement} className="space-y-4 sm:space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                  <input
                    type="text"
                    value={newAchievement.title}
                    onChange={e => setNewAchievement(s => ({ ...s, title: e.target.value }))}
                    className="mt-1 block w-full px-4 py-3 text-sm rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                    placeholder="Enter achievement title"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={newAchievement.description}
                    onChange={e => setNewAchievement(s => ({ ...s, description: e.target.value }))}
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
                    onChange={e => setNewAchievement(s => ({ ...s, date: e.target.value }))}
                    className="mt-1 block w-full px-4 py-3 text-sm rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                  />
                </div>
                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 mt-6 sm:mt-8 pt-4 border-t border-gray-200">
                  <button type="button" onClick={() => setShowAchievementModal(false)} className="w-full sm:w-auto px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
                  <button type="submit" className="w-full sm:w-auto px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">Add Achievement</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Career Modal */}
        {showCareerModal && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-3 sm:p-4 z-[110]">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-5 sm:p-8 max-h-[90vh] overflow-y-auto scrollbar-hide">
              <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4 sm:mb-6">Add Employment Record</h3>
              <form onSubmit={handleAddCareer} className="space-y-4 sm:space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Position *</label>
                    <input
                      type="text"
                      value={newCareer.job_title}
                      onChange={e => setNewCareer(s => ({ ...s, job_title: e.target.value }))}
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
                      onChange={e => setNewCareer(s => ({ ...s, company: e.target.value }))}
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
                      onChange={e => setNewCareer(s => ({ ...s, start_date: e.target.value }))}
                      className="mt-1 block w-full px-4 py-3 text-sm rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                    <input
                      type="date"
                      value={newCareer.end_date}
                      onChange={e => setNewCareer(s => ({ ...s, end_date: e.target.value }))}
                      disabled={newCareer.is_current}
                      className="mt-1 block w-full px-4 py-3 text-sm rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <div className="flex items-center bg-blue-50 rounded-lg px-4 py-3 border border-blue-200">
                      <input
                        type="checkbox"
                        checked={newCareer.is_current}
                        onChange={e => setNewCareer(s => ({ ...s, is_current: e.target.checked, end_date: e.target.checked ? '' : s.end_date }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label className="ml-3 block text-sm font-medium text-gray-700">I currently work here</label>
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Program Match</label>
                    <select
                      value={newCareer.program_alignment}
                      onChange={e => setNewCareer(s => ({ ...s, program_alignment: e.target.value }))}
                      className="mt-1 block w-full px-4 py-3 text-sm rounded-lg border border-gray-300 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                    >
                      {PROGRAM_ALIGNMENT_OPTIONS.map((option) => (
                        <option key={option.value || 'auto'} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Review Notes</label>
                    <input
                      type="text"
                      value={newCareer.alignment_notes}
                      onChange={e => setNewCareer(s => ({ ...s, alignment_notes: e.target.value }))}
                      className="mt-1 block w-full px-4 py-3 text-sm rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                      placeholder="Optional note about how the job relates to the program"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      value={newCareer.description}
                      onChange={e => setNewCareer(s => ({ ...s, description: e.target.value }))}
                      rows="4"
                      className="mt-1 block w-full px-4 py-3 text-sm rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors resize-none"
                      placeholder="Describe your responsibilities and achievements..."
                    />
                  </div>
                </div>
                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 mt-6 sm:mt-8 pt-4 border-t border-gray-200">
                  <button type="button" onClick={() => setShowCareerModal(false)} className="w-full sm:w-auto px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
                  <button type="submit" className="w-full sm:w-auto px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">Add Employment</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Batch Officers Modal */}
        {showOfficersModal && selectedBatch && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[88vh] overflow-hidden flex flex-col border border-blue-100">
              <div className="px-6 py-5 border-b border-blue-100 flex items-center justify-between bg-gradient-to-r from-blue-50 via-white to-blue-50">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 mr-2 text-blue-600">
                      <path d="M4.5 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM14.25 8.625a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0zM1.5 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63l-.001-.122zM17.25 19.128l-.001.144a2.25 2.25 0 01-.233.96 10.088 10.088 0 005.06-1.01.75.75 0 00.42-.643 4.875 4.875 0 00-6.957-4.611 8.586 8.586 0 011.71 5.157v.003z" />
                      <path d="M4.5 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM14.25 8.625a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0zM1.5 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63l-.001-.122zM17.25 19.128l-.001.144a2.25 2.25 0 01-.233.96 10.088 10.088 0 005.06-1.01.75.75 0 00.42-.643 4.875 4.875 0 00-6.957-4.611 8.586 8.586 0 011.71 5.157v.003z" />
                    </svg>
                    Batch {selectedBatch} Officers
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">{batchOfficers.length} officer{batchOfficers.length !== 1 ? 's' : ''} serving the batch</p>
                </div>
                <div className="flex items-center gap-2">
                  {isTeacher && (
                    <button
                      onClick={openAssignOfficerModal}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
                      </svg>
                      Assign Officer
                    </button>
                  )}
                  <button
                    onClick={() => setShowOfficersModal(false)}
                    className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full p-2 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-hide p-6 bg-slate-50/60">
                {batchOfficers.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-blue-200">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p className="mt-4 text-slate-600 font-medium">No officers assigned for this batch yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {batchOfficers.map((officer) => (
                      <div
                        key={officer.id}
                        className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:border-blue-200"
                      >
                        <div className="h-1 bg-gradient-to-r from-blue-600 via-sky-500 to-blue-400" />
                        <div className="flex items-start gap-4 p-5">
                          <img
                            src={getOfficerImageSrc(officer.alumni)}
                            alt={getPersonName(officer.alumni)}
                            className="w-20 h-20 rounded-2xl object-cover border-2 border-blue-100 flex-shrink-0 shadow-sm bg-blue-50"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h4 className="text-base font-bold text-slate-900 truncate">
                                  {getPersonName(officer.alumni)}
                                </h4>
                                <p className="text-xs text-slate-500 truncate">{officer.alumni.email || 'No email provided'}</p>
                              </div>
                            </div>
                            <div className="mt-2">
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                                {officer.position}
                              </span>
                            </div>
                            <div className="mt-3 space-y-1.5 text-sm text-slate-600">
                              {officer.alumni.course && (
                                <p className="truncate"><span className="font-medium text-slate-700">Course:</span> {officer.alumni.course}</p>
                              )}
                              {(officer.alumni.current_position || officer.alumni.company) && (
                                <p className="truncate">
                                  <span className="font-medium text-slate-700">Work:</span>{' '}
                                  {officer.alumni.current_position || 'Unspecified'}
                                  {officer.alumni.company ? ` at ${officer.alumni.company}` : ''}
                                </p>
                              )}
                            </div>
                            {isTeacher && (
                              <button
                                onClick={() => setConfirmModal({ isOpen: true, title: 'Remove Officer', message: 'Are you sure you want to remove this officer?', onConfirm: async () => { await handleRemoveOfficer(officer.id); }, type: 'danger' })}
                                className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:border-red-300 hover:bg-red-100 transition-colors"
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

              <div className="px-6 py-4 border-t border-blue-100 bg-white flex justify-end">
                <button
                  onClick={() => setShowOfficersModal(false)}
                  className="px-5 py-2.5 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-4">
          <div className="flex flex-col gap-4">
            {/* Row 1: Search Bar */}
            <div className="w-full">
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
                  placeholder="Search alumni by name, course, email, company, or location"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
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

            {/* Row 2: Filter Dropdowns + Actions */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <FilterMenu
                  menuRef={levelMenuRef}
                  isOpen={showLevelMenu}
                  setIsOpen={setShowLevelMenu}
                  buttonLabel="All Levels"
                  selectedLabel={getLevelLabel(selectedLevel)}
                  selectedValue={selectedLevel}
                  icon={<svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l9 5-9 5-9-5 9-5zm0 8l7.5-4.167V15L12 20l-7.5-5.167V6.833L12 11zm0 2.25L7.5 12v2.5L12 17l4.5-2.5V12L12 13.25z" /></svg>}
                  sections={[{ key: 'levels', title: 'Levels', items: sharedLevelOptions.filter((option) => option.value).map((option) => ({ value: option.value, label: option.label })) }]}
                  onSelect={(value) => {
                    setSelectedLevel((prev) => {
                      const nextLevel = prev === value ? '' : value;
                      const nextSections = buildRegisterCourseSections(nextLevel);
                      const groupStillAvailable = nextSections.some((section) =>
                        section.items.some((item) => item.value === selectedGroup)
                      );
                      if (!groupStillAvailable) {
                        setSelectedGroup('');
                      }
                      return nextLevel;
                    });
                    setShowLevelMenu(false);
                  }}
                  panelTitle="All Levels"
                  panelWidthClass="w-56"
                  alignClass="right-0"
                />
                <FilterMenu
                  menuRef={batchMenuRef}
                  isOpen={showBatchMenu}
                  setIsOpen={setShowBatchMenu}
                  buttonLabel="All Batches"
                  selectedLabel={selectedBatch ? String(selectedBatch) : 'All Batches'}
                  selectedValue={selectedBatch}
                  icon={<svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M5 4a1 1 0 011-1h8a1 1 0 011 1v2H5V4zm0 4h10v7a1 1 0 01-1 1H6a1 1 0 01-1-1V8zm3 2a1 1 0 100 2h4a1 1 0 100-2H8z" /></svg>}
                  sections={[{ key: 'batches', title: 'Batches', items: [...batches.map((batch) => ({ value: String(batch), label: String(batch) }))] }]}
                  onSelect={(value) => {
                    setSelectedBatch((prev) => (prev === value ? '' : value));
                    setShowBatchMenu(false);
                  }}
                  panelTitle="All Batches"
                  panelWidthClass="w-56"
                  alignClass="right-0"
                />
                <FilterMenu
                  menuRef={groupMenuRef}
                  isOpen={showGroupMenu}
                  setIsOpen={setShowGroupMenu}
                  buttonLabel="All Program"
                  selectedLabel={getGroupLabel(selectedGroup)}
                  selectedValue={selectedGroup}
                  icon={<svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a3 3 0 100 6 3 3 0 000-6zm-5 8a3 3 0 100 6 3 3 0 000-6zm10 0a3 3 0 100 6 3 3 0 000-6z" /></svg>}
                  sections={filterCourseSections}
                  onSelect={(value) => {
                    setSelectedGroup((prev) => (prev === value ? '' : value));
                    setShowGroupMenu(false);
                  }}
                  panelTitle={selectedLevel ? `${getLevelLabel(selectedLevel)} Programs` : 'All Program'}
                  panelWidthClass="w-96"
                  alignClass="right-0"
                />
                {isTeacher && batchOfficersButton}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {!isTeacher && batchOfficersButton}
                {isTeacher && (
                  <button type="button" onClick={generateCsv} className="inline-flex h-[46px] w-56 items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-sm font-semibold text-emerald-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-100">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 16v-4m0 0V8m0 4h4m-4 0H8M5 20h14a2 2 0 002-2V8.828a2 2 0 00-.586-1.414l-4.828-4.828A2 2 0 0014.172 2H5a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                    <span className="min-w-0 truncate">Generate List (CSV)</span>
                  </button>
                )}
                {clearFiltersButton}
              </div>
            </div>
          </div>
        </div>

        {/* Alumni list */}
        <div className="grid auto-rows-fr items-stretch gap-3 px-4 py-4 sm:px-6 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
          {loading && (
            <div className="col-span-full rounded-lg border border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-500">Loading...</div>
          )}
          {error && !loading && (
            <div className="col-span-full rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-600">{error}</div>
          )}
          {!loading && !error && filteredAlumni.length === 0 && (
            <div className="col-span-full rounded-lg border border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-500">No alumni found.</div>
          )}
          {!loading && !error && filteredAlumni.map(a => {
            const fullName = `${a.firstName || ''} ${a.lastName || ''}`.trim() || 'Unnamed Alumni';
            const courseText = fieldIsPublic(a, 'isCoursePublic', 'is_course_public')
              ? (a.course || 'Course not provided')
              : 'Course hidden';
            const levelText = fieldIsPublic(a, 'isEducationHistoryPublic', 'is_education_history_public')
              ? getLevelLabel(a.level)
              : 'Level hidden';
            const educationSummary = [courseText, levelText].filter(Boolean).join(' \u00b7 ');
            const userStatus = userStatuses[getAlumniChatUserId(a)];
            const isOnline = Boolean(userStatus?.online);

            return (
              <div
                key={a.id}
                role="button"
                tabIndex={0}
                className="alumni-directory-card group flex h-full min-h-[120px] w-full cursor-pointer items-center gap-3 rounded-lg border-[0.5px] border-slate-200/80 bg-white px-3.5 py-3 text-left shadow-[0_8px_24px_-20px_rgba(15,23,42,0.45)] transition duration-200 hover:-translate-y-0.5 hover:border-slate-300/80 hover:bg-slate-50 hover:shadow-[0_16px_34px_-22px_rgba(15,23,42,0.35)] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-200"
                onClick={() => openViewModal(a)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openViewModal(a);
                  }
                }}
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="h-12 w-12 shrink-0">
                    <img
                      src={a.profileImage || getInitialAvatarSrc(a.firstName, a.lastName, 96)}
                      onError={(event) => handleProfileImageError(event, a.firstName, a.lastName, 96)}
                      alt={fullName}
                      title={`${fullName} - ${isOnline ? 'Online' : 'Offline'}`}
                      className={`avatar alumni-list-avatar h-12 w-12 rounded-full object-cover ${isOnline ? 'online' : 'offline'}`}
                    />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-gray-950 sm:text-base" title={fullName}>{fullName}</h3>
                    <p className="mt-0.5 truncate text-xs font-medium leading-snug text-slate-600 sm:text-sm" title={educationSummary}>{educationSummary}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Assign Officer Modal */}
        {showAssignOfficerModal && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
              <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-50">
                <h3 className="text-xl font-bold text-gray-900 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
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
                      className="w-full px-4 py-3 text-sm rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
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
                      className="app-select"
                      required
                    >
                      <option value="">Select an alumni</option>
                      {alumni
                        .filter(a => {
                          // Filter by batch
                          if (officerForm.batch && a.batch !== parseInt(officerForm.batch)) return false;
                          // Exclude alumni who are already assigned as officers
                          const isAlreadyOfficer = batchOfficers.some(officer => officer.alumni_id === parseInt(a.id));
                          return !isAlreadyOfficer;
                        })
                        .map(a => (
                          <option key={a.id} value={a.id}>
                            {a.firstName} {a.lastName} - Batch {a.batch}
                          </option>
                        ))}
                    </select>
                    {alumni.filter(a => !officerForm.batch || a.batch === parseInt(officerForm.batch)).length > 0 &&
                      alumni.filter(a => {
                        if (officerForm.batch && a.batch !== parseInt(officerForm.batch)) return false;
                        const isAlreadyOfficer = batchOfficers.some(officer => officer.alumni_id === parseInt(a.id));
                        return !isAlreadyOfficer;
                      }).length === 0 && (
                        <p className="text-xs text-amber-600 mt-1">All alumni in this batch are already assigned as officers.</p>
                      )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Position <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={officerForm.position}
                      onChange={(e) => setOfficerForm({ ...officerForm, position: e.target.value })}
                      className="app-select"
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
                    className="flex-1 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    Assign Officer
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
      <AlumniChatPanel currentUser={currentUser} alumniContacts={alumni} />
    </UserLayout>
  );
};

export default AlumniDirectory;

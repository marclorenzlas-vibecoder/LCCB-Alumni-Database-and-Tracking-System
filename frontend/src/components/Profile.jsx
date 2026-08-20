import React, { useState, useEffect, useMemo } from 'react';
import { authService } from '../services/authService';
import careerService from '../services/careerService';
import { API_BASE_URL, IMAGE_BASE_URL } from '../config/apiBaseUrl';
import { realtimeClient } from '../services/realtimeClient';
import { toast } from 'react-toastify';
import UserLayout from './UserLayout';
import ConfirmModal from './ConfirmModal';

const levelLabelMap = {
  INTEGRATED_SCHOOL: 'Integrated School',
  NIGHT_HIGH: 'Night High',
  SENIOR_HIGH: 'Senior High',
  COLLEGE: 'College',
  ETEEAP: 'ETEEAP',
  GRAD_SCHOOL: 'Grad School',
  SENIOR_HIGH_SCHOOL: 'Senior High School',
  HIGH_SCHOOL: 'High School'
};

const formatLevelLabel = (value) => {
  if (!value) return 'Not set';
  return levelLabelMap[value] || value;
};

const formatDateForInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const formatDateOfBirth = (value) => {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not set';
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
};

const createEducationEntry = (entry = {}) => ({
  level: entry.level || '',
  batch: entry.batch ?? '',
  graduationYear: entry.graduationYear ?? entry.graduation_year ?? ''
});

const DEFAULT_BATCH_OPTIONS = Array.from({ length: 60 }, (_, index) => String(new Date().getFullYear() - index));

const normalizeEducationHistory = (alumni = {}) => {
  const rawHistory = alumni.educationHistory || alumni.education_history;
  if (Array.isArray(rawHistory) && rawHistory.length > 0) {
    return rawHistory.map((entry) => createEducationEntry(entry));
  }

  if (alumni.level || alumni.batch || alumni.graduationYear || alumni.graduation_year) {
    return [
      createEducationEntry({
        level: alumni.level,
        batch: alumni.batch,
        graduationYear: alumni.graduationYear || alumni.graduation_year
      })
    ];
  }

  return [createEducationEntry()];
};

const getPrimaryEducation = (history = []) => {
  const validEntries = history.filter((entry) => entry.level);
  return validEntries.length > 0 ? validEntries[validEntries.length - 1] : createEducationEntry();
};

const getDisplayClassYear = (alumni = {}, fallback = '') => (
  alumni.graduationYear || alumni.graduation_year || fallback || alumni.batch || ''
);

const syncPrimaryEducationWithGraduationYear = (history = [], graduationYear = '', fallbackLevel = '') => {
  if (!graduationYear) return history;

  const nextHistory = history.length > 0 ? history.map((entry) => createEducationEntry(entry)) : [createEducationEntry()];
  let primaryIndex = -1;

  nextHistory.forEach((entry, index) => {
    if (entry.level) primaryIndex = index;
  });

  if (primaryIndex === -1) {
    primaryIndex = 0;
    nextHistory[0] = {
      ...nextHistory[0],
      level: fallbackLevel || nextHistory[0]?.level || ''
    };
  }

  nextHistory[primaryIndex] = {
    ...nextHistory[primaryIndex],
    batch: String(graduationYear),
    graduationYear: String(graduationYear)
  };

  return nextHistory;
};

const formatEducationHistoryLine = (entry, fallbackClassYear = '') => {
  const classYear = entry.graduationYear || entry.graduation_year || fallbackClassYear || entry.batch;
  return `${formatLevelLabel(entry.level)}${classYear ? `, Class ${classYear}` : entry.batch ? `, Batch ${entry.batch}` : ''}`;
};

const readResponseBody = async (response) => {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch (error) {
      return null;
    }
  }

  try {
    const text = await response.text();
    return text ? { message: text } : null;
  } catch (error) {
    return null;
  }
};

const PROFILE_UPDATED_EVENT = 'auth-user-updated';

const DEFAULT_PRIVACY_SETTINGS = {
  isStudentIdPublic: false,
  isDateOfBirthPublic: false,
  isCoursePublic: true,
  isGraduationYearPublic: true,
  isEducationHistoryPublic: true,
  isEmailPublic: false,
  isPhonePublic: false,
  isPositionPublic: false,
  isEmploymentPublic: false,
  isCompanyPublic: false,
  isLocationPublic: false,
  isSocialLinksPublic: false,
  isSkillsPublic: false
};

const pickPrivacyFlag = (source = {}, camelKey, snakeKey, fallback = true) => {
  const value = source[camelKey] ?? source[snakeKey];
  return value === undefined ? fallback : value !== false;
};

const normalizePrivacySettings = (alumni = {}) => ({
  isStudentIdPublic: pickPrivacyFlag(alumni, 'isStudentIdPublic', 'is_student_id_public', DEFAULT_PRIVACY_SETTINGS.isStudentIdPublic),
  isDateOfBirthPublic: pickPrivacyFlag(alumni, 'isDateOfBirthPublic', 'is_date_of_birth_public', DEFAULT_PRIVACY_SETTINGS.isDateOfBirthPublic),
  isCoursePublic: pickPrivacyFlag(alumni, 'isCoursePublic', 'is_course_public'),
  isGraduationYearPublic: pickPrivacyFlag(alumni, 'isGraduationYearPublic', 'is_graduation_year_public'),
  isEducationHistoryPublic: pickPrivacyFlag(alumni, 'isEducationHistoryPublic', 'is_education_history_public'),
  isEmailPublic: pickPrivacyFlag(alumni, 'isEmailPublic', 'is_email_public', DEFAULT_PRIVACY_SETTINGS.isEmailPublic),
  isPhonePublic: pickPrivacyFlag(alumni, 'isPhonePublic', 'is_phone_public', DEFAULT_PRIVACY_SETTINGS.isPhonePublic),
  isPositionPublic: pickPrivacyFlag(alumni, 'isPositionPublic', 'is_position_public', DEFAULT_PRIVACY_SETTINGS.isPositionPublic),
  isEmploymentPublic: pickPrivacyFlag(alumni, 'isEmploymentPublic', 'is_employment_public', DEFAULT_PRIVACY_SETTINGS.isEmploymentPublic),
  isCompanyPublic: pickPrivacyFlag(alumni, 'isCompanyPublic', 'is_company_public', DEFAULT_PRIVACY_SETTINGS.isCompanyPublic),
  isLocationPublic: pickPrivacyFlag(alumni, 'isLocationPublic', 'is_location_public', DEFAULT_PRIVACY_SETTINGS.isLocationPublic),
  isSocialLinksPublic: pickPrivacyFlag(alumni, 'isSocialLinksPublic', 'is_social_links_public', DEFAULT_PRIVACY_SETTINGS.isSocialLinksPublic),
  isSkillsPublic: pickPrivacyFlag(alumni, 'isSkillsPublic', 'is_skills_public', DEFAULT_PRIVACY_SETTINGS.isSkillsPublic)
});

const privacySettingsToAlumniFields = (settings = DEFAULT_PRIVACY_SETTINGS) => ({
  isStudentIdPublic: settings.isStudentIdPublic,
  is_student_id_public: settings.isStudentIdPublic,
  isDateOfBirthPublic: settings.isDateOfBirthPublic,
  is_date_of_birth_public: settings.isDateOfBirthPublic,
  isCoursePublic: settings.isCoursePublic,
  is_course_public: settings.isCoursePublic,
  isGraduationYearPublic: settings.isGraduationYearPublic,
  is_graduation_year_public: settings.isGraduationYearPublic,
  isEducationHistoryPublic: settings.isEducationHistoryPublic,
  is_education_history_public: settings.isEducationHistoryPublic,
  isEmailPublic: settings.isEmailPublic,
  is_email_public: settings.isEmailPublic,
  isPhonePublic: settings.isPhonePublic,
  is_phone_public: settings.isPhonePublic,
  isPositionPublic: settings.isPositionPublic,
  is_position_public: settings.isPositionPublic,
  isEmploymentPublic: settings.isEmploymentPublic,
  is_employment_public: settings.isEmploymentPublic,
  isCompanyPublic: settings.isCompanyPublic,
  is_company_public: settings.isCompanyPublic,
  isLocationPublic: settings.isLocationPublic,
  is_location_public: settings.isLocationPublic,
  isSocialLinksPublic: settings.isSocialLinksPublic,
  is_social_links_public: settings.isSocialLinksPublic,
  isSkillsPublic: settings.isSkillsPublic,
  is_skills_public: settings.isSkillsPublic
});

const EyeIcon = ({ hidden = false }) => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    {hidden ? (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.58 10.58A2 2 0 0012 14a2 2 0 001.42-.58" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.88 5.09A10.7 10.7 0 0112 4.88c4.48 0 8.27 2.94 9.54 7a10.64 10.64 0 01-2.38 3.79" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.61 6.61A10.9 10.9 0 002.46 11.88a10.94 10.94 0 007.88 6.9" />
      </>
    ) : (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.46 12C3.73 7.94 7.52 5 12 5s8.27 2.94 9.54 7c-1.27 4.06-5.06 7-9.54 7s-8.27-2.94-9.54-7z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
      </>
    )}
  </svg>
);

const PrivacyToggle = ({ isPublic, onToggle, label, disabled = false }) => (
  <button
    type="button"
    onClick={disabled ? undefined : onToggle}
    disabled={disabled}
    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${
      disabled
        ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
        : isPublic
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
        : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200'
    }`}
    title={`${label} is ${isPublic ? 'public' : 'private'}${disabled ? '. Click Edit Profile to change.' : '. Click to change.'}`}
    aria-label={`${label} visibility is ${isPublic ? 'public' : 'private'}`}
  >
    <EyeIcon hidden={!isPublic} />
    {isPublic ? 'Public' : 'Private'}
  </button>
);

const createCareerForm = () => ({
  job_title: '',
  company: '',
  start_date: '',
  end_date: '',
  is_current: false,
  description: ''
});

const getProgramMatchLabel = (value) => {
  if (value === 'ALIGNED') return 'Related';
  if (value === 'NOT_ALIGNED') return 'Not Related';
  return 'Needs Checking';
};

const getProgramMatchClass = (value) => {
  if (value === 'ALIGNED') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (value === 'NOT_ALIGNED') return 'border-rose-200 bg-rose-50 text-rose-700';
  return 'border-amber-200 bg-amber-50 text-amber-700';
};

const getProgramMatchReviewClass = (value) => {
  if (value === 'ALIGNED') return 'border-l-emerald-500 bg-emerald-50/80 text-emerald-800 ring-emerald-100';
  if (value === 'NOT_ALIGNED') return 'border-l-rose-500 bg-rose-50/80 text-rose-800 ring-rose-100';
  return 'border-l-amber-500 bg-amber-50/80 text-amber-800 ring-amber-100';
};

const ProgramMatchIcon = ({ value }) => {
  if (value === 'NOT_ALIGNED') {
    return (
      <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
      </svg>
    );
  }

  if (value === 'ALIGNED') {
    return (
      <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zm3.53 6.47a.75.75 0 00-1.06-1.06L9 10.88 7.53 9.41a.75.75 0 00-1.06 1.06l2 2a.75.75 0 001.06 0l4-4z" clipRule="evenodd" />
      </svg>
    );
  }

  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM8.94 8.94a.75.75 0 01-1.06-1.06A3 3 0 1110.75 13a.75.75 0 01-1.5 0v-.5c0-.67.43-1.18.96-1.49.57-.34 1.04-.66 1.04-1.51a1.5 1.5 0 00-2.31-1.26zm1.06 6.56a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
    </svg>
  );
};

const ProgramMatchReview = ({ value, notes }) => (
  <div className={`mt-3 w-full max-w-xs rounded-lg border border-slate-200 border-l-4 px-3 py-2.5 text-sm ring-1 ${getProgramMatchReviewClass(value)}`}>
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getProgramMatchClass(value)}`}>
          {getProgramMatchLabel(value)}
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-current">
          Program match
          <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/80 shadow-sm">
            <ProgramMatchIcon value={value} />
          </span>
        </span>
      </div>
      <p className="mt-1 text-xs leading-5 text-slate-600">{notes || 'Alumni marked how this job relates to their program.'}</p>
    </div>
  </div>
);

const formatCareerDate = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

const Profile = () => {
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    // Alumni fields
    firstName: '',
    middleName: '',
    lastName: '',
    studentId: '',
    dateOfBirth: '',
    level: '',
    course: '',
    batch: '',
    graduationYear: '',
    currentPosition: '',
    company: '',
    location: '',
    contactNumber: '',
    skills: ''
  });
  const [privacySettings, setPrivacySettings] = useState(DEFAULT_PRIVACY_SETTINGS);

  const [loading, setLoading] = useState(false);
  const [socialLinks, setSocialLinks] = useState([]);
  const [newSocialLink, setNewSocialLink] = useState({ url: '' });
  const [showAddSocialLink, setShowAddSocialLink] = useState(false);
  const [educationHistory, setEducationHistory] = useState([createEducationEntry()]);
  const [careerHistory, setCareerHistory] = useState([]);
  const [showCareerForm, setShowCareerForm] = useState(false);
  const [editingCareerId, setEditingCareerId] = useState(null);
  const [careerForm, setCareerForm] = useState(createCareerForm());
  const [careerSubmitting, setCareerSubmitting] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    type: 'danger',
    onConfirm: async () => {}
  });

  const togglePrivacy = (key) => {
    if (!isEditing) return;
    setPrivacySettings((prev) => {
      return {
        ...prev,
        [key]: !prev[key]
      };
    });
  };

  const refreshProfileFromServer = async (targetUserId) => {
    if (!targetUserId) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/auth/profile/${targetUserId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) return;

      const serverUser = await response.json();
      const normalizedAlumni = serverUser.alumni
        ? {
            ...serverUser.alumni,
            firstName: serverUser.alumni.firstName || serverUser.alumni.first_name || '',
            middleName: serverUser.alumni.middleName || serverUser.alumni.middle_name || '',
            lastName: serverUser.alumni.lastName || serverUser.alumni.last_name || '',
            studentId: serverUser.alumni.studentId || serverUser.alumni.student_id || '',
            student_id: serverUser.alumni.student_id || serverUser.alumni.studentId || '',
            graduationYear: serverUser.alumni.graduationYear || serverUser.alumni.graduation_year || '',
            currentPosition: serverUser.alumni.currentPosition || serverUser.alumni.current_position || '',
            contactNumber: serverUser.alumni.contactNumber || serverUser.alumni.contact_number || ''
          }
        : null;
      const normalizedHistory = normalizeEducationHistory(normalizedAlumni || {});
      const syncedHistory = syncPrimaryEducationWithGraduationYear(
        normalizedHistory,
        normalizedAlumni?.graduationYear || '',
        normalizedAlumni?.level || ''
      );
      const primaryEducation = getPrimaryEducation(syncedHistory);

      const updatedUser = {
        ...serverUser,
        alumni: normalizedAlumni
      };

      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      window.dispatchEvent(new CustomEvent(PROFILE_UPDATED_EVENT, { detail: updatedUser }));

      if (!isEditing) {
        setFormData((prev) => ({
          ...prev,
          username: updatedUser.username || prev.username || '',
          email: updatedUser.email || prev.email || '',
          firstName: normalizedAlumni?.firstName || prev.firstName || '',
          middleName: normalizedAlumni?.middleName || prev.middleName || '',
          lastName: normalizedAlumni?.lastName || prev.lastName || '',
          studentId: normalizedAlumni?.studentId || normalizedAlumni?.student_id || prev.studentId || '',
          dateOfBirth: formatDateForInput(normalizedAlumni?.dateOfBirth || normalizedAlumni?.date_of_birth) || prev.dateOfBirth || '',
          level: primaryEducation.level || prev.level || '',
          course: normalizedAlumni?.course || prev.course || '',
          batch: primaryEducation.batch || prev.batch || '',
          graduationYear: normalizedAlumni?.graduationYear || prev.graduationYear || '',
          currentPosition: normalizedAlumni?.currentPosition || prev.currentPosition || '',
          company: normalizedAlumni?.company || prev.company || '',
          location: normalizedAlumni?.location || prev.location || '',
          contactNumber: normalizedAlumni?.contactNumber || normalizedAlumni?.contact_number || prev.contactNumber || '',
          skills: normalizedAlumni?.skills || prev.skills || ''
        }));
        setPrivacySettings(normalizePrivacySettings(normalizedAlumni || {}));
        setEducationHistory(syncedHistory);
      }

      if (updatedUser.profile_image) {
        setProfileImagePreview(`${IMAGE_BASE_URL}${updatedUser.profile_image}`);
      }

    } catch (error) {
      console.error('Error refreshing profile from server:', error);
    }
  };

  // Batch options aligned with mobile: year-range list + existing values for compatibility.
  const batches = useMemo(() => {
    const set = new Set(DEFAULT_BATCH_OPTIONS);

    educationHistory.forEach((entry) => {
      if (entry?.batch) set.add(String(entry.batch));
    });

    if (formData.batch) set.add(String(formData.batch));

    return Array.from(set).sort((a, b) => Number(b) - Number(a));
  }, [educationHistory, formData.batch]);

  const loadCareerHistory = async (alumniId) => {
    if (!alumniId) return;
    try {
      const data = await careerService.getCareersByAlumni(alumniId);
      setCareerHistory(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching employment history:', error);
      setCareerHistory([]);
    }
  };

  useEffect(() => {
    const userData = authService.getCurrentUser();
    if (userData) {
      const userEducationHistory = normalizeEducationHistory(userData.alumni || {});
      const syncedEducationHistory = syncPrimaryEducationWithGraduationYear(
        userEducationHistory,
        userData.alumni?.graduationYear || userData.alumni?.graduation_year || '',
        userData.alumni?.level || ''
      );
      const primaryEducation = getPrimaryEducation(syncedEducationHistory);
      setUser(userData);
      setFormData({
        username: userData.username || '',
        email: userData.email || '',
        // Alumni fields
        firstName: userData.alumni?.firstName || userData.alumni?.first_name || '',
        middleName: userData.alumni?.middleName || userData.alumni?.middle_name || '',
        lastName: userData.alumni?.lastName || userData.alumni?.last_name || '',
        studentId: userData.alumni?.studentId || userData.alumni?.student_id || '',
        dateOfBirth: formatDateForInput(userData.alumni?.dateOfBirth || userData.alumni?.date_of_birth),
        level: primaryEducation.level || '',
        course: userData.alumni?.course || '',
        batch: primaryEducation.batch || '',
        graduationYear: userData.alumni?.graduationYear || userData.alumni?.graduation_year || '',
        currentPosition: userData.alumni?.currentPosition || userData.alumni?.current_position || '',
        company: userData.alumni?.company || '',
        location: userData.alumni?.location || '',
        contactNumber: userData.alumni?.contactNumber || userData.alumni?.contact_number || '',
        skills: userData.alumni?.skills || ''
      });
      setPrivacySettings(normalizePrivacySettings(userData.alumni || {}));
      setEducationHistory(syncedEducationHistory);
      if (userData.profile_image) {
        setProfileImagePreview(`${IMAGE_BASE_URL}${userData.profile_image}`);
      }
      // Fetch latest alumni details (including social links) from API
      if (userData.alumni?.id) {
        fetchLatestAlumniDetails(userData.alumni.id);
        loadCareerHistory(userData.alumni.id);
      }
    }

    // Listen for alumni directory updates via localStorage
    const handleStorageChange = () => {
      const freshUser = authService.getCurrentUser();
      if (freshUser && freshUser.alumni?.id === user?.alumni?.id) {
        fetchLatestAlumniDetails(freshUser.alumni.id);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [user?.alumni?.id]);

  useEffect(() => {
    if (!user?.id) return;

    const onFocus = () => refreshProfileFromServer(user.id);
    window.addEventListener('focus', onFocus);
    const unsubProfile = realtimeClient.subscribe('profile.updated', (payload) => {
      if (!payload?.userId || Number(payload.userId) === Number(user.id)) {
        refreshProfileFromServer(user.id);
      }
    });
    const unsubAlumni = realtimeClient.subscribe('alumni.updated', (payload) => {
      if (!user?.alumni?.id) return;
      if (Number(payload?.alumniId) === Number(user.alumni.id)) {
        refreshProfileFromServer(user.id);
      }
    });
    const unsubCareerCreated = realtimeClient.subscribe('career.created', (payload) => {
      if (!user?.alumni?.id) return;
      if (Number(payload?.alumniId) === Number(user.alumni.id)) {
        loadCareerHistory(user.alumni.id);
      }
    });
    const unsubCareerUpdated = realtimeClient.subscribe('career.updated', (payload) => {
      if (!user?.alumni?.id) return;
      if (!payload?.alumniId || Number(payload.alumniId) === Number(user.alumni.id)) {
        loadCareerHistory(user.alumni.id);
      }
    });
    const unsubCareerDeleted = realtimeClient.subscribe('career.deleted', (payload) => {
      if (!user?.alumni?.id) return;
      if (!payload?.alumniId || Number(payload.alumniId) === Number(user.alumni.id)) {
        loadCareerHistory(user.alumni.id);
      }
    });

    return () => {
      window.removeEventListener('focus', onFocus);
      unsubProfile();
      unsubAlumni();
      unsubCareerCreated();
      unsubCareerUpdated();
      unsubCareerDeleted();
    };
  }, [user?.id, user?.alumni?.id]);

  const fetchLatestAlumniDetails = async (alumniId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/alumni/${alumniId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setSocialLinks(data.social_link || []);
      }
    } catch (error) {
      console.error('Error fetching alumni details:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'graduationYear') {
      setEducationHistory((prev) => syncPrimaryEducationWithGraduationYear(prev, value, formData.level));
    }

    setFormData(prev => {
      if (name !== 'username') {
        return {
          ...prev,
          [name]: value
        };
      }

      const parts = value.trim().split(/\s+/).filter(Boolean);
      const derivedFirstName = parts[0] || '';
      const derivedLastName = parts.slice(1).join(' ');

      return {
        ...prev,
        username: value,
        firstName: derivedFirstName,
        lastName: derivedLastName
      };
    });
  };

  const handleAddSocialLink = async () => {
    if (!newSocialLink.url) {
      toast.error('Please enter a URL');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/alumni/${user.alumni.id}/social-links`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ url: newSocialLink.url })
      });

      if (response.ok) {
        const addedLink = await response.json();
        setSocialLinks([...socialLinks, addedLink]);
        setNewSocialLink({ url: '' });
        setShowAddSocialLink(false);
        toast.success('Social link added successfully!');
      } else {
        toast.error('Failed to add social link');
      }
    } catch (error) {
      console.error('Error adding social link:', error);
      toast.error('Error adding social link');
    }
  };

  const handleDeleteSocialLink = async (linkId) => {
    if (!confirm('Are you sure you want to delete this social link?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/alumni/${user.alumni.id}/social-links/${linkId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setSocialLinks(socialLinks.filter(link => link.id !== linkId));
        toast.success('Social link deleted successfully!');
      } else {
        toast.error('Failed to delete social link');
      }
    } catch (error) {
      console.error('Error deleting social link:', error);
      toast.error('Error deleting social link');
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const formDataToSend = new FormData();
      const syncedEducationHistory = syncPrimaryEducationWithGraduationYear(
        educationHistory,
        formData.graduationYear,
        formData.level
      );
      const cleanedEducationHistory = syncedEducationHistory
        .map((entry) => createEducationEntry(entry))
        .filter((entry) => entry.level);
      const primaryEducation = getPrimaryEducation(cleanedEducationHistory);
      formDataToSend.append('username', formData.username);
      formDataToSend.append('email', formData.email);
      
      // Alumni fields
      formDataToSend.append('firstName', formData.firstName);
      formDataToSend.append('middleName', formData.middleName);
      formDataToSend.append('lastName', formData.lastName);
      formDataToSend.append('studentId', formData.studentId || '');
      formDataToSend.append('dateOfBirth', formData.dateOfBirth || '');
      formDataToSend.append('level', primaryEducation.level || '');
      formDataToSend.append('course', formData.course);
      formDataToSend.append('batch', primaryEducation.batch || '');
      formDataToSend.append('graduationYear', formData.graduationYear || '');
      formDataToSend.append('educationHistory', JSON.stringify(cleanedEducationHistory));
      formDataToSend.append('currentPosition', formData.currentPosition);
      formDataToSend.append('company', formData.company);
      formDataToSend.append('location', formData.location);
      formDataToSend.append('contactNumber', formData.contactNumber || '');
      formDataToSend.append('skills', formData.skills);
      formDataToSend.append('isStudentIdPublic', String(privacySettings.isStudentIdPublic));
      formDataToSend.append('isDateOfBirthPublic', String(privacySettings.isDateOfBirthPublic));
      formDataToSend.append('isCoursePublic', String(privacySettings.isCoursePublic));
      formDataToSend.append('isGraduationYearPublic', String(privacySettings.isGraduationYearPublic));
      formDataToSend.append('isEducationHistoryPublic', String(privacySettings.isEducationHistoryPublic));
      formDataToSend.append('isEmailPublic', String(privacySettings.isEmailPublic));
      formDataToSend.append('isPhonePublic', String(privacySettings.isPhonePublic));
      formDataToSend.append('isPositionPublic', String(privacySettings.isPositionPublic));
      formDataToSend.append('isEmploymentPublic', String(privacySettings.isEmploymentPublic));
      formDataToSend.append('isCompanyPublic', String(privacySettings.isCompanyPublic));
      formDataToSend.append('isLocationPublic', String(privacySettings.isLocationPublic));
      formDataToSend.append('isSocialLinksPublic', String(privacySettings.isSocialLinksPublic));
      formDataToSend.append('isSkillsPublic', String(privacySettings.isSkillsPublic));
      
      if (profileImageFile) {
        formDataToSend.append('profileImage', profileImageFile);
      }

      const response = await fetch(`${API_BASE_URL}/auth/profile/${user.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });

      const data = await readResponseBody(response);

      if (!response.ok) {
        throw new Error(data?.error || data?.message || 'Failed to update profile');
      }

      // Update user data in localStorage
      const normalizedAlumni = data.alumni
        ? {
            ...data.alumni,
            firstName: data.alumni.firstName || data.alumni.first_name || '',
            middleName: data.alumni.middleName || data.alumni.middle_name || '',
            lastName: data.alumni.lastName || data.alumni.last_name || '',
            studentId: data.alumni.studentId || data.alumni.student_id || '',
            student_id: data.alumni.student_id || data.alumni.studentId || '',
            contactNumber: data.alumni.contactNumber || data.alumni.contact_number || '',
            dateOfBirth: formatDateForInput(data.alumni.dateOfBirth || data.alumni.date_of_birth),
            ...privacySettingsToAlumniFields(privacySettings)
          }
        : { ...(user.alumni || {}), ...privacySettingsToAlumniFields(privacySettings) };
      const normalizedHistory = normalizeEducationHistory(normalizedAlumni || {});
      const syncedReturnedHistory = syncPrimaryEducationWithGraduationYear(
        normalizedHistory,
        normalizedAlumni?.graduationYear || normalizedAlumni?.graduation_year || formData.graduationYear || '',
        normalizedAlumni?.level || formData.level || ''
      );
      const hasReturnedHistory = syncedReturnedHistory.some((entry) => entry.level);
      const finalEducationHistory = hasReturnedHistory ? syncedReturnedHistory : cleanedEducationHistory;

      const updatedUser = {
        ...user,
        username: data.user.username,
        email: data.user.email,
        profile_image: data.user.profile_image,
        role: data.user.role || user.role,
        approval_status: data.user.approval_status || user.approval_status || 'APPROVED',
        is_active: typeof data.user.is_active === 'boolean' ? data.user.is_active : (typeof user.is_active === 'boolean' ? user.is_active : true),
        alumni: {
          ...(normalizedAlumni || {}),
          educationHistory: finalEducationHistory,
          education_history: finalEducationHistory
        }
      };
      
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setEducationHistory(finalEducationHistory.length > 0 ? finalEducationHistory : [createEducationEntry()]);
      setPrivacySettings(privacySettings);
      setIsEditing(false);
      setProfileImageFile(null);
      toast.success('Profile updated successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleEducationHistoryChange = (index, field, value) => {
    const currentPrimaryIndex = educationHistory.reduce(
      (primaryIndex, entry, entryIndex) => (entry.level ? entryIndex : primaryIndex),
      -1
    );
    const isPrimaryEntry = index === (currentPrimaryIndex === -1 ? 0 : currentPrimaryIndex);

    if (field === 'batch' && isPrimaryEntry) {
      setFormData((prev) => ({
        ...prev,
        batch: value,
        graduationYear: value || prev.graduationYear
      }));
    }

    setEducationHistory((prev) => prev.map((entry, i) => {
      if (i !== index) return entry;
      return {
        ...entry,
        [field]: value,
        ...(field === 'batch' && isPrimaryEntry ? { graduationYear: value } : {})
      };
    }));
  };

  const addEducationHistoryEntry = () => {
    setEducationHistory((prev) => [...prev, createEducationEntry()]);
  };

  const removeEducationHistoryEntry = (index) => {
    setEducationHistory((prev) => {
      if (prev.length === 1) return [createEducationEntry()];
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleCareerFormChange = (event) => {
    const { name, value, checked, type } = event.target;
    setCareerForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
      ...(name === 'is_current' && checked ? { end_date: '' } : {})
    }));
  };

  const resetCareerForm = () => {
    setCareerForm(createCareerForm());
    setEditingCareerId(null);
    setShowCareerForm(false);
  };

  const handleEditCareer = (career) => {
    setEditingCareerId(career.id);
    setCareerForm({
      job_title: career.job_title || '',
      company: career.company || '',
      start_date: formatDateForInput(career.start_date),
      end_date: formatDateForInput(career.end_date),
      is_current: Boolean(career.is_current),
      description: career.description || ''
    });
    setShowCareerForm(true);
  };

  const handleSaveCareer = async (event) => {
    event?.preventDefault?.();
    if (!user?.alumni?.id) {
      toast.error('Alumni profile not found for this account');
      return;
    }
    if (!careerForm.job_title.trim() || !careerForm.company.trim()) {
      toast.error('Position and company are required');
      return;
    }

    setCareerSubmitting(true);
    try {
      if (editingCareerId) {
        const updated = await careerService.updateCareer(editingCareerId, careerForm);
        setCareerHistory((prev) => prev.map((career) => (career.id === editingCareerId ? updated : career)));
        toast.success('Employment history updated');
      } else {
        const created = await careerService.createCareer({
          ...careerForm,
          alumni_id: Number(user.alumni.id)
        });
        setCareerHistory((prev) => [created, ...prev]);
        toast.success('Employment history saved');
      }
      resetCareerForm();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save employment history');
    } finally {
      setCareerSubmitting(false);
    }
  };

  const handleDeleteCareer = (careerId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Employment Record',
      message: 'This will permanently remove this employment record from your profile.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger',
      onConfirm: async () => {
        try {
          await careerService.deleteCareer(careerId);
          setCareerHistory((prev) => prev.filter((career) => career.id !== careerId));
          if (editingCareerId === careerId) resetCareerForm();
          toast.success('Employment history deleted');
        } catch (error) {
          toast.error(error.response?.data?.error || 'Failed to delete employment history');
        }
      }
    });
  };


  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading profile...</div>
      </div>
    );
  }

  const profileAlumni = user.alumni || {};
  const displayClassYear = getDisplayClassYear(profileAlumni, formData.graduationYear);
  const displayEducationHistory = syncPrimaryEducationWithGraduationYear(
    normalizeEducationHistory(profileAlumni),
    displayClassYear,
    profileAlumni.level || formData.level
  ).filter((entry) => entry.level);

  return (
    <UserLayout>
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        type={confirmModal.type}
      />
      <div className="bg-gray-50 py-8">
      <div className="w-full px-4 sm:px-6 lg:px-8 mx-auto">
        {/* Enhanced Header */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6">
          {/* Gradient Background with Pattern */}
          <div className="relative bg-gradient-to-br from-blue-800 via-blue-900 to-indigo-900 px-6 py-8 sm:px-8">
            {/* Decorative Pattern Overlay */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                backgroundSize: '32px 32px'
              }}></div>
            </div>
            
            {/* Content — Single Row Layout */}
            <div className="relative flex flex-col lg:flex-row items-center gap-5 w-full">
              {/* Avatar */}
              <div className="relative group flex-shrink-0">
                {user.profile_image ? (
                  <div className="relative">
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full opacity-75 blur group-hover:opacity-100 transition duration-300"></div>
                    <img 
                      src={`${IMAGE_BASE_URL}${user.profile_image}`} 
                      alt={user.username || 'User'} 
                      className="relative w-20 h-20 rounded-full object-cover border-3 border-white shadow-2xl ring-3 ring-blue-400/50"
                    />
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full opacity-75 blur"></div>
                    <div className="relative w-20 h-20 rounded-full bg-white flex items-center justify-center text-blue-600 text-3xl font-bold shadow-2xl ring-3 ring-blue-400/50">
                      {user.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  </div>
                )}
                {/* Status Indicator */}
                <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-400 rounded-full border-3 border-white shadow-lg"></div>
              </div>
              
              {/* User Information */}
              <div className="text-white text-center lg:text-left flex-shrink-0">
                <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">{user.username || 'User'}</h1>
                <div className="flex items-center gap-2 mt-1 text-blue-100 justify-center lg:justify-start">
                  <svg className="w-4 h-4 text-blue-200" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                  <span className="text-sm font-medium">{user.email || ''}</span>
                </div>
                {/* Role Badge */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
                  <svg className="w-3.5 h-3.5 text-blue-200" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                  <span className="text-[11px] font-semibold text-white tracking-wide uppercase">
                    {(user?.role || '').toUpperCase() === 'TEACHER' ? 'Teacher' : 'Alumni'}
                  </span>
                </div>
              </div>

              {/* Divider — visible on lg+ */}
              <div className="hidden lg:block w-px h-16 bg-white/15 flex-shrink-0"></div>

              {/* Right Side: Inline Alumni Spotlight — pushed to the right */}
              <div className="hidden lg:flex ml-auto bg-white/[0.07] backdrop-blur-md rounded-xl border border-white/10 px-5 py-3.5 text-white items-center gap-5 flex-shrink-0">
                {/* Spotlight Label */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200">
                    {(user?.role || '').toUpperCase() === 'TEACHER' ? 'Faculty' : 'Spotlight'}
                  </span>
                </div>

                {/* Academic / Faculty Info */}
                {(user?.role || '').toUpperCase() === 'TEACHER' ? (
                  <div className="flex items-center gap-6 flex-1 min-w-0">
                    <div className="min-w-0">
                      <span className="text-[9px] text-blue-300 uppercase font-semibold tracking-wider">Department</span>
                      <p className="text-sm font-semibold text-white truncate">{user.department || 'LCCB Faculty'}</p>
                    </div>
                    <div className="min-w-0">
                      <span className="text-[9px] text-blue-300 uppercase font-semibold tracking-wider">Role</span>
                      <p className="text-sm font-semibold text-white">{user.teacherRole === 'ADMIN' ? 'Admin' : 'Academic Staff'}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-6 flex-1 min-w-0 flex-wrap xl:flex-nowrap">
                    {/* Academic Record */}
                    <div className="min-w-0">
                      <span className="text-[9px] text-blue-300 uppercase font-semibold tracking-wider">Academic Record</span>
                      <p className="text-sm font-semibold text-white truncate">
                        {user.alumni?.course || 'BSIT'} — {user.alumni?.level === 'COLLEGE' ? 'College' : user.alumni?.level === 'SENIOR_HIGH' ? 'Senior High' : 'High School'}
                      </p>
                    </div>

                    {/* Class Year */}
                    <div className="flex-shrink-0">
                      <span className="text-[9px] text-blue-300 uppercase font-semibold tracking-wider">Class</span>
                      <p className="text-sm font-semibold text-white">
                        {displayClassYear || '-'}
                      </p>
                    </div>

                    {/* Divider dot */}
                    <div className="hidden xl:block w-1 h-1 rounded-full bg-white/20 flex-shrink-0"></div>

                    {/* Current Profession */}
                    {(user.alumni?.currentPosition || user.alumni?.current_position) ? (
                      <div className="min-w-0">
                        <span className="text-[9px] text-blue-300 uppercase font-semibold tracking-wider">Profession</span>
                        <p className="text-sm font-semibold text-white truncate">
                          {user.alumni?.currentPosition || user.alumni?.current_position}
                          {user.alumni?.company && (
                            <span className="text-blue-200 font-normal text-xs ml-1">at {user.alumni.company}</span>
                          )}
                        </p>
                      </div>
                    ) : (
                      <div className="min-w-0">
                        <span className="text-[9px] text-blue-300 uppercase font-semibold tracking-wider">Status</span>
                        <p className="text-xs text-blue-200 italic">Not listed</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>



        {/* Profile Information */}
        <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Profile Information</h2>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors text-sm font-medium"
              >
                Edit Profile
              </button>
            )}
          </div>

          {isEditing ? (
            <form onSubmit={handleUpdateProfile} className="space-y-5">
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-blue-900 bg-gray-100">
                    {profileImagePreview ? (
                      <img src={profileImagePreview} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl text-blue-600 font-bold">
                        {formData.username?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 bg-blue-900 text-white p-2 rounded-full cursor-pointer hover:bg-blue-800">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-blue-900 focus:ring-2 focus:ring-blue-200 transition-colors"
                    required
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Email Address
                    </label>
                    <PrivacyToggle
                      label="Email"
                      isPublic={privacySettings.isEmailPublic}
                      onToggle={() => togglePrivacy('isEmailPublic')}
                    />
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                    required
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Contact Number
                    </label>
                    <PrivacyToggle
                      label="Contact number"
                      isPublic={privacySettings.isPhonePublic}
                      onToggle={() => togglePrivacy('isPhonePublic')}
                    />
                  </div>
                  <input
                    type="tel"
                    name="contactNumber"
                    value={formData.contactNumber}
                    onChange={handleChange}
                    placeholder="e.g., 0917 123 4567"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                  />
                </div>
              </div>

              {/* Alumni Information Section */}
              <div className="pt-4 mt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Alumni Information</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Middle Name
                    </label>
                    <input
                      type="text"
                      name="middleName"
                      value={formData.middleName}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                    />
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <label className="block text-sm font-medium text-gray-700">
                        School ID / Student Number
                      </label>
                      <PrivacyToggle
                        label="School ID"
                        isPublic={privacySettings.isStudentIdPublic}
                        onToggle={() => togglePrivacy('isStudentIdPublic')}
                      />
                    </div>
                    <input
                      type="text"
                      name="studentId"
                      value={formData.studentId}
                      onChange={handleChange}
                      placeholder="Optional"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                    />
                  </div>

                      <div>
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <label className="block text-sm font-medium text-gray-700">
                            Date of Birth
                          </label>
                          <PrivacyToggle
                            label="Date of birth"
                            isPublic={privacySettings.isDateOfBirthPublic}
                            onToggle={() => togglePrivacy('isDateOfBirthPublic')}
                          />
                        </div>
                        <input
                          type="date"
                          name="dateOfBirth"
                          value={formData.dateOfBirth}
                          onChange={handleChange}
                          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                        />
                      </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <label className="block text-sm font-medium text-gray-700">
                        Course
                      </label>
                      <PrivacyToggle
                        label="Course"
                        isPublic={privacySettings.isCoursePublic}
                        onToggle={() => togglePrivacy('isCoursePublic')}
                      />
                    </div>
                    <input
                      type="text"
                      name="course"
                      value={formData.course}
                      onChange={handleChange}
                      placeholder="e.g., Bachelor of Science in Computer Science"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                    />
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <label className="block text-sm font-medium text-gray-700">
                        Graduation Year
                      </label>
                      <PrivacyToggle
                        label="Graduation year"
                        isPublic={privacySettings.isGraduationYearPublic}
                        onToggle={() => togglePrivacy('isGraduationYearPublic')}
                      />
                    </div>
                    <input
                      type="number"
                      name="graduationYear"
                      value={formData.graduationYear}
                      onChange={handleChange}
                      min="1990"
                      max="2030"
                      placeholder="e.g., 2026"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                    />
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <label className="block text-sm font-medium text-gray-700">
                        Current Position
                      </label>
                      <PrivacyToggle
                        label="Current employment"
                        isPublic={privacySettings.isPositionPublic}
                        onToggle={() => togglePrivacy('isPositionPublic')}
                      />
                    </div>
                    <input
                      type="text"
                      name="currentPosition"
                      value={formData.currentPosition}
                      onChange={handleChange}
                      placeholder="e.g., Software Engineer"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                    />
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <label className="block text-sm font-medium text-gray-700">
                        Company
                      </label>
                      <PrivacyToggle
                        label="Company"
                        isPublic={privacySettings.isCompanyPublic}
                        onToggle={() => togglePrivacy('isCompanyPublic')}
                      />
                    </div>
                    <input
                      type="text"
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      placeholder="e.g., Tech Corp"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                    />
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <label className="block text-sm font-medium text-gray-700">
                        Location
                      </label>
                      <PrivacyToggle
                        label="Address"
                        isPublic={privacySettings.isLocationPublic}
                        onToggle={() => togglePrivacy('isLocationPublic')}
                      />
                    </div>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      placeholder="e.g., Manila, Philippines"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <h4 className="text-base font-semibold text-gray-900">Education History</h4>
                      <PrivacyToggle
                        label="Education history"
                        isPublic={privacySettings.isEducationHistoryPublic}
                        onToggle={() => togglePrivacy('isEducationHistoryPublic')}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={addEducationHistoryEntry}
                      className="app-secondary-button px-3 py-1.5 text-sm"
                    >
                      Add Level & Batch
                    </button>
                  </div>
                  <div className="space-y-3">
                    {educationHistory.map((entry, index) => (
                      <div key={`edu-${index}`} className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Level</label>
                          <select
                            value={entry.level}
                            onChange={(e) => handleEducationHistoryChange(index, 'level', e.target.value)}
                            className="app-select"
                          >
                            <option value="">Select Level</option>
                            <option value="INTEGRATED_SCHOOL">Integrated School</option>
                            <option value="NIGHT_HIGH">Night High</option>
                            <option value="SENIOR_HIGH">Senior High</option>
                            <option value="COLLEGE">College</option>
                            <option value="ETEEAP">ETEEAP</option>
                            <option value="GRAD_SCHOOL">Grad School</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Batch</label>
                          <select
                            value={entry.batch}
                            onChange={(e) => handleEducationHistoryChange(index, 'batch', e.target.value)}
                            className="app-select"
                          >
                            <option value="">Select Batch</option>
                            {batches.map((batch) => (
                              <option key={`batch-option-${batch}`} value={batch}>{batch}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-end justify-between gap-3">
                          <div className="text-xs text-gray-500">The primary entry follows your graduation year for a consistent class year.</div>
                          <button
                            type="button"
                            onClick={() => removeEducationHistoryEntry(index)}
                            className="text-xs text-red-600 hover:text-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 border-t border-gray-200 pt-6">
                  <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <h4 className="text-base font-semibold text-gray-900">Employment History</h4>
                      <PrivacyToggle
                        label="Employment history"
                        isPublic={privacySettings.isEmploymentPublic}
                        onToggle={() => togglePrivacy('isEmploymentPublic')}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (showCareerForm) {
                          resetCareerForm();
                        } else {
                          setShowCareerForm(true);
                        }
                      }}
                      className="app-secondary-button px-3 py-1.5 text-sm"
                    >
                      {showCareerForm ? 'Cancel' : 'Add Employment'}
                    </button>
                  </div>

                  {showCareerForm && (
                    <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                      <h5 className="mb-3 text-sm font-semibold text-slate-900">
                        {editingCareerId ? 'Edit Employment Record' : 'Add Employment Record'}
                      </h5>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-slate-600">Position *</label>
                          <input
                            type="text"
                            name="job_title"
                            value={careerForm.job_title}
                            onChange={handleCareerFormChange}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-slate-600">Company *</label>
                          <input
                            type="text"
                            name="company"
                            value={careerForm.company}
                            onChange={handleCareerFormChange}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-slate-600">Start Date</label>
                          <input
                            type="date"
                            name="start_date"
                            value={careerForm.start_date}
                            onChange={handleCareerFormChange}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-slate-600">End Date</label>
                          <input
                            type="date"
                            name="end_date"
                            value={careerForm.end_date}
                            onChange={handleCareerFormChange}
                            disabled={careerForm.is_current}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                          />
                        </div>
                        <label className="flex items-center gap-2 rounded-lg border border-blue-100 bg-white px-3 py-2 text-sm font-medium text-slate-700 sm:col-span-2">
                          <input
                            type="checkbox"
                            name="is_current"
                            checked={careerForm.is_current}
                            onChange={handleCareerFormChange}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          I currently work here
                        </label>
                        <div className="sm:col-span-2">
                          <label className="mb-1 block text-xs font-semibold text-slate-600">Description</label>
                          <textarea
                            name="description"
                            value={careerForm.description}
                            onChange={handleCareerFormChange}
                            rows="3"
                            className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                          />
                        </div>
                      </div>
                      <div className="mt-4 flex justify-end">
                        <button
                          type="button"
                          onClick={handleSaveCareer}
                          disabled={careerSubmitting}
                          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {careerSubmitting ? 'Saving...' : editingCareerId ? 'Update Employment' : 'Save Employment'}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {careerHistory.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">No employment history added yet.</p>
                    ) : (
                      careerHistory.map((career) => (
                        <div key={career.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="font-semibold text-slate-900">{career.job_title}</p>
                              <p className="text-sm font-medium text-blue-700">{career.company}</p>
                            </div>
                            <div className="flex flex-col items-start gap-2 sm:items-end">
                              <p className="text-xs text-slate-500">
                                {formatCareerDate(career.start_date)} - {career.is_current ? 'Present' : formatCareerDate(career.end_date)}
                              </p>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleEditCareer(career)}
                                  className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-50"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCareer(career.id)}
                                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                          <ProgramMatchReview value={career.program_alignment} notes={career.alignment_notes} />
                          {career.description && <p className="mt-2 text-sm text-slate-600">{career.description}</p>}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  <div className="mb-2 flex items-center gap-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Skills
                    </label>
                    <PrivacyToggle
                      label="Skills"
                      isPublic={privacySettings.isSkillsPublic}
                      onToggle={() => togglePrivacy('isSkillsPublic')}
                    />
                  </div>
                  <textarea
                    name="skills"
                    value={formData.skills}
                    onChange={handleChange}
                    rows="4"
                    placeholder="List your skills (e.g., JavaScript, React, Node.js, etc.)"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors resize-none"
                  />
                </div>

                {/* Social Links Section */}
                <div className="mt-6 border-t pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <label className="block text-sm font-medium text-gray-700">
                        Social Media Links
                      </label>
                      <PrivacyToggle
                        label="Social media links"
                        isPublic={privacySettings.isSocialLinksPublic}
                        onToggle={() => togglePrivacy('isSocialLinksPublic')}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddSocialLink(!showAddSocialLink)}
                      className="app-secondary-button px-3 py-1.5 text-sm"
                    >
                      {showAddSocialLink ? 'Cancel' : 'Add Link'}
                    </button>
                  </div>

                  {showAddSocialLink && (
                    <div className="bg-gray-50 p-4 rounded-lg mb-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">URL</label>
                        <input
                          type="url"
                          value={newSocialLink.url}
                          onChange={(e) => setNewSocialLink({ url: e.target.value })}
                          placeholder="https://facebook.com/yourprofile or https://linkedin.com/in/yourname"
                          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddSocialLink}
                        className="mt-3 app-primary-button-sm"
                      >
                        Add Link
                      </button>
                    </div>
                  )}

                  <div className="space-y-2">
                    {socialLinks.length > 0 ? (
                      socialLinks.map((link) => (
                        <div key={link.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-gray-700">{link.platform}</span>
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:text-blue-700 truncate max-w-xs"
                            >
                              {link.url}
                            </a>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteSocialLink(link.id)}
                            className="text-red-600 hover:text-red-700 text-sm font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 py-2">No social links added yet</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="app-primary-button disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const resetEducationHistory = normalizeEducationHistory(user.alumni || {});
                    const syncedResetEducationHistory = syncPrimaryEducationWithGraduationYear(
                      resetEducationHistory,
                      user.alumni?.graduationYear || user.alumni?.graduation_year || '',
                      user.alumni?.level || ''
                    );
                    const primaryEducation = getPrimaryEducation(syncedResetEducationHistory);
                    setIsEditing(false);
                    resetCareerForm();
                    setEducationHistory(syncedResetEducationHistory);
                    setFormData({
                      username: user.username || '',
                      email: user.email || '',
                      // Reset alumni fields
                      firstName: user.alumni?.firstName || user.alumni?.first_name || '',
                      middleName: user.alumni?.middleName || user.alumni?.middle_name || '',
                      lastName: user.alumni?.lastName || user.alumni?.last_name || '',
                      studentId: user.alumni?.studentId || user.alumni?.student_id || '',
                      dateOfBirth: formatDateForInput(user.alumni?.dateOfBirth || user.alumni?.date_of_birth),
                      level: primaryEducation.level || '',
                      course: user.alumni?.course || '',
                      batch: primaryEducation.batch || '',
                      graduationYear: user.alumni?.graduationYear || user.alumni?.graduation_year || '',
                      currentPosition: user.alumni?.currentPosition || user.alumni?.current_position || '',
                      company: user.alumni?.company || '',
                      location: user.alumni?.location || '',
                      contactNumber: user.alumni?.contactNumber || user.alumni?.contact_number || '',
                      skills: user.alumni?.skills || ''
                    });
                    setPrivacySettings(normalizePrivacySettings(user.alumni || {}));
                  }}
                  className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Username</label>
                  <p className="text-lg text-gray-900">{user.username || 'Not set'}</p>
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <label className="block text-sm font-medium text-gray-500">Email</label>
                    <PrivacyToggle
                      label="Email"
                      isPublic={privacySettings.isEmailPublic}
                      onToggle={() => togglePrivacy('isEmailPublic')}
                      disabled
                    />
                  </div>
                  <p className="text-lg text-gray-900">{user.email || 'Not set'}</p>
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <label className="block text-sm font-medium text-gray-500">Contact Number</label>
                    <PrivacyToggle
                      label="Contact number"
                      isPublic={privacySettings.isPhonePublic}
                      onToggle={() => togglePrivacy('isPhonePublic')}
                      disabled
                    />
                  </div>
                  <p className="text-lg text-gray-900">{profileAlumni.contactNumber || profileAlumni.contact_number || formData.contactNumber || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Role</label>
                  <p className="text-lg text-gray-900 uppercase">{(user?.role || '').toUpperCase() === 'TEACHER' ? 'TEACHER' : 'ALUMNI'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Account Status</label>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    Active
                  </span>
                </div>
              </div>

              {/* Alumni Information Display */}
              <div className="pt-6 mt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Alumni Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">First Name</label>
                    <p className="text-lg text-gray-900">{profileAlumni.firstName || profileAlumni.first_name || formData.firstName || 'Not set'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Middle Name</label>
                    <p className="text-lg text-gray-900">{profileAlumni.middleName || profileAlumni.middle_name || formData.middleName || 'Not set'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Last Name</label>
                    <p className="text-lg text-gray-900">{profileAlumni.lastName || profileAlumni.last_name || formData.lastName || 'Not set'}</p>
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <label className="block text-sm font-medium text-gray-500">School ID / Student Number</label>
                      <PrivacyToggle
                        label="School ID"
                        isPublic={privacySettings.isStudentIdPublic}
                        onToggle={() => togglePrivacy('isStudentIdPublic')}
                        disabled
                      />
                    </div>
                    <p className="text-lg text-gray-900 font-mono">{profileAlumni.studentId || profileAlumni.student_id || formData.studentId || 'Not provided'}</p>
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <label className="block text-sm font-medium text-gray-500">Date of Birth</label>
                      <PrivacyToggle
                        label="Date of birth"
                        isPublic={privacySettings.isDateOfBirthPublic}
                        onToggle={() => togglePrivacy('isDateOfBirthPublic')}
                        disabled
                      />
                    </div>
                    <p className="text-lg text-gray-900">{formatDateOfBirth(profileAlumni.dateOfBirth || profileAlumni.date_of_birth || formData.dateOfBirth)}</p>
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <label className="block text-sm font-medium text-gray-500">Course</label>
                      <PrivacyToggle
                        label="Course"
                        isPublic={privacySettings.isCoursePublic}
                        onToggle={() => togglePrivacy('isCoursePublic')}
                        disabled
                      />
                    </div>
                    <p className="text-lg text-gray-900">{profileAlumni.course || formData.course || 'Not set'}</p>
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <label className="block text-sm font-medium text-gray-500">Graduation Year</label>
                      <PrivacyToggle
                        label="Graduation year"
                        isPublic={privacySettings.isGraduationYearPublic}
                        onToggle={() => togglePrivacy('isGraduationYearPublic')}
                        disabled
                      />
                    </div>
                    <p className="text-lg text-gray-900">{profileAlumni.graduationYear || profileAlumni.graduation_year || formData.graduationYear || 'Not set'}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <div className="mb-2 flex items-center gap-3">
                      <label className="block text-sm font-medium text-gray-500">Education History</label>
                      <PrivacyToggle
                        label="Education history"
                        isPublic={privacySettings.isEducationHistoryPublic}
                        onToggle={() => togglePrivacy('isEducationHistoryPublic')}
                        disabled
                      />
                    </div>
                    <div className="space-y-2">
                      {displayEducationHistory.length > 0 ? (
                        displayEducationHistory
                          .map((entry, index) => (
                            <div key={`education-readonly-${index}`} className="rounded-lg border border-gray-200 px-3 py-2 bg-gray-50 text-sm text-gray-900">
                              {formatEducationHistoryLine(entry, displayClassYear)}
                            </div>
                          ))
                      ) : (
                        <p className="text-gray-900">Not set</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <label className="block text-sm font-medium text-gray-500">Current Position</label>
                      <PrivacyToggle
                        label="Current employment"
                        isPublic={privacySettings.isPositionPublic}
                        onToggle={() => togglePrivacy('isPositionPublic')}
                        disabled
                      />
                    </div>
                    <p className="text-lg text-gray-900">{profileAlumni.currentPosition || profileAlumni.current_position || formData.currentPosition || 'Not set'}</p>
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <label className="block text-sm font-medium text-gray-500">Company</label>
                      <PrivacyToggle
                        label="Company"
                        isPublic={privacySettings.isCompanyPublic}
                        onToggle={() => togglePrivacy('isCompanyPublic')}
                        disabled
                      />
                    </div>
                    <p className="text-lg text-gray-900">{profileAlumni.company || formData.company || 'Not set'}</p>
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <label className="block text-sm font-medium text-gray-500">Location</label>
                      <PrivacyToggle
                        label="Address"
                        isPublic={privacySettings.isLocationPublic}
                        onToggle={() => togglePrivacy('isLocationPublic')}
                        disabled
                      />
                    </div>
                    <p className="text-lg text-gray-900">{profileAlumni.location || formData.location || 'Not set'}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <label className="block text-sm font-medium text-gray-500">Employment History</label>
                        <PrivacyToggle
                          label="Employment history"
                          isPublic={privacySettings.isEmploymentPublic}
                          onToggle={() => togglePrivacy('isEmploymentPublic')}
                          disabled
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      {careerHistory.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">No employment history added yet.</p>
                      ) : (
                        careerHistory.map((career) => (
                          <div key={career.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <p className="font-semibold text-slate-900">{career.job_title}</p>
                                <p className="text-sm font-medium text-blue-700">{career.company}</p>
                              </div>
                              <p className="text-xs text-slate-500">
                                {formatCareerDate(career.start_date)} - {career.is_current ? 'Present' : formatCareerDate(career.end_date)}
                              </p>
                            </div>
                            <ProgramMatchReview value={career.program_alignment} notes={career.alignment_notes} />
                            {career.description && <p className="mt-2 text-sm text-slate-600">{career.description}</p>}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <div className="mb-1 flex items-center gap-3">
                      <label className="block text-sm font-medium text-gray-500">Skills</label>
                      <PrivacyToggle
                        label="Skills"
                        isPublic={privacySettings.isSkillsPublic}
                        onToggle={() => togglePrivacy('isSkillsPublic')}
                        disabled
                      />
                    </div>
                    <p className="text-gray-900">{profileAlumni.skills || formData.skills || 'Not set'}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <div className="mb-1 flex items-center gap-3">
                      <label className="block text-sm font-medium text-gray-500">Social Media Links</label>
                      <PrivacyToggle
                        label="Social media links"
                        isPublic={privacySettings.isSocialLinksPublic}
                        onToggle={() => togglePrivacy('isSocialLinksPublic')}
                        disabled
                      />
                    </div>
                    <p className="text-gray-900">{socialLinks.length > 0 ? `${socialLinks.length} link${socialLinks.length === 1 ? '' : 's'} added` : 'No social links added yet'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </UserLayout>
  );
};

export default Profile;

import React, { useState, useEffect, useMemo } from 'react';
import { authService } from '../services/authService';
import { API_BASE_URL, IMAGE_BASE_URL } from '../config/apiBaseUrl';
import { realtimeClient } from '../services/realtimeClient';
import { toast } from 'react-toastify';
import UserLayout from './UserLayout';
import backgroundImage from '../assets/homeimage.jpg';

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
  isPositionPublic: pickPrivacyFlag(alumni, 'isPositionPublic', 'is_position_public', DEFAULT_PRIVACY_SETTINGS.isPositionPublic) && pickPrivacyFlag(alumni, 'isEmploymentPublic', 'is_employment_public', DEFAULT_PRIVACY_SETTINGS.isPositionPublic),
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
  isEmploymentPublic: settings.isPositionPublic,
  is_employment_public: settings.isPositionPublic,
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
      const primaryEducation = getPrimaryEducation(normalizedHistory);

      const updatedUser = {
        ...serverUser,
        alumni: normalizedAlumni
      };

      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      window.dispatchEvent(new CustomEvent(PROFILE_UPDATED_EVENT, { detail: updatedUser }));

      setFormData((prev) => ({
        ...prev,
        username: updatedUser.username || '',
        email: updatedUser.email || '',
        firstName: normalizedAlumni?.firstName || '',
        middleName: normalizedAlumni?.middleName || '',
        lastName: normalizedAlumni?.lastName || '',
        studentId: normalizedAlumni?.studentId || normalizedAlumni?.student_id || '',
        dateOfBirth: formatDateForInput(normalizedAlumni?.dateOfBirth || normalizedAlumni?.date_of_birth),
        level: primaryEducation.level || '',
        course: normalizedAlumni?.course || '',
        batch: primaryEducation.batch || '',
        graduationYear: normalizedAlumni?.graduationYear || '',
        currentPosition: normalizedAlumni?.currentPosition || '',
        company: normalizedAlumni?.company || '',
        location: normalizedAlumni?.location || '',
        contactNumber: normalizedAlumni?.contactNumber || normalizedAlumni?.contact_number || '',
        skills: normalizedAlumni?.skills || ''
      }));
      setPrivacySettings(normalizePrivacySettings(normalizedAlumni || {}));
      setEducationHistory(normalizedHistory);

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

  useEffect(() => {
    const userData = authService.getCurrentUser();
    if (userData) {
      const userEducationHistory = normalizeEducationHistory(userData.alumni || {});
      const primaryEducation = getPrimaryEducation(userEducationHistory);
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
      setEducationHistory(userEducationHistory);
      if (userData.profile_image) {
        setProfileImagePreview(`${IMAGE_BASE_URL}${userData.profile_image}`);
      }
      // Fetch latest alumni details (including social links) from API
      if (userData.alumni?.id) {
        fetchLatestAlumniDetails(userData.alumni.id);
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

    return () => {
      window.removeEventListener('focus', onFocus);
      unsubProfile();
      unsubAlumni();
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

        // Keep profile synced with backend values (city + country location, etc.).
        const normalizedAlumni = {
          ...data,
          firstName: data.firstName || data.first_name || '',
          middleName: data.middleName || data.middle_name || '',
          lastName: data.lastName || data.last_name || '',
          studentId: data.studentId || data.student_id || '',
          student_id: data.student_id || data.studentId || '',
          graduationYear: data.graduationYear || data.graduation_year || '',
          dateOfBirth: formatDateForInput(data.dateOfBirth || data.date_of_birth),
          currentPosition: data.currentPosition || data.current_position || '',
          contactNumber: data.contactNumber || data.contact_number || ''
        };
        const normalizedHistory = normalizeEducationHistory(normalizedAlumni);
        const primaryEducation = getPrimaryEducation(normalizedHistory);

        setUser((prev) => {
          if (!prev) return prev;
          const updatedUser = { ...prev, alumni: normalizedAlumni };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          return updatedUser;
        });

        setFormData((prev) => ({
          ...prev,
          firstName: normalizedAlumni.firstName,
          middleName: normalizedAlumni.middleName,
          lastName: normalizedAlumni.lastName,
          studentId: normalizedAlumni.studentId || normalizedAlumni.student_id || '',
          dateOfBirth: formatDateForInput(normalizedAlumni.dateOfBirth || normalizedAlumni.date_of_birth),
          level: primaryEducation.level || '',
          course: normalizedAlumni.course || '',
          batch: primaryEducation.batch || '',
          graduationYear: normalizedAlumni.graduationYear || '',
          currentPosition: normalizedAlumni.currentPosition || '',
          company: normalizedAlumni.company || '',
          location: normalizedAlumni.location || '',
          contactNumber: normalizedAlumni.contactNumber || normalizedAlumni.contact_number || '',
          skills: normalizedAlumni.skills || ''
        }));
        setPrivacySettings(normalizePrivacySettings(normalizedAlumni));
        setEducationHistory(normalizedHistory);
      }
    } catch (error) {
      console.error('Error fetching alumni details:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
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
      const cleanedEducationHistory = educationHistory
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
      formDataToSend.append('isEmploymentPublic', String(privacySettings.isPositionPublic));
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
      const hasReturnedHistory = normalizedHistory.some((entry) => entry.level);
      const finalEducationHistory = hasReturnedHistory ? normalizedHistory : cleanedEducationHistory;

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
    setEducationHistory((prev) => prev.map((entry, i) => {
      if (i !== index) return entry;
      return {
        ...entry,
        [field]: value
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


  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading profile...</div>
      </div>
    );
  }

  const profileAlumni = user.alumni || {};

  return (
    <UserLayout>
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
                        {user.alumni?.graduationYear || user.alumni?.graduation_year || user.alumni?.batch || '—'}
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
                      + Add Level & Batch
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
                          <div className="text-xs text-gray-500">Select the level and matching batch for this entry.</div>
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

                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
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
                      {showAddSocialLink ? 'Cancel' : '+ Add Link'}
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
                    const primaryEducation = getPrimaryEducation(resetEducationHistory);
                    setIsEditing(false);
                    setEducationHistory(resetEducationHistory);
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
                      {normalizeEducationHistory(profileAlumni).filter((entry) => entry.level).length > 0 ? (
                        normalizeEducationHistory(profileAlumni)
                          .filter((entry) => entry.level)
                          .map((entry, index) => (
                            <div key={`education-readonly-${index}`} className="rounded-lg border border-gray-200 px-3 py-2 bg-gray-50 text-sm text-gray-900">
                              {formatLevelLabel(entry.level)}
                              {entry.batch ? `, Batch ${entry.batch}` : ''}
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

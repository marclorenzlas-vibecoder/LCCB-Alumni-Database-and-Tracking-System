import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import alumniService from '../services/alumniService';
import { authService } from '../services/authService';

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
  if (!value) return '';
  return levelLabelMap[value] || value;
};

const formatDateOfBirth = (value) => {
  if (!value) return 'Not provided';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not provided';

  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
};

const AlumniProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportEvidenceLink, setReportEvidenceLink] = useState('');
  const [reportEvidenceFile, setReportEvidenceFile] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportStatusMessage, setReportStatusMessage] = useState('');

  const handleReportDeceasedSubmit = async (event) => {
    event.preventDefault();
    setReportLoading(true);
    setReportStatusMessage('');

    try {
      await alumniService.reportDeceased(id, {
        reason: reportReason,
        evidenceLink: reportEvidenceLink,
        evidenceFile: reportEvidenceFile
      });

      setReportStatusMessage('Your report was submitted successfully and is pending admin review.');
      setShowReportForm(false);
      setReportReason('');
      setReportEvidenceLink('');
      setReportEvidenceFile(null);
    } catch (error) {
      console.error('Error submitting deceased report:', error);
      setReportStatusMessage(error.message || 'Unable to submit report at this time.');
    } finally {
      setReportLoading(false);
    }
  };

  // Load profile data based on ID
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        const alumniData = await alumniService.getAlumniById(id);
        if (alumniData) {
          setProfile(alumniData);
        } else {
          // If no profile found, set a default error state
          setProfile({
            id: id,
            firstName: 'Profile',
            lastName: 'Not Found',
            graduationYear: 'N/A',
            course: 'N/A',
            currentPosition: 'N/A',
            company: 'N/A',
            location: 'N/A',
            email: 'N/A',
            dateOfBirth: null,
            skills: [],
            profileImage: '',
            bio: 'This alumni profile could not be found.',
            socialLinks: {},
            careerHistory: [],
            achievements: [],
            projects: []
          });
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [id]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900"></div>
            <p className="mt-4 text-gray-600">Loading displayProfile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Profile Not Found</h1>
            <p className="text-gray-600 mb-4">The requested alumni profile could not be found.</p>
            <button
              onClick={() => navigate('/alumni')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-900 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-900"
            >
              Back to Alumni Directory
            </button>
          </div>
        </div>
      </div>
    );
  }

  const privateLabel = 'Hidden by User';
  const canViewPrivate = authService.isTeacher();
  const parseBooleanFlag = (value, defaultValue = false) => {
    if (value === undefined || value === null) return defaultValue;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (['true', '1', 'yes', 'public'].includes(normalized)) return true;
      if (['false', '0', 'no', 'private'].includes(normalized)) return false;
    }
    return defaultValue;
  };
  const flagIsPublic = (camelKey, snakeKey, defaultValue = false) => {
    if (canViewPrivate) return true;
    const val = profile[camelKey] ?? profile[snakeKey];
    return parseBooleanFlag(val, defaultValue);
  };
  const isStudentIdPublic = flagIsPublic('isStudentIdPublic', 'is_student_id_public', false);
  const isDateOfBirthPublic = flagIsPublic('isDateOfBirthPublic', 'is_date_of_birth_public', false);
  const isCoursePublic = flagIsPublic('isCoursePublic', 'is_course_public', true);
  const isGraduationYearPublic = flagIsPublic('isGraduationYearPublic', 'is_graduation_year_public', true);
  const isEducationHistoryPublic = flagIsPublic('isEducationHistoryPublic', 'is_education_history_public', true);
  const isEmailPublic = flagIsPublic('isEmailPublic', 'is_email_public', false);
  const isPhonePublic = flagIsPublic('isPhonePublic', 'is_phone_public', false);
  const isPositionPublic = flagIsPublic('isPositionPublic', 'is_position_public', false);
  const isEmploymentPublic = flagIsPublic('isEmploymentPublic', 'is_employment_public', false);
  const isCompanyPublic = flagIsPublic('isCompanyPublic', 'is_company_public', false);
  const isLocationPublic = flagIsPublic('isLocationPublic', 'is_location_public', false);
  const isSocialLinksPublic = flagIsPublic('isSocialLinksPublic', 'is_social_links_public', false);
  const isSkillsPublic = flagIsPublic('isSkillsPublic', 'is_skills_public', false);

  const parsedSkills = useMemo(() => {
    if (!profile?.skills) return [];
    if (Array.isArray(profile.skills)) {
      return profile.skills
        .map((s) => (typeof s === 'string' ? s.trim() : s?.name?.trim() || ''))
        .filter(Boolean);
    }
    if (typeof profile.skills === 'string') {
      try {
        const parsed = JSON.parse(profile.skills);
        if (Array.isArray(parsed)) {
          return parsed
            .map((s) => (typeof s === 'string' ? s.trim() : s?.name?.trim() || ''))
            .filter(Boolean);
        }
      } catch {
        return profile.skills
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      }
    }
    return [];
  }, [profile]);

  // Merge actual profile data with default structure for compatibility
  const displayProfile = {
    ...profile,
    batch: profile.batch || `${(profile.graduationYear || 2020) - 4}-${profile.graduationYear || 2020}`,
    level: profile.level || '',
    dateOfBirth: isDateOfBirthPublic ? (profile.dateOfBirth || profile.date_of_birth || null) : null,
    student_id: isStudentIdPublic ? profile.student_id : null,
    course: isCoursePublic ? profile.course : null,
    graduationYear: isGraduationYearPublic ? profile.graduationYear : null,
    email: isEmailPublic ? (profile.email || 'Not provided') : privateLabel,
    contactNumber: isPhonePublic ? (profile.contactNumber || 'Not provided') : privateLabel,
    currentJob: isPositionPublic ? (profile.currentPosition || profile.currentJob || 'Not specified') : privateLabel,
    company: isCompanyPublic ? (profile.company || '') : '',
    location: isLocationPublic ? (profile.location || 'Not provided') : privateLabel,
    bio: profile.bio || `${profile.firstName || 'Alumni'} ${profile.lastName || ''} graduated from LCCB${isGraduationYearPublic && profile.graduationYear ? ` in ${profile.graduationYear}` : ''}${isCoursePublic && profile.course ? ` with a degree in ${profile.course}` : ''}${isPositionPublic && profile.currentPosition ? `. Currently working as ${profile.currentPosition}` : ''}${isCompanyPublic && profile.company ? ` at ${profile.company}` : ''}.`,
    coverImage: profile.coverImage || '',
    socialLinks: isSocialLinksPublic ? (profile.socialLinks || {
      linkedin: profile.linkedin || '#',
      github: '#',
      twitter: '#'
    }) : {},
    skills: isSkillsPublic && parsedSkills.length > 0 ? parsedSkills.map(skill => ({
      name: skill,
      level: 90,
      category: 'Technical'
    })) : [],
    careerHistory: profile.careerHistory && profile.careerHistory.length > 0 && isEmploymentPublic ? profile.careerHistory : (isEmploymentPublic && isPositionPublic && isCompanyPublic && profile.currentPosition && profile.company ? [
      { 
        id: '1', 
        company: profile.company || 'Not specified', 
        jobTitle: profile.currentPosition || 'Not specified', 
        startDate: 'Present', 
        endDate: 'Present',
        description: `Currently working at ${profile.company || 'this company'}.`,
        location: profile.location || 'Not specified',
        type: 'Current Position'
      }
    ] : []),
    education: isEducationHistoryPublic && profile.education && profile.education.length > 0 ? profile.education : (isEducationHistoryPublic ? [
      {
        id: '1',
        institution: 'LCCB - La Consolacion College of Biñan',
        degree: profile.course || 'Bachelor of Science',
        startYear: (profile.graduationYear || 2020) - 4,
        endYear: profile.graduationYear || 2020,
        gpa: 'N/A',
        achievements: []
      }
    ] : []),
    achievements: profile.achievements && profile.achievements.length > 0 ? profile.achievements : [],
    projects: profile.projects && profile.projects.length > 0 ? profile.projects : [],
    interests: profile.interests || ['Technology', 'Mentoring', 'Open Source'],
    languages: profile.languages || [
      { name: 'English', proficiency: 'Fluent' },
      { name: 'Filipino', proficiency: 'Native' }
    ]
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '👤' },
    { id: 'experience', label: 'Experience', icon: '💼' },
    { id: 'skills', label: 'Skills', icon: '🛠️' },
    { id: 'projects', label: 'Projects', icon: '🚀' },
    { id: 'achievements', label: 'Achievements', icon: '🏆' },
  ];

  const getSkillCategoryColor = (category) => {
    const colors = {
      'Programming': 'bg-blue-100 text-blue-900',
      'Frontend': 'bg-green-100 text-green-800',
      'Backend': 'bg-purple-100 text-purple-800',
      'Cloud': 'bg-orange-100 text-orange-800',
      'DevOps': 'bg-pink-100 text-pink-800',
      'Database': 'bg-yellow-100 text-yellow-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'In Progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'Planned':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderOverview = () => (
    <div className="space-y-8">
      {/* Bio Section */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">About</h3>
        <p className="text-gray-700 leading-relaxed">{displayProfile.bio}</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Personal Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-3">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <div>
              <p className="text-sm text-gray-500">Birthday</p>
              <p className="text-gray-700">{formatDateOfBirth(displayProfile.dateOfBirth)}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v11.494m-5.045-9.243a7.5 7.5 0 019.09 0M4.477 15.26a11.25 11.25 0 0115.046 0M2.25 12a15.75 15.75 0 0119.5 0" />
            </svg>
            <div>
              <p className="text-sm text-gray-500">Level</p>
              <p className="text-gray-700">{formatLevelLabel(displayProfile.level) || 'Not provided'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Information (Teachers/Admin only) */}
      {authService.isTeacher() && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Contact Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-3">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="text-gray-700">{displayProfile.email}</span>
            </div>
            <div className="flex items-center space-x-3">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span className="text-gray-700">{displayProfile.contactNumber}</span>
            </div>
            <div className="flex items-center space-x-3">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-gray-700">{displayProfile.location}</span>
            </div>
          </div>
        </div>
      )}

      {/* Social Links */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Social Links</h3>
        <div className="flex space-x-4">
          {Object.entries(displayProfile.socialLinks || {})
            .filter(([_, url]) => url && url !== '#')
            .map(([key, url]) => {
              if (!url) return null;
              switch (key.toLowerCase()) {
                case 'linkedin':
                  return (
                    <a key={key} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 text-blue-900 hover:text-blue-800">
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                      </svg>
                      <span>LinkedIn</span>
                    </a>
                  );
                case 'github':
                  return (
                    <a key={key} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 text-gray-600 hover:text-gray-800">
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                      </svg>
                      <span>GitHub</span>
                    </a>
                  );
                default:
                  return (
                    <a key={key} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 text-gray-600 hover:text-gray-800">
                      <span className="capitalize">{key}</span>
                    </a>
                  );
              }
            })}
          {(!displayProfile.socialLinks || Object.entries(displayProfile.socialLinks || {}).filter(([_, url]) => url && url !== '#').length === 0) && (
            <p className="text-gray-500">No social links provided.</p>
          )}
        </div>
      </div>

      {/* Interests */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Interests</h3>
        <div className="flex flex-wrap gap-2">
          {displayProfile.interests.map((interest, index) => (
            <span key={index} className="px-3 py-1 bg-blue-100 text-blue-900 text-sm rounded-full">
              {interest}
            </span>
          ))}
        </div>
      </div>

      {/* Languages */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Languages</h3>
        <div className="space-y-2">
          {displayProfile.languages.map((language, index) => (
            <div key={index} className="flex justify-between items-center">
              <span className="text-gray-700">{language.name}</span>
              <span className="text-sm text-gray-500">{language.proficiency}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderExperience = () => (
    <div className="space-y-6">
      {/* Current Position */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Current Position</h3>
        <div className="border-l-4 border-blue-900 pl-4">
          <h4 className="text-lg font-semibold text-gray-900">{displayProfile.currentJob}</h4>
          <p className="text-blue-900 font-medium">{displayProfile.company}</p>
          <p className="text-gray-600">{displayProfile.location}</p>
        </div>
      </div>

      {/* Career History */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Career History</h3>
        <div className="space-y-6">
          {displayProfile.careerHistory.map((job, index) => (
            <div
              key={job.id}
              className="block relative cursor-pointer hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors"
              onClick={() => navigate('/employment')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate('/employment'); }}
            >
              {index < displayProfile.careerHistory.length - 1 && (
                <div className="absolute left-4 top-8 w-0.5 h-16 bg-gray-200"></div>
              )}
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-blue-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-gray-900">{job.jobTitle}</h4>
                  <p className="text-blue-900 font-medium">{job.company}</p>
                  <p className="text-gray-600 text-sm">{job.location}</p>
                  <p className="text-gray-500 text-sm">{job.startDate} - {job.endDate}</p>
                  <p className="text-gray-700 mt-2">{job.description}</p>
                  <span className="inline-block mt-2 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                    {job.type}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Education */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Education</h3>
        {displayProfile.education.map((edu) => (
          <div key={edu.id} className="border-l-4 border-green-500 pl-4">
            <h4 className="text-lg font-semibold text-gray-900">{edu.degree}</h4>
            <p className="text-green-600 font-medium">{edu.institution}</p>
            <p className="text-gray-600">{edu.startYear} - {edu.endYear}</p>
            <p className="text-gray-500 text-sm">{edu.gpa}</p>
            <div className="mt-2">
              <p className="text-sm text-gray-700 font-medium">Achievements:</p>
              <ul className="list-disc list-inside text-sm text-gray-600 mt-1">
                {edu.achievements.map((achievement, index) => (
                  <li key={index}>{achievement}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSkills = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">Technical Skills</h3>
        {!isSkillsPublic ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center text-gray-500">
            <p className="font-medium">Hidden by User</p>
          </div>
        ) : displayProfile.skills.length === 0 ? (
          <p className="text-gray-500">No skills listed.</p>
        ) : (
          <div className="space-y-6">
            {Object.entries(
              displayProfile.skills.reduce((acc, skill) => {
                const category = skill.category || 'Technical';
                if (!acc[category]) acc[category] = [];
                acc[category].push(skill);
                return acc;
              }, {})
            ).map(([category, skills]) => (
              <div key={category}>
                <h4 className="text-lg font-medium text-gray-900 mb-3">{category}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {skills.map((skill, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">{skill.name}</span>
                        <span className="text-sm text-gray-500">{skill.level}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-900 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${skill.level}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderProjects = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">Projects</h3>
        {displayProfile.projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {displayProfile.projects.map((project) => (
            <div key={project.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <h4 className="text-lg font-semibold text-gray-900">{project.name}</h4>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(project.status)}`}>
                  {project.status}
                </span>
              </div>
              <p className="text-gray-600 text-sm mb-4">{project.description}</p>
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Technologies:</p>
                <div className="flex flex-wrap gap-1">
                  {project.technologies.map((tech, index) => (
                    <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex space-x-2">
                <a 
                  href={project.github} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1 text-gray-600 hover:text-gray-800 text-sm"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  <span>GitHub</span>
                </a>
                {project.demo && (
                  <a 
                    href={project.demo} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center space-x-1 text-blue-900 hover:text-blue-800 text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    <span>Demo</span>
                  </a>
                )}
              </div>
            </div>
          ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No projects listed yet.</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderAchievements = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">Certifications & Achievements</h3>
        {displayProfile.achievements.length > 0 ? (
          <div className="space-y-4">
            {displayProfile.achievements.map((achievement) => (
              <div
                key={achievement.id}
                className="block flex items-start space-x-4 p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow cursor-pointer"
                onClick={() => navigate(`/achievements/${achievement.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(`/achievements/${achievement.id}`); }}
              >
                <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-gray-900">{achievement.title}</h4>
                  <p className="text-blue-600 font-medium">{achievement.issuer}</p>
                  <p className="text-gray-500 text-sm">{achievement.date}</p>
                  <p className="text-gray-700 mt-2" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{achievement.description}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No achievements or certifications listed yet.</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header (with cover banner and improved layout) */}
        <div className="bg-white rounded-lg shadow-lg mb-8 overflow-hidden">
          <div className="h-40 bg-gray-200">
            <img
              src={displayProfile.coverImage}
              alt="Cover image"
              className="w-full h-full object-cover"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>
          <div className="p-8 pt-0">
            <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-6">
              <div className="relative -mt-20 md:mt-0">
                <img
                  src={displayProfile.profileImage}
                  alt={`${displayProfile.firstName} ${displayProfile.lastName}`}
                  className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                  onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent((displayProfile.firstName || '') + ' ' + (displayProfile.lastName || ''))}&background=ffffff&color=1e40af`; }}
                />
                <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full ring-2 ring-white"></div>
              </div>
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-3xl font-bold text-gray-900 mb-1">
                  {displayProfile.firstName} {displayProfile.lastName}
                </h1>
                <p className="text-lg text-gray-700 mb-1">
                  {displayProfile.currentJob}{displayProfile.company ? ` at ${displayProfile.company}` : ''}
                </p>
                <p className="text-gray-500 mb-4 text-sm">
                  {displayProfile.course}{displayProfile.graduationYear ? `, Class of ${displayProfile.graduationYear}` : ''}{displayProfile.location ? ` • ${displayProfile.location}` : ''}
                </p>
                <div className="flex flex-wrap justify-center md:justify-start gap-2">
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                    {displayProfile.course}
                  </span>
                  {displayProfile.level && (
                    <span className="px-3 py-1 bg-indigo-100 text-indigo-800 text-sm rounded-full">
                      {formatLevelLabel(displayProfile.level)}
                    </span>
                  )}
                  <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                    Batch {displayProfile.batch}
                  </span>
                  <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full">
                    {displayProfile.graduationYear} Graduate
                  </span>
                  <span className={`px-3 py-1 text-sm rounded-full ${displayProfile.status === 'DECEASED' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>
                    {displayProfile.status === 'DECEASED' ? 'Deceased' : 'Living'}
                  </span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 space-y-3 sm:space-y-0">
                <button className="px-4 h-10 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Connect
                </button>
                <button className="px-4 h-10 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                  Message
                </button>
                {authService.isLoggedIn() && displayProfile.status !== 'DECEASED' && (
                  <button
                    type="button"
                    onClick={() => setShowReportForm((prev) => !prev)}
                    className="px-4 h-10 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    {showReportForm ? 'Hide Report Form' : 'Report Deceased'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {authService.isLoggedIn() && displayProfile.status !== 'DECEASED' && (
          <div className="bg-white rounded-lg shadow-sm mb-8 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Report this alumni as deceased</h2>
                <p className="text-sm text-gray-500">Submit a report with context or evidence so an administrator can review and update the record.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowReportForm((prev) => !prev)}
                className="inline-flex items-center rounded-md bg-red-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 transition-colors"
              >
                {showReportForm ? 'Hide Report Details' : 'Open Report Form'}
              </button>
            </div>

            {showReportForm && (
              <form onSubmit={handleReportDeceasedSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Reason for report</label>
                  <textarea
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    rows={4}
                    className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Describe what led you to believe this alumni is deceased"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Evidence link (optional)</label>
                  <input
                    type="url"
                    value={reportEvidenceLink}
                    onChange={(e) => setReportEvidenceLink(e.target.value)}
                    className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Add a public post, news article, or document link"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Evidence file (optional)</label>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => setReportEvidenceFile(e.target.files?.[0] || null)}
                    className="mt-2 block w-full text-sm text-gray-700"
                  />
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="submit"
                    disabled={reportLoading}
                    className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300 transition-colors"
                  >
                    {reportLoading ? 'Submitting…' : 'Submit Report'}
                  </button>
                  {reportStatusMessage && (
                    <p className="text-sm text-gray-700">{reportStatusMessage}</p>
                  )}
                </div>
              </form>
            )}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="mb-8">
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'experience' && renderExperience()}
          {activeTab === 'skills' && renderSkills()}
          {activeTab === 'projects' && renderProjects()}
          {activeTab === 'achievements' && renderAchievements()}
        </div>

        {/* Back to Directory */}
        <div className="text-center mb-8">
          <button 
            onClick={() => navigate('/alumni')}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Alumni Directory
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlumniProfile;

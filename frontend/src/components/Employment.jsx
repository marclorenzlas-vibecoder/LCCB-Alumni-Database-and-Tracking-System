import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import careerService from '../services/careerService';
import { authService } from '../services/authService';
import ConfirmModal from './ConfirmModal';
import FilterMenu from './FilterMenu';
import MobileFilterButton from './MobileFilterButton';
import UserLayout from './UserLayout';
import { toast } from 'react-toastify';
import { API_BASE_URL, IMAGE_BASE_URL } from '../config/apiBaseUrl';

const initialJobForm = {
  alumni_id: '',
  company: '',
  job_title: '',
  location: '',
  department: '',
  type: '',
  application_url: '',
  description: ''
};

const cleanClientText = (raw) => {
  if (!raw || typeof raw !== 'string') return '';
  let text = raw;

  // 1. Unescape entity tags if written as &lt;p&gt;
  if (/&lt;[a-z/!]/i.test(text)) {
    text = text
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&');
  }

  // 2. If text contains HTML tags
  if (/<[a-z][\s\S]*>/i.test(text)) {
    text = text.replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<\/p>|<\/div>|<\/h[1-6]>/gi, '\n\n');
    text = text.replace(/<li[^>]*>/gi, '\n• ');
    text = text.replace(/<[^>]+>/g, ' ');
  }

  // 3. Normalize common entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;|&rsquo;|&lsquo;/g, "'")
    .replace(/&rdquo;|&ldquo;/g, '"')
    .replace(/&ndash;|&mdash;/g, ' - ')
    .replace(/&bull;/g, '• ');

  // 4. Separate common section headings (even when glued to text without spaces)
  const headers = [
    'Job Description',
    'About the Role',
    'About LinkedIn',
    'About Us',
    'About the Company',
    'Role Overview',
    'Key Responsibilities',
    'Responsibilities',
    'Basic Qualifications',
    'Preferred Qualifications',
    'Minimum Qualifications',
    'Qualifications',
    'Requirements',
    'Benefits',
    'What We Offer',
    'Suggested Skills',
    'Equal Opportunity Employer',
    'Equal Opportunity',
    'Additional Information'
  ];

  for (const h of headers) {
    const escaped = h.replace(/([:*?+()])/g, '\\$1');
    const regex = new RegExp('(?:\\*{0,2})\\b(' + escaped + '):?(?:\\*{0,2})', 'gi');
    text = text.replace(regex, '\n\n**$1:**\n\n');
  }

  // 5. Fix glued sentences: period/question/exclamation followed immediately by capital letter
  text = text.replace(/([a-z0-9][.!?])([A-Z][a-z])/g, '$1\n\n$2');

  // 6. Fix glued colon to capital letter: 'Responsibilities:Have' -> 'Responsibilities:\n\n• Have'
  text = text.replace(/:\s*([A-Z][a-z]+(?:\s+[a-z]+){1,3})/g, ':\n\n• $1');

  // 7. Process sections and format list items under lists
  const rawSections = text.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
  const formattedSections = [];
  let isUnderListHeader = false;

  for (const sec of rawSections) {
    if (/^\*\*(?:Responsibilities|Qualifications|Basic Qualifications|Preferred Qualifications|Requirements|Skills|Benefits):?\*\*/i.test(sec)) {
      isUnderListHeader = true;
      formattedSections.push(sec);
      continue;
    }

    if (/^\*\*(?:Job Description|About|Equal Opportunity|Additional)/i.test(sec)) {
      isUnderListHeader = false;
      formattedSections.push(sec);
      continue;
    }

    if (isUnderListHeader) {
      const lines = sec.split('\n').map(l => l.trim()).filter(Boolean);
      const bulletLines = [];

      for (const line of lines) {
        if (/^[-•*]\s+/.test(line)) {
          bulletLines.push('• ' + line.replace(/^[-•*]\s+/, '').trim());
        } else if (line.length > 20) {
          const splitSentences = line.split(/\.\s+(?=[A-Z])/).map(s => s.trim()).filter(Boolean);
          for (const sentence of splitSentences) {
            const cleanSentence = sentence.replace(/^[-•*:\s]+/, '');
            if (cleanSentence) {
              bulletLines.push('• ' + cleanSentence + (cleanSentence.endsWith('.') ? '' : '.'));
            }
          }
        } else {
          bulletLines.push(line);
        }
      }

      if (bulletLines.length > 0) {
        formattedSections.push(bulletLines.join('\n'));
      }
    } else {
      const cleanPara = sec.replace(/\s+/g, ' ').trim();
      if (cleanPara) {
        formattedSections.push(cleanPara);
      }
    }
  }

  let finalText = formattedSections.join('\n\n');
  finalText = finalText.replace(/•\s*•/g, '•');
  finalText = finalText.replace(/\*\*\s*\*\*/g, '');
  finalText = finalText.replace(/\n{3,}/g, '\n\n').trim();

  return finalText;
};

const renderFormattedDescription = (rawText) => {
  const text = cleanClientText(rawText);
  if (!text) {
    return <p className="text-slate-400 italic">No description provided.</p>;
  }

  const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);

  return (
    <div className="space-y-6 text-slate-700 text-sm sm:text-base leading-relaxed">
      {paragraphs.map((para, pIdx) => {
        const isMarkdownHeading = /^\*\*.*?\*\*$/.test(para.trim());
        const cleanHeadingText = para.replace(/^\*\*|\*\*$/g, '').replace(/:$/, '').trim();
        const isHeading = isMarkdownHeading || /^(responsibilities|requirements|qualifications|about the role|about linkedin|job description|overview|what you'll do|skills|benefits|minimum qualifications|preferred qualifications|key responsibilities)[:]?$/i.test(para.trim());

        if (isHeading) {
          return (
            <div key={pIdx} className="pt-3">
              <h4 className="text-base sm:text-lg font-bold text-slate-900 border-b border-slate-200 pb-2.5 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block shadow-sm"></span>
                {cleanHeadingText || para}
              </h4>
            </div>
          );
        }

        const lines = para.split('\n').map(l => l.trim()).filter(Boolean);
        const hasBullets = lines.some(l => /^[-•*]\s+/.test(l));

        if (hasBullets) {
          return (
            <div key={pIdx} className="space-y-3 pl-1 sm:pl-2">
              {lines.map((line, lIdx) => {
                if (/^[-•*]\s+/.test(line)) {
                  return (
                    <div key={lIdx} className="flex items-start gap-3">
                      <span className="h-2 w-2 rounded-full bg-blue-500 mt-2 shrink-0"></span>
                      <span className="flex-1 leading-relaxed text-slate-700">{line.replace(/^[-•*]\s+/, '')}</span>
                    </div>
                  );
                }
                return (
                  <p key={lIdx} className="leading-relaxed text-slate-700 font-medium">
                    {line}
                  </p>
                );
              })}
            </div>
          );
        }

        return (
          <p key={pIdx} className="leading-relaxed text-slate-700 text-justify sm:text-left">
            {para}
          </p>
        );
      })}
    </div>
  );
};

/**
 * Employment Component - Job Postings
 * 
 * User Roles (based on email domain):
 * - Teachers (@lccbonline.com): Can post jobs and edit/delete jobs
 * - Alumni (@gmail.com): Can view job opportunities
 */
const Employment = () => {
  const [postedJobs, setPostedJobs] = useState([]);
  const currentUser = authService.getCurrentUser();
  const isTeacher = authService.isTeacher();
  const isLoggedIn = authService.isLoggedIn();
  const navigate = useNavigate();
  const [alumniList, setAlumniList] = useState([]);

  const currentAlumniId = React.useMemo(() => {
    if (!currentUser) return null;
    if (currentUser.alumniId) return Number(currentUser.alumniId);
    if (currentUser.alumni_id) return Number(currentUser.alumni_id);
    const alumniArr = Array.isArray(alumniList) ? alumniList : (Array.isArray(alumniList?.alumni) ? alumniList.alumni : []);
    const matched = alumniArr.find(
      (a) => (a.user_id && Number(a.user_id) === Number(currentUser.id)) ||
             (a.email && currentUser.email && a.email.toLowerCase() === currentUser.email.toLowerCase())
    );
    return matched ? Number(matched.id) : null;
  }, [currentUser, alumniList]);

  const getJobPosterInfo = (job) => {
    if (!job) return { name: 'School Administration / Placement', role: 'Admin', isSchoolAdmin: true };

    if (job.alumni) {
      const firstName = job.alumni.first_name || '';
      const lastName = job.alumni.last_name || '';
      const name = `${firstName} ${lastName}`.trim() || 'Alumni Member';
      return {
        name,
        firstName,
        lastName,
        role: 'Alumni',
        profileImage: job.alumni.profile_image || null,
        email: job.alumni.email || null,
        userId: job.alumni.user_id || null,
        alumniId: job.alumni.id,
        isSchoolAdmin: false
      };
    }

    if (job.posted_by_alumni_id) {
      const alumniArr = Array.isArray(alumniList) ? alumniList : (Array.isArray(alumniList?.alumni) ? alumniList.alumni : []);
      const matched = alumniArr.find((a) => Number(a.id) === Number(job.posted_by_alumni_id));
      if (matched) {
        const firstName = matched.first_name || '';
        const lastName = matched.last_name || '';
        const name = `${firstName} ${lastName}`.trim() || 'Alumni Member';
        return {
          name,
          firstName,
          lastName,
          role: 'Alumni',
          profileImage: matched.profile_image || null,
          email: matched.email || null,
          userId: matched.user_id || null,
          alumniId: matched.id,
          isSchoolAdmin: false
        };
      }
    }

    return {
      name: 'School Administration / Placement',
      firstName: 'School',
      lastName: 'Admin',
      role: 'Admin',
      profileImage: null,
      email: null,
      userId: null,
      alumniId: null,
      isSchoolAdmin: true
    };
  };

  const canManageJob = (job) => {
    if (!job) return false;
    // Admins / teachers can manage any job posting:
    if (isTeacher) {
      return true;
    }
    // An alumni can only manage their own job post:
    if (currentAlumniId && job.posted_by_alumni_id && Number(currentAlumniId) === Number(job.posted_by_alumni_id)) {
      return true;
    }
    return false;
  };

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(initialJobForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Automated Job Scanner states
  const [entryMode, setEntryMode] = useState('manual'); // 'manual' | 'scan'
  const [scanType, setScanType] = useState('url'); // 'url' | 'file' | 'text'
  const [scanUrl, setScanUrl] = useState('');
  const [scanFile, setScanFile] = useState(null);
  const [scanText, setScanText] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const [scanSuccessNotice, setScanSuccessNotice] = useState('');
  
  // Job detail state
  const [showJobDetail, setShowJobDetail] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    type: 'danger',
    confirmText: 'Confirm',
    cancelText: 'Cancel'
  });

  const categories = ['Technology', 'Marketing', 'Analytics', 'Finance', 'Education'];
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [selectedWorkTypes, setSelectedWorkTypes] = useState([]);
  const [showLocationMenu, setShowLocationMenu] = useState(false);
  const [showDepartmentMenu, setShowDepartmentMenu] = useState(false);
  const [showWorkTypeMenu, setShowWorkTypeMenu] = useState(false);
  const locationMenuRef = useRef(null);
  const departmentMenuRef = useRef(null);
  const workTypeMenuRef = useRef(null);

  const fieldClass = 'mt-1 block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100';
  const selectFieldClass = 'app-select';
  const actionBaseClass = 'inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-70';
  const primaryActionClass = `${actionBaseClass} bg-blue-600 text-white shadow-blue-600/20 hover:bg-blue-700 focus:ring-blue-100`;
  // Page-level Add button style (matches Achievements/Donations)
  const addActionClass = 'inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-4 focus:ring-blue-100';
  const secondaryActionClass = 'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-60';
  const destructiveActionClass = 'inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 shadow-sm transition-all duration-200 hover:border-red-300 hover:bg-red-100 focus:outline-none focus:ring-4 focus:ring-red-100';
  const pillClass = 'inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-200';

  // Fetch posted jobs and alumni list on mount
  useEffect(() => {
    fetchPostedJobs();
    fetchAlumniList();
  }, []);

  // Close filter menus on outside click / Escape
  useEffect(() => {
    if (!showLocationMenu && !showDepartmentMenu && !showWorkTypeMenu) return undefined;
    const handlePointerDown = (event) => {
      if (locationMenuRef.current && !locationMenuRef.current.contains(event.target)) setShowLocationMenu(false);
      if (departmentMenuRef.current && !departmentMenuRef.current.contains(event.target)) setShowDepartmentMenu(false);
      if (workTypeMenuRef.current && !workTypeMenuRef.current.contains(event.target)) setShowWorkTypeMenu(false);
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setShowLocationMenu(false);
        setShowDepartmentMenu(false);
        setShowWorkTypeMenu(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showLocationMenu, showDepartmentMenu, showWorkTypeMenu]);

  const departments = ['Technology', 'Marketing', 'Analytics', 'Finance', 'Education'];
  const workTypes = ['Full-time', 'Part-time', 'Contract', 'Remote'];
  const uniqueLocations = [...new Set(postedJobs.map(j => j.location).filter(Boolean))];
  const locationSections = [{ key: 'locations', title: '', items: uniqueLocations.map(l => ({ value: l, label: l })) }];
  const departmentSections = [{ key: 'departments', title: '', items: departments.map(d => ({ value: d, label: d })) }];
  const workTypeSections = [{ key: 'worktypes', title: '', items: workTypes.map(w => ({ value: w, label: w })) }];

  const selectedLocationLabel = selectedLocations.length > 0 ? `${selectedLocations.length} selected` : 'Location';
  const selectedDepartmentLabel = selectedDepartments.length > 0 ? `${selectedDepartments.length} selected` : 'Department';
  const selectedWorkTypeLabel = selectedWorkTypes.length > 0 ? `${selectedWorkTypes.length} selected` : 'Work type';
  const activeFilterCount = selectedLocations.length + selectedDepartments.length + selectedWorkTypes.length;

  const fetchAlumniList = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/alumni?all=true`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (response.ok) {
        const data = await response.json();
        const list = Array.isArray(data) ? data : (Array.isArray(data?.alumni) ? data.alumni : []);
        setAlumniList(list);
      }
    } catch (err) {
      console.error('Error fetching alumni list:', err);
      setAlumniList([]);
    }
  };

  const fetchPostedJobs = async () => {
    try {
      setLoading(true);
      const data = await careerService.getAllJobs();
      setPostedJobs(data);
    } catch (err) {
      console.error('Error fetching posted jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const normalizeExternalUrl = (url) => {
    const raw = String(url || '').trim();
    if (!raw) return '';
    try {
      return new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`).toString();
    } catch {
      return '';
    }
  };

  const openApplicationLink = (job) => {
    const externalUrl = normalizeExternalUrl(job?.application_url);
    if (!externalUrl) {
      toast.warning('No application link is available for this job.');
      return;
    }
    window.open(externalUrl, '_blank', 'noopener,noreferrer');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const applicationUrl = normalizeExternalUrl(formData.application_url);
      if (!applicationUrl) {
        setError('Please enter a valid Application Link.');
        setLoading(false);
        return;
      }

      // Prepare external job directory data for job_posting table
      const jobData = {
        posted_by_alumni_id: formData.alumni_id ? parseInt(formData.alumni_id) : (currentAlumniId || null),
        job_title: formData.job_title,
        company: formData.company,
        location: formData.location,
        department: formData.department || null,
        job_type: formData.type,
        requirements: null,
        benefits: null,
        description: formData.description || null,
        application_url: applicationUrl
      };

      if (editingId) {
        // Update existing job post
        const updated = await careerService.updateJob(editingId, jobData);
        toast.success('Job updated successfully!');
        if (selectedJob && selectedJob.id === editingId) {
          setSelectedJob(prev => ({
            ...prev,
            ...jobData,
            id: editingId,
            ...(updated || {})
          }));
        }
      } else {
        // Create new job post
        await careerService.createJob(jobData);
        toast.success('Job posted successfully!');
      }

      await fetchPostedJobs(); // Refresh the list
      
      setShowModal(false);
      setEditingId(null);
      setFormData(initialJobForm);
    } catch (err) {
      console.error('Error saving job:', err);
      setError(err.response?.data?.error || 'Failed to save job');
    } finally {
      setLoading(false);
    }
  };

  const handleScanJob = async (e) => {
    if (e) e.preventDefault();
    setScanError('');
    setIsScanning(true);

    try {
      let response;
      if (scanType === 'url') {
        const trimmed = scanUrl.trim();
        if (!trimmed) {
          setScanError('Please enter a job posting URL.');
          setIsScanning(false);
          return;
        }
        response = await careerService.parseJob({ url: trimmed });
      } else if (scanType === 'file') {
        if (!scanFile) {
          setScanError('Please select a document file (PDF, DOC, DOCX, TXT) to scan.');
          setIsScanning(false);
          return;
        }
        if (scanFile.type && scanFile.type.startsWith('image/')) {
          setScanError('Image files are not supported. Please upload a PDF, DOC, DOCX, or TXT document.');
          setIsScanning(false);
          return;
        }
        const data = new FormData();
        data.append('file', scanFile);
        response = await careerService.parseJob(data, true);
      } else if (scanType === 'text') {
        const trimmed = scanText.trim();
        if (!trimmed || trimmed.length < 15) {
          setScanError('Please enter at least a few sentences describing the job.');
          setIsScanning(false);
          return;
        }
        response = await careerService.parseJob({ text: trimmed });
      }

      if (response && response.data) {
        const parsed = response.data;
        setFormData(prev => ({
          ...prev,
          job_title: parsed.job_title || prev.job_title,
          company: parsed.company || prev.company,
          location: parsed.location || prev.location,
          department: parsed.department || prev.department,
          type: parsed.type || prev.type,
          application_url: parsed.application_url || (scanType === 'url' ? scanUrl.trim() : prev.application_url),
          description: cleanClientText(parsed.description || prev.description)
        }));
        setScanSuccessNotice('Job details auto-filled! Please review and adjust any fields before posting.');
        setEntryMode('manual');
        toast.success('Job details extracted! Review before posting.');
      } else {
        setScanError('No details could be extracted from the content.');
      }
    } catch (err) {
      console.error('Scan error:', err);
      setScanError(err.response?.data?.error || err.message || 'Failed to scan and extract job details');
    } finally {
      setIsScanning(false);
    }
  };

  const handleEdit = (job) => {
    setEditingId(job.id);
    setEntryMode('manual');
    setScanError('');
    setScanSuccessNotice('');
    setFormData({
      alumni_id: job.posted_by_alumni_id?.toString() || '',
      company: job.company || '',
      job_title: job.job_title || '',
      location: job.location || '',
      department: job.department || '',
      type: job.job_type || '',
      application_url: job.application_url || '',
      description: cleanClientText(job.description || '')
    });
    setShowModal(true);
  };

  const handleDelete = (id) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Job Posting',
      message: 'Are you sure you want to delete this job posting? This action cannot be undone.',
      type: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          await careerService.deleteJob(id);
          await fetchPostedJobs();
          setShowModal(false);
          setEditingId(null);
          setShowJobDetail(false);
          setSelectedJob(null);
          setConfirmModal({ ...confirmModal, isOpen: false });
          toast.success('Job deleted successfully!');
        } catch (err) {
          console.error('Error deleting job:', err);
          toast.error(err.response?.data?.error || 'Failed to delete job');
          setConfirmModal({ ...confirmModal, isOpen: false });
        }
      }
    });
  };

  const handleOpenJobDetail = (job) => {
    setSelectedJob(job);
    setShowJobDetail(true);
  };

  const filteredJobs = postedJobs
    .filter(job => selectedDepartments.length === 0 || selectedDepartments.includes(job.department))
    .filter(job => selectedWorkTypes.length === 0 || selectedWorkTypes.includes(job.job_type))
    .filter(job => selectedLocations.length === 0 || selectedLocations.includes(job.location))
    .filter(job => 
      (job.job_title && job.job_title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (job.company && job.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (job.description && job.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

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
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
      />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
            <div className="text-center sm:text-left">
              <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl mb-2">
                Career Opportunities
              </h1>
              <p className="text-lg text-gray-600">
                Discover and share job opportunities within our alumni network
              </p>
            </div>
            {isLoggedIn && (
              <button
                onClick={() => {
                  setEditingId(null);
                  setFormData({
                    ...initialJobForm,
                    alumni_id: currentAlumniId ? currentAlumniId.toString() : ''
                  });
                  setError('');
                  setEntryMode('manual');
                  setScanType('url');
                  setScanUrl('');
                  setScanFile(null);
                  setScanText('');
                  setScanError('');
                  setScanSuccessNotice('');
                  setShowModal(true);
                }}
                className="app-primary-button"
              >
                Add New
              </button>
            )}
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="px-5 py-4">
            {/* Search Bar */}
            <div className="mb-4">
              <div className="relative group">
                <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-blue-600 transition group-focus-within:text-blue-900">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-transparent bg-transparent">
                    <svg className="h-4.5 w-4.5 text-current" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="Search jobs..."
                  className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-14 pr-12 text-sm text-gray-900 shadow-sm transition placeholder:text-gray-400 focus:border-blue-300 focus:outline-none focus:ring-4 focus:ring-blue-100"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
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
              <div className="hidden md:block">
                <FilterMenu
                  menuRef={locationMenuRef}
                  isOpen={showLocationMenu}
                  setIsOpen={setShowLocationMenu}
                  buttonLabel="Location"
                  selectedLabel={selectedLocationLabel}
                  selectedValues={selectedLocations}
                  multiSelect
                  icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                  sections={locationSections}
                  onSelect={(value) => {
                    setSelectedLocations(prev => 
                      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
                    );
                  }}
                  panelTitle=""
                  panelWidthClass="w-56"
                  alignClass="right-0"
                />
              </div>
              <MobileFilterButton
                buttonLabel="Location"
                selectedLabel={selectedLocationLabel}
                selectedValues={selectedLocations}
                multiSelect
                icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                sections={locationSections}
                onSelect={() => {}}
                onApply={(values) => setSelectedLocations(values)}
                onClear={() => setSelectedLocations([])}
                panelTitle="Location"
              />

              <div className="hidden md:block">
                <FilterMenu
                  menuRef={departmentMenuRef}
                  isOpen={showDepartmentMenu}
                  setIsOpen={setShowDepartmentMenu}
                  buttonLabel="Department"
                  selectedLabel={selectedDepartmentLabel}
                  selectedValues={selectedDepartments}
                  multiSelect
                  icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
                  sections={departmentSections}
                  onSelect={(value) => {
                    setSelectedDepartments(prev => 
                      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
                    );
                  }}
                  panelTitle=""
                  panelWidthClass="w-56"
                  alignClass="right-0"
                />
              </div>
              <MobileFilterButton
                buttonLabel="Department"
                selectedLabel={selectedDepartmentLabel}
                selectedValues={selectedDepartments}
                multiSelect
                icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
                sections={departmentSections}
                onSelect={() => {}}
                onApply={(values) => setSelectedDepartments(values)}
                onClear={() => setSelectedDepartments([])}
                panelTitle="Department"
              />

              <div className="hidden md:block">
                <FilterMenu
                  menuRef={workTypeMenuRef}
                  isOpen={showWorkTypeMenu}
                  setIsOpen={setShowWorkTypeMenu}
                  buttonLabel="Work type"
                  selectedLabel={selectedWorkTypeLabel}
                  selectedValues={selectedWorkTypes}
                  multiSelect
                  icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                  sections={workTypeSections}
                  onSelect={(value) => {
                    setSelectedWorkTypes(prev => 
                      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
                    );
                  }}
                  panelTitle=""
                  panelWidthClass="w-56"
                  alignClass="right-0"
                />
              </div>
              <MobileFilterButton
                buttonLabel="Work type"
                selectedLabel={selectedWorkTypeLabel}
                selectedValues={selectedWorkTypes}
                multiSelect
                icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                sections={workTypeSections}
                onSelect={() => {}}
                onApply={(values) => setSelectedWorkTypes(values)}
                onClear={() => setSelectedWorkTypes([])}
                panelTitle="Work Type"
              />
              {activeFilterCount > 0 && (
                <button
                  onClick={() => { setSelectedLocations([]); setSelectedDepartments([]); setSelectedWorkTypes([]); }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-100"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
                  Clear Filter
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Jobs List */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ minWidth: isTeacher ? '820px' : '640px', tableLayout: 'fixed' }}>
              <colgroup>
                {isTeacher ? (
                  <>
                    <col style={{ width: '34%' }} />
                    <col style={{ width: '18%' }} />
                    <col style={{ width: '18%' }} />
                    <col style={{ width: '14%', minWidth: '100px' }} />
                    <col style={{ width: '16%', minWidth: '150px' }} />
                  </>
                ) : (
                  <>
                    <col style={{ width: '36%' }} />
                    <col style={{ width: '22%' }} />
                    <col style={{ width: '22%' }} />
                    <col style={{ width: '20%', minWidth: '100px' }} />
                  </>
                )}
              </colgroup>
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-3 text-left text-sm font-semibold uppercase tracking-wider text-gray-500">Job Opportunity</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold uppercase tracking-wider text-gray-500">Location</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold uppercase tracking-wider text-gray-500">Department</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold uppercase tracking-wider text-gray-500">Work Type</th>
                  {isTeacher && (
                    <th className="px-6 py-3 text-right text-sm font-semibold uppercase tracking-wider text-gray-500">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={`skel-${i}`} className="border-b border-gray-100 animate-pulse">
                      <td className="px-6 py-4">
                        <div className="h-5 w-48 bg-slate-200 rounded mb-2"></div>
                        <div className="h-4 w-32 bg-slate-200 rounded"></div>
                      </td>
                      <td className="px-6 py-4"><div className="h-5 w-24 bg-slate-200 rounded"></div></td>
                      <td className="px-6 py-4"><div className="h-5 w-24 bg-slate-200 rounded"></div></td>
                      <td className="px-6 py-4"><div className="h-6 w-20 bg-slate-200 rounded-full"></div></td>
                      {isTeacher && (
                        <td className="px-4 py-4">
                          <div className="flex gap-2 justify-end">
                            <div className="h-9 w-16 bg-slate-200 rounded-md"></div>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                ) : filteredJobs.length === 0 ? (
                  <tr>
                    <td colSpan={isTeacher ? 5 : 4} className="text-center py-12">
                      <p className="text-gray-500">No job postings found.</p>
                    </td>
                  </tr>
                ) : (
                  filteredJobs.map((job) => {
                    const poster = getJobPosterInfo(job);

                    return (
                      <tr
                        key={job.id}
                        onClick={() => handleOpenJobDetail(job)}
                        className="border-b border-gray-100 last:border-b-0 transition hover:bg-blue-50/50 cursor-pointer"
                      >
                        <td className="px-6 py-4">
                          <div className="min-w-0">
                            <p className="text-lg font-semibold text-blue-600 hover:text-blue-800 transition truncate">
                              {job.job_title}
                            </p>
                            <p className="text-sm font-medium text-slate-700 mt-0.5 truncate">
                              {job.company}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-500 flex-wrap">
                              <span className="inline-flex items-center gap-1 font-medium">
                                {poster.isSchoolAdmin ? (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                                    LCCB Admin
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-blue-700 font-medium">
                                    <svg className="w-3.5 h-3.5 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    <span className="truncate max-w-[130px] font-semibold text-slate-800">{poster.name}</span>
                                  </span>
                                )}
                              </span>
                              <span>•</span>
                              <span>Posted {job.created_at ? new Date(job.created_at).toLocaleDateString() : ''}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-base text-gray-700">{job.location || '—'}</td>
                        <td className="px-6 py-4 text-base text-gray-700">{job.department || '—'}</td>
                        <td className="px-6 py-4 text-base text-gray-700">
                          <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3.5 py-1.5 text-sm font-semibold text-gray-600 whitespace-nowrap">
                            {job.job_type || '—'}
                          </span>
                        </td>
                        {isTeacher && (
                          <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              <button
                                type="button"
                                onClick={() => handleEdit(job)}
                                className="bg-sky-600 text-white px-3 py-1.5 rounded-md hover:bg-sky-700 transition-colors duration-200 text-xs font-medium shadow-xs"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(job.id)}
                                className="bg-red-600 text-white px-3 py-1.5 rounded-md hover:bg-red-700 transition-colors duration-200 text-xs font-medium shadow-xs"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal for Posting a Job */}
        {showModal && (
          <div className="fixed inset-0 bg-gray-600/60 backdrop-blur-xs overflow-y-auto h-full w-full z-[60]">
            <div className="relative top-8 mx-auto p-5 border w-full max-w-3xl shadow-2xl rounded-2xl bg-white max-h-[92vh] overflow-hidden flex flex-col">
              {/* Header with Mode Switcher */}
              <div className="bg-white border-b border-gray-200 px-6 py-4 -mx-5 -mt-5 rounded-t-2xl z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {editingId ? 'Edit Job Posting' : 'Post a Job Opportunity'}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {editingId
                      ? 'Update details for this job opportunity'
                      : 'Choose manual entry or auto-fill by scanning a job link or file'}
                  </p>
                </div>
                {!editingId && (
                  <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 shadow-inner shrink-0">
                    <button
                      type="button"
                      onClick={() => { setEntryMode('manual'); setScanError(''); }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        entryMode === 'manual'
                          ? 'bg-white text-blue-700 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Manual Entry
                    </button>
                    <button
                      type="button"
                      onClick={() => { setEntryMode('scan'); setScanError(''); }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        entryMode === 'scan'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-blue-700 hover:text-blue-900'
                      }`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Scan & Auto-Fill
                    </button>
                  </div>
                )}
              </div>

              {/* Modal Body */}
              <div className="mt-4 overflow-y-auto scrollbar-hide flex-1 px-1">
                {entryMode === 'scan' && !editingId ? (
                  /* Auto-Fill / Scanner View */
                  <div className="py-2 space-y-6">
                    <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                      <h4 className="text-sm font-bold text-slate-900">Automated Job Extraction</h4>
                      <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                        Scan a job web link, upload a document (PDF, Doc, or image), or paste text. 
                        The system will automatically extract the job title, company, location, type, and description so you can review and edit before posting.
                      </p>
                    </div>

                    {/* Source Selector */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                        Select Input Source
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        <button
                          type="button"
                          onClick={() => { setScanType('url'); setScanError(''); }}
                          className={`flex flex-col items-center justify-center p-3.5 rounded-xl border text-center transition ${
                            scanType === 'url'
                              ? 'border-blue-500 bg-blue-50/90 text-blue-700 font-semibold shadow-sm ring-2 ring-blue-500/20'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <svg className="w-5 h-5 mb-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                          <span className="text-xs">Job Link (URL)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => { setScanType('file'); setScanError(''); }}
                          className={`flex flex-col items-center justify-center p-3.5 rounded-xl border text-center transition ${
                            scanType === 'file'
                              ? 'border-blue-500 bg-blue-50/90 text-blue-700 font-semibold shadow-sm ring-2 ring-blue-500/20'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <svg className="w-5 h-5 mb-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="text-xs">Upload File</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => { setScanType('text'); setScanError(''); }}
                          className={`flex flex-col items-center justify-center p-3.5 rounded-xl border text-center transition ${
                            scanType === 'text'
                              ? 'border-blue-500 bg-blue-50/90 text-blue-700 font-semibold shadow-sm ring-2 ring-blue-500/20'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <svg className="w-5 h-5 mb-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" />
                          </svg>
                          <span className="text-xs">Paste Text</span>
                        </button>
                      </div>
                    </div>

                    {/* Scan Inputs */}
                    <div className="space-y-4">
                      {scanType === 'url' && (
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                            Job Posting Link (URL) *
                          </label>
                          <div className="relative">
                            <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                              </svg>
                            </div>
                            <input
                              type="url"
                              value={scanUrl}
                              onChange={(e) => setScanUrl(e.target.value)}
                              placeholder="e.g. https://www.linkedin.com/jobs/view/... or https://company.com/careers/job"
                              className={`${fieldClass} pl-10`}
                            />
                          </div>
                          <p className="mt-1.5 text-xs text-slate-500">
                            Paste any public job listing link. We'll extract details and set the application link automatically.
                          </p>
                        </div>
                      )}

                      {scanType === 'file' && (
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                            Job Document (PDF, DOC, DOCX, TXT) *
                          </label>
                          <div className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/60 p-6 transition hover:border-blue-400 hover:bg-blue-50/30">
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                              onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                if (file && file.type && file.type.startsWith('image/')) {
                                  setScanError('Image files are not supported. Please upload a PDF, DOC, DOCX, or TXT document.');
                                  setScanFile(null);
                                  return;
                                }
                                setScanError('');
                                setScanFile(file);
                              }}
                              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                            />
                            <div className="text-center pointer-events-none">
                              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 mb-3">
                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                              </div>
                              {scanFile ? (
                                <div>
                                  <p className="text-sm font-semibold text-blue-700">{scanFile.name}</p>
                                  <p className="text-xs text-slate-500 mt-0.5">{(scanFile.size / 1024).toFixed(1)} KB — Click to change</p>
                                </div>
                              ) : (
                                <div>
                                  <p className="text-sm font-medium text-slate-700">
                                    <span className="font-semibold text-blue-600">Click to upload</span> or drag and drop
                                  </p>
                                  <p className="text-xs text-slate-400 mt-1">PDF, DOC, DOCX, or TXT document (up to 10MB)</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {scanType === 'text' && (
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                            Job Announcement / Description Text *
                          </label>
                          <textarea
                            value={scanText}
                            onChange={(e) => setScanText(e.target.value)}
                            rows="6"
                            className={`${fieldClass} resize-none`}
                            placeholder="Paste job title, company name, requirements, location, job type, and responsibilities here..."
                          />
                          <p className="mt-1.5 text-xs text-slate-500">
                            Useful if you copied a job announcement from an email, PDF, or chat group.
                          </p>
                        </div>
                      )}

                      {scanError && (
                        <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700 flex flex-col gap-1.5">
                          <div className="flex items-start gap-2">
                            <svg className="w-4 h-4 shrink-0 text-red-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <span className="flex-1 font-medium">{scanError}</span>
                          </div>
                          {scanError.includes('GEMINI_API_KEY') && (
                            <p className="text-[11px] text-red-600 pl-6 leading-relaxed">
                              Image and flyer auto-fill uses Google Gemini Vision to read text. Add <code className="font-mono bg-red-100 px-1 py-0.5 rounded text-red-800">GEMINI_API_KEY=your_key</code> into <code className="font-mono bg-red-100 px-1 py-0.5 rounded text-red-800">backend/.env</code> and restart the backend, or switch to <strong className="cursor-pointer underline" onClick={() => { setEntryMode('manual'); setScanError(''); }}>Manual Entry</strong> to fill the fields directly.
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Scan Action Buttons */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={() => { setEntryMode('manual'); setScanError(''); }}
                        className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition flex items-center gap-1"
                      >
                        ← Back to Manual Form
                      </button>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowModal(false);
                            setEditingId(null);
                            setError('');
                            setScanError('');
                          }}
                          className={secondaryActionClass}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleScanJob}
                          disabled={isScanning}
                          className={primaryActionClass}
                        >
                          {isScanning ? (
                            <>
                              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                              </svg>
                              Scanning Content...
                            </>
                          ) : (
                            'Scan & Auto-Fill Form'
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Manual Entry Form View */
                  <form onSubmit={handleSubmit} className="space-y-5 py-1">
                    {/* Auto-fill notification if populated via scanner */}
                    {scanSuccessNotice && (
                      <div className="flex items-start justify-between rounded-xl bg-blue-50 border border-blue-200 p-3.5 text-blue-900">
                        <div>
                          <p className="text-xs font-bold text-blue-900 uppercase tracking-wide">Auto-Filled from Scan</p>
                          <p className="text-xs text-blue-700 mt-0.5">{scanSuccessNotice}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setScanSuccessNotice('')}
                          className="text-blue-400 hover:text-blue-600 text-sm font-bold ml-2"
                        >
                          ×
                        </button>
                      </div>
                    )}

                    {/* Quick jump to Scan if creating new and haven't scanned */}
                    {!editingId && !scanSuccessNotice && (
                      <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 px-4 py-2.5 text-xs text-slate-600">
                        <span>Have a job link or flyer? Auto-fill these fields in seconds.</span>
                        <button
                          type="button"
                          onClick={() => { setEntryMode('scan'); setScanError(''); }}
                          className="font-semibold text-blue-600 hover:text-blue-800 hover:underline shrink-0 ml-2"
                        >
                          Scan Link or File
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Job Title *
                        </label>
                        <input
                          type="text"
                          name="job_title"
                          value={formData.job_title}
                          onChange={handleInputChange}
                          required
                          className={fieldClass}
                          placeholder="e.g. Senior Software Engineer"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Company *
                        </label>
                        <input
                          type="text"
                          name="company"
                          value={formData.company}
                          onChange={handleInputChange}
                          required
                          className={fieldClass}
                          placeholder="Company name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Location *
                        </label>
                        <input
                          type="text"
                          name="location"
                          value={formData.location}
                          onChange={handleInputChange}
                          required
                          className={fieldClass}
                          placeholder="e.g. Makati City or Remote"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Department
                        </label>
                        <select
                          name="department"
                          value={formData.department}
                          onChange={handleInputChange}
                          className={selectFieldClass}
                        >
                          <option value="">Select department</option>
                          <option value="Technology">Technology</option>
                          <option value="Marketing">Marketing</option>
                          <option value="Analytics">Analytics</option>
                          <option value="Finance">Finance</option>
                          <option value="Education">Education</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Job Type *
                        </label>
                        <select
                          name="type"
                          value={formData.type}
                          onChange={handleInputChange}
                          required
                          className={selectFieldClass}
                        >
                          <option value="">Select type</option>
                          <option value="Full-time">Full-time</option>
                          <option value="Part-time">Part-time</option>
                          <option value="Contract">Contract</option>
                          <option value="Remote">Remote</option>
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Application Link *
                        </label>
                        <input
                          type="text"
                          inputMode="url"
                          name="application_url"
                          value={formData.application_url}
                          onChange={handleInputChange}
                          required
                          className={fieldClass}
                          placeholder="https://www.linkedin.com/jobs/view/... or https://company.com/apply"
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
                          className={`${fieldClass} resize-none`}
                          placeholder="Detailed description, responsibilities, and qualifications..."
                          rows="5"
                        />
                      </div>
                    </div>

                    {error && (
                      <div className="text-red-600 text-sm">
                        {error}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setShowModal(false);
                            setEditingId(null);
                            setError('');
                            setScanError('');
                            setScanSuccessNotice('');
                          }}
                          className={secondaryActionClass}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={loading}
                          className={primaryActionClass}
                        >
                          {loading ? (
                            <>
                              <svg
                                className="h-4 w-4 animate-spin"
                                viewBox="0 0 24 24"
                                fill="none"
                                aria-hidden="true"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                />
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                                />
                              </svg>
                              Saving...
                            </>
                          ) : editingId ? (
                            'Update Job'
                          ) : (
                            'Post Job'
                          )}
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Job Detail Full Page */}
        {showJobDetail && selectedJob && (
          <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 z-10 border-b border-slate-200 bg-white shadow-sm">
              <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4 sm:px-8">
                <button
                  type="button"
                  onClick={() => {
                    setShowJobDetail(false);
                    setSelectedJob(null);
                  }}
                  className="inline-flex items-center rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-semibold text-blue-950 shadow-sm transition-all duration-200 hover:-translate-x-0.5 hover:border-blue-200 hover:bg-blue-50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500/25"
                >
                  Back to Jobs
                </button>
                <button
                  type="button"
                  onClick={() => openApplicationLink(selectedJob)}
                  className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100"
                >
                  Apply
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="mx-auto max-w-5xl px-6 py-8 sm:px-8">
                <div className="space-y-8">
                  <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">{selectedJob.job_title}</h1>
                    <p className="mt-2 text-lg text-slate-500">{selectedJob.company}</p>
                  </div>

                  {/* Posted By Information Card */}
                  {(() => {
                    const poster = getJobPosterInfo(selectedJob);
                    const isOwnJob = currentAlumniId && Number(selectedJob.posted_by_alumni_id) === Number(currentAlumniId);

                    return (
                      <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/80 via-white to-slate-50/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-4">
                          {poster.profileImage ? (
                            <img
                              src={poster.profileImage.startsWith('http') ? poster.profileImage : `${IMAGE_BASE_URL}/${poster.profileImage}`}
                              alt={poster.name}
                              className="h-14 w-14 rounded-full object-cover border-2 border-blue-200 shadow-sm shrink-0"
                              onError={(e) => {
                                e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(poster.name)}&background=2563eb&color=ffffff&size=160`;
                              }}
                            />
                          ) : (
                            <div className="h-14 w-14 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0 border-2 border-blue-200">
                              {poster.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Posted by</span>
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                poster.isSchoolAdmin
                                  ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                  : 'bg-blue-100 text-blue-800 border border-blue-200'
                              }`}>
                                {poster.isSchoolAdmin ? 'Placement Office / Admin' : 'Alumni'}
                              </span>
                              {isOwnJob && (
                                <span className="inline-flex items-center rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold">
                                  You
                                </span>
                              )}
                            </div>
                            <p className="text-base font-bold text-slate-900 mt-0.5">{poster.name}</p>
                            {poster.email && (
                              <p className="text-xs text-slate-500">{poster.email}</p>
                            )}
                          </div>
                        </div>

                        {canManageJob(selectedJob) && (
                          <div className="flex items-center gap-2.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                handleEdit(selectedJob);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-sky-700 active:bg-sky-800"
                            >
                              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit Job
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(selectedJob.id)}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-red-700 active:bg-red-800"
                            >
                              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete Job
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Redesigned Job Details Card */}
                  <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs hover:shadow-sm transition-shadow">
                    <div className="flex items-center gap-2 pb-4 mb-4 border-b border-slate-100">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </span>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Job Details
                      </h3>
                    </div>

                    {/* Responsive Details Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                      {/* Company */}
                      <div className="flex items-center gap-3.5 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 transition hover:bg-slate-50 hover:border-slate-200">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 border border-blue-200/50">
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Company</p>
                          <p className="mt-0.5 text-sm font-bold text-slate-900 truncate" title={selectedJob.company}>
                            {selectedJob.company || 'Not specified'}
                          </p>
                        </div>
                      </div>

                      {/* Location */}
                      <div className="flex items-center gap-3.5 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 transition hover:bg-slate-50 hover:border-slate-200">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-200/50">
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Location</p>
                          <p className="mt-0.5 text-sm font-bold text-slate-900 truncate" title={selectedJob.location || 'Not specified'}>
                            {selectedJob.location || 'Not specified'}
                          </p>
                        </div>
                      </div>

                      {/* Employment Type */}
                      <div className="flex items-center gap-3.5 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 transition hover:bg-slate-50 hover:border-slate-200">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 border border-indigo-200/50">
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Employment Type</p>
                          <p className="mt-0.5 text-sm font-bold text-slate-900 truncate">
                            {selectedJob.job_type || 'Full-time'}
                          </p>
                        </div>
                      </div>

                      {/* Date Posted */}
                      <div className="flex items-center gap-3.5 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 transition hover:bg-slate-50 hover:border-slate-200">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 border border-amber-200/50">
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Posted Date</p>
                          <p className="mt-0.5 text-sm font-bold text-slate-900 truncate">
                            {selectedJob.created_at
                              ? new Date(selectedJob.created_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })
                              : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xs">
                    <div className="flex items-center gap-2 pb-4 mb-5 border-b border-slate-100">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </span>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        About the Position
                      </h3>
                    </div>
                    {renderFormattedDescription(selectedJob.description)}
                  </div>
                </div>
            </div>
          </div>
        )}
      </div>
      </div>

    </UserLayout>
  );
};

export default Employment;

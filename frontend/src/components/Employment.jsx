import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import careerService from '../services/careerService';
import applicationService from '../services/applicationService';
import { authService } from '../services/authService';
import ConfirmModal from './ConfirmModal';
import FilterMenu from './FilterMenu';
import UserLayout from './UserLayout';
import { toast } from 'react-toastify';
import { API_BASE_URL, IMAGE_BASE_URL } from '../config/apiBaseUrl';

/**
 * Employment Component - Job Postings and Applications
 * 
 * User Roles (based on email domain):
 * - Teachers (@lccbonline.com): Can post jobs, edit/delete jobs, and view all applications
 * - Alumni (@gmail.com): Can apply to jobs and track their applications
 */
const Employment = () => {
  const navigate = useNavigate();
  const [postedJobs, setPostedJobs] = useState([]);
  const isTeacher = authService.isTeacher();
  const currentUser = authService.getCurrentUser();
  const [alumniList, setAlumniList] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    alumni_id: '',
    company: '',
    job_title: '',
    location: '',
    department: '',
    type: '',
    salary: '',
    requirements: '',
    benefits: '',
    deadline: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Application modal state
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [applicationTab, setApplicationTab] = useState('overview');
  const [coverLetter, setCoverLetter] = useState('');
  const [resumeFiles, setResumeFiles] = useState([]);
  const [contactMethod, setContactMethod] = useState('email');
  const [contactEmail, setContactEmail] = useState(currentUser?.email || '');
  const [contactNumber, setContactNumber] = useState(currentUser?.alumni?.contact_number || currentUser?.contact_number || '');
  const [appliedJobs, setAppliedJobs] = useState(new Map()); // Map of job_id -> application status
  const [applicationLoading, setApplicationLoading] = useState(false);
  const [applicationCounts, setApplicationCounts] = useState({});

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
    if (currentUser && !isTeacher) {
      checkApplicationStatus();
    }
  }, []);

  // Fetch application counts whenever jobs change (for teachers)
  useEffect(() => {
    if (isTeacher && postedJobs.length > 0) {
      fetchApplicationCounts();
    }
  }, [postedJobs.length, isTeacher]);

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

  // Refresh counts when page becomes visible (user returns to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        if (isTeacher && postedJobs.length > 0) {
          fetchApplicationCounts();
        }
        if (!isTeacher && currentUser) {
          checkApplicationStatus();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isTeacher, postedJobs.length, currentUser]);

  // Expose fetchApplicationCounts globally for instant updates from other components
  useEffect(() => {
    if (isTeacher) {
      window.refreshApplicationCounts = fetchApplicationCounts;
    } else if (currentUser) {
      window.refreshApplicationStatus = checkApplicationStatus;
    }
    return () => { 
      delete window.refreshApplicationCounts;
      delete window.refreshApplicationStatus;
    };
  }, [isTeacher, postedJobs.length, currentUser]);

  const getApplicationStatusButton = (jobId) => {
    const application = appliedJobs.get(jobId);
    if (!application) return null;

    const statusConfig = {
      PENDING: {
        text: 'Application Pending',
        bgColor: 'bg-yellow-500'
      },
      REVIEWED: {
        text: 'Under Review',
        bgColor: 'bg-blue-900'
      },
      SHORTLISTED: {
        text: 'Shortlisted',
        bgColor: 'bg-green-500'
      },
      ACCEPTED: {
        text: 'Accepted',
        bgColor: 'bg-green-600'
      },
      REJECTED: {
        text: 'Not Selected',
        bgColor: 'bg-red-500'
      }
    };

    const config = statusConfig[application.status] || statusConfig.PENDING;

    if (application.status === 'PENDING') {
      return (
        <div className="flex-1 flex gap-2">
          <button
            disabled
            className={`flex-1 ${actionBaseClass} ${config.bgColor} text-white`}
          >
            {config.text}
          </button>
          <button
            type="button"
            onClick={() => handleWithdrawApplication(jobId)}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-red-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-red-700 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-red-100"
          >
            Withdraw
          </button>
        </div>
      );
    }
    
    return (
      <button 
        disabled
        className={`flex-1 ${actionBaseClass} ${config.bgColor} text-white`}>
        {config.text}
      </button>
    );
  };

  const getInlineStatusBadge = (jobId) => {
    const application = appliedJobs.get(jobId);
    if (!application) return null;

    const badgeStyles = {
      REVIEWED: 'bg-purple-100 text-purple-800',
      SHORTLISTED: 'bg-amber-100 text-amber-800',
      ACCEPTED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      PENDING: 'bg-yellow-100 text-yellow-800'
    };

    const badgeLabels = {
      REVIEWED: 'Under Review',
      SHORTLISTED: 'Shortlisted',
      ACCEPTED: 'Accepted',
      REJECTED: 'Rejected',
      PENDING: 'Pending'
    };

    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${badgeStyles[application.status] || badgeStyles.PENDING}`}>
        {badgeLabels[application.status] || 'Pending'}
      </span>
    );
  };

  const checkApplicationStatus = async () => {
    // Extract alumni ID from nested alumni object
    const alumniId = currentUser?.alumni?.id || currentUser?.alumniId;
    if (!alumniId) return;
    
    try {
      const applications = await applicationService.getAlumniApplications(alumniId);
      const statusMap = new Map();
      applications.forEach(app => {
        statusMap.set(app.job_posting_id, {
          id: app.id,
          status: app.status,
          appliedAt: app.applied_at,
          reviewedAt: app.reviewed_at
        });
      });
      setAppliedJobs(statusMap);
    } catch (err) {
      console.error('Error fetching application status:', err);
    }
  };

  const handleWithdrawApplication = (jobId) => {
    const application = appliedJobs.get(jobId);
    if (!application || application.status !== 'PENDING') {
      toast.warning('Only pending applications can be withdrawn.');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Withdraw Application',
      message: 'Do you want to withdraw this application? You can reapply later if the job is still open.',
      type: 'danger',
      confirmText: 'Withdraw',
      cancelText: 'Keep Application',
      onConfirm: async () => {
        try {
          await applicationService.withdrawApplication(application.id);
          await checkApplicationStatus();
          setConfirmModal({
            isOpen: false,
            title: '',
            message: '',
            onConfirm: null,
            type: 'danger',
            confirmText: 'Confirm',
            cancelText: 'Cancel'
          });
          toast.success('Application withdrawn successfully.');
        } catch (err) {
          console.error('Error withdrawing application:', err);
          const errorMsg = err.response?.data?.error || 'Failed to withdraw application';
          toast.error(errorMsg);
          setConfirmModal({
            isOpen: false,
            title: '',
            message: '',
            onConfirm: null,
            type: 'danger',
            confirmText: 'Confirm',
            cancelText: 'Cancel'
          });
        }
      }
    });
  };

  const fetchApplicationCounts = async () => {
    if (!isTeacher) return;
    
    try {
      const counts = {};
      await Promise.all(
        postedJobs.map(async (job) => {
          try {
            const applications = await applicationService.getJobApplications(job.id);
            counts[job.id] = applications.length;
          } catch (err) {
            counts[job.id] = 0;
          }
        })
      );
      setApplicationCounts(counts);
    } catch (err) {
      console.error('Error fetching application counts:', err);
    }
  };

  const fetchAlumniList = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/alumni`);
      const data = await response.json();
      setAlumniList(data);
    } catch (err) {
      console.error('Error fetching alumni list:', err);
    }
  };

  const fetchPostedJobs = async () => {
    try {
      const data = await careerService.getAllJobs();
      setPostedJobs(data);
      
      // Fetch counts directly after getting jobs data
      if (isTeacher && data.length > 0) {
        const counts = {};
        await Promise.all(
          data.map(async (job) => {
            try {
              const applications = await applicationService.getJobApplications(job.id);
              counts[job.id] = applications.length;
            } catch (err) {
              counts[job.id] = 0;
            }
          })
        );
        setApplicationCounts(counts);
      }
    } catch (err) {
      console.error('Error fetching posted jobs:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Prepare job data for job_posting table
      const jobData = {
        posted_by_alumni_id: parseInt(formData.alumni_id),
        job_title: formData.job_title,
        company: formData.company,
        location: formData.location,
        department: formData.department || null,
        job_type: formData.type,
        salary_range: formData.salary || null,
        requirements: formData.requirements || null,
        benefits: formData.benefits || null,
        description: formData.description || null,
        application_deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null
      };

      if (editingId) {
        // Update existing job post
        await careerService.updateJob(editingId, jobData);
        toast.success('Job updated successfully!');
      } else {
        // Create new job post
        await careerService.createJob(jobData);
        toast.success('Job posted successfully!');
      }

      await fetchPostedJobs(); // Refresh the list
      
      setShowModal(false);
      setEditingId(null);
      setFormData({
        alumni_id: '',
        company: '',
        job_title: '',
        location: '',
        department: '',
        type: '',
        salary: '',
        requirements: '',
        benefits: '',
        deadline: '',
        description: ''
      });
    } catch (err) {
      console.error('Error saving job:', err);
      setError(err.response?.data?.error || 'Failed to save job');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (job) => {
    setEditingId(job.id);
    setFormData({
      alumni_id: job.posted_by_alumni_id?.toString() || '',
      company: job.company || '',
      job_title: job.job_title || '',
      location: job.location || '',
      department: job.department || '',
      type: job.job_type || '',
      salary: job.salary_range || '',
      requirements: job.requirements || '',
      benefits: job.benefits || '',
      deadline: job.application_deadline ? new Date(job.application_deadline).toISOString().split('T')[0] : '',
      description: job.description || ''
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
          setConfirmModal({ ...confirmModal, isOpen: false });
          toast.success('Job deleted successfully!');
        } catch (err) {
          console.error('Error deleting job:', err);
          toast.error('Failed to delete job');
          setConfirmModal({ ...confirmModal, isOpen: false });
        }
      }
    });
  };

  const handleApplyNow = (job) => {
    // Extract alumni ID from nested alumni object
    const alumniId = currentUser?.alumni?.id || currentUser?.alumniId;
    if (!alumniId) {
      toast.warning('Please log in as an alumni to apply for jobs.');
      return;
    }
    
    setSelectedJob(job);
    setCoverLetter('');
    setResumeFiles([]);
    setContactMethod('email');
    setContactEmail(currentUser?.email || '');
    setContactNumber(currentUser?.alumni?.contact_number || currentUser?.contact_number || '');
    setApplicationTab('overview');
    setShowApplicationModal(true);
  };

  const handleSubmitApplication = async (e) => {
    e.preventDefault();

    if (!coverLetter.trim()) {
      toast.error('Cover letter is required.');
      return;
    }

    const trimmedContactEmail = String(contactEmail || '').trim();
    const trimmedContactNumber = String(contactNumber || '').trim();

    if (contactMethod === 'email' && !trimmedContactEmail) {
      toast.error('Please provide a contact email.');
      return;
    }

    if (contactMethod === 'phone' && !trimmedContactNumber) {
      toast.error('Please provide a contact number.');
      return;
    }

    setApplicationLoading(true);

    try {
      // Extract alumni ID from nested alumni object
      const alumniId = currentUser?.alumni?.id || currentUser?.alumniId;
      const response = await applicationService.applyToJob(
        selectedJob.id,
        alumniId,
        coverLetter.trim(),
        '', // resumeUrl (not used)
        resumeFiles,
        contactMethod,
        trimmedContactEmail,
        trimmedContactNumber
      );

      const createdApplication = response?.application;
      if (!createdApplication?.id) {
        await checkApplicationStatus();
        throw new Error('Application was submitted, but the application record could not be loaded for withdrawal. Please refresh the page.');
      }
      
      // Update applied jobs map with PENDING status
      setAppliedJobs(prev => new Map(prev).set(selectedJob.id, {
        id: createdApplication.id,
        status: 'PENDING',
        appliedAt: createdApplication.applied_at || new Date().toISOString(),
        reviewedAt: createdApplication.reviewed_at || null
      }));
      
      // Trigger instant notification refresh for all users
      if (window.refreshNotifications) {
        window.refreshNotifications();
      }
      
      setShowApplicationModal(false);
      toast.success('Application submitted successfully! The employer will be notified and will review your qualifications.');
    } catch (err) {
      console.error('Error submitting application:', err);
      const errorMsg = err.response?.data?.error || 'Failed to submit application';
      toast.error(errorMsg);
    } finally {
      setApplicationLoading(false);
    }
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
            {isTeacher && (
              <button
                onClick={() => { setEditingId(null); setFormData({ alumni_id: '', company: '', job_title: '', location: '', department: '', type: '', salary: '', requirements: '', benefits: '', deadline: '', description: '' }); setError(''); setShowModal(true); }}
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
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-blue-100 bg-blue-50">
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
                    <col style={{ width: '28%' }} />
                    <col style={{ width: '16%' }} />
                    <col style={{ width: '16%' }} />
                    <col style={{ width: '14%', minWidth: '100px' }} />
                    <col style={{ width: '26%', minWidth: '260px' }} />
                  </>
                ) : (
                  <>
                    <col style={{ width: '32%' }} />
                    <col style={{ width: '18%' }} />
                    <col style={{ width: '18%' }} />
                    <col style={{ width: '14%', minWidth: '100px' }} />
                  </>
                )}
              </colgroup>
              <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-6 py-3 text-left text-sm font-semibold uppercase tracking-wider text-gray-500">Job Title</th>
                <th className="px-6 py-3 text-left text-sm font-semibold uppercase tracking-wider text-gray-500">Location</th>
                <th className="px-6 py-3 text-left text-sm font-semibold uppercase tracking-wider text-gray-500">Department</th>
                <th className="px-6 py-3 text-left text-sm font-semibold uppercase tracking-wider text-gray-500">Work Type</th>
                {isTeacher && <th className="px-6 py-3 text-right text-sm font-semibold uppercase tracking-wider text-gray-500">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={isTeacher ? 5 : 4} className="text-center py-8 text-gray-500 text-base">Loading jobs...</td>
                </tr>
              )}
              {!loading && filteredJobs.length === 0 && (
                <tr>
                  <td colSpan={isTeacher ? 5 : 4} className="text-center py-12">
                    <p className="text-gray-500">No job postings found.</p>
                  </td>
                </tr>
              )}
              {!loading && filteredJobs.map((job) => (
                <tr
                  key={job.id}
                  onClick={() => handleApplyNow(job)}
                  className="border-b border-gray-100 last:border-b-0 transition hover:bg-blue-50/50 cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-lg font-semibold text-blue-600 hover:text-blue-800 transition truncate">{job.job_title}</p>
                        {getInlineStatusBadge(job.id)}
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">Posted {job.created_at ? new Date(job.created_at).toLocaleDateString() : ''}</p>
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
                      <div className="flex items-center gap-1" style={{ flexDirection: 'row', alignItems: 'center', gap: '6px', justifyContent: 'flex-start' }}>
                        <button
                          onClick={() => navigate(`/job-applications/${job.id}`)}
                          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors duration-200 text-sm font-medium shadow-sm whitespace-nowrap"
                        >
                          Applications ({applicationCounts[job.id] || 0})
                        </button>
                        <button
                          onClick={() => handleEdit(job)}
                          className="flex-1 bg-sky-600 text-white px-4 py-2 rounded-md hover:bg-sky-700 transition-colors duration-200 text-sm font-medium shadow-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(job.id)}
                          className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors duration-200 text-sm font-medium shadow-sm"
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
        </div>

        {/* Modal for Posting a Job */}
        {showModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-full max-w-3xl shadow-lg rounded-xl bg-white max-h-[90vh] overflow-hidden flex flex-col">
              <div className="bg-white border-b border-gray-200 px-3 py-4 -mx-5 -mt-5 rounded-t-xl z-10">
                <h3 className="text-2xl font-semibold text-gray-900">
                  {editingId ? 'Edit Job Posting' : 'Post a Job Opportunity'}
                </h3>
              </div>
              <div className="mt-6 overflow-y-auto scrollbar-hide flex-1">
                <form onSubmit={handleSubmit} className="space-y-6">
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
                        placeholder="e.g. Makati City"
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

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Salary Range
                      </label>
                      <input
                        type="text"
                        name="salary"
                        value={formData.salary}
                        onChange={handleInputChange}
                        className={fieldClass}
                        placeholder="e.g. ₱80,000 - ₱120,000"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Application Deadline
                      </label>
                      <input
                        type="date"
                        name="deadline"
                        value={formData.deadline}
                        onChange={handleInputChange}
                        className={fieldClass}
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Requirements (one per line)
                      </label>
                      <textarea
                        name="requirements"
                        value={formData.requirements}
                        onChange={handleInputChange}
                        className={`${fieldClass} resize-none`}
                        placeholder="Bachelor's degree in Computer Science&#10;5+ years experience in web development&#10;Strong knowledge of React and Node.js"
                        rows="4"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Benefits
                      </label>
                      <textarea
                        name="benefits"
                        value={formData.benefits}
                        onChange={handleInputChange}
                        className={`${fieldClass} resize-none`}
                        placeholder="Describe the benefits, perks, and compensation details..."
                        rows="4"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Job Description
                      </label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        className={`${fieldClass} resize-none`}
                        placeholder="Detailed job description..."
                        rows="4"
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
                      {loading ? 'Saving...' : (editingId ? 'Update Job' : 'Post Job')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Application Full Page */}
        {showApplicationModal && selectedJob && (
          <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 z-10 border-b border-slate-200 bg-white shadow-sm">
              <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4 sm:px-8">
                <button
                  type="button"
                  onClick={() => {
                    setShowApplicationModal(false);
                    setSelectedJob(null);
                    setCoverLetter('');
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-100 border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                  Back to Jobs
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setApplicationTab('overview')}
                    className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      applicationTab === 'overview'
                        ? 'bg-blue-700 text-white shadow-md shadow-blue-700/20'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    type="button"
                    onClick={() => setApplicationTab('application')}
                    className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      applicationTab === 'application'
                        ? 'bg-blue-700 text-white shadow-md shadow-blue-700/20'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Application
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="mx-auto max-w-5xl px-6 py-8 sm:px-8">
              {applicationTab === 'overview' ? (
                /* ── Overview Tab ── */
                <div className="space-y-8">
                  <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">{selectedJob.job_title}</h1>
                    <p className="mt-2 text-lg text-slate-500">{selectedJob.company}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {selectedJob.location && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          {selectedJob.location}
                        </span>
                      )}
                      {selectedJob.job_type && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          {selectedJob.job_type}
                        </span>
                      )}
                      {selectedJob.salary_range && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          {selectedJob.salary_range}
                        </span>
                      )}
                      {selectedJob.application_deadline && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          Deadline: {new Date(selectedJob.application_deadline).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Job Details</h3>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Company</p>
                            <p className="text-sm font-semibold text-slate-900">{selectedJob.company}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Location</p>
                            <p className="text-sm font-semibold text-slate-900">{selectedJob.location || 'Not specified'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Salary Range</p>
                            <p className="text-sm font-semibold text-slate-900">{selectedJob.salary_range || 'Not specified'}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Timeline</h3>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Posted</p>
                            <p className="text-sm font-semibold text-slate-900">{selectedJob.created_at ? new Date(selectedJob.created_at).toLocaleDateString() : 'N/A'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 text-rose-600">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Application Deadline</p>
                            <p className="text-sm font-semibold text-slate-900">{selectedJob.application_deadline ? new Date(selectedJob.application_deadline).toLocaleDateString() : 'Open until filled'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Employment Type</p>
                            <p className="text-sm font-semibold text-slate-900">{selectedJob.job_type || 'Not specified'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-xl font-bold text-slate-900 mb-4">Job Description</h2>
                    <div className="prose prose-slate max-w-none text-base leading-7 text-slate-700 whitespace-pre-line">
                      {selectedJob.description || 'No description provided.'}
                    </div>
                  </div>

                  {selectedJob.requirements && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                      <h2 className="text-xl font-bold text-slate-900 mb-4">Requirements & Qualifications</h2>
                      <div className="prose prose-slate max-w-none text-base leading-7 text-slate-700 whitespace-pre-line">
                        {selectedJob.requirements}
                      </div>
                    </div>
                  )}

                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-xl font-bold text-slate-900 mb-4">Benefits</h2>
                    <div className="prose prose-slate max-w-none text-base leading-7 text-slate-700 whitespace-pre-line">
                      {selectedJob.benefits || 'No benefits listed.'}
                    </div>
                  </div>
                </div>
              ) : (
                /* ── Application Tab ── */
                <form id="job-application-form" onSubmit={handleSubmitApplication} className="space-y-6">
                  <div className="rounded-2xl border border-blue-100 bg-blue-50/80 px-4 py-4 shadow-sm">
                    <div className="flex gap-3 items-center">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <p className="text-sm leading-6 text-blue-800">
                        Your profile information, qualifications, and employment history will be shared with the employer when you submit this application.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6 xl:grid-cols-5 xl:items-stretch">
                    <div className="xl:col-span-3 flex flex-col">
                      <div className="flex h-full min-h-[36rem] flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <label className="block text-sm font-semibold text-slate-900 mb-1.5">
                          Cover Letter *
                        </label>
                        <p className="text-xs text-slate-500 mb-3">
                          Introduce yourself and explain why you're interested in this position. This is required.
                        </p>
                        <textarea
                          value={coverLetter}
                          onChange={(e) => setCoverLetter(e.target.value)}
                          className="block min-h-[28rem] flex-1 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm leading-6 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                          placeholder={"Dear Hiring Manager,\n\nI am writing to express my interest in the position..."}
                          rows="12"
                        />
                      </div>
                    </div>

                    <div className="xl:col-span-2 space-y-4">
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm space-y-3">
                        <h4 className="text-sm font-semibold text-amber-900 mb-2">Resume / CV</h4>
                        <p className="text-sm leading-6 text-amber-800">Upload your resume so employers can review your background faster.</p>
                        <input
                          type="file"
                          multiple
                          accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                          onChange={(e) => setResumeFiles(e.target.files ? Array.from(e.target.files) : [])}
                          className="block w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm file:mr-4 file:rounded-lg file:border-0 file:bg-amber-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-amber-900 hover:file:bg-amber-200"
                        />
                        {resumeFiles.length > 0 && (
                          <div className="mt-2 space-y-2">
                            {resumeFiles.map((f, idx) => (
                              <div key={idx} className="flex items-center justify-between gap-2 bg-white rounded-md px-3 py-2 border border-gray-100">
                                <div className="truncate text-sm text-slate-800">{f.name} <span className="text-xs text-gray-400">({Math.round(f.size/1024)} KB)</span></div>
                                <button type="button" onClick={() => setResumeFiles(prev => prev.filter((_,i) => i !== idx))} className="text-red-600 text-xs font-semibold">Remove</button>
                              </div>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-slate-500">Or leave blank to use your profile documents.</p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <h4 className="text-sm font-semibold text-slate-900 mb-3">Contact Verification</h4>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Preferred contact method</label>
                        <div className="mb-3 inline-flex w-full rounded-xl border border-slate-200 bg-slate-50 p-1">
                          <button
                            type="button"
                            onClick={() => setContactMethod('email')}
                            className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                              contactMethod === 'email'
                                ? 'bg-blue-700 text-white shadow-sm'
                                : 'text-slate-600 hover:bg-white'
                            }`}
                          >
                            Email
                          </button>
                          <button
                            type="button"
                            onClick={() => setContactMethod('phone')}
                            className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                              contactMethod === 'phone'
                                ? 'bg-blue-700 text-white shadow-sm'
                                : 'text-slate-600 hover:bg-white'
                            }`}
                          >
                            Phone
                          </button>
                        </div>

                        <label className="block text-xs font-medium text-gray-600 mb-1">Contact Email</label>
                        <input
                          type="email"
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          className={`${fieldClass} mb-3 ${contactMethod === 'email' ? 'border-blue-300 ring-2 ring-blue-100' : ''}`}
                        />

                        <label className="block text-xs font-medium text-gray-600 mb-1">Contact Number</label>
                        <input
                          type="text"
                          value={contactNumber}
                          onChange={(e) => setContactNumber(e.target.value)}
                          className={`${fieldClass} ${contactMethod === 'phone' ? 'border-blue-300 ring-2 ring-blue-100' : ''}`}
                        />
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <h4 className="text-sm font-semibold text-slate-900 mb-3">What happens next?</h4>
                        <ul className="space-y-2 text-sm leading-6 text-slate-600">
                          <li className="flex gap-2">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
                            <span>Your application will be sent to the employer</span>
                          </li>
                          <li className="flex gap-2">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
                            <span>The employer will review your profile and qualifications</span>
                          </li>
                          <li className="flex gap-2">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
                            <span>You'll be contacted if your application is selected</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => {
                        setShowApplicationModal(false);
                        setSelectedJob(null);
                        setCoverLetter('');
                      }}
                      className={secondaryActionClass}
                      disabled={applicationLoading}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={applicationLoading}
                      className={primaryActionClass}
                    >
                      {applicationLoading ? 'Submitting...' : 'Submit Application'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
      </div>
    </UserLayout>
  );
};

export default Employment;
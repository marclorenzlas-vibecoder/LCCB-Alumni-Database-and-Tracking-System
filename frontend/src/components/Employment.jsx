import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import careerService from '../services/careerService';
import applicationService from '../services/applicationService';
import { authService } from '../services/authService';
import ConfirmModal from './ConfirmModal';
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
    type: '',
    salary: '',
    requirements: '',
    deadline: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Application modal state
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
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

  const categories = ['All', 'Technology', 'Marketing', 'Analytics', 'Finance', 'Education'];
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

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
        job_type: formData.type,
        salary_range: formData.salary || null,
        requirements: formData.requirements || null,
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
        type: '',
        salary: '',
        requirements: '',
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
      type: job.job_type || '',
      salary: job.salary_range || '',
      requirements: job.requirements || '',
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
    .filter(job => selectedCategory === 'All' || job.category === selectedCategory)
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
                onClick={() => setShowModal(true)}
                className="app-primary-button"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Post a Job
              </button>
            )}
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="mb-8">
          <div className="max-w-3xl mx-auto">
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
                  placeholder="Search jobs, companies, or locations"
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

            {/* Category Filter */}
            <div className="flex flex-wrap gap-2 justify-center">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`${pillClass} ${
                    selectedCategory === category
                      ? 'border-blue-700 bg-blue-700 text-white shadow-sm shadow-blue-700/20'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Jobs List */}
        <div className="space-y-6">
          {loading && <div className="text-center py-8">Loading jobs...</div>}
          {!loading && filteredJobs.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg shadow-md">
              <p className="text-gray-500">No job postings found. Be the first to post a job!</p>
            </div>
          )}
          {filteredJobs.map((job) => {
            // Format dates
            const formattedDeadline = job.application_deadline 
              ? new Date(job.application_deadline).toLocaleDateString()
              : null;
            
            return (
              <div
                key={job.id}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-semibold tracking-tight text-slate-900">{job.job_title}</h3>
                    <p className="mt-1 text-sm font-medium text-slate-500">{job.company}</p>
                  </div>
                  {job.created_at && (
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Posted {new Date(job.created_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
                
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="flex items-center text-slate-600">
                    <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {job.location || 'Not specified'}
                  </div>
                  <div className="flex items-center text-slate-600">
                    <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {job.job_type || 'Not specified'}
                  </div>
                  <div className="flex items-center text-slate-600">
                    <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {job.salary_range || 'Not specified'}
                  </div>
                  {formattedDeadline && (
                    <div className="flex items-center text-slate-600">
                      <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Deadline: {formattedDeadline}
                    </div>
                  )}
                </div>

                {/* Requirements Section */}
                {job.requirements && (
                  <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                    <h4 className="text-sm font-semibold text-slate-900 mb-2">Requirements</h4>
                    <div className="text-sm leading-6 text-slate-600 max-h-[7.5rem] overflow-y-auto scrollbar-hide">
                      <div className="whitespace-pre-wrap">{job.requirements}</div>
                    </div>
                  </div>
                )}

                {/* Job Description Section */}
                {job.description && (
                  <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                    <h4 className="text-sm font-semibold text-slate-900 mb-2">Description</h4>
                    <div className="text-sm leading-6 text-slate-600 max-h-[7.5rem] overflow-y-auto scrollbar-hide">
                      <div className="whitespace-pre-wrap">{job.description}</div>
                    </div>
                  </div>
                )}

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  {!isTeacher && (
                    appliedJobs.has(job.id) ? (
                      getApplicationStatusButton(job.id)
                    ) : (
                      <button 
                        onClick={() => handleApplyNow(job)} 
                        className={`${primaryActionClass} flex-1`}>
                        Apply Now
                      </button>
                    )
                  )}
                  {isTeacher && (
                    <>
                      <button 
                        onClick={() => navigate(`/job-applications/${job.id}`)}
                        className="flex-1 px-5 py-3 text-sm font-semibold text-white bg-blue-600 rounded-xl shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-100">
                        View Applications ({applicationCounts[job.id] || 0})
                      </button>
                      <button 
                        onClick={() => handleEdit(job)}
                        className="flex-1 px-3 py-1.5 rounded-md bg-sky-600 text-white hover:bg-sky-700 shadow-sm text-sm font-medium transition-colors">
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(job.id)}
                        className="flex-1 px-3 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700 shadow-sm text-sm font-medium transition-colors">
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal for Posting a Job */}
        {showModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-full max-w-3xl shadow-lg rounded-xl bg-white max-h-[90vh] overflow-hidden flex flex-col">
              <div className="bg-white border-b border-gray-200 px-3 py-4 -mx-5 -mt-5 rounded-t-xl z-10">
                <h3 className="text-2xl font-semibold text-gray-900">
                  {editingId ? 'Edit Job Posting' : 'Post a Job Opportunity'}
                </h3>
                <p className="mt-1 text-sm leading-6 text-gray-500">Enter the details for the {editingId ? 'job update' : 'new job posting'}. Keep it clear, specific, and easy to scan.</p>
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

                    <div className="sm:col-span-2 pt-4 border-t border-gray-200">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Posted By (Optional)
                      </label>
                      <p className="text-xs text-gray-500 mb-2">
                        Select an alumni if posting on behalf of an alumni employer. Leave blank if posting for the school/organization.
                      </p>
                      <select
                        name="alumni_id"
                        value={formData.alumni_id}
                        onChange={handleInputChange}
                        className={selectFieldClass}
                      >
                        <option value="">School/Organization (No specific alumni)</option>
                        {alumniList.map((alumni) => (
                          <option key={alumni.id} value={alumni.id}>
                            {alumni.first_name} {alumni.last_name} - {alumni.email}
                          </option>
                        ))}
                      </select>
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

        {/* Application Modal */}
        {showApplicationModal && selectedJob && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/55 backdrop-blur-sm">
            <div className="relative mx-auto my-6 flex w-[min(100%-1rem,72rem)] max-w-6xl flex-col overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-2xl max-h-[calc(100vh-3rem)]">
              <div className="sticky top-0 z-10 border-b border-blue-100 bg-gradient-to-r from-blue-50 via-white to-blue-50 px-6 py-5 sm:px-8">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h3 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                      Apply for {selectedJob.job_title}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      at {selectedJob.company}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedJob.location && (
                      <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 shadow-sm">
                        {selectedJob.location}
                      </span>
                    )}
                    {selectedJob.type && (
                      <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                        {selectedJob.type}
                      </span>
                    )}
                    {selectedJob.salary && (
                      <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 shadow-sm">
                        {selectedJob.salary}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto scrollbar-hide bg-slate-50/60 px-6 py-6 sm:px-8">
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
                          placeholder="Dear Hiring Manager,\n\nI am writing to express my interest in the position..."
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
                          className="block w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sml text-slate-700 shadow-sm file:mr-4 file:rounded-lg file:border-0 file:bg-amber-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-amber-900 hover:file:bg-amber-200"
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
                        <h4 className="text-sm font-semibold text-slate-900 mb-3">
                          What happens next?
                        </h4>
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

                </form>
              </div>

              <div className="shrink-0 border-t border-slate-200 bg-white px-6 py-4 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] sm:px-8">
                <div className="flex justify-end gap-3">
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
                    form="job-application-form"
                    disabled={applicationLoading}
                    className={primaryActionClass}
                  >
                    {applicationLoading ? 'Submitting...' : 'Submit Application'}
                  </button>
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
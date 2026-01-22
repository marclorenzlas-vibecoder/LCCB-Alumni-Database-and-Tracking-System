import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import careerService from '../services/careerService';
import applicationService from '../services/applicationService';
import { authService } from '../services/authService';
import ConfirmModal from './ConfirmModal';
import Toast from './Toast';

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
  const [appliedJobs, setAppliedJobs] = useState(new Map()); // Map of job_id -> application status
  const [applicationLoading, setApplicationLoading] = useState(false);
  const [applicationCounts, setApplicationCounts] = useState({});
  const [toast, setToast] = useState(null);

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    type: 'danger'
  });

  const categories = ['All', 'Technology', 'Marketing', 'Analytics', 'Finance', 'Education'];
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

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
    
    return (
      <button 
        disabled
        className={`flex-1 ${config.bgColor} text-white px-6 py-2 rounded-md cursor-not-allowed font-medium`}>
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
      const response = await fetch('http://localhost:5001/api/alumni');
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
        setToast({ message: 'Job updated successfully!', type: 'success' });
      } else {
        // Create new job post
        await careerService.createJob(jobData);
        setToast({ message: 'Job posted successfully!', type: 'success' });
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
      onConfirm: async () => {
        try {
          await careerService.deleteJob(id);
          await fetchPostedJobs();
          setConfirmModal({ ...confirmModal, isOpen: false });
          setToast({ message: 'Job deleted successfully!', type: 'success' });
        } catch (err) {
          console.error('Error deleting job:', err);
          setToast({ message: 'Failed to delete job', type: 'error' });
          setConfirmModal({ ...confirmModal, isOpen: false });
        }
      }
    });
  };

  const handleApplyNow = (job) => {
    // Extract alumni ID from nested alumni object
    const alumniId = currentUser?.alumni?.id || currentUser?.alumniId;
    if (!alumniId) {
      setToast({ message: 'Please log in as an alumni to apply for jobs.', type: 'warning' });
      return;
    }
    
    setSelectedJob(job);
    setCoverLetter('');
    setShowApplicationModal(true);
  };

  const handleSubmitApplication = async (e) => {
    e.preventDefault();
    setApplicationLoading(true);

    try {
      // Extract alumni ID from nested alumni object
      const alumniId = currentUser?.alumni?.id || currentUser?.alumniId;
      await applicationService.applyToJob(
        selectedJob.id,
        alumniId,
        coverLetter
      );
      
      // Update applied jobs map with PENDING status
      setAppliedJobs(prev => new Map(prev).set(selectedJob.id, {
        status: 'PENDING',
        appliedAt: new Date().toISOString(),
        reviewedAt: null
      }));
      
      // Trigger instant notification refresh for all users
      if (window.refreshNotifications) {
        window.refreshNotifications();
      }
      
      setShowApplicationModal(false);
      setToast({ message: 'Application submitted successfully! The employer will be notified and will review your qualifications.', type: 'success' });
    } catch (err) {
      console.error('Error submitting application:', err);
      const errorMsg = err.response?.data?.error || 'Failed to submit application';
      setToast({ message: errorMsg, type: 'error' });
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
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      
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
      
      <div className="max-w-7xl mx-auto">
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
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-900 rounded-md shadow-sm hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:ring-offset-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
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
            <div className="flex mb-4">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search jobs, companies, or locations..."
                  className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-900 focus:border-blue-900"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="absolute left-4 top-3.5">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-2 justify-center">
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
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 p-6"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">{job.job_title}</h3>
                    <p className="text-gray-600 mt-1">{job.company}</p>
                  </div>
                  {job.created_at && (
                    <span className="px-3 py-1 text-sm font-medium text-gray-600 bg-gray-100 rounded-full">
                      Posted {new Date(job.created_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
                
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="flex items-center text-gray-600">
                    <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {job.location || 'Not specified'}
                  </div>
                  <div className="flex items-center text-gray-600">
                    <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {job.job_type || 'Not specified'}
                  </div>
                  <div className="flex items-center text-gray-600">
                    <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {job.salary_range || 'Not specified'}
                  </div>
                  {formattedDeadline && (
                    <div className="flex items-center text-gray-600">
                      <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Deadline: {formattedDeadline}
                    </div>
                  )}
                </div>

                {/* Requirements Section */}
                {job.requirements && (
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Requirements:</h4>
                    <div className="text-sm text-gray-600 max-h-[7.5rem] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                      <div className="whitespace-pre-wrap">{job.requirements}</div>
                    </div>
                  </div>
                )}

                {/* Job Description Section */}
                {job.description && (
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Description:</h4>
                    <div className="text-sm text-gray-600 max-h-[7.5rem] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                      <div className="whitespace-pre-wrap">{job.description}</div>
                    </div>
                  </div>
                )}

                <div className="mt-6 flex gap-4">
                  {!isTeacher && (
                    appliedJobs.has(job.id) ? (
                      getApplicationStatusButton(job.id)
                    ) : (
                      <button 
                        onClick={() => handleApplyNow(job)} 
                        className="flex-1 bg-blue-900 text-white px-6 py-2 rounded-md hover:bg-blue-800 transition-colors duration-200">
                        Apply Now
                      </button>
                    )
                  )}
                  {isTeacher && (
                    <>
                      <button 
                        onClick={() => navigate(`/job-applications/${job.id}`)}
                        className="flex-1 bg-blue-50 text-blue-600 px-6 py-2 rounded-md border border-blue-200 hover:bg-blue-100 transition-colors duration-200 font-medium">
                        View Applications ({applicationCounts[job.id] || 0})
                      </button>
                      <button 
                        onClick={() => handleEdit(job)}
                        className="flex-1 bg-blue-50 text-blue-600 px-6 py-2 rounded-md border border-blue-200 hover:bg-blue-100 transition-colors duration-200 font-medium">
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(job.id)}
                        className="flex-1 bg-red-50 text-red-600 px-6 py-2 rounded-md border border-red-200 hover:bg-red-100 transition-colors duration-200 font-medium">
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
                <p className="mt-1 text-sm text-gray-500">Enter the details for the {editingId ? 'job update' : 'new job posting'}</p>
              </div>
              <div className="mt-6 overflow-y-auto scrollbar-hide flex-1" style={{scrollbarWidth: 'none', msOverflowStyle: 'none'}}>
                <style jsx>{`
                  .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                  }
                `}</style>
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
                        className="mt-1 block w-full px-3 py-2.5 text-sm rounded-md border border-gray-300 focus:border-blue-900 focus:ring-1 focus:ring-blue-900"
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
                        className="mt-1 block w-full px-3 py-2.5 text-sm rounded-md border border-gray-300 focus:border-blue-900 focus:ring-1 focus:ring-blue-900"
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
                        className="mt-1 block w-full px-3 py-2.5 text-sm rounded-md border border-gray-300 focus:border-blue-900 focus:ring-1 focus:ring-blue-900"
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
                        className="mt-1 block w-full px-3 py-2.5 text-sm rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
                        className="mt-1 block w-full px-3 py-2.5 text-sm rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
                        className="mt-1 block w-full px-3 py-2.5 text-sm rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
                        className="mt-1 block w-full px-3 py-2.5 text-sm rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
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
                        className="mt-1 block w-full px-3 py-2.5 text-sm rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
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
                        className="mt-1 block w-full px-3 py-2.5 text-sm rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-900 rounded-md hover:bg-blue-800 disabled:bg-blue-400"
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
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-xl bg-white">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-3 py-4 -mx-5 -mt-5 rounded-t-xl">
                <h3 className="text-2xl font-semibold text-gray-900">
                  Apply for {selectedJob.job_title}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  at {selectedJob.company}
                </p>
              </div>
              
              <div className="mt-6">
                <form onSubmit={handleSubmitApplication} className="space-y-6">
                  <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-blue-700">
                          Your profile information, qualifications, and employment history will be shared with the employer when you submit this application.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cover Letter (Optional)
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      Introduce yourself and explain why you're interested in this position
                    </p>
                    <textarea
                      value={coverLetter}
                      onChange={(e) => setCoverLetter(e.target.value)}
                      className="mt-1 block w-full px-3 py-2.5 text-sm rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                      placeholder="Dear Hiring Manager,&#10;&#10;I am writing to express my interest in the position..."
                      rows="8"
                    />
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">
                      What happens next?
                    </h4>
                    <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                      <li>Your application will be sent to the employer</li>
                      <li>The employer will review your profile and qualifications</li>
                      <li>You'll be contacted if your application is selected</li>
                    </ul>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => {
                        setShowApplicationModal(false);
                        setSelectedJob(null);
                        setCoverLetter('');
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                      disabled={applicationLoading}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={applicationLoading}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-400"
                    >
                      {applicationLoading ? 'Submitting...' : 'Submit Application'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Employment;
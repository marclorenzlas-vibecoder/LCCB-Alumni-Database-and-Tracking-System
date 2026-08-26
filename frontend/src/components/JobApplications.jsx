import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import applicationService from '../services/applicationService';
import careerService from '../services/careerService';
import Toast from './Toast';
import { API_BASE_URL, IMAGE_BASE_URL } from '../config/apiBaseUrl';

/**
 * JobApplications Component - Application Management for Teachers
 * 
 * Access: Teachers with @lccbonline.com email addresses
 * Purpose: View and manage all applications for a specific job posting
 * 
 * Features:
 * - View all applicants with full profiles
 * - See alumni qualifications (education, skills, employment history)
 * - Filter applications by status
 * - Update application status (PENDING, REVIEWED, SHORTLISTED, ACCEPTED, REJECTED)
 * - Read applicant cover letters
 */
const JobApplications = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const modalRef = useRef(null);
  const [applications, setApplications] = useState([]);
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCoverLetterModal, setShowCoverLetterModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [toast, setToast] = useState(null);

  const getStatusToast = (status) => {
    const statusConfig = {
      REVIEWED: {
        message: 'Application marked as reviewed successfully!',
        type: 'info'
      },
      SHORTLISTED: {
        message: 'Application shortlisted successfully!',
        type: 'warning'
      },
      ACCEPTED: {
        message: 'Application accepted successfully!',
        type: 'success'
      },
      REJECTED: {
        message: 'Application rejected successfully!',
        type: 'error'
      }
    };

    return statusConfig[status] || {
      message: `Application status updated to ${status} successfully!`,
      type: 'success'
    };
  };

  useEffect(() => {
    fetchJobAndApplications();
  }, [jobId]);

  useEffect(() => {
    if (showDetailModal && modalRef.current) {
      modalRef.current.scrollTop = 0;
    }
  }, [showDetailModal]);

  const fetchJobAndApplications = async () => {
    try {
      setLoading(true);
      const [jobData, applicationsData] = await Promise.all([
        careerService.getJobById(jobId),
        applicationService.getJobApplications(jobId)
      ]);
      setJob(jobData);
      setApplications(applicationsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (applicationId, newStatus) => {
    try {
      console.log('Updating application', applicationId, 'to status', newStatus);
      const response = await applicationService.updateApplicationStatus(applicationId, newStatus);
      console.log('Update response:', response);
      
      // Refresh the applications list
      await fetchJobAndApplications();
      
      // Trigger instant notification refresh for the applicant
      if (window.refreshNotifications) {
        window.refreshNotifications();
      }
      
      // Trigger instant application count refresh
      if (window.refreshApplicationCounts) {
        window.refreshApplicationCounts();
      }
      
      // Trigger instant application status refresh for alumni
      if (window.refreshApplicationStatus) {
        window.refreshApplicationStatus();
      }
      
      const statusToast = getStatusToast(newStatus);
      setToast(statusToast);
    } catch (error) {
      console.error('Error updating status:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Failed to update application status';
      setToast({ message: errorMsg, type: 'error' });
    }
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      REVIEWED: 'bg-blue-100 text-blue-800',
      SHORTLISTED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      ACCEPTED: 'bg-purple-100 text-purple-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const filteredApplications = filterStatus === 'ALL' 
    ? applications 
    : applications.filter(app => app.status === filterStatus);

  const getResumeLink = (application) => {
    if (!application?.resume_url) return null;
    return `${API_BASE_URL}/applications/${application.id}/resume`;
  };

  const getPreferredContact = (application) => {
    if (application?.contact_method === 'phone') return 'Phone';
    if (application?.contact_method === 'email') return 'Email';
    return application?.applicant?.contact_number ? 'Phone / Email' : 'Email';
  };

  const actionButtonBaseClass = 'inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60';
  const actionButtonVariants = {
    blue: 'bg-blue-600 shadow-blue-600/20 hover:bg-blue-700 focus:ring-blue-100',
    indigo: 'bg-indigo-600 shadow-indigo-600/20 hover:bg-indigo-700 focus:ring-indigo-100',
    amber: 'bg-amber-500 shadow-amber-500/20 hover:bg-amber-600 focus:ring-amber-100',
    emerald: 'bg-emerald-600 shadow-emerald-600/20 hover:bg-emerald-700 focus:ring-emerald-100',
    red: 'bg-red-600 shadow-red-600/20 hover:bg-red-700 focus:ring-red-100'
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <div className="w-full max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/employment')}
            className="mb-4 text-blue-600 hover:text-blue-800 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Jobs
          </button>
          
          {job && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h1 className="text-3xl font-bold text-gray-900">{job.job_title}</h1>
              <p className="text-lg text-gray-600 mt-1">{job.company}</p>
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  {job.location}
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {applications.length} Applications
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 bg-white rounded-lg shadow-md p-4">
          <div className="flex flex-wrap gap-2">
            {['ALL', 'PENDING', 'REVIEWED', 'SHORTLISTED', 'ACCEPTED', 'REJECTED'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  filterStatus === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status}
                {status !== 'ALL' && (
                  <span className="ml-2 text-xs">
                    ({applications.filter(app => app.status === status).length})
                  </span>
                )}
                {status === 'ALL' && (
                  <span className="ml-2 text-xs">({applications.length})</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Applications List */}
        {filteredApplications.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-500">No applications found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredApplications.map((application) => (
              <div
                key={application.id}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-all"
              >
                <div 
                  onClick={() => {
                    setSelectedApplication(application);
                    setShowDetailModal(true);
                  }}
                  className="cursor-pointer hover:scale-[1.01] transition-transform"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 hover:text-blue-600">
                        {application.applicant.first_name} {application.applicant.last_name}
                      </h3>
                      <p className="text-gray-600 mt-1">
                        {application.applicant.current_position || 'Position not specified'} 
                        {application.applicant.company && ` at ${application.applicant.company}`}
                      </p>
                      <div className="mt-2 text-sm text-gray-500">
                        Applied on {new Date(application.applied_at).toLocaleDateString()}
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(application.status)}`}>
                      {application.status}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap gap-2">
                  {application.cover_letter && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedApplication(application);
                        setShowCoverLetterModal(true);
                      }}
                      className={`${actionButtonBaseClass} ${actionButtonVariants.blue}`}
                    >
                      View Cover Letter
                    </button>
                  )}
                  {application.resume_url && (
                    <a
                      href={getResumeLink(application)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className={`${actionButtonBaseClass} ${actionButtonVariants.indigo}`}
                    >
                      View Resume
                    </a>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStatusUpdate(application.id, 'REVIEWED');
                    }}
                    className={`${actionButtonBaseClass} ${actionButtonVariants.blue}`}
                    disabled={application.status === 'REVIEWED'}
                  >
                    Mark as Reviewed
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStatusUpdate(application.id, 'SHORTLISTED');
                    }}
                    className={`${actionButtonBaseClass} ${actionButtonVariants.amber}`}
                    disabled={application.status === 'SHORTLISTED'}
                  >
                    Shortlist
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStatusUpdate(application.id, 'ACCEPTED');
                    }}
                    className={`${actionButtonBaseClass} ${actionButtonVariants.emerald}`}
                    disabled={application.status === 'ACCEPTED'}
                  >
                    Accept
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStatusUpdate(application.id, 'REJECTED');
                    }}
                    className={`${actionButtonBaseClass} ${actionButtonVariants.red}`}
                    disabled={application.status === 'REJECTED'}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Detail Modal */}
        {showDetailModal && selectedApplication && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-[100]">
            <div ref={modalRef} className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto scrollbar-hide relative">
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedApplication(null);
                }}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-2 z-10"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="p-8">
                {/* Header */}
                <div className="flex items-start gap-6 mb-6">
                  <div className="flex-shrink-0">
                    {(selectedApplication.applicant.profile_image || selectedApplication.applicant.profileImage) ? (
                      <img
                        src={`http://localhost:5001${selectedApplication.applicant.profile_image || selectedApplication.applicant.profileImage}`}
                        alt={`${selectedApplication.applicant.first_name} ${selectedApplication.applicant.last_name}`}
                        className="w-32 h-32 rounded-full object-cover border-4 border-gray-200 shadow-lg"
                        onError={(e) => {
                          e.target.src = `https://ui-avatars.com/api/?name=${selectedApplication.applicant.first_name}+${selectedApplication.applicant.last_name}&background=random&size=200`;
                        }}
                      />
                    ) : (
                      <img
                        src={`https://ui-avatars.com/api/?name=${selectedApplication.applicant.first_name}+${selectedApplication.applicant.last_name}&background=random&size=200`}
                        alt={`${selectedApplication.applicant.first_name} ${selectedApplication.applicant.last_name}`}
                        className="w-32 h-32 rounded-full object-cover border-4 border-gray-200 shadow-lg"
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-3xl font-bold text-gray-900">
                      {selectedApplication.applicant.first_name} {selectedApplication.applicant.last_name}
                    </h2>
                    <p className="text-lg text-gray-600 mt-1">
                      {selectedApplication.applicant.current_position || 'Position not specified'}
                    </p>
                    {selectedApplication.applicant.company && (
                      <p className="text-gray-600 flex items-center gap-1 mt-1">
                        <span>at</span>
                        <span className="text-blue-600 font-medium">{selectedApplication.applicant.company}</span>
                      </p>
                    )}
                    {selectedApplication.applicant.location && (
                      <p className="text-sm text-gray-500 mt-2 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {selectedApplication.applicant.location}
                      </p>
                    )}
                    <span className={`inline-block mt-3 px-4 py-2 rounded-full text-sm font-medium ${getStatusBadgeColor(selectedApplication.status)}`}>
                      {selectedApplication.status}
                    </span>
                  </div>
                </div>

                <div className="border-t border-gray-200 mb-6" />

                {/* Contact Information */}
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Contact Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Email</label>
                      <p className="text-gray-900">{selectedApplication.applicant.email}</p>
                    </div>
                    {selectedApplication.applicant.contact_number && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Phone</label>
                        <p className="text-gray-900">{selectedApplication.applicant.contact_number}</p>
                      </div>
                    )}
                    {selectedApplication.applicant.location && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Location</label>
                        <p className="text-gray-900">{selectedApplication.applicant.location}</p>
                      </div>
                    )}
                  </div>
                </div>

                  {/* Application Preferences */}
                  <div className="mb-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Application Preferences
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Preferred Contact</label>
                        <p className="text-gray-900">{getPreferredContact(selectedApplication)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Resume</label>
                        {selectedApplication.resume_url ? (
                          <a
                            href={getResumeLink(selectedApplication)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-700 hover:text-blue-800 font-medium"
                          >
                            Open uploaded resume
                          </a>
                        ) : (
                          <p className="text-gray-900">No resume uploaded</p>
                        )}
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Application Contact Email</label>
                        <p className="text-gray-900">{selectedApplication.contact_email || selectedApplication.applicant.email || 'Not provided'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Application Contact Number</label>
                        <p className="text-gray-900">{selectedApplication.contact_number || selectedApplication.applicant.contact_number || 'Not provided'}</p>
                      </div>
                    </div>
                  </div>

                {/* Education */}
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    Academic Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Course</label>
                      <p className="text-gray-900">{selectedApplication.applicant.course || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Level</label>
                      <p className="text-gray-900">{selectedApplication.applicant.level || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Graduation Year</label>
                      <p className="text-gray-900">{selectedApplication.applicant.graduation_year || 'Not specified'}</p>
                    </div>
                    {selectedApplication.applicant.batch && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Batch</label>
                        <p className="text-gray-900">{selectedApplication.applicant.batch}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Skills */}
                {selectedApplication.applicant.skills && (
                  <div className="mb-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                      Skills
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedApplication.applicant.skills.split(',').map((skill, index) => (
                        <span
                          key={index}
                          className="px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                        >
                          {skill.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Application Date */}
                <div className="mb-6 text-sm text-gray-500">
                  <strong>Applied on:</strong> {new Date(selectedApplication.applied_at).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>

                {/* Action Buttons - Removed from detail modal */}
                <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      setSelectedApplication(null);
                    }}
                    className="px-6 py-2.5 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 font-medium"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cover Letter Modal */}
        {showCoverLetterModal && selectedApplication && selectedApplication.cover_letter && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-[110]">
            <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto scrollbar-hide relative">
              <button
                onClick={() => setShowCoverLetterModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-2 z-10"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="p-8">
                <div className="mb-6">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">Cover Letter</h2>
                  <p className="text-gray-600">
                    from <span className="font-semibold">{selectedApplication.applicant.first_name} {selectedApplication.applicant.last_name}</span>
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Applied for: <span className="font-medium">{job?.job_title}</span>
                  </p>
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-8 shadow-inner">
                    <p className="text-gray-800 whitespace-pre-wrap leading-relaxed text-base">
                      {selectedApplication.cover_letter}
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => setShowCoverLetterModal(false)}
                    className="px-6 py-2.5 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 font-medium"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default JobApplications;

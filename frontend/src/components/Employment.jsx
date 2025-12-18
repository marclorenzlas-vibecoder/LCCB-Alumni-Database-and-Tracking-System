import React, { useState, useEffect } from 'react';
import careerService from '../services/careerService';
import ConfirmModal from './ConfirmModal';
import { authService } from '../services/authService';

const Employment = () => {
  const [postedJobs, setPostedJobs] = useState([]);
  const isTeacher = authService.isTeacher();
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
  }, []);

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
        alert('Job updated successfully!');
      } else {
        // Create new job post
        await careerService.createJob(jobData);
        alert('Job posted successfully!');
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
          alert('Job deleted successfully!');
        } catch (err) {
          console.error('Error deleting job:', err);
          alert('Failed to delete job');
          setConfirmModal({ ...confirmModal, isOpen: false });
        }
      }
    });
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
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
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
                  className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      ? 'bg-blue-600 text-white'
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
                    <div className="text-sm text-gray-600 max-h-[7.5rem] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">
                      <div className="whitespace-pre-wrap">{job.requirements}</div>
                    </div>
                  </div>
                )}

                {/* Job Description Section */}
                {job.description && (
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Description:</h4>
                    <div className="text-sm text-gray-600 max-h-[7.5rem] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">
                      <div className="whitespace-pre-wrap">{job.description}</div>
                    </div>
                  </div>
                )}

                <div className="mt-6 flex gap-4">
                  {!isTeacher && (
                    <button 
                      onClick={() => alert('Application flow coming soon.')} 
                      className="flex-1 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors duration-200">
                      Apply Now
                    </button>
                  )}
                  {isTeacher && (
                    <>
                      <button 
                        onClick={() => handleEdit(job)}
                        className="flex-1 bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition-colors duration-200">
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(job.id)}
                        className="flex-1 bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 transition-colors duration-200">
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
            <div className="relative top-10 mx-auto p-5 border w-full max-w-3xl shadow-lg rounded-xl bg-white max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-3 py-4 -mx-5 -mt-5 rounded-t-xl">
                <h3 className="text-2xl font-semibold text-gray-900">
                  {editingId ? 'Edit Job Posting' : 'Post a Job Opportunity'}
                </h3>
                <p className="mt-1 text-sm text-gray-500">Enter the details for the {editingId ? 'job update' : 'new job posting'}</p>
              </div>
              <div className="mt-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Posted By (Alumni) *
                      </label>
                      <select
                        name="alumni_id"
                        value={formData.alumni_id}
                        onChange={handleInputChange}
                        required
                        className="mt-1 block w-full px-3 py-2.5 text-sm rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Select an alumni</option>
                        {alumniList.map((alumni) => (
                          <option key={alumni.id} value={alumni.id}>
                            {alumni.first_name} {alumni.last_name} - {alumni.email}
                          </option>
                        ))}
                      </select>
                    </div>
                    
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
                        className="mt-1 block w-full px-3 py-2.5 text-sm rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
                        className="mt-1 block w-full px-3 py-2.5 text-sm rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
                        className="mt-1 block w-full px-3 py-2.5 text-sm rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-400"
                    >
                      {loading ? 'Saving...' : (editingId ? 'Update Job' : 'Post Job')}
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
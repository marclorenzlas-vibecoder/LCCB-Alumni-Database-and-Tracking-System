import React, { useState, useEffect, useRef } from 'react';
import careerService from '../services/careerService';
import { authService } from '../services/authService';
import ConfirmModal from './ConfirmModal';
import FilterMenu from './FilterMenu';
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

/**
 * Employment Component - Job Postings
 * 
 * User Roles (based on email domain):
 * - Teachers (@lccbonline.com): Can post jobs and edit/delete jobs
 * - Alumni (@gmail.com): Can view job opportunities
 */
const Employment = () => {
  const [postedJobs, setPostedJobs] = useState([]);
  const isTeacher = authService.isTeacher();
  const [alumniList, setAlumniList] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(initialJobForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
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
        posted_by_alumni_id: parseInt(formData.alumni_id),
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
      setFormData(initialJobForm);
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
      application_url: job.application_url || '',
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
            {isTeacher && (
              <button
                onClick={() => { setEditingId(null); setFormData(initialJobForm); setError(''); setShowModal(true); }}
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
                    <col style={{ width: '34%' }} />
                    <col style={{ width: '18%' }} />
                    <col style={{ width: '18%' }} />
                    <col style={{ width: '14%', minWidth: '100px' }} />
                    <col style={{ width: '16%', minWidth: '160px' }} />
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
                  onClick={() => handleOpenJobDetail(job)}
                  className="border-b border-gray-100 last:border-b-0 transition hover:bg-blue-50/50 cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-lg font-semibold text-blue-600 hover:text-blue-800 transition truncate">{job.job_title}</p>
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
                        placeholder="https://www.linkedin.com/jobs/view/..."
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
                        placeholder="Detailed description..."
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
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-100 border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
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

                  <div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Job Details</h3>
                      <div className="grid gap-4 sm:grid-cols-2">
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
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Posted</p>
                            <p className="text-sm font-semibold text-slate-900">{selectedJob.created_at ? new Date(selectedJob.created_at).toLocaleDateString() : 'N/A'}</p>
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
                    <div className="prose prose-slate max-w-none text-base leading-7 text-slate-700 whitespace-pre-line">
                      {selectedJob.description || 'No description provided.'}
                    </div>
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

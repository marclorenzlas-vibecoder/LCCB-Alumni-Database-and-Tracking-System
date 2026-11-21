import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getImageUrl } from '../config/apiBaseUrl';
import { toast } from 'react-toastify';
import { API_BASE_URL, IMAGE_BASE_URL } from '../config/apiBaseUrl';
import UserLayout from './UserLayout';
import statsService from '../services/statsService';
import { realtimeClient } from '../services/realtimeClient';
import { groupSectionDefinitions } from '../config/groupSections';
import ConfirmModal from './ConfirmModal';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const toneClasses = {
  sky: 'from-sky-500 to-sky-500',
  amber: 'from-amber-500 to-amber-500',
  emerald: 'from-emerald-500 to-emerald-500',
  violet: 'from-violet-500 to-violet-500',
  cyan: 'from-cyan-500 to-cyan-500',
  rose: 'from-rose-500 to-rose-500',
  blue: 'from-blue-700 to-blue-700'
};

const toneBgClasses = {
  sky: 'bg-sky-500 text-white',
  amber: 'bg-amber-500 text-white',
  emerald: 'bg-emerald-500 text-white',
  violet: 'bg-violet-500 text-white',
  cyan: 'bg-cyan-500 text-white',
  rose: 'bg-rose-500 text-white',
  blue: 'bg-blue-700 text-white'
};

const cardIcons = {
  'Total Alumni': (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  'Pending Requests': (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  'Approved Alumni': (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  'Active Members': (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728M12 9v3l2 2" />
    </svg>
  ),
  'Upcoming Events': (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  'Teachers': (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
    </svg>
  )
};

const AdminDashboard = ({ pendingOnly = false }) => {
  const location = useLocation();
  const [pendingUsers, setPendingUsers] = useState([]);
  const [pendingAchievements, setPendingAchievements] = useState([]);
  const [pendingJobs, setPendingJobs] = useState([]);
  const [pendingTab, setPendingTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    return ['registrations', 'achievements', 'employment'].includes(tab) ? tab : 'registrations';
  });
  const [previewPost, setPreviewPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [adminStats, setAdminStats] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState({});
  const [expandedProgramUsageKey, setExpandedProgramUsageKey] = useState('');
  const [selectedLevelKey, setSelectedLevelKey] = useState('COLLEGE');
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    confirmLoadingText: '',
    type: 'danger',
    isLoading: false,
    onConfirm: () => {}
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (['registrations', 'achievements', 'employment'].includes(tab)) {
      setPendingTab(tab);
    }
  }, [location.search]);

  useEffect(() => {
    fetchPendingUsers();
    fetchPendingAchievements();
    fetchPendingJobs();
    fetchAdminStats();

  }, []);

  useEffect(() => {
    if (pendingOnly) {
      const refreshAchievements = () => fetchPendingAchievements();
      const refreshJobs = () => fetchPendingJobs();
      const unsubAchPending = realtimeClient.subscribe('achievement.pending', refreshAchievements);
      const unsubAchCreated = realtimeClient.subscribe('achievement.created', refreshAchievements);
      const unsubAchUpdated = realtimeClient.subscribe('achievement.updated', refreshAchievements);
      const unsubAchDeleted = realtimeClient.subscribe('achievement.deleted', refreshAchievements);
      const unsubJobPending = realtimeClient.subscribe('job.pending', refreshJobs);
      const unsubJobCreated = realtimeClient.subscribe('job.created', refreshJobs);
      const unsubJobUpdated = realtimeClient.subscribe('job.updated', refreshJobs);
      const unsubJobDeleted = realtimeClient.subscribe('job.deleted', refreshJobs);

      return () => {
        try { unsubAchPending(); } catch {}
        try { unsubAchCreated(); } catch {}
        try { unsubAchUpdated(); } catch {}
        try { unsubAchDeleted(); } catch {}
        try { unsubJobPending(); } catch {}
        try { unsubJobCreated(); } catch {}
        try { unsubJobUpdated(); } catch {}
        try { unsubJobDeleted(); } catch {}
      };
    }

    const refreshProgramUsage = () => {
      fetchAdminStats();
    };

    const unsubCreated = realtimeClient.subscribe('career.created', refreshProgramUsage);
    const unsubUpdated = realtimeClient.subscribe('career.updated', refreshProgramUsage);
    const unsubDeleted = realtimeClient.subscribe('career.deleted', refreshProgramUsage);

    return () => {
      try { unsubCreated(); } catch {}
      try { unsubUpdated(); } catch {}
      try { unsubDeleted(); } catch {}
    };
  }, [pendingOnly]);
  // Prepare chart data based on adminStats
  const approvalStatusData = [
    { name: 'Approved', value: adminStats?.approvedAlumni || 0, color: '#10b981' },
    { name: 'Pending', value: adminStats?.pendingRegistrations || 0, color: '#f59e0b' },
    { name: 'Rejected', value: adminStats?.rejectedRegistrations || 0, color: '#ef4444' }
  ];

  const employmentStatusData = [
    { name: 'Employed', value: adminStats?.employedAlumni || 0, color: '#3b82f6' },
    { name: 'Self-Employed', value: adminStats?.selfEmployedAlumni || 0, color: '#8b5cf6' },
    { name: 'Unemployed', value: adminStats?.unemployedAlumni || 0, color: '#6b7280' },
    { name: 'Studying', value: adminStats?.studyingAlumni || 0, color: '#ec4899' }
  ];

  const courseData = Array.isArray(adminStats?.alumniPerCourse) ? adminStats.alumniPerCourse : [];

  const levelDataList = Array.isArray(adminStats?.alumniByLevelAndProgram) ? adminStats.alumniByLevelAndProgram : [];

  const levelGroups = groupSectionDefinitions
    .filter((level) => ['COLLEGE', 'ETEEAP', 'GRAD_SCHOOL'].includes(level.key))
    .map((level) => ({ key: level.key, label: level.title }));

  const programToLevel = new Map();
  groupSectionDefinitions.forEach((section) => {
    section.items.forEach((item) => {
      programToLevel.set(item.value, section.key);
    });
  });

  const programLevelLabels = {
    COLLEGE: 'College',
    ETEEAP: 'ETEEAP',
    GRAD_SCHOOL: 'Graduate School'
  };

  const levelTabs = [
    { key: 'ALL', label: 'All Levels', count: adminStats?.totalAlumni || 0 },
    ...levelDataList.map((lvl) => ({
      key: lvl.key,
      label: lvl.label,
      count: lvl.totalAlumni
    }))
  ];

  const getActiveChartData = () => {
    if (selectedLevelKey === 'ALL') {
      return (adminStats?.alumniPerCourse || []).map((item) => ({
        name: item.name,
        count: item.value
      }));
    }
    const foundGroup = levelDataList.find((g) => g.key === selectedLevelKey);
    return foundGroup ? foundGroup.programs : [];
  };

  const currentLevelChartData = getActiveChartData();
  const currentTotalAlumni = selectedLevelKey === 'ALL'
    ? (adminStats?.totalAlumni || 0)
    : (levelDataList.find((g) => g.key === selectedLevelKey)?.totalAlumni || 0);

  const registrationTrendsData = Array.isArray(adminStats?.registrationTrends) ? adminStats.registrationTrends : [];

  const eventData = Array.isArray(adminStats?.eventAttendance) ? adminStats.eventAttendance : [];

  const donationData = Array.isArray(adminStats?.donationTrends) ? adminStats.donationTrends : [];

  const verifyStudentId = async (studentId) => {
    if (!studentId) return null;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/auth/verify-student-id/${studentId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) return null;

      return response.json();
    } catch (error) {
      console.error('Error verifying student ID:', error);
      return null;
    }
  };

  const fetchPendingUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/auth/pending-registrations`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || `Request failed with status ${response.status}`);
      }

      const data = await response.json();
      const pendingList = Array.isArray(data) ? data : [];
      setPendingUsers(pendingList);

      const verifications = {};
      for (const user of pendingList) {
        if (user.student_id) {
          verifications[user.id] = await verifyStudentId(user.student_id);
        }
      }

      setVerificationStatus(verifications);
    } catch (error) {
      console.error('Error fetching pending registrations:', error);
      toast.error('Failed to fetch pending registrations');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingAchievements = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/achievements/pending`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) return;
      const data = await response.json();
      setPendingAchievements(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching pending achievements:', error);
    }
  };

  const fetchPendingJobs = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/jobs/pending`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) return;
      const data = await response.json();
      setPendingJobs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching pending job postings:', error);
    }
  };

  const handlePostApproval = async (type, id, status) => {
    try {
      const token = localStorage.getItem('token');
      const endpoint = type === 'achievement'
        ? `${API_BASE_URL}/achievements/${id}/approval`
        : `${API_BASE_URL}/jobs/${id}/approval`;
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update approval status');
      }
      const label = type === 'achievement' ? 'Achievement' : 'Job posting';
      toast.success(`${label} ${status === 'APPROVED' ? 'approved and published' : 'rejected'}!`);
      if (type === 'achievement') {
        await fetchPendingAchievements();
      } else {
        await fetchPendingJobs();
      }
      setPreviewPost((prev) => (prev?.type === type && prev?.item?.id === id ? null : prev));
    } catch (error) {
      console.error('Post approval error:', error);
      toast.error(error.message || 'Failed to update approval status');
    }
  };

  const promptPostApproval = (type, item, status) => {
    const isApprove = status === 'APPROVED';
    const itemTitle = type === 'achievement' ? item.title : `${item.job_title} at ${item.company}`;
    setConfirmModal({
      isOpen: true,
      title: isApprove
        ? `Approve ${type === 'achievement' ? 'Achievement' : 'Job Posting'}`
        : `Reject ${type === 'achievement' ? 'Achievement' : 'Job Posting'}`,
      message: isApprove
        ? `Approve "${itemTitle}"? It will become visible on the ${type === 'achievement' ? 'Achievements' : 'Employment'} page.`
        : `Reject "${itemTitle}"? It will not be published on the ${type === 'achievement' ? 'Achievements' : 'Employment'} page.`,
      confirmText: isApprove ? 'Approve' : 'Reject',
      confirmLoadingText: isApprove ? 'Approving...' : 'Rejecting...',
      type: isApprove ? 'info' : 'danger',
      isLoading: false,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isLoading: true }));
        try {
          await handlePostApproval(type, item.id, status);
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false, isLoading: false }));
        }
      }
    });
  };

  const fetchAdminStats = async () => {
    try {
      setStatsLoading(true);
      const data = await statsService.getAdminStats();
      setAdminStats(data);
    } catch (error) {
      console.error('Error loading admin stats:', error);
      toast.error('Failed to load dashboard stats');
    } finally {
      setStatsLoading(false);
    }
  };

  const handleApproval = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/auth/approve-registration/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('User approved successfully! They can now login to the system.');
        await fetchPendingUsers();
        await fetchAdminStats();
      } else {
        toast.error(data.error || 'Failed to approve registration');
      }
    } catch (error) {
      console.error('Approval error:', error);
      toast.error('Failed to approve registration');
    }
  };

  const handleRejection = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/auth/reject-registration/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          reason: 'Your registration was rejected because the information provided could not be verified. Some details may be incomplete, inaccurate, or inconsistent with the available alumni records. Please review your information and submit a new registration with accurate details.'
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Registration rejected successfully!');
        await fetchPendingUsers();
        await fetchAdminStats();
      } else {
        toast.error(data.error || 'Failed to reject registration');
      }
    } catch (error) {
      console.error('Rejection error:', error);
      toast.error('Network error: Failed to reject registration');
    }
  };

  const promptApproval = (user) => {
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username || 'this user';
    setConfirmModal({
      isOpen: true,
      title: 'Approve Registration',
      message: `Are you sure you want to approve the registration for ${fullName}${user.email ? ` (${user.email})` : ''}? This will activate their alumni account.`,
      confirmText: 'Approve',
      confirmLoadingText: 'Approving...',
      type: 'success',
      isLoading: false,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isLoading: true }));
        try {
          await handleApproval(user.id);
        } finally {
          setConfirmModal((prev) => ({ ...prev, isLoading: false, isOpen: false }));
        }
      }
    });
  };

  const promptRejection = (user) => {
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username || 'this user';
    setConfirmModal({
      isOpen: true,
      title: 'Reject Registration',
      message: `Are you sure you want to reject the registration for ${fullName}${user.email ? ` (${user.email})` : ''}?`,
      confirmText: 'Reject',
      confirmLoadingText: 'Rejecting...',
      type: 'danger',
      isLoading: false,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isLoading: true }));
        try {
          await handleRejection(user.id);
        } finally {
          setConfirmModal((prev) => ({ ...prev, isLoading: false, isOpen: false }));
        }
      }
    });
  };



  const formatLevel = (level) => {
    if (!level) return 'N/A';

    return level
      .replace('_', ' ')
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const formatCount = (value) => new Intl.NumberFormat().format(Number(value || 0));
  const getInitials = (name = 'Alumnus') => name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'A';

  const getImageSrc = (imagePath) => {
    if (!imagePath) return '';
    if (/^https?:\/\//i.test(imagePath)) return imagePath;
    return getImageUrl(imagePath);
  };

  const renderProgramUsageAlumni = (alumni = [], tone = 'using') => {
    const isUsing = tone === 'using';
    const isChecking = tone === 'needs-checking';
    const borderClass = isUsing
      ? 'border-emerald-100'
      : isChecking
      ? 'border-amber-100'
      : 'border-rose-100';

    if (!alumni.length) {
      return (
        <div className="flex h-16 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white/60 text-xs font-medium text-slate-400">
          No alumni yet
        </div>
      );
    }

    return (
      <div className="max-h-60 space-y-2 overflow-y-auto pr-1 text-left">
        {alumni.map((entry) => {
          const profileImage = getImageSrc(entry.profileImage);
          const name = entry.name || 'Unnamed Alumni';
          const hasEmployment =
            (entry.jobPosition && entry.jobPosition !== 'Not provided') ||
            (entry.company && entry.company !== 'Not provided');
          return (
            <div
              key={`${tone}-${entry.id}-${entry.jobPosition}-${entry.company}`}
              className={`flex min-w-0 items-center gap-2.5 rounded-xl border bg-white px-2.5 py-2 shadow-2xs ${borderClass}`}
            >
              <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-blue-600 text-[11px] font-bold text-white ring-1 ring-slate-200">
                {profileImage ? (
                  <img src={profileImage} alt={name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">{getInitials(name)}</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-950">{name}</p>
                <p className="truncate text-[11px] text-slate-500">{entry.program || 'Program not provided'}</p>
                {hasEmployment ? (
                  <p className="mt-0.5 truncate text-[11px] text-slate-700">
                    <span className="font-semibold">{entry.jobPosition || 'Position not provided'}</span>
                    {' at '}
                    {entry.company || 'Company not provided'}
                  </p>
                ) : (
                  <p className="mt-0.5 truncate text-[11px] italic text-slate-400">
                    No employment details yet
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };
  const overviewCards = [
    { label: 'Total Alumni', value: formatCount(adminStats?.totalAlumni), note: 'Verified alumni directory entries', tone: 'blue' },
    { label: 'Pending Requests', value: formatCount(adminStats?.pendingRegistrations), note: 'Waiting for admin review', tone: 'blue' },

    { label: 'Approved Alumni', value: formatCount(adminStats?.approvedAlumni), note: 'Approved account records', tone: 'blue' },
    { label: 'Active Members', value: formatCount(adminStats?.activeMembers), note: 'Currently online sessions', tone: 'blue' },
    { label: 'Upcoming Events', value: formatCount(adminStats?.upcomingEvents), note: 'Scheduled and current events', tone: 'blue' },
    { label: 'Teachers', value: formatCount(adminStats?.teachers), note: 'Teacher accounts in the system', tone: 'blue' }
  ];

  const monthlyActivity = Array.isArray(adminStats?.monthlyActivity) ? adminStats.monthlyActivity : [];
  const maxMonthlyValue = Math.max(1, ...monthlyActivity.flatMap((entry) => [entry.submitted || 0, entry.approved || 0]));
  const monthBarHeight = (value) => Math.max(18, Math.round(((value || 0) / maxMonthlyValue) * 180));
  const programUsageInCareer = Array.isArray(adminStats?.programUsageInCareer) ? adminStats.programUsageInCareer : [];

  const Layout = UserLayout;

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <Layout>
      <div className="space-y-6">

        {/* Page Header */}
        {!pendingOnly && (
        <div className="flex flex-col gap-1 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Admin Dashboard</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{greeting}, Admin</h1>
            <p className="mt-1 text-sm text-slate-500">Here&apos;s an overview of your alumni system for {now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}.</p>
          </div>
          <button
            type="button"
            onClick={() => { fetchPendingUsers(); fetchAdminStats(); }}
            className="inline-flex items-center gap-1.5 self-start rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 sm:self-auto"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v6h6M20 20v-6h-6M5 19A9 9 0 0119 5M19 5h-4M5 19h4" />
            </svg>
            Refresh
          </button>
        </div>
        )}

        {!pendingOnly && (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {overviewCards.map((card) => (
            <div key={card.label} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{card.label}</div>
                  <div className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                    {statsLoading ? <span className="inline-block h-8 w-14 animate-pulse rounded-md bg-slate-200" /> : card.value}
                  </div>
                  <p className="mt-1.5 text-sm text-slate-500">{card.note}</p>
                </div>
                <div className={`shrink-0 rounded-xl p-2.5 ${toneBgClasses[card.tone]}`}>
                  {cardIcons[card.label]}
                </div>
              </div>
              <div className={`mt-4 h-1 w-full rounded-full bg-gradient-to-r ${toneClasses[card.tone]} opacity-70`} />
            </div>
          ))}
        </section>
        )}

        {!pendingOnly && (() => {
          const PROGRAM_COLORS = {
            BSIT: '#f59e0b',
            SSLATE: '#3b82f6',
            SARFAID: '#a855f7',
            SHTM: '#fb923c'
          };

          const LEVEL_COLORS = [
            '#3b82f6', '#8b5cf6', '#10b981', '#f97316', '#ef4444',
            '#0ea5e9', '#ec4899', '#84cc16', '#6366f1', '#14b8a6'
          ];

          const levelDataList2 = Array.isArray(adminStats?.alumniByLevelAndProgram)
            ? adminStats.alumniByLevelAndProgram
            : [];

          const levelButtons = [
            { key: 'COLLEGE', label: 'College' },
            { key: 'SENIOR_HIGH', label: 'Senior High' },
            { key: 'ETEEAP', label: 'ETEEAP' },
            { key: 'GRAD_SCHOOL', label: 'Grad School' },
            { key: 'INTEGRATED_SCHOOL', label: 'Integrated School' }
          ];

          const activeLevelData = levelDataList2.find((g) => g.key === selectedLevelKey);
          const allLevelPrograms = activeLevelData ? activeLevelData.programs : [];

          const pieSlices = allLevelPrograms
            .filter((p) => p.count > 0)
            .map((p, i) => ({
              name: p.name,
              value: p.count,
              color: selectedLevelKey === 'COLLEGE'
                ? PROGRAM_COLORS[p.name] || '#94a3b8'
                : LEVEL_COLORS[i % LEVEL_COLORS.length]
            }));

          const colorMap = new Map(pieSlices.map((s) => [s.name, s.color]));
          const activeTotal = activeLevelData?.totalAlumni || 0;

          const RADIAN = Math.PI / 180;
          const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
            if (percent < 0.04) return null;
            const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
            const x = cx + radius * Math.cos(-midAngle * RADIAN);
            const y = cy + radius * Math.sin(-midAngle * RADIAN);
            return (
              <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
                {`${(percent * 100).toFixed(0)}%`}
              </text>
            );
          };

          return (
            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              {/* Header */}
              <div className="border-b border-slate-200 pb-5">
                <p className="text-xs uppercase tracking-[0.24em] font-semibold text-slate-500">Program Demographics</p>
                <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">Alumni by Program & Education Level</h2>
                <p className="mt-1 text-sm text-slate-500">Select an education level to see the program distribution of registered alumni.</p>
              </div>

              {/* Level Selector */}
              <div className="mt-5 flex flex-wrap gap-2">
                {levelButtons.map((btn) => {
                  const lvlData = levelDataList2.find((g) => g.key === btn.key);
                  const count = lvlData?.totalAlumni || 0;
                  const isActive = selectedLevelKey === btn.key;
                  return (
                    <button
                      key={btn.key}
                      type="button"
                      onClick={() => setSelectedLevelKey(btn.key)}
                      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 ring-2 ring-blue-600 ring-offset-1'
                          : 'border border-slate-200 bg-slate-50 text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700'
                      }`}
                    >
                      <span>{btn.label}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        isActive ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Chart Area */}
              {statsLoading ? (
                <div className="mt-6 flex items-center justify-center py-16">
                  <div className="h-64 w-64 animate-pulse rounded-full bg-slate-100" />
                </div>
              ) : !selectedLevelKey ? (
                <div className="mt-8 py-12 text-center text-sm text-slate-500">
                  Select a level above to view program distribution.
                </div>
              ) : allLevelPrograms.length === 0 ? (
                <div className="mt-8 py-12 text-center">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                    <svg className="h-7 w-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-slate-500">No alumni data for this level yet.</p>
                </div>
              ) : (
                <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start">
                  {/* Pie Chart */}
                  <div className="flex flex-col items-center lg:w-1/2">
                    <div className="relative h-72 w-full max-w-sm">
                      {pieSlices.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={pieSlices}
                              cx="50%"
                              cy="50%"
                              innerRadius={68}
                              outerRadius={120}
                              paddingAngle={2}
                              dataKey="value"
                              labelLine={false}
                              label={renderCustomLabel}
                            >
                              {pieSlices.map((entry) => (
                                <Cell key={entry.name} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#0f172a',
                                borderRadius: '12px',
                                border: 'none',
                                color: '#fff',
                                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)',
                                padding: '10px 14px'
                              }}
                              formatter={(value, name) => [`${value} alumni`, name]}
                              labelStyle={{ display: 'none' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex h-full items-center justify-center text-slate-400 text-sm">
                          No alumni registered in these programs yet.
                        </div>
                      )}
                      {/* Center label */}
                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-extrabold text-slate-900">{formatCount(activeTotal)}</span>
                        <span className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Alumni</span>
                      </div>
                    </div>
                  </div>

                  {/* Legend / Program List */}
                  <div className="flex-1 space-y-2 lg:max-h-72 lg:overflow-y-auto pr-1">
                    {allLevelPrograms.map((prog) => {
                      const color = colorMap.get(prog.name) || '#94a3b8';
                      const pct = activeTotal > 0 ? Math.round((prog.count / activeTotal) * 100) : 0;
                      const hasAlumni = prog.count > 0;
                      return (
                        <div
                          key={prog.name}
                          className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition ${
                            hasAlumni
                              ? 'border-slate-100 bg-slate-50/70 hover:bg-white hover:shadow-sm'
                              : 'border-slate-100/60 bg-slate-50/30 opacity-60'
                          }`}
                        >
                          <span className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                          <span className={`flex-1 truncate text-sm font-semibold ${hasAlumni ? 'text-slate-800' : 'text-slate-500'}`}>
                            {prog.name}
                          </span>
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="hidden w-24 sm:block">
                              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                                <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: color }} />
                              </div>
                            </div>
                            <span className="w-10 text-right text-xs font-bold text-slate-500">{pct}%</span>
                            <span
                              className="w-14 rounded-full py-0.5 text-center text-xs font-bold text-white"
                              style={{ backgroundColor: hasAlumni ? color : '#cbd5e1' }}
                            >
                              {formatCount(prog.count)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          );
        })()}


        {!pendingOnly && (
        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-5 sm:px-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Employability Tracking</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Program Usage in Career</h2>
            <p className="mt-2 text-sm text-slate-500">Tracks whether current or latest employment is related to each alumnus&apos;s academic program.</p>
          </div>

          {statsLoading ? (
            <div className="space-y-3 p-4 sm:p-5">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-14 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : programUsageInCareer.length > 0 ? (
            <>
              {(() => {
                const gridCols = 'grid grid-cols-[minmax(220px,1.3fr)_minmax(210px,1fr)_minmax(210px,1fr)_minmax(210px,1fr)_76px_180px] items-center';
                const levelAccent = {
                  COLLEGE: { bar: 'bg-blue-600', chip: 'bg-blue-50 text-blue-700 ring-blue-200' },
                  ETEEAP: { bar: 'bg-violet-600', chip: 'bg-violet-50 text-violet-700 ring-violet-200' },
                  GRAD_SCHOOL: { bar: 'bg-teal-600', chip: 'bg-teal-50 text-teal-700 ring-teal-200' }
                };
                const groups = programUsageInCareer.reduce((acc, row) => {
                  const levelKey = programToLevel.get(row.program) || 'COLLEGE';
                  let group = acc.find((g) => g.level === levelKey);
                  if (!group) {
                    group = { level: levelKey, rows: [] };
                    acc.push(group);
                  }
                  group.rows.push(row);
                  return acc;
                }, []);

                return (
                  <div className="space-y-6 p-4 sm:p-5">
                    {groups.map((group) => {
                      const accent = levelAccent[group.level] || { bar: 'bg-slate-600', chip: 'bg-slate-50 text-slate-700 ring-slate-200' };
                      const totals = group.rows.reduce(
                        (sum, r) => ({
                          using: sum.using + (r.usingCount || 0),
                          notUsing: sum.notUsing + (r.notUsingCount || 0),
                          needs: sum.needs + (r.needsCheckingCount || 0),
                          total: sum.total + (r.total || 0)
                        }),
                        { using: 0, notUsing: 0, needs: 0, total: 0 }
                      );
                      const groupRate = totals.total > 0 ? Math.round((totals.using / totals.total) * 100) : 0;

                      return (
                        <div key={group.level} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                          {/* Level header */}
                          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/80 px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <span className={`h-8 w-1.5 rounded-full ${accent.bar}`} />
                              <div>
                                <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-900">
                                  {programLevelLabels[group.level] || group.level}
                                </h3>
                                <p className="text-xs text-slate-500">
                                  {group.rows.length} program{group.rows.length === 1 ? '' : 's'} · {formatCount(totals.total)} alumni tracked
                                </p>
                              </div>
                            </div>
                            <div className="inline-flex flex-wrap items-center divide-x divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
                              <div className="flex items-center gap-2 px-3 py-1.5">
                                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                <span className="text-[11px] font-medium text-slate-500">Related</span>
                                <span className="text-xs font-bold tabular-nums text-slate-900">{formatCount(totals.using)}</span>
                              </div>
                              <div className="flex items-center gap-2 px-3 py-1.5">
                                <span className="h-2 w-2 rounded-full bg-rose-400" />
                                <span className="text-[11px] font-medium text-slate-500">Not Related</span>
                                <span className="text-xs font-bold tabular-nums text-slate-900">{formatCount(totals.notUsing)}</span>
                              </div>
                              <div className="flex items-center gap-2 px-3 py-1.5">
                                <span className="h-2 w-2 rounded-full bg-amber-400" />
                                <span className="text-[11px] font-medium text-slate-500">Not Specified</span>
                                <span className="text-xs font-bold tabular-nums text-slate-900">{formatCount(totals.needs)}</span>
                              </div>
                              <div className="flex items-center gap-2 bg-slate-50/80 px-3 py-1.5">
                                <span className="text-[11px] font-medium text-slate-500">Usage</span>
                                <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-bold tabular-nums ring-1 ${accent.chip}`}>
                                  {groupRate}%
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="overflow-x-auto">
                            <div className="min-w-[1120px]">
                              {/* Column headers */}
                              <div className={`${gridCols} border-b border-slate-100 bg-white text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400`}>
                                <div className="px-5 py-3">Program</div>
                                <div className="px-3 py-3 text-center">Related ✓</div>
                                <div className="px-3 py-3 text-center">Not Related ✕</div>
                                <div className="px-3 py-3 text-center">Not Specified</div>
                                <div className="px-3 py-3 text-center">Total</div>
                                <div className="px-5 py-3">Usage Rate</div>
                              </div>

                              {group.rows.map((row, rowIndex) => {
                                const isExpanded = expandedProgramUsageKey === row.program;
                                const usageRate = Number(row.usageRate || 0);
                                const isLast = rowIndex === group.rows.length - 1;

                                return (
                                  <div
                                    key={row.program}
                                    className={`${!isLast ? 'border-b border-slate-100' : ''} ${isExpanded ? 'bg-blue-50/30' : ''}`}
                                  >
                                    <div
                                      className={`${gridCols} cursor-pointer text-sm transition-colors ${isExpanded ? '' : 'hover:bg-slate-50/80'}`}
                                      onClick={() => setExpandedProgramUsageKey((current) => (current === row.program ? '' : row.program))}
                                    >
                                      <div className="px-5 py-3.5">
                                        <button
                                          type="button"
                                          className="inline-flex max-w-full items-center gap-2 text-left text-sm font-bold text-blue-950 hover:text-blue-700"
                                          aria-expanded={isExpanded}
                                        >
                                          <svg
                                            className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isExpanded ? 'rotate-90 text-blue-600' : ''}`}
                                            viewBox="0 0 20 20"
                                            fill="currentColor"
                                            aria-hidden="true"
                                          >
                                            <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                                          </svg>
                                          <span className="truncate">{row.program}</span>
                                        </button>
                                      </div>
                                      <div className="px-3 py-3.5 text-center">
                                        <span className={`inline-flex min-w-[44px] items-center justify-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${row.usingCount > 0 ? 'bg-emerald-50 text-emerald-700' : 'text-slate-400'}`}>
                                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                          {formatCount(row.usingCount)}
                                        </span>
                                      </div>
                                      <div className="px-3 py-3.5 text-center">
                                        <span className={`inline-flex min-w-[44px] items-center justify-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${row.notUsingCount > 0 ? 'bg-rose-50 text-rose-700' : 'text-slate-400'}`}>
                                          <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                                          {formatCount(row.notUsingCount)}
                                        </span>
                                      </div>
                                      <div className="px-3 py-3.5 text-center">
                                        <span className={`inline-flex min-w-[44px] items-center justify-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${row.needsCheckingCount > 0 ? 'bg-amber-50 text-amber-700' : 'text-slate-400'}`}>
                                          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                                          {formatCount(row.needsCheckingCount)}
                                        </span>
                                      </div>
                                      <div className="px-3 py-3.5 text-center font-bold text-blue-950">{formatCount(row.total)}</div>
                                      <div className="px-5 py-3.5">
                                        <div className="flex items-center gap-3">
                                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                                            <div
                                              className="h-full rounded-full bg-emerald-500 transition-all"
                                              style={{ width: `${Math.max(0, Math.min(100, usageRate))}%` }}
                                            />
                                          </div>
                                          <span className="w-10 text-right text-xs font-bold text-blue-950">{usageRate}%</span>
                                        </div>
                                      </div>
                                    </div>

                                    <div
                                      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
                                        isExpanded
                                          ? 'grid-rows-[1fr] opacity-100'
                                          : 'pointer-events-none grid-rows-[0fr] opacity-0'
                                      }`}
                                      aria-hidden={!isExpanded}
                                    >
                                      <div className="overflow-hidden">
                                        <div className={`${gridCols} !items-start border-t border-dashed border-slate-200 pb-4 pt-3`}>
                                          <div className="px-5 pt-1">
                                            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Alumni Breakdown</p>
                                            <p className="mt-1 text-xs text-slate-500">
                                              Based on each alumnus&apos;s current or latest employment.
                                            </p>
                                          </div>
                                          <div className="px-2">
                                            <div className="rounded-xl bg-emerald-50/60 p-2 ring-1 ring-emerald-100">
                                              <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                                                Related · {row.using.length}
                                              </p>
                                              {renderProgramUsageAlumni(row.using, 'using')}
                                            </div>
                                          </div>
                                          <div className="px-2">
                                            <div className="rounded-xl bg-rose-50/60 p-2 ring-1 ring-rose-100">
                                              <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-rose-700">
                                                Not Related · {row.notUsing.length}
                                              </p>
                                              {renderProgramUsageAlumni(row.notUsing, 'not-using')}
                                            </div>
                                          </div>
                                          <div className="px-2">
                                            <div className="rounded-xl bg-amber-50/60 p-2 ring-1 ring-amber-100">
                                              <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-amber-700">
                                                Not Specified · {row.needsChecking.length}
                                              </p>
                                              {renderProgramUsageAlumni(row.needsChecking, 'needs-checking')}
                                            </div>
                                          </div>
                                          <div />
                                          <div />
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
              <div className="flex flex-wrap items-center gap-5 border-t border-slate-200 px-4 py-4 text-sm text-slate-500 sm:px-5">
                <span className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-emerald-500" />
                  Currently working in related field
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-rose-400" />
                  Working in unrelated field
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-amber-400" />
                  Not specified (not yet classified by the alumni)
                </span>
              </div>
            </>
          ) : (
            <div className="px-4 py-10 text-center text-sm text-slate-500 sm:px-5">
              No reviewed employment classifications yet.
            </div>
          )}
        </section>
        )}

        {pendingOnly && (
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Pending Requests {loading ? '' : `(${pendingUsers.length + pendingAchievements.length + pendingJobs.length})`}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Review registrations, achievement posts, and employment posts before approving or rejecting them.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {[
                { key: 'registrations', label: 'Registrations', count: pendingUsers.length },
                { key: 'achievements', label: 'Achievements', count: pendingAchievements.length },
                { key: 'employment', label: 'Employment', count: pendingJobs.length }
              ].map((tab) => {
                const isActive = pendingTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setPendingTab(tab.key)}
                    className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-blue-700 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-bold ${
                        isActive ? 'bg-white/20 text-white' : 'bg-white text-slate-700'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {pendingTab === 'registrations' && (
          <div className="overflow-x-auto scrollbar-hide">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">School ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Level/Course</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Batch/Grad Year</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date Submitted</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {loading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr key={`pending-skel-${index}`} className="animate-pulse">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="h-4 w-32 bg-slate-200 rounded"></div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="h-4 w-20 bg-slate-200 rounded font-mono"></div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="h-4 w-36 bg-slate-200 rounded"></div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="h-4 w-24 bg-slate-200 rounded"></div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="h-4 w-24 bg-slate-200 rounded mb-1.5"></div>
                        <div className="h-3 w-16 bg-slate-200 rounded"></div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="h-4 w-20 bg-slate-200 rounded mb-1.5"></div>
                        <div className="h-3 w-16 bg-slate-200 rounded"></div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="h-4 w-20 bg-slate-200 rounded"></div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right">
                        <div className="flex flex-col gap-2">
                          <div className="h-7 w-20 bg-slate-200 rounded-lg ml-auto"></div>
                          <div className="h-7 w-20 bg-slate-200 rounded-lg ml-auto"></div>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : pendingUsers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-sm text-gray-500">
                      No pending registrations to review.
                    </td>
                  </tr>
                ) : (
                  pendingUsers.map((user) => {
                    const isVerified = verificationStatus[user.id]?.verified === true;

                    return (
                      <tr key={user.id} className="hover:bg-gray-50 transition-all duration-150">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{user.first_name} {user.last_name}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-mono text-gray-900">{user.student_id || 'N/A'}</div>
                          {isVerified && (
                            <span className="mt-1 inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] bg-emerald-100 text-emerald-700">
                              Verified
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">{user.email}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">{user.contact_number || 'N/A'}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatLevel(user.level)}</div>
                          <div className="text-xs text-gray-500">{user.course || 'N/A'}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{user.batch && `Batch ${user.batch}`}</div>
                          <div className="text-xs text-gray-500">{user.graduation_year && `Grad: ${user.graduation_year}`}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{new Date(user.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex flex-col gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                promptApproval(user);
                              }}
                              className="w-full inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                promptRejection(user);
                              }}
                              className="w-full inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-700"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          )}

          {pendingTab === 'achievements' && (
          <div className="overflow-x-auto scrollbar-hide">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Achievement</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Submitted By</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {pendingAchievements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-sm text-gray-500">
                      No pending achievement posts to review.
                    </td>
                  </tr>
                ) : (
                  pendingAchievements.map((ach) => {
                    const submitterName = ach.posted_by_name
                      || (ach.alumni
                        ? `${ach.alumni.first_name || ''} ${ach.alumni.last_name || ''}`.trim() || ach.alumni.email
                        : 'Alumni');
                    const isVideo = ach.image && /\.(mp4|mov|avi|mkv|webm)$/i.test(ach.image);
                    return (
                      <tr key={ach.id} className="hover:bg-gray-50 transition-all duration-150">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            {ach.image ? (
                              isVideo ? (
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-[10px] font-bold text-white">
                                  VIDEO
                                </div>
                              ) : (
                                <img
                                  src={getImageUrl(ach.image)}
                                  alt={ach.title}
                                  className="h-12 w-12 shrink-0 rounded-lg object-cover border border-slate-200"
                                />
                              )
                            ) : (
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-xs font-bold text-blue-700 border border-blue-100">
                                POST
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-gray-900">{ach.title}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                          {ach.category || 'General'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{submitterName}</div>
                          {ach.alumni?.email && <div className="text-xs text-gray-500">{ach.alumni.email}</div>}
                        </td>
                        <td className="px-4 py-4 max-w-xs">
                          <p className="text-sm text-gray-600 line-clamp-2">{ach.description || 'No description provided.'}</p>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                          {ach.date ? new Date(ach.date).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex flex-col gap-1.5">
                            <button
                              type="button"
                              onClick={() => setPreviewPost({ type: 'achievement', item: ach })}
                              className="w-full inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
                            >
                              View Content
                            </button>
                            <button
                              type="button"
                              onClick={() => promptPostApproval('achievement', ach, 'APPROVED')}
                              className="w-full inline-flex items-center justify-center rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => promptPostApproval('achievement', ach, 'REJECTED')}
                              className="w-full inline-flex items-center justify-center rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          )}

          {pendingTab === 'employment' && (
          <div className="overflow-x-auto scrollbar-hide">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Job Title</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Company & Location</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Posted By</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Salary / Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date Submitted</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {pendingJobs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-sm text-gray-500">
                      No pending employment posts to review.
                    </td>
                  </tr>
                ) : (
                  pendingJobs.map((job) => {
                    const posterName = job.alumni
                      ? `${job.alumni.first_name || ''} ${job.alumni.last_name || ''}`.trim() || job.alumni.email
                      : 'Alumni';
                    return (
                      <tr key={job.id} className="hover:bg-gray-50 transition-all duration-150">
                        <td className="px-4 py-4">
                          <div className="text-sm font-semibold text-gray-900">{job.job_title}</div>
                          {job.department && <div className="text-xs text-gray-500">{job.department}</div>}
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm font-medium text-gray-900">{job.company}</div>
                          <div className="text-xs text-gray-500">{job.location || 'Location not specified'}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{posterName}</div>
                          {job.alumni?.email && <div className="text-xs text-gray-500">{job.alumni.email}</div>}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{job.job_type || 'Full-time'}</div>
                          <div className="text-xs text-gray-500">{job.salary_range || 'Salary not specified'}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                          {job.created_at ? new Date(job.created_at).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex flex-col gap-1.5">
                            <button
                              type="button"
                              onClick={() => setPreviewPost({ type: 'job', item: job })}
                              className="w-full inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
                            >
                              View Content
                            </button>
                            <button
                              type="button"
                              onClick={() => promptPostApproval('job', job, 'APPROVED')}
                              className="w-full inline-flex items-center justify-center rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => promptPostApproval('job', job, 'REJECTED')}
                              className="w-full inline-flex items-center justify-center rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          )}
        </div>
        )}
      </div>

      {previewPost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
          onClick={() => setPreviewPost(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
              <div>
                <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-amber-800">
                  Pending {previewPost.type === 'achievement' ? 'Achievement' : 'Employment'} Post
                </span>
                <h3 className="mt-1.5 text-lg font-bold text-slate-900">
                  {previewPost.type === 'achievement' ? previewPost.item.title : previewPost.item.job_title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Submitted by{' '}
                  {previewPost.item.posted_by_name
                    || (previewPost.item.alumni
                      ? `${previewPost.item.alumni.first_name || ''} ${previewPost.item.alumni.last_name || ''}`.trim() || previewPost.item.alumni.email
                      : 'Alumni')}
                  {previewPost.item.alumni?.email ? ` (${previewPost.item.alumni.email})` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewPost(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close preview"
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 px-6 py-5 text-sm text-slate-700">
              {previewPost.type === 'achievement' ? (
                <>
                  {previewPost.item.image && (
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-950">
                      {/\.(mp4|mov|avi|mkv|webm)$/i.test(previewPost.item.image) ? (
                        <video src={getImageUrl(previewPost.item.image)} controls className="max-h-80 w-full object-contain" />
                      ) : (
                        <img src={getImageUrl(previewPost.item.image)} alt={previewPost.item.title} className="max-h-80 w-full object-contain mx-auto" />
                      )}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3.5 text-xs">
                    <div>
                      <span className="font-semibold text-slate-500 uppercase">Category</span>
                      <p className="mt-0.5 text-sm font-medium text-slate-900">{previewPost.item.category || 'General'}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-500 uppercase">Date</span>
                      <p className="mt-0.5 text-sm font-medium text-slate-900">
                        {previewPost.item.date ? new Date(previewPost.item.date).toLocaleDateString() : 'Not specified'}
                      </p>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Description</h4>
                    <p className="mt-1.5 whitespace-pre-wrap leading-relaxed text-slate-800">
                      {previewPost.item.description || 'No description provided.'}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-xs">
                    <div>
                      <span className="font-semibold text-slate-500 uppercase">Company</span>
                      <p className="mt-0.5 text-sm font-medium text-slate-900">{previewPost.item.company}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-500 uppercase">Location</span>
                      <p className="mt-0.5 text-sm font-medium text-slate-900">{previewPost.item.location || 'Not specified'}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-500 uppercase">Job Type</span>
                      <p className="mt-0.5 text-sm font-medium text-slate-900">{previewPost.item.job_type || 'Not specified'}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-500 uppercase">Salary Range</span>
                      <p className="mt-0.5 text-sm font-medium text-slate-900">{previewPost.item.salary_range || 'Not specified'}</p>
                    </div>
                    {previewPost.item.application_deadline && (
                      <div>
                        <span className="font-semibold text-slate-500 uppercase">Deadline</span>
                        <p className="mt-0.5 text-sm font-medium text-slate-900">
                          {new Date(previewPost.item.application_deadline).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    {previewPost.item.application_url && (
                      <div className="sm:col-span-2">
                        <span className="font-semibold text-slate-500 uppercase">Application Link</span>
                        <p className="mt-0.5">
                          <a
                            href={previewPost.item.application_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-blue-600 hover:underline break-all"
                          >
                            {previewPost.item.application_url}
                          </a>
                        </p>
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Description</h4>
                    <p className="mt-1.5 whitespace-pre-wrap leading-relaxed text-slate-800">
                      {previewPost.item.description || 'No description provided.'}
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 border-t border-slate-200 bg-slate-50 px-6 py-3.5 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setPreviewPost(null)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        confirmLoadingText={confirmModal.confirmLoadingText}
        type={confirmModal.type}
        isLoading={confirmModal.isLoading}
      />
    </Layout>
  );
};

export default AdminDashboard;

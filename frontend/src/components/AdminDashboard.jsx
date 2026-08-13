import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { API_BASE_URL, IMAGE_BASE_URL } from '../config/apiBaseUrl';
import UserLayout from './UserLayout';
import statsService from '../services/statsService';
import { realtimeClient } from '../services/realtimeClient';
import { groupSectionDefinitions } from '../config/groupSections';
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
  rose: 'from-rose-500 to-rose-500'
};

const toneBgClasses = {
  sky: 'bg-sky-500 text-white',
  amber: 'bg-amber-500 text-white',
  emerald: 'bg-emerald-500 text-white',
  violet: 'bg-violet-500 text-white',
  cyan: 'bg-cyan-500 text-white',
  rose: 'bg-rose-500 text-white'
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
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [adminStats, setAdminStats] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState({});
  const [expandedProgramUsageKey, setExpandedProgramUsageKey] = useState('');
  const [selectedLevelKey, setSelectedLevelKey] = useState('COLLEGE');

  useEffect(() => {
    fetchPendingUsers();
    fetchAdminStats();

  }, []);

  useEffect(() => {
    if (pendingOnly) return undefined;

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
        fetchPendingUsers();
        fetchAdminStats();
      } else {
        toast.error(data.error || 'Failed to approve registration');
      }
    } catch (error) {
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
        body: JSON.stringify({ reason: 'Registration rejected by admin' })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Registration rejected successfully!');
        fetchPendingUsers();
        fetchAdminStats();

      } else {
        toast.error(data.error || 'Failed to reject registration');
      }
    } catch (error) {
      console.error('Rejection error:', error);
      toast.error('Network error: Failed to reject registration');
    }
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
    return `${IMAGE_BASE_URL}${imagePath}`;
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
      return <p className="text-sm text-slate-500">None</p>;
    }

    return (
      <div className="space-y-2">
        {alumni.map((entry) => {
          const profileImage = getImageSrc(entry.profileImage);
          const name = entry.name || 'Unnamed Alumni';
          return (
            <div
              key={`${tone}-${entry.id}-${entry.jobPosition}-${entry.company}`}
              className={`flex min-w-0 items-center gap-3 rounded-xl border bg-white px-3 py-3 ${borderClass}`}
            >
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-blue-600 text-xs font-bold text-white ring-1 ring-slate-200">
                {profileImage ? (
                  <img src={profileImage} alt={name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">{getInitials(name)}</div>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-950">{name}</p>
                <p className="truncate text-xs text-slate-500">{entry.program || 'Program not provided'}</p>
                <p className="mt-1 truncate text-xs text-slate-700">
                  <span className="font-semibold">{entry.jobPosition || 'Position not provided'}</span>
                  {' at '}
                  {entry.company || 'Company not provided'}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    );
  };
  const overviewCards = [
    { label: 'Total Alumni', value: formatCount(adminStats?.totalAlumni), note: 'Verified alumni directory entries', tone: 'sky' },
    { label: 'Pending Requests', value: formatCount(adminStats?.pendingRegistrations), note: 'Waiting for admin review', tone: 'amber' },

    { label: 'Approved Alumni', value: formatCount(adminStats?.approvedAlumni), note: 'Approved account records', tone: 'emerald' },
    { label: 'Active Members', value: formatCount(adminStats?.activeMembers), note: 'Currently online sessions', tone: 'violet' },
    { label: 'Upcoming Events', value: formatCount(adminStats?.upcomingEvents), note: 'Scheduled and current events', tone: 'cyan' },
    { label: 'Teachers', value: formatCount(adminStats?.teachers), note: 'Teacher accounts in the system', tone: 'rose' }
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
        <section className="flex min-h-0 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex-shrink-0">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Registrations</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Registration Status Overview</h2>
              <p className="mt-2 text-sm text-slate-500">A compact snapshot of current registration outcomes.</p>
            </div>
            <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 md:grid-cols-3">
              {approvalStatusData.map((entry) => {
                const total = approvalStatusData.reduce((sum, item) => sum + item.value, 0) || 1;
                const percentage = Math.round((entry.value / total) * 100);

                return (
                  <div key={entry.name} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-6">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{entry.name}</div>
                        <div className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{formatCount(entry.value)}</div>
                      </div>
                      <span className="mt-1 inline-flex h-3.5 w-3.5 rounded-full ring-2 ring-white shadow-sm" style={{ backgroundColor: entry.color }} />
                    </div>
                    <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full shadow-sm" style={{ width: `${percentage}%`, backgroundColor: entry.color }} />
                    </div>
                    <div className="mt-3 text-xs text-slate-600">{percentage}% of all registrations</div>
                  </div>
                );
              })}
            </div>
        </section>
        )}

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
              <div className="overflow-x-auto">
                <table className="min-w-[980px] w-full text-left">
                  <thead className="bg-slate-50 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                    <tr>
                      <th className="px-5 py-4">Program</th>
                      <th className="px-5 py-4 text-center">Using ✓</th>
                      <th className="px-5 py-4 text-center">Not Using ✕</th>
                      <th className="px-5 py-4 text-center">Needs Checking</th>
                      <th className="px-5 py-4 text-center">Total</th>
                      <th className="px-5 py-4">Usage Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-transparent text-sm">
                    {programUsageInCareer.reduce((rows, row) => {
                      const levelKey = programToLevel.get(row.program) || 'COLLEGE';
                      const lastLevel = rows.length ? rows[rows.length - 1].level : null;
                      const currentLevel = levelKey;

                      if (lastLevel !== currentLevel) {
                        rows.push({ type: 'section', level: currentLevel, key: `level-${currentLevel}` });
                      }
                      rows.push({ type: 'row', row, level: currentLevel, key: row.program });
                      return rows;
                    }, []).map((entry) => {
                      if (entry.type === 'section') {
                        return (
                          <tr key={entry.key} className="bg-slate-200 border-y border-slate-300">
                            <td colSpan={6} className="px-5 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-slate-900">
                              {programLevelLabels[entry.level] || entry.level}
                            </td>
                          </tr>
                        );
                      }

                      const row = entry.row;
                      const isExpanded = expandedProgramUsageKey === row.program;
                      const usageRate = Number(row.usageRate || 0);

                      return (
                        <React.Fragment key={row.program}>
                          <tr className={isExpanded ? 'bg-slate-50/70' : 'bg-white'}>
                            <td className="px-5 py-4">
                              <button
                                type="button"
                                onClick={() => setExpandedProgramUsageKey((current) => (current === row.program ? '' : row.program))}
                                className="inline-flex max-w-[260px] items-center gap-2 text-left text-sm font-bold text-blue-950 hover:text-blue-700"
                                aria-expanded={isExpanded}
                              >
                                <span className="truncate">{row.program}</span>
                                <svg
                                  className={`h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                  aria-hidden="true"
                                >
                                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </td>
                            <td className="px-5 py-4 text-center">
                              <span className="inline-flex items-center justify-center gap-1.5 font-bold text-emerald-600">
                                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                {formatCount(row.usingCount)}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-center">
                              <span className="inline-flex items-center justify-center gap-1.5 font-bold text-rose-500">
                                <span className="h-2 w-2 rounded-full bg-rose-400" />
                                {formatCount(row.notUsingCount)}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-center">
                              <span className="inline-flex items-center justify-center gap-1.5 font-bold text-amber-600">
                                <span className="h-2 w-2 rounded-full bg-amber-400" />
                                {formatCount(row.needsCheckingCount)}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-center font-bold text-blue-950">{formatCount(row.total)}</td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                                  <div
                                    className={`h-full rounded-full ${usageRate > 0 ? 'bg-emerald-500' : 'bg-slate-200'}`}
                                    style={{ width: `${Math.max(0, Math.min(100, usageRate))}%` }}
                                  />
                                </div>
                                <span className="w-12 text-right text-sm font-bold text-blue-950">{usageRate}%</span>
                              </div>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-slate-50/70">
                              <td colSpan={6} className="px-5 pb-5">
                                <div className="grid gap-3 lg:grid-cols-3">
                                  <div>
                                    <div className="mb-2 inline-flex items-center gap-1.5 text-sm font-bold text-emerald-600">
                                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                      Related
                                    </div>
                                    {renderProgramUsageAlumni(row.using, 'using')}
                                  </div>
                                  <div>
                                    <div className="mb-2 inline-flex items-center gap-1.5 text-sm font-bold text-rose-500">
                                      <span className="h-2 w-2 rounded-full bg-rose-400" />
                                      Not Related
                                    </div>
                                    {renderProgramUsageAlumni(row.notUsing, 'not-using')}
                                  </div>
                                  <div>
                                    <div className="mb-2 inline-flex items-center gap-1.5 text-sm font-bold text-amber-600">
                                      <span className="h-2 w-2 rounded-full bg-amber-400" />
                                      Needs Checking
                                    </div>
                                    {renderProgramUsageAlumni(row.needsChecking, 'needs-checking')}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
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
                  Needs checking
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
              <h2 className="text-xl font-semibold text-gray-900">Pending Requests ({pendingUsers.length})</h2>
              <p className="mt-1 text-sm text-gray-500">Approve or reject registrations after checking the submitted details.</p>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading pending registrations...</div>
          ) : pendingUsers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No pending registrations to review.</div>
          ) : (
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
                  {pendingUsers.map((user) => {
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
                            <button onClick={(e) => { e.stopPropagation(); handleApproval(user.id); }} className="w-full inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700">
                              Approve
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleRejection(user.id); }} className="w-full inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-700">
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        )}
      </div>
    </Layout>
  );
};

export default AdminDashboard;

import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { API_BASE_URL } from '../config/apiBaseUrl';
import UserLayout from './UserLayout';
import statsService from '../services/statsService';
import { authService } from '../services/authService';
import donationService from '../services/donationService';
import { realtimeClient } from '../services/realtimeClient';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const toneClasses = {
  sky: 'from-sky-500 to-cyan-500',
  amber: 'from-amber-500 to-orange-500',
  emerald: 'from-emerald-500 to-teal-500',
  violet: 'from-violet-500 to-fuchsia-500',
  cyan: 'from-cyan-500 to-blue-500',
  rose: 'from-rose-500 to-pink-500'
};

const RECENT_DONATION_CACHE_LIMIT = 100;

const AdminDashboard = ({ pendingOnly = false }) => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [adminStats, setAdminStats] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState({});
  const [recentDonations, setRecentDonations] = useState([]);
  const [recentDonationsLoading, setRecentDonationsLoading] = useState(true);

  useEffect(() => {
    fetchPendingUsers();
    fetchAdminStats();
    fetchRecentDonations();

  }, []);

  useEffect(() => {
    if (pendingOnly) return undefined;

    const handleDonationActivity = (payload) => {
      const type = payload?.type || payload?.notification?.type || null;
      if (String(type || '').toUpperCase() !== 'DONATION') return;

      const notification = payload?.notification || {};
      const createdAt = notification.created_at || notification.createdAt || payload?.createdAt || new Date().toISOString();
      const activity = {
        id: notification.id ? `notification-${notification.id}` : `live-donation-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: payload?.title || notification.title || '',
        message: payload?.message || notification.message || '',
        link: payload?.link || notification.link || '',
        senderName: payload?.senderName || notification.sender_name || notification.senderName || 'Alumnus',
        senderProfileImage: payload?.senderProfileImage || notification.sender_profile_image || notification.senderProfileImage || null,
        amountLabel: payload?.amountLabel || notification.amountLabel || '',
        campaignName: payload?.campaignName || notification.campaignName || '',
        donationKind: payload?.donationKind || notification.donationKind || 'money',
        createdAt: payload?.createdAt || createdAt
      };

      setRecentDonations((previous) => dedupeRecentDonations([activity, ...previous]));
    };

    const unsubscribe = realtimeClient.subscribe('notification.created', handleDonationActivity);
    return () => {
      try { unsubscribe(); } catch {}
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

  const registrationTrendsData = Array.isArray(adminStats?.registrationTrends) ? adminStats.registrationTrends : [];

  const eventData = Array.isArray(adminStats?.eventAttendance) ? adminStats.eventAttendance : [];

  const donationData = Array.isArray(adminStats?.donationTrends) ? adminStats.donationTrends : [];
  const currentMonthDate = new Date();
  const currentDonationMonthLabel = currentMonthDate.toLocaleString([], { month: 'long', year: 'numeric' });
  const visibleRecentDonations = recentDonations
    .slice()
    .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime())
    .filter((donation) => {
      const donationDate = new Date(donation.createdAt || 0);
      if (Number.isNaN(donationDate.getTime())) return false;
      return donationDate.getFullYear() === currentMonthDate.getFullYear()
        && donationDate.getMonth() === currentMonthDate.getMonth();
    });

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

  const fetchRecentDonations = async () => {
    if (pendingOnly) return;

    try {
      setRecentDonationsLoading(true);
      const data = await donationService.getRecentDonationActivity();
      setRecentDonations(dedupeRecentDonations(Array.isArray(data) ? data : []));
    } catch (error) {
      console.error('Error loading recent donation activity:', error);
      toast.error(error?.response?.data?.error || 'Failed to load recent donations');
      setRecentDonations([]);
    } finally {
      setRecentDonationsLoading(false);
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
  const inferDonationKind = (text = '') => {
    const normalized = String(text || '').toLowerCase();
    if (normalized.includes('money + items') || normalized.includes('money and items')) return 'money and items';
    if (normalized.includes('donation type: items') || normalized.includes('item donation')) return 'items';
    return 'money';
  };
  const formatDonationKind = (value) => {
    const normalized = String(value || 'money').toLowerCase();
    if (normalized.includes('money') && normalized.includes('item')) return 'Money + Items';
    if (normalized.includes('item')) return 'Items';
    return 'Money';
  };
  const formatActivityTime = (value) => {
    if (!value) return 'Just now';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Just now';
    return date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };
  const getInitials = (name = 'Alumnus') => name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'A';

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

  const Layout = UserLayout;

  const stripDonationMeta = (text = '') => {
    if (!text || typeof text !== 'string') return text;
    // Remove any [[DONATION_META]]...[[/DONATION_META]] blocks and trailing whitespace
    return text.replace(/\[\[DONATION_META\]\][\s\S]*?\[\[\/DONATION_META\]\]/gi, '').trim();
  };

  const parseDonationDetailsText = (text = '') => {
    const result = {};
    if (!text || typeof text !== 'string') return result;
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      const match = line.match(/^([A-Za-z][A-Za-z0-9 _-]*?):\s*(.*)$/);
      if (!match) continue;
      const key = match[1]?.trim();
      const value = match[2]?.trim();
      if (key) {
        result[key] = value;
      }
    }
    return result;
  };

  const normalizeDonationSignaturePart = (value = '') => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const toMinuteBucket = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return normalizeDonationSignaturePart(value);
    date.setSeconds(0, 0);
    return date.toISOString();
  };
  const extractCampaignNameFromText = (text = '') => {
    const match = String(text || '').match(/\bto\s+(.+?)(?:[.!?]|$)/i);
    return match?.[1]?.trim() || '';
  };
  const isStructuredDonationMessage = (text = '') => /(?:^|\n)\s*Donation for:/i.test(String(text || ''));
  const buildDonationActivitySignature = (donation = {}) => {
    const raw = stripDonationMeta(donation.message || donation.title || '');
    const details = parseDonationDetailsText(raw);
    const donor = details.Donor || details.donor || donation.senderName || '';
    const amount = details.Amount || details.amount || donation.amountLabel || '';
    const campaign = details['Donation for']
      || details.Donation
      || donation.campaignName
      || extractCampaignNameFromText(donation.title || donation.message || '');
    const recorded = details.Recorded || details.recorded || donation.createdAt || '';
    const signature = [
      normalizeDonationSignaturePart(campaign),
      normalizeDonationSignaturePart(donor),
      normalizeDonationSignaturePart(amount),
      toMinuteBucket(recorded)
    ].join('|');

    if (signature.replace(/\|/g, '').length > 0) {
      return signature;
    }

    return normalizeDonationSignaturePart(`${donation.id}|${donation.title}|${donation.message}`);
  };
  const dedupeRecentDonations = (entries = []) => {
    const deduped = new Map();
    const sorted = [...entries].sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime());

    for (const donation of sorted) {
      const signature = buildDonationActivitySignature(donation);

      if (!deduped.has(signature)) {
        deduped.set(signature, donation);
        continue;
      }

      const existing = deduped.get(signature);
      if (isStructuredDonationMessage(donation.message) && !isStructuredDonationMessage(existing?.message)) {
        deduped.set(signature, donation);
      }
    }

    return Array.from(deduped.values())
      .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime())
      .slice(0, RECENT_DONATION_CACHE_LIMIT);
  };

  const formatDonationSummary = (rawText = '', donation = {}) => {
    const details = parseDonationDetailsText(rawText || '');
    const find = (re) => {
      for (const k of Object.keys(details)) {
        if (re.test(k)) return details[k];
      }
      return '';
    };
    const rawDonor = find(/^donor$/i) || donation.senderName || '';
    const donor = rawDonor.trim();
    const amount = find(/amount/i) || '';
    const donationFor = find(/donation\s*for|donation$/i) || '';
    // Build a concise summary even if amount missing
    let summary = 'New donation received';
    if (donor && donationFor && amount) summary = `${donor} donated ${amount} to ${donationFor}`;
    else if (donor && donationFor) summary = `${donor} donated to ${donationFor}`;
    else if (donor && amount) summary = `${donor} donated ${amount}`;
    else if (rawText) summary = rawText.split('\n')[0];
    const payment = find(/payment/i) || '';
    const country = find(/country/i) || '';
    let address = find(/address/i) || '';
    if (address && address.length > 80) address = address.slice(0, 80) + '...';
    const subtextParts = [];
    if (payment) subtextParts.push(payment);
    if (country) subtextParts.push(country);
    if (address) subtextParts.push(address);
    const subtext = subtextParts.join(' • ');
    const recorded = details.Recorded || details.recorded || '';
    return { summary, subtext, recorded };
  };

  return (
    <Layout>
      <div className="space-y-3">

        {!pendingOnly && (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {overviewCards.map((card) => (
            <div key={card.label} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className={`h-1.5 w-20 rounded-full bg-gradient-to-r ${toneClasses[card.tone]}`} />
              <div className="mt-4 text-sm font-medium uppercase tracking-[0.18em] text-slate-500">{card.label}</div>
              <div className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{card.value}</div>
              <p className="mt-2 text-sm leading-6 text-slate-500">{card.note}</p>
            </div>
          ))}
        </section>
        )}

        {!pendingOnly && (
        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Registration Trends</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Monthly submissions and approvals</h2>
              <p className="mt-2 text-sm text-slate-500">The graph shows the last six months of registration activity.</p>
            </div>
            <div className="flex items-center gap-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-sky-600" /> Submitted</span>
              <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-600" /> Approved</span>
            </div>
          </div>

          {statsLoading ? (
            <div className="grid gap-4 py-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="h-4 w-16 animate-pulse rounded bg-slate-200" />
                  <div className="mt-6 h-44 animate-pulse rounded-2xl bg-slate-200/80" />
                </div>
              ))}
            </div>
          ) : monthlyActivity.length > 0 ? (
            <div className="mt-6 overflow-x-auto pb-2">
              <div className="min-w-[760px] rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
                <div className="mb-3 grid h-52 grid-rows-4">
                  {[4, 3, 2, 1].map((row) => (
                    <div key={row} className="border-b border-dashed border-slate-300/80" />
                  ))}
                </div>
                <div className="-mt-52 grid grid-cols-6 gap-4">
                  {monthlyActivity.map((month) => (
                    <div key={month.key} className="flex min-w-0 flex-col items-center">
                      <div className="flex h-52 w-full items-end justify-center gap-2">
                        <div className="flex w-1/2 flex-col items-center justify-end gap-2">
                          <div className="w-full rounded-t-md bg-sky-600/90 shadow-sm" style={{ height: `${monthBarHeight(month.submitted)}px` }} />
                          <span className="text-xs font-semibold text-slate-700">{month.submitted}</span>
                        </div>
                        <div className="flex w-1/2 flex-col items-center justify-end gap-2">
                          <div className="w-full rounded-t-md bg-emerald-600/90 shadow-sm" style={{ height: `${monthBarHeight(month.approved)}px` }} />
                          <span className="text-xs font-semibold text-slate-700">{month.approved}</span>
                        </div>
                      </div>
                      <div className="mt-3 w-full truncate text-center text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{month.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-sm text-slate-500">No recent registration activity yet.</div>
          )}
        </section>
        )}

        {!pendingOnly && (
        <section className="grid items-stretch gap-3 xl:grid-cols-2">
          <div className="flex h-[620px] min-h-0 flex-col rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Donation Activity</p>
                </div>
                <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">Recent donations</h2>
                <p className="mt-2 text-sm text-slate-500">Showing donations from {currentDonationMonthLabel}. Scroll to review earlier donations this month.</p>
              </div>
              <button
                type="button"
                onClick={fetchRecentDonations}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Refresh
              </button>
            </div>

            {recentDonationsLoading ? (
              <div className="grid flex-1 gap-3 overflow-hidden py-5">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <div className="h-12 w-12 animate-pulse rounded-full bg-slate-200" />
                    <div className="min-w-0 flex-1">
                      <div className="h-4 w-36 animate-pulse rounded bg-slate-200" />
                      <div className="mt-3 h-3 w-56 max-w-full animate-pulse rounded bg-slate-200" />
                    </div>
                  </div>
                ))}
              </div>
              ) : visibleRecentDonations.length > 0 ? (
              <div className="mt-5 flex-1 space-y-3 overflow-y-auto pr-2 pb-1">
                {visibleRecentDonations.map((donation) => (
                  <div key={donation.id} className="flex min-w-0 items-start gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <div
                      className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700 ring-1 ring-emerald-200"
                      aria-hidden
                    >
                      {getInitials(donation.senderName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      {(() => {
                        const raw = stripDonationMeta(donation.message || donation.title || '');
                        const { summary, subtext, recorded } = formatDonationSummary(raw, donation);
                        return (
                          <>
                            <div className="text-sm font-semibold text-slate-900">{summary}</div>
                            {subtext && <div className="mt-1 text-sm text-slate-600 break-words">{subtext}</div>}
                            <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{formatActivityTime(recorded || donation.createdAt)}</div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center text-center text-sm text-slate-500">No donation activity for {currentDonationMonthLabel} yet.</div>
            )}
          </div>

          <div className="flex h-[620px] min-h-0 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex-shrink-0">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Registrations</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Registration Status Overview</h2>
              <p className="mt-2 text-sm text-slate-500">A compact snapshot of current registration outcomes.</p>
            </div>
            <div className="grid min-h-0 flex-1 grid-cols-1 gap-3">
              {approvalStatusData.map((entry) => {
                const total = approvalStatusData.reduce((sum, item) => sum + item.value, 0) || 1;
                const percentage = Math.round((entry.value / total) * 100);

                return (
                  <div key={entry.name} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 shadow-sm sm:p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{entry.name}</div>
                        <div className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{formatCount(entry.value)}</div>
                      </div>
                      <span className="mt-1 h-3.5 w-3.5 rounded-full" style={{ backgroundColor: entry.color }} />
                    </div>
                    <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200">
                      <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: entry.color }} />
                    </div>
                    <div className="mt-2 text-xs text-slate-500">{percentage}% of all registrations</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
        )}
        {!pendingOnly && courseData.length > 0 && (
        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Analytics</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Alumni by Course/Department</h2>
            <p className="mt-2 text-sm text-slate-500">Distribution of registered alumni across courses and programs.</p>
          </div>
          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={courseData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        )}

        {!pendingOnly && employmentStatusData.some(d => d.value > 0) && (
        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Alumni Status</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Employment Status Distribution</h2>
            <p className="mt-2 text-sm text-slate-500">Current employment status of alumni members.</p>
          </div>
          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={employmentStatusData} cx="50%" cy="50%" labelLine={false} label={(entry) => `${entry.name}: ${entry.value}`} outerRadius={120} fill="#8884d8" dataKey="value">
                  {employmentStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
        )}

        {!pendingOnly && registrationTrendsData.length > 0 && (
        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Growth</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Alumni Registration Trends</h2>
            <p className="mt-2 text-sm text-slate-500">Monthly registration growth over time.</p>
          </div>
          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={registrationTrendsData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
        )}

        {!pendingOnly && eventData.length > 0 && (
        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Events</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Event Participation</h2>
            <p className="mt-2 text-sm text-slate-500">Attendance across reunions, webinars, job fairs, and school activities.</p>
          </div>
          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={eventData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="attendees" fill="#10b981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        )}

        {!pendingOnly && donationData.length > 0 && (
        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Fundraising</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Donation Trends</h2>
            <p className="mt-2 text-sm text-slate-500">Monthly donation collection and trends.</p>
          </div>
          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={donationData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `₱${value.toLocaleString()}`} />
                <Legend />
                <Line type="monotone" dataKey="amount" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 4 }} name="Total Donations" />
              </LineChart>
            </ResponsiveContainer>
          </div>
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
                          <div className="text-xs text-gray-500">({user.username})</div>
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

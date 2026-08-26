import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { API_BASE_URL } from '../config/apiBaseUrl';
import UserLayout from './UserLayout';
import statsService from '../services/statsService';
import { authService } from '../services/authService';
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

const AdminDashboard = ({ pendingOnly = false }) => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [adminStats, setAdminStats] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState({});

  useEffect(() => {
    fetchPendingUsers();
    fetchAdminStats();

  }, []);
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

  return (
    <Layout>
      <div className="space-y-6">

        {!pendingOnly && (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {overviewCards.map((card) => (
            <div key={card.label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className={`h-1.5 w-20 rounded-full bg-gradient-to-r ${toneClasses[card.tone]}`} />
              <div className="mt-4 text-sm font-medium uppercase tracking-[0.18em] text-slate-500">{card.label}</div>
              <div className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{card.value}</div>
              <p className="mt-2 text-sm leading-6 text-slate-500">{card.note}</p>
            </div>
          ))}
        </section>
        )}

        {!pendingOnly && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
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
        {!pendingOnly && courseData.length > 0 && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
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
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
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
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
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
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
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
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
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

        {!pendingOnly && approvalStatusData.some(d => d.value > 0) && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Registrations</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Registration Status Overview</h2>
            <p className="mt-2 text-sm text-slate-500">A compact snapshot of current registration outcomes.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {approvalStatusData.map((entry) => {
              const total = approvalStatusData.reduce((sum, item) => sum + item.value, 0) || 1;
              const percentage = Math.round((entry.value / total) * 100);

              return (
                <div key={entry.name} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{entry.name}</div>
                      <div className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{formatCount(entry.value)}</div>
                    </div>
                    <span className="mt-1 h-3.5 w-3.5 rounded-full" style={{ backgroundColor: entry.color }} />
                  </div>
                  <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: entry.color }} />
                  </div>
                  <div className="mt-2 text-xs text-slate-500">{percentage}% of all registrations</div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              <span>Total registrations</span>
              <span className="text-slate-900">{formatCount(approvalStatusData.reduce((sum, item) => sum + item.value, 0))}</span>
            </div>
            <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-slate-100">
              {approvalStatusData.map((entry) => {
                const total = approvalStatusData.reduce((sum, item) => sum + item.value, 0) || 1;
                const width = Math.max(0, (entry.value / total) * 100);

                return (
                  <div
                    key={`${entry.name}-bar`}
                    className="h-full"
                    style={{ width: `${width}%`, backgroundColor: entry.color }}
                    title={`${entry.name}: ${formatCount(entry.value)}`}
                  />
                );
              })}
            </div>
          </div>
        </section>
        )}



        {pendingOnly && (
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">
            <h2 className="text-xl font-semibold text-slate-900">Pending Requests ({pendingUsers.length})</h2>
            <p className="mt-1 text-sm text-slate-500">Approve or reject registrations after checking the submitted details.</p>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading pending registrations...</div>
          ) : pendingUsers.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No pending registrations to review.</div>
          ) : (
            <div className="overflow-x-auto scrollbar-hide">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">School ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Level/Course</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Batch/Grad Year</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Date Submitted</th>
                    <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {pendingUsers.map((user) => {
                    const verification = verificationStatus[user.id];
                    const isVerified = verification?.verified === true;
                    const verificationLabel = verification ? (isVerified ? 'Verified' : 'Not found') : 'Checking...';

                    return (
                      <tr key={user.id} className="hover:bg-slate-50/80">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-slate-900">{user.first_name} {user.last_name}</div>
                          <div className="text-xs text-slate-500">({user.username})</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-mono text-slate-900">{user.student_id || 'N/A'}</div>
                          <span className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${isVerified ? 'bg-emerald-100 text-emerald-700' : verification ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'}`}>{verificationLabel}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-600">{user.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-600">{user.contact_number || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-900">{formatLevel(user.level)}</div>
                          <div className="text-xs text-slate-500">{user.course || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-900">{user.batch && `Batch ${user.batch}`}</div>
                          <div className="text-xs text-slate-500">{user.graduation_year && `Grad: ${user.graduation_year}`}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{new Date(user.created_at).toLocaleDateString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                          <div className="flex flex-col gap-2">
                            <button onClick={(e) => { e.stopPropagation(); handleApproval(user.id); }} className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-3 py-1.5 text-xs text-white transition-colors hover:bg-emerald-700">
                              <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                              </svg>
                              Approve
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleRejection(user.id); }} className="inline-flex items-center justify-center rounded-xl bg-rose-600 px-3 py-1.5 text-xs text-white transition-colors hover:bg-rose-700">
                              <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                              </svg>
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
        </section>
        )}
      </div>
    </Layout>
  );
};

export default AdminDashboard;
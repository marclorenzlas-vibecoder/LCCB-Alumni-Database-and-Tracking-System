import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import UserLayout from './UserLayout';
import AlumniService from '../services/alumniService';
import { IMAGE_BASE_URL } from '../config/apiBaseUrl';

const resolveImageUrl = (imagePath) => {
  if (!imagePath) return '';
  return String(imagePath).startsWith('http') ? imagePath : `${IMAGE_BASE_URL}${imagePath}`;
};

const getInitials = (firstName = '', lastName = '') =>
  `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || 'A';

const formatBirthdayDate = (dateValue) => {
  if (!dateValue) return 'Today';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'Today';
  return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
};

const openBirthdayGreeting = (alumni) => {
  const name = `${alumni.firstName || ''} ${alumni.lastName || ''}`.trim() || 'Alumni';
  window.dispatchEvent(
    new CustomEvent('open-birthday-greeting', {
      detail: { id: alumni.id, name },
    })
  );
};

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [todayBirthdays, setTodayBirthdays] = useState([]);
  const [isUserBirthday, setIsUserBirthday] = useState(false);
  const [stats, setStats] = useState({
    totalAlumni: '2,500+',
    activeMembers: '1,200+',
    upcomingEvents: '3',
    newConnections: '25+'
  });

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  useEffect(() => {
    const alumniService = new AlumniService();
    const loadBirthdays = async () => {
      try {
        const result = await alumniService.getBirthdayAlumniToday();
        setTodayBirthdays(Array.isArray(result.birthdays) ? result.birthdays : []);
        setIsUserBirthday(Boolean(result.isYourBirthday));
      } catch (error) {
        console.error('Failed to load birthday alumni', error);
      }
    };

    loadBirthdays();
  }, []);

  return (
    <UserLayout>
      <div className="bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="grid gap-6">
          <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-slate-500">Welcome back,</p>
                <h1 className="text-3xl font-semibold text-slate-900">
                  {user?.firstName || 'Alumni'} — your network is thriving.
                </h1>
                <p className="mt-2 text-sm text-slate-600 max-w-xl">
                  Discover new connections, see what’s happening next, and keep your profile ready for the next opportunity.
                </p>
              </div>
              <div className="rounded-3xl bg-slate-900 p-4 text-white sm:w-[260px]">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Today’s highlight</p>
                <p className="mt-3 text-lg font-semibold">3 new events added</p>
                <p className="mt-2 text-sm text-slate-300">Check the latest community activities and RSVP to what interests you.</p>
              </div>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
            {(isUserBirthday || todayBirthdays.length > 0) && (
              <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-white to-indigo-50/40 p-6 shadow-sm lg:col-span-2">
                <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-amber-200/30 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-20 left-8 h-40 w-40 rounded-full bg-indigo-200/25 blur-3xl" />
                <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium uppercase tracking-[0.2em] text-indigo-600">
                      🎂 Birthday spotlight
                    </p>
                    <h2 className="mt-2 text-2xl font-bold text-slate-900">
                      {isUserBirthday ? `Happy birthday, ${user?.firstName || 'Alumni'}!` : 'Today’s birthdays'}
                    </h2>
                    <p className="mt-2 text-sm text-slate-600">
                      {isUserBirthday
                        ? 'Celebrate with your alumni community today.'
                        : `${todayBirthdays.length} alumni ${todayBirthdays.length === 1 ? 'has' : 'have'} a birthday today.`}
                    </p>
                  </div>
                  <div className="rounded-3xl bg-gradient-to-br from-indigo-700 to-violet-700 p-4 text-white shadow-md">
                    <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">Celebrating</p>
                    <p className="mt-3 text-3xl font-bold">{todayBirthdays.length}</p>
                    <p className="mt-1 text-sm text-indigo-100">birthday{todayBirthdays.length === 1 ? '' : 's'} today</p>
                  </div>
                </div>
                {todayBirthdays.length > 0 ? (
                  <div className="relative mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {todayBirthdays.slice(0, 6).map((card) => {
                      const avatar = resolveImageUrl(card.profileImage);
                      const fullName = `${card.firstName || ''} ${card.lastName || ''}`.trim();
                      return (
                        <article
                          key={card.id}
                          className="birthday-recipient-today group flex flex-col rounded-2xl border border-amber-200/60 bg-white p-4 shadow-sm transition hover:shadow-md"
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 ring-2 ring-white shadow">
                              {avatar ? (
                                <img src={avatar} alt={fullName} className="h-full w-full object-cover" />
                              ) : (
                                <span className="flex h-full w-full items-center justify-center text-sm font-bold text-white">
                                  {getInitials(card.firstName, card.lastName)}
                                </span>
                              )}
                              <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-[10px] ring-2 ring-white">
                                🎂
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-bold text-slate-900">{fullName}</p>
                              <p className="text-sm text-indigo-600">{formatBirthdayDate(card.dateOfBirth)}</p>
                              <span className="mt-1 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                                Today 🎉
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => openBirthdayGreeting(card)}
                            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 active:scale-[0.98]"
                          >
                            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                            </svg>
                            Send greeting
                          </button>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <p className="relative mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-sm text-slate-500">
                    No other alumni birthdays today — enjoy your special day! 🎉
                  </p>
                )}
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm">
                <div className="text-sm uppercase tracking-[0.2em] text-slate-500">Growth</div>
                <div className="mt-6 text-4xl font-semibold text-slate-900">{stats.totalAlumni}</div>
                <div className="mt-2 text-sm text-slate-600">Alumni on the network</div>
              </div>
              <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm">
                <div className="text-sm uppercase tracking-[0.2em] text-slate-500">Engagement</div>
                <div className="mt-6 text-4xl font-semibold text-slate-900">{stats.activeMembers}</div>
                <div className="mt-2 text-sm text-slate-600">Members active this week</div>
              </div>
              <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm">
                <div className="text-sm uppercase tracking-[0.2em] text-slate-500">Events</div>
                <div className="mt-6 text-4xl font-semibold text-slate-900">{stats.upcomingEvents}</div>
                <div className="mt-2 text-sm text-slate-600">Upcoming events ready to join</div>
              </div>
              <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm">
                <div className="text-sm uppercase tracking-[0.2em] text-slate-500">Connections</div>
                <div className="mt-6 text-4xl font-semibold text-slate-900">{stats.newConnections}</div>
                <div className="mt-2 text-sm text-slate-600">New relationships formed</div>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-6 text-white shadow-sm">
                <div className="text-sm uppercase tracking-[0.2em] text-slate-300">Action plan</div>
                <h2 className="mt-3 text-2xl font-semibold">Keep your profile spotlight-ready</h2>
                <p className="mt-3 text-sm text-slate-300">Complete these quick actions to increase visibility and stay connected with the alumni community.</p>
                <div className="mt-6 space-y-3">
                  <Link to="/profile" className="block rounded-2xl bg-white/10 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/20">
                    Update profile & bio
                  </Link>
                  <Link to="/events" className="block rounded-2xl bg-white/10 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/20">
                    Explore upcoming events
                  </Link>
                  <Link to="/alumni" className="block rounded-2xl bg-white/10 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/20">
                    Find and message alumni
                  </Link>
                </div>
              </div>

              <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Recent highlights</p>
                    <h2 className="mt-3 text-xl font-semibold text-slate-900">Community pulse</h2>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase text-emerald-800">Live</span>
                </div>
                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">Annual Reunion details posted</p>
                    <p className="mt-1 text-sm text-slate-600">See the full agenda and invite your classmates.</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">Top alumni spotlight</p>
                    <p className="mt-1 text-sm text-slate-600">A new mentorship program opened for recent graduates.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </UserLayout>
  );
};

export default Dashboard;
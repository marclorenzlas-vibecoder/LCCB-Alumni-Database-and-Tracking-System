import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import UserLayout from './UserLayout';
import AlumniService from '../services/alumniService';

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
              <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm lg:col-span-2">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Birthday spotlight</p>
                    <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                      {isUserBirthday ? `Happy birthday, ${user?.firstName || 'Alumni'}!` : 'Today’s birthdays'}
                    </h2>
                    <p className="mt-2 text-sm text-slate-600">
                      {isUserBirthday
                        ? 'Celebrate with your alumni community today.'
                        : `${todayBirthdays.length} alumni have a birthday today.`}
                    </p>
                  </div>
                  <div className="rounded-3xl bg-slate-900/95 p-4 text-white">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Birthday feed</p>
                    <p className="mt-3 text-xl font-semibold">{todayBirthdays.length}</p>
                    <p className="mt-2 text-sm text-slate-300">currently celebrating</p>
                  </div>
                </div>
                {todayBirthdays.length > 0 && (
                  <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {todayBirthdays.slice(0, 6).map((card) => (
                      <div key={card.id} className="rounded-3xl border border-slate-200 p-4">
                        <p className="text-sm font-semibold text-slate-900">{card.firstName} {card.lastName}</p>
                        <p className="mt-2 text-sm text-slate-500">Birthday today</p>
                      </div>
                    ))}
                  </div>
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
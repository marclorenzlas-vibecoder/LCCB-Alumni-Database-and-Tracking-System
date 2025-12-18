import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const [user, setUser] = useState(null);
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

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      {/* Welcome Section */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.firstName || 'Alumni'}! 👋
        </h1>
        <p className="text-gray-600 mt-2">
          Here's what's happening in your alumni network
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-blue-50 rounded-lg p-6">
          <div className="text-blue-600 text-2xl font-bold">{stats.totalAlumni}</div>
          <div className="text-blue-900">Total Alumni</div>
        </div>
        <div className="bg-green-50 rounded-lg p-6">
          <div className="text-green-600 text-2xl font-bold">{stats.activeMembers}</div>
          <div className="text-green-900">Active Members</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-6">
          <div className="text-purple-600 text-2xl font-bold">{stats.upcomingEvents}</div>
          <div className="text-purple-900">Upcoming Events</div>
        </div>
        <div className="bg-orange-50 rounded-lg p-6">
          <div className="text-orange-600 text-2xl font-bold">{stats.newConnections}</div>
          <div className="text-orange-900">New Connections</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-4">
            <Link to="/profile" className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100">
              <span className="flex items-center">
                <span className="text-xl mr-3">👤</span>
                Update Your Profile
              </span>
            </Link>
            <Link to="/events" className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100">
              <span className="flex items-center">
                <span className="text-xl mr-3">📅</span>
                View Upcoming Events
              </span>
            </Link>
            <Link to="/alumni" className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100">
              <span className="flex items-center">
                <span className="text-xl mr-3">🔍</span>
                Find Alumni
              </span>
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="font-medium">New Event Announced</div>
              <div className="text-sm text-gray-600">Annual Alumni Reunion 2024</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="font-medium">Profile Update</div>
              <div className="text-sm text-gray-600">2 new alumni completed their profiles</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="font-medium">New Job Opportunity</div>
              <div className="text-sm text-gray-600">Senior Developer position at Tech Corp</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
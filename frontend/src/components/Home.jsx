import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import eventService from '../services/eventService';
import achievementService from '../services/achievementService';
import careerService from '../services/careerService';
import donationService from '../services/donationService';
import alumniService from '../services/alumniService';
import backgroundImage from '../assets/background.jpg';
import NotificationPermissionPopup from './NotificationPermissionPopup';

const Home = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ alumni: 0, active: 0, events: 0, jobs: 0 });

  useEffect(() => {
    fetchPreviewData();
  }, []);

  const fetchPreviewData = async () => {
    try {
      const [eventsData, achievementsData, jobsData, donationsData, alumniData] = await Promise.all([
        eventService.getAllEvents(),
        achievementService.getAllAchievements(),
        careerService.getAllCareers(),
        donationService.getAllDonations(),
        alumniService.getAllAlumni()
      ]);
      
      setEvents(eventsData.slice(0, 3));
      setAchievements(achievementsData.slice(0, 3));
      setJobs(jobsData.slice(0, 3));
      setDonations(donationsData.slice(0, 3));

      const totalAlumni = Array.isArray(alumniData) ? alumniData.length : 0;
      const activeMembers = Array.isArray(alumniData) ? alumniData.filter(a => a.isVerified === true).length : 0;
      const totalEvents = Array.isArray(eventsData) ? eventsData.length : 0;
      const totalJobs = Array.isArray(jobsData) ? jobsData.length : 0;
      setTotals({ alumni: totalAlumni, active: activeMembers, events: totalEvents, jobs: totalJobs });
    } catch (err) {
      console.error('Error fetching preview data:', err);
    } finally {
      setLoading(false);
    }
  };

  // 📊 STATISTICS - Easy to change these numbers
  const stats = [
    { label: 'Total Alumni', value: String(totals.alumni) },
    { label: 'Active Members', value: String(totals.active) },
    { label: 'Upcoming Events', value: String(totals.events) },
    { label: 'Job Opportunities', value: String(totals.jobs) }
  ];

  const renderStatIcon = (index) => {
    const styles = [
      'bg-blue-100 text-blue-600',
      'bg-emerald-100 text-emerald-600',
      'bg-amber-100 text-amber-600',
      'bg-violet-100 text-violet-600'
    ];
    const cls = `w-10 h-10 rounded-full flex items-center justify-center ${styles[index] || styles[0]}`;
    switch(index){
      case 0:
        return (
          <div className={cls}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M12 14a5 5 0 100-10 5 5 0 000 10z"/></svg>
          </div>
        );
      case 1:
        return (
          <div className={cls}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.042 3.2a1 1 0 00.95.69h3.356c.969 0 1.371 1.24.588 1.81l-2.716 1.974a1 1 0 00-.364 1.118l1.041 3.2c.3.921-.755 1.688-1.54 1.118l-2.716-1.974a1 1 0 00-1.175 0l-2.716 1.974c-.784.57-1.838-.197-1.539-1.118l1.04-3.2a1 1 0 00-.363-1.118L3.06 8.627c-.783-.57-.38-1.81.588-1.81h3.356a1 1 0 00.95-.69l1.042-3.2z"/></svg>
          </div>
        );
      case 2:
        return (
          <div className={cls}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          </div>
        );
      default:
        return (
          <div className={cls}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 7l3 12h12l3-12M6 7l1 12m10-12l-1 12M9 7l1-3h4l1 3"/></svg>
          </div>
        );
    }
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="min-h-screen">
      {/* Notification Permission Popup */}
      <NotificationPermissionPopup />
      
      {/* Hero Section - Clean & Modern */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800" style={{ backgroundImage: `url(${backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        {/* Blue overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/90 via-blue-700/90 to-indigo-800/90"></div>
        
        <div className="relative px-8 lg:px-16 pt-32 pb-20">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6 leading-tight">
              Welcome to LCCB <br />
              <span className="text-blue-200">Alumni Network</span>
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 mb-12 leading-relaxed">
              Connect, grow, and stay updated with your fellow LCCB alumni. Our platform helps you maintain professional connections, discover career opportunities, and stay informed about alumni events.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mb-20 justify-center">
              <button 
                onClick={() => navigate('/alumni')}
                className="group px-8 py-4 bg-white text-blue-600 rounded-full font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center gap-2"
              >
                Explore Alumni Directory
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
              <button 
                onClick={() => navigate('/events')}
                className="group px-8 py-4 bg-transparent border-2 border-white text-white rounded-full font-semibold text-lg hover:bg-white hover:text-blue-600 transition-all duration-300 flex items-center gap-2"
              >
                View Upcoming Events
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Section - At the bottom overlapping */}
      <div className="relative -mt-12 pb-16 z-10">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="bg-white rounded-xl p-6 text-center shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="text-4xl md:text-5xl font-bold text-gray-900 mb-1">
                  {stat.value}
                </div>
                <div className="text-gray-600 font-medium text-xs md:text-sm">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Section - Now directly after hero */}
      <div className="py-20 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">What We Offer</h2>
            <p className="text-xl text-gray-600">Everything you need to stay connected and grow professionally</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {/* Feature 1 */}
            <div className="group relative bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.768-.231-1.48-.634-2.026M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.768.231-1.48.634-2.026M14 10a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Professional Network</h3>
              <p className="text-gray-700 mb-6 leading-relaxed">
                Connect with alumni across various industries. Find mentors, collaborators, and lifelong friends.
              </p>
              <button onClick={() => navigate('/alumni')} className="text-blue-600 font-semibold hover:gap-2 flex items-center gap-1 transition-all">
                Browse Directory 
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Feature 2 */}
            <div className="group relative bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl p-8 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="w-14 h-14 bg-green-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Events & Workshops</h3>
              <p className="text-gray-700 mb-6 leading-relaxed">
                Stay informed about reunions, workshops, networking events, and career development opportunities.
              </p>
              <button onClick={() => navigate('/events')} className="text-green-600 font-semibold hover:gap-2 flex items-center gap-1 transition-all">
                View Events 
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Feature 3 */}
            <div className="group relative bg-gradient-to-br from-purple-50 to-violet-100 rounded-2xl p-8 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="w-14 h-14 bg-purple-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Career Opportunities</h3>
              <p className="text-gray-700 mb-6 leading-relaxed">
                Discover job openings shared by fellow alumni and expand your professional horizons.
              </p>
              <button onClick={() => navigate('/employment')} className="text-purple-600 font-semibold hover:gap-2 flex items-center gap-1 transition-all">
                Browse Jobs 
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Events Preview Section */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Upcoming Events</h2>
              <p className="text-lg text-gray-600">Don't miss out on our latest activities</p>
            </div>
            <Link 
              to="/events" 
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center gap-2">
              View All
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
          
          {loading ? (
            <div className="text-center py-8">Loading events...</div>
          ) : events.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No events available</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
              {events.map((event) => (
                <div key={event.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-300 h-full flex flex-col">
                  {event.image && (
                    <img
                      src={event.image.startsWith('/') ? `http://localhost:5001${event.image}` : event.image}
                      alt={event.name}
                      className="w-full h-40 object-cover"
                    />
                  )}
                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{event.name}</h3>
                    <p className="text-gray-600 text-sm line-clamp-3">{event.description}</p>
                    <div className="mt-3 flex items-center text-gray-500 text-sm">
                      <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {event.date ? new Date(event.date).toLocaleDateString() : 'TBA'}
                    </div>
                    <div className="mt-2 flex items-center text-gray-500 text-sm">
                      <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      {event.location || 'TBA'}
                    </div>
                    <div className="mt-auto pt-4">
                      <Link to="/events" className="w-full inline-flex justify-center items-center px-4 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                        View Details
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Achievements Preview Section */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Recent Achievements</h2>
              <p className="text-lg text-gray-600">Celebrating our alumni successes</p>
            </div>
            <Link 
              to="/achievements" 
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center gap-2">
              View All
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
          
          {loading ? (
            <div className="text-center py-8">Loading achievements...</div>
          ) : achievements.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No achievements available</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {achievements.map((achievement) => (
                <div key={achievement.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
                  {achievement.image && (
                    <img
                      src={achievement.image.startsWith('/') ? `http://localhost:5001${achievement.image}` : achievement.image}
                      alt={achievement.title}
                      className="w-full h-40 object-cover"
                    />
                  )}
                  <div className="p-5">
                    <span className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-full">
                      {achievement.category || 'Achievement'}
                    </span>
                    <h3 className="text-lg font-semibold text-gray-900 mt-3 mb-2">{achievement.title}</h3>
                    <p className="text-gray-600 text-sm line-clamp-3">{achievement.description || 'No description'}</p>
                    <p className="text-gray-500 text-xs mt-3">
                      {achievement.date ? new Date(achievement.date).toLocaleDateString() : 'Date not specified'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Job Opportunities Preview Section */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Career Opportunities</h2>
              <p className="text-lg text-gray-600">Latest job postings from our network</p>
            </div>
            <Link 
              to="/employment" 
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center gap-2">
              View All
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
          
          {loading ? (
            <div className="text-center py-8">Loading jobs...</div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No job postings available</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {jobs.map((job) => {
                const descParts = job.description?.split('\n') || [];
                const location = descParts.find(p => p.startsWith('Location:'))?.replace('Location:', '').trim() || 'Not specified';
                const type = descParts.find(p => p.startsWith('Type:'))?.replace('Type:', '').trim() || 'Not specified';
                const salary = descParts.find(p => p.startsWith('Salary:'))?.replace('Salary:', '').trim() || 'Not specified';
                
                return (
                  <div key={job.id} className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-lg transition-shadow duration-300">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{job.job_title}</h3>
                    <p className="text-gray-600 mb-3">{job.company}</p>
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-gray-500 text-sm">
                        <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        {location}
                      </div>
                      <div className="flex items-center text-gray-500 text-sm">
                        <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {type}
                      </div>
                      <div className="flex items-center text-gray-500 text-sm">
                        <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {salary}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Donations/Campaigns Preview Section */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Support Our Causes</h2>
              <p className="text-lg text-gray-600">Make a difference with your contribution</p>
            </div>
            <Link 
              to="/donations" 
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center gap-2">
              View All
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
          
          {loading ? (
            <div className="text-center py-8">Loading campaigns...</div>
          ) : donations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No campaigns available</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {donations.map((donation) => {
                const progress = donation.goal ? Math.min((donation.amount / donation.goal) * 100, 100) : 0;
                
                return (
                  <div key={donation.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
                    {donation.image && (
                      <img
                        src={donation.image.startsWith('/') ? `http://localhost:5001${donation.image}` : donation.image}
                        alt={donation.purpose}
                        className="w-full h-40 object-cover"
                      />
                    )}
                    <div className="p-5">
                      <span className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-full">
                        {donation.category || 'General'}
                      </span>
                      <h3 className="text-lg font-semibold text-gray-900 mt-3 mb-2">{donation.purpose}</h3>
                      {donation.description && (
                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">{donation.description}</p>
                      )}
                      {donation.goal && (
                        <div className="mb-3">
                          <div className="flex justify-between text-xs text-gray-600 mb-1">
                            <span>{formatAmount(donation.amount)}</span>
                            <span>{formatAmount(donation.goal)}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{Math.round(progress)}% Complete</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Call to Action - Minimal & Clean */}
      <div className="py-24 bg-gradient-to-r from-blue-600 to-indigo-700">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Connect?
          </h2>
          <p className="text-xl text-blue-100 mb-10 leading-relaxed">
            Join our growing community of LCCB alumni and unlock endless opportunities for networking, growth, and success.
          </p>
          <button 
            onClick={() => navigate('/register')}
            className="px-10 py-4 bg-white text-blue-600 rounded-full font-bold text-lg shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
          >
            Get Started Today
          </button>
        </div>
      </div>

    </div>
  );
};

export default Home;

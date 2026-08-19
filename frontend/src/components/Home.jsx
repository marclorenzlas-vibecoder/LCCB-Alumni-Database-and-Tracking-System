import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import eventService from '../services/eventService';
import achievementService from '../services/achievementService';
import careerService from '../services/careerService';
import donationService from '../services/donationService';
import statsService from '../services/statsService';
import backgroundImage from '../assets/homeimage.jpg';
import NotificationPermissionPopup from './NotificationPermissionPopup';
import UserLayout from './UserLayout';
import { IMAGE_BASE_URL } from '../config/apiBaseUrl';
import { extractDonationMeta } from '../utils/donationMeta';
import AchievementVideoPreview from './AchievementVideoPreview';
import CardSkeleton from './CardSkeleton';

function AchievementHomeCard({ achievement }) {
  const titleRef = useRef(null);
  const [descLines, setDescLines] = useState(4);
  const achievementMediaSrc = achievement.image
    ? achievement.image.startsWith('/') ? `${IMAGE_BASE_URL}${achievement.image}` : achievement.image
    : '';
  const isAchievementVideo = /\.(mp4|mov|avi|mkv|webm)$/i.test(achievement.image || '');

  const measureTitle = useCallback(() => {
    const el = titleRef.current;
    if (!el) return;
    // card-title-container: font-size 18px, line-height 1.4
    const lineHeight = 18 * 1.4;
    const lines = Math.round(el.scrollHeight / lineHeight);
    setDescLines(lines <= 1 ? 5 : 4);
  }, []);

  useEffect(() => {
    measureTitle();
    window.addEventListener('resize', measureTitle);
    return () => window.removeEventListener('resize', measureTitle);
  }, [measureTitle, achievement.title]);

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 flex flex-col h-full">
      {achievement.image ? (
        isAchievementVideo ? (
          <AchievementVideoPreview
            src={achievementMediaSrc}
            className="h-48 w-full"
            videoClassName="h-48 w-full object-cover"
            muted
          />
        ) : (
          <img
            src={achievementMediaSrc}
            alt={achievement.title}
            className="w-full h-48 object-cover"
          />
        )
      ) : (
        <div className="w-full h-48 bg-blue-100 flex items-center justify-center">
          <svg className="w-10 h-10 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
      )}
      <div className="flex-1 flex flex-col p-5">
        {/* Title — 2-line cap */}
        <h3 ref={titleRef} className="card-title-container">
          {achievement.title}
        </h3>
        {/* Description — JS sentence-limit */}
        <div className="card-description-container">
          <p
            className={descLines === 5 ? 'desc-clamp-5' : 'desc-clamp-4'}
            style={{ wordBreak: 'break-word' }}
          >
            {achievement.description || 'No description provided'}
          </p>
        </div>
        {/* Footer — Read More + date anchored to bottom */}
        <div className="card-footer-wrapper">
          <Link
            to={`/achievements/${achievement.id}`}
            className="read-more-link"
          >
            Read More
          </Link>
          {achievement.date && (
            <div className="flex items-center text-gray-500 text-sm pt-3 border-t border-gray-100">
              <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {new Date(achievement.date).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EventHomeCard({ event }) {
  const titleRef = useRef(null);
  const [descLines, setDescLines] = useState(4);

  const measureTitle = useCallback(() => {
    const el = titleRef.current;
    if (!el) return;
    const lineHeight = 18 * 1.4;
    const lines = Math.round(el.scrollHeight / lineHeight);
    setDescLines(lines <= 1 ? 5 : 4);
  }, []);

  useEffect(() => {
    measureTitle();
    window.addEventListener('resize', measureTitle);
    return () => window.removeEventListener('resize', measureTitle);
  }, [measureTitle, event.name]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-300 h-full flex flex-col">
      {event.image ? (
        <img
          src={event.image.startsWith('/') ? `${IMAGE_BASE_URL}${event.image}` : event.image}
          alt={event.name}
          className="w-full h-40 object-cover"
        />
      ) : (
        <div className="w-full h-40 bg-blue-100 flex items-center justify-center">
          <svg className="w-10 h-10 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        </div>
      )}
      <div className="flex-1 flex flex-col p-5">
        {/* Title — 2-line cap */}
        <h3 ref={titleRef} className="card-title-container">
          {event.name}
        </h3>
        {/* Description — JS sentence-limit */}
        {event.description && (
          <div className="card-description-container">
            <p className={descLines === 5 ? 'desc-clamp-5' : 'desc-clamp-4'}>
              {event.description}
            </p>
          </div>
        )}
        {/* Footer — meta + CTA anchored to bottom */}
        <div className="card-footer-wrapper">
          <div className="space-y-1 text-sm text-gray-500">
            <div className="flex items-center">
              <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {event.date ? new Date(event.date).toLocaleDateString() : 'TBA'}
            </div>
            {event.location && (
              <div className="flex items-center">
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                {event.location}
              </div>
            )}
          </div>
          <Link to="/events" className="w-full inline-flex items-center justify-center rounded-md bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-700/20 transition-all hover:-translate-y-0.5 hover:bg-blue-800 hover:shadow-lg">
            View Details
          </Link>
        </div>
      </div>
    </div>
  );
}

function DonationHomeCard({ donation, formatAmount }) {
  const titleRef = useRef(null);
  const [descLines, setDescLines] = useState(4);

  const measureTitle = useCallback(() => {
    const el = titleRef.current;
    if (!el) return;
    const lineHeight = 18 * 1.4;
    const lines = Math.round(el.scrollHeight / lineHeight);
    setDescLines(lines <= 1 ? 5 : 4);
  }, []);

  useEffect(() => {
    measureTitle();
    window.addEventListener('resize', measureTitle);
    return () => window.removeEventListener('resize', measureTitle);
  }, [measureTitle, donation.purpose]);

  const { cleanDescription } = extractDonationMeta(donation.description || '');
  const progress = donation.goal ? Math.min((donation.amount / donation.goal) * 100, 100) : 0;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 flex flex-col h-full">
      {donation.image ? (
        <img
          src={donation.image.startsWith('/') ? `${IMAGE_BASE_URL}${donation.image}` : donation.image}
          alt={donation.purpose}
          className="w-full h-40 object-cover"
        />
      ) : (
        <div className="w-full h-40 bg-blue-100 flex items-center justify-center">
          <svg className="w-10 h-10 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
        </div>
      )}
      <div className="flex-1 flex flex-col p-5">
        <span className="px-3 py-1 text-xs font-medium text-blue-900 bg-blue-100 rounded-full self-start mb-3">
          {donation.category || 'General'}
        </span>
        {/* Title — 2-line cap */}
        <h3 ref={titleRef} className="card-title-container">
          {donation.purpose}
        </h3>
        {/* Description — JS sentence-limit */}
        {cleanDescription && (
          <div className="card-description-container">
            <p className={descLines === 5 ? 'desc-clamp-5' : 'desc-clamp-4'}>
              {cleanDescription}
            </p>
          </div>
        )}
        {/* Footer — progress + date anchored to bottom */}
        <div className="card-footer-wrapper">
          {donation.goal && (
            <div>
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>{formatAmount(donation.amount)}</span>
                <span>{formatAmount(donation.goal)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-900 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">{Math.round(progress)}% Complete</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

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
      const snapshot = await statsService.getHomeSnapshot();
      
      setEvents(snapshot.events || []);
      setAchievements(snapshot.achievements || []);
      setJobs(snapshot.jobs || []);
      setDonations(snapshot.donations || []);

      setTotals({
        alumni: Number(snapshot.stats?.totalAlumni || 0),
        active: Number(snapshot.stats?.activeMembers || 0),
        events: Number(snapshot.stats?.upcomingEvents || 0),
        jobs: Number(snapshot.stats?.jobOpportunities || 0)
      });
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
    <UserLayout>
      <div className="-mx-4 -mt-4 -mb-4 bg-gray-50 sm:-mx-6 lg:-mx-8 lg:-mt-6 lg:-mb-6">
      {/* Notification Permission Popup */}
      <NotificationPermissionPopup />
      
      <div className="home-hero relative min-h-[28rem] overflow-hidden bg-blue-900">
        <img
          src={backgroundImage}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover object-center"
          fetchpriority="high"
          decoding="async"
        />
        <div className="home-hero__overlay absolute inset-0" aria-hidden="true" />
        
        <div className="relative px-8 lg:px-16 pt-32 pb-20 z-10">
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
                className="group px-8 py-4 bg-white text-blue-900 rounded-full font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center gap-2"
              >
                Explore Alumni Directory
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
              <button 
                onClick={() => navigate('/events')}
                className="group px-8 py-4 bg-transparent border-2 border-white text-white rounded-full font-semibold text-lg hover:bg-white hover:text-blue-900 transition-all duration-300 flex items-center gap-2"
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
        <div className="container mx-auto px-8">
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

      {/* About Section */}
      <div className="py-12 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">ABOUT</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Your comprehensive platform for staying connected with the LCCB community
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
            {/* Left Side - About Content */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-8 shadow-lg">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 bg-blue-900 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Our Mission</h3>
                    <p className="text-gray-700 leading-relaxed">
                      The LCCB Alumni Database and Tracking System is designed to bridge the gap between past and present, 
                      creating a vibrant ecosystem where alumni can reconnect, collaborate, and support each other's professional 
                      and personal growth.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-lg">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">What We Provide</h3>
                    <ul className="text-gray-700 space-y-2">
                      <li className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>Comprehensive alumni directory with advanced search and filtering</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>Real-time event management and RSVP tracking</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>Career services including job postings and application tracking</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>Achievement showcase and donation management</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>Instant notifications for important updates and opportunities</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Stats & Features */}
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-blue-800 to-indigo-900 rounded-2xl p-8 text-white shadow-xl">
                <h3 className="text-2xl font-bold mb-6">Platform Highlights</h3>
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-3xl font-bold">{totals.alumni}+</div>
                      <div className="text-blue-100">Registered Alumni</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-3xl font-bold">{totals.jobs}+</div>
                      <div className="text-blue-100">Job Opportunities</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-3xl font-bold">{totals.events}+</div>
                      <div className="text-blue-100">Annual Events</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-lg">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Key Features</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-gray-700">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="font-medium">Secure account management</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-700">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="font-medium">Interactive alumni profiles</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-700">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="font-medium">Mobile-responsive design</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-700">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="font-medium">Real-time notifications</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section - What We Offer */}
      <div className="py-12 bg-gray">

        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">What We Offer</h2>
            <p className="text-xl text-gray-600">Everything you need to stay connected and grow professionally</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {/* Feature 1 */}
            <div className="group relative bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl p-8 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="w-14 h-14 bg-blue-900 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.768-.231-1.48-.634-2.026M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.768.231-1.48.634-2.026M14 10a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Professional Network</h3>
              <p className="text-gray-700 mb-6 leading-relaxed">
                Connect with alumni across various industries. Find mentors, collaborators, and lifelong friends.
              </p>
              <button onClick={() => navigate('/alumni')} className="text-blue-900 font-semibold hover:gap-2 flex items-center gap-1 transition-all">
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
      <div className="py-10 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Upcoming Events</h2>
              <p className="text-lg text-gray-600">Don't miss out on our latest activities</p>
            </div>
            <Link 
              to="/events" 
              className="px-6 py-3 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors duration-200 flex items-center gap-2">
              View All
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
          
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
              <CardSkeleton count={3} />
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No events available</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
              {events.map((event) => (
                <EventHomeCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Achievements Preview Section */}
      <div className="py-10 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Recent Achievements</h2>
              <p className="text-lg text-gray-600">Celebrating our alumni successes</p>
            </div>
            <Link 
              to="/achievements" 
              className="px-6 py-3 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors duration-200 flex items-center gap-2">
              View All
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
          
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
              <CardSkeleton count={3} />
            </div>
          ) : achievements.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No achievements available</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
              {achievements.map((achievement) => (
                <AchievementHomeCard key={achievement.id} achievement={achievement} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Job Opportunities Preview Section */}
      <div className="py-10 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Career Opportunities</h2>
              <p className="text-lg text-gray-600">Latest job postings from our network</p>
            </div>
            <Link 
              to="/employment" 
              className="px-6 py-3 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors duration-200 flex items-center gap-2">
              View All
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
          
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
              <CardSkeleton count={3} />
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No job postings available</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {jobs.map((job) => {
                const location = job.location || 'Location not set';
                const department = job.department || 'Department not set';
                const type = job.job_type || 'Employment type not set';
                
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
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        {department}
                      </div>
                      <div className="flex items-center text-gray-500 text-sm">
                        <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {type}
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
      <div className="py-10 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Support Our Causes</h2>
              <p className="text-lg text-gray-600">Make a difference with your contribution</p>
            </div>
            <Link 
              to="/donations" 
              className="px-6 py-3 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors duration-200 flex items-center gap-2">
              View All
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
          
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
              <CardSkeleton count={3} />
            </div>
          ) : donations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No campaigns available</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
              {donations.map((donation) => (
                <DonationHomeCard key={donation.id} donation={donation} formatAmount={formatAmount} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Office Hours & Stay Connected */}
      <div className="py-10 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Office Hours */}
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
              <div className="flex items-start gap-3 mb-4">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-blue-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Office Hours</h3>
                  <p className="text-gray-700 leading-relaxed">
                    Mondays to Fridays: 8:00 AM to 5:00 PM (We observe Noon Break)
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 pt-4 border-t border-gray-100">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-blue-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Location</h3>
                  <p className="text-gray-700 leading-relaxed">
                    G/F, L-Shaped Building, La Consolacion College Bacolod, Corner Galo-Gatuslao Streets, Bacolod City 6100
                  </p>
                </div>
              </div>
            </div>

            {/* Stay Connected */}
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
              <div className="flex items-start gap-3 mb-6">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-blue-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Stay Connected</h3>
                  <p className="text-gray-600 text-sm">
                    Follow us on social media for the latest updates, news, and alumni stories.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <a href="https://facebook.com/lccb.alumni" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-50 transition-all duration-200 group">
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-600 transition-colors duration-200">
                    <svg className="w-5 h-5 text-blue-600 group-hover:text-white transition-colors duration-200" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </div>
                  <span className="font-medium text-gray-700 group-hover:text-blue-900 transition-colors duration-200">Facebook</span>
                </a>
                <a href="https://instagram.com/lccb.alumni" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg hover:bg-pink-50 transition-all duration-200 group">
                  <div className="flex-shrink-0 w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center group-hover:bg-gradient-to-br group-hover:from-purple-600 group-hover:to-pink-600 transition-all duration-200">
                    <svg className="w-5 h-5 text-pink-600 group-hover:text-white transition-colors duration-200" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z" />
                    </svg>
                  </div>
                  <span className="font-medium text-gray-700 group-hover:text-pink-900 transition-colors duration-200">Instagram</span>
                </a>
                <a href="https://youtube.com/@lccbalumni" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg hover:bg-red-50 transition-all duration-200 group">
                  <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center group-hover:bg-red-600 transition-colors duration-200">
                    <svg className="w-5 h-5 text-red-600 group-hover:text-white transition-colors duration-200" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                  </div>
                  <span className="font-medium text-gray-700 group-hover:text-red-900 transition-colors duration-200">YouTube</span>
                </a>
                <a href="https://maps.google.com/?q=La+Consolacion+College+Bacolod" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg hover:bg-green-50 transition-all duration-200 group">
                  <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-600 transition-colors duration-200">
                    <svg className="w-5 h-5 text-green-600 group-hover:text-white transition-colors duration-200" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C7.802 0 4 3.403 4 7.602C4 11.8 7.469 16.812 12 24C16.531 16.812 20 11.8 20 7.602C20 3.403 16.199 0 12 0zm0 11c-1.657 0-3-1.343-3-3s1.343-3 3-3 3 1.343 3 3-1.343 3-3 3z"/>
                    </svg>
                  </div>
                  <span className="font-medium text-gray-700 group-hover:text-green-900 transition-colors duration-200">Google Map</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action - Professional Footer Style */}
      <div className="bg-blue-900 text-white py-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12">
            {/* About Section */}
            <div className="col-span-1">
              <h3 className="text-2xl font-bold mb-4 text-white">LCCB Alumni</h3>
              <p className="text-gray-300 text-sm leading-relaxed">
                Building bridges between graduates, fostering professional growth, and strengthening our community through meaningful connections and opportunities.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-lg font-semibold mb-4 text-white">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <button onClick={() => navigate('/alumni')} className="text-gray-300 hover:text-blue-400 transition-colors">
                    Alumni Directory
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/events')} className="text-gray-300 hover:text-blue-400 transition-colors">
                    Events Calendar
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/employment')} className="text-gray-300 hover:text-blue-400 transition-colors">
                    Career Opportunities
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/donations')} className="text-gray-300 hover:text-blue-400 transition-colors">
                    Support LCCB
                  </button>
                </li>
              </ul>
            </div>

            {/* Get Involved */}
            <div>
              <h4 className="text-lg font-semibold mb-4 text-white">Get Involved</h4>
              <ul className="space-y-2 text-sm">
                <li className="text-gray-300 flex items-start">
                  <svg className="w-4 h-4 mr-2 mt-0.5 text-blue-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Network with fellow graduates
                </li>
                <li className="text-gray-300 flex items-start">
                  <svg className="w-4 h-4 mr-2 mt-0.5 text-blue-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Attend exclusive events
                </li>
                <li className="text-gray-300 flex items-start">
                  <svg className="w-4 h-4 mr-2 mt-0.5 text-blue-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Access career resources
                </li>
                <li className="text-gray-300 flex items-start">
                  <svg className="w-4 h-4 mr-2 mt-0.5 text-blue-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Contribute to the community
                </li>
              </ul>
            </div>

            {/* Join Now CTA */}
            <div>
              <h4 className="text-lg font-semibold mb-4 text-white">Join Our Network</h4>
              <p className="text-gray-300 text-sm mb-4">
                Become part of our growing alumni community today.
              </p>
              <button 
                onClick={() => navigate('/register')}
                className="w-full px-6 py-3 bg-white text-blue-900 rounded-lg font-semibold hover:bg-gray-100 transition-colors mb-3"
              >
                Register Now
              </button>
              <button 
                onClick={() => navigate('/login')}
                className="w-full px-6 py-3 border border-gray-600 text-gray-300 rounded-lg font-semibold hover:border-blue-400 hover:text-blue-400 transition-colors"
              >
                Sign In
              </button>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-blue-800 mt-12 pt-8 text-center">
            <p className="text-gray-300 text-sm">
              © {new Date().getFullYear()} LCCB Alumni Association. All rights reserved.
            </p>
          </div>
        </div>
      </div>

      </div>
    </UserLayout>
  );
};

export default Home;

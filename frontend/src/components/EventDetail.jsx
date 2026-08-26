import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import eventService from '../services/eventService';
import { authService } from '../services/authService';
import { API_BASE_URL, IMAGE_BASE_URL } from '../config/apiBaseUrl';
import { toast } from 'react-toastify';
import ConfirmModal from './ConfirmModal';

const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = authService.getCurrentUser();
  const isTeacher = authService.isTeacher();
  const isAlumni = authService.isAlumni();
  const [event, setEvent] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [isAttending, setIsAttending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [gallery, setGallery] = useState([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [showLightbox, setShowLightbox] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const getAvatarFallbackUrl = (alumni) => {
    const name = `${alumni?.first_name || ''} ${alumni?.last_name || ''}`.trim() || 'User';
    // deterministic background based on name hash (simple)
    const colors = ['007bff','6f42c1','e83e8c','fd7e14','28a745','17a2b8','6610f2','20c997'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    const color = colors[Math.abs(hash) % colors.length];
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${color}&color=fff&rounded=true&size=128`;
  };

  const getProfileImageSrc = (alumni) => {
    const img = alumni?.profile_image;
    if (!img) return getAvatarFallbackUrl(alumni);
    return img.startsWith('/') ? `${IMAGE_BASE_URL}${img}` : img;
  };

  useEffect(() => {
    loadEventDetails();
  }, [id]);

  const loadEventDetails = async () => {
    try {
      setLoading(true);
      
      // Validate ID
      if (!id || isNaN(Number(id))) {
        console.error('Invalid event ID:', id);
        navigate('/events');
        return;
      }
      
      const eventData = await eventService.getEventById(id);
      
      if (!eventData) {
        console.error('Event not found');
        navigate('/events');
        return;
      }
      
      setEvent(eventData);

      const attendeesData = await eventService.getEventAttendees(id);
      setAttendees(attendeesData);

      // Load gallery photos
      const galleryData = await eventService.getEventGallery(id);
      setGallery(galleryData);

      // Check if current user is attending (if they have an alumni record)
      if (user) {
        // Get user's alumni ID from their profile
        const alumniId = user.alumni?.id;
        if (alumniId) {
          const { isAttending: attending } = await eventService.checkAttendance(id, alumniId);
          setIsAttending(attending);
        }
      }
    } catch (error) {
      console.error('Error loading event details:', error);
      toast.error('Failed to load event. Redirecting to events page...');
      navigate('/events');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinEvent = async () => {
    try {
      const alumniId = user.alumni?.id;
      if (!alumniId) {
        toast.warning('You need to complete your alumni profile first');
        return;
      }

      await eventService.joinEvent(id, alumniId);
      setIsAttending(true);
      loadEventDetails(); // Reload to update attendee count
    } catch (error) {
      console.error('Error joining event:', error);
      toast.error(error.response?.data?.error || 'Failed to join event');
    }
  };

  const handleLeaveEvent = async () => {
    // Open a confirmation modal instead of native confirm
    setLeaveConfirm({ isOpen: true });
  };

  // Leave confirmation modal state
  const [leaveConfirm, setLeaveConfirm] = useState({ isOpen: false });

  const performLeaveConfirmed = async () => {
    setLeaveConfirm({ isOpen: false });
    try {
      const alumniId = user.alumni?.id;
      await eventService.leaveEvent(id, alumniId);
      setIsAttending(false);
      loadEventDetails(); // Reload to update attendee count
      toast.success('You have left the event');
    } catch (error) {
      console.error('Error leaving event:', error);
      toast.error(error.response?.data?.error || 'Failed to leave event');
    }
  };

  const isEventPast = () => {
    if (!event?.date) return false;
    const now = new Date();
    const todayKey = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const eventDate = new Date(event.date);
    const eventKey = Date.UTC(eventDate.getUTCFullYear(), eventDate.getUTCMonth(), eventDate.getUTCDate());
    return eventKey < todayKey;
  };

  const daysUntilEvent = () => {
    if (!event?.date) return null;
    const now = new Date();
    const todayKey = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const eventDate = new Date(event.date);
    const eventKey = Date.UTC(eventDate.getUTCFullYear(), eventDate.getUTCMonth(), eventDate.getUTCDate());
    const diff = Math.round((eventKey - todayKey) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getStatusBadge = () => {
    if (isEventPast()) return { label: 'Completed', color: 'bg-gray-700 text-white' };
    const days = daysUntilEvent();
    if (days === null) return { label: 'Unknown', color: 'bg-gray-400 text-white' };
    if (days <= 0) return { label: 'Happening Today', color: 'bg-amber-500 text-white' };
    if (days <= 7) return { label: `In ${days} days`, color: 'bg-orange-500 text-white' };
    return { label: 'Upcoming', color: 'bg-green-600 text-white' };
  };

  const canUploadGallery = isEventPast() && (isTeacher || isAlumni);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
  };

  const handleUploadPhotos = async () => {
    if (selectedFiles.length === 0) {
      toast.warning('Please select photos to upload');
      return;
    }

    try {
      setUploadingPhotos(true);
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('images', file);
      });
      // Don't send uploaded_by - let backend handle it or leave it null

      await eventService.addGalleryPhotos(id, formData);
      toast.success('Photos uploaded successfully!');
      setSelectedFiles([]);
      loadEventDetails();
    } catch (error) {
      console.error('Error uploading photos:', error);
      toast.error('Failed to upload photos');
    } finally {
      setUploadingPhotos(false);
    }
  };

  const handleDeletePhoto = async (photoId) => {
    // Open confirmation modal instead (handled via state below)
    setConfirmPhotoId(photoId);
    setShowConfirm(true);
  };

  // Modal state and confirm handler
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmPhotoId, setConfirmPhotoId] = useState(null);

  const performDeleteConfirmed = async () => {
    const photoId = confirmPhotoId;
    setShowConfirm(false);
    setConfirmPhotoId(null);
    if (!photoId) return;
    try {
      await eventService.deleteGalleryPhoto(id, photoId);
      setGallery(prev => prev.filter(p => p.id !== photoId));
      toast.success('Photo deleted successfully');
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast.error('Failed to delete photo');
    }
  };

  const openLightbox = (index) => {
    setLightboxIndex(index);
    setShowLightbox(true);
  };

  const closeLightbox = () => {
    setShowLightbox(false);
  };

  const nextPhoto = () => {
    setLightboxIndex((prev) => (prev + 1) % gallery.length);
  };

  const prevPhoto = () => {
    setLightboxIndex((prev) => (prev - 1 + gallery.length) % gallery.length);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading event details...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Event not found</p>
          <button onClick={() => navigate('/events')} className="mt-4 text-blue-900 hover:underline">
            Back to Events
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50">
      <style>{`.event-details-card svg{width:28px;height:28px} .event-details-card .card-icon{width:48px;height:48px} `}</style>
      {/* Hero Section with Image */}
      {event.image && (
        <div className="relative h-[420px] md:h-[520px] w-full overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/60"></div>
          <img
            src={`${IMAGE_BASE_URL}${event.image}`}
            alt={event.name}
            className="w-full h-full object-cover"
          />
          
          {/* Back Button - Floating */}
          <button
            onClick={() => navigate('/events')}
            className="absolute top-5 left-5 flex items-center gap-2 px-3.5 py-2 bg-white/95 backdrop-blur-sm text-gray-800 rounded-md hover:bg-white shadow-lg transition-all hover:scale-105"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-medium">Back to Events</span>
          </button>

          {/* Event Title Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-5 md:p-8">
            <div className="w-full px-4">
              <div className="bg-gradient-to-r from-black/40 to-black/20 backdrop-blur-md rounded-xl p-4 md:p-6 border border-white/10">
                <h1 className="text-2xl md:text-4xl font-extrabold text-white mb-2 drop-shadow-lg">
                  {event.name}
                </h1>
                <div className="flex flex-wrap items-center gap-3 md:gap-4 text-white/90">
                  <div className="flex items-center gap-2 bg-white/20 rounded-md px-3 py-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span className="text-sm font-semibold">{attendees.length} Interested</span>
                  </div>
                  {event.date && (
                    <div className="flex items-center gap-2 bg-white/20 rounded-md px-3 py-1.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm font-medium">
                        {new Date(event.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  )}
                  {event.location && (
                    <div className="flex items-center gap-2 bg-white/20 rounded-md px-3 py-1.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-sm font-medium">{event.location}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

        <ConfirmModal
          isOpen={showConfirm}
          onClose={() => { setShowConfirm(false); setConfirmPhotoId(null); }}
          onConfirm={performDeleteConfirmed}
          title="Delete Photo"
          message="Are you sure you want to delete this photo? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
        />

        <ConfirmModal
          isOpen={leaveConfirm.isOpen}
          onClose={() => setLeaveConfirm({ isOpen: false })}
          onConfirm={performLeaveConfirmed}
          title="Leave Event"
          message="Are you sure you want to leave this event? You can always rejoin later if you change your mind."
          confirmText="Leave"
          cancelText="Cancel"
          type="danger"
        />

      {/* Content Section */}
      <div className="w-full px-4 py-6 md:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Content - Left Column */}
          <div className="lg:col-span-8 space-y-6">
            {/* Event Details Card */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
              <div className="bg-blue-600 px-5 py-3">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Event Details
                </h2>
              </div>
              <div className="p-5 md:p-6">
                {/* Date and Location Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {event.date && (
                    <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
                      <div className="p-2.5 bg-blue-600 rounded-lg text-white">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-wide mb-1">Date & Time</p>
                        <p className="text-sm font-bold text-gray-900">
                          {new Date(event.date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  )}

                  {event.location && (
                    <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
                      <div className="p-2.5 bg-blue-600 rounded-lg text-white">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-wide mb-1">Location</p>
                        <p className="text-sm font-bold text-gray-900">{event.location}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Description */}
                {event.description && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      About This Event
                    </h3>
                    <div className="prose max-w-none">
                      <p className="text-sm md:text-[15px] text-gray-700 leading-7 whitespace-pre-wrap">{event.description}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Attendees Section */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
              <div className="bg-blue-600 px-5 py-3">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  People Interested ({attendees.length})
                </h2>
              </div>
              <div className="p-5 md:p-6">
                {attendees.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {attendees.map((attendance) => (
                      <div 
                        key={attendance.id} 
                        className="flex flex-col items-center p-3.5 bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg hover:shadow-lg transition-all hover:scale-105 border border-gray-100"
                      >
                        <img
                          src={getProfileImageSrc(attendance.alumni)}
                          alt={`${attendance.alumni.first_name} ${attendance.alumni.last_name}`}
                          onError={(e) => { e.currentTarget.src = getAvatarFallbackUrl(attendance.alumni); }}
                          className="w-14 h-14 rounded-full object-cover mb-2.5 ring-4 ring-white shadow-md"
                        />
                        <p className="text-xs font-bold text-gray-900 text-center">
                          {attendance.alumni?.first_name} {attendance.alumni?.last_name}
                        </p>
                        {attendance.alumni?.course && (
                          <p className="text-[11px] text-gray-600 text-center mt-1">{attendance.alumni.course}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg border-2 border-dashed border-gray-300">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p className="text-base font-semibold text-gray-900 mb-2">No one has joined yet</p>
                    <p className="text-sm text-gray-600">Be the first to show interest in this event!</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar - Right Column */}
          <div className="lg:col-span-4">
            <div className="space-y-6">
              {/* Action Card */}
              {user && ((user?.role || '').toUpperCase() !== 'TEACHER' || isAlumni) && !isEventPast() && (
                <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
                  <div className="bg-blue-600 px-5 py-3">
                    <h3 className="text-lg font-bold text-white">Join This Event</h3>
                  </div>
                  <div className="p-5">
                    {isAttending ? (
                      <>
                        <div className="flex items-center gap-3 p-3.5 bg-green-50 border border-green-200 rounded-lg mb-4">
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-sm font-semibold text-green-800">You're attending!</span>
                        </div>
                        <button
                          onClick={handleLeaveEvent}
                          className="app-danger-button w-full px-5 py-2.5 text-sm"
                        >
                          Leave Event
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-gray-600 mb-4">
                          Register your interest and stay updated about this event.
                        </p>
                        <button
                          onClick={handleJoinEvent}
                          className="app-primary-button w-full px-5 py-3 text-sm"
                        >
                          <span className="flex items-center justify-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Join Event
                          </span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Quick Info Card */}
              <div className="bg-blue-600 rounded-xl shadow-lg overflow-hidden text-white p-5">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Event Status
                  </h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge().color}`}>
                    {getStatusBadge().label}
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-white/10 rounded-md backdrop-blur-sm">
                    <svg className="w-5 h-5 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <div className="flex-1 text-sm">
                      <div className="text-[13px] text-white/90">{event.date ? new Date(event.date).toLocaleString() : 'TBA'}</div>
                      <div className="text-[12px] text-white/70">{event.location || 'Location not specified'}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/10 rounded-md backdrop-blur-sm">
                    <div className="text-sm">Attendees</div>
                    <div className="text-sm font-bold">{attendees.length}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Gallery Section - Only for Past Events */}
        {isEventPast() && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 mt-6">
            <div className="bg-blue-600 px-5 py-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Event Gallery
                </h2>
                {gallery.length > 0 && (
                  <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-md text-xs font-semibold text-white">
                    {gallery.length} {gallery.length === 1 ? 'Photo' : 'Photos'}
                  </span>
                )}
              </div>
            </div>

            <div className="p-5 md:p-6">
              {/* Upload Section - Staff/Alumni for previous events */}
              {canUploadGallery && (
                <div className="mb-6 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-dashed border-blue-300">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-blue-600 rounded-md">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <h3 className="text-base font-bold text-gray-900">Upload Event Photos</h3>
                  </div>
                  <div className="space-y-4">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:shadow-lg file:cursor-pointer transition-all"
                    />
                    {selectedFiles.length > 0 && (
                      <div className="flex items-center gap-2 text-sm text-gray-700 bg-white p-3 rounded-md">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-semibold">
                          {selectedFiles.length} {selectedFiles.length === 1 ? 'file' : 'files'} selected
                        </span>
                      </div>
                    )}
                    <button
                      onClick={handleUploadPhotos}
                      disabled={uploadingPhotos || selectedFiles.length === 0}
                      className="w-full px-5 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none"
                    >
                      {uploadingPhotos ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Uploading...
                        </span>
                      ) : (
                        'Upload Photos'
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Gallery Grid */}
              {gallery.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {gallery.map((photo, index) => (
                    <div key={photo.id} className="relative group">
                      <div 
                        className="aspect-square overflow-hidden rounded-lg cursor-pointer shadow-md hover:shadow-2xl transition-all border-2 border-transparent hover:border-blue-400"
                        onClick={() => openLightbox(index)}
                      >
                        <img
                          src={`${IMAGE_BASE_URL}${photo.image}`}
                          alt={`Gallery ${index + 1}`}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      </div>
                      {(isTeacher || (isAlumni && Number(user?.id || user?.userId || user?.user_id || 0) > 0 && Number(photo.uploaded_by || photo.user?.id || 0) === Number(user?.id || user?.userId || user?.user_id || 0))) && (
                        <button
                          onClick={() => handleDeletePhoto(photo.id)}
                          className="absolute top-3 right-3 p-2 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-red-700 shadow-lg hover:scale-110"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl border-2 border-dashed border-gray-300">
                  <div className="max-w-xs mx-auto">
                    <div className="bg-gradient-to-br from-blue-100 to-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-base font-bold text-gray-900 mb-2">No photos yet</p>
                    <p className="text-sm text-gray-600">
                      {canUploadGallery
                        ? "Upload some memorable moments from this event to share with everyone!"
                        : "Check back soon for photos from this event!"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Lightbox */}
        {showLightbox && gallery.length > 0 && (
          <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
            <button
              onClick={closeLightbox}
              className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10"
            >
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            {gallery.length > 1 && (
              <>
                <button
                  onClick={prevPhoto}
                  className="absolute left-4 text-white hover:text-gray-300 transition-colors"
                >
                  <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={nextPhoto}
                  className="absolute right-4 text-white hover:text-gray-300 transition-colors"
                >
                  <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}

            <img
              src={`${IMAGE_BASE_URL}${gallery[lightboxIndex].image}`}
              alt={`Gallery ${lightboxIndex + 1}`}
              className="max-w-full max-h-full object-contain"
            />
            
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm">
              {lightboxIndex + 1} / {gallery.length}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventDetail;

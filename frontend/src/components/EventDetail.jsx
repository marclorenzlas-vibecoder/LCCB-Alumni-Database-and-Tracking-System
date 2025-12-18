import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import eventService from '../services/eventService';
import { authService } from '../services/authService';

const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = authService.getCurrentUser();
  const isTeacher = authService.isTeacher();
  const [event, setEvent] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [isAttending, setIsAttending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [gallery, setGallery] = useState([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [showLightbox, setShowLightbox] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    loadEventDetails();
    window.scrollTo(0, 0); // Scroll to top when component loads
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
      alert('Failed to load event. Redirecting to events page...');
      navigate('/events');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinEvent = async () => {
    try {
      const alumniId = user.alumni?.id;
      if (!alumniId) {
        alert('You need to complete your alumni profile first');
        return;
      }

      await eventService.joinEvent(id, alumniId);
      setIsAttending(true);
      loadEventDetails(); // Reload to update attendee count
    } catch (error) {
      console.error('Error joining event:', error);
      alert(error.response?.data?.error || 'Failed to join event');
    }
  };

  const handleLeaveEvent = async () => {
    // Confirm before leaving
    const confirmed = window.confirm(
      'Are you sure you want to leave this event? You can always rejoin later if you change your mind.'
    );
    
    if (!confirmed) return;

    try {
      const alumniId = user.alumni?.id;
      await eventService.leaveEvent(id, alumniId);
      setIsAttending(false);
      loadEventDetails(); // Reload to update attendee count
    } catch (error) {
      console.error('Error leaving event:', error);
      alert(error.response?.data?.error || 'Failed to leave event');
    }
  };

  const isEventPast = () => {
    if (!event?.date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDate = new Date(event.date);
    eventDate.setHours(0, 0, 0, 0);
    return eventDate < today;
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
  };

  const handleUploadPhotos = async () => {
    if (selectedFiles.length === 0) {
      alert('Please select photos to upload');
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
      alert('Photos uploaded successfully!');
      setSelectedFiles([]);
      loadEventDetails();
    } catch (error) {
      console.error('Error uploading photos:', error);
      alert('Failed to upload photos');
    } finally {
      setUploadingPhotos(false);
    }
  };

  const handleDeletePhoto = async (photoId) => {
    if (!window.confirm('Are you sure you want to delete this photo?')) return;

    try {
      await eventService.deleteGalleryPhoto(id, photoId);
      setGallery(prev => prev.filter(p => p.id !== photoId));
      alert('Photo deleted successfully');
    } catch (error) {
      console.error('Error deleting photo:', error);
      alert('Failed to delete photo');
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
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
          <button onClick={() => navigate('/events')} className="mt-4 text-blue-600 hover:underline">
            Back to Events
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        {/* Back Button */}
        <button
          onClick={() => navigate('/events')}
          className="mb-6 flex items-center text-gray-600 hover:text-gray-900"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Events
        </button>

        {/* Event Header */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
          {/* Event Image */}
          {event.image && (
            <div className="w-full h-96 bg-gray-200">
              <img
                src={`http://localhost:5001${event.image}`}
                alt={event.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="p-8">
            {/* Event Title and Join Button */}
            <div className="flex justify-between items-start mb-6">
              <div className="flex-1">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">{event.name}</h1>
                <div className="flex items-center gap-4 text-gray-600">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span className="font-semibold">{attendees.length} people interested</span>
                  </div>
                </div>
              </div>

              {/* Join/Leave Button */}
              {user && user.role !== 'TEACHER' && (
                <div className="ml-4">
                  {isAttending ? (
                    <button
                      onClick={handleLeaveEvent}
                      className="px-6 py-3 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-semibold border border-red-300"
                      title="Click to leave this event"
                    >
                      Leave Event
                    </button>
                  ) : (
                    <button
                      onClick={handleJoinEvent}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                    >
                      Join Event
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Event Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Date */}
              {event.date && (
                <div className="flex items-start">
                  <svg className="w-6 h-6 text-blue-600 mr-3 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <div>
                    <p className="text-sm text-gray-500">Date</p>
                    <p className="text-lg font-semibold text-gray-900">
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

              {/* Location */}
              {event.location && (
                <div className="flex items-start">
                  <svg className="w-6 h-6 text-blue-600 mr-3 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div>
                    <p className="text-sm text-gray-500">Location</p>
                    <p className="text-lg font-semibold text-gray-900">{event.location}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            {event.description && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">About This Event</h2>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{event.description}</p>
              </div>
            )}

            {/* Attendees Section */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                People Interested ({attendees.length})
              </h2>
              
              {attendees.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {attendees.map((attendance) => (
                    <div key={attendance.id} className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
                      {attendance.alumni?.profile_image ? (
                        <img
                          src={`http://localhost:5001${attendance.alumni.profile_image}`}
                          alt={`${attendance.alumni.first_name} ${attendance.alumni.last_name}`}
                          className="w-16 h-16 rounded-full object-cover mb-2"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xl mb-2">
                          {attendance.alumni?.first_name?.charAt(0)}{attendance.alumni?.last_name?.charAt(0)}
                        </div>
                      )}
                      <p className="text-sm font-semibold text-gray-900 text-center">
                        {attendance.alumni?.first_name} {attendance.alumni?.last_name}
                      </p>
                      {attendance.alumni?.course && (
                        <p className="text-xs text-gray-500 text-center">{attendance.alumni.course}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="text-gray-500">No one has joined yet. Be the first!</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Gallery Section - Only for Past Events */}
        {isEventPast() && (
          <div className="bg-white rounded-lg shadow-lg p-8 mt-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Event Gallery</h2>
              {gallery.length > 0 && (
                <span className="text-sm text-gray-500">
                  {gallery.length} {gallery.length === 1 ? 'photo' : 'photos'}
                </span>
              )}
            </div>

            {/* Upload Section - Admin/Teacher Only */}
            {isTeacher && (
              <div className="mb-8 p-6 bg-blue-50 rounded-lg border-2 border-dashed border-blue-300">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Event Photos</h3>
                <div className="space-y-4">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                  />
                  {selectedFiles.length > 0 && (
                    <div className="text-sm text-gray-600">
                      {selectedFiles.length} {selectedFiles.length === 1 ? 'file' : 'files'} selected
                    </div>
                  )}
                  <button
                    onClick={handleUploadPhotos}
                    disabled={uploadingPhotos || selectedFiles.length === 0}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {uploadingPhotos ? 'Uploading...' : 'Upload Photos'}
                  </button>
                </div>
              </div>
            )}

            {/* Gallery Grid */}
            {gallery.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {gallery.map((photo, index) => (
                  <div key={photo.id} className="relative group">
                    <div 
                      className="aspect-square overflow-hidden rounded-lg cursor-pointer"
                      onClick={() => openLightbox(index)}
                    >
                      <img
                        src={`http://localhost:5001${photo.image}`}
                        alt={`Gallery ${index + 1}`}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                    {isTeacher && (
                      <button
                        onClick={() => handleDeletePhoto(photo.id)}
                        className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
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
              <div className="text-center py-12 text-gray-500">
                <svg className="h-16 w-16 mx-auto mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-lg font-medium">No photos yet</p>
                {isTeacher && <p className="text-sm mt-2">Upload some memorable moments from this event!</p>}
              </div>
            )}
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
              src={`http://localhost:5001${gallery[lightboxIndex].image}`}
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

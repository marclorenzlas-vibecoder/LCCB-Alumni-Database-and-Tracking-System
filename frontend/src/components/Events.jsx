import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import eventService from '../services/eventService';
import ConfirmModal from './ConfirmModal';
import { authService } from '../services/authService';

const Events = () => {
  const navigate = useNavigate();
  // Role
  const isTeacher = authService.isTeacher();

  // State for events from database
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newEvent, setNewEvent] = useState({ name: '', description: '', date: '', location: '', image: null, sendNotification: false });

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    type: 'danger'
  });

  // Load events from database
  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const eventsData = await eventService.getAllEvents();
      setEvents(eventsData);
    } catch (err) {
      console.error('Error loading events:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'image') {
      setNewEvent(prev => ({ ...prev, image: files[0] }));
    } else {
      setNewEvent(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleAddEvent = async (e) => {
    e.preventDefault();
    try {
      let payload = newEvent;
      
      // If image present, send as FormData
      if (newEvent.image) {
        const fd = new FormData();
        fd.append('name', newEvent.name);
        if (newEvent.description) fd.append('description', newEvent.description);
        if (newEvent.date) fd.append('date', newEvent.date);
        if (newEvent.location) fd.append('location', newEvent.location);
        fd.append('sendNotification', newEvent.sendNotification ? 'true' : 'false');
        fd.append('image', newEvent.image);
        payload = fd;
      }
      
      if (editingId) {
        // Update existing event
        const updated = await eventService.updateEvent(editingId, payload);
        setEvents(prev => prev.map(ev => ev.id === editingId ? updated : ev));
        alert('Event updated successfully!');
      } else {
        // Create new event
        const event = await eventService.createEvent(payload);
        setEvents(prev => [...prev, event]);
        alert('Event added successfully!');
      }
      setShowEventModal(false);
      setEditingId(null);
      setNewEvent({ name: '', description: '', date: '', location: '', image: null, sendNotification: false });
    } catch (err) {
      console.error('Error saving event:', err);
      const msg = err?.response?.data?.error || 'Failed to save event. Please try again.';
      alert(msg);
    }
  };

  const handleEditEvent = (event) => {
    setEditingId(event.id);
    setNewEvent({
      name: event.name || '',
      description: event.description || '',
      date: event.date ? event.date.split('T')[0] : '',
      location: event.location || '',
      image: null
    });
    setShowEventModal(true);
  };

  const handleDeleteEvent = (id) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Event',
      message: 'Are you sure you want to delete this event? This action cannot be undone.',
      type: 'danger',
      onConfirm: async () => {
        try {
          await eventService.deleteEvent(id);
          setEvents(prev => prev.filter(e => e.id !== id));
          setConfirmModal({ ...confirmModal, isOpen: false });
        } catch (err) {
          console.error('Error deleting event:', err);
          alert('Failed to delete event. Please try again.');
          setConfirmModal({ ...confirmModal, isOpen: false });
        }
      }
    });
  };

  // 📅 STATIC EVENTS LIST (keeping for fallback)
  const staticEvents = [
    {
      id: '1',
      name: 'Annual Alumni Reunion 2024',
      date: 'March 15, 2024',
      time: '6:00 PM - 11:00 PM',
      location: 'Manila Hotel, Manila',
      description: 'Join us for our biggest annual reunion! Celebrate with fellow alumni, enjoy dinner, networking, and special performances. This is the perfect opportunity to reconnect with old friends and make new connections.',
      type: 'Reunion',
      attendees: 150,
      maxAttendees: 200,
      price: '₱2,500',
      image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=400&h=250&fit=crop',
      status: 'upcoming',
      organizer: 'LCCB Alumni Association',
      tags: ['Networking', 'Dinner', 'Entertainment']
    },
    {
      id: '2',
      name: 'Tech Career Workshop',
      date: 'February 28, 2024',
      time: '2:00 PM - 5:00 PM',
      location: 'Online Webinar',
      description: 'Learn career growth strategies from successful tech alumni. Topics include: resume building, interview preparation, salary negotiation, and career advancement in the tech industry.',
      type: 'Workshop',
      attendees: 75,
      maxAttendees: 100,
      price: 'Free',
      image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=250&fit=crop',
      status: 'upcoming',
      organizer: 'Tech Alumni Group',
      tags: ['Career', 'Technology', 'Online']
    },
    {
      id: '3',
      name: 'Business Networking Mixer',
      date: 'February 10, 2024',
      time: '7:00 PM - 10:00 PM',
      location: 'Makati City, Taguig',
      description: 'Connect with business professionals and entrepreneurs. Perfect for those looking to expand their professional network, find business partners, or explore new opportunities.',
      type: 'Networking',
      attendees: 60,
      maxAttendees: 80,
      price: '₱1,500',
      image: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=400&h=250&fit=crop',
      status: 'upcoming',
      organizer: 'Business Alumni Network',
      tags: ['Networking', 'Business', 'Entrepreneurship']
    },
    {
      id: '4',
      name: 'Engineering Innovation Summit',
      date: 'January 25, 2024',
      time: '9:00 AM - 4:00 PM',
      location: 'Engineering Conference Center',
      description: 'Explore the latest trends in engineering and innovation. Featuring keynote speakers, panel discussions, and hands-on workshops on emerging technologies.',
      type: 'Conference',
      attendees: 120,
      maxAttendees: 150,
      price: '₱3,000',
      image: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=250&fit=crop',
      status: 'upcoming',
      organizer: 'Engineering Alumni Society',
      tags: ['Engineering', 'Innovation', 'Technology']
    },
    {
      id: '5',
      name: 'Alumni Sports Day',
      date: 'January 20, 2024',
      time: '8:00 AM - 6:00 PM',
      location: 'LCCB Sports Complex',
      description: 'Join us for a fun-filled day of sports and activities! Basketball, volleyball, badminton, and more. Open to all alumni and their families. Food and drinks will be provided.',
      type: 'Sports',
      attendees: 45,
      maxAttendees: 100,
      price: '₱500',
      image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=250&fit=crop',
      status: 'upcoming',
      organizer: 'Sports Alumni Club',
      tags: ['Sports', 'Family', 'Fun']
    },
    {
      id: '6',
      name: 'Startup Pitch Competition',
      date: 'December 15, 2023',
      time: '1:00 PM - 6:00 PM',
      location: 'Innovation Hub, BGC',
      description: 'Watch alumni entrepreneurs pitch their innovative business ideas to a panel of judges. Great opportunity to discover new startups and investment opportunities.',
      type: 'Competition',
      attendees: 85,
      maxAttendees: 100,
      price: '₱1,000',
      image: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=400&h=250&fit=crop',
      status: 'past',
      organizer: 'Entrepreneurship Alumni',
      tags: ['Startup', 'Pitch', 'Investment']
    }
  ];

  // State for filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [isPastEventsExpanded, setIsPastEventsExpanded] = useState(false);

  // Get unique event types (filter out empty/undefined to avoid key warnings)
  const eventTypes = [...new Set(events.map(event => event.type).filter(Boolean))];

  // Categorize events by time
  const categorizeEvents = () => {
    return events.reduce((acc, event) => {
      // Use backend status field
      const status = event.status || 'UPCOMING';
      
      if (status === 'PREVIOUS') {
        acc.past.push(event);
      } else if (status === 'CURRENT') {
        acc.current.push(event);
      } else {
        acc.upcoming.push(event);
      }
      
      return acc;
    }, { past: [], current: [], upcoming: [] });
  };

  const categorizedEvents = categorizeEvents();

  // Filter and sort events
  const filteredEvents = useMemo(() => {
    let filtered = events.filter(event => {
      const matchesSearch = 
        event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (event.description && event.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (event.location && event.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (event.tags && event.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())));
      
      const matchesType = selectedType === '' || event.type === selectedType;
      
      // Filter by status category
      if (selectedStatus !== 'all') {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const eventDate = new Date(event.date);
        const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
        
        if (selectedStatus === 'past' && eventDay >= today) return false;
        if (selectedStatus === 'current' && eventDay.getTime() !== today.getTime()) return false;
        if (selectedStatus === 'upcoming' && eventDay <= today) return false;
      }
      
      return matchesSearch && matchesType;
    });

    // Sort the filtered results
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(a.date) - new Date(b.date);
        case 'name':
          return a.name.localeCompare(b.name);
        case 'attendees':
          return (b.attendees || 0) - (a.attendees || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [searchTerm, selectedType, selectedStatus, sortBy, events]);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedType('');
    setSelectedStatus('all');
    setSortBy('date');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'upcoming':
        return 'bg-green-100 text-green-800';
      case 'past':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'Reunion':
        return 'bg-blue-100 text-blue-800';
      case 'Workshop':
        return 'bg-green-100 text-green-800';
      case 'Networking':
        return 'bg-purple-100 text-purple-800';
      case 'Conference':
        return 'bg-orange-100 text-orange-800';
      case 'Sports':
        return 'bg-pink-100 text-pink-800';
      case 'Competition':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText="Delete"
        cancelText="Cancel"
      />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
            <div className="text-center sm:text-left">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Alumni Events</h1>
              <p className="text-lg text-gray-600">
                Stay connected with our vibrant alumni community through exciting events, workshops, and networking opportunities.
              </p>
            </div>
            {isTeacher && (
              <button
                onClick={() => setShowEventModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add New Event
              </button>
            )}
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Search Bar */}
            <div className="lg:col-span-2">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                Search Events
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  id="search"
                  placeholder="Search by event name, description, or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Event Type Filter */}
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
                Event Type
              </label>
              <select
                id="type"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Types</option>
                {eventTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                id="status"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Events</option>
                <option value="upcoming">Upcoming</option>
                <option value="current">Happening Today</option>
                <option value="past">Past Events</option>
              </select>
            </div>
          </div>

          {/* Sort and Clear Filters */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <label htmlFor="sort" className="text-sm font-medium text-gray-700">
                Sort by:
              </label>
              <select
                id="sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="date">Date</option>
                <option value="name">Name</option>
                <option value="attendees">Attendees</option>
              </select>
            </div>
            
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Clear Filters
            </button>
          </div>

          {/* Results Count and Category Summary */}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-600">
            <div>Showing {filteredEvents.length} of {events.length} events</div>
            {selectedStatus === 'all' && (
              <div className="flex gap-4">
                <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full">
                  {categorizedEvents.upcoming.length} Upcoming
                </span>
                <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full">
                  {categorizedEvents.current.length} Today
                </span>
                <span className="px-3 py-1 bg-gray-50 text-gray-700 rounded-full">
                  {categorizedEvents.past.length} Previous
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Events Grid - Categorized */}
        {selectedStatus === 'all' ? (
          <div className="space-y-12">
            {/* Current Events (Happening Today) */}
            {categorizedEvents.current.length > 0 && (
              <div className="mb-12">
                <div className="flex items-center mb-6">
                  <div className="h-0.5 w-12 bg-green-500 mr-4"></div>
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                    <span className="mr-3">Current Events</span>
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                      {categorizedEvents.current.length}
                    </span>
                  </h2>
                  <svg className="h-6 w-6 text-green-600 ml-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categorizedEvents.current.filter(event => {
                    const matchesSearch = 
                      event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (event.description && event.description.toLowerCase().includes(searchTerm.toLowerCase()));
                    const matchesType = selectedType === '' || event.type === selectedType;
                    return matchesSearch && matchesType;
                  }).map((event) => (
                    <EventCard key={event.id} event={event} isTeacher={isTeacher} handleEditEvent={handleEditEvent} handleDeleteEvent={handleDeleteEvent} />
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Events */}
            {categorizedEvents.upcoming.length > 0 && (
              <div className="mb-12">
                <div className="flex items-center mb-6">
                  <div className="h-0.5 w-12 bg-blue-500 mr-4"></div>
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                    <span className="mr-3">Upcoming Events</span>
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
                      {categorizedEvents.upcoming.length}
                    </span>
                  </h2>
                  <svg className="h-6 w-6 text-blue-600 ml-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categorizedEvents.upcoming.filter(event => {
                    const matchesSearch = 
                      event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (event.description && event.description.toLowerCase().includes(searchTerm.toLowerCase()));
                    const matchesType = selectedType === '' || event.type === selectedType;
                    return matchesSearch && matchesType;
                  }).map((event) => (
                    <EventCard key={event.id} event={event} isTeacher={isTeacher} handleEditEvent={handleEditEvent} handleDeleteEvent={handleDeleteEvent} />
                  ))}
                </div>
              </div>
            )}

            {/* Past Events - Collapsible */}
            {categorizedEvents.past.length > 0 && (
              <div className="mb-12">
                <div 
                  className="flex items-center mb-6 cursor-pointer group"
                  onClick={() => setIsPastEventsExpanded(!isPastEventsExpanded)}
                >
                  <div className="h-0.5 w-12 bg-gray-400 mr-4"></div>
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                    <span className="mr-3">Previous Events</span>
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm font-medium rounded-full">
                      {categorizedEvents.past.length}
                    </span>
                  </h2>
                  <svg 
                    className={`h-6 w-6 text-gray-600 ml-3 transform transition-transform duration-300 ${isPastEventsExpanded ? 'rotate-180' : ''}`}
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                {isPastEventsExpanded && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fadeIn">
                    {categorizedEvents.past.filter(event => {
                      const matchesSearch = 
                        event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (event.description && event.description.toLowerCase().includes(searchTerm.toLowerCase()));
                      const matchesType = selectedType === '' || event.type === selectedType;
                      return matchesSearch && matchesType;
                    }).map((event) => (
                      <EventCard key={event.id} event={event} isTeacher={isTeacher} handleEditEvent={handleEditEvent} handleDeleteEvent={handleDeleteEvent} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Filtered Events Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => (
              <EventCard key={event.id} event={event} isTeacher={isTeacher} handleEditEvent={handleEditEvent} handleDeleteEvent={handleDeleteEvent} />
            ))}
          </div>
        )}
        
        {filteredEvents.length === 0 && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No events found</h3>
            <p className="mt-1 text-sm text-gray-500">Try adjusting your filters or search term.</p>
          </div>
        )}

        {/* Add/Edit Event Modal */}
        {showEventModal && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
                <h3 className="text-2xl font-semibold text-gray-900">
                  {editingId ? 'Edit Event' : 'Add New Event'}
                </h3>
              </div>
              
              <form onSubmit={handleAddEvent} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Event Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={newEvent.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter event name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={newEvent.description}
                    onChange={handleInputChange}
                    rows="4"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter event description"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      name="date"
                      value={newEvent.date}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location
                    </label>
                    <input
                      type="text"
                      name="location"
                      value={newEvent.location}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Event location"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Event Image
                  </label>
                  <input
                    type="file"
                    name="image"
                    accept="image/*"
                    onChange={handleInputChange}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {newEvent.image && (
                    <p className="mt-1 text-sm text-gray-500">
                      Selected: {newEvent.image.name}
                    </p>
                  )}
                </div>

                {/* Send Notification Checkbox */}
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      type="checkbox"
                      id="sendNotification"
                      checked={newEvent.sendNotification}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, sendNotification: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    />
                  </div>
                  <div className="ml-3">
                    <label htmlFor="sendNotification" className="text-sm font-medium text-gray-900 cursor-pointer">
                      Send notification to all alumni
                    </label>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Notify all alumni who have enabled notifications about this new event
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEventModal(false);
                      setEditingId(null);
                      setNewEvent({ name: '', description: '', date: '', location: '', image: null, sendNotification: false });
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    {editingId ? 'Update Event' : 'Add Event'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Event Card Component to avoid repetition
const EventCard = ({ event, isTeacher, handleEditEvent, handleDeleteEvent }) => {
  const navigate = useNavigate();
  const titleRef = React.useRef(null);
  const [descriptionLines, setDescriptionLines] = React.useState(2);
  const [titleLines, setTitleLines] = React.useState(1);
  
  React.useEffect(() => {
    if (titleRef.current) {
      const titleHeight = titleRef.current.offsetHeight;
      const lineHeight = 28; // Approximate line height for text-xl
      const lines = Math.ceil(titleHeight / lineHeight);
      setTitleLines(lines);
      // If title is 1 line, show 4 lines of description; if 2+ lines, show 2 lines
      setDescriptionLines(lines === 1 ? 4 : 2);
    }
  }, [event.name]);
  
  const getStatusColor = (status) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const eventDate = new Date(event.date);
    const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
    
    if (eventDay < today) {
      return 'bg-gray-100 text-gray-700';
    } else if (eventDay.getTime() === today.getTime()) {
      return 'bg-green-100 text-green-700';
    } else {
      return 'bg-blue-100 text-blue-700';
    }
  };

  const getTypeColor = (type) => {
    const colors = {
      'Workshop': 'bg-purple-100 text-purple-700',
      'Seminar': 'bg-indigo-100 text-indigo-700',
      'Networking': 'bg-pink-100 text-pink-700',
      'Conference': 'bg-yellow-100 text-yellow-700',
      'Social': 'bg-green-100 text-green-700',
      'Sports': 'bg-orange-100 text-orange-700',
      'Career': 'bg-teal-100 text-teal-700',
      'Competition': 'bg-red-100 text-red-700'
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  const getStatusLabel = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const eventDate = new Date(event.date);
    const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
    
    if (eventDay < today) return 'Past';
    if (eventDay.getTime() === today.getTime()) return 'Today';
    return 'Upcoming';
  };

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden group flex flex-col h-full">
      {/* Event Image */}
      <div className="relative h-48 overflow-hidden flex-shrink-0">
        <img
          src={
            event.image 
              ? (event.image.startsWith('/') ? `http://localhost:5001${event.image}` : event.image)
              : 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=250&fit=crop'
          }
          alt={event.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-4 left-4 flex space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
            {getStatusLabel()}
          </span>
          {event.type && (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(event.type)}`}>
              {event.type}
            </span>
          )}
        </div>
      </div>

      {/* Event Content */}
      <div className="p-6 flex flex-col flex-grow min-h-[280px]">
        <h3 ref={titleRef} className={`text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors ${titleLines === 1 ? 'min-h-[28px] mb-4' : 'min-h-[56px] mb-2'}`}>
          {event.name}
        </h3>
        
        <div className="space-y-2 mb-4 min-h-[52px]">
          {event.date && (
            <div className="flex items-center text-sm text-gray-600">
              <svg className="h-4 w-4 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {new Date(event.date).toLocaleDateString()}
            </div>
          )}
          {event.location && (
            <div className="flex items-center text-sm text-gray-600">
              <svg className="h-4 w-4 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {event.location}
            </div>
          )}
        </div>

        {event.description && (
          <p className={`text-gray-600 text-sm mb-4 ${descriptionLines === 4 ? 'min-h-[80px] line-clamp-4' : 'min-h-[60px] line-clamp-2'}`}>
            {event.description}
          </p>
        )}

        <div className="flex gap-2 mt-auto pt-4">
          <button
            onClick={() => navigate(`/events/${event.id}`)}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          >
            View Details
          </button>
          {isTeacher && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); handleEditEvent(event); }}
                className="px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Edit
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteEvent(event.id); }}
                className="px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Events;


import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { getImageUrl } from '../config/apiBaseUrl';
import { useNavigate } from 'react-router-dom';
import eventService from '../services/eventService';
import { realtimeClient } from '../services/realtimeClient';
import ConfirmModal from './ConfirmModal';
import FilterMenu from './FilterMenu';
import { authService } from '../services/authService';
import UserLayout from './UserLayout';
import { IMAGE_BASE_URL } from '../config/apiBaseUrl';
import { toast } from 'react-toastify';
import CardSkeleton from './CardSkeleton';

const Events = () => {
  const isTeacher = authService.isTeacher();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newEvent, setNewEvent] = useState({ name: '', description: '', date: '', location: '', image: null, sendNotification: false, notifyBatch: 'all', targetBatch: 'all' });

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    type: 'danger'
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBatchFilter, setSelectedBatchFilter] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [isCurrentEventsExpanded, setIsCurrentEventsExpanded] = useState(true);
  const [isUpcomingEventsExpanded, setIsUpcomingEventsExpanded] = useState(true);
  const [isPastEventsExpanded, setIsPastEventsExpanded] = useState(false);
  const [showBatchMenu, setShowBatchMenu] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const batchMenuRef = useRef(null);
  const statusMenuRef = useRef(null);
  const sortMenuRef = useRef(null);

  const eventTargetBatches = useMemo(() => {
    const batches = new Set();
    events.forEach((event) => {
      if (event.target_batch) {
        batches.add(String(event.target_batch));
      }
    });
    return Array.from(batches).sort((a, b) => Number(a) - Number(b));
  }, [events]);

  const batchMenuSections = useMemo(() => ([
    {
      key: 'EVENT_BATCHES',
      title: '',
      items: [
        { value: '', label: 'All Batch' },
        { value: 'open', label: 'Open to All' },
        ...eventTargetBatches.map((batch) => ({ value: batch, label: `Batch ${batch}` }))
      ]
    }
  ]), [eventTargetBatches]);

  const statusMenuSections = [
    {
      key: 'EVENT_STATUS',
      title: '',
      items: [
        { value: '', label: 'All Statuses' },
        { value: 'upcoming', label: 'Upcoming' },
        { value: 'current', label: 'Happening Today' },
        { value: 'past', label: 'Past Events' }
      ]
    }
  ];

  const sortMenuSections = [
    {
      key: 'EVENT_SORT',
      title: '',
      items: [
        { value: 'date', label: 'Date' },
        { value: 'name', label: 'Name' },
        { value: 'attendees', label: 'Attendees' }
      ]
    }
  ];

  const setOnlyBatchMenuOpen = (valueOrUpdater) => {
    const nextIsOpen = typeof valueOrUpdater === 'function' ? valueOrUpdater(showBatchMenu) : valueOrUpdater;
    setShowBatchMenu(nextIsOpen);
    if (nextIsOpen) {
      setShowStatusMenu(false);
      setShowSortMenu(false);
    }
  };

  const setOnlyStatusMenuOpen = (valueOrUpdater) => {
    const nextIsOpen = typeof valueOrUpdater === 'function' ? valueOrUpdater(showStatusMenu) : valueOrUpdater;
    setShowStatusMenu(nextIsOpen);
    if (nextIsOpen) {
      setShowBatchMenu(false);
      setShowSortMenu(false);
    }
  };

  const setOnlySortMenuOpen = (valueOrUpdater) => {
    const nextIsOpen = typeof valueOrUpdater === 'function' ? valueOrUpdater(showSortMenu) : valueOrUpdater;
    setShowSortMenu(nextIsOpen);
    if (nextIsOpen) {
      setShowBatchMenu(false);
      setShowStatusMenu(false);
    }
  };

  useEffect(() => {
    if (!showBatchMenu && !showStatusMenu && !showSortMenu) return undefined;

    const handlePointerDown = (event) => {
      const clickInsideBatch = batchMenuRef.current && batchMenuRef.current.contains(event.target);
      const clickInsideStatus = statusMenuRef.current && statusMenuRef.current.contains(event.target);
      const clickInsideSort = sortMenuRef.current && sortMenuRef.current.contains(event.target);

      if (!clickInsideBatch && !clickInsideStatus && !clickInsideSort) {
        setShowBatchMenu(false);
        setShowStatusMenu(false);
        setShowSortMenu(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setShowBatchMenu(false);
        setShowStatusMenu(false);
        setShowSortMenu(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showBatchMenu, showStatusMenu, showSortMenu]);

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    const unsubCreated = realtimeClient.subscribe('event.created', () => {
      loadEvents();
    });
    const unsubUpdated = realtimeClient.subscribe('event.updated', () => {
      loadEvents();
    });
    const unsubDeleted = realtimeClient.subscribe('event.deleted', () => {
      loadEvents();
    });
    const unsubAttendance = realtimeClient.subscribe('event.attendance.changed', () => {
      loadEvents();
    });
    return () => {
      unsubCreated();
      unsubUpdated();
      unsubDeleted();
      unsubAttendance();
    };
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
      let payload;
      
      if (newEvent.image) {
        const fd = new FormData();
        fd.append('name', newEvent.name);
        if (newEvent.description) fd.append('description', newEvent.description);
        if (newEvent.date) fd.append('date', newEvent.date);
        if (newEvent.location) fd.append('location', newEvent.location);
        fd.append('sendNotification', newEvent.sendNotification ? 'true' : 'false');
        if (newEvent.sendNotification) {
          fd.append('notifyBatch', newEvent.notifyBatch || 'all');
        }
        fd.append('targetBatch', newEvent.targetBatch || 'all');
        fd.append('image', newEvent.image);
        payload = fd;
      } else {
        payload = {
          name: newEvent.name,
          description: newEvent.description,
          date: newEvent.date,
          location: newEvent.location,
          sendNotification: newEvent.sendNotification,
          notifyBatch: newEvent.notifyBatch,
          targetBatch: newEvent.targetBatch
        };
      }
      
      if (editingId) {
        const updated = await eventService.updateEvent(editingId, payload);
        setEvents(prev => prev.map(ev => ev.id === editingId ? updated : ev));
        toast.success('Event updated successfully!');
      } else {
        const event = await eventService.createEvent(payload);
        setEvents(prev => [...prev, event]);
        toast.success('Event added successfully!');
      }
      setShowEventModal(false);
      setEditingId(null);
      setNewEvent({ name: '', description: '', date: '', location: '', image: null, sendNotification: false, notifyBatch: 'all', targetBatch: 'all' });
    } catch (err) {
      console.error('Error saving event:', err);
      const msg = err?.response?.data?.error || 'Failed to save event. Please try again.';
      toast.error(msg);
    }
  };

  const handleEditEvent = (event) => {
    setEditingId(event.id);
    setNewEvent({
      name: event.name || '',
      description: event.description || '',
      date: event.date ? event.date.split('T')[0] : '',
      location: event.location || '',
      image: null,
      sendNotification: false,
      notifyBatch: 'all',
      targetBatch: event.target_batch ? String(event.target_batch) : 'all'
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
          toast.error('Failed to delete event. Please try again.');
          setConfirmModal({ ...confirmModal, isOpen: false });
        }
      }
    });
  };

  const getEventCalendarKey = (dateValue) => {
    if (!dateValue) return null;

    const dateString = String(dateValue);
    const calendarMatch = dateString.match(/^(\d{4}-\d{2}-\d{2})/);
    if (calendarMatch) return calendarMatch[1];

    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return null;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getEventAttendeeCount = useCallback((event) => {
    if (typeof event.attendees === 'number') return event.attendees;
    if (Array.isArray(event.attendees)) return event.attendees.length;
    if (typeof event.attendeesCount === 'number') return event.attendeesCount;
    if (typeof event.attendanceCount === 'number') return event.attendanceCount;
    if (typeof event._count?.event_attendance === 'number') return event._count.event_attendance;
    return 0;
  }, []);

  const getEventStatusKey = useCallback((event) => {
    const todayKey = getEventCalendarKey(new Date());
    const rawStatus = (event.status || '').toString().toUpperCase();
    const eventKey = event.date ? getEventCalendarKey(event.date) : null;

    if (eventKey) {
      if (eventKey === todayKey) return 'current';
      if (eventKey < todayKey) return 'past';
      return 'upcoming';
    }

    if (rawStatus === 'PREVIOUS' || rawStatus === 'PAST') return 'past';
    if (rawStatus === 'CURRENT' || rawStatus === 'TODAY' || rawStatus === 'HAPPENING') return 'current';
    return 'upcoming';
  }, []);

  const eventMatchesSearchAndBatch = useCallback((event) => {
    const normalizedSearch = searchTerm.toLowerCase();
    const matchesSearch =
      event.name.toLowerCase().includes(normalizedSearch) ||
      (event.description && event.description.toLowerCase().includes(normalizedSearch)) ||
      (event.location && event.location.toLowerCase().includes(normalizedSearch)) ||
      (event.tags && event.tags.some(tag => tag.toLowerCase().includes(normalizedSearch)));

    const matchesBatch =
      selectedBatchFilter === '' ||
      (selectedBatchFilter === 'open' && !event.target_batch) ||
      String(event.target_batch || '') === selectedBatchFilter;

    return matchesSearch && matchesBatch;
  }, [searchTerm, selectedBatchFilter]);

  const sortEvents = useCallback((eventList) => [...eventList].sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return new Date(b.date || 0) - new Date(a.date || 0);
      case 'name':
        return (a.name || '').localeCompare(b.name || '');
      case 'attendees':
        return getEventAttendeeCount(b) - getEventAttendeeCount(a);
      default:
        return 0;
    }
  }), [getEventAttendeeCount, sortBy]);

  const categorizeEvents = useCallback((eventList = events) => {
    const todayKey = getEventCalendarKey(new Date());

    return eventList.reduce((acc, event) => {
      const rawStatus = (event.status || '').toString().toUpperCase();
      const eventKey = event.date ? getEventCalendarKey(event.date) : null;

      if (eventKey) {
        if (eventKey === todayKey) acc.current.push(event);
        else if (eventKey < todayKey) acc.past.push(event);
        else acc.upcoming.push(event);
        return acc;
      }

      if (rawStatus === 'PREVIOUS' || rawStatus === 'PAST') {
        acc.past.push(event);
        return acc;
      }

      if (rawStatus === 'CURRENT' || rawStatus === 'TODAY' || rawStatus === 'HAPPENING') {
        acc.current.push(event);
        return acc;
      }

      if (rawStatus === 'UPCOMING' || rawStatus === 'FUTURE') {
        acc.upcoming.push(event);
        return acc;
      } else {
        acc.upcoming.push(event);
      }

      return acc;
    }, { past: [], current: [], upcoming: [] });
  }, [events]);

  const filteredEvents = useMemo(() => {
    const filtered = events.filter(event => {
      const matchesStatus = selectedStatus === '' || getEventStatusKey(event) === selectedStatus;
      return eventMatchesSearchAndBatch(event) && matchesStatus;
    });

    return sortEvents(filtered);
  }, [eventMatchesSearchAndBatch, getEventStatusKey, selectedStatus, sortEvents, events]);

  const categorizedEvents = useMemo(() => (
    categorizeEvents(sortEvents(events.filter(eventMatchesSearchAndBatch)))
  ), [categorizeEvents, eventMatchesSearchAndBatch, sortEvents, events]);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedBatchFilter('');
    setSelectedStatus('');
    setSortBy('date');
    setShowBatchMenu(false);
    setShowStatusMenu(false);
    setShowSortMenu(false);
  };

  const pastContentRef = useRef(null);
  const upcomingContentRef = useRef(null);
  const currentContentRef = useRef(null);
  useEffect(() => {
    const handleAnim = (ref, expanded) => {
      const el = ref?.current;
      if (!el) return;
      if (expanded) {
        const height = el.scrollHeight;
        el.style.maxHeight = height + 'px';
        el.style.opacity = '1';
      } else {
        el.style.maxHeight = '0px';
        el.style.opacity = '0';
      }
    };

    handleAnim(pastContentRef, isPastEventsExpanded);
    handleAnim(upcomingContentRef, isUpcomingEventsExpanded);
    handleAnim(currentContentRef, isCurrentEventsExpanded);
  }, [isPastEventsExpanded, isUpcomingEventsExpanded, isCurrentEventsExpanded, events.length]);

  return (
    <UserLayout>
      <div className="min-h-screen bg-gray-50 py-8">
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
                className="app-primary-button"
              >
                Add New
              </button>
            )}
          </div>
        </div>

        {/* Unified Search and Filter Card */}
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white shadow-sm px-5 py-4">
          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative group">
              <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-blue-600 transition group-focus-within:text-blue-900">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-transparent bg-transparent">
                  <svg className="h-4.5 w-4.5 text-current" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
              </div>
              <input
                type="text"
                placeholder="Search events by name, description, or location"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-14 pr-12 text-sm text-gray-900 shadow-sm transition placeholder:text-gray-400 focus:border-blue-300 focus:outline-none focus:ring-4 focus:ring-blue-100"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-3 my-auto inline-flex h-7 w-7 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                  aria-label="Clear search"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path fillRule="evenodd" d="M10 8.586 5.707 4.293A1 1 0 0 0 4.293 5.707L8.586 10l-4.293 4.293a1 1 0 1 0 1.414 1.414L10 11.414l4.293 4.293a1 1 0 0 0 1.414-1.414L11.414 10l4.293-4.293a1 1 0 0 0-1.414-1.414L10 8.586Z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-3">
            <FilterMenu
              menuRef={batchMenuRef}
              isOpen={showBatchMenu}
              setIsOpen={setOnlyBatchMenuOpen}
              buttonLabel="All Batch"
              selectedLabel={
                selectedBatchFilter === ''
                  ? 'All Batch'
                  : selectedBatchFilter === 'open'
                    ? 'Open to All'
                    : `Batch ${selectedBatchFilter}`
              }
              selectedValue={selectedBatchFilter}
              icon={<svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
              sections={batchMenuSections}
              onSelect={(value) => {
                setSelectedBatchFilter(value);
                setShowBatchMenu(false);
              }}
              panelTitle="All Batch"
              panelWidthClass="w-56"
              alignClass="right-0"
            />

            <FilterMenu
              menuRef={statusMenuRef}
              isOpen={showStatusMenu}
              setIsOpen={setOnlyStatusMenuOpen}
              buttonLabel="Status"
              selectedLabel={selectedStatus === 'upcoming' ? 'Upcoming' : selectedStatus === 'current' ? 'Happening Today' : selectedStatus === 'past' ? 'Past Events' : 'All Statuses'}
              selectedValue={selectedStatus}
              icon={<svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>}
              sections={statusMenuSections}
              onSelect={(value) => {
                setSelectedStatus(value);
                setShowStatusMenu(false);
              }}
              panelTitle="All Statuses"
              panelWidthClass="w-56"
              alignClass="right-0"
            />

            <FilterMenu
              menuRef={sortMenuRef}
              isOpen={showSortMenu}
              setIsOpen={setOnlySortMenuOpen}
              buttonLabel="Sort By"
              selectedLabel={sortBy === 'date' ? 'Date' : sortBy === 'name' ? 'Name' : 'Attendees'}
              selectedValue={sortBy}
              icon={<svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h18v2H3V4zm3 7h12v2H6v-2zm3 7h6v2H9v-2z" /></svg>}
              sections={sortMenuSections}
              onSelect={(value) => {
                setSortBy(value);
                setShowSortMenu(false);
              }}
              panelTitle="Sort By"
              panelWidthClass="w-56"
              alignClass="right-0"
            />

            {(selectedBatchFilter || selectedStatus) && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700 shadow-sm transition hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-200"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="mb-8 flex flex-wrap items-center gap-4 text-sm text-gray-600">
          <div>Showing {filteredEvents.length} of {events.length} events</div>
          <div className="flex gap-4">
            <span className="px-3 py-1 bg-blue-100 text-blue-900 rounded-full">
              {categorizedEvents.upcoming.length} Upcoming
            </span>
            <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full">
              {categorizedEvents.current.length} Today
            </span>
            <span className="px-3 py-1 bg-gray-50 text-gray-700 rounded-full">
              {categorizedEvents.past.length} Previous
            </span>
          </div>
        </div>

        {selectedStatus === '' ? (
          <div className="space-y-12">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <CardSkeleton count={6} />
              </div>
            ) : (
            <>
            {categorizedEvents.upcoming.length > 0 && (
              <div className="mb-12">
                <div
                  className="flex items-center mb-6 cursor-pointer group"
                  onClick={() => setIsUpcomingEventsExpanded(!isUpcomingEventsExpanded)}
                >
                  <div className="h-0.5 w-12 bg-blue-900 mr-4"></div>
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                    <span className="mr-3">Upcoming Events</span>
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm font-medium rounded-full">
                      {categorizedEvents.upcoming.length}
                    </span>
                  </h2>
                  <svg
                    className={`h-6 w-6 text-gray-600 ml-3 transform transition-transform duration-300 ${isUpcomingEventsExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <div
                  ref={upcomingContentRef}
                  style={{ maxHeight: '0px', overflow: 'hidden', transition: 'max-height 350ms ease, opacity 250ms linear', opacity: 0 }}
                  aria-hidden={!isUpcomingEventsExpanded}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {categorizedEvents.upcoming.map((event) => (
                      <EventCard key={event.id} event={event} isTeacher={isTeacher} handleEditEvent={handleEditEvent} handleDeleteEvent={handleDeleteEvent} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {categorizedEvents.current.length > 0 && (
              <div className="mb-12">
                  <div
                    className="flex items-center mb-6 cursor-pointer group"
                    onClick={() => setIsCurrentEventsExpanded(!isCurrentEventsExpanded)}
                  >
                  <div className="h-0.5 w-12 bg-green-500 mr-4"></div>
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                      <span className="mr-3">Today&apos;s Events</span>
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm font-medium rounded-full">
                      {categorizedEvents.current.length}
                    </span>
                  </h2>
                    <svg
                      className={`h-6 w-6 text-gray-600 ml-3 transform transition-transform duration-300 ${isCurrentEventsExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                  <div
                    ref={currentContentRef}
                    style={{ maxHeight: '0px', overflow: 'hidden', transition: 'max-height 350ms ease, opacity 250ms linear', opacity: 0 }}
                    aria-hidden={!isCurrentEventsExpanded}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {categorizedEvents.current.map((event) => (
                        <EventCard key={event.id} event={event} isTeacher={isTeacher} handleEditEvent={handleEditEvent} handleDeleteEvent={handleDeleteEvent} />
                      ))}
                    </div>
                  </div>
              </div>
            )}

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
                <div
                  ref={pastContentRef}
                  style={{ maxHeight: '0px', overflow: 'hidden', transition: 'max-height 350ms ease, opacity 250ms linear', opacity: 0 }}
                  aria-hidden={!isPastEventsExpanded}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {categorizedEvents.past.map((event) => (
                      <EventCard key={event.id} event={event} isTeacher={isTeacher} handleEditEvent={handleEditEvent} handleDeleteEvent={handleDeleteEvent} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => (
              <EventCard key={event.id} event={event} isTeacher={isTeacher} handleEditEvent={handleEditEvent} handleDeleteEvent={handleDeleteEvent} />
            ))}
          </div>
        )}
        
        {!loading && filteredEvents.length === 0 && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No events found</h3>
            <p className="mt-1 text-sm text-gray-500">Try adjusting your filters or search term.</p>
          </div>
        )}

        {showEventModal && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-hide">
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
                    className="app-input"
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
                    className="app-textarea"
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
                      className="app-input"
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
                      className="app-input"
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

                <div className="space-y-3">
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
                        Send notification to alumni
                      </label>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Notify alumni who have enabled notifications about this new event
                      </p>
                    </div>
                  </div>

                  {newEvent.sendNotification && (
                    <div className="ml-7 pl-3 border-l-2 border-blue-200">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Batch to Notify
                      </label>
                      <select
                        value={newEvent.notifyBatch}
                        onChange={(e) => setNewEvent(prev => ({ ...prev, notifyBatch: e.target.value }))}
                        className="app-select"
                      >
                        <option value="all">All Alumni</option>
                        <option value="2015">Batch 2015</option>
                        <option value="2016">Batch 2016</option>
                        <option value="2017">Batch 2017</option>
                        <option value="2018">Batch 2018</option>
                        <option value="2019">Batch 2019</option>
                        <option value="2020">Batch 2020</option>
                        <option value="2021">Batch 2021</option>
                        <option value="2022">Batch 2022</option>
                        <option value="2023">Batch 2023</option>
                        <option value="2024">Batch 2024</option>
                        <option value="2025">Batch 2025</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        {newEvent.notifyBatch === 'all' 
                          ? 'All alumni with notifications enabled will be notified' 
                          : `Only Batch ${newEvent.notifyBatch} alumni will be notified`}
                      </p>
                    </div>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Restrict Attendance to Batch
                  </label>
                  <select
                    value={newEvent.targetBatch}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, targetBatch: e.target.value }))}
                    className="app-select"
                  >
                    <option value="all">Open to All Batches</option>
                    <option value="2015">Batch 2015</option>
                    <option value="2016">Batch 2016</option>
                    <option value="2017">Batch 2017</option>
                    <option value="2018">Batch 2018</option>
                    <option value="2019">Batch 2019</option>
                    <option value="2020">Batch 2020</option>
                    <option value="2021">Batch 2021</option>
                    <option value="2022">Batch 2022</option>
                    <option value="2023">Batch 2023</option>
                    <option value="2024">Batch 2024</option>
                    <option value="2025">Batch 2025</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {newEvent.targetBatch === 'all'
                      ? 'All alumni can join this event'
                      : `Only Batch ${newEvent.targetBatch} alumni can join. Others can view but not register.`}
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEventModal(false);
                      setEditingId(null);
                      setNewEvent({ name: '', description: '', date: '', location: '', image: null, sendNotification: false, notifyBatch: 'all', targetBatch: 'all' });
                    }}
                    className="app-secondary-button"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="app-primary-button"
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
    </UserLayout>
  );
};

const EventCard = ({ event, isTeacher, handleEditEvent, handleDeleteEvent }) => {
  const navigate = useNavigate();
  const titleRef = React.useRef(null);
  const [descLines, setDescLines] = React.useState(4);

  React.useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    const measure = () => {
      // card-title-container font-size=18px, line-height=1.4 → ~25.2px per line
      const lineHeight = 18 * 1.4;
      const lines = Math.round(el.scrollHeight / lineHeight);
      // 1-sentence title (1 line) → 5 desc lines; 2-sentence title (2 lines) → 4 desc lines
      setDescLines(lines <= 1 ? 5 : 4);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [event.name]);

  const getStatusColor = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const eventDate = new Date(event.date);
    const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());

    if (eventDay < today) return 'bg-gray-100 text-gray-700';
    if (eventDay.getTime() === today.getTime()) return 'bg-green-100 text-green-700';
    return 'bg-blue-100 text-blue-900';
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
    <div className="app-card overflow-hidden group flex h-full flex-col p-0">
      <div className="relative h-48 overflow-hidden flex-shrink-0">
        <img
          src={
            event.image
              ? (event.image.startsWith('/') ? getImageUrl(event.image) : event.image)
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

      <div className="flex flex-grow flex-col px-6 pb-6 pt-5">
        {/* Title — bounding to 2-line visual footprint */}
        <h3 ref={titleRef} className="card-title-container group-hover:text-blue-900 transition-colors">
          {event.name}
        </h3>

        {/* Description — JS sentence-limit (4 if 2-line title, 5 if 1-line title) */}
        {event.description && (
          <div className="card-description-container">
            <p className={descLines === 5 ? 'desc-clamp-5' : 'desc-clamp-4'}>
              {event.description}
            </p>
          </div>
        )}

        {/* Footer — anchored to bottom via mt-auto */}
        <div className="card-footer-wrapper">
          <div className="space-y-1 text-sm text-gray-600">
            {event.date && (
              <div className="flex items-center">
                <svg className="h-4 w-4 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {new Date(event.date).toLocaleDateString()}
              </div>
            )}
            {event.location && (
              <div className="flex items-center">
                <svg className="h-4 w-4 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {event.location}
              </div>
            )}
            {event.target_batch && (
              <div className="flex items-center text-amber-600">
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Batch {event.target_batch} Only
              </div>
            )}
          </div>
          <div className="flex gap-2 pt-3 border-t border-gray-100 mt-1">
            <button
              onClick={() => navigate(`/events/${event.id}`)}
              className="app-primary-button-sm flex-1"
            >
              View Details
            </button>
            {isTeacher && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); handleEditEvent(event); }}
                  className="px-3 py-1.5 rounded-md bg-sky-600 text-white hover:bg-sky-700 shadow-sm text-sm font-medium"
                >
                  Edit
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteEvent(event.id); }}
                  className="px-3 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700 shadow-sm text-sm font-medium"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Events;

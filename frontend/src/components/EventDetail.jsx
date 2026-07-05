import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate } from "react-router-dom";
import eventService from "../services/eventService";
import { authService } from "../services/authService";
import { API_BASE_URL, IMAGE_BASE_URL } from "../config/apiBaseUrl";
import { toast } from "react-toastify";
import ConfirmModal from "./ConfirmModal";

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
    const name =
      `${alumni?.first_name || ""} ${alumni?.last_name || ""}`.trim() || "User";
    const colors = [
      "007bff",
      "6f42c1",
      "e83e8c",
      "fd7e14",
      "28a745",
      "17a2b8",
      "6610f2",
      "20c997",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++)
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    const color = colors[Math.abs(hash) % colors.length];
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${color}&color=fff&rounded=true&size=128`;
  };

  const getProfileImageSrc = (alumni) => {
    const img = alumni?.profile_image;
    if (!img) return getAvatarFallbackUrl(alumni);
    return img.startsWith("/") ? `${IMAGE_BASE_URL}${img}` : img;
  };

  useEffect(() => {
    loadEventDetails();
  }, [id]);

  const loadEventDetails = async () => {
    try {
      setLoading(true);

      if (!id || isNaN(Number(id))) {
        console.error("Invalid event ID:", id);
        navigate("/events");
        return;
      }

      const eventData = await eventService.getEventById(id);

      if (!eventData) {
        console.error("Event not found");
        navigate("/events");
        return;
      }

      setEvent(eventData);

      const attendeesData = await eventService.getEventAttendees(id);
      setAttendees(attendeesData);

      const galleryData = await eventService.getEventGallery(id);
      setGallery(galleryData);

      if (user) {
        const alumniId = user.alumni?.id;
        if (alumniId) {
          const { isAttending: attending } = await eventService.checkAttendance(
            id,
            alumniId,
          );
          setIsAttending(attending);
        }
      }
    } catch (error) {
      console.error("Error loading event details:", error);
      toast.error("Failed to load event. Redirecting to events page...");
      navigate("/events");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinEvent = async () => {
    try {
      const alumniId = user.alumni?.id;
      if (!alumniId) {
        toast.warning("You need to complete your alumni profile first");
        return;
      }

      await eventService.joinEvent(id, alumniId);
      setIsAttending(true);
      loadEventDetails();
    } catch (error) {
      console.error("Error joining event:", error);
      toast.error(error.response?.data?.error || "Failed to join event");
    }
  };

  const handleLeaveEvent = async () => {
    setLeaveConfirm({ isOpen: true });
  };

  const [leaveConfirm, setLeaveConfirm] = useState({ isOpen: false });

  const performLeaveConfirmed = async () => {
    setLeaveConfirm({ isOpen: false });
    try {
      const alumniId = user.alumni?.id;
      await eventService.leaveEvent(id, alumniId);
      setIsAttending(false);
      loadEventDetails();
      toast.success("You have left the event");
    } catch (error) {
      console.error("Error leaving event:", error);
      toast.error(error.response?.data?.error || "Failed to leave event");
    }
  };

  const isEventPast = () => {
    if (!event?.date) return false;
    const now = new Date();
    const todayKey = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
    );
    const eventDate = new Date(event.date);
    const eventKey = Date.UTC(
      eventDate.getUTCFullYear(),
      eventDate.getUTCMonth(),
      eventDate.getUTCDate(),
    );
    return eventKey < todayKey;
  };

  const daysUntilEvent = () => {
    if (!event?.date) return null;
    const now = new Date();
    const todayKey = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
    );
    const eventDate = new Date(event.date);
    const eventKey = Date.UTC(
      eventDate.getUTCFullYear(),
      eventDate.getUTCMonth(),
      eventDate.getUTCDate(),
    );
    const diff = Math.round((eventKey - todayKey) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getStatusBadge = () => {
    if (isEventPast())
      return {
        label: "Completed",
        dot: "bg-gray-500",
        text: "text-gray-600",
        bg: "bg-gray-100",
      };
    const days = daysUntilEvent();
    if (days === null)
      return {
        label: "Unknown",
        dot: "bg-gray-400",
        text: "text-gray-600",
        bg: "bg-gray-100",
      };
    if (days <= 0)
      return {
        label: "Today",
        dot: "bg-amber-500",
        text: "text-amber-700",
        bg: "bg-amber-50",
      };
    if (days <= 7)
      return {
        label: `In ${days} days`,
        dot: "bg-orange-500",
        text: "text-orange-700",
        bg: "bg-orange-50",
      };
    return {
      label: "Upcoming",
      dot: "bg-emerald-500",
      text: "text-emerald-700",
      bg: "bg-emerald-50",
    };
  };

  const canUploadGallery = isEventPast() && (isTeacher || isAlumni);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const handleUploadPhotos = async () => {
    if (selectedFiles.length === 0) {
      toast.warning("Please select photos to upload");
      return;
    }

    try {
      setUploadingPhotos(true);
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append("images", file);
      });

      await eventService.addGalleryPhotos(id, formData);
      toast.success("Photos uploaded successfully!");
      setSelectedFiles([]);
      loadEventDetails();
    } catch (error) {
      console.error("Error uploading photos:", error);
      toast.error("Failed to upload photos");
    } finally {
      setUploadingPhotos(false);
    }
  };

  const handleDeletePhoto = async (photoId) => {
    setConfirmPhotoId(photoId);
    setShowConfirm(true);
  };

  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmPhotoId, setConfirmPhotoId] = useState(null);

  const performDeleteConfirmed = async () => {
    const photoId = confirmPhotoId;
    setShowConfirm(false);
    setConfirmPhotoId(null);
    if (!photoId) return;
    try {
      await eventService.deleteGalleryPhoto(id, photoId);
      setGallery((prev) => prev.filter((p) => p.id !== photoId));
      toast.success("Photo deleted successfully");
    } catch (error) {
      console.error("Error deleting photo:", error);
      toast.error("Failed to delete photo");
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

  const formatDate = (dateStr) => {
    if (!dateStr) return "TBA";
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDateShort = (dateStr) => {
    if (!dateStr) return "TBA";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatEventTimeRange = () => {
    const startTime = event?.start_time || event?.time || null;
    const endTime = event?.end_time || null;

    if (startTime && endTime) return `${startTime} – ${endTime}`;
    if (startTime) return startTime;
    if (endTime) return `Until ${endTime}`;
    return "To be announced";
  };

  const formatRegistrationLabel = () => {
    const fee = event?.registration_fee ?? event?.fee ?? event?.price;

    if (fee !== undefined && fee !== null && fee !== "") {
      const numericFee = Number(fee);
      if (!Number.isNaN(numericFee)) {
        if (numericFee === 0) return "Free";
        return new Intl.NumberFormat("en-PH", {
          style: "currency",
          currency: "PHP",
          maximumFractionDigits: 0,
        }).format(numericFee);
      }

      return String(fee);
    }

    if (isEventPast()) return "Registration closed";
    if (isAttending) return "Registered";
    return "Open registration";
  };

  const showAttendanceCard =
    user &&
    ((user?.role || "").toUpperCase() !== "TEACHER" || isAlumni) &&
    !isEventPast();

  const userBatch = user?.alumni?.batch || null;
  const isBatchRestricted = event?.target_batch && userBatch !== event.target_batch;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-sm text-gray-500">Loading event details...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Event not found</p>
          <button
            onClick={() => navigate("/events")}
            className="mt-4 text-sm font-medium text-gray-900 underline underline-offset-4 hover:no-underline"
          >
            Back to Events
          </button>
        </div>
      </div>
    );
  }

  const status = getStatusBadge();

  return (
    <div className="min-h-screen bg-gray-50">
      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => {
          setShowConfirm(false);
          setConfirmPhotoId(null);
        }}
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

      {/* Hero Image */}
      {event.image && (
        <div className="relative h-[300px] md:h-[400px] w-full overflow-hidden">
          <img
            src={`${IMAGE_BASE_URL}${event.image}`}
            alt={event.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>

          {/* Back Button */}
          <button
            onClick={() => navigate("/events")}
            className="absolute top-4 left-4 md:top-6 md:left-6 inline-flex items-center gap-2 rounded-xl bg-gray-100 border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-all"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Events
          </button>

          {/* Title at bottom of image */}
          <div className="absolute bottom-0 left-0 right-0 px-4 md:px-8 pb-5 md:pb-7">
            <div className="container mx-auto">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${status.bg} ${status.text}`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${status.dot}`}
                  ></span>
                  {status.label}
                </span>
              </div>
              <h1 className="text-2xl md:text-4xl font-bold text-white tracking-tight mb-2 drop-shadow-md">
                {event.name}
              </h1>
              <div className="flex flex-wrap items-center gap-3 md:gap-4 text-white/90 text-sm">
                {event.date && (
                  <span className="flex items-center gap-1.5">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    {formatDateShort(event.date)}
                  </span>
                )}
                {event.location && (
                  <span className="flex items-center gap-1.5">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    {event.location}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* No image header */}
      {!event.image && (
        <div className="bg-white border-b border-gray-200">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <button
              onClick={() => navigate("/events")}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-4"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Events
            </button>
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${status.bg} ${status.text}`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${status.dot}`}
                ></span>
                {status.label}
              </span>
            </div>
            <h1 className="text-2xl md:text-4xl font-bold text-gray-900 tracking-tight">
              {event.name}
            </h1>
            <div className="flex flex-wrap items-center gap-3 md:gap-4 mt-2 text-sm text-gray-500">
              {event.date && (
                <span className="flex items-center gap-1.5">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  {formatDateShort(event.date)}
                </span>
              )}
              {event.location && (
                <span className="flex items-center gap-1.5">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  {event.location}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                {attendees.length} attending
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-6 md:space-y-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5 md:p-6">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-blue-600 mb-3">
            About This Event
          </h2>
          <div className="text-[15px] text-gray-700 leading-relaxed whitespace-pre-wrap">
            {event.description ||
              "More details about this event will be shared soon."}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          <div
            className={showAttendanceCard ? "lg:col-span-8" : "lg:col-span-12"}
          >
            <div className="bg-white rounded-xl border border-gray-200 p-5 md:p-6 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-widest text-blue-600">
                    Event Logistics
                  </h2>
                </div>
                <div className="inline-flex items-center gap-2 self-start rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  {attendees.length}{" "}
                  {attendees.length === 1 ? "attendee" : "attendees"} registered
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.6}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      Date
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {formatDate(event.date)}
                    </p>
                    {event.end_date && (
                      <p className="mt-1 text-xs text-gray-500">
                        Until {formatDate(event.end_date)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.6}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      Time
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {formatEventTimeRange()}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.6}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.6}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      Venue
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gray-900 break-words">
                      {event.location || "To be announced"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.6}
                        d="M16 8V6a4 4 0 10-8 0v2m-3 3h14l-1 8H6l-1-8zm5 4h4"
                      />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      Registration
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {formatRegistrationLabel()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {showAttendanceCard && (
            <div className="lg:col-span-4">
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                {isAttending ? (
                  <div>
                    <div className="flex items-center gap-2 mb-4 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                      <svg
                        className="w-5 h-5 text-emerald-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span className="text-sm font-semibold text-emerald-800">
                        You're attending!
                      </span>
                    </div>
                    <button
                      onClick={handleLeaveEvent}
                      className="app-danger-button w-full px-4 py-2.5 text-sm"
                    >
                      Leave Event
                    </button>
                  </div>
                ) : isBatchRestricted ? (
                  <div>
                    <div className="flex items-center gap-2 mb-4 p-3 bg-amber-50 rounded-lg border border-amber-100">
                      <svg
                        className="w-5 h-5 text-amber-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                      <span className="text-sm font-semibold text-amber-800">
                        Restricted to Batch {event.target_batch}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-4">
                      This event is only open to Batch {event.target_batch} alumni. Your batch does not match.
                    </p>
                    <button
                      disabled
                      className="w-full px-4 py-3 text-sm font-medium bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed"
                    >
                      Only Batch {event.target_batch} Can Join
                    </button>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-widest text-blue-600 mb-3">
                      Registration
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Register your interest to receive updates about this
                      event.
                    </p>
                    <button
                      onClick={handleJoinEvent}
                      className="w-full app-primary-button px-4 py-3 text-sm"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                      Join Event
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Attendees */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-blue-600">
              Attendees
            </h2>
            <span className="text-xs text-gray-400 font-medium">
              {attendees.length}
            </span>
          </div>
          {attendees.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {attendees.map((attendance) => (
                <div
                  key={attendance.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50 hover:bg-white hover:border-gray-200 transition-colors"
                >
                  <img
                    src={getProfileImageSrc(attendance.alumni)}
                    alt={`${attendance.alumni.first_name} ${attendance.alumni.last_name}`}
                    onError={(e) => {
                      e.currentTarget.src = getAvatarFallbackUrl(
                        attendance.alumni,
                      );
                    }}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0 ring-2 ring-white shadow-sm"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {attendance.alumni?.first_name}{" "}
                      {attendance.alumni?.last_name}
                    </p>
                    {attendance.alumni?.course && (
                      <p className="text-xs text-gray-500 truncate">
                        {attendance.alumni.course}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 rounded-lg border border-dashed border-gray-300 bg-gray-50">
              <svg
                className="w-10 h-10 text-blue-600 mx-auto mb-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <p className="text-sm font-semibold text-gray-900 mb-1">
                No attendees yet
              </p>
              <p className="text-xs text-gray-500">
                Be the first to register for this event.
              </p>
            </div>
          )}
        </div>

        {/* Gallery - Past Events Only */}
        {isEventPast() && (
          <div className="mt-8">
            <div className="bg-white rounded-xl border border-gray-200 p-5 md:p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-blue-600">
                  Gallery
                </h2>
                {gallery.length > 0 && (
                  <span className="text-xs text-gray-400 font-medium">
                    {gallery.length} {gallery.length === 1 ? "photo" : "photos"}
                  </span>
                )}
              </div>

              {/* Upload */}
              {canUploadGallery && (
                <div className="mb-6 p-4 rounded-lg border border-dashed border-gray-300 bg-gray-50">
                  <div className="flex items-center gap-3 mb-3">
                    <svg
                      className="w-5 h-5 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <span className="text-sm font-medium text-gray-700">
                      Upload photos from this event
                    </span>
                  </div>
                  <div className="space-y-3">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border file:border-gray-300 file:text-sm file:font-medium file:bg-white file:text-gray-700 hover:file:bg-gray-50 file:cursor-pointer"
                    />
                    {selectedFiles.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {selectedFiles.map((file, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium"
                          >
                            {file.name}
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedFiles((prev) =>
                                  prev.filter((_, i) => i !== idx),
                                )
                              }
                              className="hover:text-blue-900"
                            >
                              <svg
                                className="w-3.5 h-3.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={handleUploadPhotos}
                      disabled={uploadingPhotos || selectedFiles.length === 0}
                      className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      {uploadingPhotos
                        ? "Uploading..."
                        : `Upload ${selectedFiles.length > 0 ? `(${selectedFiles.length})` : ""}`}
                    </button>
                  </div>
                </div>
              )}

              {/* Gallery Grid */}
              {gallery.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {gallery.map((photo, index) => (
                    <div key={photo.id} className="relative group">
                      <div
                        className="aspect-square overflow-hidden rounded-lg cursor-pointer border border-gray-100"
                        onClick={() => openLightbox(index)}
                      >
                        <img
                          src={`${IMAGE_BASE_URL}${photo.image}`}
                          alt={`Gallery ${index + 1}`}
                          className="w-full h-full object-cover group-hover:opacity-80 transition-opacity duration-200"
                        />
                      </div>
                      {(isTeacher ||
                        (isAlumni &&
                          Number(
                            user?.id || user?.userId || user?.user_id || 0,
                          ) > 0 &&
                          Number(photo.uploaded_by || photo.user?.id || 0) ===
                            Number(
                              user?.id || user?.userId || user?.user_id || 0,
                            ))) && (
                        <button
                          onClick={() => handleDeletePhoto(photo.id)}
                          className="absolute top-2 right-2 w-7 h-7 bg-black/50 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-black/70"
                        >
                          <svg
                            className="h-3.5 w-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 rounded-lg border border-dashed border-gray-300 bg-gray-50">
                  <svg
                    className="w-10 h-10 text-blue-600 mx-auto mb-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="text-sm font-semibold text-gray-900 mb-1">
                    No photos yet
                  </p>
                  <p className="text-xs text-gray-500">
                    {canUploadGallery
                      ? "Upload photos to share with everyone."
                      : "Check back later for event photos."}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Lightbox */}
        {showLightbox && gallery.length > 0 && createPortal(
          <div className="fixed inset-0 bg-black/95 z-[9999] flex items-center justify-center">
            <button
              onClick={closeLightbox}
              className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center text-white/70 hover:text-white transition-colors z-10 rounded-full hover:bg-white/10"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            {gallery.length > 1 && (
              <>
                <button
                  onClick={prevPhoto}
                  className="absolute left-4 w-12 h-12 flex items-center justify-center text-white/70 hover:text-white transition-colors rounded-full hover:bg-white/10"
                >
                  <svg
                    className="h-8 w-8"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
                <button
                  onClick={nextPhoto}
                  className="absolute right-4 w-12 h-12 flex items-center justify-center text-white/70 hover:text-white transition-colors rounded-full hover:bg-white/10"
                >
                  <svg
                    className="h-8 w-8"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </>
            )}

            <img
              src={`${IMAGE_BASE_URL}${gallery[lightboxIndex].image}`}
              alt={`Gallery ${lightboxIndex + 1}`}
              className="max-w-[90vw] max-h-[85vh] object-contain rounded-sm"
            />

            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white/60 text-xs font-medium tracking-wide">
              {lightboxIndex + 1} / {gallery.length}
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
};

export default EventDetail;

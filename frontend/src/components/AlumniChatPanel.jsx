import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  acceptMessageRequest,
  blockMessageRequest,
  getChatId,
  getSystemUserId,
  listenToConversationSummaries,
  listenToMessages,
  listenToUserStatuses,
  markConversationRead,
  normalizeChatUser,
  parseMessagePayload,
  sendChatMessage,
  unblockChatUser,
  unsendMessage,
  uploadChatMedia
} from '../services/supabaseChatService';
import { API_BASE_URL } from '../config/apiBaseUrl';
import alumniService from '../services/alumniService';

const getAvatarFallbackUrl = (name) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=2563eb&color=ffffff&size=160`;

const resolveContactAvatar = (contact) => contact.profileImage || getAvatarFallbackUrl(contact.displayName);

const resolveContactChatId = (currentUserId, contact, summaries = {}) => {
  if (!currentUserId || !contact?.userId) return '';
  if (contact.chatId) return contact.chatId;

  const directChatId = getChatId(currentUserId, contact.userId);
  if (summaries[directChatId]) return directChatId;

  const summaryMatch = Object.entries(summaries).find(([, summary]) => {
    const otherUserId = summary?.otherUserId || summary?.otherUser?.userId;
    return String(otherUserId || '') === String(contact.userId);
  });

  return summaryMatch?.[0] || directChatId;
};

const formatChatTime = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatChatSeparatorDate = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  
  if (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  ) {
    return 'Today';
  }
  
  if (
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()
  ) {
    return 'Yesterday';
  }
  
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
};

const formatMessengerRelativeTime = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return 'now';
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 52) return `${diffWeeks}w`;
  return `${Math.floor(diffDays / 365)}y`;
};

const formatConversationSnippet = (summary, contact, currentUserId) => {
  if (!summary?.latestMessageText) {
    return formatLastActive(contact?.status);
  }

  const raw = String(summary.latestMessageText || '').trim();
  const rawSenderId = String(summary.latestMessageSenderId || '');

  let isOwn = false;
  if (rawSenderId) {
    isOwn = rawSenderId === String(currentUserId);
  } else if (summary.requestedBy && summary.status === 'pending') {
    isOwn = String(summary.requestedBy) === String(currentUserId);
  }

  const senderName = isOwn
    ? 'You'
    : (contact?.displayName ? contact.displayName.trim().split(' ')[0] : 'User');

  let snippet = '';

  // Check if it's JSON payload
  if (raw.startsWith('{') && raw.endsWith('}')) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed.mediaItems && parsed.mediaItems.length > 0) {
        if (parsed.mediaItems.length > 1) {
          snippet = `${senderName} sent ${parsed.mediaItems.length} photos.`;
        } else if (parsed.mediaItems[0].mediaType === 'video') {
          snippet = `${senderName} sent a video.`;
        } else {
          snippet = `${senderName} sent a photo.`;
        }
      } else if (parsed.mediaUrl) {
        if (parsed.mediaType === 'video') {
          snippet = `${senderName} sent a video.`;
        } else {
          snippet = `${senderName} sent a photo.`;
        }
      } else if (parsed.text) {
        snippet = isOwn ? `You: ${parsed.text}` : parsed.text;
      }
    } catch {
      // not JSON
    }
  }

  if (!snippet) {
    // Check for multi-photo pattern like [photos:3] or 📷 3 photos
    const multiMatch = raw.match(/\[photos?:(\d+)\]/i) || raw.match(/📷\s*\[?(\d+)\s*photos?\]?/i);
    if (multiMatch) {
      const count = multiMatch[1];
      snippet = `${senderName} sent ${count} photos.`;
    } else if (raw === '[video]' || raw.startsWith('🎥') || raw.toLowerCase().includes('video')) {
      snippet = `${senderName} sent a video.`;
    } else if (raw === '[photo]' || raw.startsWith('📷') || raw.toLowerCase().includes('photo')) {
      snippet = `${senderName} sent a photo.`;
    } else if (isOwn) {
      snippet = `You: ${raw}`;
    } else {
      snippet = raw;
    }
  }

  const timeStr = summary.latestMessageAt ? formatMessengerRelativeTime(summary.latestMessageAt) : '';
  if (timeStr) {
    return `${snippet} · ${timeStr}`;
  }
  return snippet;
};

const renderMessageContent = (text, isOwn) => {
  if (!text) return null;

  const urlPattern = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = urlPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    let url = match[0];
    let trailingPunctuation = '';

    const punctuationMatch = url.match(/[.,!?)]+$/);
    if (punctuationMatch) {
      trailingPunctuation = punctuationMatch[0];
      url = url.slice(0, -trailingPunctuation.length);
    }

    const href = url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;

    parts.push(
      <a
        key={`msg-link-${match.index}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(event) => event.stopPropagation()}
        className={`underline underline-offset-2 break-all font-medium transition-colors ${
          isOwn
            ? 'text-blue-200 hover:text-white hover:underline'
            : 'text-blue-600 hover:text-blue-800 hover:underline'
        }`}
      >
        {url}
      </a>
    );

    if (trailingPunctuation) {
      parts.push(trailingPunctuation);
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
};

const linkPreviewCache = new Map();

const extractFirstUrl = (text) => {
  if (!text || typeof text !== 'string') return null;
  const match = text.match(/(https?:\/\/[^\s<]+|www\.[^\s<]+)/i);
  if (!match) return null;
  let url = match[0];
  const punct = url.match(/[.,!?)]+$/);
  if (punct) {
    url = url.slice(0, -punct[0].length);
  }
  return url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
};

const LinkPreviewCard = ({ url, isOwn }) => {
  const [preview, setPreview] = useState(() => linkPreviewCache.get(url) || null);
  const [loading, setLoading] = useState(() => !linkPreviewCache.has(url));

  useEffect(() => {
    if (!url) return;
    if (linkPreviewCache.has(url)) {
      setPreview(linkPreviewCache.get(url));
      setLoading(false);
      return;
    }

    let isMounted = true;
    const fetchPreview = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await fetch(`${API_BASE_URL}/chat/link-preview?url=${encodeURIComponent(url)}`, {
          headers
        });
        if (!res.ok) {
          linkPreviewCache.set(url, null);
          if (isMounted) setLoading(false);
          return;
        }
        const data = await res.json();
        if (data && (data.title || data.image)) {
          linkPreviewCache.set(url, data);
          if (isMounted) {
            setPreview(data);
            setLoading(false);
          }
        } else {
          linkPreviewCache.set(url, null);
          if (isMounted) setLoading(false);
        }
      } catch {
        linkPreviewCache.set(url, null);
        if (isMounted) setLoading(false);
      }
    };

    fetchPreview();
    return () => {
      isMounted = false;
    };
  }, [url]);

  if (loading || !preview) return null;

  let hostname = '';
  try {
    hostname = new URL(url).hostname;
  } catch {
    hostname = '';
  }

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        window.open(preview.url || url, '_blank', 'noopener,noreferrer');
      }}
      className={`group/preview mt-1 block w-[280px] sm:w-[320px] max-w-full rounded-2xl overflow-hidden text-left transition-colors cursor-pointer border shadow-xs animate-[fadeIn_0.2s_ease-out] ${
        isOwn
          ? 'border-blue-800/60 bg-blue-900 hover:bg-blue-800 text-white'
          : 'border-slate-200/90 bg-white hover:bg-slate-50 text-slate-900'
      }`}
    >
      {preview.image && (
        <div className="relative w-full aspect-video max-h-52 overflow-hidden bg-black/40">
          <img
            src={preview.image}
            alt={preview.title || 'Link Preview'}
            className="w-full h-full object-cover transition-transform duration-300 group-hover/preview:scale-102"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      )}
      <div className={`p-3 ${isOwn ? 'bg-blue-950/50' : 'bg-slate-50/80'}`}>
        {preview.title && (
          <h4 className="font-semibold text-[13.5px] leading-snug line-clamp-2">
            {preview.title}
          </h4>
        )}
        <p className={`mt-1 text-[11.5px] line-clamp-1 ${isOwn ? 'text-blue-200/80' : 'text-slate-500'}`}>
          {preview.description || preview.siteName || hostname}
        </p>
      </div>
    </div>
  );
};

const renderMessengerMediaGrid = (items, onSelectImage, isFlushWithCaption = false) => {
  if (!items || !items.length) return null;
  const roundedClass = isFlushWithCaption ? 'rounded-t-2xl rounded-b-none' : 'rounded-2xl';

  if (items.length === 1) {
    const item = items[0];
    if (item.mediaType === 'video') {
      return (
        <video
          src={item.url}
          controls
          playsInline
          preload="metadata"
          onClick={(e) => e.stopPropagation()}
          className={`max-h-80 w-full ${roundedClass} object-contain bg-black shadow-xs block`}
        />
      );
    }
    return (
      <img
        src={item.url}
        alt={item.fileName || 'Photo'}
        onClick={(e) => {
          e.stopPropagation();
          onSelectImage(0);
        }}
        className={`max-h-80 w-full ${roundedClass} object-cover shadow-xs transition-opacity duration-150 hover:opacity-95 cursor-pointer block`}
      />
    );
  }

  if (items.length === 2) {
    return (
      <div className={`grid grid-cols-2 gap-1 ${roundedClass} overflow-hidden max-w-[360px] shadow-xs`}>
        {items.map((item, idx) => (
          <div
            key={idx}
            className="relative aspect-square overflow-hidden bg-slate-900 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onSelectImage(idx);
            }}
          >
            {item.mediaType === 'video' ? (
              <video src={item.url} className="h-full w-full object-cover" />
            ) : (
              <img src={item.url} alt="Photo" className="h-full w-full object-cover hover:scale-105 transition-transform duration-200" />
            )}
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 3) {
    return (
      <div className={`grid grid-cols-2 gap-1 ${roundedClass} overflow-hidden max-w-[360px] shadow-xs`}>
        <div
          className="col-span-2 relative aspect-[16/9] overflow-hidden bg-slate-900 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onSelectImage(0);
          }}
        >
          {items[0].mediaType === 'video' ? (
            <video src={items[0].url} className="h-full w-full object-cover" />
          ) : (
            <img src={items[0].url} alt="Photo" className="h-full w-full object-cover hover:scale-105 transition-transform duration-200" />
          )}
        </div>
        {items.slice(1, 3).map((item, idx) => (
          <div
            key={idx}
            className="relative aspect-square overflow-hidden bg-slate-900 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onSelectImage(idx + 1);
            }}
          >
            {item.mediaType === 'video' ? (
              <video src={item.url} className="h-full w-full object-cover" />
            ) : (
              <img src={item.url} alt="Photo" className="h-full w-full object-cover hover:scale-105 transition-transform duration-200" />
            )}
          </div>
        ))}
      </div>
    );
  }

  const displayItems = items.slice(0, 4);
  const remainingCount = items.length - 4;

  return (
    <div className={`grid grid-cols-2 gap-1 ${roundedClass} overflow-hidden max-w-[360px] shadow-xs`}>
      {displayItems.map((item, idx) => {
        const isFourthWithMore = idx === 3 && remainingCount > 0;
        return (
          <div
            key={idx}
            className="relative aspect-square overflow-hidden bg-slate-900 cursor-pointer group"
            onClick={(e) => {
              e.stopPropagation();
              onSelectImage(idx);
            }}
          >
            {item.mediaType === 'video' ? (
              <video src={item.url} className="h-full w-full object-cover" />
            ) : (
              <img src={item.url} alt="Photo" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200" />
            )}
            {isFourthWithMore && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center text-white font-bold text-2xl transition-colors hover:bg-black/50">
                +{remainingCount + 1}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const isDifferentDay = (timestamp1, timestamp2) => {
  if (!timestamp1 || !timestamp2) return true;
  const d1 = new Date(timestamp1);
  const d2 = new Date(timestamp2);
  return (
    d1.getFullYear() !== d2.getFullYear() ||
    d1.getMonth() !== d2.getMonth() ||
    d1.getDate() !== d2.getDate()
  );
};

const formatLastActive = (status) => {
  if (status?.online) return 'Online';
  if (!status?.lastActive) return 'Offline';

  const date = new Date(status.lastActive);
  if (Number.isNaN(date.getTime())) return 'Offline';

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));
  if (diffMinutes < 60) return `Last active ${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Last active ${diffHours}h ago`;

  return `Last active ${date.toLocaleDateString()}`;
};

const getConversationStatus = (summary) => summary?.status || 'accepted';

const isBlockedConversationStatus = (status) => status === 'blocked' || status === 'rejected';

const didCurrentUserBlockSummary = (summary, currentUserId) =>
  isBlockedConversationStatus(getConversationStatus(summary)) &&
  String(summary?.blockedBy || summary?.requestTo || '') === String(currentUserId);

const getRoleLabel = (role) => {
  const normalized = String(role || '').toUpperCase();
  if (normalized === 'ADMIN') return 'Admin';
  if (normalized === 'TEACHER') return 'Admin';
  return 'Alumni';
};

const isGenericChatContact = (contact) => {
  const name = String(contact?.displayName || '').trim().toLowerCase();
  return ['alumni', 'user'].includes(name) && !contact?.email && !contact?.username;
};

const isSearchableAlumniAccount = (entry = {}) => {
  const user = entry.user || {};
  const accountStatus = String(entry.status || entry.account_status || user.status || user.account_status || '').toUpperCase();

  if (accountStatus === 'BLOCKED' || accountStatus === 'DEACTIVATED' || accountStatus === 'INACTIVE' || accountStatus === 'DECEASED') return false;
  if (entry.is_blocked || entry.isBlocked || user.is_blocked || user.isBlocked) return false;
  if (entry.is_deactivated || entry.isDeactivated || user.is_deactivated || user.isDeactivated) return false;
  if (entry.is_active === false || entry.isActive === false || user.is_active === false || user.isActive === false) {
    return false;
  }

  return true;
};

const buildAlumniSearchText = (entry = {}, contact = {}) => {
  const user = entry.user || {};
  return [
    contact.displayName,
    contact.email,
    contact.course,
    contact.batch,
    contact.alumniId,
    entry.firstName,
    entry.first_name,
    entry.middleName,
    entry.middle_name,
    entry.lastName,
    entry.last_name,
    entry.username,
    user.username,
    user.email,
    entry.student_id,
    entry.studentId,
    entry.studentNumber,
    entry.student_number,
    entry.school_id,
    entry.schoolId,
    entry.level,
    entry.graduationYear,
    entry.graduation_year,
    entry.currentPosition,
    entry.current_position,
    entry.company,
    entry.location
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
};

const sortByLatestActivity = (first, second) => {
  const firstTime = first.summary?.latestMessageAt || first.summary?.updatedAt || 0;
  const secondTime = second.summary?.latestMessageAt || second.summary?.updatedAt || 0;
  if (firstTime !== secondTime) return secondTime - firstTime;
  if (first.status?.online !== second.status?.online) return first.status?.online ? -1 : 1;
  return first.displayName.localeCompare(second.displayName);
};

const getStatusSignature = (status) =>
  `${status?.online ? '1' : '0'}|${status?.lastActive || ''}|${status?.displayName || ''}`;

const areStatusMapsEqual = (previous = {}, next = {}) => {
  const previousKeys = Object.keys(previous);
  const nextKeys = Object.keys(next);
  if (previousKeys.length !== nextKeys.length) return false;

  return nextKeys.every((key) => getStatusSignature(previous[key]) === getStatusSignature(next[key]));
};

const areConversationSummaryMapsEqual = (previous = {}, next = {}) => {
  const previousKeys = Object.keys(previous);
  const nextKeys = Object.keys(next);
  if (previousKeys.length !== nextKeys.length) return false;

  return nextKeys.every((key) => JSON.stringify(previous[key] || {}) === JSON.stringify(next[key] || {}));
};

const ContactAvatar = ({ contact, status }) => (
  <div className="relative h-10 w-10 shrink-0">
    <img
      src={resolveContactAvatar(contact)}
      alt={contact.displayName}
      className="h-10 w-10 rounded-full border border-white object-cover shadow-sm"
      onError={(event) => {
        const fallback = getAvatarFallbackUrl(contact.displayName);
        if (event.currentTarget.src !== fallback) {
          event.currentTarget.src = fallback;
        }
      }}
    />
    <span
      className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${
        status?.online ? 'bg-emerald-500' : 'bg-slate-300'
      }`}
      aria-label={status?.online ? 'Online' : 'Offline'}
    />
  </div>
);

const AlumniChatPanel = ({
  currentUser,
  alumniContacts,
  initialChatContext = 'alumni',
  externalSelectedContactId = null,
  externalSelectedContact = null,
  externalSelectFirstStaff = false,
  externalOpen = false,
  onExternalOpenHandled = null
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [showMessageRequests, setShowMessageRequests] = useState(true);
  const [showSentRequests, setShowSentRequests] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedContactId, setSelectedContactId] = useState('');
  const [staffContacts, setStaffContacts] = useState([]);
  const [missingProfiles, setMissingProfiles] = useState({});
  const [internalAlumniContacts, setInternalAlumniContacts] = useState([]);
  const [statuses, setStatuses] = useState({});
  const [conversationSummaries, setConversationSummaries] = useState({});
  const [messages, setMessages] = useState([]);
  const [chatContext, setChatContext] = useState(initialChatContext === 'employment' ? 'employment' : 'alumni');
  const [externalContact, setExternalContact] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [lightboxState, setLightboxState] = useState(null);
  const [error, setError] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [requestActionId, setRequestActionId] = useState('');
  const [clickedMessageId, setClickedMessageId] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [activeActionMenuId, setActiveActionMenuId] = useState(null);
  const [unsendingMessageId, setUnsendingMessageId] = useState(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [recentSearchList, setRecentSearchList] = useState([]);
  const messageInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const scrolledChatIdRef = useRef(null);
  const previousMessageCountRef = useRef(0);
  const closeTimerRef = useRef(null);
  const pendingStaffSelectionRef = useRef(false);
  const fileInputRef = useRef(null);

  const currentUserId = getSystemUserId(currentUser);
  const visibleMessages = useMemo(
    () => messages.filter((message) => (message.context || 'alumni') === chatContext),
    [chatContext, messages]
  );

  useEffect(() => {
    setChatContext(initialChatContext === 'employment' ? 'employment' : 'alumni');
  }, [initialChatContext]);

  // Keyboard navigation for media lightbox (Esc to close, Left/Right arrows to navigate)
  useEffect(() => {
    if (!lightboxState) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setLightboxState(null);
      } else if (e.key === 'ArrowLeft') {
        setLightboxState((prev) => {
          if (!prev || prev.index <= 0) return prev;
          return { ...prev, index: prev.index - 1 };
        });
      } else if (e.key === 'ArrowRight') {
        setLightboxState((prev) => {
          if (!prev || prev.index >= prev.items.length - 1) return prev;
          return { ...prev, index: prev.index + 1 };
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxState]);

  useEffect(() => {
    if (externalOpen) {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      setIsClosing(false);
      setIsOpen(true);
      setChatContext(initialChatContext === 'employment' ? 'employment' : 'alumni');
      pendingStaffSelectionRef.current = externalSelectFirstStaff;
      if (externalSelectedContact) {
        setExternalContact(externalSelectedContact);
      }
      if (externalSelectedContactId) {
        setSelectedContactId(String(externalSelectedContactId));
      }
      if (onExternalOpenHandled) {
        onExternalOpenHandled();
      }
    }
  }, [externalOpen, externalSelectedContactId, onExternalOpenHandled]);

  useEffect(() => {
    if (!pendingStaffSelectionRef.current || !staffContacts.length) return;

    const staffContact = staffContacts.find(
      (contact) => String(contact.userId) !== String(currentUserId)
    );
    if (!staffContact) return;

    pendingStaffSelectionRef.current = false;
    setExternalContact(staffContact);
    setSelectedContactId(String(staffContact.userId));
  }, [currentUserId, externalOpen, staffContacts]);

  useEffect(() => {
    const hasProps = Array.isArray(alumniContacts) ? alumniContacts.length > 0 : Boolean(alumniContacts?.alumni?.length);
    if (!hasProps && internalAlumniContacts.length === 0) {
      alumniService
        .getAllAlumni()
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setInternalAlumniContacts(data);
          }
        })
        .catch(() => {});
    }
  }, [alumniContacts, internalAlumniContacts.length]);

  const safeAlumniContacts = useMemo(() => {
    if (Array.isArray(alumniContacts) && alumniContacts.length > 0) return alumniContacts;
    if (Array.isArray(alumniContacts?.alumni) && alumniContacts.alumni.length > 0) return alumniContacts.alumni;
    return internalAlumniContacts;
  }, [alumniContacts, internalAlumniContacts]);

  const currentAlumniId = useMemo(() => {
    const fromUser = currentUser?.alumniId || currentUser?.alumni_id || currentUser?.alumni?.id;
    if (fromUser) return String(fromUser);
    const ownProfile = (safeAlumniContacts || []).find((entry) => {
      const uId = String(entry.userId || entry.user_id || entry.user?.id || '');
      return uId && uId === String(currentUserId);
    });
    return ownProfile?.id ? String(ownProfile.id) : '';
  }, [currentUser, safeAlumniContacts, currentUserId]);

  const currentChatUser = useMemo(() => {
    const ownProfile = (safeAlumniContacts || []).find((entry) => {
      const uId = String(entry.userId || entry.user_id || entry.user?.id || '');
      return (uId && uId === String(currentUserId)) || (currentAlumniId && String(entry.id) === currentAlumniId);
    });

    return normalizeChatUser({
      ...ownProfile,
      id: ownProfile?.id || currentAlumniId,
      userId: currentUserId,
      username: currentUser?.username,
      email: currentUser?.email,
      profileImage: ownProfile?.profileImage
    });
  }, [safeAlumniContacts, currentUser, currentUserId, currentAlumniId]);

  const alumniSearchContacts = useMemo(() => {
    const seen = new Set();

    return (safeAlumniContacts || [])
      .filter(isSearchableAlumniAccount)
      .map((entry) => {
        const contact = normalizeChatUser(entry);
        return {
          ...contact,
          searchText: buildAlumniSearchText(entry, contact)
        };
      })
      .filter((contact) => {
        if (!contact.userId || seen.has(contact.userId)) return false;
        if (contact.userId === currentUserId) return false;
        if (currentAlumniId && (contact.alumniId === currentAlumniId || contact.userId === `alumni-${currentAlumniId}`)) {
          return false;
        }
        seen.add(contact.userId);
        return true;
      })
      .sort((first, second) => first.displayName.localeCompare(second.displayName));
  }, [safeAlumniContacts, currentUserId, currentAlumniId]);

  const knownProfilesByUserId = useMemo(() => {
    const profiles = new Map();

    [
      ...alumniSearchContacts,
      ...Object.values(missingProfiles),
      ...staffContacts.map((entry) => normalizeChatUser(entry))
    ].forEach((profile) => {
      if (profile.userId) {
        profiles.set(String(profile.userId), profile);
      }
      if (profile.alumniId) {
        profiles.set(String(profile.alumniId), profile);
        profiles.set(`alumni-${profile.alumniId}`, profile);
      }
    });

    return profiles;
  }, [alumniSearchContacts, missingProfiles, staffContacts]);

  useEffect(() => {
    const missingUserIds = Object.values(conversationSummaries)
      .map((summary) => String(summary?.otherUserId || summary?.otherUser?.userId || ''))
      .filter((id) => id && id !== currentUserId && !knownProfilesByUserId.has(id) && !missingProfiles[id]);

    if (!missingUserIds.length) return;

    alumniService
      .getAllAlumni()
      .then((list) => {
        const newlyFound = {};
        (list || []).forEach((item) => {
          const uId = String(item.userId || item.user_id || item.user?.id || '');
          const altId = item.id ? `alumni-${item.id}` : '';
          const norm = normalizeChatUser(item);
          if (uId && missingUserIds.includes(uId)) {
            newlyFound[uId] = norm;
          }
          if (altId && missingUserIds.includes(altId)) {
            newlyFound[altId] = norm;
          }
        });
        if (Object.keys(newlyFound).length > 0) {
          setMissingProfiles((prev) => ({ ...prev, ...newlyFound }));
        }
      })
      .catch((err) => console.warn('Failed to fetch missing chat profiles:', err));
  }, [conversationSummaries, currentUserId, knownProfilesByUserId, missingProfiles]);

  const conversationContacts = useMemo(
    () =>
      Object.entries(conversationSummaries)
        .filter(([, summary]) => {
          const isBlocked = isBlockedConversationStatus(getConversationStatus(summary));
          const contexts = summary?.contexts || [];
          const hasMessagesInContext = contexts.includes(chatContext) && Boolean(summary?.latestMessageText);
          return hasMessagesInContext || isBlocked;
        })
        .map(([summaryChatId, summary]) => {
          const otherUserId = String(summary?.otherUserId || summary?.otherUser?.userId || '');
          if (!otherUserId || otherUserId === currentUserId) return null;

          const profile = knownProfilesByUserId.get(otherUserId) || {};
          const rawSummaryUser = summary.otherUser || {};
          const safeSummaryDisplayName =
            rawSummaryUser.displayName && !rawSummaryUser.displayName.includes('@')
              ? rawSummaryUser.displayName
              : '';
          const safeSummaryUsername =
            rawSummaryUser.username && !rawSummaryUser.username.includes('@')
              ? rawSummaryUser.username
              : '';

          const contact = normalizeChatUser({
            ...profile,
            ...rawSummaryUser,
            userId: otherUserId,
            chatId: summary.chatId || summaryChatId,
            displayName:
              profile.displayName ||
              safeSummaryDisplayName ||
              safeSummaryUsername ||
              'User',
            role: rawSummaryUser.role || profile.role || ''
          });

          return {
            ...contact,
            chatId: summary.chatId || summaryChatId,
            summary,
            status: statuses[contact.userId] || null
          };
        })
        .filter(Boolean)
        .filter((contact) => !isGenericChatContact(contact) || Boolean(contact.summary)),
    [chatContext, conversationSummaries, currentUserId, knownProfilesByUserId, statuses]
  );

  const messageRequests = useMemo(
    () =>
      conversationContacts
        .filter((contact) => {
          const summary = contact.summary;
          const contexts = summary?.contexts || [];
          return (
            Boolean(summary?.latestMessageText) &&
            contexts.includes(chatContext) &&
            getConversationStatus(summary) === 'pending' &&
            String(summary?.requestTo || '') === String(currentUserId)
          );
        })
        .sort((first, second) => {
          const firstTime = first.summary?.latestMessageAt || first.summary?.updatedAt || 0;
          const secondTime = second.summary?.latestMessageAt || second.summary?.updatedAt || 0;
          return secondTime - firstTime;
        }),
    [chatContext, conversationContacts, currentUserId]
  );

  const sentRequests = useMemo(
    () =>
      conversationContacts
        .filter((contact) => {
          const summary = contact.summary;
          const contexts = summary?.contexts || [];
          return (
            Boolean(summary?.latestMessageText) &&
            contexts.includes(chatContext) &&
            getConversationStatus(contact.summary) === 'pending' &&
            String(contact.summary?.requestedBy || '') === String(currentUserId)
          );
        })
        .sort(sortByLatestActivity),
    [chatContext, conversationContacts, currentUserId]
  );

  const blockedContacts = useMemo(
    () =>
      conversationContacts
        .filter((contact) => didCurrentUserBlockSummary(contact.summary, currentUserId))
        .sort(sortByLatestActivity),
    [conversationContacts, currentUserId]
  );

  const blockedByOtherContacts = useMemo(
    () =>
      conversationContacts.filter(
        (contact) =>
          isBlockedConversationStatus(getConversationStatus(contact.summary)) &&
          !didCurrentUserBlockSummary(contact.summary, currentUserId)
      ),
    [conversationContacts, currentUserId]
  );

  const acceptedConversationContacts = useMemo(
    () =>
      conversationContacts
        .filter((contact) => {
          const summary = contact.summary;
          const contexts = summary?.contexts || [];
          return (
            Boolean(summary?.latestMessageText) &&
            contexts.includes(chatContext) &&
            getConversationStatus(contact.summary) === 'accepted'
          );
        })
        .sort(sortByLatestActivity),
    [chatContext, conversationContacts]
  );

  const recentSearchStorageKey = useMemo(
    () => (currentUserId ? `lccb_chat_recent_searches_${currentUserId}_${chatContext}` : ''),
    [currentUserId, chatContext]
  );

  useEffect(() => {
    if (!recentSearchStorageKey) {
      setRecentSearchList([]);
      return;
    }
    try {
      const raw = localStorage.getItem(recentSearchStorageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      setRecentSearchList(Array.isArray(parsed) ? parsed : []);
    } catch {
      setRecentSearchList([]);
    }
  }, [recentSearchStorageKey]);

  const addRecentSearch = (contact) => {
    if (!contact?.userId || !recentSearchStorageKey) return;
    const item = {
      userId: String(contact.userId),
      displayName: contact.displayName || 'User',
      profileImage: contact.profileImage || '',
      course: contact.course || '',
      batch: contact.batch || '',
      role: contact.role || ''
    };
    setRecentSearchList((prev) => {
      const next = [item, ...prev.filter((entry) => String(entry.userId) !== item.userId)].slice(0, 8);
      try {
        localStorage.setItem(recentSearchStorageKey, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const removeRecentSearch = (userIdToRemove) => {
    if (!recentSearchStorageKey) return;
    setRecentSearchList((prev) => {
      const next = prev.filter((entry) => String(entry.userId) !== String(userIdToRemove));
      try {
        localStorage.setItem(recentSearchStorageKey, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const recentSearchContacts = useMemo(() => {
    const conversationByUserId = new Map(conversationContacts.map((c) => [String(c.userId), c]));
    return recentSearchList
      .map((item) => {
        const uid = String(item.userId || '');
        if (!uid || uid === String(currentUserId)) return null;
        const known = knownProfilesByUserId.get(uid) || {};
        const conv = conversationByUserId.get(uid) || {};
        return {
          ...item,
          ...known,
          ...conv,
          userId: uid,
          displayName: conv.displayName || known.displayName || item.displayName || 'User',
          profileImage: conv.profileImage || known.profileImage || item.profileImage || '',
          status: statuses[uid] || conv.status || null
        };
      })
      .filter(Boolean);
  }, [recentSearchList, conversationContacts, currentUserId, knownProfilesByUserId, statuses]);

  const yourChattedContacts = useMemo(() => {
    const seen = new Set();
    const result = [];
    [...acceptedConversationContacts, ...sentRequests, ...messageRequests].forEach((contact) => {
      const uid = String(contact?.userId || '');
      if (!uid || seen.has(uid)) return;
      seen.add(uid);
      result.push(contact);
    });
    return result;
  }, [acceptedConversationContacts, sentRequests, messageRequests]);

  const searchResults = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];

    const conversationByUserId = new Map(conversationContacts.map((contact) => [String(contact.userId), contact]));
    const seen = new Set();
    const combined = [];

    conversationContacts.forEach((contact) => {
      const uid = String(contact.userId || '');
      if (!uid || seen.has(uid)) return;
      const haystack = [
        contact.displayName,
        contact.username,
        contact.email,
        contact.course,
        contact.batch,
        contact.searchText
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (haystack.includes(term)) {
        seen.add(uid);
        combined.push(contact);
      }
    });

    alumniSearchContacts.forEach((contact) => {
      const uid = String(contact.userId || '');
      if (!uid || seen.has(uid)) return;
      if (String(contact.searchText || '').includes(term) || String(contact.displayName || '').toLowerCase().includes(term)) {
        seen.add(uid);
        const existingConv = conversationByUserId.get(uid);
        combined.push({
          ...(existingConv || {}),
          ...contact,
          chatId: existingConv?.chatId || getChatId(currentUserId, contact.userId),
          summary: existingConv?.summary || null,
          status: statuses[contact.userId] || null
        });
      }
    });

    return combined;
  }, [alumniSearchContacts, conversationContacts, currentUserId, search, statuses]);

  const selectableContacts = useMemo(
    () => [
      ...acceptedConversationContacts,
      ...messageRequests,
      ...sentRequests,
      ...blockedContacts,
      ...blockedByOtherContacts,
      ...searchResults
    ],
    [acceptedConversationContacts, blockedByOtherContacts, blockedContacts, messageRequests, searchResults, sentRequests]
  );

  const statusUserIds = useMemo(() => {
    const ids = new Set();

    Object.values(conversationSummaries).forEach((summary) => {
      const otherUserId = String(summary?.otherUserId || summary?.otherUser?.userId || '');
      if (otherUserId) ids.add(otherUserId);
    });

    if (search.trim()) {
      alumniSearchContacts.forEach((contact) => {
        if (contact.userId) ids.add(contact.userId);
      });
    }

    return Array.from(ids).sort();
  }, [alumniSearchContacts, conversationSummaries, search]);

  const statusUserIdKey = useMemo(() => statusUserIds.join('|'), [statusUserIds]);

  const selectedContact = useMemo(() => {
    if (!selectedContactId) return null;
    const fromSelectable = selectableContacts.find((contact) => String(contact.userId) === String(selectedContactId));
    if (fromSelectable) return fromSelectable;
    const fromAlumniSearch = alumniSearchContacts.find((contact) => String(contact.userId) === String(selectedContactId));
    if (fromAlumniSearch) return fromAlumniSearch;
    const fromKnown = knownProfilesByUserId.get(String(selectedContactId));
    if (fromKnown) return fromKnown;
    const fromStaff = staffContacts.find((contact) => String(contact.userId) === String(selectedContactId));
    if (fromStaff) return fromStaff;
    if (externalContact && String(externalContact.userId) === String(selectedContactId)) {
      return normalizeChatUser(externalContact);
    }
    return null;
  }, [
    selectableContacts,
    selectedContactId,
    alumniSearchContacts,
    knownProfilesByUserId,
    staffContacts,
    externalContact
  ]);

  const selectedChatId = selectedContact
    ? resolveContactChatId(currentUserId, selectedContact, conversationSummaries)
    : '';
  const selectedSummary = selectedChatId ? conversationSummaries[selectedChatId] : null;
  const selectedUnreadCount = Number(selectedSummary?.unreadCount) || 0;
  const selectedConversationStatus = getConversationStatus(selectedSummary);
  const hasMessagesInCurrentContext = visibleMessages.length > 0;
  const hasContextInSummary = Boolean(
    selectedSummary &&
    (selectedSummary.contexts || []).includes(chatContext) &&
    selectedSummary.latestMessageText
  );
  const isRequestActiveInCurrentContext =
    hasMessagesInCurrentContext &&
    hasContextInSummary &&
    selectedConversationStatus === 'pending';

  const isSelectedIncomingRequest =
    isRequestActiveInCurrentContext &&
    String(selectedSummary?.requestTo || '') === String(currentUserId);
  const isSelectedOutgoingRequest =
    isRequestActiveInCurrentContext &&
    String(selectedSummary?.requestedBy || '') === String(currentUserId);
  const isSelectedBlocked = isBlockedConversationStatus(selectedConversationStatus);
  const didCurrentUserBlockSelected = didCurrentUserBlockSummary(selectedSummary, currentUserId);
  const canSendMessage =
    selectedContact &&
    !isSelectedIncomingRequest &&
    !isSelectedBlocked;

  const totalUnread = useMemo(
    () =>
      Object.values(conversationSummaries).reduce(
        (sum, summary) => sum + (Number(summary?.unreadCount) || 0),
        0
      ),
    [conversationSummaries]
  );

  const alumniUnreadCount = useMemo(
    () =>
      Object.values(conversationSummaries).reduce((sum, summary) => {
        const contexts = summary?.contexts || [];
        return contexts.includes('alumni') ? sum + (Number(summary?.unreadCount) || 0) : sum;
      }, 0),
    [conversationSummaries]
  );

  const employmentUnreadCount = useMemo(
    () =>
      Object.values(conversationSummaries).reduce((sum, summary) => {
        const contexts = summary?.contexts || [];
        return contexts.includes('employment') ? sum + (Number(summary?.unreadCount) || 0) : sum;
      }, 0),
    [conversationSummaries]
  );

  useEffect(() => {
    let isMounted = true;

    const loadStaffContacts = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/auth/teachers`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (!response.ok) return;

        const records = await response.json();
        if (!isMounted || !Array.isArray(records)) return;

        setStaffContacts(
          records.map((staff) => ({
            id: `staff-${staff.id}`,
            userId: staff.id,
            user_id: staff.id,
            displayName: staff.username || staff.email || 'Admin',
            username: staff.username || staff.email || 'Admin',
            email: staff.email || '',
            profileImage: staff.profile_image || staff.profileImage || '',
            role: staff.role || 'ADMIN'
          }))
        );
      } catch (loadError) {
        console.warn('Unable to load admin chat contacts:', loadError);
      }
    };

    loadStaffContacts();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!currentUserId) return undefined;
    return listenToConversationSummaries(
      currentUserId,
      (nextSummaries) => {
        setConversationSummaries((previousSummaries) =>
          areConversationSummaryMapsEqual(previousSummaries, nextSummaries)
            ? previousSummaries
            : nextSummaries
        );
      },
      (err) => {
        if (
          err?.code === 'PERMISSION_DENIED' ||
          String(err?.message || '').includes('PERMISSION_DENIED') ||
          String(err?.message || '').includes('Permission denied')
        ) {
          setError(
            'Firebase Realtime Database Permission Denied. To restore your chat & conversations, please update the Rules in Firebase Console.'
          );
        }
      }
    );
  }, [currentUserId]);

  useEffect(() => {
    const ids = statusUserIdKey ? statusUserIdKey.split('|') : [];
    return listenToUserStatuses(ids, (nextStatuses) => {
      setStatuses((previousStatuses) =>
        areStatusMapsEqual(previousStatuses, nextStatuses) ? previousStatuses : nextStatuses
      );
    });
  }, [statusUserIdKey]);

  useEffect(() => {
    if (!selectedChatId) {
      setMessages([]);
      return undefined;
    }
    return listenToMessages(selectedChatId, setMessages, (err) => {
      if (
        err?.code === 'PERMISSION_DENIED' ||
        String(err?.message || '').includes('PERMISSION_DENIED') ||
        String(err?.message || '').includes('Permission denied')
      ) {
        setError(
          'Firebase Realtime Database Permission Denied. Set ".read": true and ".write": true in Firebase Console.'
        );
      }
    });
  }, [selectedChatId]);

  useEffect(() => {
    if (!currentUserId || !selectedChatId || selectedUnreadCount <= 0 || !isOpen || isClosing) return;
    markConversationRead(currentUserId, selectedChatId).catch(() => {});
  }, [currentUserId, isClosing, isOpen, messages.length, selectedChatId, selectedUnreadCount]);

  useEffect(() => {
    if (!isOpen) {
      scrolledChatIdRef.current = null;
      previousMessageCountRef.current = 0;
    }
  }, [isOpen]);

  useEffect(() => {
    scrolledChatIdRef.current = null;
    previousMessageCountRef.current = 0;
  }, [chatContext]);

  useLayoutEffect(() => {
    if (!visibleMessages.length) return;

    if (scrolledChatIdRef.current !== selectedChatId) {
      scrolledChatIdRef.current = selectedChatId;
      previousMessageCountRef.current = visibleMessages.length;
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
      requestAnimationFrame(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
      });
    } else if (visibleMessages.length > previousMessageCountRef.current) {
      previousMessageCountRef.current = visibleMessages.length;
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [selectedChatId, visibleMessages]);

  useEffect(() => {
    if (messageRequests.length > 0) {
      setShowMessageRequests(true);
    }
  }, [messageRequests.length]);

  useEffect(() => {
    if (sentRequests.length > 0) {
      setShowSentRequests(true);
    }
  }, [sentRequests.length]);

  useEffect(() => {
    if (!selectedContactId) {
      if (acceptedConversationContacts.length > 0) {
        setSelectedContactId(acceptedConversationContacts[0].userId);
      } else if (messageRequests.length > 0) {
        setSelectedContactId(messageRequests[0].userId);
      } else if (sentRequests.length > 0) {
        setSelectedContactId(sentRequests[0].userId);
      }
    }
  }, [acceptedConversationContacts, messageRequests, sentRequests, selectedContactId]);



  useEffect(
    () => () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
    },
    []
  );

  useEffect(() => {
    if (!lightboxState) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setLightboxState(null);
      } else if (event.key === 'ArrowLeft' && lightboxState.items?.length > 1) {
        setLightboxState((prev) => ({
          ...prev,
          index: (prev.index - 1 + prev.items.length) % prev.items.length
        }));
      } else if (event.key === 'ArrowRight' && lightboxState.items?.length > 1) {
        setLightboxState((prev) => ({
          ...prev,
          index: (prev.index + 1) % prev.items.length
        }));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxState]);

  const addFilesToAttachments = (fileList) => {
    if (!fileList || !fileList.length) return;
    const incomingFiles = Array.from(fileList);
    const valid = [];

    for (const file of incomingFiles) {
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        setError('Only image and video files are supported.');
        continue;
      }
      if (file.size > 50 * 1024 * 1024) {
        setError(`File "${file.name}" is too large (max 50MB).`);
        continue;
      }
      const previewUrl = URL.createObjectURL(file);
      const isVideo = file.type.startsWith('video/');
      valid.push({
        file,
        previewUrl,
        mediaType: isVideo ? 'video' : 'image',
        fileName: file.name,
        fileSize: file.size
      });
    }

    if (valid.length) {
      setError('');
      setPendingAttachments((prev) => [...prev, ...valid].slice(0, 10));
    }
  };

  const handleFileSelect = (event) => {
    addFilesToAttachments(event.target.files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (indexToRemove) => {
    setPendingAttachments((prev) => {
      const removed = prev[indexToRemove];
      if (removed?.previewUrl) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      return prev.filter((_, idx) => idx !== indexToRemove);
    });
  };

  const handlePaste = (event) => {
    const items = event.clipboardData?.items;
    if (!items) return;

    const files = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/') || items[i].type.startsWith('video/')) {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length) {
      event.preventDefault();
      addFilesToAttachments(files);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isDraggingOver) {
      setIsDraggingOver(true);
    }
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsDraggingOver(false);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOver(false);
    if (event.dataTransfer?.files?.length) {
      addFilesToAttachments(event.dataTransfer.files);
    }
  };

  const handleStartReply = (message) => {
    setActiveActionMenuId(null);
    if (!message || message.isUnsent) return;
    const isOwn = String(message.senderId) === String(currentUserId);
    const payload = parseMessagePayload(message.message || message.text, message.type);
    const resolvedText = (message.text !== undefined && message.text !== null && message.text !== '')
      ? message.text
      : payload.text;
    const resolvedMediaUrl = message.mediaUrl || message.mediaItems?.[0]?.url || payload.mediaUrl || payload.mediaItems?.[0]?.url || '';
    const resolvedMediaType = message.mediaType || message.mediaItems?.[0]?.mediaType || payload.mediaType || payload.mediaItems?.[0]?.mediaType || '';
    setReplyingTo({
      id: message.id,
      senderId: message.senderId,
      senderName: isOwn ? 'You' : (selectedContact?.displayName || 'User'),
      text: resolvedText || (resolvedMediaUrl ? (resolvedMediaType === 'video' ? '[Video]' : '[Photo]') : ''),
      mediaUrl: resolvedMediaUrl,
      mediaType: resolvedMediaType
    });
    setTimeout(() => {
      messageInputRef.current?.focus();
    }, 50);
  };

  const handleUnsend = async (messageId) => {
    setActiveActionMenuId(null);
    if (!messageId) return;
    try {
      setUnsendingMessageId(messageId);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, isUnsent: true, text: '', mediaItems: [], mediaUrl: '', replyTo: null }
            : msg
        )
      );
      await unsendMessage(messageId, selectedChatId);
    } catch (err) {
      console.error('Failed to unsend message:', err);
      setError(err.message || 'Failed to unsend message.');
    } finally {
      setUnsendingMessageId(null);
    }
  };

  useEffect(() => {
    const handleDocumentClick = () => {
      setActiveActionMenuId(null);
    };
    if (activeActionMenuId) {
      document.addEventListener('click', handleDocumentClick);
    }
    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, [activeActionMenuId]);

  const handleSendMessage = async (event) => {
    event?.preventDefault?.();
    if (!messageText.trim() && !pendingAttachments.length) return;
    if (isSending || isUploadingMedia) return;

    setError('');
    const textToSend = messageText.trim();
    const attachmentsToSend = [...pendingAttachments];
    const replyToSend = replyingTo;

    setMessageText('');
    setPendingAttachments([]);
    setReplyingTo(null);

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
      id: tempId,
      senderId: currentChatUser.userId,
      receiverId: selectedContact.userId,
      text: textToSend,
      mediaItems: attachmentsToSend.map((att) => ({
        url: att.previewUrl,
        mediaType: att.mediaType,
        fileName: att.fileName
      })),
      mediaUrl: attachmentsToSend[0]?.previewUrl || '',
      mediaType: attachmentsToSend[0]?.mediaType || '',
      fileName: attachmentsToSend[0]?.fileName || '',
      replyTo: replyToSend,
      context: chatContext,
      timestamp: new Date().toISOString(),
      status: 'sending'
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      let uploadedMediaItems = [];

      if (attachmentsToSend.length > 0) {
        setIsUploadingMedia(true);
        const filesToUpload = attachmentsToSend.map((att) => att.file);
        const uploadResults = await uploadChatMedia(filesToUpload);
        uploadedMediaItems = uploadResults.map((res) => ({
          url: res.url,
          mediaType: res.mediaType,
          fileName: res.fileName
        }));
      }

      await sendChatMessage({
        sender: currentChatUser,
        receiver: selectedContact,
        text: textToSend,
        mediaItems: uploadedMediaItems,
        mediaUrl: uploadedMediaItems[0]?.url || '',
        mediaType: uploadedMediaItems[0]?.mediaType || '',
        fileName: uploadedMediaItems[0]?.fileName || '',
        context: chatContext,
        replyTo: replyToSend
      });

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempId
            ? { ...msg, mediaItems: uploadedMediaItems, mediaUrl: uploadedMediaItems[0]?.url || '', status: 'sent' }
            : msg
        )
      );
    } catch (sendError) {
      setError(sendError.message || 'Unable to send message.');
      setMessageText(textToSend);
      if (attachmentsToSend.length > 0) {
        setPendingAttachments(attachmentsToSend);
      }
      setMessages((prev) => prev.map((msg) => (msg.id === tempId ? { ...msg, status: 'error' } : msg)));
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const handleAcceptRequest = async (contact) => {
    const chatId = contact?.chatId || resolveContactChatId(currentUserId, contact, conversationSummaries);
    if (!chatId || requestActionId) return;

    setError('');
    setRequestActionId(chatId);
    try {
      await acceptMessageRequest({ chatId, currentUserId });
      setSelectedContactId(contact.userId);
    } catch (acceptError) {
      setError(acceptError.message || 'Unable to accept this message request.');
    } finally {
      setRequestActionId('');
    }
  };

  const handleBlockRequest = async (contact) => {
    const chatId = contact?.chatId || resolveContactChatId(currentUserId, contact, conversationSummaries);
    if (!chatId || requestActionId) return;

    setError('');
    setRequestActionId(chatId);
    try {
      await blockMessageRequest({ chatId, currentUserId });
      if (selectedContactId === contact.userId) {
        setSelectedContactId(contact.userId);
      }
    } catch (blockError) {
      setError(blockError.message || 'Unable to block this user.');
    } finally {
      setRequestActionId('');
    }
  };

  const handleUnblockUser = async (contact) => {
    const chatId = contact?.chatId || resolveContactChatId(currentUserId, contact, conversationSummaries);
    if (!chatId || requestActionId) return;

    setError('');
    setRequestActionId(chatId);
    try {
      await unblockChatUser({ chatId, currentUserId });
      setSelectedContactId(contact.userId);
      setShowMessageRequests(true);
    } catch (unblockError) {
      setError(unblockError.message || 'Unable to unblock this user.');
    } finally {
      setRequestActionId('');
    }
  };

  const openChatWindow = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setIsClosing(false);
    setChatContext(initialChatContext === 'employment' ? 'employment' : 'alumni');
    setSelectedContactId('');
    setError('');
    setIsOpen(true);
  };

  const closeChatWindow = () => {
    if (!isOpen || isClosing) return;

    setIsClosing(true);
    closeTimerRef.current = window.setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      closeTimerRef.current = null;
    }, 240);
  };

  if (!currentUserId) return null;

  return (
    <div className="lccb-chat-widget fixed bottom-5 right-5 z-[90]">
      <section
        role="dialog"
        aria-label="Messages"
        aria-hidden={!isOpen && !isClosing}
        className={`lccb-chat-panel ${isOpen ? 'lccb-chat-panel--open' : ''} ${
          isClosing ? 'lccb-chat-panel--closing' : ''
        } flex h-[min(680px,calc(100vh-40px))] w-[min(900px,calc(100vw-40px))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl`}
      >
        <div className="lccb-chat-panel-content flex h-full w-full">
          <aside className={`flex flex-col border-r border-slate-200 bg-slate-50 md:w-80 md:shrink-0 ${selectedContact ? 'hidden md:flex' : 'w-full'}`}>
            <div className="border-b border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div>
                    <h3 className="text-lg font-bold tracking-tight text-slate-900">Messages</h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeChatWindow}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                  aria-label="Close chat"
                >
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 0 1 1.414 0L10 8.586l4.293-4.293a1 1 0 1 1 1.414 1.414L11.414 10l4.293 4.293a1 1 0 0 1-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 0 1-1.414-1.414L8.586 10 4.293 5.707a1 1 0 0 1 0-1.414Z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              <div className="mt-3 flex items-center border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setChatContext('alumni');
                    setSelectedContactId('');
                    setError('');
                  }}
                  className={`group relative flex flex-1 items-center justify-center gap-2 pb-2.5 pt-1 text-xs font-semibold transition-all ${
                    chatContext === 'alumni'
                      ? 'text-blue-600'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <svg
                    className={`h-4 w-4 transition-colors ${
                      chatContext === 'alumni' ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  <span>Alumni</span>
                  {alumniUnreadCount > 0 && (
                    <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold leading-none text-white">
                      {alumniUnreadCount}
                    </span>
                  )}
                  {chatContext === 'alumni' && (
                    <span className="absolute -bottom-px left-2 right-2 h-0.5 rounded-full bg-blue-600 transition-all" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setChatContext('employment');
                    setSelectedContactId('');
                    setError('');
                  }}
                  className={`group relative flex flex-1 items-center justify-center gap-2 pb-2.5 pt-1 text-xs font-semibold transition-all ${
                    chatContext === 'employment'
                      ? 'text-blue-600'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <svg
                    className={`h-4 w-4 transition-colors ${
                      chatContext === 'employment' ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  <span>Employment</span>
                  {employmentUnreadCount > 0 && (
                    <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold leading-none text-white">
                      {employmentUnreadCount}
                    </span>
                  )}
                  {chatContext === 'employment' && (
                    <span className="absolute -bottom-px left-2 right-2 h-0.5 rounded-full bg-blue-600 transition-all" />
                  )}
                </button>
              </div>
              <div className="mt-4 flex items-center gap-2">
                {(isSearchFocused || Boolean(search.trim())) && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsSearchFocused(false);
                      setSearch('');
                    }}
                    className="animate-chat-search-back inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                    aria-label="Back to conversations"
                    title="Back"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                  </button>
                )}
                <div className="relative flex-1">
                  <svg
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                  <input
                    type="search"
                    value={search}
                    onFocus={() => setIsSearchFocused(true)}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search people"
                    className="w-full rounded-full border border-slate-200 bg-slate-100/80 py-2 pl-9 pr-4 text-sm text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {search.trim() ? (
                <div key="chat-search-results-view" className="animate-chat-search-view">
                  <div className="px-2 pb-2 pt-1 text-xs font-semibold text-slate-500">
                    Search results
                  </div>
                  {searchResults.length === 0 ? (
                    <div className="px-4 py-5 text-center text-sm text-slate-500">No alumni found.</div>
                  ) : (
                    searchResults.map((contact) => {
                      const isSelected = selectedContactId === contact.userId;
                      const contactStatus = getConversationStatus(contact.summary);
                      const isOutgoingSearchRequest =
                        contactStatus === 'pending' &&
                        Boolean(contact.summary?.latestMessageText) &&
                        (contact.summary?.contexts || []).includes(chatContext) &&
                        String(contact.summary?.requestedBy || '') === String(currentUserId);
                      const isIncomingSearchRequest =
                        contactStatus === 'pending' &&
                        Boolean(contact.summary?.latestMessageText) &&
                        (contact.summary?.contexts || []).includes(chatContext) &&
                        String(contact.summary?.requestTo || '') === String(currentUserId);
                      const didCurrentUserBlockSearchContact = didCurrentUserBlockSummary(contact.summary, currentUserId);
                      return (
                        <button
                          type="button"
                          key={`search-${contact.userId}`}
                          onClick={() => {
                            addRecentSearch(contact);
                            setSelectedContactId(contact.userId);
                            setIsSearchFocused(false);
                            setSearch('');
                            setError('');
                          }}
                          className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                            isSelected ? 'bg-white shadow-sm ring-1 ring-blue-100' : 'hover:bg-white hover:shadow-sm'
                          }`}
                        >
                          <ContactAvatar contact={contact} status={contact.status} />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-2">
                              <span className="truncate text-sm font-semibold text-slate-950">{contact.displayName}</span>
                              {didCurrentUserBlockSearchContact && (
                                <span
                                  role="button"
                                  tabIndex={0}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleUnblockUser(contact);
                                  }}
                                  onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      handleUnblockUser(contact);
                                    }
                                  }}
                                  className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 ring-1 ring-blue-100 transition hover:bg-blue-100"
                                >
                                  Unblock
                                </span>
                              )}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-slate-500">
                              {isOutgoingSearchRequest
                                ? 'Message request sent'
                                : isIncomingSearchRequest
                                  ? 'Message request received'
                                  : isBlockedConversationStatus(contactStatus)
                                    ? didCurrentUserBlockSearchContact
                                      ? 'You blocked this user'
                                      : 'You cannot message this user'
                                    : [contact.course, contact.batch].filter(Boolean).join(' • ') || 'Start a new chat'}
                            </span>
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              ) : isSearchFocused ? (
                <div key="chat-search-recent-view" className="animate-chat-search-view">
                  <div className="px-2 pb-1.5 pt-1 text-xs font-semibold text-slate-500">
                    Recent searches
                  </div>
                  {recentSearchContacts.length === 0 ? (
                    <div className="px-3 py-2.5 text-xs text-slate-400">No recent searches</div>
                  ) : (
                    recentSearchContacts.map((contact) => {
                      const isSelected = selectedContactId === contact.userId;
                      return (
                        <div
                          role="button"
                          tabIndex={0}
                          key={`recent-search-${contact.userId}`}
                          onClick={() => {
                            addRecentSearch(contact);
                            setSelectedContactId(contact.userId);
                            setIsSearchFocused(false);
                            setSearch('');
                            setError('');
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              addRecentSearch(contact);
                              setSelectedContactId(contact.userId);
                              setIsSearchFocused(false);
                              setSearch('');
                              setError('');
                            }
                          }}
                          className={`mb-1 flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition ${
                            isSelected ? 'bg-white shadow-sm ring-1 ring-blue-100' : 'hover:bg-white hover:shadow-sm'
                          }`}
                        >
                          <span className="flex min-w-0 flex-1 items-center gap-3">
                            <ContactAvatar contact={contact} status={contact.status} />
                            <span className="truncate text-sm font-medium text-slate-900">{contact.displayName}</span>
                          </span>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              removeRecentSearch(contact.userId);
                            }}
                            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200/70 text-slate-500 transition hover:bg-slate-300 hover:text-slate-800"
                            aria-label={`Remove ${contact.displayName} from recent searches`}
                            title="Remove"
                          >
                            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      );
                    })
                  )}

                  <div className="mt-3 px-2 pb-1.5 pt-1 text-xs font-semibold text-slate-500">
                    Your contacts
                  </div>
                  {yourChattedContacts.length === 0 ? (
                    <div className="px-3 py-2.5 text-xs text-slate-400">No contacts yet</div>
                  ) : (
                    yourChattedContacts.map((contact) => {
                      const isSelected = selectedContactId === contact.userId;
                      return (
                        <button
                          type="button"
                          key={`your-contact-${contact.userId}`}
                          onClick={() => {
                            addRecentSearch(contact);
                            setSelectedContactId(contact.userId);
                            setIsSearchFocused(false);
                            setSearch('');
                            setError('');
                          }}
                          className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition ${
                            isSelected ? 'bg-white shadow-sm ring-1 ring-blue-100' : 'hover:bg-white hover:shadow-sm'
                          }`}
                        >
                          <ContactAvatar contact={contact} status={contact.status} />
                          <span className="truncate text-sm font-medium text-slate-900">{contact.displayName}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              ) : (
                <div key="chat-conversations-view" className="animate-chat-search-view">
                  {messageRequests.length > 0 && (
                    <div className="mb-3">
                      <button
                        type="button"
                        onClick={() => setShowMessageRequests((previous) => !previous)}
                        className="flex w-full items-center justify-between rounded-lg px-2 pb-2 pt-1 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500 transition hover:bg-white"
                        aria-expanded={showMessageRequests}
                      >
                        <span>Message Requests</span>
                        <span className={`lccb-chat-chevron ${showMessageRequests ? 'lccb-chat-chevron--open' : ''}`}>
                          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" clipRule="evenodd" />
                          </svg>
                        </span>
                      </button>
                      <div className={`lccb-chat-requests ${showMessageRequests ? 'lccb-chat-requests--open' : 'lccb-chat-requests--closed'}`}>
                        {messageRequests.map((contact) => {
                          const isSelected = selectedContactId === contact.userId;
                          return (
                            <div
                              role="button"
                              tabIndex={0}
                              key={`request-${contact.userId}`}
                              onClick={() => {
                                setSelectedContactId(contact.userId);
                                setError('');
                              }}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault();
                                  setSelectedContactId(contact.userId);
                                  setError('');
                                }
                              }}
                              className={`mb-2 w-full rounded-xl border px-3 py-3 text-left transition ${
                                isSelected
                                  ? 'border-blue-200 bg-white shadow-sm ring-1 ring-blue-100'
                                  : 'border-amber-200 bg-amber-50 hover:bg-white hover:shadow-sm'
                              }`}
                            >
                              <span className="flex items-start gap-3">
                                <ContactAvatar contact={contact} status={contact.status} />
                                <span className="min-w-0 flex-1">
                                  <span className="flex items-center justify-between gap-2">
                                    <span className="truncate text-sm font-semibold text-slate-950">{contact.displayName}</span>
                                    <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
                                      {getRoleLabel(contact.role)}
                                    </span>
                                  </span>
                                  <span className="mt-0.5 block truncate text-xs text-slate-600">
                                    {formatConversationSnippet(contact.summary, contact, currentUserId) || 'New message request'}
                                  </span>
                                </span>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {sentRequests.length > 0 && (
                    <div className="mb-3">
                      <button
                        type="button"
                        onClick={() => setShowSentRequests((previous) => !previous)}
                        className="flex w-full items-center justify-between rounded-lg px-2 pb-2 pt-1 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500 transition hover:bg-white"
                        aria-expanded={showSentRequests}
                      >
                        <span className="inline-flex items-center gap-2">
                          Requests Sent
                          <span className="inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-blue-700 px-1.5 text-[10px] font-bold text-white">
                            {sentRequests.length > 99 ? '99+' : sentRequests.length}
                          </span>
                        </span>
                        <span className={`lccb-chat-chevron ${showSentRequests ? 'lccb-chat-chevron--open' : ''}`}>
                          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" clipRule="evenodd" />
                          </svg>
                        </span>
                      </button>
                      <div className={`lccb-chat-requests ${showSentRequests ? 'lccb-chat-requests--open' : 'lccb-chat-requests--closed'}`}>
                        {sentRequests.map((contact) => {
                          const isSelected = selectedContactId === contact.userId;
                          return (
                            <button
                              type="button"
                              key={`sent-${contact.userId}`}
                              onClick={() => {
                                setSelectedContactId(contact.userId);
                                setError('');
                              }}
                              className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${
                                isSelected ? 'bg-white shadow-sm ring-1 ring-blue-100' : 'hover:bg-white hover:shadow-sm'
                              }`}
                            >
                              <ContactAvatar contact={contact} status={contact.status} />
                              <span className="min-w-0 flex-1">
                                <span className="truncate text-sm font-semibold text-slate-950">{contact.displayName}</span>
                                <span className="mt-0.5 block truncate text-xs text-amber-700">Message request sent</span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {blockedContacts.length > 0 && (
                    <div className="mb-3">
                      <div className="px-2 pb-2 pt-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                        Blocked Users
                      </div>
                      {blockedContacts.map((contact) => {
                        const isSelected = selectedContactId === contact.userId;
                        const isBusy = requestActionId === contact.chatId;
                        return (
                          <button
                            type="button"
                            key={`blocked-${contact.userId}`}
                            onClick={() => {
                              setSelectedContactId(contact.userId);
                              setError('');
                            }}
                            className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${
                              isSelected ? 'bg-white shadow-sm ring-1 ring-blue-100' : 'hover:bg-white hover:shadow-sm'
                            }`}
                          >
                            <ContactAvatar contact={contact} status={contact.status} />
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center justify-between gap-2">
                                <span className="truncate text-sm font-semibold text-slate-950">{contact.displayName}</span>
                                <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 ring-1 ring-red-100">
                                  Blocked
                                </span>
                              </span>
                              <span className="mt-0.5 block truncate text-xs text-slate-500">
                                {isBusy ? 'Updating...' : 'Click to manage block'}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {acceptedConversationContacts.length > 0 && (
                    <div className="px-2 pb-2 pt-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                      Conversations
                    </div>
                  )}
                  {acceptedConversationContacts.map((contact) => {
                    const unreadCount = Number(contact.summary?.unreadCount) || 0;
                    const isSelected = selectedContactId === contact.userId;
                    return (
                      <button
                        type="button"
                        key={`conversation-${contact.userId}`}
                        onClick={() => {
                          setSelectedContactId(contact.userId);
                          setError('');
                        }}
                        className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${
                          isSelected ? 'bg-white shadow-sm ring-1 ring-blue-100' : 'hover:bg-white hover:shadow-sm'
                        }`}
                      >
                        <ContactAvatar contact={contact} status={contact.status} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-semibold text-slate-950">{contact.displayName}</span>
                            {unreadCount > 0 && (
                              <span className="inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-blue-700 px-1.5 text-xs font-bold text-white">
                                {unreadCount > 99 ? '99+' : unreadCount}
                              </span>
                            )}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-slate-500">
                            {formatConversationSnippet(contact.summary, contact, currentUserId)}
                          </span>
                        </span>
                      </button>
                    );
                  })}

                  {messageRequests.length === 0 &&
                    sentRequests.length === 0 &&
                    acceptedConversationContacts.length === 0 && (
                      <div className="px-4 py-8 text-center text-sm text-slate-500">
                        No conversations yet. Search alumni to start a chat.
                      </div>
                    )}
                </div>
              )}
            </div>
          </aside>

          <main
            key={selectedChatId || 'empty-chat'}
            onDragEnter={handleDragOver}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`lccb-chat-conversation relative flex min-w-0 flex-col bg-white md:flex-1 ${selectedContact ? 'w-full' : 'hidden md:flex'}`}
          >
            {/* Drag and Drop Overlay */}
            {isDraggingOver && canSendMessage && (
              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-blue-600/90 p-6 text-white backdrop-blur-xs border-4 border-dashed border-white pointer-events-none animate-in fade-in duration-150">
                <svg className="h-16 w-16 mb-2 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-lg font-bold">Drop photos or videos here</p>
                <p className="text-xs text-blue-100">Release to attach to your message</p>
              </div>
            )}
            {selectedContact ? (
              <>
                <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
                  <button
                    type="button"
                    onClick={() => setSelectedContactId('')}
                    className="mr-1 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 md:hidden"
                    aria-label="Back to conversations"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <ContactAvatar contact={selectedContact} status={statuses[selectedContact.userId]} />
                  <div className="min-w-0">
                    <h4 className="truncate text-sm font-bold text-slate-950">{selectedContact.displayName}</h4>
                    <p className="text-xs text-slate-500">
                      {isSelectedIncomingRequest
                        ? `${getRoleLabel(selectedContact.role)} message request`
                        : isSelectedOutgoingRequest
                          ? 'Request pending'
                          : formatLastActive(statuses[selectedContact.userId])}
                    </p>
                  </div>
                </div>

                {(isSelectedIncomingRequest || isSelectedOutgoingRequest || isSelectedBlocked) && (
                  <div className="lccb-chat-request-banner border-b border-slate-200 bg-amber-50 px-5 py-3">
                    {isSelectedIncomingRequest && (
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-amber-900">
                          {selectedContact.displayName} wants to start a conversation.
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              handleAcceptRequest({
                                ...selectedContact,
                                chatId: selectedChatId
                              })
                            }
                            disabled={requestActionId === selectedChatId}
                            className="rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-800 disabled:bg-slate-300"
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleBlockRequest({
                                ...selectedContact,
                                chatId: selectedChatId
                              })
                            }
                            disabled={requestActionId === selectedChatId}
                            className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:text-slate-400"
                          >
                            Block
                          </button>
                        </div>
                      </div>
                    )}
                    {isSelectedOutgoingRequest && (
                      <p className="text-sm text-amber-900">
                        Message request sent. You can continue sending messages, but the conversation will become active after this user accepts.
                      </p>
                    )}
                    {isSelectedBlocked && (
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-amber-900">
                          {didCurrentUserBlockSelected
                            ? 'You blocked this user. Unblock to allow messages again.'
                            : 'Message unavailable. You cannot send messages to this user.'}
                        </p>
                        {didCurrentUserBlockSelected && (
                          <button
                            type="button"
                            onClick={() =>
                              handleUnblockUser({
                                ...selectedContact,
                                chatId: selectedChatId
                              })
                            }
                            disabled={requestActionId === selectedChatId}
                            className="rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-800 disabled:bg-slate-300"
                          >
                            Unblock
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div ref={messagesContainerRef} className="min-h-0 flex-1 overflow-y-auto bg-slate-50 px-5 py-4">
                  {visibleMessages.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-center text-sm text-slate-500">
                      Start a conversation with {selectedContact.displayName}.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {visibleMessages.map((message, index) => {
                        const isOwn = String(message.senderId) === String(currentUserId);
                        const isLatestMessage = index === visibleMessages.length - 1;
                        const showStatus = isOwn && (message.status === 'error' || message.status === 'sending' || isLatestMessage);

                        const prevMessage = visibleMessages[index - 1];
                        const showDateSeparator = !prevMessage || isDifferentDay(prevMessage.timestamp, message.timestamp);

                        return (
                          <React.Fragment key={message.id}>
                            {showDateSeparator && (
                              <div className="flex justify-center my-4 select-none">
                                <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                                  {formatChatSeparatorDate(message.timestamp)}
                                </span>
                              </div>
                            )}
                            <div className="flex flex-col">
                              {/* Timestamp centered, animated on click */}
                              <div className={`overflow-hidden transition-all duration-300 ease-in-out flex justify-center w-full ${clickedMessageId === message.id ? 'max-h-6 opacity-100 mt-2 mb-1' : 'max-h-0 opacity-0 mt-0 mb-0'}`}>
                                <span className="text-[11px] text-slate-500 font-medium">
                                  {formatChatTime(message.timestamp)}
                                </span>
                              </div>

                              {/* Message Bubble or Unsent Tombstone */}
                              {message.isUnsent ? (
                                <div className={`lccb-chat-message flex ${isOwn ? 'justify-end' : 'justify-start'} my-0.5`}>
                                  <div className="rounded-full border border-slate-300/80 bg-slate-100/70 dark:bg-slate-800/60 px-3.5 py-1 text-xs italic text-slate-400 select-none">
                                    {isOwn ? 'You unsent a message' : `${selectedContact?.displayName || 'User'} unsent a message`}
                                  </div>
                                </div>
                              ) : (
                                (() => {
                                  const payload = parseMessagePayload(message.message || message.text, message.type);
                                  const mediaItems = (message.mediaItems && message.mediaItems.length > 0)
                                    ? message.mediaItems
                                    : (payload.mediaItems && payload.mediaItems.length > 0)
                                      ? payload.mediaItems
                                      : (message.mediaUrl || payload.mediaUrl)
                                        ? [{
                                            url: message.mediaUrl || payload.mediaUrl,
                                            mediaType: message.mediaType || payload.mediaType || 'image',
                                            fileName: message.fileName || payload.fileName || ''
                                          }]
                                        : [];

                                  const displayText = (message.text !== undefined && message.text !== null && message.text !== '')
                                    ? message.text
                                    : payload.text;

                                  const replyData = message.replyTo || payload.replyTo;
                                  const isReplyingToSelf = replyData
                                    ? String(replyData.senderId) === String(currentUserId)
                                    : false;
                                  const otherSenderName = (replyData?.senderName && replyData.senderName !== 'You')
                                    ? replyData.senderName
                                    : (selectedContact?.displayName || 'User');
                                  const replyHeaderLabel = replyData
                                    ? isOwn
                                      ? (isReplyingToSelf ? 'You replied to yourself' : `You replied to ${otherSenderName}`)
                                      : (isReplyingToSelf ? `${selectedContact?.displayName || otherSenderName} replied to you` : `${selectedContact?.displayName || otherSenderName} replied to themselves`)
                                    : '';

                                  const hasMedia = mediaItems.length > 0;
                                  const hasText = Boolean(displayText && displayText.trim());

                                  return (
                                    <div className={`group/msg relative lccb-chat-message flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                                      {/* Messenger-Style Reply Header & Quoted Bubble */}
                                      {replyData && (
                                        <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[78%] mt-1`}>
                                          <div className={`flex items-center gap-1.5 text-[11.5px] text-slate-400 dark:text-slate-400 mb-1 px-1 select-none ${isOwn ? 'justify-end' : 'justify-start'}`}>
                                            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                              <path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z" />
                                            </svg>
                                            <span>{replyHeaderLabel}</span>
                                          </div>
                                          <div
                                            onClick={() => setClickedMessageId(clickedMessageId === message.id ? null : message.id)}
                                            className={`w-fit max-w-full rounded-[18px] px-3.5 pt-2 pb-4 text-[13.5px] leading-snug select-none cursor-pointer ${
                                              isOwn
                                                ? 'bg-slate-200/80 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                                                : 'bg-slate-200/70 text-slate-600 dark:bg-slate-800/80 dark:text-slate-300'
                                            }`}
                                          >
                                            {replyData.mediaUrl && (
                                              <img
                                                src={replyData.mediaUrl}
                                                alt=""
                                                className={`h-12 w-12 rounded-xl object-cover opacity-80 ${
                                                  replyData.text && replyData.text !== '[Photo]' && replyData.text !== '[Video]' && replyData.text !== 'Attachment'
                                                    ? 'mb-1.5'
                                                    : ''
                                                }`}
                                              />
                                            )}
                                            {(!replyData.mediaUrl || (replyData.text && replyData.text !== '[Photo]' && replyData.text !== '[Video]' && replyData.text !== 'Attachment')) && (
                                              <p className="line-clamp-2 break-words">
                                                {replyData.text || 'Attachment'}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      )}

                                      <div className={`relative z-10 flex items-center w-full ${isOwn ? 'justify-end' : 'justify-start'} ${replyData ? '-mt-2.5' : ''}`}>
                                        {/* Action Buttons (Reply & Three-Dots) */}
                                        <div
                                          className={`flex items-center gap-1 transition-opacity ${
                                            isOwn ? 'order-first mr-1.5' : 'order-last ml-1.5'
                                          } ${activeActionMenuId === message.id ? 'opacity-100' : 'opacity-0 group-hover/msg:opacity-100'}`}
                                        >
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleStartReply(message);
                                            }}
                                            className="h-7 w-7 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors shadow-xs"
                                            title="Reply"
                                          >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                            </svg>
                                          </button>

                                          <div className="relative">
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveActionMenuId(activeActionMenuId === message.id ? null : message.id);
                                              }}
                                              className={`h-7 w-7 rounded-full ${
                                                activeActionMenuId === message.id
                                                  ? 'bg-slate-200 text-slate-800 dark:bg-slate-700'
                                                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                                              } flex items-center justify-center transition-colors shadow-xs`}
                                              title="More actions"
                                            >
                                              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                                <circle cx="12" cy="5" r="2" />
                                                <circle cx="12" cy="12" r="2" />
                                                <circle cx="12" cy="19" r="2" />
                                              </svg>
                                            </button>

                                            {/* Dropdown Menu Popup (Matches Messenger!) */}
                                            {activeActionMenuId === message.id && (
                                              <div
                                                onClick={(e) => e.stopPropagation()}
                                                className={`absolute bottom-full mb-1.5 ${
                                                  isOwn ? 'right-0' : 'left-0'
                                                } z-30 w-32 rounded-xl bg-slate-900 text-white shadow-xl py-1 border border-slate-700/80 animate-fade-in text-xs font-medium`}
                                              >
                                                {isOwn && (
                                                  <button
                                                    type="button"
                                                    onClick={() => handleUnsend(message.id)}
                                                    className="w-full text-left px-3 py-1.5 hover:bg-rose-900/40 text-rose-400 hover:text-rose-300 flex items-center gap-2 transition-colors"
                                                  >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                    Unsend
                                                  </button>
                                                )}
                                                <button
                                                  type="button"
                                                  onClick={() => handleStartReply(message)}
                                                  className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-slate-200 flex items-center gap-2 transition-colors"
                                                >
                                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                                  </svg>
                                                  Reply
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setActiveActionMenuId(null);
                                                    const copyText = displayText || message.text || message.message || '';
                                                    if (copyText) {
                                                      navigator.clipboard?.writeText(copyText);
                                                    }
                                                  }}
                                                  className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-slate-200 flex items-center gap-2 transition-colors"
                                                >
                                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                  </svg>
                                                  Copy
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        {(() => {
                                          // Standalone media (no text caption) -> Transparent container!
                                          if (hasMedia && !hasText) {
                                            return (
                                              <div
                                                onClick={() => setClickedMessageId(clickedMessageId === message.id ? null : message.id)}
                                                className="max-w-[85%] rounded-2xl overflow-hidden cursor-pointer"
                                              >
                                                {renderMessengerMediaGrid(mediaItems, (imgIndex) => {
                                                  setLightboxState({
                                                    items: mediaItems,
                                                    index: imgIndex
                                                  });
                                                })}
                                              </div>
                                            );
                                          }

                                          // Media with text caption -> Flush at top, caption underneath in matching bubble
                                          if (hasMedia && hasText) {
                                            const firstUrl = extractFirstUrl(displayText);
                                            return (
                                              <div
                                                onClick={() => setClickedMessageId(clickedMessageId === message.id ? null : message.id)}
                                                className={`cursor-pointer flex flex-col ${isOwn ? 'items-end' : 'items-start'} ${
                                                  firstUrl ? 'max-w-[85%] sm:max-w-[320px]' : 'max-w-[85%]'
                                                }`}
                                              >
                                                <div
                                                  className={`w-fit max-w-full overflow-hidden rounded-2xl shadow-xs transition-all ${
                                                    isOwn
                                                      ? 'rounded-br-md bg-blue-900 text-white hover:bg-blue-800'
                                                      : 'rounded-bl-md border border-slate-200/90 bg-white text-slate-900 hover:bg-slate-50'
                                                  }`}
                                                >
                                                  <div className="w-full overflow-hidden">
                                                    {renderMessengerMediaGrid(
                                                      mediaItems,
                                                      (imgIndex) => {
                                                        setLightboxState({
                                                          items: mediaItems,
                                                          index: imgIndex
                                                        });
                                                      },
                                                      true
                                                    )}
                                                  </div>
                                                  <div className="px-3.5 py-2.5 text-[15px] leading-relaxed">
                                                    <p className="whitespace-pre-wrap break-words">
                                                      {renderMessageContent(displayText, isOwn)}
                                                    </p>
                                                  </div>
                                                </div>
                                                {firstUrl && (
                                                  <LinkPreviewCard url={firstUrl} isOwn={isOwn} />
                                                )}
                                              </div>
                                            );
                                          }

                                          // Standard text bubble
                                          const firstUrl = extractFirstUrl(displayText || message.message);
                                          return (
                                            <div
                                              onClick={() => setClickedMessageId(clickedMessageId === message.id ? null : message.id)}
                                              className={`cursor-pointer flex flex-col ${isOwn ? 'items-end' : 'items-start'} ${
                                                firstUrl ? 'max-w-[85%] sm:max-w-[320px]' : 'max-w-[78%]'
                                              }`}
                                            >
                                              <div
                                                className={`w-fit max-w-full overflow-hidden rounded-2xl shadow-xs transition-all px-4 py-2.5 text-[15px] leading-relaxed ${
                                                  isOwn
                                                    ? 'rounded-br-md bg-blue-900 text-white hover:bg-blue-800'
                                                    : 'rounded-bl-md border border-slate-200/90 bg-white text-slate-900 hover:bg-slate-50'
                                                }`}
                                              >
                                                <p className="whitespace-pre-wrap break-words">
                                                  {renderMessageContent(displayText || message.message, isOwn)}
                                                </p>
                                              </div>
                                              {firstUrl && (
                                                <LinkPreviewCard url={firstUrl} isOwn={isOwn} />
                                              )}
                                            </div>
                                          );
                                        })()}
                                      </div>
                                    </div>
                                  );
                                })()
                              )}

                              {/* Message Status */}
                              {showStatus && (
                                <div className={`flex justify-end overflow-hidden transition-all duration-300 ease-in-out max-h-6 opacity-100 mt-0.5`}>
                                  <span className="text-[10px] text-slate-400 italic flex items-center gap-1">
                                    {message.status === 'error' ? (
                                      <span className="text-red-500 not-italic flex items-center gap-1" title="Error sending message">
                                        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                                        Error
                                      </span>
                                    ) : message.status === 'sending' ? (
                                      <span className="flex items-center gap-1">
                                        <svg className="h-3 w-3 text-slate-400 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>
                                        Sending...
                                      </span>
                                    ) : (message.is_read || message.isRead) ? (
                                      <span className="text-blue-500 not-italic flex items-center gap-1" title="Read">
                                        <svg className="h-3 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 6 7 17 2 12"></polyline><polyline points="22 6 11 17 9.5 15.5"></polyline></svg>
                                        Read
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-1" title="Sent">
                                        <svg className="h-3 w-3 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                        Sent
                                      </span>
                                    )}
                                  </span>
                                </div>
                              )}
                            </div>
                          </React.Fragment>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                <form onSubmit={handleSendMessage} className="border-t border-slate-200 bg-white p-4">
                  {error && <p className="mb-2 text-xs font-medium text-red-600">{error}</p>}

                  {/* Pending Attachments Multi-Preview Strip */}
                  {pendingAttachments.length > 0 && (
                    <div className="mb-3 rounded-xl border border-blue-200 bg-blue-50/70 p-2.5">
                      <div className="mb-2 flex items-center justify-between text-xs text-slate-600">
                        <span className="font-semibold text-blue-900">
                          Attached ({pendingAttachments.length}/10)
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            pendingAttachments.forEach((att) => {
                              if (att.previewUrl) URL.revokeObjectURL(att.previewUrl);
                            });
                            setPendingAttachments([]);
                          }}
                          className="font-medium text-slate-500 hover:text-red-600 transition-colors"
                        >
                          Clear all
                        </button>
                      </div>
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {pendingAttachments.map((att, idx) => (
                          <div key={idx} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-blue-200 bg-slate-900 shadow-xs group">
                            {att.mediaType === 'video' ? (
                              <video src={att.previewUrl} className="h-full w-full object-cover" />
                            ) : (
                              <img src={att.previewUrl} alt={att.fileName} className="h-full w-full object-cover" />
                            )}
                            <span className="absolute bottom-0 right-0 rounded-tl bg-blue-700 px-1 text-[8px] font-bold text-white uppercase">
                              {att.mediaType === 'video' ? 'VID' : 'IMG'}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveAttachment(idx)}
                              className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/70 text-white transition hover:bg-red-600 cursor-pointer"
                              title="Remove file"
                              aria-label="Remove file"
                            >
                              <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Active Reply Banner */}
                  {replyingTo && (
                    <div className="mb-2 flex items-center justify-between gap-2.5 rounded-xl border border-blue-200/90 bg-blue-50/90 px-3.5 py-2 text-xs transition-all shadow-xs animate-fade-in">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <svg className="w-4 h-4 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-800">
                              Replying to {replyingTo.senderName}
                            </span>
                          </div>
                          <p className="truncate text-slate-500 font-normal">
                            {replyingTo.text || (replyingTo.mediaUrl ? 'Attachment' : '')}
                          </p>
                        </div>
                      </div>
                      {replyingTo.mediaUrl && (
                        <div className="h-8 w-8 rounded overflow-hidden bg-slate-200 shrink-0 border border-blue-200">
                          <img src={replyingTo.mediaUrl} alt="" className="h-full w-full object-cover" />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => setReplyingTo(null)}
                        className="h-6 w-6 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
                        title="Cancel reply"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  )}

                  <div className="flex items-end gap-2.5">
                    {/* Hidden file input */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*,video/*"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />

                    {/* Attachment button */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={!canSendMessage || isSending || isUploadingMedia}
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
                      title="Attach images or videos"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                    </button>

                    <textarea
                      ref={messageInputRef}
                      value={messageText}
                      onChange={(event) => setMessageText(event.target.value)}
                      onPaste={handlePaste}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                          event.preventDefault();
                          if (canSendMessage) {
                            handleSendMessage(event);
                          }
                        }
                      }}
                      placeholder={
                        isSelectedIncomingRequest
                          ? 'Accept this request to reply'
                          : isSelectedOutgoingRequest
                            ? pendingAttachments.length
                              ? 'Add an optional caption...'
                              : 'Type a message...'
                            : isSelectedBlocked
                              ? didCurrentUserBlockSelected
                                ? 'Unblock this user to send a message'
                                : 'You cannot send messages to this user'
                              : pendingAttachments.length
                                ? 'Add an optional caption...'
                                : 'Type a message...'
                      }
                      rows={1}
                      maxLength={1000}
                      disabled={!canSendMessage}
                      className="max-h-28 min-h-[44px] flex-1 resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                    />

                    <button
                      type="submit"
                      disabled={isSending || isUploadingMedia || (!messageText.trim() && !pendingAttachments.length) || !canSendMessage}
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-700 text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                      aria-label="Send message"
                    >
                      {isUploadingMedia ? (
                        <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M3.478 2.405a.75.75 0 0 0-.926.94l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.405Z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-slate-500">
                Select an alumni contact to open a conversation.
              </div>
            )}
          </main>
        </div>
      </section>

      {/* Media Lightbox Modal */}
      {lightboxState && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm pointer-events-auto select-none"
          onClick={() => setLightboxState(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative max-h-[92vh] max-w-[92vw] overflow-hidden rounded-2xl bg-black/60 shadow-2xl border border-white/10 flex items-center justify-center p-1"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close (X) button placed directly on the top-right of the image */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxState(null);
              }}
              className="absolute top-3 right-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-white backdrop-blur-sm transition-all hover:bg-red-600 hover:scale-110 cursor-pointer shadow-lg border border-white/20"
              title="Close"
              aria-label="Close"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>

            {/* Photo Counter Pill (shown if multiple items) */}
            {lightboxState.items.length > 1 && (
              <div className="absolute top-3 left-3 z-20 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm shadow-md border border-white/20">
                {lightboxState.index + 1} / {lightboxState.items.length}
              </div>
            )}

            {/* Previous Navigation Button */}
            {lightboxState.items.length > 1 && lightboxState.index > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxState((prev) => ({ ...prev, index: prev.index - 1 }));
                }}
                className="absolute left-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/70 text-white backdrop-blur-sm transition-all hover:bg-black/90 hover:scale-110 cursor-pointer shadow-lg border border-white/20"
                title="Previous"
                aria-label="Previous"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}

            {/* Media Content */}
            {(() => {
              const currentItem = lightboxState.items[lightboxState.index];
              if (!currentItem) return null;
              if (currentItem.mediaType === 'video') {
                return (
                  <video
                    key={currentItem.url}
                    src={currentItem.url}
                    controls
                    autoPlay
                    className="max-h-[88vh] max-w-[90vw] rounded-xl object-contain"
                  />
                );
              }
              return (
                <img
                  key={currentItem.url}
                  src={currentItem.url}
                  alt="Full view"
                  className="max-h-[88vh] max-w-[90vw] rounded-xl object-contain select-none"
                />
              );
            })()}

            {/* Next Navigation Button */}
            {lightboxState.items.length > 1 && lightboxState.index < lightboxState.items.length - 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxState((prev) => ({ ...prev, index: prev.index + 1 }));
                }}
                className="absolute right-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/70 text-white backdrop-blur-sm transition-all hover:bg-black/90 hover:scale-110 cursor-pointer shadow-lg border border-white/20"
                title="Next"
                aria-label="Next"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>
        </div>,
        document.body
      )}
      <button
        type="button"
        className={`lccb-chat-toggle-button ${isOpen && !isClosing ? 'lccb-chat-toggle-button--hidden' : ''}`}
        onClick={() => {
          if (isOpen && !isClosing) {
            closeChatWindow();
          } else {
            openChatWindow();
          }
        }}
        aria-label={isOpen && !isClosing ? 'Close messages' : 'Open messages'}
        aria-expanded={isOpen && !isClosing}
      >
        <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
        </svg>
        <span className="lccb-chat-toggle-label">Messages</span>
      </button>
      {totalUnread > 0 && !(isOpen && !isClosing) && (
        <span className="lccb-chat-unread-badge" aria-hidden="true">
          {totalUnread > 99 ? '99+' : totalUnread}
        </span>
      )}
    </div>
  );
};

export default AlumniChatPanel;

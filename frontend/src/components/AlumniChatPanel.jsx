import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  sendChatMessage,
  unblockChatUser
} from '../services/supabaseChatService';
import { API_BASE_URL } from '../config/apiBaseUrl';

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

const isSearchableAlumniAccount = (entry = {}) => {
  const user = entry.user || {};
  const accountStatus = String(entry.status || entry.account_status || user.status || user.account_status || '').toUpperCase();

  if (accountStatus === 'BLOCKED' || accountStatus === 'DEACTIVATED' || accountStatus === 'INACTIVE') return false;
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

const AlumniChatPanel = ({ currentUser, alumniContacts }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [showMessageRequests, setShowMessageRequests] = useState(true);
  const [showSentRequests, setShowSentRequests] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedContactId, setSelectedContactId] = useState('');
  const [staffContacts, setStaffContacts] = useState([]);
  const [statuses, setStatuses] = useState({});
  const [conversationSummaries, setConversationSummaries] = useState({});
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [error, setError] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [requestActionId, setRequestActionId] = useState('');
  const [clickedMessageId, setClickedMessageId] = useState(null);
  const messagesEndRef = useRef(null);
  const closeTimerRef = useRef(null);

  const currentUserId = getSystemUserId(currentUser);

  const alumniSearchContacts = useMemo(() => {
    const seen = new Set();

    return (alumniContacts || [])
      .filter(isSearchableAlumniAccount)
      .map((entry) => {
        const contact = normalizeChatUser(entry);
        return {
          ...contact,
          searchText: buildAlumniSearchText(entry, contact)
        };
      })
      .filter((contact) => {
        if (!contact.userId || contact.userId === currentUserId || seen.has(contact.userId)) return false;
        seen.add(contact.userId);
        return true;
      })
      .sort((first, second) => first.displayName.localeCompare(second.displayName));
  }, [alumniContacts, currentUserId]);

  const knownProfilesByUserId = useMemo(() => {
    const profiles = new Map();

    [...alumniSearchContacts, ...staffContacts.map((entry) => normalizeChatUser(entry))].forEach((profile) => {
      if (profile.userId) profiles.set(profile.userId, profile);
    });

    return profiles;
  }, [alumniSearchContacts, staffContacts]);

  const conversationContacts = useMemo(
    () =>
      Object.entries(conversationSummaries)
        .map(([summaryChatId, summary]) => {
          const otherUserId = String(summary?.otherUserId || summary?.otherUser?.userId || '');
          if (!otherUserId || otherUserId === currentUserId) return null;

          const profile = knownProfilesByUserId.get(otherUserId) || {};
          const contact = normalizeChatUser({
            ...profile,
            ...(summary.otherUser || {}),
            userId: otherUserId,
            chatId: summary.chatId || summaryChatId,
            displayName:
              summary.otherUser?.displayName ||
              summary.otherUser?.username ||
              profile.displayName ||
              summary.otherUser?.email ||
              'User',
            role: summary.otherUser?.role || profile.role || ''
          });

          return {
            ...contact,
            chatId: summary.chatId || summaryChatId,
            summary,
            status: statuses[contact.userId] || null
          };
        })
        .filter(Boolean),
    [conversationSummaries, currentUserId, knownProfilesByUserId, statuses]
  );

  const currentChatUser = useMemo(() => {
    const ownProfile = (alumniContacts || []).find((entry) => {
      const user = normalizeChatUser(entry);
      return user.userId === currentUserId;
    });

    return normalizeChatUser({
      ...ownProfile,
      id: ownProfile?.id,
      userId: currentUserId,
      username: currentUser?.username,
      email: currentUser?.email,
      profileImage: ownProfile?.profileImage
    });
  }, [alumniContacts, currentUser, currentUserId]);

  const messageRequests = useMemo(
    () =>
      conversationContacts
        .filter((contact) => {
          const summary = contact.summary;
          return (
            getConversationStatus(summary) === 'pending' &&
            String(summary?.requestTo || '') === String(currentUserId)
          );
        })
        .sort((first, second) => {
          const firstTime = first.summary?.latestMessageAt || first.summary?.updatedAt || 0;
          const secondTime = second.summary?.latestMessageAt || second.summary?.updatedAt || 0;
          return secondTime - firstTime;
        }),
    [conversationContacts, currentUserId]
  );

  const sentRequests = useMemo(
    () =>
      conversationContacts
        .filter(
          (contact) =>
            getConversationStatus(contact.summary) === 'pending' &&
            String(contact.summary?.requestedBy || '') === String(currentUserId)
        )
        .sort(sortByLatestActivity),
    [conversationContacts, currentUserId]
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
        .filter((contact) => getConversationStatus(contact.summary) === 'accepted')
        .sort(sortByLatestActivity),
    [conversationContacts]
  );

  const searchResults = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];

    const acceptedChatUserIds = new Set(
      conversationContacts
        .filter((contact) => getConversationStatus(contact.summary) === 'accepted')
        .map((contact) => contact.userId)
    );
    const conversationByUserId = new Map(conversationContacts.map((contact) => [contact.userId, contact]));

    return alumniSearchContacts
      .filter((contact) => !acceptedChatUserIds.has(contact.userId))
      .filter((contact) => String(contact.searchText || '').includes(term))
      .map((contact) => ({
        ...(conversationByUserId.get(contact.userId) || {}),
        ...contact,
        chatId: conversationByUserId.get(contact.userId)?.chatId || getChatId(currentUserId, contact.userId),
        summary: conversationByUserId.get(contact.userId)?.summary || null,
        status: statuses[contact.userId] || null
      }));
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

  const selectedContact = useMemo(
    () => selectableContacts.find((contact) => contact.userId === selectedContactId) || null,
    [selectableContacts, selectedContactId]
  );

  const selectedChatId = selectedContact
    ? resolveContactChatId(currentUserId, selectedContact, conversationSummaries)
    : '';
  const selectedSummary = selectedChatId ? conversationSummaries[selectedChatId] : null;
  const selectedUnreadCount = Number(selectedSummary?.unreadCount) || 0;
  const selectedConversationStatus = getConversationStatus(selectedSummary);
  const isSelectedIncomingRequest =
    selectedConversationStatus === 'pending' &&
    String(selectedSummary?.requestTo || '') === String(currentUserId);
  const isSelectedOutgoingRequest =
    selectedConversationStatus === 'pending' &&
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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

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

  const handleSendMessage = async (event) => {
    event?.preventDefault?.();
    if (!messageText.trim()) return;

    setError('');
    
    const textToSend = messageText;
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
      id: tempId,
      senderId: currentChatUser.userId,
      receiverId: selectedContact.userId,
      text: textToSend,
      timestamp: new Date().toISOString(),
      status: 'sending'
    };
    
    setMessages((prev) => [...prev, optimisticMsg]);
    setMessageText('');

    try {
      await sendChatMessage({
        sender: currentChatUser,
        receiver: selectedContact,
        text: textToSend
      });
      setMessages((prev) => 
        prev.map((msg) => msg.id === tempId ? { ...msg, status: 'sent' } : msg)
      );
    } catch (sendError) {
      setError(sendError.message || 'Unable to send message.');
      setMessageText(textToSend); // Restore text on failure
      setMessages((prev) => prev.map((msg) => msg.id === tempId ? { ...msg, status: 'error' } : msg));
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
        aria-label="Alumni chat"
        aria-hidden={!isOpen && !isClosing}
        className={`lccb-chat-panel ${isOpen ? 'lccb-chat-panel--open' : ''} ${
          isClosing ? 'lccb-chat-panel--closing' : ''
        } flex h-[min(680px,calc(100vh-40px))] w-[min(900px,calc(100vw-40px))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl`}
      >
        <div className="lccb-chat-panel-content flex h-full w-full">
          <aside className="flex w-80 shrink-0 flex-col border-r border-slate-200 bg-slate-50">
            <div className="border-b border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-950">Alumni Chat</h3>
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
              <div className="mt-4">
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search Alumni"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-2">
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
                                {contact.summary?.latestMessageText || 'New message request'}
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
                        {contact.summary?.latestMessageText || formatLastActive(contact.status)}
                      </span>
                    </span>
                  </button>
                );
              })}

              {search.trim() && (
                <div className="mt-3">
                  <div className="px-2 pb-2 pt-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Search Results
                  </div>
                  {searchResults.length === 0 ? (
                    <div className="px-4 py-5 text-center text-sm text-slate-500">No alumni found.</div>
                  ) : (
                    searchResults.map((contact) => {
                      const isSelected = selectedContactId === contact.userId;
                      const contactStatus = getConversationStatus(contact.summary);
                      const isOutgoingSearchRequest =
                        contactStatus === 'pending' &&
                        String(contact.summary?.requestedBy || '') === String(currentUserId);
                      const isIncomingSearchRequest =
                        contactStatus === 'pending' &&
                        String(contact.summary?.requestTo || '') === String(currentUserId);
                      const didCurrentUserBlockSearchContact = didCurrentUserBlockSummary(contact.summary, currentUserId);
                      return (
                        <button
                          type="button"
                          key={`search-${contact.userId}`}
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
              )}

              {!search.trim() &&
                messageRequests.length === 0 &&
                sentRequests.length === 0 &&
                acceptedConversationContacts.length === 0 && (
                  <div className="px-4 py-8 text-center text-sm text-slate-500">
                    No conversations yet. Search alumni to start a chat.
                  </div>
                )}
            </div>
          </aside>

          <main key={selectedChatId || 'empty-chat'} className="lccb-chat-conversation flex min-w-0 flex-1 flex-col bg-white">
            {selectedContact ? (
              <>
                <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
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

                <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 px-5 py-4">
                  {messages.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-center text-sm text-slate-500">
                      Start a conversation with {selectedContact.displayName}.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {messages.map((message, index) => {
                        const isOwn = String(message.senderId) === String(currentUserId);
                        const nextMessage = messages[index + 1];
                        const isLastInGroup = !nextMessage || String(nextMessage.senderId) !== String(message.senderId);
                        const showStatus = isOwn && (message.status === 'error' || message.status === 'sending' || isLastInGroup);

                        return (
                          <div key={message.id} className="flex flex-col">
                            {/* Timestamp centered, animated on click */}
                            <div className={`overflow-hidden transition-all duration-300 ease-in-out flex justify-center w-full ${clickedMessageId === message.id ? 'max-h-6 opacity-100 mt-2 mb-1' : 'max-h-0 opacity-0 mt-0 mb-0'}`}>
                              <span className="text-[11px] text-slate-500 font-medium">
                                {formatChatTime(message.timestamp)}
                              </span>
                            </div>

                            {/* Message Bubble */}
                            <div className={`lccb-chat-message flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                              <div
                                onClick={() => setClickedMessageId(clickedMessageId === message.id ? null : message.id)}
                                className={`cursor-pointer max-w-[78%] rounded-2xl px-4 py-2.5 text-sm shadow-sm transition-all ${
                                  isOwn
                                    ? 'rounded-br-md bg-blue-700 text-white hover:bg-blue-800'
                                    : 'rounded-bl-md border border-slate-200 bg-white text-slate-900 hover:bg-slate-50'
                                }`}
                              >
                                <p className="whitespace-pre-wrap break-words">{message.text || message.message}</p>
                              </div>
                            </div>

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
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                <form onSubmit={handleSendMessage} className="border-t border-slate-200 bg-white p-4">
                  {error && <p className="mb-2 text-xs font-medium text-red-600">{error}</p>}
                  <div className="flex items-end gap-3">
                    <textarea
                      value={messageText}
                      onChange={(event) => setMessageText(event.target.value)}
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
                            ? 'Type a message...'
                            : isSelectedBlocked
                              ? didCurrentUserBlockSelected
                                ? 'Unblock this user to send a message'
                                : 'You cannot send messages to this user'
                              : 'Type a message...'
                      }
                      rows={1}
                      maxLength={1000}
                      disabled={!canSendMessage}
                      className="max-h-28 min-h-[44px] flex-1 resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                    />
                    <button
                      type="submit"
                      disabled={isSending || !messageText.trim() || !canSendMessage}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-700 text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                      aria-label="Send message"
                    >
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3.478 2.405a.75.75 0 0 0-.926.94l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.405Z" />
                      </svg>
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
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenContainer from '../../components/ScreenContainer';
import { API_ORIGIN } from '../../config/api';
import { adminService } from '../../services/adminService';
import { communityService } from '../../services/communityService';
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
  setupPresence,
  unblockChatUser
} from '../../services/firebaseChatService';
import { imageUrl } from '../../utils/formatters';

const getConversationStatus = (summary) => summary?.status || 'accepted';
const isBlockedConversationStatus = (status) => status === 'blocked' || status === 'rejected';
const didCurrentUserBlockSummary = (summary, currentUserId) =>
  isBlockedConversationStatus(getConversationStatus(summary)) &&
  String(summary?.blockedBy || summary?.requestTo || '') === String(currentUserId);

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

  const diffMinutes = Math.max(1, Math.floor((Date.now() - date.getTime()) / 60000));
  if (diffMinutes < 60) return `Last active ${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Last active ${diffHours}h ago`;

  return `Last active ${date.toLocaleDateString()}`;
};

const getRoleLabel = (role) => {
  const normalized = String(role || '').toUpperCase();
  if (normalized === 'ADMIN' || normalized === 'TEACHER') return 'Admin';
  return 'Alumni';
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

const getAvatarFallback = (name) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=2563eb&color=ffffff&size=160`;

const resolveAvatar = (contact) => imageUrl(contact?.profileImage, API_ORIGIN) || contact?.profileImage || getAvatarFallback(contact?.displayName);

function ContactAvatar({ contact, status, size = 42 }) {
  const [failed, setFailed] = useState(false);
  const avatar = resolveAvatar(contact);

  return (
    <View style={[styles.avatarWrap, { width: size, height: size, borderRadius: size / 2 }]}>
      {!failed && avatar ? (
        <Image
          source={{ uri: avatar }}
          style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
          onError={() => setFailed(true)}
        />
      ) : (
        <View style={[styles.avatarFallback, { width: size, height: size, borderRadius: size / 2 }]}>
          <Text style={styles.avatarInitial}>{String(contact?.displayName || 'U').slice(0, 1).toUpperCase()}</Text>
        </View>
      )}
      <View style={[styles.statusDot, status?.online ? styles.statusOnline : styles.statusOffline]} />
    </View>
  );
}

function SectionTitle({ children }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function ContactRow({ contact, status, subtitle, unreadCount = 0, badge, selected, onPress, rightAction }) {
  return (
    <Pressable style={[styles.contactRow, selected && styles.contactRowActive]} onPress={onPress}>
      <ContactAvatar contact={contact} status={status} />
      <View style={styles.contactBody}>
        <View style={styles.contactNameLine}>
          <Text style={styles.contactName} numberOfLines={1}>{contact.displayName}</Text>
          {badge ? <Text style={styles.badge}>{badge}</Text> : null}
          {unreadCount > 0 ? (
            <Text style={styles.unreadBadge}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
          ) : null}
        </View>
        <Text style={styles.contactSubtitle} numberOfLines={1}>{subtitle}</Text>
      </View>
      {rightAction}
    </Pressable>
  );
}

export default function AlumniChatScreen({ navigation, user }) {
  const [alumniContacts, setAlumniContacts] = useState([]);
  const [staffContacts, setStaffContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statuses, setStatuses] = useState({});
  const [conversationSummaries, setConversationSummaries] = useState({});
  const [selectedContactId, setSelectedContactId] = useState('');
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [error, setError] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [requestActionId, setRequestActionId] = useState('');
  const listRef = useRef(null);
  const insets = useSafeAreaInsets();

  const currentUserId = getSystemUserId(user);

  useEffect(() => {
    let mounted = true;

    const loadContacts = async () => {
      setLoading(true);
      try {
        const [alumni, staff] = await Promise.all([
          communityService.getAllAlumni(),
          adminService.getTeachers().catch(() => [])
        ]);

        if (!mounted) return;
        setAlumniContacts(Array.isArray(alumni) ? alumni : []);
        setStaffContacts(
          (Array.isArray(staff) ? staff : []).map((entry) => ({
            id: `staff-${entry.id}`,
            userId: entry.id,
            user_id: entry.id,
            displayName: entry.username || entry.email || 'Admin',
            username: entry.username || entry.email || 'Admin',
            email: entry.email || '',
            profileImage: entry.profile_image || entry.profileImage || '',
            role: entry.role || 'ADMIN'
          }))
        );
      } catch (loadError) {
        if (mounted) Alert.alert('Chat unavailable', loadError?.message || 'Unable to load chat contacts.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadContacts();

    return () => {
      mounted = false;
    };
  }, []);

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
    const ownProfile = (alumniContacts || []).find((entry) => normalizeChatUser(entry).userId === currentUserId);
    return normalizeChatUser({
      ...ownProfile,
      id: ownProfile?.id,
      userId: currentUserId,
      username: user?.username,
      email: user?.email,
      profileImage: ownProfile?.profileImage || ownProfile?.profile_image || user?.profile_image,
      role: user?.role
    });
  }, [alumniContacts, currentUserId, user]);

  const messageRequests = useMemo(
    () =>
      conversationContacts
        .filter(
          (contact) =>
            getConversationStatus(contact.summary) === 'pending' &&
            String(contact.summary?.requestTo || '') === String(currentUserId)
        )
        .sort(sortByLatestActivity),
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
    () => conversationContacts.filter((contact) => getConversationStatus(contact.summary) === 'accepted').sort(sortByLatestActivity),
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
  const canSendMessage = selectedContact && !isSelectedIncomingRequest && !isSelectedBlocked;

  useEffect(() => {
    if (!currentUserId) return undefined;
    return setupPresence({
      ...user,
      id: currentUserId,
      username: user?.username || currentChatUser.displayName
    });
  }, [currentChatUser.displayName, currentUserId, user]);

  useEffect(() => {
    if (!currentUserId) return undefined;
    return listenToConversationSummaries(currentUserId, (nextSummaries) => {
      setConversationSummaries((previousSummaries) =>
        areConversationSummaryMapsEqual(previousSummaries, nextSummaries) ? previousSummaries : nextSummaries
      );
    });
  }, [currentUserId]);

  useEffect(() => {
    const ids = statusUserIdKey ? statusUserIdKey.split('|') : [];
    return listenToUserStatuses(ids, (nextStatuses) => {
      setStatuses((previousStatuses) => (areStatusMapsEqual(previousStatuses, nextStatuses) ? previousStatuses : nextStatuses));
    });
  }, [statusUserIdKey]);

  useEffect(() => {
    if (!selectedChatId) {
      setMessages([]);
      return undefined;
    }
    return listenToMessages(selectedChatId, setMessages);
  }, [selectedChatId]);

  useEffect(() => {
    if (!currentUserId || !selectedChatId || selectedUnreadCount <= 0) return;
    markConversationRead(currentUserId, selectedChatId).catch(() => {});
  }, [currentUserId, messages.length, selectedChatId, selectedUnreadCount]);

  useEffect(() => {
    if (messages.length > 0) {
      requestAnimationFrame(() => listRef.current?.scrollToEnd?.({ animated: true }));
    }
  }, [messages.length]);

  const handleSendMessage = async () => {
    if (!selectedContact || isSending || !canSendMessage) return;

    setError('');
    setIsSending(true);
    try {
      await sendChatMessage({
        sender: currentChatUser,
        receiver: selectedContact,
        text: messageText
      });
      setMessageText('');
    } catch (sendError) {
      setError(sendError.message || 'Unable to send message.');
    } finally {
      setIsSending(false);
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
      setSelectedContactId(contact.userId);
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
    } catch (unblockError) {
      setError(unblockError.message || 'Unable to unblock this user.');
    } finally {
      setRequestActionId('');
    }
  };

  const openContact = (contact) => {
    setSelectedContactId(contact.userId);
    setError('');
  };

  const renderRequestActions = (contact) => (
    <View style={styles.requestActions}>
      <Pressable style={styles.acceptButton} onPress={() => handleAcceptRequest(contact)} disabled={requestActionId === contact.chatId}>
        <Text style={styles.acceptText}>Accept</Text>
      </Pressable>
      <Pressable style={styles.blockButton} onPress={() => handleBlockRequest(contact)} disabled={requestActionId === contact.chatId}>
        <Text style={styles.blockText}>Block</Text>
      </Pressable>
    </View>
  );

  if (selectedContact) {
    return (
      <KeyboardAvoidingView
        style={[styles.chatShell, { paddingBottom: insets.bottom }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
          <View style={styles.chatHeader}>
            <Pressable style={styles.backButton} onPress={() => setSelectedContactId('')} hitSlop={10}>
              <Ionicons name="chevron-back" size={22} color="#0f172a" />
            </Pressable>
            <ContactAvatar contact={selectedContact} status={statuses[selectedContact.userId]} size={44} />
            <View style={styles.chatHeaderText}>
              <Text style={styles.chatName} numberOfLines={1}>{selectedContact.displayName}</Text>
              <Text style={styles.chatStatus} numberOfLines={1}>
                {isSelectedIncomingRequest
                  ? `${getRoleLabel(selectedContact.role)} message request`
                  : isSelectedOutgoingRequest
                    ? 'Request pending'
                    : formatLastActive(statuses[selectedContact.userId])}
              </Text>
            </View>
          </View>

          {(isSelectedIncomingRequest || isSelectedOutgoingRequest || isSelectedBlocked) && (
            <View style={styles.notice}>
              {isSelectedIncomingRequest ? (
                <>
                  <Text style={styles.noticeText}>{selectedContact.displayName} wants to start a conversation.</Text>
                  {renderRequestActions({ ...selectedContact, chatId: selectedChatId })}
                </>
              ) : null}
              {isSelectedOutgoingRequest ? (
                <Text style={styles.noticeText}>
                  Message request sent. You can continue sending messages, but the conversation will become active after this user accepts.
                </Text>
              ) : null}
              {isSelectedBlocked ? (
                <>
                  <Text style={styles.noticeText}>
                    {didCurrentUserBlockSelected
                      ? 'You blocked this user. Unblock to allow messages again.'
                      : 'Message unavailable. You cannot send messages to this user.'}
                  </Text>
                  {didCurrentUserBlockSelected ? (
                    <Pressable style={styles.acceptButton} onPress={() => handleUnblockUser({ ...selectedContact, chatId: selectedChatId })}>
                      <Text style={styles.acceptText}>Unblock</Text>
                    </Pressable>
                  ) : null}
                </>
              ) : null}
            </View>
          )}

          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messageList}
            ListEmptyComponent={
              <View style={styles.emptyMessages}>
                <Text style={styles.emptyMessagesText}>Start a conversation with {selectedContact.displayName}.</Text>
              </View>
            }
            renderItem={({ item }) => {
              const isOwn = String(item.senderId) === String(currentUserId);
              return (
                <View style={[styles.messageRow, isOwn ? styles.messageRowOwn : styles.messageRowOther]}>
                  <View style={[styles.messageBubble, isOwn ? styles.messageBubbleOwn : styles.messageBubbleOther]}>
                    <Text style={[styles.messageText, isOwn ? styles.messageTextOwn : styles.messageTextOther]}>
                      {item.text || item.message}
                    </Text>
                    <Text style={[styles.messageTime, isOwn ? styles.messageTimeOwn : styles.messageTimeOther]}>
                      {formatChatTime(item.timestamp)}
                    </Text>
                  </View>
                </View>
              );
            }}
          />

          <View style={styles.composer}>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <View style={styles.composerRow}>
              <TextInput
                style={[styles.messageInput, !canSendMessage && styles.messageInputDisabled]}
                value={messageText}
                onChangeText={setMessageText}
                placeholder={
                  isSelectedIncomingRequest
                    ? 'Accept this request to reply'
                    : isSelectedBlocked
                      ? didCurrentUserBlockSelected
                        ? 'Unblock this user to send a message'
                        : 'You cannot send messages to this user'
                      : 'Type a message...'
                }
                placeholderTextColor="#94a3b8"
                multiline
                editable={Boolean(canSendMessage)}
                maxLength={1000}
              />
              <Pressable
                style={[styles.sendButton, (!messageText.trim() || !canSendMessage || isSending) && styles.sendButtonDisabled]}
                onPress={handleSendMessage}
                disabled={!messageText.trim() || !canSendMessage || isSending}
              >
                <Ionicons name="send" size={18} color="#fff" />
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Pressable style={styles.smallBackButton} onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Alumni Chat</Text>
          <Text style={styles.subtitle}>Realtime conversations</Text>
        </View>
      </View>

      <View style={styles.searchShell}>
        <Ionicons name="search-outline" size={18} color="#64748b" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search Alumni"
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#94a3b8"
        />
        {search ? (
          <Pressable onPress={() => setSearch('')} hitSlop={10}>
            <Ionicons name="close-circle" size={18} color="#94a3b8" />
          </Pressable>
        ) : null}
      </View>

      {loading ? <Text style={styles.loadingText}>Loading chat...</Text> : null}

      {messageRequests.length > 0 ? (
        <View style={styles.section}>
          <SectionTitle>Message Requests</SectionTitle>
          {messageRequests.map((contact) => (
            <ContactRow
              key={`request-${contact.userId}`}
              contact={contact}
              status={contact.status}
              subtitle={contact.summary?.latestMessageText || 'Message request'}
              unreadCount={Number(contact.summary?.unreadCount) || 0}
              badge="Request"
              onPress={() => openContact(contact)}
              rightAction={renderRequestActions(contact)}
            />
          ))}
        </View>
      ) : null}

      {sentRequests.length > 0 ? (
        <View style={styles.section}>
          <SectionTitle>Requests Sent</SectionTitle>
          {sentRequests.map((contact) => (
            <ContactRow
              key={`sent-${contact.userId}`}
              contact={contact}
              status={contact.status}
              subtitle="Message request sent"
              badge="Pending"
              onPress={() => openContact(contact)}
            />
          ))}
        </View>
      ) : null}

      {blockedContacts.length > 0 ? (
        <View style={styles.section}>
          <SectionTitle>Blocked Users</SectionTitle>
          {blockedContacts.map((contact) => (
            <ContactRow
              key={`blocked-${contact.userId}`}
              contact={contact}
              status={contact.status}
              subtitle="You blocked this user"
              badge="Blocked"
              onPress={() => openContact(contact)}
              rightAction={
                <Pressable style={styles.unblockButton} onPress={() => handleUnblockUser(contact)}>
                  <Text style={styles.unblockText}>Unblock</Text>
                </Pressable>
              }
            />
          ))}
        </View>
      ) : null}

      {acceptedConversationContacts.length > 0 ? (
        <View style={styles.section}>
          <SectionTitle>Conversations</SectionTitle>
          {acceptedConversationContacts.map((contact) => (
            <ContactRow
              key={`conversation-${contact.userId}`}
              contact={contact}
              status={contact.status}
              subtitle={contact.summary?.latestMessageText || formatLastActive(contact.status)}
              unreadCount={Number(contact.summary?.unreadCount) || 0}
              onPress={() => openContact(contact)}
            />
          ))}
        </View>
      ) : null}

      {search.trim() ? (
        <View style={styles.section}>
          <SectionTitle>Search Results</SectionTitle>
          {searchResults.length === 0 ? (
            <Text style={styles.emptyText}>No alumni found.</Text>
          ) : (
            searchResults.map((contact) => {
              const contactStatus = getConversationStatus(contact.summary);
              const outgoing =
                contactStatus === 'pending' &&
                String(contact.summary?.requestedBy || '') === String(currentUserId);
              const incoming =
                contactStatus === 'pending' &&
                String(contact.summary?.requestTo || '') === String(currentUserId);
              const blockedByMe = didCurrentUserBlockSummary(contact.summary, currentUserId);
              const blocked = isBlockedConversationStatus(contactStatus);

              return (
                <ContactRow
                  key={`search-${contact.userId}`}
                  contact={contact}
                  status={contact.status}
                  subtitle={
                    outgoing
                      ? 'Message request sent'
                      : incoming
                        ? 'Message request received'
                        : blocked
                          ? blockedByMe
                            ? 'You blocked this user'
                            : 'You cannot message this user'
                          : [contact.course, contact.batch].filter(Boolean).join(' - ') || 'Start a new chat'
                  }
                  badge={blocked ? 'Blocked' : outgoing ? 'Pending' : incoming ? 'Request' : ''}
                  onPress={() => openContact(contact)}
                  rightAction={
                    blockedByMe ? (
                      <Pressable style={styles.unblockButton} onPress={() => handleUnblockUser(contact)}>
                        <Text style={styles.unblockText}>Unblock</Text>
                      </Pressable>
                    ) : null
                  }
                />
              );
            })
          )}
        </View>
      ) : null}

      {!loading &&
      !search.trim() &&
      messageRequests.length === 0 &&
      sentRequests.length === 0 &&
      blockedContacts.length === 0 &&
      acceptedConversationContacts.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="chatbubble-ellipses-outline" size={34} color="#94a3b8" />
          <Text style={styles.emptyStateTitle}>No conversations yet</Text>
          <Text style={styles.emptyStateText}>Search alumni to start a new chat.</Text>
        </View>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  smallBackButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc'
  },
  headerCopy: {
    flex: 1
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a'
  },
  subtitle: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2
  },
  searchShell: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#dbe3f0',
    borderRadius: 16,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  searchInput: {
    flex: 1,
    color: '#0f172a',
    fontSize: 14,
    paddingVertical: 10
  },
  loadingText: {
    color: '#64748b',
    textAlign: 'center'
  },
  section: {
    gap: 8
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 2
  },
  contactRow: {
    minHeight: 72,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  contactRowActive: {
    borderColor: '#93c5fd',
    backgroundColor: '#eff6ff'
  },
  avatarWrap: {
    position: 'relative'
  },
  avatar: {
    backgroundColor: '#e2e8f0'
  },
  avatarFallback: {
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarInitial: {
    color: '#fff',
    fontWeight: '800'
  },
  statusDot: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fff'
  },
  statusOnline: {
    backgroundColor: '#10b981'
  },
  statusOffline: {
    backgroundColor: '#cbd5e1'
  },
  contactBody: {
    flex: 1,
    minWidth: 0
  },
  contactNameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  contactName: {
    flex: 1,
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '800'
  },
  contactSubtitle: {
    marginTop: 3,
    color: '#64748b',
    fontSize: 12
  },
  badge: {
    borderRadius: 999,
    backgroundColor: '#eff6ff',
    color: '#1d4ed8',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 7,
    paddingVertical: 2,
    overflow: 'hidden'
  },
  unreadBadge: {
    minWidth: 22,
    minHeight: 22,
    borderRadius: 11,
    backgroundColor: '#2563eb',
    color: '#fff',
    textAlign: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontSize: 11,
    fontWeight: '800',
    overflow: 'hidden'
  },
  requestActions: {
    gap: 6
  },
  acceptButton: {
    borderRadius: 10,
    backgroundColor: '#2563eb',
    paddingHorizontal: 11,
    paddingVertical: 7
  },
  acceptText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800'
  },
  blockButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fff',
    paddingHorizontal: 11,
    paddingVertical: 7
  },
  blockText: {
    color: '#b91c1c',
    fontSize: 11,
    fontWeight: '800'
  },
  unblockButton: {
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  unblockText: {
    color: '#1d4ed8',
    fontSize: 11,
    fontWeight: '800'
  },
  emptyText: {
    color: '#64748b',
    textAlign: 'center',
    paddingVertical: 14
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 6
  },
  emptyStateTitle: {
    color: '#0f172a',
    fontWeight: '800',
    fontSize: 15
  },
  emptyStateText: {
    color: '#64748b',
    fontSize: 13
  },
  chatShell: {
    flex: 1,
    backgroundColor: '#fff'
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 10
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  chatHeaderText: {
    flex: 1,
    minWidth: 0
  },
  chatName: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '800'
  },
  chatStatus: {
    marginTop: 2,
    color: '#64748b',
    fontSize: 12
  },
  notice: {
    borderBottomWidth: 1,
    borderBottomColor: '#fde68a',
    backgroundColor: '#fffbeb',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10
  },
  noticeText: {
    color: '#92400e',
    fontSize: 13,
    lineHeight: 18
  },
  messageList: {
    flexGrow: 1,
    padding: 16,
    gap: 10,
    backgroundColor: '#f8fafc'
  },
  emptyMessages: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24
  },
  emptyMessagesText: {
    color: '#64748b',
    textAlign: 'center'
  },
  messageRow: {
    flexDirection: 'row'
  },
  messageRowOwn: {
    justifyContent: 'flex-end'
  },
  messageRowOther: {
    justifyContent: 'flex-start'
  },
  messageBubble: {
    maxWidth: '78%',
    borderRadius: 18,
    paddingHorizontal: 13,
    paddingVertical: 9
  },
  messageBubbleOwn: {
    backgroundColor: '#2563eb',
    borderBottomRightRadius: 6
  },
  messageBubbleOther: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderBottomLeftRadius: 6
  },
  messageText: {
    fontSize: 14,
    lineHeight: 19
  },
  messageTextOwn: {
    color: '#fff'
  },
  messageTextOther: {
    color: '#0f172a'
  },
  messageTime: {
    marginTop: 4,
    fontSize: 10
  },
  messageTimeOwn: {
    color: '#bfdbfe'
  },
  messageTimeOther: {
    color: '#94a3b8'
  },
  composer: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    padding: 12,
    backgroundColor: '#fff'
  },
  errorText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10
  },
  messageInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 110,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#0f172a',
    fontSize: 14,
    backgroundColor: '#fff'
  },
  messageInputDisabled: {
    backgroundColor: '#f1f5f9',
    color: '#94a3b8'
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center'
  },
  sendButtonDisabled: {
    backgroundColor: '#cbd5e1'
  }
});

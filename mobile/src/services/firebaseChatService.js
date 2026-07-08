import {
  get,
  limitToLast,
  onDisconnect,
  onValue,
  orderByChild,
  push,
  query,
  ref,
  runTransaction,
  serverTimestamp,
  set,
  update
} from 'firebase/database';
import { firebaseDatabase } from '../config/firebase';

const MAX_MESSAGE_LENGTH = 1000;
const ACCEPTED_STATUS = 'accepted';
const PENDING_STATUS = 'pending';
const REJECTED_STATUS = 'rejected';
const BLOCKED_STATUS = 'blocked';

const toId = (value) => {
  if (value === null || value === undefined || value === '') return '';
  return String(value);
};

export const getChatId = (firstUserId, secondUserId) => {
  const first = toId(firstUserId);
  const second = toId(secondUserId);
  if (!first || !second) return '';
  return [first, second].sort().join('_');
};

const getLegacyNumericChatId = (firstUserId, secondUserId) => {
  const first = toId(firstUserId);
  const second = toId(secondUserId);
  if (!first || !second) return '';

  const firstNumber = Number(first);
  const secondNumber = Number(second);
  if (Number.isFinite(firstNumber) && Number.isFinite(secondNumber)) {
    return firstNumber <= secondNumber ? `${first}_${second}` : `${second}_${first}`;
  }

  return getChatId(first, second);
};

export const getSystemUserId = (user) =>
  toId(user?.id ?? user?.userId ?? user?.user_id ?? user?.accountId ?? user?.account_id);

export const getAlumniChatUserId = (alumnus) =>
  toId(
    alumnus?.userId ??
      alumnus?.user_id ??
      alumnus?.accountId ??
      alumnus?.account_id ??
      alumnus?.user?.id
  );

export const normalizeChatUser = (entry = {}) => {
  const userId = getAlumniChatUserId(entry) || getSystemUserId(entry);
  const firstName = entry.firstName || entry.first_name || '';
  const lastName = entry.lastName || entry.last_name || '';
  const displayName =
    entry.displayName ||
    entry.username ||
    `${firstName} ${lastName}`.trim() ||
    entry.email ||
    'Alumni';

  return {
    userId,
    alumniId: entry.id ? String(entry.id) : '',
    chatId: entry.chatId || '',
    displayName,
    email: entry.email || '',
    profileImage: entry.profileImage || entry.profile_image || '',
    course: entry.course || '',
    batch: entry.batch || '',
    role: entry.role || entry.userRole || entry.user_type || ''
  };
};

export const listenToUserStatuses = (userIds, callback) => {
  const wanted = new Set((userIds || []).map(toId).filter(Boolean));
  if (!wanted.size) {
    callback({});
    return () => {};
  }

  const statusRef = ref(firebaseDatabase, 'usersStatus');
  return onValue(statusRef, (snapshot) => {
    const allStatuses = snapshot.val() || {};
    const filtered = {};
    wanted.forEach((userId) => {
      filtered[userId] = allStatuses[userId] || { online: false, lastActive: null };
    });
    callback(filtered);
  });
};

export const setupPresence = (user) => {
  const userId = getSystemUserId(user);
  if (!userId) return () => {};

  const statusRef = ref(firebaseDatabase, `usersStatus/${userId}`);
  const connectedRef = ref(firebaseDatabase, '.info/connected');
  const displayName = user?.username || user?.name || user?.email || 'Alumni';

  const unsubscribe = onValue(connectedRef, (snapshot) => {
    if (snapshot.val() !== true) return;

    const offlineState = {
      online: false,
      lastActive: serverTimestamp(),
      displayName
    };

    onDisconnect(statusRef).set(offlineState);
    set(statusRef, {
      online: true,
      lastActive: serverTimestamp(),
      displayName
    });
  });

  return () => {
    unsubscribe();
    set(statusRef, {
      online: false,
      lastActive: serverTimestamp(),
      displayName
    });
  };
};

export const listenToMessages = (chatId, callback) => {
  if (!chatId) {
    callback([]);
    return () => {};
  }

  const messagesQuery = query(
    ref(firebaseDatabase, `messages/${chatId}`),
    orderByChild('timestamp'),
    limitToLast(100)
  );

  return onValue(messagesQuery, (snapshot) => {
    const value = snapshot.val() || {};
    const messages = Object.entries(value)
      .map(([id, message]) => ({ id, ...message }))
      .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    callback(messages);
  });
};

export const listenToConversationSummaries = (userId, callback) => {
  const ownerId = toId(userId);
  if (!ownerId) {
    callback({});
    return () => {};
  }

  return onValue(ref(firebaseDatabase, `conversationMembers/${ownerId}`), (snapshot) => {
    callback(snapshot.val() || {});
  });
};

export const markConversationRead = async (userId, chatId) => {
  const ownerId = toId(userId);
  if (!ownerId || !chatId) return;
  await update(ref(firebaseDatabase, `conversationMembers/${ownerId}/${chatId}`), {
    unreadCount: 0,
    lastReadAt: serverTimestamp()
  });
};

export const acceptMessageRequest = async ({ chatId, currentUserId }) => {
  const ownerId = toId(currentUserId);
  if (!chatId || !ownerId) throw new Error('Unable to accept this message request.');

  const conversationSnapshot = await get(ref(firebaseDatabase, `conversations/${chatId}`));
  const conversation = conversationSnapshot.val();

  if (!conversation) throw new Error('This message request no longer exists.');
  if (String(conversation.requestTo || '') !== ownerId) {
    throw new Error('Only the request receiver can accept this message request.');
  }

  const updates = {
    [`conversations/${chatId}/status`]: ACCEPTED_STATUS,
    [`conversations/${chatId}/acceptedAt`]: serverTimestamp(),
    [`chats/${chatId}/status`]: ACCEPTED_STATUS,
    [`chats/${chatId}/acceptedAt`]: serverTimestamp()
  };

  Object.keys(conversation.participantIds || conversation.participants || {}).forEach((participantId) => {
    updates[`conversationMembers/${participantId}/${chatId}/status`] = ACCEPTED_STATUS;
    updates[`conversationMembers/${participantId}/${chatId}/acceptedAt`] = serverTimestamp();
  });

  await update(ref(firebaseDatabase), updates);
  await markConversationRead(ownerId, chatId);
};

export const blockMessageRequest = async ({ chatId, currentUserId }) => {
  const ownerId = toId(currentUserId);
  if (!chatId || !ownerId) throw new Error('Unable to block this message request.');

  const conversationSnapshot = await get(ref(firebaseDatabase, `conversations/${chatId}`));
  const conversation = conversationSnapshot.val();

  if (!conversation) throw new Error('This message request no longer exists.');
  if (String(conversation.requestTo || '') !== ownerId) {
    throw new Error('Only the request receiver can block this message request.');
  }

  const participantIds = Object.keys(conversation.participantIds || conversation.participants || {});
  const blockedUserId = toId(conversation.requestedBy) || participantIds.find((participantId) => participantId !== ownerId);
  if (!blockedUserId) throw new Error('Unable to determine which user to block.');

  const updates = {
    [`conversations/${chatId}/status`]: BLOCKED_STATUS,
    [`conversations/${chatId}/blockedBy`]: ownerId,
    [`conversations/${chatId}/blockedUser`]: blockedUserId,
    [`conversations/${chatId}/blockedAt`]: serverTimestamp(),
    [`conversations/${chatId}/rejectedAt`]: null,
    [`chats/${chatId}/status`]: BLOCKED_STATUS,
    [`chats/${chatId}/blockedBy`]: ownerId,
    [`chats/${chatId}/blockedUser`]: blockedUserId,
    [`chats/${chatId}/blockedAt`]: serverTimestamp(),
    [`chats/${chatId}/rejectedAt`]: null,
    [`blockedUsers/${ownerId}/${blockedUserId}`]: {
      chatId,
      blockedAt: serverTimestamp()
    }
  };

  participantIds.forEach((participantId) => {
    updates[`conversationMembers/${participantId}/${chatId}/status`] = BLOCKED_STATUS;
    updates[`conversationMembers/${participantId}/${chatId}/blockedBy`] = ownerId;
    updates[`conversationMembers/${participantId}/${chatId}/blockedUser`] = blockedUserId;
    updates[`conversationMembers/${participantId}/${chatId}/blockedAt`] = serverTimestamp();
    updates[`conversationMembers/${participantId}/${chatId}/rejectedAt`] = null;
    updates[`conversationMembers/${participantId}/${chatId}/unreadCount`] = 0;
  });

  await update(ref(firebaseDatabase), updates);
};

export const unblockChatUser = async ({ chatId, currentUserId }) => {
  const ownerId = toId(currentUserId);
  if (!chatId || !ownerId) throw new Error('Unable to unblock this user.');

  const conversationSnapshot = await get(ref(firebaseDatabase, `conversations/${chatId}`));
  const conversation = conversationSnapshot.val();

  if (!conversation) throw new Error('This blocked conversation no longer exists.');
  if (String(conversation.blockedBy || conversation.requestTo || '') !== ownerId) {
    throw new Error('Only the user who blocked this person can unblock them.');
  }

  const participantIds = Object.keys(conversation.participantIds || conversation.participants || {});
  const blockedUserId =
    toId(conversation.blockedUser) ||
    toId(conversation.requestedBy) ||
    participantIds.find((participantId) => participantId !== ownerId);
  if (!blockedUserId) throw new Error('Unable to determine which user to unblock.');

  const updates = {
    [`conversations/${chatId}/status`]: PENDING_STATUS,
    [`conversations/${chatId}/blockedBy`]: null,
    [`conversations/${chatId}/blockedUser`]: null,
    [`conversations/${chatId}/blockedAt`]: null,
    [`conversations/${chatId}/rejectedAt`]: null,
    [`chats/${chatId}/status`]: PENDING_STATUS,
    [`chats/${chatId}/blockedBy`]: null,
    [`chats/${chatId}/blockedUser`]: null,
    [`chats/${chatId}/blockedAt`]: null,
    [`chats/${chatId}/rejectedAt`]: null,
    [`blockedUsers/${ownerId}/${blockedUserId}`]: null
  };

  participantIds.forEach((participantId) => {
    updates[`conversationMembers/${participantId}/${chatId}/status`] = PENDING_STATUS;
    updates[`conversationMembers/${participantId}/${chatId}/blockedBy`] = null;
    updates[`conversationMembers/${participantId}/${chatId}/blockedUser`] = null;
    updates[`conversationMembers/${participantId}/${chatId}/blockedAt`] = null;
    updates[`conversationMembers/${participantId}/${chatId}/rejectedAt`] = null;
    updates[`conversationMembers/${participantId}/${chatId}/unreadCount`] = 0;
  });

  await update(ref(firebaseDatabase), updates);
};

export const sendChatMessage = async ({ sender, receiver, text }) => {
  const senderUser = normalizeChatUser(sender);
  const receiverUser = normalizeChatUser(receiver);
  const cleanText = String(text || '').trim();

  if (!senderUser.userId) throw new Error('Your account is missing a chat user ID.');
  if (!receiverUser.userId) throw new Error('This chat contact is missing a user ID.');
  if (senderUser.userId === receiverUser.userId) throw new Error('You cannot send a message to yourself.');
  if (!cleanText) throw new Error('Please enter a message before sending.');
  if (cleanText.length > MAX_MESSAGE_LENGTH) {
    throw new Error(`Messages must be ${MAX_MESSAGE_LENGTH} characters or less.`);
  }

  const preferredChatId = getChatId(senderUser.userId, receiverUser.userId);
  const legacyChatId = getLegacyNumericChatId(senderUser.userId, receiverUser.userId);
  const preferredSnapshot = await get(ref(firebaseDatabase, `conversations/${preferredChatId}`));
  const legacySnapshot =
    !preferredSnapshot.exists() && legacyChatId !== preferredChatId
      ? await get(ref(firebaseDatabase, `conversations/${legacyChatId}`))
      : null;
  const chatId = legacySnapshot?.exists() ? legacyChatId : preferredChatId;
  const conversationSnapshot = legacySnapshot?.exists() ? legacySnapshot : preferredSnapshot;
  const existingConversation = conversationSnapshot.val();
  const existingStatus = existingConversation?.status || ACCEPTED_STATUS;
  const isFirstMessage = !existingConversation;
  const senderBlockedReceiverSnapshot = await get(
    ref(firebaseDatabase, `blockedUsers/${senderUser.userId}/${receiverUser.userId}`)
  );
  const receiverBlockedSenderSnapshot = await get(
    ref(firebaseDatabase, `blockedUsers/${receiverUser.userId}/${senderUser.userId}`)
  );

  if (senderBlockedReceiverSnapshot.exists()) {
    throw new Error('You blocked this user. Unblock them to send a message.');
  }

  if (receiverBlockedSenderSnapshot.exists()) {
    throw new Error('You cannot send messages to this user.');
  }

  if (existingConversation?.status === BLOCKED_STATUS) {
    if (String(existingConversation.blockedBy || '') === senderUser.userId) {
      throw new Error('You blocked this user. Unblock them to send a message.');
    }
    throw new Error('You cannot send messages to this user.');
  }

  if (existingConversation?.status === PENDING_STATUS) {
    if (String(existingConversation.requestedBy || '') !== senderUser.userId) {
      throw new Error('Accept this message request before replying.');
    }
  }

  if (existingConversation?.status === REJECTED_STATUS) {
    throw new Error('You cannot send messages to this user.');
  }

  const conversationStatus = isFirstMessage ? PENDING_STATUS : existingStatus;
  const messageType = isFirstMessage ? 'request' : 'message';
  const messageRef = push(ref(firebaseDatabase, `messages/${chatId}`));
  const message = {
    id: messageRef.key,
    chatId,
    senderId: senderUser.userId,
    receiverId: receiverUser.userId,
    text: cleanText,
    message: cleanText,
    timestamp: serverTimestamp(),
    isRead: false,
    type: messageType,
    readBy: {
      [senderUser.userId]: true
    }
  };

  const latestMessage = {
    text: cleanText,
    message: cleanText,
    senderId: senderUser.userId,
    timestamp: serverTimestamp()
  };

  const requestedBy = existingConversation?.requestedBy || (isFirstMessage ? senderUser.userId : null);
  const requestTo = existingConversation?.requestTo || (isFirstMessage ? receiverUser.userId : null);

  const updates = {
    [`messages/${chatId}/${messageRef.key}`]: message,
    [`conversations/${chatId}`]: {
      chatId,
      requestedBy,
      requestTo,
      status: conversationStatus,
      participantIds: {
        [senderUser.userId]: true,
        [receiverUser.userId]: true
      },
      participants: {
        [senderUser.userId]: senderUser,
        [receiverUser.userId]: receiverUser
      },
      latestMessage,
      lastMessage: cleanText,
      lastMessageTime: serverTimestamp(),
      lastSenderId: senderUser.userId,
      createdAt: existingConversation?.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp()
    },
    [`chats/${chatId}/chatId`]: chatId,
    [`chats/${chatId}/participants/${senderUser.userId}`]: true,
    [`chats/${chatId}/participants/${receiverUser.userId}`]: true,
    [`chats/${chatId}/requestedBy`]: requestedBy,
    [`chats/${chatId}/requestTo`]: requestTo,
    [`chats/${chatId}/status`]: conversationStatus,
    [`chats/${chatId}/createdAt`]: existingConversation?.createdAt || serverTimestamp(),
    [`chats/${chatId}/lastMessage`]: cleanText,
    [`chats/${chatId}/lastMessageTime`]: serverTimestamp(),
    [`chats/${chatId}/lastSenderId`]: senderUser.userId,
    [`conversationMembers/${senderUser.userId}/${chatId}`]: {
      chatId,
      otherUserId: receiverUser.userId,
      otherUser: receiverUser,
      requestedBy,
      requestTo,
      status: conversationStatus,
      latestMessage,
      latestMessageText: cleanText,
      latestMessageSenderId: senderUser.userId,
      latestMessageAt: serverTimestamp(),
      unreadCount: 0,
      updatedAt: serverTimestamp()
    },
    [`conversationMembers/${receiverUser.userId}/${chatId}/chatId`]: chatId,
    [`conversationMembers/${receiverUser.userId}/${chatId}/otherUserId`]: senderUser.userId,
    [`conversationMembers/${receiverUser.userId}/${chatId}/otherUser`]: senderUser,
    [`conversationMembers/${receiverUser.userId}/${chatId}/requestedBy`]: requestedBy,
    [`conversationMembers/${receiverUser.userId}/${chatId}/requestTo`]: requestTo,
    [`conversationMembers/${receiverUser.userId}/${chatId}/status`]: conversationStatus,
    [`conversationMembers/${receiverUser.userId}/${chatId}/latestMessage`]: latestMessage,
    [`conversationMembers/${receiverUser.userId}/${chatId}/latestMessageText`]: cleanText,
    [`conversationMembers/${receiverUser.userId}/${chatId}/latestMessageSenderId`]: senderUser.userId,
    [`conversationMembers/${receiverUser.userId}/${chatId}/latestMessageAt`]: serverTimestamp(),
    [`conversationMembers/${receiverUser.userId}/${chatId}/updatedAt`]: serverTimestamp()
  };

  await update(ref(firebaseDatabase), updates);
  await runTransaction(
    ref(firebaseDatabase, `conversationMembers/${receiverUser.userId}/${chatId}/unreadCount`),
    (currentValue) => (Number(currentValue) || 0) + 1
  );

  return { chatId, messageId: messageRef.key };
};

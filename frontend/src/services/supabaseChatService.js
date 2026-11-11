import { createClient } from '@supabase/supabase-js';
import { API_BASE_URL } from '../config/apiBaseUrl';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.');
}

export const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

const MAX_MESSAGE_LENGTH = 1000;
const ACCEPTED_STATUS = 'accepted';
const PENDING_STATUS = 'pending';
const REJECTED_STATUS = 'rejected';
const BLOCKED_STATUS = 'blocked';
const DEFAULT_CHAT_CONTEXT = 'alumni';

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
    alumnus?.userId ||
      alumnus?.user_id ||
      alumnus?.accountId ||
      alumnus?.account_id ||
      alumnus?.user?.id ||
      (alumnus?.id ? `alumni-${alumnus.id}` : '')
  );

export const normalizeChatUser = (entry = {}) => {
  const nestedUser = entry.user || {};
  const directAlumniUserId = getAlumniChatUserId(entry);
  const userId =
    directAlumniUserId ||
    toId(getSystemUserId(entry)) ||
    toId(getSystemUserId(nestedUser)) ||
    (entry.id ? `alumni-${entry.id}` : '');
  const rawFirstName = entry.firstName || entry.first_name || nestedUser.firstName || nestedUser.first_name || '';
  const rawLastName = entry.lastName || entry.last_name || nestedUser.lastName || nestedUser.last_name || '';
  const safeFirstName = rawFirstName && !rawFirstName.includes('@') ? rawFirstName.trim() : '';
  const safeLastName = rawLastName && !rawLastName.includes('@') ? rawLastName.trim() : '';
  const fullName = `${safeFirstName} ${safeLastName}`.trim();

  const email = entry.email || nestedUser.email || '';
  const emailName = typeof email === 'string'
    ? email.split('@')[0].replace(/[._-]+/g, ' ').trim()
    : '';
  const friendlyEmailName = emailName
    ? emailName.replace(/\b\w/g, (letter) => letter.toUpperCase())
    : '';
  const providedDisplayName = typeof (entry.displayName || nestedUser.displayName) === 'string'
    ? (entry.displayName || nestedUser.displayName).trim()
    : '';
  const usableDisplayName = providedDisplayName && !providedDisplayName.includes('@')
    ? providedDisplayName
    : '';
  const rawUsername = entry.username || nestedUser.username || '';
  const usableUsername = rawUsername && !rawUsername.includes('@') ? rawUsername.trim() : '';

  let cleanDisplayName =
    fullName ||
    usableDisplayName ||
    usableUsername ||
    friendlyEmailName ||
    'Alumni';

  if (cleanDisplayName.includes('@')) {
    const part = cleanDisplayName.split('@')[0].replace(/[._-]+/g, ' ').trim();
    cleanDisplayName = part ? part.replace(/\b\w/g, (letter) => letter.toUpperCase()) : 'Alumni';
  }

  return {
    userId,
    alumniId: entry.id ? String(entry.id) : '',
    chatId: entry.chatId || '',
    displayName: cleanDisplayName,
    email,
    profileImage: entry.profileImage || entry.profile_image || '',
    course: entry.course || '',
    batch: entry.batch || '',
    role: entry.role || entry.userRole || entry.user_type || ''
  };
};

// Global Presence State
let presenceState = {};
let presenceChannel = null;
let currentPresencePayload = null;

const getPresenceChannel = () => {
  if (!supabase) return null;
  if (!presenceChannel) {
    presenceChannel = supabase.channel('online-users');
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        presenceState = presenceChannel.presenceState();
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && currentPresencePayload) {
          await presenceChannel.track(currentPresencePayload);
        }
      });
  }
  return presenceChannel;
};

export const listenToUserStatuses = (userIds, callback, onError) => {
  if (!supabase) {
    if (onError) onError(new Error("Supabase is not configured"));
    return () => {};
  }
  const wanted = new Set((userIds || []).map(toId).filter(Boolean));
  if (!wanted.size) {
    callback({});
    return () => {};
  }

  // Ensure channel is initialized
  getPresenceChannel();

  // Poll the presence state
  const interval = setInterval(() => {
    const filtered = {};
    // Supabase presenceState looks like: { "uuid-1": [{ userId, online, ... }], "uuid-2": [...] }
    const allPresences = Object.values(presenceState).flat();
    
    wanted.forEach((userId) => {
      const userPresence = allPresences.find(p => String(p.userId) === String(userId));
      if (userPresence) {
        filtered[userId] = {
          online: true,
          lastActive: userPresence.lastActive,
          displayName: userPresence.displayName
        };
      } else {
        filtered[userId] = { online: false, lastActive: null };
      }
    });
    callback(filtered);
  }, 1000);

  return () => clearInterval(interval);
};

export const setupPresence = (user) => {
  if (!supabase) return () => {};
  const userId = getSystemUserId(user);
  if (!userId) return () => {};

  const displayName = user?.username || user?.name || user?.email || 'Alumni';
  
  currentPresencePayload = {
    userId,
    online: true,
    lastActive: new Date().toISOString(),
    displayName
  };

  const channel = getPresenceChannel();

  if (channel.state === 'joined') {
    channel.track(currentPresencePayload);
  }

  return () => {
    currentPresencePayload = null;
    if (channel && channel.state === 'joined') {
      channel.untrack();
    }
  };
};

export const parseMessagePayload = (rawMessage, rawType) => {
  if (!rawMessage) return { text: '', mediaUrl: '', mediaType: '', fileName: '', mediaItems: [], replyTo: null, isUnsent: false };

  let text = String(rawMessage);
  let mediaUrl = '';
  let mediaType = rawType || '';
  let fileName = '';
  let mediaItems = [];
  let replyTo = null;

  if (text.startsWith('{') && text.endsWith('}')) {
    try {
      const parsed = JSON.parse(text);
      if (parsed.isUnsent) {
        return {
          text: '',
          mediaUrl: '',
          mediaType: '',
          fileName: '',
          mediaItems: [],
          replyTo: null,
          isUnsent: true,
          unsentBy: parsed.unsentBy
        };
      }
      replyTo = parsed.replyTo || null;
      if (Array.isArray(parsed.mediaItems) && parsed.mediaItems.length > 0) {
        mediaItems = parsed.mediaItems.map((item) => ({
          url: item.url,
          mediaType: item.mediaType || (item.url?.match(/\.(mp4|webm|mov|ogg)($|\?)/i) ? 'video' : 'image'),
          fileName: item.fileName || ''
        }));
        mediaUrl = mediaItems[0]?.url || '';
        mediaType = mediaItems[0]?.mediaType || 'image';
        fileName = mediaItems[0]?.fileName || '';
        text = parsed.caption || parsed.text || '';
        return { text, mediaUrl, mediaType, fileName, mediaItems, replyTo, isUnsent: false };
      }
      if (parsed.mediaUrl) {
        mediaUrl = parsed.mediaUrl;
        text = parsed.caption || parsed.text || '';
        mediaType = parsed.mediaType || mediaType || (mediaUrl.match(/\.(mp4|webm|mov|ogg)($|\?)/i) ? 'video' : 'image');
        fileName = parsed.fileName || '';
        mediaItems = [{ url: mediaUrl, mediaType, fileName }];
        return { text, mediaUrl, mediaType, fileName, mediaItems, replyTo, isUnsent: false };
      }
      if (parsed.text !== undefined || parsed.replyTo !== undefined) {
        text = parsed.text || parsed.caption || '';
        return { text, mediaUrl, mediaType, fileName, mediaItems, replyTo, isUnsent: false };
      }
    } catch {}
  }

  if ((rawType === 'image' || rawType === 'video') && /^(https?:\/\/|\/)/i.test(text.trim())) {
    mediaUrl = text.trim();
    mediaType = rawType;
    mediaItems = [{ url: mediaUrl, mediaType, fileName: '' }];
    text = '';
    return { text, mediaUrl, mediaType, fileName, mediaItems, replyTo: null, isUnsent: false };
  }

  const trimmed = text.trim();
  if (/^https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|svg|bmp)($|\?)/i.test(trimmed)) {
    mediaUrl = trimmed;
    mediaType = 'image';
    mediaItems = [{ url: mediaUrl, mediaType, fileName: '' }];
    text = '';
    return { text, mediaUrl, mediaType, fileName, mediaItems, replyTo: null, isUnsent: false };
  }
  if (/^https?:\/\/[^\s]+\.(mp4|webm|mov|ogg)($|\?)/i.test(trimmed)) {
    mediaUrl = trimmed;
    mediaType = 'video';
    mediaItems = [{ url: mediaUrl, mediaType, fileName: '' }];
    text = '';
    return { text, mediaUrl, mediaType, fileName, mediaItems, replyTo: null, isUnsent: false };
  }

  return { text, mediaUrl, mediaType, fileName, mediaItems, replyTo: null, isUnsent: false };
};

export const listenToMessages = (chatId, callback, onError) => {
  if (!supabase || !chatId) {
    callback([]);
    return () => {};
  }

  const formatMessageRow = (msg) => {
    const parsed = parseMessagePayload(msg.message, msg.type);
    return {
      ...msg,
      senderId: msg.sender_id,
      receiverId: msg.receiver_id,
      chatId: msg.chat_id,
      text: parsed.text,
      mediaUrl: parsed.mediaUrl,
      mediaType: parsed.mediaType,
      fileName: parsed.fileName,
      mediaItems: parsed.mediaItems || [],
      replyTo: parsed.replyTo || null,
      isUnsent: parsed.isUnsent || msg.type === 'unsent',
      unsentBy: parsed.unsentBy,
      timestamp: new Date(msg.created_at).getTime(),
      context: msg.context || DEFAULT_CHAT_CONTEXT
    };
  };

  // Initial fetch
  supabase
    .from('chat_messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true })
    .limit(100)
    .then(({ data, error }) => {
      if (error && onError) {
          onError(error);
          return;
      }
      
      const messages = (data || []).map(formatMessageRow);
      callback(messages);
    });

  // Realtime subscription
  const channel = supabase
    .channel(`public:chat_messages:chat_id=eq.${chatId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages', filter: `chat_id=eq.${chatId}` }, (payload) => {
      // Re-fetch to get the full sorted list, or append (simplified: re-fetch)
      supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true })
        .limit(100)
        .then(({ data }) => {
            const messages = (data || []).map(formatMessageRow);
            callback(messages);
        });
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

export const listenToConversationSummaries = (userId, callback, onError) => {
  const ownerId = toId(userId);
  if (!supabase || !ownerId) {
    callback({});
    return () => {};
  }

  const fetchSummaries = async () => {
    const { data: participants, error: pError } = await supabase
        .from('chat_participants')
        .select('*, chat_conversations(*)')
        .eq('user_id', ownerId);

    if (pError) {
        if (onError) onError(pError);
        return;
    }

    const chatIds = (participants || [])
      .map((participant) => participant.chat_conversations?.chat_id)
      .filter(Boolean);
    const { data: messageContexts, error: contextError } = chatIds.length
      ? await supabase
          .from('chat_messages')
          .select('chat_id, context')
          .in('chat_id', chatIds)
      : { data: [], error: null };

    if (contextError) {
      if (onError) onError(contextError);
      return;
    }

    const contextsByChatId = {};
    (messageContexts || []).forEach((message) => {
      const chatId = message.chat_id;
      if (!contextsByChatId[chatId]) contextsByChatId[chatId] = new Set();
      contextsByChatId[chatId].add(message.context || DEFAULT_CHAT_CONTEXT);
    });

    const summaries = {};
    for (const p of (participants || [])) {
        const conv = p.chat_conversations;
        if (!conv) continue;
        
        // We need the other user's ID to fetch their profile, but for simplicity
        // in realtime migration we assume the caller has profiles.
        // Actually, we must determine otherUserId from chat_id
        const chatParts = conv.chat_id.split('_');
        const otherUserId = chatParts[0] === ownerId ? chatParts[1] : chatParts[0];

        summaries[conv.chat_id] = {
            chatId: conv.chat_id,
            otherUserId,
            requestedBy: conv.requested_by,
            requestTo: conv.request_to,
            status: conv.status,
            blockedBy: conv.blocked_by,
            blockedUser: conv.blocked_user,
            latestMessageText: conv.last_message,
            latestMessageSenderId: conv.last_sender_id,
            latestMessageAt: new Date(conv.last_message_time || conv.updated_at).getTime(),
            unreadCount: p.unread_count,
            updatedAt: new Date(p.updated_at).getTime(),
            contexts: Array.from(contextsByChatId[conv.chat_id] || [])
        };
    }
    callback(summaries);
  };

  fetchSummaries();

  const channelParts = supabase
    .channel(`public:chat_participants:user_id=eq.${ownerId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_participants', filter: `user_id=eq.${ownerId}` }, () => {
      fetchSummaries();
    })
    .subscribe();

  const channelConvs = supabase
    .channel(`public:chat_conversations`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_conversations' }, () => {
      // Re-fetching all is easiest for now, though less efficient
      fetchSummaries();
    })
    .subscribe();

  const channelMessages = supabase
    .channel(`public:chat_messages:owner=${ownerId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, () => {
      fetchSummaries();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channelParts);
    supabase.removeChannel(channelConvs);
    supabase.removeChannel(channelMessages);
  };
};

export const markConversationRead = async (userId, chatId) => {
  const ownerId = toId(userId);
  if (!supabase || !ownerId || !chatId) return;
  try {
    await supabase
        .from('chat_participants')
        .update({ unread_count: 0, updated_at: new Date().toISOString() })
        .eq('user_id', ownerId)
        .eq('chat_id', chatId);
  } catch (err) {
    console.warn('markConversationRead error:', err.message);
  }
};

export const acceptMessageRequest = async ({ chatId, currentUserId }) => {
  const ownerId = toId(currentUserId);
  if (!supabase || !chatId || !ownerId) throw new Error('Unable to accept this message request.');

  const { data: conversation } = await supabase
    .from('chat_conversations')
    .select('*')
    .eq('chat_id', chatId)
    .single();

  if (!conversation) throw new Error('This message request no longer exists.');
  if (String(conversation.request_to || '') !== ownerId) {
    throw new Error('Only the request receiver can accept this message request.');
  }

  await supabase
    .from('chat_conversations')
    .update({ status: ACCEPTED_STATUS, updated_at: new Date().toISOString() })
    .eq('chat_id', chatId);

  await markConversationRead(ownerId, chatId);
};

export const blockMessageRequest = async ({ chatId, currentUserId }) => {
  const ownerId = toId(currentUserId);
  if (!supabase || !chatId || !ownerId) throw new Error('Unable to block this message request.');

  const { data: conversation } = await supabase
    .from('chat_conversations')
    .select('*')
    .eq('chat_id', chatId)
    .single();

  if (!conversation) throw new Error('This message request no longer exists.');
  if (String(conversation.request_to || '') !== ownerId) {
    throw new Error('Only the request receiver can block this message request.');
  }

  const chatParts = chatId.split('_');
  const blockedUserId = chatParts[0] === ownerId ? chatParts[1] : chatParts[0];

  await supabase
    .from('chat_conversations')
    .update({ 
        status: BLOCKED_STATUS, 
        blocked_by: ownerId, 
        blocked_user: blockedUserId,
        updated_at: new Date().toISOString() 
    })
    .eq('chat_id', chatId);
};

export const unblockChatUser = async ({ chatId, currentUserId }) => {
  const ownerId = toId(currentUserId);
  if (!supabase || !chatId || !ownerId) throw new Error('Unable to unblock this user.');

  const { data: conversation } = await supabase
    .from('chat_conversations')
    .select('*')
    .eq('chat_id', chatId)
    .single();

  if (!conversation) throw new Error('This blocked conversation no longer exists.');
  if (String(conversation.blocked_by || conversation.request_to || '') !== ownerId) {
    throw new Error('Only the user who blocked this person can unblock them.');
  }

  await supabase
    .from('chat_conversations')
    .update({ 
        status: PENDING_STATUS, 
        blocked_by: null, 
        blocked_user: null,
        updated_at: new Date().toISOString() 
    })
    .eq('chat_id', chatId);
};

export const uploadChatMedia = async (fileOrFiles) => {
  const files = Array.isArray(fileOrFiles) ? fileOrFiles : [fileOrFiles];
  if (!files.length || !files[0]) throw new Error('No file selected.');

  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });

  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}/chat/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to upload media file.');
  }

  const data = await response.json();
  const returnedFiles = data.files || [{
    url: data.url,
    mediaType: data.mediaType,
    fileName: data.fileName,
    fileSize: data.fileSize
  }];

  return returnedFiles;
};

export const sendChatMessage = async ({
  sender,
  receiver,
  text = '',
  mediaItems = [],
  mediaUrl = '',
  mediaType = '',
  fileName = '',
  context = DEFAULT_CHAT_CONTEXT,
  replyTo = null
}) => {
  if (!supabase) throw new Error('Supabase is not configured.');
  const senderUser = normalizeChatUser(sender);
  const receiverUser = normalizeChatUser(receiver);
  const cleanText = String(text || '').trim();

  const hasMedia = (Array.isArray(mediaItems) && mediaItems.length > 0) || Boolean(mediaUrl);

  if (!senderUser.userId) throw new Error('Your account is missing a chat user ID.');
  if (!receiverUser.userId) throw new Error('This chat contact is missing a user ID.');
  if (senderUser.userId === receiverUser.userId) throw new Error('You cannot send a message to yourself.');
  if (!cleanText && !hasMedia) throw new Error('Please enter a message or attach a file.');
  if (cleanText.length > MAX_MESSAGE_LENGTH) {
    throw new Error(`Messages must be ${MAX_MESSAGE_LENGTH} characters or less.`);
  }
  const messageContext = context === 'employment' ? 'employment' : DEFAULT_CHAT_CONTEXT;

  const preferredChatId = getChatId(senderUser.userId, receiverUser.userId);
  const legacyChatId = getLegacyNumericChatId(senderUser.userId, receiverUser.userId);

  try {
    const { data: preferredConversation } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('chat_id', preferredChatId)
        .single();
        
    let existingConversation = preferredConversation;
    let chatId = preferredChatId;

    if (!existingConversation && legacyChatId !== preferredChatId) {
        const { data: legacyConversation } = await supabase
            .from('chat_conversations')
            .select('*')
            .eq('chat_id', legacyChatId)
            .single();
        if (legacyConversation) {
            existingConversation = legacyConversation;
            chatId = legacyChatId;
        }
    }

    const existingStatus = existingConversation?.status || ACCEPTED_STATUS;
    const isFirstMessage = !existingConversation;

    const { data: existingMessagesInContext } = await supabase
      .from('chat_messages')
      .select('id')
      .eq('chat_id', chatId)
      .eq('context', messageContext)
      .limit(1);

    const isFirstMessageInContext = !existingMessagesInContext || existingMessagesInContext.length === 0;

    if (existingConversation?.status === BLOCKED_STATUS) {
      if (String(existingConversation.blocked_by || '') === senderUser.userId) {
        throw new Error('You blocked this user. Unblock them to send a message.');
      }
      throw new Error('You cannot send messages to this user.');
    }

    if (!isFirstMessageInContext && existingConversation?.status === PENDING_STATUS) {
      if (String(existingConversation.requested_by || '') !== senderUser.userId) {
        throw new Error('Accept this message request before replying.');
      }
    }

    if (existingConversation?.status === REJECTED_STATUS) {
      throw new Error('You cannot send messages to this user.');
    }

    let conversationStatus = existingStatus;
    let requestedBy = existingConversation?.requested_by || null;
    let requestTo = existingConversation?.request_to || null;

    if (isFirstMessage || (isFirstMessageInContext && existingStatus !== ACCEPTED_STATUS)) {
      conversationStatus = PENDING_STATUS;
      requestedBy = senderUser.userId;
      requestTo = receiverUser.userId;
    }

    // Determine payload and message type
    let messagePayload = cleanText;
    let messageType = (isFirstMessage || isFirstMessageInContext) ? 'request' : 'message';
    let lastMessageSummary = cleanText;

    let allMediaItems = Array.isArray(mediaItems) && mediaItems.length > 0 ? [...mediaItems] : [];
    if (!allMediaItems.length && mediaUrl) {
      allMediaItems.push({ url: mediaUrl, mediaType: mediaType || 'image', fileName });
    }

    if (allMediaItems.length > 0 || replyTo) {
      const isMulti = allMediaItems.length > 1;
      const firstIsVideo = allMediaItems[0]?.mediaType === 'video';
      if (allMediaItems.length > 0) {
        messageType = firstIsVideo ? 'video' : 'image';
      }
      messagePayload = JSON.stringify({
        mediaItems: allMediaItems,
        mediaUrl: allMediaItems[0]?.url || '',
        mediaType: allMediaItems[0]?.mediaType || '',
        caption: cleanText,
        text: cleanText,
        fileName: allMediaItems[0]?.fileName || '',
        replyTo: replyTo ? {
          id: replyTo.id,
          senderId: replyTo.senderId,
          senderName: replyTo.senderName || '',
          text: replyTo.text || (replyTo.mediaItems?.length ? (replyTo.mediaType === 'video' ? '[video]' : '[photo]') : ''),
          mediaUrl: replyTo.mediaUrl || (replyTo.mediaItems?.[0]?.url || ''),
          mediaType: replyTo.mediaType || (replyTo.mediaItems?.[0]?.mediaType || '')
        } : null
      });
      if (allMediaItems.length > 0) {
        lastMessageSummary = isMulti
          ? `[photos:${allMediaItems.length}]`
          : (firstIsVideo ? '[video]' : '[photo]');
      }
    }

    // 1. Upsert Conversation
    const { error: convError } = await supabase
        .from('chat_conversations')
        .upsert({
            chat_id: chatId,
            requested_by: requestedBy,
            request_to: requestTo,
            status: conversationStatus,
            last_message: lastMessageSummary,
            last_message_time: new Date().toISOString(),
            last_sender_id: senderUser.userId,
            updated_at: new Date().toISOString()
        }, { onConflict: 'chat_id' });
        
    if (convError) throw convError;

    // 2. Upsert Participants
    await supabase.from('chat_participants').upsert({
        chat_id: chatId,
        user_id: senderUser.userId,
        updated_at: new Date().toISOString()
    }, { onConflict: 'chat_id, user_id' });
    
    // For receiver, we need to increment unread count.
    // Fetch current unread count
    const { data: receiverPart } = await supabase
        .from('chat_participants')
        .select('unread_count')
        .eq('chat_id', chatId)
        .eq('user_id', receiverUser.userId)
        .single();
        
    await supabase.from('chat_participants').upsert({
        chat_id: chatId,
        user_id: receiverUser.userId,
        unread_count: (receiverPart?.unread_count || 0) + 1,
        updated_at: new Date().toISOString()
    }, { onConflict: 'chat_id, user_id' });

    // 3. Insert Message
    const { data: msgData, error: msgError } = await supabase
        .from('chat_messages')
        .insert({
            chat_id: chatId,
            sender_id: senderUser.userId,
            receiver_id: receiverUser.userId,
            message: messagePayload,
            type: messageType,
            context: messageContext
        })
        .select()
        .single();
        
    if (msgError) throw msgError;

    return { chatId, messageId: msgData.id };
  } catch (err) {
    throw err;
  }
};

export const unsendMessage = async (messageId, chatId) => {
  if (!supabase || !messageId) throw new Error('Message ID required.');

  try {
    const unsentPayload = JSON.stringify({
      isUnsent: true,
      unsentAt: new Date().toISOString()
    });

    const { error } = await supabase
      .from('chat_messages')
      .update({
        message: unsentPayload,
        type: 'unsent'
      })
      .eq('id', messageId);

    if (error) {
      console.warn('Supabase update failed, attempting delete fallback:', error.message);
      const { error: delError } = await supabase
        .from('chat_messages')
        .delete()
        .eq('id', messageId);
      if (delError) throw delError;
    }

    if (chatId) {
      const { data: latestMsg } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestMsg) {
        const parsed = parseMessagePayload(latestMsg.message, latestMsg.type);
        const lastMsgText = parsed.isUnsent
          ? 'Unsent a message'
          : (parsed.text || (parsed.mediaItems?.length ? '[photo]' : ''));
        await supabase
          .from('chat_conversations')
          .update({
            last_message: lastMsgText,
            updated_at: new Date().toISOString()
          })
          .eq('chat_id', chatId);
      }
    }

    return true;
  } catch (err) {
    console.error('Failed to unsend message:', err);
    throw err;
  }
};

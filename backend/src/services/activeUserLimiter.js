const MAX_ACTIVE_USERS = 50;
const SESSION_IDLE_TIMEOUT_MS = Number(process.env.ACTIVE_SESSION_IDLE_TIMEOUT_MS || 30 * 60 * 1000);

const activeSessions = new Map();
const activeUserRefs = new Map();

const toUserKey = (user) => {
  const role = String(user?.role || 'USER').toUpperCase();
  const id = user?.id;

  if (id === undefined || id === null) {
    return null;
  }

  return `${role}:${id}`;
};

const toSessionKey = (token, userKey) => {
  if (token && typeof token === 'string') {
    return `token:${token}`;
  }

  if (userKey) {
    return `user:${userKey}`;
  }

  return null;
};

const incrementUserRef = (userKey) => {
  const current = activeUserRefs.get(userKey) || 0;
  activeUserRefs.set(userKey, current + 1);
};

const decrementUserRef = (userKey) => {
  const current = activeUserRefs.get(userKey) || 0;

  if (current <= 1) {
    activeUserRefs.delete(userKey);
    return;
  }

  activeUserRefs.set(userKey, current - 1);
};

const purgeExpiredSessions = () => {
  const now = Date.now();

  for (const [sessionKey, session] of activeSessions.entries()) {
    if (now - session.lastSeenAt > SESSION_IDLE_TIMEOUT_MS) {
      decrementUserRef(session.userKey);
      activeSessions.delete(sessionKey);
    }
  }
};

const tryEnter = ({ token, user } = {}) => {
  purgeExpiredSessions();

  const userKey = toUserKey(user);
  const sessionKey = toSessionKey(token, userKey);

  if (!sessionKey || !userKey) {
    return {
      allowed: false,
      reason: 'invalid-session',
      activeUsers: activeUserRefs.size,
      maxActiveUsers: MAX_ACTIVE_USERS
    };
  }

  const now = Date.now();

  if (activeSessions.has(sessionKey)) {
    activeSessions.set(sessionKey, {
      userKey,
      lastSeenAt: now
    });
    return {
      allowed: true,
      activeUsers: activeUserRefs.size,
      maxActiveUsers: MAX_ACTIVE_USERS
    };
  }

  if (activeUserRefs.size >= MAX_ACTIVE_USERS && !activeUserRefs.has(userKey)) {
    return {
      allowed: false,
      reason: 'at-capacity',
      activeUsers: activeUserRefs.size,
      maxActiveUsers: MAX_ACTIVE_USERS
    };
  }

  activeSessions.set(sessionKey, {
    userKey,
    lastSeenAt: now
  });
  incrementUserRef(userKey);

  return {
    allowed: true,
    activeUsers: activeUserRefs.size,
    maxActiveUsers: MAX_ACTIVE_USERS
  };
};

const leave = ({ token, user } = {}) => {
  const userKey = toUserKey(user);
  const sessionKey = toSessionKey(token, userKey);

  if (!sessionKey) {
    return false;
  }

  const existing = activeSessions.get(sessionKey);
  if (!existing) {
    return false;
  }

  decrementUserRef(existing.userKey);
  return activeSessions.delete(sessionKey);
};

const getLimiterStatus = () => {
  purgeExpiredSessions();

  let activeAlumniUsers = 0;
  for (const userKey of activeUserRefs.keys()) {
    if (userKey.startsWith('ALUMNI:') || userKey.startsWith('USER:')) {
      activeAlumniUsers += 1;
    }
  }

  return {
    activeUsers: activeUserRefs.size,
    activeAlumniUsers,
    activeSessions: activeSessions.size,
    maxActiveUsers: MAX_ACTIVE_USERS,
    sessionIdleTimeoutMs: SESSION_IDLE_TIMEOUT_MS
  };
};

setInterval(purgeExpiredSessions, Math.max(30_000, Math.floor(SESSION_IDLE_TIMEOUT_MS / 2))).unref();

module.exports = {
  tryEnter,
  leave,
  getLimiterStatus
};

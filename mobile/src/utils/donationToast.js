export const getInitials = (name) => {
  const parts = String(name || 'A')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
};

const stripDuplicatePrefix = (message, title) => {
  if (!message || !title) return message?.trim() || '';
  const msg = message.trim();
  const prefix = title.trim();
  if (msg.toLowerCase().startsWith(prefix.toLowerCase())) {
    return msg.slice(prefix.length).replace(/^[\s.:,-]+/, '').trim();
  }
  return msg;
};

const stripPaymentDetailLines = (text) => {
  return String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !/^(payment method|currency)\s*:/i.test(line))
    .join('\n')
    .trim();
};

export const buildDonationCopy = ({ amountLabel, campaignName, donationKind, title, message }) => {
  const campaign = campaignName?.trim() || 'a campaign';
  const kind = String(donationKind || '').toLowerCase();

  let gift = 'a contribution';
  if (amountLabel && kind === 'items') {
    gift = `${amountLabel} and items`;
  } else if (kind === 'items') {
    gift = 'items';
  } else if (amountLabel) {
    gift = amountLabel;
  }

  const rawDetail = stripPaymentDetailLines(stripDuplicatePrefix(message, title));
  let detail = '';
  if (rawDetail) {
    const donationForMatch = rawDetail.match(/^(?:donation for|note|notes):\s*(.+)/i);
    detail = donationForMatch ? donationForMatch[1].trim() : rawDetail;
  }

  const fullLine = `${gift} to ${campaign}`.toLowerCase();
  if (detail && detail.toLowerCase() === fullLine) {
    detail = '';
  }

  return { gift, campaign, detail };
};

export const formatRelativeTime = (timestamp) => {
  const diffMs = Date.now() - timestamp;
  if (diffMs < 10_000) return 'Just now';
  const diffSeconds = Math.floor(diffMs / 1000);
  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  return `${diffHours}h ago`;
};

export const parseDonationPayload = (payload = {}) => {
  const type = payload?.type || payload?.notification?.type || null;
  if (!type || String(type).toUpperCase() !== 'DONATION') return null;

  const title = payload?.title || payload?.notification?.title || '';
  const message = payload?.message || payload?.notification?.message || '';
  const senderName =
    payload?.senderName ||
    payload?.notification?.sender_name ||
    payload?.notification?.senderName ||
    'An alumnus';
  const senderProfileImage =
    payload?.senderProfileImage ||
    payload?.notification?.sender_profile_image ||
    payload?.notification?.senderProfileImage ||
    '';
  const amountLabel = payload?.amountLabel || payload?.notification?.amountLabel || '';
  const campaignName = payload?.campaignName || payload?.notification?.campaignName || '';
  const donationKind = payload?.donationKind || payload?.notification?.donationKind || '';

  const { gift, campaign, detail } = buildDonationCopy({
    amountLabel,
    campaignName,
    donationKind,
    title,
    message
  });

  return {
    id: payload?.notification?.id || `don-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    senderName,
    senderProfileImage,
    gift,
    campaign,
    detail
  };
};

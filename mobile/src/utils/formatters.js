export const formatDate = (value) => {
  if (!value) return 'No date';
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return String(value);
  }
};

export const formatCurrency = (value) => {
  const number = Number(value);
  if (Number.isNaN(number)) return 'PHP 0';
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0
  }).format(number);
};

export const fullName = (obj) => {
  const first = obj?.first_name || obj?.firstName || '';
  const last = obj?.last_name || obj?.lastName || '';
  return `${first} ${last}`.trim() || obj?.username || obj?.email || 'Unknown';
};

export const timeAgo = (value) => {
  if (!value) return '';
  try {
    const now = Date.now();
    const then = new Date(value).getTime();
    if (isNaN(then)) return '';
    const seconds = Math.floor((now - then) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks}w ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    const years = Math.floor(days / 365);
    return `${years}y ago`;
  } catch {
    return '';
  }
};

export const imageUrl = (path, baseOrigin) => {
  if (!path) return null;
  const str = String(path).trim();
  if (!str) return null;
  if (str.startsWith('http')) {
    if (baseOrigin && str.includes('localhost')) {
      try {
        const origin = new URL(baseOrigin);
        return str.replace(/\/\/localhost(:\d+)?/, `//${origin.hostname}${origin.port ? ':' + origin.port : ''}`);
      } catch {
        return str;
      }
    }
    return str;
  }
  if (!baseOrigin) return path;
  const cleanPath = str.startsWith('/') ? str : `/${str}`;
  return `${baseOrigin}${cleanPath}`;
};

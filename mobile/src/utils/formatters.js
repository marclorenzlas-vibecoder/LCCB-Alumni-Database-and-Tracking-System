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

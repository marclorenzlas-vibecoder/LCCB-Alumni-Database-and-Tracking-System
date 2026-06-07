export const toMultipartFile = (asset, fallbackName = 'upload.jpg') => {
  if (!asset?.uri) return null;

  const uri = asset.uri;
  const name = asset.fileName || fallbackName;
  const ext = name.includes('.') ? name.split('.').pop() : 'jpg';
  const mimeType = asset.mimeType || `image/${ext === 'jpg' ? 'jpeg' : ext}`;

  return {
    uri,
    name,
    type: mimeType
  };
};

export const ensureFormDataValue = (value) => {
  if (value === undefined || value === null) return '';
  return String(value);
};

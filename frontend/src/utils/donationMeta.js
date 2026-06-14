const META_START = '[[DONATION_META]]';
const META_END = '[[/DONATION_META]]';

export const extractDonationMeta = (rawDescription = '') => {
  if (!rawDescription || typeof rawDescription !== 'string') {
    return {
      cleanDescription: '',
      meta: {}
    };
  }

  const startIndex = rawDescription.indexOf(META_START);
  const endIndex = rawDescription.indexOf(META_END);

  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    const strippedDescription = rawDescription
      .split(/\n\s*\n(?=Donation for:|Donor:)/i)[0]
      .trim();
    return {
      cleanDescription: strippedDescription,
      meta: {}
    };
  }

  const metaRaw = rawDescription
    .slice(startIndex + META_START.length, endIndex)
    .trim();

  let meta = {};
  try {
    meta = JSON.parse(metaRaw);
  } catch {
    meta = {};
  }

  const withoutMeta = `${rawDescription.slice(0, startIndex)}${rawDescription.slice(endIndex + META_END.length)}`;

  const strippedDescription = withoutMeta
    .split(/\n\s*\n(?=Donation for:|Donor:)/i)[0]
    .trim();

  return {
    cleanDescription: strippedDescription,
    meta: meta && typeof meta === 'object' ? meta : {}
  };
};

export const withDonationMeta = (cleanDescription = '', meta = {}) => {
  const sanitizedMeta = {
    donationMode: typeof meta.donationMode === 'string' ? meta.donationMode.trim() : '',
    acceptedItems: typeof meta.acceptedItems === 'string' ? meta.acceptedItems.trim() : '',
    itemInstructions: typeof meta.itemInstructions === 'string' ? meta.itemInstructions.trim() : '',
    qrCodeUrl: typeof meta.qrCodeUrl === 'string' ? meta.qrCodeUrl.trim() : '',
    qrImagePath: typeof meta.qrImagePath === 'string' ? meta.qrImagePath.trim() : '',
    paymentNumber: typeof meta.paymentNumber === 'string' ? meta.paymentNumber.trim() : '',
    paymentMethods: typeof meta.paymentMethods === 'string' ? meta.paymentMethods.trim() : '',
    deliveryInstructions: typeof meta.deliveryInstructions === 'string' ? meta.deliveryInstructions.trim() : ''
  };

  const hasMeta = Boolean(
    sanitizedMeta.donationMode || sanitizedMeta.acceptedItems || sanitizedMeta.itemInstructions || sanitizedMeta.qrCodeUrl || sanitizedMeta.qrImagePath || sanitizedMeta.paymentNumber || sanitizedMeta.paymentMethods || sanitizedMeta.deliveryInstructions
  );

  const base = (cleanDescription || '').trim();
  if (!hasMeta) return base;

  const encoded = JSON.stringify(sanitizedMeta);
  return base
    ? `${base}\n\n${META_START}${encoded}${META_END}`
    : `${META_START}${encoded}${META_END}`;
};

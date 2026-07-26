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
    paymentCurrency: typeof meta.paymentCurrency === 'string' ? meta.paymentCurrency.trim() : '',
    paymentNumber: typeof meta.paymentNumber === 'string' ? meta.paymentNumber.trim() : '',
    gcashNumber: typeof meta.gcashNumber === 'string' ? meta.gcashNumber.trim() : '',
    paymayaNumber: typeof meta.paymayaNumber === 'string' ? meta.paymayaNumber.trim() : '',
    paymentMethods: typeof meta.paymentMethods === 'string' ? meta.paymentMethods.trim() : '',
    deliveryInstructions: typeof meta.deliveryInstructions === 'string' ? meta.deliveryInstructions.trim() : '',
    deliveryMethod: typeof meta.deliveryMethod === 'string' ? meta.deliveryMethod.trim() : '',
    deliveryAddress: typeof meta.deliveryAddress === 'string' ? meta.deliveryAddress.trim() : '',
    deliverySchedule: typeof meta.deliverySchedule === 'string' ? meta.deliverySchedule.trim() : '',
    itemImagePaths: Array.isArray(meta.itemImagePaths)
      ? meta.itemImagePaths.filter((path) => typeof path === 'string' && path.trim()).map((path) => path.trim())
      : []
  };

  const hasMeta = Boolean(
    sanitizedMeta.donationMode ||
    sanitizedMeta.acceptedItems ||
    sanitizedMeta.itemInstructions ||
    sanitizedMeta.qrCodeUrl ||
    sanitizedMeta.qrImagePath ||
    sanitizedMeta.paymentCurrency ||
    sanitizedMeta.paymentNumber ||
    sanitizedMeta.gcashNumber ||
    sanitizedMeta.paymayaNumber ||
    sanitizedMeta.paymentMethods ||
    sanitizedMeta.deliveryInstructions ||
    sanitizedMeta.deliveryMethod ||
    sanitizedMeta.deliveryAddress ||
    sanitizedMeta.deliverySchedule ||
    sanitizedMeta.itemImagePaths.length > 0
  );

  const base = (cleanDescription || '').trim();
  if (!hasMeta) return base;

  const encoded = JSON.stringify(sanitizedMeta);
  return base
    ? `${base}\n\n${META_START}${encoded}${META_END}`
    : `${META_START}${encoded}${META_END}`;
};

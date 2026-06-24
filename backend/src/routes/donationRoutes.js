const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { alumniAuthMiddleware, teacherAuthMiddleware, flexibleAuthMiddleware } = require('../middleware/auth');

// ensure uploads/donations exists
const donationsDir = path.join(__dirname, '../../uploads/donations');
if (!fs.existsSync(donationsDir)) {
  fs.mkdirSync(donationsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, donationsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'donation-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ok = allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype);
    if (ok) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  }
});

const { broadcastUpdate } = require('../services/realtimeService');

const META_START = '[[DONATION_META]]';
const META_END = '[[/DONATION_META]]';

const parseDescriptionMeta = (rawDescription = '') => {
  if (!rawDescription || typeof rawDescription !== 'string') {
    return { cleanDescription: '', meta: {} };
  }

  const startIndex = rawDescription.indexOf(META_START);
  const endIndex = rawDescription.indexOf(META_END);

  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    return { cleanDescription: rawDescription.trim(), meta: {} };
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

  return {
    cleanDescription: withoutMeta.trim(),
    meta: meta && typeof meta === 'object' ? meta : {}
  };
};

const buildDescriptionWithMeta = (cleanDescription = '', meta = {}) => {
  const normalizedMeta = {
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
    normalizedMeta.donationMode ||
    normalizedMeta.acceptedItems ||
    normalizedMeta.itemInstructions ||
    normalizedMeta.qrCodeUrl ||
    normalizedMeta.qrImagePath ||
    normalizedMeta.paymentNumber ||
    normalizedMeta.paymentMethods ||
    normalizedMeta.deliveryInstructions
  );

  const base = (cleanDescription || '').trim();
  if (!hasMeta) return base;

  const encoded = JSON.stringify(normalizedMeta);
  return base
    ? `${base}\n\n${META_START}${encoded}${META_END}`
    : `${META_START}${encoded}${META_END}`;
};

const currencySymbols = {
  PHP: '₱',
  USD: '$',
  JPY: '¥',
  EUR: '€',
  GBP: '£',
  AUD: 'A$',
  CAD: 'C$',
  SGD: 'S$',
  HKD: 'HK$',
  NZD: 'NZ$',
  INR: '₹',
  CNY: '¥',
  KRW: '₩',
  THB: '฿',
  MYR: 'RM',
  IDR: 'Rp',
  VND: '₫',
  ZAR: 'R',
  CHF: 'CHF',
  SEK: 'kr',
  NOK: 'kr',
  DKK: 'kr',
  MXN: '$',
  BRL: 'R$',
  AED: 'د.إ',
  SAR: '﷼'
};

const formatDonationAmount = (amount, currency = 'PHP') => {
  const numericAmount = Number(amount || 0);
  const currencyCode = String(currency || 'PHP').toUpperCase();
  const symbol = currencySymbols[currencyCode] || currencyCode;
  const formattedAmount = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: currencyCode === 'JPY' ? 0 : 2,
    maximumFractionDigits: currencyCode === 'JPY' ? 0 : 2
  }).format(numericAmount);

  return `${symbol}${formattedAmount}`;
};

const inferDonationKind = (text = '') => {
  const normalized = String(text || '').toLowerCase();
  if (normalized.includes('money + items') || normalized.includes('money and items')) return 'money and items';
  if (normalized.includes('donation type: items') || normalized.includes('item donation')) return 'items';
  return 'money';
};

const extractAmountLabel = (text = '') => {
  const match = String(text || '').match(/donated\s+(.+?)\s+to\s+/i);
  return match?.[1]?.trim() || '';
};

const toLiveDonationActivity = (notification) => {
  const text = `${notification.title || ''}\n${notification.message || ''}`;

  return {
    id: notification.id,
    title: notification.title,
    message: notification.message,
    link: notification.link,
    senderName: notification.sender_name || 'Alumnus',
    senderProfileImage: notification.sender_profile_image || null,
    amountLabel: extractAmountLabel(notification.title || notification.message || ''),
    campaignName: notification.link ? null : '',
    donationKind: inferDonationKind(text),
    createdAt: notification.created_at
  };
};

const parseDonationActivitiesFromEntry = (entry, notificationMap = new Map(), alumniMap = new Map(), alumniMapById = new Map()) => {
  const { cleanDescription } = parseDescriptionMeta(entry.description || '');
  const matchedNotifications = notificationMap.get(`/donate/${entry.id}`) || [];
  const latestNotification = matchedNotifications[0] || null;

  const fallbackSenderName = [entry.alumni?.first_name, entry.alumni?.last_name]
    .filter(Boolean)
    .join(' ')
    .trim();
  const fallbackSenderProfileImage = entry.alumni?.profile_image || null;
  const fallbackCampaignName = entry.purpose || entry.category || 'a donation campaign';

  if (!cleanDescription.includes('Donor:')) {
    if (!entry.alumni && !entry.alumni_id) {
      return [];
    }

    const amountLabel = Number(entry.amount || 0) > 0 ? formatDonationAmount(entry.amount) : '';
    const donationKind = inferDonationKind(`${entry.description || ''}\n${entry.category || ''}\n${entry.purpose || ''}`);

    return [{
      id: `donation-${entry.id}`,
      title: latestNotification?.title || `${fallbackSenderName || 'Alumnus'} submitted a donation`,
      message: latestNotification?.message || cleanDescription || entry.description || entry.purpose || 'Donation submitted',
      link: latestNotification?.link || `/donate/${entry.id}`,
      senderName: latestNotification?.sender_name || fallbackSenderName || 'Alumnus',
      senderProfileImage: latestNotification?.sender_profile_image || fallbackSenderProfileImage,
      amountLabel: amountLabel || extractAmountLabel(latestNotification?.title || latestNotification?.message || ''),
      campaignName: latestNotification?.link ? fallbackCampaignName : fallbackCampaignName,
      donationKind,
      createdAt: latestNotification?.created_at || entry.date || new Date()
    }];
  }

  const purpose = fallbackCampaignName;

  return cleanDescription
    .split(/\n\s*\n(?=Donation for:)/i)
    .filter((block) => block.includes('Donor:'))
    .map((block, index) => {
      const donorName = extractLineValue(block, 'Donor') || latestNotification?.sender_name || fallbackSenderName || 'Alumnus';
      // Always strip honorific prefix for consistent display (frontend no longer sends them)
      const displayName = donorName.replace(/^(mr|ms|mrs|dr|mr\.|ms\.|mrs\.|dr\.)\s+/i, '').trim();
      const amountLabel = extractLineValue(block, 'Amount');
      const donationKind = inferDonationKind(block);
      const donationLabel = amountLabel || (donationKind === 'items' ? 'an item donation' : 'a donation');
      const createdAtRaw = extractLineValue(block, 'Recorded');
      const createdAt = createdAtRaw && !Number.isNaN(new Date(createdAtRaw).getTime())
        ? new Date(createdAtRaw)
        : latestNotification?.created_at || entry.date || new Date();

      // Prefer the stored AlumniId for O(1) profile image lookup; fall back to fuzzy name matching for older blocks
      const storedAlumniId = Number(extractLineValue(block, 'AlumniId') || 0);
      let matchedAlumni = storedAlumniId ? alumniMapById.get(storedAlumniId) : null;
      if (!matchedAlumni) {
        const clean = displayName.toLowerCase();
        matchedAlumni = alumniMap.get(clean);
        if (!matchedAlumni) {
          for (const [key, value] of alumniMap.entries()) {
            const cleanWords = clean.split(/\s+/).filter(w => w.length > 1);
            if (cleanWords.length >= 2 && cleanWords.every(word => key.includes(word))) {
              matchedAlumni = value;
              break;
            }
            const keyWords = key.split(/\s+/).filter(w => w.length > 1);
            if (keyWords.length >= 2 && keyWords.every(word => clean.includes(word))) {
              matchedAlumni = value;
              break;
            }
          }
        }
      }
      const senderProfileImage = matchedAlumni?.profile_image || latestNotification?.sender_profile_image || fallbackSenderProfileImage;

      return {
        id: `donation-${entry.id}-${index}`,
        title: `${displayName} donated ${donationLabel} to ${purpose}`,
        message: block,
        link: '/donations',
        senderName: displayName,
        senderProfileImage,
        amountLabel,
        campaignName: purpose,
        donationKind,
        createdAt
      };
    });
};

const buildLiveDonationActivityFeed = ({ notifications = [], donations = [], alumniMap = new Map(), alumniMapById = new Map() } = {}) => {
  const notificationsByLink = new Map();

  for (const notification of notifications) {
    const link = notification.link || '';
    if (!notificationsByLink.has(link)) {
      notificationsByLink.set(link, []);
    }
    notificationsByLink.get(link).push(notification);
  }

  for (const list of notificationsByLink.values()) {
    list.sort((left, right) => new Date(right.created_at || 0).getTime() - new Date(left.created_at || 0).getTime());
  }

  const seen = new Set();
  const activity = [];
  const candidates = [
    ...notifications.map(toLiveDonationActivity),
    ...donations.flatMap((entry) => parseDonationActivitiesFromEntry(entry, notificationsByLink, alumniMap, alumniMapById))
  ].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  for (const item of candidates) {
    const linkMatch = String(item.link || '').match(/\/donate\/(\d+)/);
    const donationId = linkMatch ? linkMatch[1] : null;
    const idMatch = String(item.id || '').match(/^donation-(\d+)/);
    const entryId = idMatch ? idMatch[1] : null;
    const uniqueDonationId = donationId || entryId;

    if (uniqueDonationId) {
      if (seen.has(`id:${uniqueDonationId}`)) continue;
      seen.add(`id:${uniqueDonationId}`);
    } else {
      const key = [
        item.title,
        item.senderName,
        item.amountLabel
      ].join('|');
      if (seen.has(key)) continue;
      seen.add(key);
    }

    activity.push(item);
    if (activity.length >= 100) break;
  }

  return activity;
};

const extractLineValue = (text = '', label = '') => {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = String(text || '').match(new RegExp(`^${escapedLabel}:\\s*(.+)$`, 'im'));
  return match?.[1]?.trim() || '';
};

const buildContributionBlock = ({
  campaignPurpose,
  donorName,
  alumniId,
  amountLabel,
  recordedAt,
  donorDetailsText = ''
}) => {
  const lines = [
    `Donation for: ${campaignPurpose || 'a donation campaign'}`,
    `Donor: ${donorName || 'Alumnus'}`,
    `Amount: ${amountLabel || 'a donation'}`,
    `Recorded: ${recordedAt.toISOString()}`
  ];

  // Store alumni_id so the activity feed can do an O(1) lookup instead of fuzzy matching
  if (alumniId && Number.isFinite(Number(alumniId))) {
    lines.push(`AlumniId: ${Number(alumniId)}`);
  }

  const extraLines = String(donorDetailsText || '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !/^donor:/i.test(line) && !/^alumniid:/i.test(line));

  return [...lines, ...extraLines].join('\n');
};

const appendContributionRecord = (existingCleanDescription, contributionBlock) => {
  const base = String(existingCleanDescription || '').trim();
  const block = String(contributionBlock || '').trim();
  if (!block) return base;
  return base ? `${base}\n\n${block}` : block;
};

const parseDonationActivitiesFromCampaign = (campaign) => {
  const { cleanDescription } = parseDescriptionMeta(campaign.description || '');
  if (!cleanDescription.includes('Donor:')) return [];

  return cleanDescription
    .split(/\n\s*\n(?=Donation for:)/i)
    .filter((block) => block.includes('Donor:'))
    .map((block, index) => {
      const donorName = extractLineValue(block, 'Donor') || 'Alumnus';
      const amountLabel = extractLineValue(block, 'Amount');
      const donationKind = inferDonationKind(block);
      const donationLabel = amountLabel || (donationKind === 'items' ? 'an item donation' : 'a donation');
      const createdAtRaw = extractLineValue(block, 'Recorded');
      const createdAt = createdAtRaw && !Number.isNaN(new Date(createdAtRaw).getTime())
        ? new Date(createdAtRaw)
        : campaign.date || new Date();

      return {
        id: `campaign-${campaign.id}-${index}`,
        title: `${donorName} donated ${donationLabel} to ${campaign.purpose || 'a donation campaign'}`,
        message: block,
        link: `/donate/${campaign.id}`,
        senderName: donorName,
        senderProfileImage: null,
        amountLabel,
        campaignName: campaign.purpose || 'a donation campaign',
        donationKind,
        createdAt
      };
    });
};

const getDonorDisplayName = async (req) => {
  const role = req.user?.role?.toUpperCase();
  const userId = Number(req.user?.id);
  const alumniId = Number(req.user?.alumniId || 0);

  if (role === 'ALUMNI') {
    if (req.user?.firstName || req.user?.lastName) {
      return `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user?.username || 'Alumni';
    }

    if (alumniId) {
      const alumni = await prisma.alumni.findUnique({
        where: { id: alumniId },
        select: { first_name: true, last_name: true }
      });
      if (alumni) {
        return `${alumni.first_name || ''} ${alumni.last_name || ''}`.trim() || 'Alumni';
      }
    }
  }

  const user = Number.isFinite(userId)
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: { username: true, profile_image: true, alumni: { select: { first_name: true, last_name: true, profile_image: true } } }
      })
    : null;

  const alumniName = `${user?.alumni?.first_name || ''} ${user?.alumni?.last_name || ''}`.trim();
  return alumniName || user?.username || 'Alumni';
};

const getDonorProfileImage = async (req) => {
  const role = req.user?.role?.toUpperCase();
  const userId = Number(req.user?.id);
  const alumniId = Number(req.user?.alumniId || 0);

  if (req.user?.profile_image) {
    return req.user.profile_image;
  }

  if (role === 'ALUMNI' && alumniId) {
    const alumni = await prisma.alumni.findUnique({
      where: { id: alumniId },
      select: { profile_image: true }
    });
    if (alumni?.profile_image) return alumni.profile_image;
  }

  if (Number.isFinite(userId)) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { profile_image: true, alumni: { select: { profile_image: true } } }
    });
    return user?.profile_image || user?.alumni?.profile_image || null;
  }

  return null;
};

const handleRecentDonationActivity = async (req, res) => {
  try {
    const [donations, notifications, alumniRows] = await Promise.all([
      prisma.donation.findMany({
        include: {
          alumni: {
            select: {
              first_name: true,
              last_name: true,
              profile_image: true
            }
          }
        },
        orderBy: { date: 'desc' },
        take: 100
      }),
      prisma.notification.findMany({
        where: { type: 'DONATION' },
        orderBy: { created_at: 'desc' },
        take: 100
      }),
      prisma.alumni.findMany({
        select: {
          id: true,
          first_name: true,
          last_name: true,
          profile_image: true
        }
      })
    ]);

    const alumniMap = new Map();
    const alumniMapById = new Map();
    for (const alumni of alumniRows) {
      const key = `${alumni.first_name || ''} ${alumni.last_name || ''}`.trim().toLowerCase();
      if (key) alumniMap.set(key, alumni);
      if (alumni.id) alumniMapById.set(alumni.id, alumni);
    }

    const activity = buildLiveDonationActivityFeed({ notifications, donations, alumniMap, alumniMapById });

    res.json(activity);
  } catch (error) {
    console.error('Error fetching recent donation activity:', error);
    res.status(500).json({ error: 'Failed to fetch live donation activity' });
  }
};

// Get all donations
router.get('/', async (req, res) => {
  try {
    const donations = await prisma.donation.findMany({
      include: {
        alumni: {
          select: {
            first_name: true,
            last_name: true,
            email: true
          }
        }
      },
      orderBy: { date: 'desc' }
    });
    res.json(donations);
  } catch (error) {
    console.error('Error fetching all donations:', error);
    res.status(500).json({ error: 'Failed to fetch donations' });
  }
});

// Recent donation activity for admin dashboard (must be registered before /:id)
router.get('/recent', flexibleAuthMiddleware, handleRecentDonationActivity);
router.get('/live/recent', flexibleAuthMiddleware, handleRecentDonationActivity);

// Get all donations for an alumni
router.get('/alumni/:alumniId', async (req, res) => {
  try {
    const { alumniId } = req.params;
    const donations = await prisma.donation.findMany({
      where: { alumni_id: Number(alumniId) },
      orderBy: { date: 'desc' }
    });
    res.json(donations);
  } catch (error) {
    console.error('Error fetching donations:', error);
    res.status(500).json({ error: 'Failed to fetch donations' });
  }
});

// Check weekly donation limit status for an alumni (register before /alumni/:alumniId)
router.get('/alumni/:alumniId/weekly-status', async (req, res) => {
  try {
    const { alumniId } = req.params;
    const alumniIdNum = Number(alumniId);

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const weeklyDonationCount = await prisma.donation.count({
      where: {
        alumni_id: alumniIdNum,
        date: {
          gte: startOfWeek
        }
      }
    });

    const limit = 3;
    const remaining = Math.max(0, limit - weeklyDonationCount);
    const nextResetDate = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000);

    res.json({
      alumniId: alumniIdNum,
      weeklyLimit: limit,
      donationsThisWeek: weeklyDonationCount,
      remaining: remaining,
      canDonate: remaining > 0,
      weekStartDate: startOfWeek.toISOString().split('T')[0],
      nextResetDate: nextResetDate.toISOString().split('T')[0]
    });
  } catch (error) {
    console.error('Error checking weekly status:', error);
    res.status(500).json({ error: 'Failed to check donation status' });
  }
});

// Get a single donation by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const donation = await prisma.donation.findUnique({
      where: { id: Number(id) },
      include: {
        alumni: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            profile_image: true
          }
        }
      }
    });

    if (!donation) {
      return res.status(404).json({ error: 'Donation not found' });
    }

    const { cleanDescription, meta } = parseDescriptionMeta(donation.description || '');

    res.json({
      ...donation,
      cleanDescription,
      meta
    });
  } catch (error) {
    console.error('Error fetching donation:', error);
    res.status(500).json({ error: 'Failed to fetch donation' });
  }
});

// Create new donation (Requires authentication: Alumni or Admin only)
router.post('/', flexibleAuthMiddleware, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'qr_image', maxCount: 1 }
]), async (req, res) => {
  try {
    const { amount, date, purpose, description, category, goal } = req.body;
    const { meta: incomingMeta } = parseDescriptionMeta(description || '');
    const donationMode = (incomingMeta.donationMode || '').toLowerCase();
    const isItemDonation = donationMode === 'items' || donationMode === 'item' || donationMode === 'goods';

    if ((!amount && !isItemDonation) || !purpose) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: isItemDonation ? ['purpose'] : ['amount', 'purpose']
      });
    }

    const userRole = req.user.role?.toUpperCase();
    let alumniIdNum = null;

    // Handle based on user role: Only Admin and Teacher can create donation campaigns/entries
    if (userRole === 'ADMIN' || userRole === 'TEACHER') {
      console.log(`✅ ${userRole} creating donation campaign entry`);
    } else {
      return res.status(403).json({
        error: 'Unauthorized',
        message: 'Only admin or teacher accounts can create donation campaigns.'
      });
    }

    const imageFile = req.files?.image?.[0] || null;
    const qrImageFile = req.files?.qr_image?.[0] || null;
    const imagePath = imageFile ? `/uploads/donations/${imageFile.filename}` : null;

    const { cleanDescription, meta } = parseDescriptionMeta(description || '');
    if (qrImageFile) {
      meta.qrImagePath = `/uploads/donations/${qrImageFile.filename}`;
    }
    const descriptionWithMeta = buildDescriptionWithMeta(cleanDescription, meta);

    const donation = await prisma.donation.create({
      data: {
        alumni_id: alumniIdNum, // Will be null for teacher-created campaigns
        amount: isItemDonation ? 0 : parseFloat(amount),
        date: date ? new Date(date) : new Date(),
        purpose: purpose.trim(),
        description: descriptionWithMeta || null,
        image: imagePath,
        category: category ? category.trim() : null,
        goal: goal ? parseFloat(goal) : null
      }
    });

    res.status(201).json(donation);
  } catch (error) {
    console.error('Error creating donation:', error);
    res.status(500).json({ 
      error: 'Failed to create donation',
      details: error.message 
    });
  }
});

// Contribute to an existing donation campaign
router.post('/:id/contribute', flexibleAuthMiddleware, upload.array('images'), async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, description } = req.body;
    const contributionAmount = parseFloat(amount) || 0;

    const existingCampaign = await prisma.donation.findUnique({
      where: { id: Number(id) }
    });

    if (!existingCampaign) {
      return res.status(404).json({ error: 'Donation campaign not found' });
    }

    if (contributionAmount <= 0 && !description) {
      return res.status(400).json({ error: 'Contribution amount or description is required' });
    }

    const { cleanDescription, meta } = parseDescriptionMeta(description || '');
    const contributionDonationMode = String(meta.donationMode || '').toLowerCase();
    const contributionDonationCurrency = String(meta.paymentCurrency || 'PHP').toUpperCase();
    const contributionDonationKind = contributionDonationMode === 'both'
      ? 'money and items'
      : contributionDonationMode === 'items' || contributionDonationMode === 'item' || contributionDonationMode === 'goods'
        ? 'items'
        : 'money';
    const contributionAmountLabel = contributionAmount > 0
      ? formatDonationAmount(contributionAmount, contributionDonationCurrency)
      : 'an item donation';
    const existingData = parseDescriptionMeta(existingCampaign.description || '');
    const mergedMeta = { ...existingData.meta, ...meta };
    if (req.files && req.files.length > 0) {
      mergedMeta.itemImagePaths = req.files.map((f) => `/uploads/donations/${f.filename}`);
    }

    const donorNameFromForm = extractLineValue(cleanDescription, 'Donor');
    const rawDonorName = donorNameFromForm || await getDonorDisplayName(req);
    // Strip any honorific (Mr/Ms/Mrs/Dr) — frontend no longer sends them, but strip defensively for older submissions
    const donorName = rawDonorName.replace(/^(mr|ms|mrs|dr|mr\.|ms\.|mrs\.|dr\.)\s+/i, '').trim() || rawDonorName;
    // Capture alumni_id so the activity feed can resolve profile images in O(1)
    const contributorAlumniId = Number(req.user?.alumniId || 0) || null;
    const contributionBlock = buildContributionBlock({
      campaignPurpose: existingCampaign.purpose || 'a donation campaign',
      donorName,
      alumniId: contributorAlumniId,
      amountLabel: contributionAmountLabel,
      recordedAt: new Date(),
      donorDetailsText: cleanDescription
    });
    const combinedCleanDescription = appendContributionRecord(
      existingData.cleanDescription,
      contributionBlock
    );
    const updatedDescription = buildDescriptionWithMeta(combinedCleanDescription, mergedMeta);

    const updatedCampaign = await prisma.donation.update({
      where: { id: Number(id) },
      data: {
        amount: contributionAmount > 0 ? Number(existingCampaign.amount) + contributionAmount : existingCampaign.amount,
        description: updatedDescription || existingCampaign.description,
        date: new Date()
      }
    });

    try {
      const senderProfileImage = await getDonorProfileImage(req);
      const { cleanDescription: rawDonorNotes } = parseDescriptionMeta(description || '');
      // Strip structured label lines so they don't appear in the live broadcast message
      const STRUCTURED_LINE_RE = /^(donor|alumniid|amount|recorded|donation for)\s*:/i;
      const humanNotes = rawDonorNotes
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && !STRUCTURED_LINE_RE.test(l))
        .join(' ')
        .trim();
      const donationKind = contributionDonationKind;
      const amountLabel = contributionAmountLabel;

      const donationTitle = `${donorName} donated ${amountLabel} to ${existingCampaign.purpose || 'a donation campaign'}`;
      const donationMessage = humanNotes
        ? `${donorName} donated ${amountLabel} to ${existingCampaign.purpose || 'a donation campaign'}. ${humanNotes}`
        : `${donorName} donated ${amountLabel} to ${existingCampaign.purpose || 'a donation campaign'}.`;

      const liveDonationPayload = {
        type: 'DONATION',
        title: donationTitle,
        message: donationMessage,
        link: `/donate/${existingCampaign.id}`,
        senderName: donorName,
        senderProfileImage,
        amountLabel,
        campaignName: existingCampaign.purpose || 'a donation campaign',
        donationKind,
        createdAt: new Date().toISOString()
      };

      // Alumni see live donation toasts only — do not persist DONATION rows for them.
      broadcastUpdate('notification.created', liveDonationPayload);

      const adminUsers = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true }
      });

      if (adminUsers.length > 0) {
        await prisma.notification.createMany({
          data: adminUsers.map((admin) => ({
            user_id: admin.id,
            type: 'DONATION',
            title: donationTitle,
            message: donationMessage,
            link: `/donate/${existingCampaign.id}`,
            sender_name: donorName,
            sender_profile_image: senderProfileImage,
            is_read: false
          }))
        });
      }
    } catch (notificationError) {
      console.error('Error creating donation notification:', notificationError);
    }

    res.json(updatedCampaign);
  } catch (error) {
    console.error('Error contributing to donation campaign:', error);
    res.status(500).json({ error: 'Failed to contribute to donation campaign', details: error.message });
  }
});

// Update donation (Teacher only)
router.put('/:id', teacherAuthMiddleware, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'qr_image', maxCount: 1 }
]), async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, date, purpose, description, category, goal } = req.body;

    const oldDonation = await prisma.donation.findUnique({ where: { id: Number(id) } });
    if (!oldDonation) {
      return res.status(404).json({ error: 'Donation not found' });
    }

    const updateData = {};
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (date !== undefined) updateData.date = date ? new Date(date) : null;
    if (purpose !== undefined) updateData.purpose = purpose ? purpose.trim() : null;
    if (category !== undefined) updateData.category = category ? category.trim() : null;
    if (goal !== undefined) updateData.goal = goal ? parseFloat(goal) : null;

    if (description !== undefined || req.files?.qr_image?.[0]) {
      const incoming = parseDescriptionMeta(description !== undefined ? description : (oldDonation.description || ''));
      const existing = parseDescriptionMeta(oldDonation.description || '');
      const mergedMeta = { ...existing.meta, ...incoming.meta };

      const qrImageFile = req.files?.qr_image?.[0] || null;
      if (qrImageFile) {
        if (mergedMeta.qrImagePath) {
          const oldQrPath = path.join(__dirname, '../../', mergedMeta.qrImagePath.replace(/^\/+/, ''));
          if (fs.existsSync(oldQrPath)) {
            fs.unlinkSync(oldQrPath);
          }
        }
        mergedMeta.qrImagePath = `/uploads/donations/${qrImageFile.filename}`;
      }

      const clean = description !== undefined ? incoming.cleanDescription : existing.cleanDescription;
      updateData.description = buildDescriptionWithMeta(clean, mergedMeta) || null;
    }

    // Add image path if uploaded
    const imageFile = req.files?.image?.[0] || null;
    if (imageFile) {
      updateData.image = `/uploads/donations/${imageFile.filename}`;
      
      // Delete old image if exists
      if (oldDonation?.image) {
        const oldImagePath = path.join(__dirname, '../../', oldDonation.image.replace(/^\/+/, ''));
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
    }

    const donation = await prisma.donation.update({
      where: { id: Number(id) },
      data: updateData
    });

    res.json(donation);
  } catch (error) {
    console.error('Error updating donation:', error);
    res.status(500).json({ 
      error: 'Failed to update donation',
      details: error.message 
    });
  }
});

// Delete donation (Teacher only)
router.delete('/:id', teacherAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the donation to find its image
    const donationToDelete = await prisma.donation.findUnique({
      where: { id: Number(id) }
    });

    if (!donationToDelete) {
      return res.status(404).json({ error: 'Donation not found' });
    }

    // Delete the donation
    await prisma.donation.delete({
      where: { id: Number(id) }
    });

    // Delete the image file if it exists
    if (donationToDelete.image) {
      const imagePath = path.join(__dirname, '../../', donationToDelete.image.replace(/^\/+/, ''));
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    res.json({ message: 'Donation deleted successfully' });
  } catch (error) {
    console.error('Error deleting donation:', error);
    res.status(500).json({ 
      error: 'Failed to delete donation',
      details: error.message 
    });
  }
});

router.buildLiveDonationActivityFeed = buildLiveDonationActivityFeed;

module.exports = router;

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import donationService from '../services/donationService';
import UserLayout from './UserLayout';
import { IMAGE_BASE_URL } from '../config/apiBaseUrl';

// ─── Helpers ────────────────────────────────────────────────────────────────

const formatAmount = (amount, currency = 'PHP') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2
  }).format(amount || 0);
};

const calculateProgress = (raised, goal) => {
  if (!goal) return 0;
  return Math.min((raised / goal) * 100, 100);
};

const formatDateLong = (raw) => {
  if (!raw) return '—';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString();
};

const resolveImage = (path) => {
  if (!path) return null;
  return path.startsWith('/') ? `${IMAGE_BASE_URL}${path}` : path;
};

// ─── Donor Avatar ────────────────────────────────────────────────────────────

function DonorAvatar({ entry, size = 'md' }) {
  const dim = size === 'lg' ? 'w-16 h-16 text-xl' : 'w-11 h-11 text-sm';
  return resolveImage(entry.profileImage) ? (
    <img
      src={resolveImage(entry.profileImage)}
      alt={entry.donorName}
      className={`${dim} rounded-full object-cover border-2 border-white shadow`}
    />
  ) : (
    <div className={`${dim} rounded-full bg-gradient-to-br from-blue-700 to-blue-900 flex items-center justify-center flex-shrink-0`}>
      <span className="text-white font-bold">
        {(entry.donorName || 'A').charAt(0).toUpperCase()}
      </span>
    </div>
  );
}

// ─── Money Receipt Modal ─────────────────────────────────────────────────────

function ReceiptRow({ label, value, highlight = false }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</span>
      <span className={`max-w-[62%] text-right text-sm ${highlight ? 'font-bold text-slate-950' : 'font-semibold text-slate-700'}`}>
        {value}
      </span>
    </div>
  );
}

function MetricCard({ title, value, tone, icon }) {
  const toneClass = tone === 'money'
    ? 'border-blue-200 bg-blue-50/80 text-blue-900'
    : 'border-amber-200 bg-amber-50/80 text-amber-800';

  return (
    <div className={`rounded-2xl border ${toneClass} px-5 py-4 shadow-sm`}>
      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/80 shadow-sm">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] opacity-70">{title}</p>
          <p className="mt-1 truncate text-2xl font-black tracking-tight">{value}</p>
        </div>
      </div>
    </div>
  );
}

function MoneyReceiptModal({ entry, campaign, onClose }) {
  if (!entry) return null;

  // Extract payment method and donation type from rawBlock
  const rawBlock = entry.rawBlock || '';
  const paymentMethodMatch = rawBlock.match(/Payment method:\s*(.+)/i);
  const paymentMethod = paymentMethodMatch ? paymentMethodMatch[1].trim() : 'N/A';
  const donationType = /item/i.test(rawBlock) ? 'Item' : 'Money';

  // Generate a receipt number from the entry data
  const receiptNumber = `RCPT-${entry.alumniId ? String(entry.alumniId).padStart(4, '0') : '0000'}${Date.parse(entry.recordedAt || new Date()).toString().slice(-4)}`;
  const receiptDate = formatDateLong(entry.recordedAt);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(15,23,42,0.75)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Torn edge top */}
        <div className="receipt-tear-top" />

        <div className="receipt-paper border-x border-slate-200 px-6 py-6 shadow-lg bg-white text-left">
          {/* Receipt header */}
          <div className="text-center border-b-2 border-dashed border-slate-300 pb-4">
            <div className="flex items-center justify-center gap-2 mb-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" />
              </svg>
            </div>
            <h4 className="text-sm font-black tracking-wider text-slate-900 uppercase">LCCB Alumni</h4>
            <p className="text-[10px] tracking-[0.2em] text-slate-500 uppercase mt-0.5">Donation Receipt</p>
          </div>

          {/* Receipt number and date */}
          <div className="mt-4 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span className="font-mono">{receiptNumber}</span>
            <span>{receiptDate}</span>
          </div>

          {/* Dashed separator */}
          <div className="my-3 border-t border-dashed border-slate-300" />

          {/* Campaign name */}
          <div className="text-center mb-3">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Campaign</p>
            <p className="text-sm font-bold text-slate-900 mt-0.5">{campaign?.purpose || 'Donation Campaign'}</p>
          </div>

          {/* Dashed separator */}
          <div className="my-3 border-t border-dashed border-slate-300" />

          {/* Itemized details */}
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between items-start">
              <span className="text-slate-500 text-xs font-semibold">Donor</span>
              <span className="font-bold text-slate-900 text-right max-w-[60%] text-xs">{entry.donorName}</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-slate-500 text-xs font-semibold">Type</span>
              <span className="font-bold text-slate-900 text-xs">{donationType}</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-slate-500 text-xs font-semibold">Payment</span>
              <span className="font-bold text-slate-900 text-xs">{paymentMethod}</span>
            </div>
          </div>

          {/* Dashed separator */}
          <div className="my-3 border-t border-dashed border-slate-300" />

          {/* Total amount */}
          <div className="text-center py-2">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Total Amount</p>
            <p className="text-3xl font-black text-slate-900 mt-1 tracking-tight">
              {entry.amountLabel || '—'}
            </p>
          </div>

          {/* Dashed separator */}
          <div className="my-3 border-t border-dashed border-slate-300" />

          {/* PAID stamp */}
          <div className="flex justify-center py-2">
            <div className="inline-flex items-center gap-1.5 border-2 border-emerald-500 rounded-lg px-5 py-1.5 transform -rotate-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-black tracking-[0.3em] text-emerald-600 uppercase">Paid</span>
            </div>
          </div>

          {/* Thank you message */}
          <div className="mt-4 text-center">
            <p className="text-xs text-slate-500 font-bold">Thank you for your generous donation!</p>
            <p className="text-[10px] text-slate-400 mt-1 font-semibold">This receipt serves as your proof of donation.</p>
          </div>

          {/* Barcode-style decoration */}
          <div className="mt-4 flex items-center justify-center gap-[2px] opacity-40">
            {Array.from({ length: 30 }).map((_, i) => (
              <div
                key={i}
                className="bg-slate-900"
                style={{
                  width: i % 3 === 0 ? '2px' : '1px',
                  height: i % 5 === 0 ? '18px' : i % 3 === 0 ? '14px' : '10px'
                }}
              />
            ))}
          </div>
          <p className="text-center text-[9px] text-slate-400 mt-1 font-mono tracking-wider font-semibold">
            {receiptNumber}
          </p>
        </div>

        {/* Torn edge bottom */}
        <div className="receipt-tear-bottom" />


      </div>
    </div>
  );
}

// ─── Item Gallery Modal ──────────────────────────────────────────────────────

function ItemGalleryModal({ entry, campaign, campaignImages = [], loadingImages, onClose }) {
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 });

  if (!entry) return null;

  const hasLightbox = lightboxIndex !== null && campaignImages[lightboxIndex];
  const currentLightboxSrc = hasLightbox ? campaignImages[lightboxIndex] : null;
  const deliveryMethod = String(entry.deliveryMethod || '').trim();
  const deliveryMethodLabel = deliveryMethod.toLowerCase().includes('pickup')
    ? 'Pickup'
    : deliveryMethod
      ? 'Drop-off'
      : '';
  const galleryGridClass = campaignImages.length === 1
    ? 'grid grid-cols-1 gap-2'
    : campaignImages.length === 2
      ? 'grid grid-cols-2 gap-2'
      : 'grid grid-cols-2 gap-2 sm:grid-cols-3';

  const openLightbox = (index) => {
    setLightboxIndex(index);
    setIsZoomed(false);
    setZoomOrigin({ x: 50, y: 50 });
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
    setIsZoomed(false);
    setZoomOrigin({ x: 50, y: 50 });
  };

  const handlePrev = (event) => {
    event.stopPropagation();
    setIsZoomed(false);
    setZoomOrigin({ x: 50, y: 50 });
    setLightboxIndex((index) => {
      if (index === null || campaignImages.length === 0) return null;
      return index === 0 ? campaignImages.length - 1 : index - 1;
    });
  };

  const handleNext = (event) => {
    event.stopPropagation();
    setIsZoomed(false);
    setZoomOrigin({ x: 50, y: 50 });
    setLightboxIndex((index) => {
      if (index === null || campaignImages.length === 0) return null;
      return index === campaignImages.length - 1 ? 0 : index + 1;
    });
  };

  const handleLightboxBackdropClick = (event) => {
    event.stopPropagation();
    closeLightbox();
  };

  const toggleZoom = (event) => {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    const nextOrigin = {
      x: Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100)),
      y: Math.min(100, Math.max(0, ((event.clientY - rect.top) / rect.height) * 100))
    };

    setIsZoomed((zoomed) => {
      if (zoomed) {
        setZoomOrigin({ x: 50, y: 50 });
        return false;
      }

      setZoomOrigin(nextOrigin);
      return true;
    });
  };

  const handleZoomPan = (event) => {
    if (!isZoomed) return;

    const rect = event.currentTarget.getBoundingClientRect();
    setZoomOrigin({
      x: Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100)),
      y: Math.min(100, Math.max(0, ((event.clientY - rect.top) / rect.height) * 100))
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(15,23,42,0.7)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col"
        style={{ maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-orange-500 px-6 py-5 flex items-center justify-between flex-shrink-0">
          <div>
            <p className="text-orange-100 text-xs font-semibold uppercase tracking-widest mb-0.5">
              Item Donation Detail
            </p>
            <h3 className="text-white text-lg font-bold">{entry.itemName || 'Item Donation'}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {/* Donor */}
          <div className="flex items-center gap-4">
            <DonorAvatar entry={entry} size="lg" />
            <div>
              <div className="font-bold text-slate-900 text-base">{entry.donorName}</div>
              <div className="text-xs text-slate-500 mt-0.5">Donor</div>
            </div>
          </div>

          {/* Item info */}
          <div className="rounded-2xl bg-slate-50 border border-slate-200 divide-y divide-slate-100">
            <ReceiptRow label="Item Name" value={entry.itemName || '—'} highlight />
            {entry.itemDescription && (
              <ReceiptRow label="Description" value={entry.itemDescription} />
            )}
            <ReceiptRow label="Campaign" value={campaign?.purpose || '—'} />
            <ReceiptRow label="Date Recorded" value={formatDateLong(entry.recordedAt)} />
            {entry.alumniId && <ReceiptRow label="Donor ID" value={`#${entry.alumniId}`} />}
            {deliveryMethodLabel && (
              <ReceiptRow label="Delivery Method" value={deliveryMethodLabel} />
            )}
            {deliveryMethodLabel === 'Pickup' && entry.pickupAddress && (
              <ReceiptRow label="Pickup Address" value={entry.pickupAddress} />
            )}
            {entry.preferredSchedule && (
              <ReceiptRow label="Preferred Schedule" value={entry.preferredSchedule} />
            )}
          </div>

          {/* Image gallery */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Item Photos</h4>
              {campaignImages.length > 0 && (
                <span className="text-xs text-slate-500">{campaignImages.length} image{campaignImages.length !== 1 ? 's' : ''}</span>
              )}
            </div>

            {loadingImages ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600" />
              </div>
            ) : campaignImages.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center">
                <svg className="w-10 h-10 text-slate-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm text-slate-400">No images uploaded for this campaign</p>
              </div>
            ) : (
              <div className={galleryGridClass}>
                {campaignImages.map((imgUrl, i) => (
                  <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); openLightbox(i); }}
                    className="relative aspect-square rounded-xl overflow-hidden group border border-slate-200 hover:border-amber-400 transition-all focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    <img
                      src={imgUrl}
                      alt={`Item photo ${i + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <svg className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Lightbox */}
      {hasLightbox && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black p-4"
          onClick={handleLightboxBackdropClick}
        >
          {campaignImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                className="absolute left-4 top-1/2 z-[61] -translate-y-1/2 rounded-full bg-white/10 p-3 text-white shadow-xl transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/70"
                aria-label="Previous image"
              >
                <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="absolute right-4 top-1/2 z-[61] -translate-y-1/2 rounded-full bg-white/10 p-3 text-white shadow-xl transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/70"
                aria-label="Next image"
              >
                <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          <div
            className="flex max-h-[92vh] max-w-[92vw] flex-col items-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`max-h-[84vh] max-w-[92vw] overflow-hidden rounded-2xl ${isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
              onClick={toggleZoom}
              onMouseMove={handleZoomPan}
            >
              <img
                src={currentLightboxSrc}
                alt={`Item photo ${lightboxIndex + 1} of ${campaignImages.length}`}
                draggable={false}
                className="max-h-[84vh] max-w-[92vw] select-none rounded-2xl object-contain shadow-2xl transition-transform duration-200"
                style={{
                  transform: isZoomed ? 'scale(2)' : 'scale(1)',
                  transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`
                }}
              />
            </div>
            <div className="rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur">
              {lightboxIndex + 1} / {campaignImages.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

function AdminCampaignReceipts() {
  const { campaignId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [campaign, setCampaign] = useState(null);
  const [money, setMoney] = useState([]);
  const [items, setItems] = useState([]);
  const [totalMoney, setTotalMoney] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [activeTab, setActiveTab] = useState('money');

  // Modal state
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [modalType, setModalType] = useState(null); // 'money' | 'items'
  const [campaignImages, setCampaignImages] = useState([]);
  const [loadingImages, setLoadingImages] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const contributions = await donationService.getContributions(campaignId);
      setCampaign(contributions.campaign);
      setMoney(contributions.money || []);
      setItems(contributions.items || []);
      setTotalMoney(contributions.totalMoney || 0);
      setTotalItems(contributions.totalItems || 0);
    } catch (err) {
      console.error('Error loading contributions:', err);
      setError('Failed to load campaign contributions');
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch campaign images when an item modal is opened
  const openItemModal = useCallback(async (entry) => {
    setSelectedEntry(entry);
    setModalType('items');
    setLoadingImages(true);

    const entryImages = (entry.itemImages || [])
      .map((imgUrl) => resolveImage(imgUrl))
      .filter(Boolean);

    if (entryImages.length > 0) {
      setCampaignImages(entryImages);
      setLoadingImages(false);
      return;
    }

    try {
      const fullCampaign = await donationService.getDonationById(campaignId);
      const images = (fullCampaign?.donation_images || []).map((img) =>
        resolveImage(img.image_url)
      ).filter(Boolean);
      setCampaignImages(images);
    } catch {
      setCampaignImages([]);
    } finally {
      setLoadingImages(false);
    }
  }, [campaignId]);

  const openMoneyModal = useCallback((entry) => {
    setSelectedEntry(entry);
    setModalType('money');
  }, []);

  const closeModal = useCallback(() => {
    setSelectedEntry(null);
    setModalType(null);
    setCampaignImages([]);
  }, []);

  // Close modal on Escape key
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') closeModal(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeModal]);

  // ── Loading / Error states ────────────────────────────────────────────────

  if (loading) {
    return (
      <UserLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900 mx-auto" />
            <p className="mt-4 text-gray-600">Loading campaign receipts...</p>
          </div>
        </div>
      </UserLayout>
    );
  }

  if (error || !campaign) {
    return (
      <UserLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Campaign Not Found</h2>
            <p className="text-gray-600 mb-6">{error || 'Unable to load campaign'}</p>
            <button
              onClick={() => navigate('/donations')}
              className="px-6 py-2 bg-blue-900 text-white rounded-md hover:bg-blue-800 transition-colors"
            >
              Back to Donations
            </button>
          </div>
        </div>
      </UserLayout>
    );
  }

  const progress = calculateProgress(campaign.amount, campaign.goal);
  const currentList = activeTab === 'money' ? money : items;

  return (
    <UserLayout>
      <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-5">

          {/* ── Page Header ── */}
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-950">Campaign Receipts</h1>
            <p className="text-sm text-slate-500">Review donor transactions and item contributions.</p>
          </div>

          {/* ── Campaign Info Card ── */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(24rem,0.9fr)]">
              <div className="flex min-w-0 gap-4 border-b border-slate-100 p-4 sm:p-5 lg:border-b-0 lg:border-r">
                <div className="h-24 w-36 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 sm:h-28 sm:w-44">
                  {campaign.image ? (
                    <img
                      src={resolveImage(campaign.image)}
                      alt={campaign.purpose}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-blue-50 text-blue-900">
                      <svg className="h-9 w-9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 12v7a2 2 0 01-2 2H6a2 2 0 01-2-2v-7m16 0H4m16 0l-2-5H6l-2 5m5 4h6" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 py-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-600">
                      {campaign.category || 'General'}
                    </span>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-blue-800">
                      Admin View
                    </span>
                  </div>
                  <h2 className="truncate text-2xl font-black tracking-tight text-slate-950">{campaign.purpose}</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                    Campaign receipt audit view for money and item contributions.
                  </p>
                </div>
              </div>

              <div className="flex flex-col justify-center p-4 sm:p-5">
                <div className="mb-3 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Raised</p>
                    <p className="mt-1 text-xl font-black text-blue-950">{formatAmount(campaign.amount)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Goal</p>
                    <p className="mt-1 text-xl font-black text-slate-900">{formatAmount(campaign.goal)}</p>
                  </div>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-blue-900 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span>{Math.round(progress)}% complete</span>
                  <span>{formatAmount(Math.max((campaign.goal || 0) - (campaign.amount || 0), 0))} remaining</span>
                </div>
              </div>
            </div>

          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <MetricCard
              title="Total Money Raised"
              value={formatAmount(totalMoney)}
              tone="money"
              icon={(
                <svg className="h-6 w-6 text-blue-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 12V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2v-5zm0 0h-5a2 2 0 100 4h5m-9-8H7" />
                </svg>
              )}
            />
            <MetricCard
              title="Items Donated"
              value={totalItems}
              tone="items"
              icon={(
                <svg className="h-6 w-6 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 7.5l-8-4-8 4m16 0l-8 4m8-4v9l-8 4m0-9l-8-4m8 4v9m-8-13.5v9l8 4" />
                </svg>
              )}
            />
          </div>

          {/* ── Tab Toggle ── */}
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-black text-slate-950">Donation Records</h3>
              <p className="mt-1 text-xs text-slate-500">Select a row to inspect the complete receipt.</p>
            </div>
            <div className="inline-grid grid-cols-2 rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
              onClick={() => setActiveTab('money')}
              className={`min-w-28 rounded-lg px-4 py-2 text-sm font-bold transition-all ${
                activeTab === 'money'
                  ? 'bg-blue-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-white hover:text-slate-950'
              }`}
            >
              Money ({money.length})
            </button>
            <button
              onClick={() => setActiveTab('items')}
              className={`min-w-28 rounded-lg px-4 py-2 text-sm font-bold transition-all ${
                activeTab === 'items'
                  ? 'bg-blue-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-white hover:text-slate-950'
              }`}
            >
              Items ({items.length})
            </button>
            </div>
          </div>

          {/* ── Contributions List ── */}
          <div className="space-y-2">
            {currentList.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
                <p className="text-sm font-semibold text-slate-500">
                  No {activeTab === 'money' ? 'monetary' : 'item'} donations yet.
                </p>
              </div>
            ) : (
              currentList.map((entry, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => activeTab === 'money' ? openMoneyModal(entry) : openItemModal(entry)}
                  className="group grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition-all hover:border-blue-200 hover:bg-blue-50/30 hover:shadow-md"
                >
                  {/* Profile Image */}
                  <div className="flex-shrink-0">
                    <DonorAvatar entry={entry} size="md" />
                  </div>

                  {/* Info */}
                  <div className="min-w-0">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                      <span className="truncate text-sm font-black text-slate-950 group-hover:text-blue-950">
                        {entry.donorName}
                      </span>
                      {entry.recordedAt && (
                        <span className="text-xs font-medium text-slate-400">
                          {new Date(entry.recordedAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                    {activeTab === 'items' && entry.itemName && (
                      <div className="mt-1 truncate text-xs font-medium text-slate-500">
                        {entry.itemName}
                        {entry.itemDescription ? ` — ${entry.itemDescription}` : ''}
                      </div>
                    )}
                  </div>

                  {/* Right-hand badge + chevron */}
                  <div className="flex items-center gap-3">
                    {activeTab === 'money' ? (
                      <span className="text-sm font-black text-slate-950">{entry.amountLabel}</span>
                    ) : (
                      <span className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                        {entry.imageCount > 0 ? `${entry.imageCount} photo${entry.imageCount !== 1 ? 's' : ''}` : 'Item'}
                      </span>
                    )}
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition group-hover:bg-blue-900 group-hover:text-white">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>

        </div>
      </div>

      {/* ── Modals ── */}
      {modalType === 'money' && selectedEntry && (
        <MoneyReceiptModal
          entry={selectedEntry}
          campaign={campaign}
          onClose={closeModal}
        />
      )}

      {modalType === 'items' && selectedEntry && (
        <ItemGalleryModal
          entry={selectedEntry}
          campaign={campaign}
          campaignImages={campaignImages}
          loadingImages={loadingImages}
          onClose={closeModal}
        />
      )}
    </UserLayout>
  );
}

export default AdminCampaignReceipts;

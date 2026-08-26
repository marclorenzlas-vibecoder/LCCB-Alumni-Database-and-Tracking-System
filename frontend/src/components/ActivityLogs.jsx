import React, { useEffect, useMemo, useRef, useState } from 'react';
import { API_BASE_URL } from '../config/apiBaseUrl';
import FilterMenu from './FilterMenu';
import MobileFilterButton from './MobileFilterButton';
import UserLayout from './UserLayout';

const actionFilterOptions = [
  { value: 'ALL', label: 'All actions' },
  { value: 'CREATE', label: 'Create' },
  { value: 'UPDATE', label: 'Update' },
  { value: 'REJECT', label: 'Reject' },
  { value: 'DELETE', label: 'Delete' }
];

const getActionBadgeClass = (action) => {
  const normalized = String(action || '').toUpperCase();
  if (normalized === 'CREATE' || normalized === 'APPROVE') {
    return 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100';
  }
  if (normalized === 'UPDATE' || normalized === 'STATUS_CHANGE' || normalized === 'BLOCK' || normalized === 'UNBLOCK') {
    return 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-100';
  }
  if (normalized === 'REJECT' || normalized === 'DELETE') {
    return 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-100';
  }
  return 'bg-slate-100 text-slate-600';
};

const ActivityLogs = () => {
  const [activityLogs, setActivityLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showActionMenu, setShowActionMenu] = useState(false);
  const actionMenuRef = useRef(null);

  const fetchActivityLogs = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/activity-logs?limit=60&excludeSessionActivity=true`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || `Request failed with status ${response.status}`);
      }

      const data = await response.json();
      setActivityLogs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading activity logs:', error);
      setError(error.message || 'Failed to load activity logs');
      setActivityLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivityLogs();
  }, []);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target)) {
        setShowActionMenu(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setShowActionMenu(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const filteredActivityLogs = useMemo(() => {
    const startTime = startDate ? new Date(`${startDate}T00:00:00`).getTime() : null;
    const endTime = endDate ? new Date(`${endDate}T23:59:59.999`).getTime() : null;

    return activityLogs.filter((log) => {
      const action = String(log.action || '').toUpperCase();
      if (actionFilter !== 'ALL' && action !== actionFilter) return false;

      if (startTime || endTime) {
        const createdTime = new Date(log.createdAt).getTime();
        if (Number.isNaN(createdTime)) return false;
        if (startTime && createdTime < startTime) return false;
        if (endTime && createdTime > endTime) return false;
      }

      return true;
    });
  }, [activityLogs, actionFilter, startDate, endDate]);

  const formatActivityTime = (value) => {
    if (!value) return 'Just now';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Just now';
    return date.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const parseDetails = (details) => {
    if (!details) return {};
    if (typeof details === 'object') return details;
    try {
      return JSON.parse(details);
    } catch {
      return {};
    }
  };
  const formatValueParts = (value) => {
    if (value === null || value === undefined || value === '') return { display: 'Empty', title: '' };
    if (typeof value === 'boolean') return { display: value ? 'Yes' : 'No', title: '' };
    const text = String(value);
    const date = new Date(text);
    if (/^\d{4}-\d{2}-\d{2}T/.test(text) && !Number.isNaN(date.getTime())) {
      return { display: date.toLocaleDateString(), title: text };
    }
    const fileName = text.split(/[\\/]/).pop() || text;
    const looksLikePath = /(^|[\\/])uploads[\\/]/i.test(text) || /[\\/][^\\/]+\.[a-z0-9]{2,5}$/i.test(text);
    if (looksLikePath && fileName.length > 28) {
      return { display: `${fileName.slice(0, 12)}...${fileName.slice(-12)}`, title: text };
    }
    if (looksLikePath) {
      return { display: fileName, title: text };
    }
    return {
      display: text.length > 120 ? `${text.slice(0, 120)}...` : text,
      title: text.length > 120 ? text : ''
    };
  };
  const formatValue = (value) => formatValueParts(value).display;
  const renderDiffValue = (value, className) => {
    const { display, title } = formatValueParts(value);
    return (
      <span className={`break-words ${className}`} title={title || undefined}>
        {display}
      </span>
    );
  };
  const renderChangeDetails = (details) => {
    const changes = Array.isArray(details.changes) ? details.changes : [];
    if (changes.length === 0) return null;

    const isSingleField = changes.length === 1;

    return (
      <div className={`mt-3 rounded-xl border border-slate-200 bg-white px-3 ${isSingleField ? 'py-2' : 'py-3'}`}>
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Changed Fields</div>
        <div className={`${isSingleField ? 'mt-1.5 space-y-1' : 'mt-2 space-y-2'}`}>
          {changes.map((change, index) => (
            <div key={`${change.field}-${index}`} className="grid gap-1 text-sm sm:grid-cols-[150px_1fr]">
              <div className="font-semibold text-slate-700">{change.field}</div>
              <div className="min-w-0 text-slate-600">
                {renderDiffValue(change.from, 'text-slate-500')}
                <span className="px-2 text-slate-400">to</span>
                {renderDiffValue(change.to, 'font-medium text-slate-900')}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  const renderDeletedRecord = (details) => {
    const deletedRecord = details.deletedRecord;
    if (!deletedRecord || typeof deletedRecord !== 'object') return null;

    return (
      <div className="mt-3 rounded-xl border border-rose-100 bg-rose-50/60 p-3">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-600">Deleted Record</div>
        <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
          {Object.entries(deletedRecord).map(([key, value]) => (
            <div key={key} className="min-w-0">
              <span className="font-semibold capitalize text-slate-700">{key.replace(/_/g, ' ')}: </span>
              <span className="break-words text-slate-600">{formatValue(value)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };
  const renderSessionDetails = (details) => {
    if (!details.role && !details.email && !details.approvalStatus) return null;

    return (
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
        {details.role && <span className="rounded-full bg-slate-100 px-2.5 py-1">{details.role}</span>}
        {details.email && <span className="rounded-full bg-slate-100 px-2.5 py-1 normal-case tracking-normal">{details.email}</span>}
        {details.approvalStatus && <span className="rounded-full bg-slate-100 px-2.5 py-1">{details.approvalStatus}</span>}
      </div>
    );
  };

  return (
    <UserLayout>
      <div className="space-y-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">Activity Logs</h1>
              <p className="mt-2 text-sm text-slate-500">Use this trail to diagnose site issues by checking who changed, deleted, approved, or updated records around the time a problem happened.</p>
            </div>
            <button
              type="button"
              onClick={fetchActivityLogs}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Refresh
            </button>
          </div>
        </section>

        <section className="overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3 sm:px-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Recent System Activity</h2>
                {!loading && !error && (
                  <p className="mt-1 text-xs text-slate-500">
                    Showing {filteredActivityLogs.length} of {activityLogs.length} entries
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex min-w-[260px] flex-1 items-center gap-2 sm:flex-none">
                  <span className="w-14 shrink-0 text-right text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Action</span>
                  <div className="min-w-0 flex-1">
                    <div className="hidden md:block">
                      <FilterMenu
                        menuRef={actionMenuRef}
                        isOpen={showActionMenu}
                        setIsOpen={setShowActionMenu}
                        buttonLabel="All actions"
                        selectedLabel={actionFilterOptions.find((option) => option.value === actionFilter)?.label || 'All actions'}
                        selectedValue={actionFilter}
                        icon={<svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16M7 12h10m-7 6h4" /></svg>}
                        sections={[{ key: 'actions', title: 'Actions', items: actionFilterOptions }]}
                        onSelect={(value) => {
                          setActionFilter(value);
                          setShowActionMenu(false);
                        }}
                        panelTitle="All actions"
                        panelWidthClass="w-full"
                        alignClass="left-0"
                      />
                    </div>
                    <MobileFilterButton
                      buttonLabel="All actions"
                      selectedLabel={actionFilterOptions.find((option) => option.value === actionFilter)?.label || 'All actions'}
                      selectedValue={actionFilter}
                      icon={<svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16M7 12h10m-7 6h4" /></svg>}
                      sections={[{ key: 'actions', title: 'Actions', items: actionFilterOptions }]}
                      onSelect={(value) => setActionFilter(value)}
                      panelTitle="All actions"
                    />
                  </div>
                </div>
                <label className="flex min-w-[210px] flex-1 items-center gap-2 sm:flex-none">
                  <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">From</span>
                  <span className="relative block min-w-0 flex-1">
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-blue-600">
                      <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3M5 11h14M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </span>
                    <input
                      type="date"
                      value={startDate}
                      max={endDate || undefined}
                      onChange={(event) => setStartDate(event.target.value)}
                      className="h-[46px] w-full rounded-lg border border-gray-300 bg-white pl-11 pr-3 text-sm font-medium text-slate-700 shadow-sm outline-none transition hover:border-gray-400 focus:border-blue-500 focus:ring-0"
                    />
                  </span>
                </label>
                <label className="flex min-w-[210px] flex-1 items-center gap-2 sm:flex-none">
                  <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">To</span>
                  <span className="relative block min-w-0 flex-1">
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-blue-600">
                      <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3M5 11h14M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </span>
                    <input
                      type="date"
                      value={endDate}
                      min={startDate || undefined}
                      onChange={(event) => setEndDate(event.target.value)}
                      className="h-[46px] w-full rounded-lg border border-gray-300 bg-white pl-11 pr-3 text-sm font-medium text-slate-700 shadow-sm outline-none transition hover:border-gray-400 focus:border-blue-500 focus:ring-0"
                    />
                  </span>
                </label>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="divide-y divide-slate-100">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="flex items-center gap-4 p-4 sm:p-5">
                  <div className="h-12 w-12 animate-pulse rounded-full bg-slate-200" />
                  <div className="min-w-0 flex-1">
                    <div className="h-4 w-56 max-w-full animate-pulse rounded bg-slate-200" />
                    <div className="mt-3 h-3 w-80 max-w-full animate-pulse rounded bg-slate-200" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="px-4 py-14 text-center sm:px-5">
              <div className="mx-auto max-w-xl rounded-2xl border border-rose-200 bg-rose-50 p-5 text-left">
                <h3 className="text-sm font-semibold text-rose-800">Activity logs could not load</h3>
                <p className="mt-2 text-sm leading-6 text-rose-700">{error}</p>
                <p className="mt-3 text-sm leading-6 text-rose-700">Restart the backend server after the latest code changes, then try Refresh. If this message stays, check the backend terminal for the activity log error.</p>
                <button
                  type="button"
                  onClick={fetchActivityLogs}
                  className="mt-4 inline-flex items-center justify-center rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : filteredActivityLogs.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {filteredActivityLogs.map((log) => (
                <article key={log.id} className="min-w-0 p-4 transition-colors hover:bg-slate-50 sm:p-5">
                  {(() => {
                    const details = parseDetails(log.details);
                    return (
                      <div className="min-w-0">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="break-words text-sm font-semibold text-slate-900">{log.summary}</h3>
                                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${getActionBadgeClass(log.action)}`}>
                                  {String(log.action || 'Activity').replace(/_/g, ' ')}
                                </span>
                              </div>
                              {renderSessionDetails(details)}
                              {renderChangeDetails(details)}
                              {renderDeletedRecord(details)}
                            </div>
                            <time className="shrink-0 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 sm:text-right">
                              {formatActivityTime(log.createdAt)}
                            </time>
                          </div>
                      </div>
                    );
                  })()}
                </article>
              ))}
            </div>
          ) : (
            <div className="px-4 py-14 text-center text-sm text-slate-500">
              {activityLogs.length > 0 ? 'No activity matches the selected filters.' : 'No system activity has been recorded yet.'}
            </div>
          )}
        </section>
      </div>
    </UserLayout>
  );
};

export default ActivityLogs;

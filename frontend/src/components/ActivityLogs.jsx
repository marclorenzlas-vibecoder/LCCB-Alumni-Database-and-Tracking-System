import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../config/apiBaseUrl';
import UserLayout from './UserLayout';

const ActivityLogs = () => {
  const [activityLogs, setActivityLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchActivityLogs = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/activity-logs?limit=60`, {
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
  const formatValue = (value) => {
    if (value === null || value === undefined || value === '') return 'Empty';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    const text = String(value);
    const date = new Date(text);
    if (/^\d{4}-\d{2}-\d{2}T/.test(text) && !Number.isNaN(date.getTime())) {
      return date.toLocaleDateString();
    }
    return text.length > 120 ? `${text.slice(0, 120)}...` : text;
  };
  const renderChangeDetails = (details) => {
    const changes = Array.isArray(details.changes) ? details.changes : [];
    if (changes.length === 0) return null;

    return (
      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Changed Fields</div>
        <div className="mt-2 space-y-2">
          {changes.map((change, index) => (
            <div key={`${change.field}-${index}`} className="grid gap-1 text-sm sm:grid-cols-[150px_1fr]">
              <div className="font-semibold text-slate-700">{change.field}</div>
              <div className="min-w-0 text-slate-600">
                <span className="break-words">{formatValue(change.from)}</span>
                <span className="px-2 text-slate-400">to</span>
                <span className="break-words font-medium text-slate-900">{formatValue(change.to)}</span>
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
              <p className="mt-2 text-sm text-slate-500">Use this trail to diagnose site issues by checking who changed, deleted, approved, or signed in around the time a problem happened.</p>
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

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3 sm:px-5">
            <h2 className="text-base font-semibold text-slate-900">Recent System Activity</h2>
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
          ) : activityLogs.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {activityLogs.map((log) => (
                <article key={log.id} className="min-w-0 p-4 transition-colors hover:bg-slate-50 sm:p-5">
                  {(() => {
                    const details = parseDetails(log.details);
                    return (
                      <div className="min-w-0">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="break-words text-sm font-semibold text-slate-900">{log.summary}</h3>
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">
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
            <div className="px-4 py-14 text-center text-sm text-slate-500">No system activity has been recorded yet.</div>
          )}
        </section>
      </div>
    </UserLayout>
  );
};

export default ActivityLogs;

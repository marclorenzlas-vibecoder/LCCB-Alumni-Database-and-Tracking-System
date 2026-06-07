import React from 'react';
import { Link } from 'react-router-dom';
import UserLayout from './UserLayout';

const settingCards = [
  {
    sectionLabel: 'Profile Settings',
    title: 'My Profile',
    description: 'Update your personal details, alumni information, and social links.',
    path: '/profile',
    cta: 'Open My Profile',
    iconPath: 'M12 12c2.761 0 5-2.239 5-5S14.761 2 12 2 7 4.239 7 7s2.239 5 5 5zm0 2c-4.418 0-8 2.239-8 5v1h16v-1c0-2.761-3.582-5-8-5z'
  },
  {
    sectionLabel: 'Security Settings',
    title: 'Change Password',
    description: 'Set a new password to keep your account secure.',
    path: '/settings/change-password',
    cta: 'Update Password',
    iconPath: 'M17 11V7a5 5 0 00-10 0v4H5v11h14V11h-2zm-8 0V7a3 3 0 116 0v4H9zm3 7a2 2 0 100-4 2 2 0 000 4z'
  }
];

const Settings = () => {
  return (
    <UserLayout>
      <div className="bg-slate-50 p-4 sm:p-6 lg:p-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Settings</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900">Account Settings</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Choose what you want to manage. Profile details and password updates are now in separate pages.
          </p>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {settingCards.map((item) => (
            <div key={item.path} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <span className="mt-1 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700 text-white shadow-sm shadow-blue-700/20">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d={item.iconPath} />
                  </svg>
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600">{item.sectionLabel}</p>
                  <h2 className="text-xl font-semibold text-slate-900">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                  <Link
                    to={item.path}
                    className="mt-5 inline-flex items-center rounded-xl bg-blue-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
                  >
                    {item.cta}
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </section>
      </div>
    </UserLayout>
  );
};

export default Settings;

import React, { useEffect, useState } from 'react';
import { API_BASE_URL, IMAGE_BASE_URL } from '../config/apiBaseUrl';
import { toast } from 'react-toastify';
import UserLayout from './UserLayout';

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchUsers();
  }, []);

  const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
  const normalizeUsername = (value) => String(value || '').trim().toLowerCase();
  const resolveProfileImage = (imagePath) => {
    if (!imagePath) return '';
    return String(imagePath).startsWith('http') ? imagePath : `${IMAGE_BASE_URL}${imagePath}`;
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const [usersResponse, alumniResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/auth/all-users`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch(`${API_BASE_URL}/alumni`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      if (!usersResponse.ok) {
        throw new Error('Failed to fetch users');
      }

      if (!alumniResponse.ok) {
        throw new Error('Failed to fetch alumni');
      }

      const [userRecordsRaw, alumniRecordsRaw] = await Promise.all([
        usersResponse.json(),
        alumniResponse.json(),
      ]);

      const userRecords = Array.isArray(userRecordsRaw) ? userRecordsRaw : [];
      const alumniRecords = Array.isArray(alumniRecordsRaw) ? alumniRecordsRaw : [];

      const alumniAccounts = userRecords.filter((user) => {
        const email = normalizeEmail(user.email);
        const role = String(user.role || '').toUpperCase();
        return role !== 'TEACHER' && role !== 'ADMIN' && !email.endsWith('@lccbonline.com');
      });

      const usersById = new Map(alumniAccounts.map((user) => [user.id, user]));
      const usersByEmail = new Map(
        alumniAccounts.map((user) => [normalizeEmail(user.email), user])
      );
      const usersByUsername = new Map(
        alumniAccounts.map((user) => [normalizeUsername(user.username), user])
      );
      const linkedAccountIds = new Set();

      const alumniUsers = alumniRecords.map((alumnus) => {
        const directLinkedUser = alumnus?.user_id ? usersById.get(alumnus.user_id) : null;
        const rawAlumniEmail = alumnus?.email || alumnus?.user?.email || '';
        const rawAlumniUsername = alumnus?.user?.username || '';
        const linkedByEmail = normalizeEmail(rawAlumniEmail)
          ? usersByEmail.get(normalizeEmail(rawAlumniEmail))
          : null;
        const linkedByUsername = normalizeUsername(rawAlumniUsername)
          ? usersByUsername.get(normalizeUsername(rawAlumniUsername))
          : null;
        const linkedUser = directLinkedUser || linkedByEmail || linkedByUsername || null;

        if (linkedUser) {
          linkedAccountIds.add(linkedUser.id);
        }

        const firstName = alumnus?.first_name || alumnus?.firstName || '';
        const lastName = alumnus?.last_name || alumnus?.lastName || '';
        const fullName = `${firstName} ${lastName}`.trim();

        return {
          id: linkedUser?.id ?? `alumni-${alumnus.id}`,
          accountId: linkedUser?.id ?? null,
          alumniId: alumnus?.id ?? null,
          username: linkedUser?.username || alumnus?.user?.username || fullName || 'Alumni',
          email: linkedUser?.email || rawAlumniEmail || '',
          profile_image: linkedUser?.profile_image || alumnus?.profile_image || alumnus?.profileImage || null,
          role: linkedUser?.role || 'ALUMNI',
          is_blocked: Boolean(linkedUser?.is_blocked),
          hasLinkedAccount: Boolean(linkedUser),
        };
      });

      const standaloneAccounts = alumniAccounts
        .filter((user) => !linkedAccountIds.has(user.id))
        .map((user) => ({
          ...user,
          is_blocked: Boolean(user?.is_blocked),
          accountId: user.id,
          alumniId: null,
          hasLinkedAccount: true,
        }));

      const mergedUsers = [...alumniUsers, ...standaloneAccounts].sort((left, right) =>
        String(left.username || '').localeCompare(String(right.username || ''), undefined, {
          sensitivity: 'base',
        })
      );

      setUsers(mergedUsers);
      setError(null);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const openBlockModal = (user) => {
    setSelectedUser(user);
    setShowBlockModal(true);
  };

  const toggleBlockUser = async () => {
    if (!selectedUser) return;

    try {
      if (!selectedUser.hasLinkedAccount) {
        setUsers(
          users.map((user) =>
            user.id === selectedUser.id ? { ...user, is_blocked: !selectedUser.is_blocked } : user
          )
        );
        setShowBlockModal(false);
        setSelectedUser(null);
        return;
      }
      const accountId = selectedUser.accountId ?? selectedUser.id;
      const response = await fetch(`${API_BASE_URL}/auth/users/${accountId}/block`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_blocked: !selectedUser.is_blocked }),
      });

      if (response.ok) {
        toast.success(`User ${!selectedUser.is_blocked ? 'blocked' : 'unblocked'} successfully`);
        setUsers(
          users.map((user) =>
            user.accountId === accountId ? { ...user, is_blocked: !selectedUser.is_blocked } : user
          )
        );
        setShowBlockModal(false);
        setSelectedUser(null);
      } else {
        const errorData = await response.json();
        toast.error(`Failed to ${!selectedUser.is_blocked ? 'block' : 'unblock'} user: ${errorData.error}`);
      }
    } catch (err) {
      console.error('Error toggling user block status:', err);
      toast.error('An error occurred');
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    if (filterStatus === 'BLOCKED') return matchesSearch && user.is_blocked;
    if (filterStatus === 'ACTIVE') return matchesSearch && !user.is_blocked;
    return matchesSearch;
  });

  if (loading) {
    return (
      <UserLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-sky-600" />
            <p className="mt-4 text-slate-600">Loading users...</p>
          </div>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-lg bg-white p-6 shadow-md">
          <h1 className="mb-6 text-3xl font-bold text-gray-800">Manage Users</h1>

          {error && (
            <div className="mb-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
              {error}
            </div>
          )}

          <div className="mb-6 flex flex-col gap-4 md:flex-row">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="app-select"
              >
                <option value="ALL">All Users</option>
                <option value="ACTIVE">Active Users</option>
                <option value="BLOCKED">Blocked Users</option>
              </select>
            </div>
          </div>

          <div className="scrollbar-hide overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <tr key={`${user.id}-${user.alumniId || 'na'}`} className={user.is_blocked ? 'bg-red-50' : ''}>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center">
                          {user.profile_image ? (
                            <img
                              src={resolveProfileImage(user.profile_image)}
                              alt={user.username}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 font-bold text-white">
                              {user.username?.charAt(0).toUpperCase() || 'U'}
                            </div>
                          )}
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{user.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="text-sm text-gray-900">{user.email}</div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className="inline-flex rounded-full bg-blue-100 px-2 text-xs font-semibold leading-5 text-blue-800">
                          {user.role || 'ALUMNI'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 align-middle">
                        {user.is_blocked ? (
                          <span className="inline-flex rounded-full bg-red-100 px-2 text-xs font-semibold leading-5 text-red-800">
                            Blocked
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-green-100 px-2 text-xs font-semibold leading-5 text-green-800">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium align-middle">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openBlockModal(user)}
                            className={`${
                              user.is_blocked
                                ? 'bg-green-600 hover:bg-green-700'
                                : 'bg-red-600 hover:bg-red-700'
                            } rounded-md px-4 py-2 text-white transition-colors`}
                          >
                            {user.is_blocked ? 'Unblock' : 'Block'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {showBlockModal && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-center">
                {selectedUser.is_blocked ? (
                  <div className="mr-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                    <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                ) : (
                  <div className="mr-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                    <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedUser.is_blocked ? 'Unblock User' : 'Block User'}
                  </h3>
                  <p className="text-sm text-gray-500">@{selectedUser.username}</p>
                </div>
              </div>

              <div className="mb-6">
                {selectedUser.is_blocked ? (
                  <p className="text-gray-700">
                    Are you sure you want to <span className="font-semibold text-green-600">unblock</span> this user?
                    They will be able to access their account again.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-gray-700">
                      Are you sure you want to <span className="font-semibold text-red-600">block</span> this user?
                    </p>
                    <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                      <p className="mb-1 font-medium">Warning: This will:</p>
                      <ul className="list-inside list-disc space-y-1 text-xs">
                        <li>Prevent the user from logging in</li>
                        <li>Block all access to their account</li>
                        <li>Show a blocked message when they try to login</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowBlockModal(false);
                    setSelectedUser(null);
                  }}
                  className="flex-1 rounded-md bg-gray-200 px-4 py-2 font-medium text-gray-800 transition-colors hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={toggleBlockUser}
                  className={`flex-1 rounded-md px-4 py-2 font-medium text-white transition-colors ${
                    selectedUser.is_blocked ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {selectedUser.is_blocked ? 'Yes, Unblock' : 'Yes, Block'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </UserLayout>
  );
};

export default ManageUsers;

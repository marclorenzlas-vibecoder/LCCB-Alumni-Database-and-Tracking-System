import React, { useEffect, useRef, useState } from 'react';
import { getImageUrl } from '../config/apiBaseUrl';
import { API_BASE_URL, IMAGE_BASE_URL } from '../config/apiBaseUrl';
import { toast } from 'react-toastify';
import UserLayout from './UserLayout';
import FilterMenu from './FilterMenu';

const userFilterOptions = [
  { value: 'ALL', label: 'All Users' },
  { value: 'ACTIVE', label: 'Active Users' },
  { value: 'BLOCKED', label: 'Blocked Users' },
];

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const statusMenuRef = useRef(null);
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (statusMenuRef.current && !statusMenuRef.current.contains(event.target)) {
        setShowStatusMenu(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setShowStatusMenu(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
  const normalizeUsername = (value) => String(value || '').trim().toLowerCase();
  const resolveProfileImage = (imagePath) => {
    if (!imagePath) return '';
    return String(imagePath).startsWith('http') ? imagePath : getImageUrl(imagePath);
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
      <div>
      <div className="bg-white shadow sm:rounded-lg">
          {/* Header */}
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Manage Users</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Manage registered alumni accounts
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-64 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors"
                />
                <FilterMenu
                  menuRef={statusMenuRef}
                  isOpen={showStatusMenu}
                  setIsOpen={setShowStatusMenu}
                  buttonLabel="All Users"
                  selectedLabel={userFilterOptions.find((option) => option.value === filterStatus)?.label || 'All Users'}
                  selectedValue={filterStatus}
                  icon={<svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a4 4 0 100 8 4 4 0 000-8zM3 17a7 7 0 0114 0 1 1 0 01-1 1H4a1 1 0 01-1-1z" /></svg>}
                  sections={[{ key: 'users', title: 'Users', items: userFilterOptions }]}
                  onSelect={(value) => {
                    setFilterStatus(value);
                    setShowStatusMenu(false);
                  }}
                  panelTitle="User Status"
                  panelWidthClass="w-full sm:w-44"
                  alignClass="right-0"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="mx-4 mt-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Users List */}
          <div className="overflow-x-auto scrollbar-hide">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">User</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <tr key={`${user.id}-${user.alumniId || 'na'}`} className={`transition-all duration-150 ${user.is_blocked ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {user.profile_image ? (
                            <img
                              src={resolveProfileImage(user.profile_image)}
                              alt={user.username}
                              className="h-10 w-10 rounded-full object-cover border"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 font-bold text-white text-sm">
                              {user.username?.charAt(0).toUpperCase() || 'U'}
                            </div>
                          )}
                          <span className="text-sm font-medium text-gray-900">{user.username}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{user.email}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {user.role || 'ALUMNI'}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        {user.is_blocked ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Blocked
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end">
                          <button
                            onClick={() => openBlockModal(user)}
                            className={`rounded-lg px-4 py-2 text-xs font-semibold text-white transition-colors ${
                              user.is_blocked
                                ? 'bg-emerald-600 hover:bg-emerald-700'
                                : 'bg-red-600 hover:bg-red-700'
                            }`}
                          >
                            {user.is_blocked ? 'Unblock' : 'Block'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-4 py-12 text-center text-sm text-gray-500">
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

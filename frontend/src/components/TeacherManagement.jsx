import React, { useState, useEffect } from 'react';
import ConfirmModal from './ConfirmModal';
import { API_BASE_URL } from '../config/apiBaseUrl';
import UserLayout from './UserLayout';

const TeacherManagement = () => {
  const [teachers, setTeachers] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    department: ''
  });

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    type: 'danger'
  });

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/auth/teachers`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setTeachers(data);
    } catch (err) {
      console.error('Error fetching teachers:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateEmail = (email) => {
    return email.endsWith('@lccbonline.com');
  };

  const readResponseError = async (response, fallbackMessage) => {
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const data = await response.json().catch(() => ({}));
      return data.error || data.message || fallbackMessage;
    }

    const text = await response.text().catch(() => '');
    if (text) {
      const stripped = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      if (stripped && !stripped.startsWith('<!DOCTYPE')) {
        return stripped;
      }
    }

    return fallbackMessage;
  };

  const openCreateModal = () => {
    setEditingTeacherId(null);
    setFormData({ username: '', email: '', password: '', department: '' });
    setError('');
    setSuccess('');
    setShowAddModal(true);
  };

  const openEditModal = (teacher) => {
    setEditingTeacherId(teacher.id);
    setFormData({
      username: teacher.username || '',
      email: teacher.email || '',
      password: '',
      department: teacher.department || ''
    });
    setError('');
    setSuccess('');
    setShowAddModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate email domain
    if (!validateEmail(formData.email)) {
      setError('Teacher email must use @lccbonline.com domain');
      return;
    }

    // Validate all fields
    if (!formData.username || !formData.email || (!editingTeacherId && !formData.password)) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const url = editingTeacherId
        ? `${API_BASE_URL}/auth/profile/${editingTeacherId}`
        : `${API_BASE_URL}/auth/register-teacher`;

      const payload = editingTeacherId
        ? {
            username: formData.username,
            email: formData.email,
            department: formData.department
          }
        : formData;

      const response = await fetch(url, {
        method: editingTeacherId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(await readResponseError(response, editingTeacherId ? 'Failed to update teacher account' : 'Failed to create teacher account'));
      }

      setSuccess(editingTeacherId ? 'Teacher account updated successfully!' : 'Teacher account created successfully!');
      setShowAddModal(false);
      setEditingTeacherId(null);
      setFormData({ username: '', email: '', password: '', department: '' });
      fetchTeachers();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id, teacherName) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Teacher Account',
      message: `Are you sure you want to delete ${teacherName}'s account? This action cannot be undone.`,
      type: 'danger',
      onConfirm: async () => {
        try {
          const token = localStorage.getItem('token');
          await fetch(`${API_BASE_URL}/auth/teachers/${id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          fetchTeachers();
          setConfirmModal({ ...confirmModal, isOpen: false });
        } catch (err) {
          console.error('Error deleting teacher:', err);
          setConfirmModal({ ...confirmModal, isOpen: false });
        }
      }
    });
  };

  return (
    <UserLayout>
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText="Delete"
        cancelText="Cancel"
      />
      <div className="bg-white shadow sm:rounded-lg">
          {/* Header */}
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Teacher Management</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Manage teacher accounts (@lccbonline.com)
                </p>
              </div>
              <button
                onClick={openCreateModal}
                className="app-primary-button"
              >
                Add New
              </button>
            </div>
          </div>

          {/* Teachers List */}
          <div className="overflow-x-auto scrollbar-hide">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Department</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Role</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {teachers.map((teacher) => (
                  <tr key={teacher.id} className="hover:bg-gray-50 transition-all duration-150">
                    <td className="px-4 py-4 text-sm font-medium text-gray-900">{teacher.username}</td>
                    <td className="px-4 py-4 text-sm text-gray-600">{teacher.email}</td>
                    <td className="px-4 py-4 text-sm text-gray-600">{teacher.department || 'N/A'}</td>
                    <td className="px-4 py-4 text-sm">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {teacher.role || 'ADMIN'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEditModal(teacher)}
                            className="inline-flex items-center justify-center rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-800"
                          >
                            Edit
                        </button>
                        <button
                          onClick={() => handleDelete(teacher.id, teacher.username)}
                          className="inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      </div>

      {/* Add Teacher Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="border-b border-gray-200 pb-4 mb-4">
              <h3 className="text-xl font-semibold text-gray-900">{editingTeacherId ? 'Edit Teacher Account' : 'Add Teacher Account'}</h3>
              <p className="mt-1 text-sm text-gray-500">
                {editingTeacherId ? 'Update the teacher account details below.' : 'Create a new teacher account with @lccbonline.com email'}
              </p>
            </div>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 text-sm">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2.5 text-sm rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors"
                  placeholder="e.g., John Doe"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <div className="relative">
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2.5 text-sm rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors"
                    placeholder="teacher@lccbonline.com"
                    required
                  />
                  {formData.email && !validateEmail(formData.email) && (
                    <p className="mt-1 text-xs text-red-600">Must use @lccbonline.com domain</p>
                  )}
                </div>
              </div>

              {!editingTeacherId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2.5 text-sm rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors"
                    placeholder="Secure password"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2.5 text-sm rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors"
                  placeholder="e.g., Computer Science"
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingTeacherId(null);
                    setError('');
                    setSuccess('');
                  }}
                  className="app-secondary-button"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="app-primary-button disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : editingTeacherId ? 'Update Teacher Account' : 'Create Teacher Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </UserLayout>
  );
};

export default TeacherManagement;

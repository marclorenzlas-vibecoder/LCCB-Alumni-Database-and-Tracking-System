import React, { useState, useEffect } from 'react';

const API_BASE_URL = 'http://localhost:5001/api/auth';

const AdminDashboard = () => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [rejectReason, setRejectReason] = useState('');
  const [verificationStatus, setVerificationStatus] = useState({}); // Store verification status for each user

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  // Verify School ID against alumni database
  const verifyStudentId = async (studentId) => {
    if (!studentId) return null;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/verify-student-id/${studentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error verifying student ID:', error);
      return null;
    }
  };

  const fetchPendingUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/pending-registrations`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setPendingUsers(data);
      
      // Verify each student ID
      const verifications = {};
      for (const user of data) {
        if (user.student_id) {
          const verification = await verifyStudentId(user.student_id);
          verifications[user.id] = verification;
        }
      }
      setVerificationStatus(verifications);
    } catch (error) {
      console.error('Error fetching pending registrations:', error);
      setMessage({ type: 'error', text: 'Failed to fetch pending registrations' });
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/approve-registration/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ 
          type: 'success', 
          text: 'User approved successfully! They can now login to the system.' 
        });
        fetchPendingUsers();
        setTimeout(() => setMessage({ type: '', text: '' }), 5000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to approve registration' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to approve registration' });
    }
  };

  const handleRejection = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      console.log('Rejecting registration:', userId);
      
      const response = await fetch(`${API_BASE_URL}/reject-registration/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason: 'Registration rejected by admin' })
      });

      const data = await response.json();
      console.log('Rejection response:', data);

      if (response.ok) {
        setMessage({ 
          type: 'success', 
          text: 'Registration rejected successfully!' 
        });
        fetchPendingUsers();
        setRejectReason('');
        setTimeout(() => setMessage({ type: '', text: '' }), 5000);
      } else {
        console.error('Rejection failed:', data);
        setMessage({ type: 'error', text: data.error || 'Failed to reject registration' });
      }
    } catch (error) {
      console.error('Rejection error:', error);
      setMessage({ type: 'error', text: 'Network error: Failed to reject registration' });
    }
  };

  const formatLevel = (level) => {
    if (!level) return 'N/A';
    return level.replace('_', ' ').split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-2 text-gray-600">Review and verify alumni registrations</p>
        </div>

        {message.text && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-700' 
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-blue-50">
            <h2 className="text-xl font-semibold text-gray-900">
              Pending Alumni Verifications ({pendingUsers.length})
            </h2>
            <p className="text-sm text-gray-600 mt-1">Click on a registration to view full details</p>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : pendingUsers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No pending registrations to review
            </div>
          ) : (
            <div className="overflow-x-auto scrollbar-hide">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      School ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Level/Course
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Batch/Grad Year
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date Submitted
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pendingUsers.map((user) => (
                    <React.Fragment key={user.id}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {user.first_name} {user.last_name}
                          </div>
                          <div className="text-xs text-gray-500">({user.username})</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900 font-mono">{user.student_id || 'N/A'}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">{user.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">{user.contact_number || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatLevel(user.level)}</div>
                          <div className="text-xs text-gray-500">{user.course || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {user.batch && `Batch ${user.batch}`}
                          </div>
                          <div className="text-xs text-gray-500">
                            {user.graduation_year && `Grad: ${user.graduation_year}`}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleApproval(user.id);
                              }}
                              className="inline-flex items-center justify-center px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-xs"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                              </svg>
                              Approve
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRejection(user.id);
                              }}
                              className="inline-flex items-center justify-center px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-xs"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>

                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

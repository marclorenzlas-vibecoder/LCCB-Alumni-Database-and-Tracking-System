import React, { useState, useEffect } from 'react';
import { authService } from '../services/authService';

const API_BASE_URL = 'http://localhost:5001/api/auth';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    // Alumni fields
    firstName: '',
    lastName: '',
    level: '',
    course: '',
    batch: '',
    graduationYear: '',
    currentPosition: '',
    company: '',
    location: '',
    skills: ''
  });
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  const [socialLinks, setSocialLinks] = useState([]);
  const [newSocialLink, setNewSocialLink] = useState({ url: '' });
  const [showAddSocialLink, setShowAddSocialLink] = useState(false);

  useEffect(() => {
    const userData = authService.getCurrentUser();
    if (userData) {
      setUser(userData);
      setFormData({
        username: userData.username || '',
        email: userData.email || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        // Alumni fields
        firstName: userData.alumni?.firstName || '',
        lastName: userData.alumni?.lastName || '',
        level: userData.alumni?.level || '',
        course: userData.alumni?.course || '',
        batch: userData.alumni?.batch || '',
        graduationYear: userData.alumni?.graduationYear || '',
        currentPosition: userData.alumni?.currentPosition || userData.alumni?.current_position || '',
        company: userData.alumni?.company || '',
        location: userData.alumni?.location || '',
        skills: userData.alumni?.skills || ''
      });
      if (userData.profile_image) {
        setProfileImagePreview(`http://localhost:5001${userData.profile_image}`);
      }
      // Fetch social links
      if (userData.alumni?.id) {
        fetchSocialLinks(userData.alumni.id);
      }
    }
  }, []);

  const fetchSocialLinks = async (alumniId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5001/api/alumni/${alumniId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setSocialLinks(data.social_link || []);
      }
    } catch (error) {
      console.error('Error fetching social links:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddSocialLink = async () => {
    if (!newSocialLink.url) {
      setMessage({ type: 'error', text: 'Please enter a URL' });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5001/api/alumni/${user.alumni.id}/social-links`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ url: newSocialLink.url })
      });

      if (response.ok) {
        const addedLink = await response.json();
        setSocialLinks([...socialLinks, addedLink]);
        setNewSocialLink({ url: '' });
        setShowAddSocialLink(false);
        setMessage({ type: 'success', text: 'Social link added successfully!' });
      } else {
        setMessage({ type: 'error', text: 'Failed to add social link' });
      }
    } catch (error) {
      console.error('Error adding social link:', error);
      setMessage({ type: 'error', text: 'Error adding social link' });
    }
  };

  const handleDeleteSocialLink = async (linkId) => {
    if (!confirm('Are you sure you want to delete this social link?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5001/api/alumni/${user.alumni.id}/social-links/${linkId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setSocialLinks(socialLinks.filter(link => link.id !== linkId));
        setMessage({ type: 'success', text: 'Social link deleted successfully!' });
      } else {
        setMessage({ type: 'error', text: 'Failed to delete social link' });
      }
    } catch (error) {
      console.error('Error deleting social link:', error);
      setMessage({ type: 'error', text: 'Error deleting social link' });
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const token = localStorage.getItem('token');
      const formDataToSend = new FormData();
      formDataToSend.append('username', formData.username);
      formDataToSend.append('email', formData.email);
      
      // Alumni fields
      formDataToSend.append('firstName', formData.firstName);
      formDataToSend.append('lastName', formData.lastName);
      formDataToSend.append('level', formData.level);
      formDataToSend.append('course', formData.course);
      formDataToSend.append('batch', formData.batch);
      formDataToSend.append('graduationYear', formData.graduationYear);
      formDataToSend.append('currentPosition', formData.currentPosition);
      formDataToSend.append('company', formData.company);
      formDataToSend.append('location', formData.location);
      formDataToSend.append('skills', formData.skills);
      
      if (profileImageFile) {
        formDataToSend.append('profileImage', profileImageFile);
      }

      const response = await fetch(`${API_BASE_URL}/profile/${user.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      // Update user data in localStorage
      const updatedUser = {
        ...user,
        username: data.user.username,
        email: data.user.email,
        profile_image: data.user.profile_image,
        role: data.user.role || user.role,
        alumni: data.alumni || user.alumni
      };
      
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setIsEditing(false);
      setProfileImageFile(null);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      
      // Trigger storage event to update Navbar
      window.dispatchEvent(new Event('storage'));
      
      // Force a small delay then reload to ensure all components update
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to update profile' });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    // Validate passwords
    if (formData.newPassword !== formData.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      setLoading(false);
      return;
    }

    if (formData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/change-password/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
          email: user.email
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change password');
      }

      setMessage({ type: 'success', text: 'Password changed successfully!' });
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to change password' });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-8 sm:px-8">
            <div className="flex items-center gap-6">
              {user.profile_image ? (
                <img 
                  src={`http://localhost:5001${user.profile_image}`} 
                  alt={user.username || 'User'} 
                  className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center text-blue-600 text-3xl font-bold shadow-lg">
                  {user.username?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              <div className="text-white">
                <h1 className="text-3xl font-bold mb-1">{user.username || 'User'}</h1>
                <p className="text-blue-100">{user.email || ''}</p>
                <p className="text-sm text-blue-200 mt-1">
                  Role: {user.role === 'TEACHER' || user.role === 'teacher' ? 'Teacher' : 'Alumni'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-700' 
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        {/* Profile Information */}
        <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Profile Information</h2>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Edit Profile
              </button>
            )}
          </div>

          {isEditing ? (
            <form onSubmit={handleUpdateProfile} className="space-y-5">
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-blue-500 bg-gray-100">
                    {profileImagePreview ? (
                      <img src={profileImagePreview} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl text-blue-600 font-bold">
                        {formData.username?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                  required
                />
              </div>

              {/* Alumni Information Section */}
              <div className="pt-4 mt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Alumni Information</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Level
                    </label>
                    <select
                      name="level"
                      value={formData.level}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                    >
                      <option value="">Select Level</option>
                      <option value="COLLEGE">College</option>
                      <option value="SENIOR_HIGH_SCHOOL">Senior High School</option>
                      <option value="HIGH_SCHOOL">High School</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Course
                    </label>
                    <input
                      type="text"
                      name="course"
                      value={formData.course}
                      onChange={handleChange}
                      placeholder="e.g., Bachelor of Science in Computer Science"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Batch
                    </label>
                    <input
                      type="number"
                      name="batch"
                      value={formData.batch}
                      onChange={handleChange}
                      min="1990"
                      max="2030"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Graduation Year
                    </label>
                    <input
                      type="number"
                      name="graduationYear"
                      value={formData.graduationYear}
                      onChange={handleChange}
                      min="1990"
                      max="2030"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Position
                    </label>
                    <input
                      type="text"
                      name="currentPosition"
                      value={formData.currentPosition}
                      onChange={handleChange}
                      placeholder="e.g., Software Engineer"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company
                    </label>
                    <input
                      type="text"
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      placeholder="e.g., Tech Corp"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Location
                    </label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      placeholder="e.g., Manila, Philippines"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Skills
                  </label>
                  <textarea
                    name="skills"
                    value={formData.skills}
                    onChange={handleChange}
                    rows="4"
                    placeholder="List your skills (e.g., JavaScript, React, Node.js, etc.)"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors resize-none"
                  />
                </div>

                {/* Social Links Section */}
                <div className="mt-6 border-t pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Social Media Links
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowAddSocialLink(!showAddSocialLink)}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {showAddSocialLink ? 'Cancel' : '+ Add Link'}
                    </button>
                  </div>

                  {showAddSocialLink && (
                    <div className="bg-gray-50 p-4 rounded-lg mb-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">URL</label>
                        <input
                          type="url"
                          value={newSocialLink.url}
                          onChange={(e) => setNewSocialLink({ url: e.target.value })}
                          placeholder="https://facebook.com/yourprofile or https://linkedin.com/in/yourname"
                          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddSocialLink}
                        className="mt-3 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Add Link
                      </button>
                    </div>
                  )}

                  <div className="space-y-2">
                    {socialLinks.length > 0 ? (
                      socialLinks.map((link) => (
                        <div key={link.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-gray-700">{link.platform}</span>
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:text-blue-700 truncate max-w-xs"
                            >
                              {link.url}
                            </a>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteSocialLink(link.id)}
                            className="text-red-600 hover:text-red-700 text-sm font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 py-2">No social links added yet</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setFormData({
                      username: user.username || '',
                      email: user.email || '',
                      currentPassword: '',
                      newPassword: '',
                      confirmPassword: '',
                      // Reset alumni fields
                      firstName: user.alumni?.firstName || '',
                      lastName: user.alumni?.lastName || '',
                      level: user.alumni?.level || '',
                      course: user.alumni?.course || '',
                      batch: user.alumni?.batch || '',
                      graduationYear: user.alumni?.graduationYear || '',
                      currentPosition: user.alumni?.currentPosition || user.alumni?.current_position || '',
                      company: user.alumni?.company || '',
                      location: user.alumni?.location || '',
                      skills: user.alumni?.skills || ''
                    });
                  }}
                  className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Username</label>
                  <p className="text-lg text-gray-900">{user.username || 'Not set'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
                  <p className="text-lg text-gray-900">{user.email || 'Not set'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Role</label>
                  <p className="text-lg text-gray-900 uppercase">{user.role === 'TEACHER' || user.role === 'teacher' ? 'TEACHER' : 'ALUMNI'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Account Status</label>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    Active
                  </span>
                </div>
              </div>

              {/* Alumni Information Display */}
              {user.alumni && (
                <div className="pt-6 mt-6 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Alumni Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">First Name</label>
                      <p className="text-lg text-gray-900">{user.alumni.firstName || 'Not set'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Last Name</label>
                      <p className="text-lg text-gray-900">{user.alumni.lastName || 'Not set'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Level</label>
                      <p className="text-lg text-gray-900">
                        {user.alumni.level === 'COLLEGE' && 'College'}
                        {user.alumni.level === 'SENIOR_HIGH_SCHOOL' && 'Senior High School'}
                        {user.alumni.level === 'HIGH_SCHOOL' && 'High School'}
                        {!user.alumni.level && 'Not set'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Course</label>
                      <p className="text-lg text-gray-900">{user.alumni.course || 'Not set'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Batch</label>
                      <p className="text-lg text-gray-900">{user.alumni.batch || 'Not set'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Graduation Year</label>
                      <p className="text-lg text-gray-900">{user.alumni.graduationYear || 'Not set'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Current Position</label>
                      <p className="text-lg text-gray-900">{user.alumni.currentPosition || user.alumni.current_position || 'Not set'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Company</label>
                      <p className="text-lg text-gray-900">{user.alumni.company || 'Not set'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Location</label>
                      <p className="text-lg text-gray-900">{user.alumni.location || 'Not set'}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-500 mb-1">Skills</label>
                      <p className="text-gray-900">{user.alumni.skills || 'Not set'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Change Password */}
        <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Change Password</h2>
          <form onSubmit={handleChangePassword} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Password
              </label>
              <input
                type="password"
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                placeholder="Enter current password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <input
                type="password"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                placeholder="Enter new password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                placeholder="Confirm new password"
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;

import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/apiBaseUrl';
import UserLayout from './UserLayout';

const AlumniList = () => {
  const [alumniList, setAlumniList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [showSearchResult, setShowSearchResult] = useState(false);

  useEffect(() => {
    fetchAlumniList();
  }, [selectedYear]);

  const fetchAlumniList = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedYear) params.append('graduation_year', selectedYear);
      
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setAlumniList(data);
    } catch (error) {
      console.error('Error fetching alumni list:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setShowSearchResult(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/search/${searchTerm.trim()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setSearchResult(data);
      setShowSearchResult(true);
    } catch (error) {
      console.error('Error searching:', error);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <UserLayout>
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Official Alumni List</h1>
        <p className="text-gray-600 mb-8">Search by School ID only</p>

      {/* Search Section */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Search Alumni</h2>
        <div className="flex gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="School ID"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full px-4 py-3 text-lg font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Search
          </button>
        </div>
      </div>

      {/* Search Result */}
      {showSearchResult && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          {searchResult?.found ? (
            <div className="border-l-4 border-green-500 bg-green-50 p-4">
              <div className="flex items-start">
                <svg className="w-6 h-6 text-green-500 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-green-900 mb-2">Alumni Found!</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">School ID:</span>
                      <span className="ml-2 font-mono text-gray-900">{searchResult.alumni.student_id}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Name:</span>
                      <span className="ml-2 text-gray-900">
                        {searchResult.alumni.first_name} {searchResult.alumni.middle_name} {searchResult.alumni.last_name}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Course:</span>
                      <span className="ml-2 text-gray-900">{searchResult.alumni.course || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Graduation Year:</span>
                      <span className="ml-2 text-gray-900">{searchResult.alumni.graduation_year || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Batch:</span>
                      <span className="ml-2 text-gray-900">{searchResult.alumni.batch || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Level:</span>
                      <span className="ml-2 text-gray-900">{searchResult.alumni.level || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="border-l-4 border-red-500 bg-red-50 p-4">
              <div className="flex items-start">
                <svg className="w-6 h-6 text-red-500 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div>
                  <h3 className="text-lg font-semibold text-red-900">Not Found</h3>
                  <p className="text-red-700 mt-1">The School ID "{searchTerm}" was not found in the official alumni list.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filter and List */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">All Alumni Records</h2>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="app-select"
          >
            <option value="">All Years</option>
            <option value="2023">Class of 2023</option>
            <option value="2024">Class of 2024</option>
            <option value="2025">Class of 2025</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : alumniList.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No alumni found</div>
        ) : (
          <div className="overflow-x-auto scrollbar-hide">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">School ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Level</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Graduation Year</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {alumniList.map((alumni) => (
                  <tr key={alumni.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">{alumni.student_id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {alumni.first_name} {alumni.middle_name} {alumni.last_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{alumni.course || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{alumni.level || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{alumni.batch || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{alumni.graduation_year || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>
    </UserLayout>
  );
};

export default AlumniList;

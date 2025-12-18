// Alumni Data Service
// This service handles all alumni data operations through API calls

const API_URL = 'http://localhost:5001/api/alumni';

class AlumniService {
  // Get all alumni
  async getAllAlumni() {
    try {
      const response = await fetch(API_URL);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await response.json();
      
      // Transform the data to match our frontend structure
      return data.map(alumnus => {
        // Handle profile image URL
        let profileImageUrl = alumnus.profile_image || alumnus.profileImage || '';
        console.log('Processing alumni:', alumnus.id, 'Original image:', profileImageUrl);
        
        if (profileImageUrl && !profileImageUrl.startsWith('http')) {
          // If it's a relative path, prepend the backend URL
          profileImageUrl = `http://localhost:5001${profileImageUrl}`;
          console.log('Converted to full URL:', profileImageUrl);
        }
        
        return {
          id: alumnus.id.toString(),
          firstName: alumnus.first_name || alumnus.firstName || '',
          lastName: alumnus.last_name || alumnus.lastName || '',
          middleName: alumnus.middle_name || alumnus.middleName || '',
          graduationYear: alumnus.graduation_year || alumnus.graduationYear || '',
          level: alumnus.level || '',
          batch: alumnus.batch || '',
          course: alumnus.course || '',
          currentPosition: alumnus.current_position || alumnus.currentPosition || '',
          company: alumnus.company || '',
          location: alumnus.location || '',
          contactNumber: alumnus.contact_number || alumnus.contactNumber || '',
          email: alumnus.email || alumnus.user?.email || '',
          skills: alumnus.skills || '',
          profileImage: profileImageUrl || 'https://via.placeholder.com/150x150/9CA3AF/FFFFFF?text=Profile',
          bio: alumnus.bio || '',
          isPublic: alumnus.is_public !== undefined ? alumnus.is_public : true,
          isVerified: alumnus.is_verified !== undefined ? alumnus.is_verified : false
        };
      });
    } catch (error) {
      console.error('Error loading alumni:', error);
      throw error;
    }
  }

  // Add new alumni
  async addAlumni(alumniData) {
    try {
      let requestConfig = {};
      
      // Check if there's a file to upload
      if (alumniData.profileImageFile) {
        // Use FormData for file upload
        const formData = new FormData();
        formData.append('email', alumniData.email || '');
        formData.append('firstName', alumniData.firstName ? alumniData.firstName.trim() : '');
        formData.append('lastName', alumniData.lastName ? alumniData.lastName.trim() : '');
        formData.append('graduationYear', alumniData.graduationYear ? alumniData.graduationYear.toString() : '');
        formData.append('course', alumniData.course ? alumniData.course.trim() : '');
        formData.append('currentPosition', alumniData.currentPosition ? alumniData.currentPosition.trim() : '');
        formData.append('company', alumniData.company ? alumniData.company.trim() : '');
        formData.append('location', alumniData.location ? alumniData.location.trim() : '');
        formData.append('contactNumber', alumniData.contactNumber ? alumniData.contactNumber.trim() : '');
        formData.append('level', alumniData.level || '');
        formData.append('batch', alumniData.batch ? String(alumniData.batch) : '');
        formData.append('skills', Array.isArray(alumniData.skills) ? alumniData.skills.join(', ') : alumniData.skills || '');
        formData.append('profileImage', alumniData.profileImageFile);
        
        requestConfig = {
          method: 'POST',
          body: formData
        };
      } else {
        // Use JSON for regular data
        const profileImage = alumniData.profileImage && 
                            alumniData.profileImage.includes('/uploads/') ? 
                            alumniData.profileImage : null;
        
        const backendData = {
          email: alumniData.email || '',
          firstName: alumniData.firstName ? alumniData.firstName.trim() : '',
          lastName: alumniData.lastName ? alumniData.lastName.trim() : '',
          graduationYear: alumniData.graduationYear ? parseInt(alumniData.graduationYear) : null,
          level: alumniData.level || null,
          batch: alumniData.batch ? parseInt(alumniData.batch) : null,
          course: alumniData.course ? alumniData.course.trim() : '',
          currentPosition: alumniData.currentPosition ? alumniData.currentPosition.trim() : '',
          company: alumniData.company ? alumniData.company.trim() : '',
          location: alumniData.location ? alumniData.location.trim() : '',
          contactNumber: alumniData.contactNumber ? alumniData.contactNumber.trim() : '',
          skills: Array.isArray(alumniData.skills) ? alumniData.skills.join(', ') : alumniData.skills || '',
          profileImage: profileImage
        };

        console.log('Sending data to backend:', backendData);

        requestConfig = {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(backendData)
        };
      }

      const response = await fetch(API_URL, requestConfig);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to add alumni');
      }

      const newAlumni = await response.json();
      console.log('Added alumni response from backend:', newAlumni);
      
      // Transform the response to match frontend format
      let profileImageUrl = newAlumni.profile_image || newAlumni.profileImage || '';
      if (profileImageUrl && !profileImageUrl.startsWith('http')) {
        profileImageUrl = `http://localhost:5001${profileImageUrl}`;
      }
      
      return {
        id: newAlumni.id.toString(),
        firstName: newAlumni.first_name || newAlumni.firstName || '',
        lastName: newAlumni.last_name || newAlumni.lastName || '',
        graduationYear: newAlumni.graduation_year || newAlumni.graduationYear || '',
        level: newAlumni.level || '',
        batch: newAlumni.batch || '',
        course: newAlumni.course || '',
        currentPosition: newAlumni.current_position || newAlumni.currentPosition || '',
        company: newAlumni.company || '',
        location: newAlumni.location || '',
        contactNumber: newAlumni.contact_number || '',
        email: newAlumni.user?.email || alumniData.email || '',
        skills: newAlumni.skills ? 
          (typeof newAlumni.skills === 'string' ? 
            newAlumni.skills.split(',').map(s => s.trim()) : 
            newAlumni.skills) : 
          [],
        profileImage: profileImageUrl || 'https://via.placeholder.com/150x150/9CA3AF/FFFFFF?text=Profile',
        isPublic: newAlumni.is_public,
        isVerified: newAlumni.is_verified
      };
    } catch (error) {
      console.error('Error adding alumni:', error);
      throw error;
    }
  }

  // Update alumni
  async updateAlumni(id, alumniData) {
    try {
      let requestConfig = {};
      
      if (alumniData instanceof FormData) {
        // Handle FormData (used when updating with file upload)
        requestConfig = {
          method: 'PUT',
          body: alumniData
        };
      } else {
        // Handle JSON data (used when updating without file upload)
        const profileImage = alumniData.profileImage && 
                          alumniData.profileImage.includes('/uploads/') ? 
                          alumniData.profileImage : undefined;
      
        const backendData = {
          firstName: alumniData.firstName ? alumniData.firstName.trim() : undefined,
          lastName: alumniData.lastName ? alumniData.lastName.trim() : undefined,
          graduationYear: alumniData.graduationYear ? parseInt(alumniData.graduationYear) : undefined,
          level: alumniData.level !== undefined ? alumniData.level : undefined,
          batch: alumniData.batch !== undefined ? parseInt(alumniData.batch) : undefined,
          course: alumniData.course ? alumniData.course.trim() : undefined,
          currentPosition: alumniData.currentPosition ? alumniData.currentPosition.trim() : undefined,
          company: alumniData.company ? alumniData.company.trim() : undefined,
          location: alumniData.location ? alumniData.location.trim() : undefined,
          email: alumniData.email ? alumniData.email.trim() : undefined,
          contactNumber: alumniData.contactNumber ? alumniData.contactNumber.trim() : undefined,
          skills: Array.isArray(alumniData.skills) ? alumniData.skills.join(', ') : alumniData.skills || undefined,
          profileImage: profileImage
        };

        // Remove undefined values
        Object.keys(backendData).forEach(key => backendData[key] === undefined && delete backendData[key]);

        console.log('Updating alumni with data:', backendData);

        requestConfig = {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(backendData)
        };
      }

      const response = await fetch(`${API_URL}/${id}`, requestConfig);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update alumni');
      }

      const updatedAlumni = await response.json();
      console.log('Alumni updated successfully:', id);
      
      // Transform the response to match frontend format
      let profileImageUrl = updatedAlumni.profile_image || updatedAlumni.profileImage || '';
      if (profileImageUrl && !profileImageUrl.startsWith('http')) {
        profileImageUrl = `http://localhost:5001${profileImageUrl}`;
      }
      
      return {
        id: updatedAlumni.id.toString(),
        firstName: updatedAlumni.first_name || updatedAlumni.firstName || '',
        lastName: updatedAlumni.last_name || updatedAlumni.lastName || '',
        middleName: updatedAlumni.middle_name || updatedAlumni.middleName || '',
        graduationYear: updatedAlumni.graduation_year || updatedAlumni.graduationYear || '',
        level: updatedAlumni.level || '',
        batch: updatedAlumni.batch || '',
        course: updatedAlumni.course || '',
        currentPosition: updatedAlumni.current_position || updatedAlumni.currentPosition || '',
        company: updatedAlumni.company || '',
        location: updatedAlumni.location || '',
        contactNumber: updatedAlumni.contact_number || updatedAlumni.contactNumber || '',
        email: updatedAlumni.email || updatedAlumni.user?.email || '',
        skills: updatedAlumni.skills || '',
        profileImage: profileImageUrl || 'https://via.placeholder.com/150x150/9CA3AF/FFFFFF?text=Profile',
        bio: updatedAlumni.bio || '',
        isPublic: updatedAlumni.is_public !== undefined ? updatedAlumni.is_public : true,
        isVerified: updatedAlumni.is_verified !== undefined ? updatedAlumni.is_verified : false
      };
    } catch (error) {
      console.error('Error updating alumni:', error);
      throw error;
    }
  }

  // Delete alumni
  async deleteAlumni(id) {
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete alumni');
      }

      console.log('Alumni deleted successfully:', id);
      return true;
    } catch (error) {
      console.error('Error deleting alumni:', error);
      throw error;
    }
  }

  // Get alumni by ID
  async getAlumniById(id) {
    try {
      const allAlumni = await this.getAllAlumni();
      return allAlumni.find(alumnus => alumnus.id === id);
    } catch (error) {
      console.error('Error getting alumni by ID:', error);
      return null;
    }
  }

  // Search alumni
  async searchAlumni(searchTerm, filters = {}) {
    try {
      const allAlumni = await this.getAllAlumni();
      
      return allAlumni.filter(alumnus => {
        const matchesSearch = searchTerm === '' || 
          alumnus.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          alumnus.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          alumnus.course.toLowerCase().includes(searchTerm.toLowerCase()) ||
          alumnus.currentPosition.toLowerCase().includes(searchTerm.toLowerCase()) ||
          alumnus.company.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesCourse = !filters.course || alumnus.course === filters.course;
        const matchesYear = !filters.year || alumnus.graduationYear.toString() === filters.year;
        
        return matchesSearch && matchesCourse && matchesYear;
      });
    } catch (error) {
      console.error('Error searching alumni:', error);
      return [];
    }
  }

  // Clear all data (for testing purposes)
  clearAllData() {
    localStorage.removeItem(this.storageKey);
    this.memoryStorage = null;
    console.log('All alumni data cleared');
  }

  // Clear localStorage and move to memory storage
  clearLocalStorageAndUseMemory() {
    try {
      const currentData = this.safeGetItem(this.storageKey);
      localStorage.removeItem(this.storageKey);
      this.memoryStorage = currentData;
      console.log('Moved data to memory storage due to localStorage quota');
      return true;
    } catch (error) {
      console.error('Error clearing localStorage:', error);
      return false;
    }
  }
}

// Export singleton instance
export default new AlumniService();

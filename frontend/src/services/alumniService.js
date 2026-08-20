// Alumni Data Service
// This service handles all alumni data operations through API calls
import { API_BASE_URL, IMAGE_BASE_URL } from "../config/apiBaseUrl";

const API_URL = `${API_BASE_URL}/alumni`;

const parseBooleanFlag = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") return fallback;
  if (value === true || value === 1 || value === "1") return true;
  if (value === false || value === 0 || value === "0") return false;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "yes", "public"].includes(normalized)) return true;
    if (["false", "no", "private"].includes(normalized)) return false;
  }
  return fallback;
};

const pickPrivacyFlag = (source = {}, camelKey, snakeKey, fallback = false) => {
  const value = source?.[camelKey] !== undefined ? source[camelKey] : source?.[snakeKey];
  return parseBooleanFlag(value, fallback);
};

class AlumniService {
  getAvatarFallbackUrl(firstName, lastName) {
    const fullName = `${firstName || ""} ${lastName || ""}`.trim() || "Alumni";
    const encodedName = encodeURIComponent(fullName);
    return `https://ui-avatars.com/api/?name=${encodedName}&background=2563eb&color=ffffff&size=160`;
  }

  formatDateForInput(dateValue) {
    if (!dateValue) return null;

    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return null;

    return date.toISOString().slice(0, 10);
  }

  normalizeEducationHistory(raw) {
    if (!Array.isArray(raw)) return [];

    return raw
      .map((entry) => ({
        level: entry?.level || "",
        batch: entry?.batch ?? "",
        graduationYear: entry?.graduationYear ?? entry?.graduation_year ?? "",
      }))
      .filter((entry) => entry.level);
  }

  normalizeAlumniRecord(alumnus) {
    let profileImageUrl = alumnus.profile_image || alumnus.profileImage || "";
    if (profileImageUrl && !profileImageUrl.startsWith("http")) {
      profileImageUrl = `${IMAGE_BASE_URL}${profileImageUrl}`;
    }

    const educationHistory = this.normalizeEducationHistory(
      alumnus.educationHistory || alumnus.education_history,
    );

    const firstName =
      alumnus.first_name || alumnus.firstName || alumnus.user?.username || "";
    const lastName = alumnus.last_name || alumnus.lastName || "";
    const status = alumnus.status || "LIVING";

    return {
      id: alumnus.id.toString(),
      userId: alumnus.user_id ?? alumnus.userId ?? alumnus.user?.id ?? "",
      user_id: alumnus.user_id ?? alumnus.userId ?? alumnus.user?.id ?? "",
      student_id: alumnus.student_id || alumnus.studentId || "",
      firstName,
      lastName,
      middleName: alumnus.middle_name || alumnus.middleName || "",
      graduationYear: alumnus.graduation_year || alumnus.graduationYear || "",
      level: alumnus.level || "",
      batch: alumnus.batch || "",
      course: alumnus.course || "",
      currentPosition:
        alumnus.current_position || alumnus.currentPosition || "",
      company: alumnus.company || "",
      location: alumnus.location || "",
      contactNumber: alumnus.contact_number || alumnus.contactNumber || "",
      email: alumnus.email || alumnus.user?.email || "",
      username: alumnus.user?.username || "",
      dateOfBirth: this.formatDateForInput(
        alumnus.date_of_birth || alumnus.dateOfBirth,
      ),
      date_of_birth: alumnus.date_of_birth || alumnus.dateOfBirth || null,
      skills: alumnus.skills || "",
      educationHistory,
      social_link: alumnus.social_link || alumnus.socialLink || [],
      profileImage:
        profileImageUrl || this.getAvatarFallbackUrl(firstName, lastName),
      bio: alumnus.bio || "",
      status,
      isPublic: parseBooleanFlag(alumnus.is_public ?? alumnus.isPublic, true),
      isStudentIdPublic: pickPrivacyFlag(alumnus, 'isStudentIdPublic', 'is_student_id_public', false),
      is_student_id_public: pickPrivacyFlag(alumnus, 'isStudentIdPublic', 'is_student_id_public', false),
      isDateOfBirthPublic: pickPrivacyFlag(alumnus, 'isDateOfBirthPublic', 'is_date_of_birth_public', false),
      is_date_of_birth_public: pickPrivacyFlag(alumnus, 'isDateOfBirthPublic', 'is_date_of_birth_public', false),
      isCoursePublic: pickPrivacyFlag(alumnus, 'isCoursePublic', 'is_course_public', true),
      is_course_public: pickPrivacyFlag(alumnus, 'isCoursePublic', 'is_course_public', true),
      isGraduationYearPublic: pickPrivacyFlag(alumnus, 'isGraduationYearPublic', 'is_graduation_year_public', true),
      is_graduation_year_public: pickPrivacyFlag(alumnus, 'isGraduationYearPublic', 'is_graduation_year_public', true),
      isEducationHistoryPublic: pickPrivacyFlag(alumnus, 'isEducationHistoryPublic', 'is_education_history_public', true),
      is_education_history_public: pickPrivacyFlag(alumnus, 'isEducationHistoryPublic', 'is_education_history_public', true),
      isEmailPublic: pickPrivacyFlag(alumnus, 'isEmailPublic', 'is_email_public', false),
      is_email_public: pickPrivacyFlag(alumnus, 'isEmailPublic', 'is_email_public', false),
      isPhonePublic: pickPrivacyFlag(alumnus, 'isPhonePublic', 'is_phone_public', false),
      is_phone_public: pickPrivacyFlag(alumnus, 'isPhonePublic', 'is_phone_public', false),
      isPositionPublic: pickPrivacyFlag(alumnus, 'isPositionPublic', 'is_position_public', false),
      is_position_public: pickPrivacyFlag(alumnus, 'isPositionPublic', 'is_position_public', false),
      isEmploymentPublic: pickPrivacyFlag(alumnus, 'isEmploymentPublic', 'is_employment_public', false),
      is_employment_public: pickPrivacyFlag(alumnus, 'isEmploymentPublic', 'is_employment_public', false),
      isCompanyPublic: pickPrivacyFlag(alumnus, 'isCompanyPublic', 'is_company_public', false),
      is_company_public: pickPrivacyFlag(alumnus, 'isCompanyPublic', 'is_company_public', false),
      isLocationPublic: pickPrivacyFlag(alumnus, 'isLocationPublic', 'is_location_public', false),
      is_location_public: pickPrivacyFlag(alumnus, 'isLocationPublic', 'is_location_public', false),
      isSocialLinksPublic: pickPrivacyFlag(alumnus, 'isSocialLinksPublic', 'is_social_links_public', false),
      is_social_links_public: pickPrivacyFlag(alumnus, 'isSocialLinksPublic', 'is_social_links_public', false),
      isSkillsPublic: pickPrivacyFlag(alumnus, 'isSkillsPublic', 'is_skills_public', false),
      is_skills_public: pickPrivacyFlag(alumnus, 'isSkillsPublic', 'is_skills_public', false),
      isVerified: parseBooleanFlag(alumnus.is_verified ?? alumnus.isVerified, false),
    };
  }

  // Get all alumni.
  // The auth token is forwarded so the backend can return the full list
  // for teachers/admins and the public-only subset for regular alumni.
  async getAllAlumni() {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(API_URL, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      const data = await response.json();
      return data.map((alumnus) => this.normalizeAlumniRecord(alumnus));
    } catch (error) {
      console.error("Error loading alumni:", error);
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
        formData.append("email", alumniData.email || "");
        formData.append(
          "firstName",
          alumniData.firstName ? alumniData.firstName.trim() : "",
        );
        formData.append(
          "middleName",
          alumniData.middleName ? alumniData.middleName.trim() : "",
        );
        formData.append(
          "lastName",
          alumniData.lastName ? alumniData.lastName.trim() : "",
        );
        formData.append(
          "graduationYear",
          alumniData.graduationYear ? alumniData.graduationYear.toString() : "",
        );
        formData.append("dateOfBirth", alumniData.dateOfBirth || "");
        formData.append(
          "course",
          alumniData.course ? alumniData.course.trim() : "",
        );
        formData.append(
          "currentPosition",
          alumniData.currentPosition ? alumniData.currentPosition.trim() : "",
        );
        formData.append(
          "company",
          alumniData.company ? alumniData.company.trim() : "",
        );
        formData.append(
          "location",
          alumniData.location ? alumniData.location.trim() : "",
        );
        formData.append(
          "contactNumber",
          alumniData.contactNumber ? alumniData.contactNumber.trim() : "",
        );
        formData.append("level", alumniData.level || "");
        formData.append(
          "batch",
          alumniData.batch ? String(alumniData.batch) : "",
        );
        formData.append(
          "educationHistory",
          JSON.stringify(alumniData.educationHistory || []),
        );
        formData.append(
          "skills",
          Array.isArray(alumniData.skills)
            ? alumniData.skills.join(", ")
            : alumniData.skills || "",
        );
        formData.append("profileImage", alumniData.profileImageFile);

        requestConfig = {
          method: "POST",
          body: formData,
        };
      } else {
        // Use JSON for regular data
        const profileImage =
          alumniData.profileImage &&
          alumniData.profileImage.includes("/uploads/")
            ? alumniData.profileImage
            : null;

        const backendData = {
          email: alumniData.email || "",
          firstName: alumniData.firstName ? alumniData.firstName.trim() : "",
          middleName: alumniData.middleName ? alumniData.middleName.trim() : "",
          lastName: alumniData.lastName ? alumniData.lastName.trim() : "",
          graduationYear: alumniData.graduationYear
            ? parseInt(alumniData.graduationYear)
            : null,
          dateOfBirth: alumniData.dateOfBirth || null,
          level: alumniData.level || null,
          batch: alumniData.batch ? parseInt(alumniData.batch) : null,
          educationHistory: this.normalizeEducationHistory(
            alumniData.educationHistory || [],
          ),
          course: alumniData.course ? alumniData.course.trim() : "",
          currentPosition: alumniData.currentPosition
            ? alumniData.currentPosition.trim()
            : "",
          company: alumniData.company ? alumniData.company.trim() : "",
          location: alumniData.location ? alumniData.location.trim() : "",
          contactNumber: alumniData.contactNumber
            ? alumniData.contactNumber.trim()
            : "",
          skills: Array.isArray(alumniData.skills)
            ? alumniData.skills.join(", ")
            : alumniData.skills || "",
          profileImage: profileImage,
        };

        console.log("Sending data to backend:", backendData);

        requestConfig = {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(backendData),
        };
      }

      const response = await fetch(API_URL, requestConfig);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to add alumni");
      }

      const newAlumni = await response.json();
      console.log("Added alumni response from backend:", newAlumni);

      // Transform the response to match frontend format
      let profileImageUrl =
        newAlumni.profile_image || newAlumni.profileImage || "";
      if (profileImageUrl && !profileImageUrl.startsWith("http")) {
        profileImageUrl = `${IMAGE_BASE_URL}${profileImageUrl}`;
      }
      const educationHistory = this.normalizeEducationHistory(
        newAlumni.educationHistory || newAlumni.education_history,
      );
      const firstName = newAlumni.first_name || newAlumni.firstName || "";
      const lastName = newAlumni.last_name || newAlumni.lastName || "";

      return {
        id: newAlumni.id.toString(),
        firstName,
        middleName: newAlumni.middle_name || newAlumni.middleName || "",
        lastName,
        graduationYear:
          newAlumni.graduation_year || newAlumni.graduationYear || "",
        dateOfBirth: this.formatDateForInput(
          newAlumni.date_of_birth || newAlumni.dateOfBirth,
        ),
        date_of_birth: newAlumni.date_of_birth || newAlumni.dateOfBirth || null,
        level: newAlumni.level || "",
        batch: newAlumni.batch || "",
        educationHistory,
        course: newAlumni.course || "",
        currentPosition:
          newAlumni.current_position || newAlumni.currentPosition || "",
        company: newAlumni.company || "",
        location: newAlumni.location || "",
        contactNumber: newAlumni.contact_number || "",
        email: newAlumni.user?.email || alumniData.email || "",
        skills: newAlumni.skills
          ? typeof newAlumni.skills === "string"
            ? newAlumni.skills.split(",").map((s) => s.trim())
            : newAlumni.skills
          : [],
        profileImage:
          profileImageUrl || this.getAvatarFallbackUrl(firstName, lastName),
        isPublic: newAlumni.is_public,
        isVerified: newAlumni.is_verified,
      };
    } catch (error) {
      console.error("Error adding alumni:", error);
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
          method: "PUT",
          body: alumniData,
        };
      } else {
        // Handle JSON data (used when updating without file upload)
        const profileImage =
          alumniData.profileImage &&
          alumniData.profileImage.includes("/uploads/")
            ? alumniData.profileImage
            : undefined;

        const backendData = {
          firstName: alumniData.firstName
            ? alumniData.firstName.trim()
            : undefined,
          middleName: alumniData.middleName
            ? alumniData.middleName.trim()
            : undefined,
          lastName: alumniData.lastName
            ? alumniData.lastName.trim()
            : undefined,
          graduationYear: alumniData.graduationYear
            ? parseInt(alumniData.graduationYear)
            : undefined,
          dateOfBirth:
            alumniData.dateOfBirth !== undefined
              ? alumniData.dateOfBirth
              : undefined,
          level: alumniData.level !== undefined ? alumniData.level : undefined,
          batch:
            alumniData.batch !== undefined
              ? parseInt(alumniData.batch)
              : undefined,
          educationHistory: this.normalizeEducationHistory(
            alumniData.educationHistory || [],
          ),
          course: alumniData.course ? alumniData.course.trim() : undefined,
          currentPosition: alumniData.currentPosition
            ? alumniData.currentPosition.trim()
            : undefined,
          company: alumniData.company ? alumniData.company.trim() : undefined,
          location: alumniData.location
            ? alumniData.location.trim()
            : undefined,
          email: alumniData.email ? alumniData.email.trim() : undefined,
          contactNumber: alumniData.contactNumber
            ? alumniData.contactNumber.trim()
            : undefined,
          skills: Array.isArray(alumniData.skills)
            ? alumniData.skills.join(", ")
            : alumniData.skills || undefined,
          profileImage: profileImage,
        };

        // Remove undefined values
        Object.keys(backendData).forEach(
          (key) => backendData[key] === undefined && delete backendData[key],
        );

        console.log("Updating alumni with data:", backendData);

        requestConfig = {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(backendData),
        };
      }

      const token = localStorage.getItem("token");
      requestConfig.headers = {
        ...(requestConfig.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const response = await fetch(`${API_URL}/${id}`, requestConfig);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update alumni");
      }

      const updatedAlumni = await response.json();
      console.log("Alumni updated successfully:", id);

      // Transform the response to match frontend format
      let profileImageUrl =
        updatedAlumni.profile_image || updatedAlumni.profileImage || "";
      if (profileImageUrl && !profileImageUrl.startsWith("http")) {
        profileImageUrl = `${IMAGE_BASE_URL}${profileImageUrl}`;
      }
      const educationHistory = this.normalizeEducationHistory(
        updatedAlumni.educationHistory || updatedAlumni.education_history,
      );
      const firstName =
        updatedAlumni.first_name || updatedAlumni.firstName || "";
      const lastName = updatedAlumni.last_name || updatedAlumni.lastName || "";

      return {
        id: updatedAlumni.id.toString(),
        firstName,
        lastName,
        middleName: updatedAlumni.middle_name || updatedAlumni.middleName || "",
        graduationYear:
          updatedAlumni.graduation_year || updatedAlumni.graduationYear || "",
        dateOfBirth: this.formatDateForInput(
          updatedAlumni.date_of_birth || updatedAlumni.dateOfBirth,
        ),
        date_of_birth:
          updatedAlumni.date_of_birth || updatedAlumni.dateOfBirth || null,
        level: updatedAlumni.level || "",
        batch: updatedAlumni.batch || "",
        educationHistory,
        course: updatedAlumni.course || "",
        currentPosition:
          updatedAlumni.current_position || updatedAlumni.currentPosition || "",
        company: updatedAlumni.company || "",
        location: updatedAlumni.location || "",
        contactNumber:
          updatedAlumni.contact_number || updatedAlumni.contactNumber || "",
        email: updatedAlumni.email || updatedAlumni.user?.email || "",
        skills: updatedAlumni.skills || "",
        profileImage:
          profileImageUrl || this.getAvatarFallbackUrl(firstName, lastName),
        bio: updatedAlumni.bio || "",
        isPublic:
          updatedAlumni.is_public !== undefined
            ? updatedAlumni.is_public
            : true,
        isVerified:
          updatedAlumni.is_verified !== undefined
            ? updatedAlumni.is_verified
            : false,
      };
    } catch (error) {
      console.error("Error updating alumni:", error);
      throw error;
    }
  }

  // Delete alumni
  async deleteAlumni(id) {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete alumni");
      }

      console.log("Alumni deleted successfully:", id);
      return true;
    } catch (error) {
      console.error("Error deleting alumni:", error);
      throw error;
    }
  }

  // Get alumni by ID
  async getAlumniById(id) {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/${id}`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
        },
      });
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      const alumnus = await response.json();
      return this.normalizeAlumniRecord(alumnus);
    } catch (error) {
      console.error("Error getting alumni by ID:", error);
      return null;
    }
  }

  // Get today birthday alumni
  async getBirthdayAlumniToday() {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/birthdays/today`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch birthday alumni");
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching birthday alumni:", error);
      return { birthdays: [], isYourBirthday: false };
    }
  }

  // Report an alumni as deceased
  async reportDeceased(id, reportData) {
    try {
      const formData = new FormData();
      if (reportData.reason)
        formData.append("reason", reportData.reason.trim());
      if (reportData.evidenceLink)
        formData.append("evidenceLink", reportData.evidenceLink.trim());
      if (reportData.evidenceFile)
        formData.append("evidence", reportData.evidenceFile);

      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/${id}/report-deceased`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to submit deceased report");
      }

      return await response.json();
    } catch (error) {
      console.error("Error reporting deceased alumni:", error);
      throw error;
    }
  }

  // Search alumni
  async searchAlumni(searchTerm, filters = {}) {
    try {
      const allAlumni = await this.getAllAlumni();

      return allAlumni.filter((alumnus) => {
        const matchesSearch =
          searchTerm === "" ||
          alumnus.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          alumnus.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          alumnus.course.toLowerCase().includes(searchTerm.toLowerCase()) ||
          alumnus.currentPosition
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          alumnus.company.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesCourse =
          !filters.course || alumnus.course === filters.course;
        const matchesYear =
          !filters.year || alumnus.graduationYear.toString() === filters.year;

        return matchesSearch && matchesCourse && matchesYear;
      });
    } catch (error) {
      console.error("Error searching alumni:", error);
      return [];
    }
  }

  // Clear all data (for testing purposes)
  clearAllData() {
    localStorage.removeItem(this.storageKey);
    this.memoryStorage = null;
    console.log("All alumni data cleared");
  }

  // Clear localStorage and move to memory storage
  clearLocalStorageAndUseMemory() {
    try {
      const currentData = this.safeGetItem(this.storageKey);
      localStorage.removeItem(this.storageKey);
      this.memoryStorage = currentData;
      console.log("Moved data to memory storage due to localStorage quota");
      return true;
    } catch (error) {
      console.error("Error clearing localStorage:", error);
      return false;
    }
  }
}

// Export singleton instance
export default new AlumniService();

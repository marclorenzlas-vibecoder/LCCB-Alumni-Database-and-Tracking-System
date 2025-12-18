const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// =====================================================
// ALUMNI OPERATIONS
// =====================================================

async function createAlumniProfile(data) {
  try {
    console.log('Creating alumni profile with data:', data);
    
    // Create a new user first
    const user = await prisma.user.create({
      data: {
        email: data.email,
        role: 'ALUMNI',
        password: null // Since we're not handling authentication here
      }
    });

    // Create the alumni profile
    const alumni = await prisma.alumniProfile.create({
      data: {
        userId: user.id,
        firstName: data.firstName,
        lastName: data.lastName,
        middleName: data.middleName || '',
        graduationYear: data.graduationYear,
        course: data.course,
        jobTitle: data.jobTitle || '',
        company: data.company || '',
        address: data.address || '',
        skills: data.skills || '[]',
        isPublic: true,
        isVerified: false
      },
      include: {
        user: {
          select: {
            email: true,
            role: true,
            oauth_picture: true
          }
        },
        socialLinks: true
      }
    });

    return {
      id: alumni.id,
      user_id: alumni.userId,
      first_name: alumni.firstName,
      last_name: alumni.lastName,
      middle_name: alumni.middleName || '',
      graduation_year: alumni.graduationYear,
      course: alumni.course,
      current_position: alumni.jobTitle || '',
      company: alumni.company || '',
      location: alumni.address || '',
      email: alumni.user.email,
      linkedin: alumni.socialLinks.find(link => link.platform === 'LinkedIn')?.url || '',
      skills: JSON.parse(alumni.skills || '[]'),
      profile_image: alumni.user.oauth_picture || '',
      bio: alumni.bio || '',
      is_public: alumni.isPublic,
      is_verified: alumni.isVerified
    };
  } catch (error) {
    console.error('Error creating alumni profile:', error);
    throw error;
  }
}

async function getAllAlumni() {
  try {
    const alumni = await prisma.alumniProfile.findMany({
      include: {
        user: {
          select: {
            email: true,
            role: true,
            oauth_picture: true
          }
        },
        socialLinks: true,
        careerHistory: {
          where: {
            isCurrent: true
          }
        }
      },
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' }
      ]
    });

    return alumni.map(alumnus => {
      const currentJob = alumnus.careerHistory[0];
      const linkedinProfile = alumnus.socialLinks.find(link => link.platform === 'LinkedIn');

      return {
        id: alumnus.id,
        user_id: alumnus.userId,
        first_name: alumnus.firstName,
        last_name: alumnus.lastName,
        middle_name: alumnus.middleName || '',
        graduation_year: alumnus.graduationYear,
        course: alumnus.course,
        current_position: currentJob?.jobTitle || alumnus.jobTitle || '',
        company: currentJob?.company || alumnus.company || '',
        location: alumnus.address || '',
        email: alumnus.user.email,
        linkedin: linkedinProfile?.url || '',
        skills: JSON.parse(alumnus.skills || '[]'),
        profile_image: alumnus.user.oauth_picture || '',
        bio: alumnus.bio || '',
        is_public: true,
        is_verified: alumnus.isVerified
      };
    });
  } catch (error) {
    console.error('Error fetching all alumni:', error);
    throw error;
  }
}

async function getAlumniById(id) {
  try {
    const alumnus = await prisma.alumniProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            email: true,
            role: true,
            oauth_picture: true
          }
        },
        socialLinks: true,
        careerHistory: {
          where: {
            isCurrent: true
          }
        }
      }
    });

    if (!alumnus) return null;

    const currentJob = alumnus.careerHistory[0];
    const linkedinProfile = alumnus.socialLinks.find(link => link.platform === 'LinkedIn');

    return {
      id: alumnus.id,
      user_id: alumnus.userId,
      first_name: alumnus.firstName,
      last_name: alumnus.lastName,
      middle_name: alumnus.middleName || '',
      graduation_year: alumnus.graduationYear,
      course: alumnus.course,
      current_position: currentJob?.jobTitle || alumnus.jobTitle || '',
      company: currentJob?.company || alumnus.company || '',
      location: alumnus.address || '',
      email: alumnus.user.email,
      linkedin: linkedinProfile?.url || '',
      skills: [], // We'll need to add a skills field to the schema if needed
      profile_image: alumnus.user.oauth_picture || '',
      bio: '', // We'll need to add a bio field if needed
      is_public: true,
      is_verified: alumnus.isVerified
    };
  } catch (error) {
    console.error('Error fetching alumni by ID:', error);
    throw error;
  }
}

async function getAlumniByUserId(userId) {
  try {
    const [rows] = await pool.execute(`
      SELECT a.*, u.username, u.email as user_email
      FROM alumni a
      JOIN users u ON a.user_id = u.id
      WHERE a.user_id = ? AND u.is_active = 1
    `, [userId]);
    const alumni = rows[0];
    if (!alumni) return null;
    return {
      ...alumni,
      skills: alumni.skills ? JSON.parse(alumni.skills) : []
    };
  } catch (error) {
    console.error('Error fetching alumni by user ID:', error);
    throw error;
  }
}

async function createAlumniProfile(alumniData) {
  try {
    const {
      user_id, first_name, last_name, graduation_year, course,
      current_position, company, location, email, linkedin,
      skills, profile_image, bio, is_public, is_verified
    } = alumniData;

    const [result] = await pool.execute(`
      INSERT INTO alumni (
        user_id, first_name, last_name, graduation_year, course,
        current_position, company, location, email, linkedin,
        skills, profile_image, bio, is_public, is_verified
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      user_id, first_name, last_name, graduation_year, course,
      current_position, company, location, email, linkedin,
      skills ? JSON.stringify(skills) : null, profile_image, bio,
      is_public !== false, is_verified || false
    ]);

    const insertId = result.insertId;
    return await getAlumniById(insertId);
  } catch (error) {
    console.error('Error creating alumni profile:', error);
    throw error;
  }
}

async function updateAlumniProfile(id, alumniData) {
  try {
    const updateFields = [];
    const values = [];

    Object.entries(alumniData).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'user_id') {
        if (key === 'skills') {
          updateFields.push(`${key} = ?`);
          values.push(JSON.stringify(value));
        } else {
          updateFields.push(`${key} = ?`);
          values.push(value);
        }
      }
    });

    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id);

    await pool.execute(`
      UPDATE alumni 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, values);

    return await getAlumniById(id);
  } catch (error) {
    console.error('Error updating alumni profile:', error);
    throw error;
  }
}

async function deleteAlumniProfile(id) {
  try {
    await pool.execute('DELETE FROM alumni WHERE id = ?', [id]);
    return true;
  } catch (error) {
    console.error('Error deleting alumni profile:', error);
    throw error;
  }
}

async function searchAlumni(searchTerm, filters = {}) {
  try {
    let query = `
      SELECT a.*, u.username, u.email as user_email
      FROM alumni a
      JOIN users u ON a.user_id = u.id
      WHERE u.is_active = 1 AND a.is_public = 1
    `;
    const values = [];

    if (searchTerm) {
      query += ` AND (
        a.first_name LIKE ? OR 
        a.last_name LIKE ? OR 
        a.course LIKE ? OR 
        a.current_position LIKE ? OR 
        a.company LIKE ?
      )`;
      const searchPattern = `%${searchTerm}%`;
      values.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
    }

    if (filters.graduation_year) {
      query += ` AND a.graduation_year = ?`;
      values.push(filters.graduation_year);
    }

    if (filters.course) {
      query += ` AND a.course LIKE ?`;
      values.push(`%${filters.course}%`);
    }

    query += ` ORDER BY a.last_name, a.first_name`;

    const [rows] = await pool.execute(query, values);
    return rows.map(alumnus => ({
      ...alumnus,
      skills: alumnus.skills ? JSON.parse(alumnus.skills) : []
    }));
  } catch (error) {
    console.error('Error searching alumni:', error);
    throw error;
  }
}

// =====================================================
// EVENTS OPERATIONS
// =====================================================

async function getAllEvents() {
  try {
    const [rows] = await pool.execute(`
      SELECT * FROM events 
      ORDER BY created_at DESC
    `);
    return rows.map(event => ({
      ...event,
      tags: event.tags ? JSON.parse(event.tags) : []
    }));
  } catch (error) {
    console.error('Error fetching events:', error);
    throw error;
  }
}

async function getEventById(id) {
  try {
    const [rows] = await pool.execute('SELECT * FROM events WHERE id = ?', [id]);
    const event = rows[0];
    if (!event) return null;
    return {
      ...event,
      tags: event.tags ? JSON.parse(event.tags) : []
    };
  } catch (error) {
    console.error('Error fetching event by ID:', error);
    throw error;
  }
}

async function createEvent(eventData) {
  try {
    const {
      name, date, time, location, description, type,
      attendees, max_attendees, price, image, status,
      organizer, tags
    } = eventData;

    const [result] = await pool.execute(`
      INSERT INTO events (
        name, date, time, location, description, type,
        attendees, max_attendees, price, image, status,
        organizer, tags
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      name, date, time, location, description, type,
      attendees || 0, max_attendees, price, image, status || 'upcoming',
      organizer, tags ? JSON.stringify(tags) : null
    ]);

    const insertId = result.insertId;
    return await getEventById(insertId);
  } catch (error) {
    console.error('Error creating event:', error);
    throw error;
  }
}

async function updateEvent(id, eventData) {
  try {
    const updateFields = [];
    const values = [];

    Object.entries(eventData).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id') {
        if (key === 'tags') {
          updateFields.push(`${key} = ?`);
          values.push(JSON.stringify(value));
        } else {
          updateFields.push(`${key} = ?`);
          values.push(value);
        }
      }
    });

    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id);

    await pool.execute(`
      UPDATE events 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, values);

    return await getEventById(id);
  } catch (error) {
    console.error('Error updating event:', error);
    throw error;
  }
}

// =====================================================
// SUCCESS STORIES OPERATIONS
// =====================================================

async function getAllSuccessStories() {
  try {
    const [rows] = await pool.execute(`
      SELECT * FROM success_stories 
      ORDER BY is_featured DESC, created_at DESC
    `);
    return rows;
  } catch (error) {
    console.error('Error fetching success stories:', error);
    throw error;
  }
}

// =====================================================
// STATISTICS OPERATIONS
// =====================================================

async function getAllStatistics() {
  try {
    const [rows] = await pool.execute(`
      SELECT * FROM statistics 
      WHERE is_active = 1
      ORDER BY category, label
    `);
    return rows;
  } catch (error) {
    console.error('Error fetching statistics:', error);
    throw error;
  }
}

// =====================================================
// GENERAL STATISTICS
// =====================================================

async function getAlumniStats() {
  try {
    const [rows] = await pool.execute(`
      SELECT 
        COUNT(*) as total_alumni,
        COUNT(CASE WHEN a.is_verified = 1 THEN 1 END) as verified_count,
        COUNT(DISTINCT a.graduation_year) as graduation_years,
        COUNT(DISTINCT a.course) as courses
      FROM alumni a
      JOIN users u ON a.user_id = u.id
      WHERE u.is_active = 1 AND a.is_public = 1
    `);
    return rows[0];
  } catch (error) {
    console.error('Error fetching alumni statistics:', error);
    throw error;
  }
}

module.exports = {
  getAllAlumni,
  getAlumniById,
  getAlumniByUserId,
  createAlumniProfile,
  updateAlumniProfile,
  deleteAlumniProfile,
  searchAlumni,
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  getAllSuccessStories,
  getAllStatistics,
  getAlumniStats
};



const express = require("express");
const { PrismaClient } = require("@prisma/client");
const upload = require("../middleware/upload");
const authMiddleware = require("../middleware/auth").authMiddleware;
const path = require("path");
const { broadcastUpdate } = require("../services/realtimeService");
const { buildChangeSet, recordActivity } = require("../services/activityLogService");
const {
  normalizeLevel,
  parseEducationHistory,
  getEducationHistoryWithFallback,
  getEducationHistoryByAlumniIds,
  replaceEducationHistory,
} = require("../utils/educationHistory");
const prisma = new PrismaClient();
const router = express.Router();

// ---------------------------------------------------------------------------
// Soft auth helper — tries to decode the JWT but never rejects the request.
// Populates req.user if the token is valid, otherwise leaves it as null.
// Used so that public-ish endpoints can still tailor their response by role.
// ---------------------------------------------------------------------------
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

const softAuth = (req, res, next) => {
  try {
    const authHeader =
      req.headers.authorization || req.headers["x-access-token"] || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : authHeader.trim();
    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } else {
      req.user = null;
    }
  } catch {
    req.user = null;
  }
  next();
};

const PRIVACY_FIELD_MAP = [
  {
    bodyKeys: ["isStudentIdPublic", "is_student_id_public"],
    dbKey: "is_student_id_public",
  },
  {
    bodyKeys: ["isDateOfBirthPublic", "is_date_of_birth_public"],
    dbKey: "is_date_of_birth_public",
  },
  {
    bodyKeys: ["isCoursePublic", "is_course_public"],
    dbKey: "is_course_public",
  },
  {
    bodyKeys: ["isGraduationYearPublic", "is_graduation_year_public"],
    dbKey: "is_graduation_year_public",
  },
  {
    bodyKeys: ["isEducationHistoryPublic", "is_education_history_public"],
    dbKey: "is_education_history_public",
  },
  {
    bodyKeys: ["isEmailPublic", "is_email_public"],
    dbKey: "is_email_public",
  },
  {
    bodyKeys: ["isPhonePublic", "is_phone_public"],
    dbKey: "is_phone_public",
  },
  {
    bodyKeys: [
      "isPositionPublic",
      "is_position_public",
      "isEmploymentPublic",
      "is_employment_public",
    ],
    dbKey: "is_position_public",
  },
  {
    bodyKeys: ["isCompanyPublic", "is_company_public"],
    dbKey: "is_company_public",
  },
  {
    bodyKeys: ["isLocationPublic", "is_location_public"],
    dbKey: "is_location_public",
  },
  {
    bodyKeys: ["isSocialLinksPublic", "is_social_links_public"],
    dbKey: "is_social_links_public",
  },
  {
    bodyKeys: ["isSkillsPublic", "is_skills_public"],
    dbKey: "is_skills_public",
  },
];

const parseBooleanFlag = (value) => {
  if (value === true || value === 1 || value === "1") return true;
  if (value === false || value === 0 || value === "0") return false;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "yes", "public"].includes(normalized)) return true;
    if (["false", "no", "private"].includes(normalized)) return false;
  }
  return undefined;
};

const appendPrivacyUpdates = (body, target) => {
  PRIVACY_FIELD_MAP.forEach(({ bodyKeys, dbKey }) => {
    const foundKey = bodyKeys.find((key) => body[key] !== undefined);
    if (!foundKey) return;
    const parsed = parseBooleanFlag(body[foundKey]);
    if (parsed !== undefined) target[dbKey] = parsed;
  });

  if (
    target.is_position_public !== undefined &&
    (body.isEmploymentPublic !== undefined || body.is_employment_public !== undefined)
  ) {
    target.is_employment_public = target.is_position_public;
  }
};

const hasPrivacyInput = (body) =>
  PRIVACY_FIELD_MAP.some(({ bodyKeys }) =>
    bodyKeys.some((key) => body[key] !== undefined),
  );

const isPublicFlag = (entry, key) => entry?.[key] !== false;

const isStaffViewer = (viewer) => {
  const roleUpper = String(viewer?.role || "").toUpperCase();
  return roleUpper === "TEACHER" || roleUpper === "ADMIN";
};

const canViewPrivateAlumniFields = (viewer, alumni) => {
  if (!viewer || !alumni) return false;
  if (isStaffViewer(viewer)) return true;
  const viewerId = Number(viewer.id);
  if (viewerId && Number(alumni.user_id) === viewerId) return true;
  if (viewer.alumniId && Number(viewer.alumniId) === Number(alumni.id)) return true;
  if (viewer.alumni_id && Number(viewer.alumni_id) === Number(alumni.id)) return true;
  const viewerEmail = String(viewer.email || "").toLowerCase();
  const alumniEmail = String(alumni.email || alumni.user?.email || "").toLowerCase();
  return Boolean(viewerEmail && alumniEmail && viewerEmail === alumniEmail);
};

const sanitizeAlumniForViewer = (entry, viewer) => {
  if (canViewPrivateAlumniFields(viewer, entry)) return entry;

  const sanitized = {
    ...entry,
    user: entry.user ? { ...entry.user } : entry.user,
  };

  if (!isPublicFlag(entry, "is_email_public")) {
    sanitized.email = null;
    if (sanitized.user) sanitized.user.email = null;
  }
  if (!isPublicFlag(entry, "is_student_id_public")) {
    sanitized.student_id = null;
    sanitized.studentId = null;
  }
  if (!isPublicFlag(entry, "is_date_of_birth_public")) {
    sanitized.date_of_birth = null;
    sanitized.dateOfBirth = null;
  }
  if (!isPublicFlag(entry, "is_course_public")) {
    sanitized.course = null;
  }
  if (!isPublicFlag(entry, "is_graduation_year_public")) {
    sanitized.graduation_year = null;
    sanitized.graduationYear = null;
  }
  if (!isPublicFlag(entry, "is_education_history_public")) {
    sanitized.level = null;
    sanitized.batch = null;
    sanitized.education_history = [];
    sanitized.educationHistory = [];
  }
  if (!isPublicFlag(entry, "is_phone_public")) {
    sanitized.contact_number = null;
    sanitized.contactNumber = null;
  }
  if (!isPublicFlag(entry, "is_position_public") || !isPublicFlag(entry, "is_employment_public")) {
    sanitized.current_position = null;
    sanitized.currentPosition = null;
  }
  if (!isPublicFlag(entry, "is_company_public")) {
    sanitized.company = null;
  }
  if (!isPublicFlag(entry, "is_location_public")) {
    sanitized.location = null;
  }
  if (!isPublicFlag(entry, "is_social_links_public")) {
    sanitized.social_link = [];
    sanitized.socialLinks = [];
  }
  if (!isPublicFlag(entry, "is_skills_public")) {
    sanitized.skills = null;
  }

  return sanitized;
};

// Get all alumni.
// Teachers and admins receive the full list (including private profiles so they
// can manage the directory). Regular alumni and unauthenticated requests only
// receive profiles where is_public is true or null (null is treated as public
// to preserve backward-compatibility with records created before the field existed).
router.get("/", softAuth, async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.set('Pragma', 'no-cache');
    const isStaff = isStaffViewer(req.user);

    const where = {
      NOT: {
        OR: [
          { email: { endsWith: "@lccbonline.com" } },
          { user: { is: { email: { endsWith: "@lccbonline.com" } } } },
        ],
      },
      // Non-staff callers only see public profiles.
      // is_public: null is treated as public (default when field was not yet set).
      ...(!isStaff && {
        OR: [{ is_public: true }, { is_public: null }],
      }),
    };

    const alumni = await prisma.alumni.findMany({
      where,
      include: {
        user: {
          select: {
            email: true,
            username: true,
          },
        },
        social_link: true,
      },
    });

    const historyByAlumniId = await getEducationHistoryByAlumniIds(
      prisma,
      alumni.map((entry) => entry.id),
    );

    const payload = alumni.map((entry) => {
      const canViewPrivate = canViewPrivateAlumniFields(req.user, entry);
      const visibleEntry = sanitizeAlumniForViewer(entry, req.user);
      const history = getEducationHistoryWithFallback(
        visibleEntry,
        canViewPrivate || isPublicFlag(visibleEntry, "is_education_history_public")
          ? historyByAlumniId.get(entry.id) || []
          : [],
      );
      return {
        ...visibleEntry,
        education_history: history,
        educationHistory: history,
      };
    });

    res.json(payload);
  } catch (error) {
    console.error("Error fetching alumni:", error);
    res.status(500).json({ error: "Failed to fetch alumni" });
  }
});

// Helper to run multer for profile images and surface readable errors
const runProfileUpload = (req, res, next) => {
  upload.single("profileImage")(req, res, (err) => {
    if (err) {
      const isSize = err.code === "LIMIT_FILE_SIZE";
      return res.status(400).json({
        error: isSize
          ? "Profile image is too large. Max size is 15MB."
          : err.message || "Invalid image upload",
      });
    }
    next();
  });
};

// Create new alumni
router.post("/", runProfileUpload, async (req, res) => {
  try {
    const {
      email,
      firstName,
      middleName,
      lastName,
      graduationYear,
      course,
      currentPosition,
      company,
      skills,
      profileImage,
      contactNumber,
      level,
      batch,
      dateOfBirth,
      date_of_birth,
    } = req.body;
    const parsedEducationHistory = parseEducationHistory(
      req.body.educationHistory ?? req.body.education_history,
    );
    const primaryEducation =
      parsedEducationHistory.length > 0
        ? parsedEducationHistory[parsedEducationHistory.length - 1]
        : null;

    // Be tolerant to casing differences coming from the client
    const location = (req.body.location ?? req.body.Location) || null;

    // Validate required fields
    if (!firstName || !lastName || !course) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["firstName", "lastName", "course"],
      });
    }

    // Only check for existing user if email is provided
    let user = null;
    if (email && email.trim()) {
      // Only look for existing users, don't create new ones
      user = await prisma.user.findUnique({ where: { email: email.trim() } });

      if (user) {
        // Check if user already has an alumni profile
        const existingAlumni = await prisma.alumni.findUnique({
          where: { user_id: user.id },
        });
        if (existingAlumni) {
          return res.status(400).json({
            error: "An alumni profile already exists for this email address",
          });
        }
      }
    }

    const birthDateValue =
      dateOfBirth !== undefined ? dateOfBirth : date_of_birth;
    const parsedDateOfBirth = birthDateValue ? new Date(birthDateValue) : null;
    const alumniData = {
      first_name: firstName.trim(),
      middle_name: middleName ? middleName.trim() : null,
      last_name: lastName.trim(),
      email: email ? email.trim() : null,
      contact_number: contactNumber ? String(contactNumber).trim() : null,
      level: normalizeLevel(level) || primaryEducation?.level || null,
      batch: batch ? parseInt(batch, 10) : (primaryEducation?.batch ?? null),
      graduation_year: graduationYear
        ? parseInt(graduationYear, 10)
        : (primaryEducation?.graduationYear ?? null),
      course: course.trim(),
      current_position: currentPosition ? currentPosition.trim() : null,
      company: company ? company.trim() : null,
      location: location ? String(location).trim() : null,
      skills: Array.isArray(skills)
        ? skills.join(", ")
        : skills
          ? String(skills)
          : null,
      date_of_birth:
        parsedDateOfBirth instanceof Date &&
        !Number.isNaN(parsedDateOfBirth.getTime())
          ? parsedDateOfBirth
          : null,
      profile_image: req.file
        ? `/uploads/profiles/${req.file.filename}`
        : profileImage || null,
    };
    appendPrivacyUpdates(req.body, alumniData);

    // Only add user_id if we found an existing user
    if (user) {
      alumniData.user_id = user.id;
    }

    let newAlumni;
    try {
      // Create alumni record
      newAlumni = await prisma.alumni.create({
        data: alumniData,
      });
    } catch (err) {
      // Fallback if the DB/schema doesn't yet have contact_number
      const msg = String(err?.message || "");
      const badContact =
        msg.includes("Unknown arg `contact_number`") ||
        msg.includes("Unknown column") ||
        msg.includes("contact_number");
      const badLevel =
        msg.includes("Unknown arg `level`") ||
        msg.includes("Unknown column") ||
        msg.includes("level");
      const badBatch =
        msg.includes("Unknown arg `batch`") ||
        msg.includes("Unknown column") ||
        msg.includes("batch");

      const badPrivacy = PRIVACY_FIELD_MAP.some(({ dbKey }) =>
        msg.includes(dbKey) || msg.includes(`Unknown arg \`${dbKey}\``),
      );

      if (badContact || badLevel || badBatch || badPrivacy) {
        const {
          contact_number,
          level,
          batch,
          ...rest
        } = alumniData;
        PRIVACY_FIELD_MAP.forEach(({ dbKey }) => delete rest[dbKey]);
        delete rest.is_employment_public;
        newAlumni = await prisma.alumni.create({ data: rest });
      } else {
        throw err;
      }
    }

    if (parsedEducationHistory.length > 0) {
      await replaceEducationHistory(
        prisma,
        newAlumni.id,
        parsedEducationHistory,
      );
    }

    const historyByAlumniId = await getEducationHistoryByAlumniIds(prisma, [
      newAlumni.id,
    ]);
    const history = historyByAlumniId.get(newAlumni.id) || [];

    broadcastUpdate("alumni.created", {
      alumniId: newAlumni.id,
      userId: newAlumni.user_id || null,
    });

    res.status(201).json({
      ...newAlumni,
      education_history: history,
      educationHistory: history,
    });
  } catch (error) {
    console.error("Error creating alumni:", error);
    res.status(500).json({
      error: "Failed to create alumni record",
      details: error.message,
    });
  }
});

// Get today's birthday alumni
router.get("/birthdays/today", authMiddleware, async (req, res) => {
  try {
    const today = new Date();
    const currentMonth = today.getUTCMonth() + 1;
    const currentDay = today.getUTCDate();

    const birthdays = await prisma.$queryRaw`
      SELECT a.id, a.first_name, a.last_name, a.profile_image, a.date_of_birth, a.email, u.email as user_email
      FROM alumni a
      LEFT JOIN user u ON a.user_id = u.id
      WHERE a.date_of_birth IS NOT NULL
        AND (a.status IS NULL OR a.status != 'DECEASED')
        AND MONTH(a.date_of_birth) = ${currentMonth}
        AND DAY(a.date_of_birth) = ${currentDay}
    `;

    const birthdayList = birthdays.map((entry) => ({
      id: entry.id,
      firstName: entry.first_name,
      lastName: entry.last_name,
      profileImage: entry.profile_image,
      dateOfBirth: entry.date_of_birth,
      email: entry.email || entry.user_email || null,
    }));

    const currentAlumni = await prisma.alumni.findFirst({
      where: {
        OR: [{ user_id: req.user.id }, { email: req.user.email }],
      },
    });
    const isYourBirthday =
      currentAlumni && currentAlumni.date_of_birth
        ? (() => {
            const dob = new Date(currentAlumni.date_of_birth);
            return (
              !Number.isNaN(dob.getTime()) &&
              dob.getUTCDate() === today.getUTCDate() &&
              dob.getUTCMonth() === today.getUTCMonth()
            );
          })()
        : false;

    res.json({
      birthdays: birthdayList,
      isYourBirthday,
    });
  } catch (error) {
    console.error("Error fetching today birthdays:", error);
    res.status(500).json({ error: "Failed to fetch birthday alumni" });
  }
});

// Get alumni by ID
router.get("/:id", softAuth, async (req, res) => {
  try {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate");
    res.set("Pragma", "no-cache");
    const { id } = req.params;
    const alumni = await prisma.alumni.findUnique({
      where: { id: Number(id) },
      include: {
        user: {
          select: {
            email: true,
            username: true,
          },
        },
        social_link: true,
      },
    });

    if (!alumni) {
      return res.status(404).json({ error: "Alumni not found" });
    }

    const historyByAlumniId = await getEducationHistoryByAlumniIds(prisma, [
      alumni.id,
    ]);
    const canViewPrivate = canViewPrivateAlumniFields(req.user, alumni);
    const visibleAlumni = sanitizeAlumniForViewer(alumni, req.user);
    const history = getEducationHistoryWithFallback(
      visibleAlumni,
      canViewPrivate || isPublicFlag(visibleAlumni, "is_education_history_public")
        ? historyByAlumniId.get(alumni.id) || []
        : [],
    );

    res.json({
      ...visibleAlumni,
      education_history: history,
      educationHistory: history,
    });
  } catch (error) {
    console.error("Error fetching alumni:", error);
    res.status(500).json({ error: "Failed to fetch alumni" });
  }
});

// Update alumni
router.put("/:id", authMiddleware, runProfileUpload, async (req, res) => {
  try {
    const { id } = req.params;
    const parsedEducationHistory = parseEducationHistory(
      req.body.educationHistory ?? req.body.education_history,
    );
    const hasEducationHistoryInput =
      req.body.educationHistory !== undefined ||
      req.body.education_history !== undefined;
    const primaryEducation =
      parsedEducationHistory.length > 0
        ? parsedEducationHistory[parsedEducationHistory.length - 1]
        : null;

    // Check if alumni exists
    const existingAlumni = await prisma.alumni.findUnique({
      where: { id: Number(id) },
      include: { user: true },
    });

    if (!existingAlumni) {
      return res.status(404).json({ error: "Alumni not found" });
    }

    // Build update data from request body
    const updateData = {};

    if (req.body.firstName && req.body.firstName.trim()) {
      updateData.first_name = req.body.firstName.trim();
    }
    if (req.body.middleName && req.body.middleName.trim()) {
      updateData.middle_name = req.body.middleName.trim();
    }
    if (req.body.lastName && req.body.lastName.trim()) {
      updateData.last_name = req.body.lastName.trim();
    }
    if (req.body.email !== undefined) {
      updateData.email =
        req.body.email && req.body.email.trim() ? req.body.email.trim() : null;
    }
    if (req.body.contactNumber !== undefined || req.body.phone !== undefined) {
      const num =
        req.body.contactNumber !== undefined
          ? req.body.contactNumber
          : req.body.phone;
      updateData.contact_number =
        num && String(num).trim() ? String(num).trim() : null;
    }
    if (req.body.graduationYear) {
      const year = parseInt(req.body.graduationYear);
      if (!isNaN(year)) {
        updateData.graduation_year = year;
      }
    }
    // Level normalization
    if (req.body.level !== undefined) {
      updateData.level = normalizeLevel(req.body.level);
    }
    if (req.body.batch !== undefined) {
      const b = parseInt(req.body.batch);
      updateData.batch = isNaN(b) ? null : b;
    }
    if (hasEducationHistoryInput) {
      if (req.body.level === undefined) {
        updateData.level = primaryEducation?.level ?? null;
      }
      if (req.body.batch === undefined) {
        updateData.batch = primaryEducation?.batch ?? null;
      }
      if (
        req.body.graduationYear === undefined &&
        req.body.graduation_year === undefined
      ) {
        updateData.graduation_year = primaryEducation?.graduationYear ?? null;
      }
    }
    if (req.body.course && req.body.course.trim()) {
      updateData.course = req.body.course.trim();
    }
    if (req.body.currentPosition !== undefined) {
      updateData.current_position =
        req.body.currentPosition && req.body.currentPosition.trim()
          ? req.body.currentPosition.trim()
          : null;
    }
    if (req.body.company !== undefined) {
      updateData.company =
        req.body.company && req.body.company.trim()
          ? req.body.company.trim()
          : null;
    }
    const dobValue =
      req.body.dateOfBirth !== undefined
        ? req.body.dateOfBirth
        : req.body.date_of_birth;
    if (dobValue !== undefined) {
      const parsedDob = dobValue ? new Date(dobValue) : null;
      updateData.date_of_birth =
        parsedDob instanceof Date && !Number.isNaN(parsedDob.getTime())
          ? parsedDob
          : null;
    }
    const locationIncoming =
      req.body.location !== undefined ? req.body.location : req.body.Location;
    if (locationIncoming !== undefined) {
      updateData.location = locationIncoming
        ? String(locationIncoming).trim()
        : null;
    }
    if (req.body.skills !== undefined) {
      if (Array.isArray(req.body.skills)) {
        updateData.skills = req.body.skills.length
          ? req.body.skills.join(", ")
          : null;
      } else {
        updateData.skills = req.body.skills
          ? String(req.body.skills).trim()
          : null;
      }
    }
    if (req.body.isPublic !== undefined || req.body.is_public !== undefined) {
      const visibilityValue =
        req.body.isPublic !== undefined
          ? req.body.isPublic
          : req.body.is_public;
      updateData.is_public =
        visibilityValue === true ||
        visibilityValue === "true" ||
        visibilityValue === 1;
    }
    appendPrivacyUpdates(req.body, updateData);

    // Handle profile image upload
    if (req.file) {
      updateData.profile_image = `/uploads/profiles/${req.file.filename}`;
    } else if (
      req.body.profileImage &&
      req.body.profileImage.includes("/uploads/")
    ) {
      updateData.profile_image = req.body.profileImage;
    }

    // Log the update data for debugging
    console.log("Updating alumni ID:", id);
    console.log("Update data:", JSON.stringify(updateData, null, 2));
    console.log("Has file upload:", !!req.file);
    if (req.file) {
      console.log("File details:", {
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
      });
    }

    // Validate that we have at least some data to update
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        error: "No valid data provided for update",
      });
    }

    let updatedAlumni;
    try {
      // Update alumni record
      updatedAlumni = await prisma.alumni.update({
        where: { id: Number(id) },
        data: updateData,
        include: {
          user: {
            select: {
              email: true,
            },
          },
        },
      });
    } catch (err) {
      const msg = String(err?.message || "");
      const badContact =
        msg.includes("Unknown arg `contact_number`") ||
        msg.includes("Unknown column") ||
        msg.includes("contact_number");
      const badLevel =
        msg.includes("Unknown arg `level`") ||
        msg.includes("Unknown column") ||
        msg.includes("level");
      const badBatch =
        msg.includes("Unknown arg `batch`") ||
        msg.includes("Unknown column") ||
        msg.includes("batch");
      const badPrivacy = PRIVACY_FIELD_MAP.some(({ dbKey }) =>
        msg.includes(dbKey) || msg.includes(`Unknown arg \`${dbKey}\``),
      );
      if (badContact || badLevel || badBatch || badPrivacy) {
        const {
          contact_number,
          level,
          batch,
          ...rest
        } = updateData;
        PRIVACY_FIELD_MAP.forEach(({ dbKey }) => delete rest[dbKey]);
        delete rest.is_employment_public;
        updatedAlumni = await prisma.alumni.update({
          where: { id: Number(id) },
          data: rest,
          include: {
            user: { select: { email: true } },
          },
        });
      } else {
        throw err;
      }
    }

    if (hasEducationHistoryInput && parsedEducationHistory.length > 0) {
      await replaceEducationHistory(prisma, Number(id), parsedEducationHistory);
    }

    // Sync user.username if firstName/lastName changed
    if (
      existingAlumni.user_id &&
      (updateData.first_name || updateData.last_name)
    ) {
      try {
        const userUpdate = {};
        if (updateData.first_name || updateData.last_name) {
          const fName =
            updateData.first_name || existingAlumni.first_name || "";
          const lName = updateData.last_name || existingAlumni.last_name || "";
          const fullName = [fName, lName].filter(Boolean).join(" ");
          if (fullName) userUpdate.username = fullName;
        }
        if (updateData.email && updateData.email !== existingAlumni.email) {
          userUpdate.email = updateData.email;
        }
        if (Object.keys(userUpdate).length > 0) {
          await prisma.user.update({
            where: { id: existingAlumni.user_id },
            data: userUpdate,
          });
        }
      } catch (syncErr) {
        console.warn(
          "Failed to sync user record:",
          syncErr?.message || syncErr,
        );
      }
    }

    // Sync alumni_list table
    if (
      existingAlumni.student_id ||
      updateData.first_name ||
      updateData.last_name
    ) {
      try {
        const syncData = {};
        if (updateData.first_name) syncData.first_name = updateData.first_name;
        if (updateData.last_name) syncData.last_name = updateData.last_name;
        if (updateData.course) syncData.course = updateData.course;
        if (updateData.level) syncData.level = updateData.level;
        if (updateData.batch !== undefined) syncData.batch = updateData.batch;
        if (updateData.graduation_year)
          syncData.graduation_year = updateData.graduation_year;
        if (updateData.student_id) syncData.student_id = updateData.student_id;

        if (Object.keys(syncData).length > 0) {
          const lookupId = existingAlumni.student_id || updateData.student_id;
          if (lookupId) {
            const existingList = await prisma.alumni_list.findFirst({
              where: { student_id: lookupId },
            });
            if (existingList) {
              await prisma.alumni_list.update({
                where: { id: existingList.id },
                data: syncData,
              });
            }
          }
        }
      } catch (syncErr) {
        console.warn(
          "Failed to sync alumni_list:",
          syncErr?.message || syncErr,
        );
      }
    }

    const historyByAlumniId = await getEducationHistoryByAlumniIds(prisma, [
      updatedAlumni.id,
    ]);
    const history = getEducationHistoryWithFallback(
      updatedAlumni,
      historyByAlumniId.get(updatedAlumni.id) || [],
    );

    console.log("Alumni updated successfully:", updatedAlumni.id);

    broadcastUpdate("alumni.updated", {
      alumniId: updatedAlumni.id,
      userId: existingAlumni.user_id || null,
    });

    if (existingAlumni.user_id) {
      broadcastUpdate("profile.updated", {
        userId: existingAlumni.user_id,
        alumniId: updatedAlumni.id,
      });
    }

    await recordActivity({
      req,
      action: "UPDATE",
      entityType: "alumni",
      entityId: updatedAlumni.id,
      entityLabel: [updatedAlumni.first_name, updatedAlumni.last_name].filter(Boolean).join(" ") || updatedAlumni.email,
      summary: `Updated alumni record "${[updatedAlumni.first_name, updatedAlumni.last_name].filter(Boolean).join(" ") || updatedAlumni.email || updatedAlumni.id}"`,
      details: {
        changes: buildChangeSet(existingAlumni, updatedAlumni, [
          { key: "first_name", label: "First Name" },
          { key: "middle_name", label: "Middle Name" },
          { key: "last_name", label: "Last Name" },
          { key: "email", label: "Email" },
          { key: "contact_number", label: "Contact Number" },
          { key: "level", label: "Level" },
          { key: "batch", label: "Batch" },
          { key: "course", label: "Course" },
          { key: "graduation_year", label: "Graduation Year" },
          { key: "current_position", label: "Current Position" },
          { key: "company", label: "Company" },
          { key: "location", label: "Location" },
          { key: "skills", label: "Skills" },
          { key: "profile_image", label: "Profile Image" }
        ])
      }
    });

    res.json({
      ...updatedAlumni,
      education_history: history,
      educationHistory: history,
    });
  } catch (error) {
    console.error("=== ERROR UPDATING ALUMNI ===");
    console.error("Error message:", error.message);
    console.error("Error code:", error.code);
    console.error("Error stack:", error.stack);
    console.error("Request body keys:", Object.keys(req.body));
    console.error("============================");
    res.status(500).json({
      error: "Failed to update alumni",
      details: error.message,
      code: error.code,
    });
  }
});

// Delete alumni
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if alumni exists and get user_id
    const existingAlumni = await prisma.alumni.findUnique({
      where: { id: Number(id) },
    });

    if (!existingAlumni) {
      return res.status(404).json({ error: "Alumni not found" });
    }

    const userId = existingAlumni.user_id;

    // Delete alumni record first (this will cascade to related records)
    await prisma.alumni.delete({
      where: { id: Number(id) },
    });

    // If alumni had a user_id, delete the user record too
    if (userId) {
      try {
        await prisma.user.delete({
          where: { id: userId },
        });
        console.log(`✅ Deleted user ${userId} along with alumni ${id}`);
      } catch (userDeleteError) {
        console.error("Error deleting associated user:", userDeleteError);
        // Continue even if user deletion fails (user might already be deleted)
      }
    }

    broadcastUpdate("alumni.deleted", {
      alumniId: Number(id),
      userId: userId || null,
    });

    if (userId) {
      broadcastUpdate("profile.updated", {
        userId,
        alumniId: Number(id),
      });
    }

    await recordActivity({
      req,
      action: "DELETE",
      entityType: "alumni",
      entityId: Number(id),
      entityLabel: [existingAlumni.first_name, existingAlumni.last_name].filter(Boolean).join(" ") || existingAlumni.email,
      summary: `Deleted alumni record "${[existingAlumni.first_name, existingAlumni.last_name].filter(Boolean).join(" ") || existingAlumni.email || id}"`,
      details: {
        deletedRecord: {
          firstName: existingAlumni.first_name,
          lastName: existingAlumni.last_name,
          email: existingAlumni.email,
          studentId: existingAlumni.student_id,
          level: existingAlumni.level,
          batch: existingAlumni.batch,
          course: existingAlumni.course
        }
      }
    });

    res.json({ message: "Alumni and associated user deleted successfully" });
  } catch (error) {
    console.error("Error deleting alumni:", error);
    res.status(500).json({
      error: "Failed to delete alumni",
      details: error.message,
    });
  }
});

// ===== Social Link Routes =====

// Helper function to detect platform from URL
function detectPlatform(url) {
  const urlLower = url.toLowerCase();
  if (urlLower.includes("facebook.com") || urlLower.includes("fb.com"))
    return "Facebook";
  if (urlLower.includes("linkedin.com")) return "LinkedIn";
  if (urlLower.includes("twitter.com") || urlLower.includes("x.com"))
    return "Twitter";
  if (urlLower.includes("instagram.com")) return "Instagram";
  if (urlLower.includes("github.com")) return "GitHub";
  if (urlLower.includes("youtube.com") || urlLower.includes("youtu.be"))
    return "YouTube";
  if (urlLower.includes("tiktok.com")) return "TikTok";
  return "Other";
}

// Add social link
router.post("/:id/social-links", authMiddleware, async (req, res) => {
  try {
    const alumniId = Number(req.params.id);
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    // Check if alumni exists and user owns this profile
    const alumni = await prisma.alumni.findUnique({
      where: { id: alumniId },
      include: { user: true },
    });

    if (!alumni) {
      return res.status(404).json({ error: "Alumni not found" });
    }

    // Only allow the owner or admin to add social links
    if (req.user.id !== alumni.user_id && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Auto-detect platform from URL
    const platform = detectPlatform(url);

    const socialLink = await prisma.social_link.create({
      data: {
        alumni_id: alumniId,
        platform,
        url,
      },
    });

    res.status(201).json(socialLink);
  } catch (error) {
    console.error("Error adding social link:", error);
    res.status(500).json({ error: "Failed to add social link" });
  }
});

// Update social link
router.put("/:id/social-links/:linkId", authMiddleware, async (req, res) => {
  try {
    const alumniId = Number(req.params.id);
    const linkId = Number(req.params.linkId);
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    // Check if alumni exists and user owns this profile
    const alumni = await prisma.alumni.findUnique({
      where: { id: alumniId },
      include: { user: true },
    });

    if (!alumni) {
      return res.status(404).json({ error: "Alumni not found" });
    }

    // Only allow the owner or admin to update social links
    if (req.user.id !== alumni.user_id && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Auto-detect platform from URL
    const platform = detectPlatform(url);

    const socialLink = await prisma.social_link.update({
      where: { id: linkId },
      data: {
        platform,
        url,
      },
    });

    res.json(socialLink);
  } catch (error) {
    console.error("Error updating social link:", error);
    res.status(500).json({ error: "Failed to update social link" });
  }
});

// Delete social link
router.delete("/:id/social-links/:linkId", authMiddleware, async (req, res) => {
  try {
    const alumniId = Number(req.params.id);
    const linkId = Number(req.params.linkId);

    // Check if alumni exists and user owns this profile
    const alumni = await prisma.alumni.findUnique({
      where: { id: alumniId },
      include: { user: true },
    });

    if (!alumni) {
      return res.status(404).json({ error: "Alumni not found" });
    }

    // Only allow the owner or admin to delete social links
    if (req.user.id !== alumni.user_id && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await prisma.social_link.delete({
      where: { id: linkId },
    });

    res.json({ message: "Social link deleted successfully" });
  } catch (error) {
    console.error("Error deleting social link:", error);
    res.status(500).json({ error: "Failed to delete social link" });
  }
});

// Report deceased alumni (Disabled)
router.post("/:id/report-deceased", authMiddleware, async (req, res) => {
  return res
    .status(400)
    .json({ error: "This feature is no longer supported." });
});

// Get pending deceased reports (Disabled)
router.get("/deceased-reports/pending", authMiddleware, async (req, res) => {
  return res.json([]);
});

// Approve deceased report (Disabled)
router.post(
  "/deceased-reports/:reportId/approve",
  authMiddleware,
  async (req, res) => {
    return res
      .status(400)
      .json({ error: "This feature is no longer supported." });
  },
);

// Reject deceased report (Disabled)
router.post(
  "/deceased-reports/:reportId/reject",
  authMiddleware,
  async (req, res) => {
    return res
      .status(400)
      .json({ error: "This feature is no longer supported." });
  },
);

module.exports = router;

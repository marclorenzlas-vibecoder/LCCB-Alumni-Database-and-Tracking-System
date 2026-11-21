const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { broadcastUpdate } = require("../services/realtimeService");
const { authenticateToken } = require("../middleware/auth");
const { buildChangeSet, recordActivity } = require("../services/activityLogService");
const notificationService = require("../services/notificationService");
const prisma = require('../config/prisma');
const router = express.Router();
const { uploadToSupabase } = require('../services/storageService');

const genderNeutralize = (text) => {
  if (!text) return text;
  return text
    .replace(/\b([Ss])he\s+has\b/g, (match, s) => s === 'S' ? 'They have' : 'they have')
    .replace(/\b([Ss])he\s+is\b/g, (match, s) => s === 'S' ? 'They are' : 'they are')
    .replace(/\b([Ss])he\s+was\b/g, (match, s) => s === 'S' ? 'They were' : 'they were')
    .replace(/\b([Ss])he\b/g, (match, s) => s === 'S' ? 'They' : 'they')
    .replace(/\b([Hh])erself\b/g, (match, h) => h === 'H' ? 'Themselves' : 'themselves')
    .replace(/\b([Hh])er\s+own\b/g, (match, h) => h === 'H' ? 'Their own' : 'their own')
    .replace(/\b([Hh])er\s+(experience|dedication|clinical|business|operations|market|contributions|success|professional|reputation|achievements|network|accomplishments|work|career|peers|communities|well-being|audiences|preventative|clinical)\b/gi, (match, h, word) => {
      const possessive = h.toUpperCase() === h ? 'Their' : 'their';
      return `${possessive} ${word}`;
    })
    .replace(/\b([Hh])er\b/g, (match, h) => h === 'H' ? 'Them' : 'them');
};

const isStaffRequest = (req) => {
  const role = String(req.user?.role || '').toUpperCase();
  return role === 'TEACHER' || role === 'ADMIN';
};

let ensureProfileOnlyColPromise = null;
const ensureAchievementProfileOnlyColumn = () => {
  if (!ensureProfileOnlyColPromise) {
    ensureProfileOnlyColPromise = Promise.all([
      prisma.$executeRawUnsafe(
        'ALTER TABLE "achievement" ADD COLUMN IF NOT EXISTS "is_profile_only" BOOLEAN NOT NULL DEFAULT false'
      ),
      prisma.$executeRawUnsafe(
        'ALTER TABLE "achievement" ADD COLUMN IF NOT EXISTS "achievement_scope" TEXT NOT NULL DEFAULT \'INDIVIDUAL\''
      ),
      prisma.$executeRawUnsafe(
        'ALTER TABLE "achievement" ADD COLUMN IF NOT EXISTS "batch_label" TEXT'
      ),
      prisma.$executeRawUnsafe(
        'ALTER TABLE "achievement" ADD COLUMN IF NOT EXISTS "posted_by_name" TEXT'
      ),
    ]).catch((err) => {
      ensureProfileOnlyColPromise = null;
      console.warn('Could not ensure achievement extra columns:', err?.message || err);
    });
  }
  return ensureProfileOnlyColPromise;
};

const getAuthenticatedAlumniId = async (req) => {
  const tokenAlumniId = Number(req.user?.alumniId || req.user?.alumni_id || 0);
  if (Number.isFinite(tokenAlumniId) && tokenAlumniId > 0) {
    return tokenAlumniId;
  }

  const userId = Number(req.user?.id || 0);
  if (Number.isFinite(userId) && userId > 0) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { alumni: { select: { id: true } } }
    });
    if (user?.alumni?.id) return Number(user.alumni.id);
  }

  const email = typeof req.user?.email === 'string' ? req.user.email : '';
  if (email) {
    const alumni = await prisma.alumni.findFirst({
      where: { email },
      select: { id: true }
    });
    if (alumni?.id) return Number(alumni.id);
  }

  return null;
};

const mapAchievementRow = (row) => ({
  id: row.id,
  alumni_id: row.alumni_id,
  title: row.title,
  category: row.category,
  image: row.image,
  description: row.description,
  date: row.date,
  approval_status: row.approval_status || 'APPROVED',
  achievement_scope: row.achievement_scope || 'INDIVIDUAL',
  batch_label: row.batch_label || null,
  posted_by_name: row.posted_by_name || null,
  alumni: (row.first_name || row.last_name || row.email)
    ? {
        first_name: row.first_name,
        last_name: row.last_name,
        email: row.email,
        ...(row.profile_image !== undefined ? { profile_image: row.profile_image } : {}),
      }
    : null,
});

// Get all approved achievements (excluding profile-only achievements)
router.get("/", async (req, res) => {
  try {
    await ensureAchievementProfileOnlyColumn();
    const rows = await prisma.$queryRawUnsafe(`
      SELECT ach.id, ach.alumni_id, ach.title, ach.category, ach.image, ach.description, ach.date,
             ach.approval_status::text AS approval_status,
             COALESCE(ach.achievement_scope, 'INDIVIDUAL') AS achievement_scope,
             ach.batch_label,
             ach.posted_by_name,
             a.first_name, a.last_name, a.email
      FROM achievement ach
      LEFT JOIN alumni a ON a.id = ach.alumni_id
      WHERE ach.approval_status = 'APPROVED'
        AND COALESCE(ach.is_profile_only, false) = false
      ORDER BY ach.date DESC NULLS LAST, ach.id DESC
    `);
    res.json(rows.map(mapAchievementRow));
  } catch (error) {
    console.error("Error fetching all achievements:", error);
    res.status(500).json({ error: "Failed to fetch achievements" });
  }
});

// Get pending achievements for admin/teacher review
router.get("/pending", authenticateToken, async (req, res) => {
  try {
    if (!isStaffRequest(req)) {
      return res.status(403).json({ error: "Access denied. Admin or Teacher privileges required." });
    }
    await ensureAchievementProfileOnlyColumn();
    const rows = await prisma.$queryRawUnsafe(`
      SELECT ach.id, ach.alumni_id, ach.title, ach.category, ach.image, ach.description, ach.date,
             ach.approval_status::text AS approval_status,
             COALESCE(ach.achievement_scope, 'INDIVIDUAL') AS achievement_scope,
             ach.batch_label,
             ach.posted_by_name,
             a.first_name, a.last_name, a.email, a.profile_image
      FROM achievement ach
      LEFT JOIN alumni a ON a.id = ach.alumni_id
      WHERE ach.approval_status = 'PENDING'
      ORDER BY ach.id DESC
    `);
    res.json(rows.map(mapAchievementRow));
  } catch (error) {
    console.error("Error fetching pending achievements:", error);
    res.status(500).json({ error: "Failed to fetch pending achievements" });
  }
});

// Get all approved achievements for an alumni (includes profile-only and admin-approved page achievements)
router.get("/alumni/:alumniId", async (req, res) => {
  try {
    await ensureAchievementProfileOnlyColumn();
    const { alumniId } = req.params;
    const rows = await prisma.$queryRawUnsafe(
      `SELECT ach.id, ach.alumni_id, ach.title, ach.category, ach.image, ach.description, ach.date,
              ach.approval_status::text AS approval_status,
              COALESCE(ach.is_profile_only, false) AS is_profile_only,
              a.first_name, a.last_name, a.email
       FROM achievement ach
       LEFT JOIN alumni a ON a.id = ach.alumni_id
       WHERE ach.alumni_id = $1 AND ach.approval_status = 'APPROVED'
       ORDER BY ach.date DESC NULLS LAST, ach.id DESC`,
      Number(alumniId)
    );
    res.json(rows.map((row) => ({
      ...mapAchievementRow(row),
      is_profile_only: Boolean(row.is_profile_only),
    })));
  } catch (error) {
    console.error("Error fetching achievements:", error);
    res.status(500).json({ error: "Failed to fetch achievements" });
  }
});

// Get a single achievement by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const achievement = await prisma.achievement.findUnique({
      where: { id: Number(id) },
      include: {
        alumni: {
          select: {
            first_name: true,
            last_name: true,
            email: true,
          },
        },
      },
    });

    if (!achievement) {
      return res.status(404).json({ error: "Achievement not found" });
    }

    res.json(achievement);
  } catch (error) {
    console.error("Error fetching achievement:", error);
    res.status(500).json({ error: "Failed to fetch achievement" });
  }
});

// Create new achievement (with optional image upload)
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ensure uploads/achievements exists
const achievementsDir = path.join(__dirname, "../../uploads/achievements");
if (!fs.existsSync(achievementsDir)) {
  fs.mkdirSync(achievementsDir, { recursive: true });
}

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedImage = /jpeg|jpg|png|gif|webp/;
    const allowedVideo = /mp4|mov|avi|mkv|webm/;
    const ext = path.extname(file.originalname).toLowerCase();
    const isImage = allowedImage.test(ext) && file.mimetype.startsWith('image/');
    const isVideo = allowedVideo.test(ext) && file.mimetype.startsWith('video/');
    if (isImage || isVideo) cb(null, true);
    else cb(new Error("Only image or video files are allowed"));
  },
});

router.post(
  "/",
  authenticateToken,
  upload.any(),
  async (req, res) => {
    try {
      await ensureAchievementProfileOnlyColumn();

      // fields come from multipart/form-data
      const { alumni_id, title, category, description, date } = req.body;
      const isProfileOnly =
        req.body.is_profile_only === 'true' ||
        req.body.is_profile_only === true ||
        String(req.body.source || '').toLowerCase() === 'profile';

      const rawScope = String(req.body.achievement_scope || '').trim().toUpperCase();
      const achievementScope = isProfileOnly
        ? 'INDIVIDUAL'
        : (rawScope === 'BATCH' || rawScope === 'GENERAL' ? rawScope : 'INDIVIDUAL');
      const batchLabel =
        achievementScope === 'BATCH' && typeof req.body.batch_label === 'string'
          ? req.body.batch_label.trim()
          : null;

      if (!title) {
        return res.status(400).json({
          error: "Missing required fields",
          required: ["title"],
        });
      }

      if (achievementScope === 'BATCH' && !batchLabel) {
        return res.status(400).json({
          error: "Batch / Group name is required for batch achievements",
        });
      }

      const authenticatedAlumniId = await getAuthenticatedAlumniId(req);
      const requestedAlumniId = achievementScope === 'INDIVIDUAL'
        ? (alumni_id ? Number(alumni_id) : (isProfileOnly ? authenticatedAlumniId : null))
        : null;
      if (!isStaffRequest(req) && achievementScope === 'INDIVIDUAL') {
        if (!requestedAlumniId || authenticatedAlumniId !== requestedAlumniId) {
          return res.status(403).json({ error: "You can only create individual achievements for your own profile" });
        }
      }

      let postedByName = null;
      if (authenticatedAlumniId) {
        const posterAlumni = await prisma.alumni.findUnique({
          where: { id: authenticatedAlumniId },
          select: { first_name: true, last_name: true }
        });
        if (posterAlumni) {
          postedByName = `${posterAlumni.first_name || ''} ${posterAlumni.last_name || ''}`.trim() || null;
        }
      }
      if (!postedByName && req.user?.id) {
        const posterUser = await prisma.user.findUnique({
          where: { id: Number(req.user.id) },
          select: { username: true, email: true }
        });
        postedByName = posterUser?.username || posterUser?.email || null;
      }

      const mediaFile = req.files?.find(f => f.fieldname === 'image' || f.fieldname === 'video');
      const mediaPath = mediaFile ? await uploadToSupabase(mediaFile, 'achievements') : null;

      const createData = {
        title: title.trim(),
        category: category ? category.trim() : null,
        image: mediaPath,
        description: description ? genderNeutralize(description.trim()) : null,
        date: date ? new Date(date) : null,
      };

      if (requestedAlumniId) {
        createData.alumni_id = requestedAlumniId;
      }

      const approvalStatus = (isStaffRequest(req) || isProfileOnly) ? 'APPROVED' : 'PENDING';

      const achievement = await prisma.achievement.create({
        data: createData,
        include: {
          alumni: requestedAlumniId
            ? {
                select: {
                  first_name: true,
                  last_name: true,
                  email: true,
                },
              }
            : false,
        },
      });

      await prisma.$executeRawUnsafe(
        'UPDATE "achievement" SET "approval_status" = $1::"approval_status", "is_profile_only" = $2, "achievement_scope" = $3, "batch_label" = $4, "posted_by_name" = $5 WHERE id = $6',
        approvalStatus,
        isProfileOnly,
        achievementScope,
        batchLabel,
        postedByName,
        achievement.id
      );

      const responseAchievement = {
        ...achievement,
        approval_status: approvalStatus,
        is_profile_only: isProfileOnly,
        achievement_scope: achievementScope,
        batch_label: batchLabel,
        posted_by_name: postedByName,
      };

      broadcastUpdate(approvalStatus === 'APPROVED' ? "achievement.created" : "achievement.pending", {
        achievementId: achievement.id,
        alumniId: achievement.alumni_id || null,
        title: achievement.title,
        approvalStatus,
      });

      if (approvalStatus === 'PENDING') {
        const submitterName = postedByName
          || (achievement.alumni
            ? `${achievement.alumni.first_name || ''} ${achievement.alumni.last_name || ''}`.trim() || achievement.alumni.email
            : 'An alumni');
        await notificationService.notifyAdminsOfPendingPost({
          type: 'ACHIEVEMENT',
          title: 'New Pending Achievement Post',
          message: `${submitterName} submitted "${achievement.title}" for approval.`,
          link: '/pending-approval?tab=achievements',
          senderName: submitterName
        });
      }

      await recordActivity({
        req,
        action: "CREATE",
        entityType: "achievement",
        entityId: achievement.id,
        entityLabel: achievement.title,
        summary: `Created achievement "${achievement.title}" (${approvalStatus})`,
        details: { alumniId: achievement.alumni_id || null, approvalStatus }
      });

      res.status(201).json(responseAchievement);
    } catch (error) {
      console.error("Error creating achievement:", error);
      res.status(500).json({
        error: "Failed to create achievement",
        details: error.message,
      });
    }
  },
);

// Update achievement
router.put(
  "/:id",
  authenticateToken,
  upload.any(),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { title, category, description, date } = req.body;
      const oldAchievement = await prisma.achievement.findUnique({
        where: { id: Number(id) },
      });

      if (!oldAchievement) {
        return res.status(404).json({ error: "Achievement not found" });
      }

      const authenticatedAlumniId = await getAuthenticatedAlumniId(req);
      if (!isStaffRequest(req) && authenticatedAlumniId !== oldAchievement.alumni_id) {
        return res.status(403).json({ error: "You can only update your own achievements" });
      }

      const updateData = {};
      if (title) updateData.title = title.trim();
      if (category !== undefined)
        updateData.category = category ? category.trim() : null;
      if (description !== undefined)
        updateData.description = description ? genderNeutralize(description.trim()) : null;
      if (date !== undefined) updateData.date = date ? new Date(date) : null;

      // Add media path if uploaded
      const mediaFile = req.files?.find(f => f.fieldname === 'image' || f.fieldname === 'video');
      if (mediaFile) {
        updateData.image = await uploadToSupabase(mediaFile, 'achievements');

        // Delete old image if exists
        if (oldAchievement?.image) {
          const oldImagePath = path.join(
            __dirname,
            "../../",
            oldAchievement.image,
          );
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        }
      }

      const achievement = await prisma.achievement.update({
        where: { id: Number(id) },
        data: updateData,
        include: {
          alumni: {
            select: {
              first_name: true,
              last_name: true,
              email: true,
            },
          },
        },
      });

      if (!isStaffRequest(req)) {
        await prisma.$executeRawUnsafe(
          'UPDATE "achievement" SET "approval_status" = $1::"approval_status" WHERE id = $2',
          'PENDING',
          achievement.id
        );
      }

      const finalApprovalStatus = isStaffRequest(req) ? undefined : 'PENDING';
      const responseAchievement = finalApprovalStatus
        ? { ...achievement, approval_status: finalApprovalStatus }
        : achievement;

      broadcastUpdate(isStaffRequest(req) ? "achievement.updated" : "achievement.pending", {
        achievementId: achievement.id,
        alumniId: achievement.alumni_id,
        title: achievement.title,
      });

      if (!isStaffRequest(req)) {
        const submitterName = achievement.alumni
          ? `${achievement.alumni.first_name || ''} ${achievement.alumni.last_name || ''}`.trim() || achievement.alumni.email
          : 'An alumni';
        await notificationService.notifyAdminsOfPendingPost({
          type: 'ACHIEVEMENT',
          title: 'Updated Achievement Pending Review',
          message: `${submitterName} updated "${achievement.title}" and needs re-approval.`,
          link: '/pending-approval?tab=achievements',
          senderName: submitterName
        });
      }

      await recordActivity({
        req,
        action: "UPDATE",
        entityType: "achievement",
        entityId: achievement.id,
        entityLabel: achievement.title,
        summary: `Updated achievement "${achievement.title}"`,
        details: {
          changes: buildChangeSet(oldAchievement, achievement, [
            { key: "title", label: "Title" },
            { key: "category", label: "Category" },
            { key: "description", label: "Description" },
            { key: "date", label: "Date" },
            { key: "image", label: "Media" }
          ])
        }
      });

      res.json(responseAchievement);
    } catch (error) {
      console.error("Error updating achievement:", error);
      res.status(500).json({
        error: "Failed to update achievement",
        details: error.message,
      });
    }
  },
);

// Approve or reject a pending achievement (Admin / Teacher)
router.patch("/:id/approval", authenticateToken, async (req, res) => {
  try {
    if (!isStaffRequest(req)) {
      return res.status(403).json({ error: "Access denied. Admin or Teacher privileges required." });
    }

    const achievementId = Number(req.params.id);
    const status = String(req.body?.status || '').toUpperCase();
    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: "Invalid approval status. Must be APPROVED or REJECTED." });
    }

    const existing = await prisma.achievement.findUnique({
      where: { id: achievementId },
    });
    if (!existing) {
      return res.status(404).json({ error: "Achievement not found" });
    }

    if (status === 'REJECTED') {
      await prisma.achievement.delete({
        where: { id: achievementId },
      });

      if (existing.image && !existing.image.startsWith('http')) {
        const imagePath = path.join(__dirname, "../../", existing.image);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      }

      broadcastUpdate("achievement.deleted", {
        achievementId,
        alumniId: existing.alumni_id || null,
        approvalStatus: 'REJECTED',
      });

      await recordActivity({
        req,
        action: "REJECT",
        entityType: "achievement",
        entityId: achievementId,
        entityLabel: existing.title,
        summary: `Rejected and deleted pending achievement "${existing.title}"`,
        details: { alumniId: existing.alumni_id || null, status, deleted: true }
      });

      return res.json({ success: true, id: achievementId, approval_status: status, deleted: true });
    }

    await prisma.$executeRawUnsafe(
      'UPDATE "achievement" SET "approval_status" = $1::"approval_status" WHERE id = $2',
      status,
      achievementId
    );

    broadcastUpdate("achievement.created", {
      achievementId,
      alumniId: existing.alumni_id || null,
      approvalStatus: status,
    });

    await recordActivity({
      req,
      action: "APPROVE",
      entityType: "achievement",
      entityId: achievementId,
      entityLabel: existing.title,
      summary: `Approved achievement "${existing.title}"`,
      details: { alumniId: existing.alumni_id || null, status }
    });

    res.json({ success: true, id: achievementId, approval_status: status });
  } catch (error) {
    console.error("Error updating achievement approval:", error);
    res.status(500).json({ error: "Failed to update achievement approval status" });
  }
});

// Delete an achievement
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Get the achievement to find its image
    const achievementToDelete = await prisma.achievement.findUnique({
      where: { id: parseInt(id) },
    });

    if (!achievementToDelete) {
      return res.status(404).json({ error: "Achievement not found" });
    }

    const authenticatedAlumniId = await getAuthenticatedAlumniId(req);
    if (!isStaffRequest(req) && authenticatedAlumniId !== achievementToDelete.alumni_id) {
      return res.status(403).json({ error: "You can only delete your own achievements" });
    }

    // Delete the achievement
    await prisma.achievement.delete({
      where: { id: parseInt(id) },
    });

    broadcastUpdate("achievement.deleted", {
      achievementId: parseInt(id),
      alumniId: achievementToDelete.alumni_id,
    });

    await recordActivity({
      req,
      action: "DELETE",
      entityType: "achievement",
      entityId: Number(id),
      entityLabel: achievementToDelete.title,
      summary: `Deleted achievement "${achievementToDelete.title}"`,
      details: {
        alumniId: achievementToDelete.alumni_id || null,
        deletedRecord: {
          title: achievementToDelete.title,
          category: achievementToDelete.category,
          date: achievementToDelete.date,
          image: achievementToDelete.image
        }
      }
    });

    // Delete the image file if it exists
    if (achievementToDelete.image) {
      const imagePath = path.join(
        __dirname,
        "../../",
        achievementToDelete.image,
      );
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    res.json({ message: "Achievement deleted successfully" });
  } catch (error) {
    console.error("Error deleting achievement:", error);
    res.status(500).json({ error: "Failed to delete achievement" });
  }
});

// Multer error handler
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: "Only one image or video file is allowed." });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err.message === 'Only image or video files are allowed') {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

module.exports = router;

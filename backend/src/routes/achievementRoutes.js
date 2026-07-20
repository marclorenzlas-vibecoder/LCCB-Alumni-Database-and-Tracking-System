const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { broadcastUpdate } = require("../services/realtimeService");
const { authenticateToken } = require("../middleware/auth");
const { buildChangeSet, recordActivity } = require("../services/activityLogService");
const prisma = new PrismaClient();
const router = express.Router();

// Get all achievements
router.get("/", async (req, res) => {
  try {
    const achievements = await prisma.achievement.findMany({
      include: {
        alumni: {
          select: {
            first_name: true,
            last_name: true,
            email: true,
          },
        },
      },
      orderBy: { date: "desc" },
    });
    res.json(achievements);
  } catch (error) {
    console.error("Error fetching all achievements:", error);
    res.status(500).json({ error: "Failed to fetch achievements" });
  }
});

// Get all achievements for an alumni
router.get("/alumni/:alumniId", async (req, res) => {
  try {
    const { alumniId } = req.params;
    const achievements = await prisma.achievement.findMany({
      where: { alumni_id: Number(alumniId) },
      orderBy: { date: "desc" },
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
    res.json(achievements);
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

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, achievementsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "achievement-" + uniqueSuffix + path.extname(file.originalname));
  },
});

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
      // fields come from multipart/form-data
      const { alumni_id, title, category, description, date } = req.body;

      if (!title) {
        return res.status(400).json({
          error: "Missing required fields",
          required: ["title"],
        });
      }

      const mediaFile = req.files?.find(f => f.fieldname === 'image' || f.fieldname === 'video');
      const mediaPath = mediaFile
        ? `/uploads/achievements/${mediaFile.filename}`
        : null;

      const createData = {
        title: title.trim(),
        category: category ? category.trim() : null,
        image: mediaPath,
        description: description ? description.trim() : null,
        date: date ? new Date(date) : null,
      };

      if (alumni_id) {
        createData.alumni_id = Number(alumni_id);
      }

      const achievement = await prisma.achievement.create({
        data: createData,
        include: {
          alumni: alumni_id
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

      broadcastUpdate("achievement.created", {
        achievementId: achievement.id,
        alumniId: achievement.alumni_id || null,
      });

      await recordActivity({
        req,
        action: "CREATE",
        entityType: "achievement",
        entityId: achievement.id,
        entityLabel: achievement.title,
        summary: `Created achievement "${achievement.title}"`,
        details: { alumniId: achievement.alumni_id || null }
      });

      res.status(201).json(achievement);
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

      const updateData = {};
      if (title) updateData.title = title.trim();
      if (category !== undefined)
        updateData.category = category ? category.trim() : null;
      if (description !== undefined)
        updateData.description = description ? description.trim() : null;
      if (date !== undefined) updateData.date = date ? new Date(date) : null;

      // Add media path if uploaded
      const mediaFile = req.files?.find(f => f.fieldname === 'image' || f.fieldname === 'video');
      if (mediaFile) {
        updateData.image = `/uploads/achievements/${mediaFile.filename}`;

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

      broadcastUpdate("achievement.updated", {
        achievementId: achievement.id,
        alumniId: achievement.alumni_id,
      });

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

      res.json(achievement);
    } catch (error) {
      console.error("Error updating achievement:", error);
      res.status(500).json({
        error: "Failed to update achievement",
        details: error.message,
      });
    }
  },
);

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

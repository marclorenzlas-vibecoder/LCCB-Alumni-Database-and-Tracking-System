ALTER TABLE `career_entry`
  ADD COLUMN `program_alignment` VARCHAR(20) NULL DEFAULT 'NEEDS_REVIEW' AFTER `is_current`,
  ADD COLUMN `alignment_notes` TEXT NULL AFTER `program_alignment`;

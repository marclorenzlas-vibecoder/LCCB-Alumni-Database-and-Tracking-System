ALTER TABLE `job_posting`
  ADD COLUMN IF NOT EXISTS `application_url` VARCHAR(1000) NULL AFTER `description`;

ALTER TABLE `donation`
  ADD COLUMN IF NOT EXISTS `accepts_money` TINYINT(1) NOT NULL DEFAULT 1 AFTER `donation_type`,
  ADD COLUMN IF NOT EXISTS `accepts_items` TINYINT(1) NOT NULL DEFAULT 1 AFTER `accepts_money`;

ALTER TABLE `donation`
  ALTER COLUMN `donation_type` SET DEFAULT 'both';

UPDATE `donation`
SET
  `donation_type` = 'both',
  `accepts_money` = 1,
  `accepts_items` = 1;

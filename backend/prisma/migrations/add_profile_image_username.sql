-- Add profile_image and username columns to user table
ALTER TABLE `user` 
ADD COLUMN `username` VARCHAR(100) NULL AFTER `password`,
ADD COLUMN `profile_image` VARCHAR(255) NULL AFTER `username`;

-- Add profile_image and username columns to users table
ALTER TABLE `users` 
ADD COLUMN `username` VARCHAR(100) NULL AFTER `password`,
ADD COLUMN `profile_image` VARCHAR(255) NULL AFTER `username`;

-- Add profile_image column to teacher table (username already exists)
ALTER TABLE `teacher` 
ADD COLUMN `profile_image` VARCHAR(255) NULL AFTER `password`;

-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Dec 18, 2025 at 03:31 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `alumni`
--

-- --------------------------------------------------------

--
-- Table structure for table `achievement`
--

CREATE TABLE `achievement` (
  `id` int(11) NOT NULL,
  `alumni_id` int(11) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `date` date DEFAULT NULL,
  `image` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `alumni`
--

CREATE TABLE `alumni` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `middle_name` varchar(100) DEFAULT NULL,
  `graduation_year` int(11) DEFAULT NULL,
  `course` varchar(100) DEFAULT NULL,
  `current_position` varchar(100) DEFAULT NULL,
  `company` varchar(100) DEFAULT NULL,
  `location` varchar(100) DEFAULT NULL,
  `profile_image` varchar(255) DEFAULT NULL,
  `skills` text DEFAULT NULL,
  `bio` text DEFAULT NULL,
  `is_public` tinyint(1) DEFAULT 1,
  `is_verified` tinyint(1) DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp(),
  `email` varchar(255) DEFAULT NULL,
  `contact_number` varchar(50) DEFAULT NULL,
  `batch` int(11) DEFAULT NULL,
  `level` enum('COLLEGE','HIGH_SCHOOL','SENIOR_HIGH_SCHOOL') DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `alumni`
--

INSERT INTO `alumni` (`id`, `user_id`, `first_name`, `last_name`, `middle_name`, `graduation_year`, `course`, `current_position`, `company`, `location`, `profile_image`, `skills`, `bio`, `is_public`, `is_verified`, `created_at`, `updated_at`, `email`, `contact_number`, `batch`, `level`) VALUES
(32, 40, 'Kendra', 'Vaughn', NULL, 2024, 'BSIT', 'Network Technician', 'PLDT', 'Cebu City', '/uploads/profiles/profile-1764816633378-796648438.jpg', 'Network Cabling, Configuration, Diagnostics, Security', 'Technical Support, Troubleshooting, Communication, Customer Service', 1, 0, '2025-12-04 01:26:42', '2025-12-04 01:26:42', 'kendra@gmail.com', NULL, 2019, 'SENIOR_HIGH_SCHOOL'),
(33, 41, 'Lucas', 'McIntyre', NULL, 2024, 'Computer Science', 'Software Developer', 'Pointwest Technologies', 'Makati', '/uploads/profiles/profile-1764816812292-266714976.jpg', 'Programming (Java, Python, C#), Algorithms, Problem-solving, Teamwork', 'Programming (Java, Python, C#), Algorithms, Problem-solving, Teamwork', 1, 0, '2025-12-04 02:52:34', '2025-12-04 02:52:34', 'lucas@gmail.com', NULL, 2014, 'HIGH_SCHOOL'),
(34, 42, 'Marc', 'Lorenz Las', NULL, 2026, 'BSIT', 'Technical Support Engineer', 'Globe Telecom', 'Quezon City', '/uploads/profiles/profile-1764817148977-274096164.jpg', 'Remote Support, Software Troubleshooting, Customer Handling', 'HTML, CSS, JavaScript, Responsive Design, Backend Integration', 1, 0, '2025-12-04 02:58:15', '2025-12-04 02:58:15', 'marc@gmail.com', NULL, 2023, 'COLLEGE'),
(35, 43, 'Brielle', 'Dawson', NULL, 2019, 'BSTM', 'Front Desk Officer', 'Pearl Bay Hotel ', 'Cebu City', '/uploads/profiles/profile-1764844183760-49924905.jpg', 'Customer service, Communication, Multitasking, Computer literacy', 'Customer service, Communication, Multitasking, Computer literacy', 1, 0, '2025-12-04 10:27:18', '2025-12-04 10:27:18', 'brielle@gmail.com', NULL, 2015, 'COLLEGE'),
(36, 44, 'Oscar', 'Hartman', NULL, 2024, 'STEM', 'Quality Control Analyst', 'Archipelago Pharma Corp.', 'Mandaluyong', '/uploads/profiles/profile-1764992669769-720462854.jpg', 'Designing experiments, collecting data, and interpreting results.', 'Application Maintenance, Issue Tracking, Debugging, User Training', 1, 0, '2025-12-06 03:41:22', '2025-12-06 03:41:22', 'oscar@gmail.com', NULL, 2020, 'SENIOR_HIGH_SCHOOL'),
(37, 45, 'VJ', 'Javellana', NULL, 2025, 'BSIT', 'Web Developer', 'Sprout Solutions	', 'Taguig', '/uploads/profiles/profile-1765353050676-257480606.jpg', 'HTML, CSS, JavaScript, PHP, Website Deployment', 'HTML, CSS, JavaScript, PHP, Website Deployment', 1, 0, '2025-12-07 09:39:50', '2025-12-07 09:39:50', 'vj@gmail.com', NULL, 2020, 'COLLEGE'),
(38, 46, 'Alaina', 'Russo', NULL, 2025, 'BSIT', 'Systems Administrator', 'San Miguel Corporation', 'Mandaluyong City', 'http://localhost:5001/uploads/profiles/profile-1765149231606-932198265.png', 'Server Administration, Backups, Security, Automation', NULL, 1, 0, '2025-12-07 23:13:07', '2025-12-07 23:13:07', 'alaine@gmail.com', NULL, 2021, 'COLLEGE'),
(39, 47, 'joey', 'Abunan', NULL, 2030, 'HS', 'Front Desk Officer', 'TechVision Philippines Inc.', 'Mandaluyong City', '/uploads/profiles/profile-1765355295328-508656422.jpg', NULL, NULL, 1, 0, '2025-12-10 08:26:29', '2025-12-10 08:26:29', 'joey@gmail.com', NULL, 2020, 'HIGH_SCHOOL'),
(100, 228, 'Mia', 'Reyes', NULL, 2014, 'HUMSS', 'Quality Assurance Engineer', 'Microsoft', 'Muntinlupa City', '/uploads/profiles/profile-1765458326609-149123256.jpg', 'Psychology Basics, Social Research, Communication Skills, Philosophy, Critical Analysis', 'Alumni from La Consolacion College Bacolod batch 2014. Graduated with HUMSS. Currently working as Quality Assurance Engineer at Microsoft.', 1, 1, '2025-12-11 12:13:29', '2025-12-11 12:13:29', 'mia@gmail.com', '0932491356', 2014, 'COLLEGE'),
(101, 229, 'Joseph', 'Diaz', NULL, 2014, 'BS Computer Science', 'Project Manager', 'Jollibee Foods Corporation', 'Muntinlupa City', '/uploads/profiles/profile-1765458779144-893215765.jpg', 'Machine Learning, Database Design, Artificial Intelligence, Software Engineering, Data Structures, Algorithm Design', 'Alumni from La Consolacion College Bacolod batch 2014. Graduated with BS Computer Science. Currently working as Project Manager at Jollibee Foods Corporation.', 1, 1, '2025-12-11 12:13:29', '2025-12-11 12:13:29', 'joseph@gmail.com', '0962486358', 2014, 'COLLEGE'),
(102, 230, 'Jack', 'Anderson', NULL, 2014, 'BS Mechanical Engineering', 'Operations Manager', 'Google', 'Manila', '/uploads/profiles/profile-1765458751545-126677729.jpg', 'SolidWorks, Mechanical Design, CAD/CAM, Quality Control', 'Alumni from La Consolacion College Bacolod batch 2014. Graduated with BS Mechanical Engineering. Currently working as Operations Manager at Google.', 1, 1, '2025-12-11 12:13:29', '2025-12-11 12:13:29', 'jack@gmail.com', '0953574528', 2014, 'COLLEGE'),
(103, 231, 'Ethan', 'Parker', NULL, 2014, 'BS Accountancy', 'HR Specialist', 'Universal Robina Corporation', 'Muntinlupa City', '/uploads/profiles/profile-1765458719331-173179484.jpg', 'Tax Preparation, Budget Analysis, Bookkeeping, Financial Reporting', 'Alumni from La Consolacion College Bacolod batch 2014. Graduated with BS Accountancy. Currently working as HR Specialist at Universal Robina Corporation.', 1, 1, '2025-12-11 12:13:30', '2025-12-11 12:13:30', 'ethan@gmail.com', '0982829430', 2014, 'COLLEGE'),
(104, 232, 'Isaac', 'King', NULL, 2014, 'ICT', 'Data Analyst', 'Ayala Corporation', 'Pasay City', '/uploads/profiles/profile-1765458689827-764728952.jpg', 'Computer Programming, Technical Support, Web Design, Database Basics, Network Fundamentals, Software Applications', 'Alumni from La Consolacion College Bacolod batch 2014. Graduated with ICT. Currently working as Data Analyst at Ayala Corporation.', 1, 1, '2025-12-11 12:13:30', '2025-12-11 12:13:30', 'isaac@gmail.com', '0925639120', 2014, 'COLLEGE'),
(105, 233, 'Layla', 'Green', NULL, 2014, 'BS Nursing', 'Quality Assurance Engineer', 'Universal Robina Corporation', 'Paranaque City', '/uploads/profiles/profile-1765458353825-581563429.jpg', 'Medication Administration, Patient Care, Health Assessment, Emergency Care, Clinical Procedures', 'Alumni from La Consolacion College Bacolod batch 2014. Graduated with BS Nursing. Currently working as Quality Assurance Engineer at Universal Robina Corporation.', 1, 1, '2025-12-11 12:13:30', '2025-12-11 12:13:30', 'layla@gmail.com', '0970772323', 2014, 'COLLEGE'),
(106, 234, 'Olivia', 'Baker', NULL, 2014, 'BS Accountancy', 'Project Manager', 'Google', 'Paranaque City', '/uploads/profiles/profile-1765458401922-996070413.jpg', 'Financial Accounting, Cost Accounting, Accounting Software (QuickBooks, SAP), Auditing, Financial Reporting', 'Alumni from La Consolacion College Bacolod batch 2014. Graduated with BS Accountancy. Currently working as Project Manager at Google.', 1, 1, '2025-12-11 12:13:30', '2025-12-11 12:13:30', 'olivia@gmail.com', '0981533820', 2014, 'COLLEGE'),
(107, 235, 'Ella', 'Sanchez', NULL, 2014, 'BS Mechanical Engineering', 'IT Consultant', 'PLDT', 'Las Pinas City', '/uploads/profiles/profile-1765458376106-320029603.jpg', 'Maintenance Engineering, Mechanical Design, CAD/CAM, SolidWorks, Thermodynamics, Manufacturing Processes', 'Alumni from La Consolacion College Bacolod batch 2014. Graduated with BS Mechanical Engineering. Currently working as IT Consultant at PLDT.', 1, 1, '2025-12-11 12:13:31', '2025-12-11 12:13:31', 'ella@gmail.com', '0954562158', 2014, 'COLLEGE'),
(108, 236, 'Emily', 'Flores', NULL, 2014, 'BS Nursing', 'Product Manager', 'BDO Unibank', 'Muntinlupa City', '/uploads/profiles/profile-1765458534631-531015773.jpg', 'Emergency Care, Patient Care, Electronic Health Records, Clinical Procedures, Medical-Surgical Nursing, Health Assessment', 'Alumni from La Consolacion College Bacolod batch 2014. Graduated with BS Nursing. Currently working as Product Manager at BDO Unibank.', 1, 1, '2025-12-11 12:13:31', '2025-12-11 12:13:31', 'emily@gmail.com', '0934335165', 2014, 'COLLEGE'),
(109, 237, 'Aiden', 'Phillips', NULL, 2015, 'BS Information Technology', 'System Administrator', 'Universal Robina Corporation', 'Makati City', '/uploads/profiles/profile-1765458661171-135182328.jpg', 'Cloud Computing, IT Project Management, Software Testing, Network Administration, System Analysis, Technical Support', 'Alumni from La Consolacion College Bacolod batch 2015. Graduated with BS Information Technology. Currently working as System Administrator at Universal Robina Corporation.', 1, 1, '2025-12-11 12:13:31', '2025-12-11 12:13:31', 'aiden@gmail.com', '0977831301', 2015, 'COLLEGE'),
(110, 238, 'Aubrey', 'Taylor', NULL, 2015, 'STEM', 'DevOps Engineer', 'Jollibee Foods Corporation', 'Pasig City', '/uploads/profiles/profile-1765458637427-531092293.jpg', 'Laboratory Skills, Physics, Problem Solving, Mathematics', 'Alumni from La Consolacion College Bacolod batch 2015. Graduated with STEM. Currently working as DevOps Engineer at Jollibee Foods Corporation.', 1, 1, '2025-12-11 12:13:31', '2025-12-11 12:13:31', 'aubrey@gmail.com', '0990849547', 2015, 'COLLEGE'),
(111, 239, 'Zoey', 'Allen', NULL, 2015, 'ICT', 'HR Specialist', 'BDO Unibank', 'Pasig City', '/uploads/profiles/profile-1765458606639-168395860.jpg', 'Digital Graphics, Web Design, Software Applications, Database Basics, Computer Programming', 'Alumni from La Consolacion College Bacolod batch 2015. Graduated with ICT. Currently working as HR Specialist at BDO Unibank.', 1, 1, '2025-12-11 12:13:31', '2025-12-11 12:13:31', 'zoey@gmail.com', '0914229517', 2015, 'COLLEGE'),
(112, 240, 'Lincoln', 'Adams', NULL, 2015, 'STEM', 'Business Analyst', 'Megaworld Corporation', 'Manila', '/uploads/profiles/profile-1765458585647-639757807.jpg', 'Mathematics, Laboratory Skills, Critical Thinking, Scientific Research', 'Alumni from La Consolacion College Bacolod batch 2015. Graduated with STEM. Currently working as Business Analyst at Megaworld Corporation.', 1, 1, '2025-12-11 12:13:32', '2025-12-11 12:13:32', 'lincoln@gmail.com', '0989638211', 2015, 'COLLEGE'),
(113, 241, 'Luke', 'Gonzalez', NULL, 2015, 'GAS', 'HR Specialist', 'Universal Robina Corporation', 'Taguig City', '/uploads/profiles/profile-1765458560063-320313593.jpg', 'Time Management, Problem Solving, Presentation Skills, Communication', 'Alumni from La Consolacion College Bacolod batch 2015. Graduated with GAS. Currently working as HR Specialist at Universal Robina Corporation.', 1, 1, '2025-12-11 12:13:32', '2025-12-11 12:13:32', 'luke@gmail.com', '0984325463', 2015, 'COLLEGE'),
(114, 242, 'Avery', 'Hill', NULL, 2015, 'BS Electrical Engineering', 'HR Specialist', 'BDO Unibank', 'Muntinlupa City', '/uploads/profiles/profile-1765458301513-76467820.jpg', 'Electrical Troubleshooting, Power Systems, Instrumentation, PLC Programming, Control Systems', 'Alumni from La Consolacion College Bacolod batch 2015. Graduated with BS Electrical Engineering. Currently working as HR Specialist at BDO Unibank.', 1, 1, '2025-12-11 12:13:32', '2025-12-11 12:13:32', 'avery@gmail.com', '0958360749', 2015, 'COLLEGE'),
(115, 243, 'Grace', 'Rodriguez', NULL, 2015, 'ICT', 'Data Analyst', 'San Miguel Corporation', 'Makati City', '/uploads/profiles/profile-1765456951150-528597722.png', 'Computer Programming, Web Design, Network Fundamentals, Technical Support, Database Basics, Digital Graphics', 'Alumni from La Consolacion College Bacolod batch 2015. Graduated with ICT. Currently working as Data Analyst at San Miguel Corporation.', 1, 1, '2025-12-11 12:13:32', '2025-12-11 12:13:32', 'grace@gmail.com', '0943511622', 2015, 'COLLEGE'),
(116, 244, 'Mason', 'Reyes', NULL, 2015, 'HS', 'Operations Manager', 'Aboitiz Equity Ventures', 'Taguig City', '/uploads/profiles/profile-1765458276969-735275203.jpg', 'Study Skills, Computer Literacy, Communication Skills, Time Management', 'Alumni from La Consolacion College Bacolod batch 2015. Graduated with HS. Currently working as Operations Manager at Aboitiz Equity Ventures.', 1, 1, '2025-12-11 12:13:32', '2025-12-11 12:13:32', 'mason@gmail.com', '0970685427', 2015, 'COLLEGE'),
(117, 245, 'Charlotte', 'Evans', NULL, 2019, 'BS Mechanical Engineering', 'System Administrator', 'TechVision Philippines Inc.', 'Las Pinas City', '/uploads/profiles/profile-1765458246625-244008657.jpg', 'Manufacturing Processes, SolidWorks, Quality Control, Mechanical Design, Thermodynamics', 'Alumni from La Consolacion College Bacolod batch 2019. Graduated with BS Mechanical Engineering. Currently working as System Administrator at TechVision Philippines Inc..', 1, 1, '2025-12-11 12:13:33', '2025-12-11 12:13:33', 'charlotte@gmail.com', '0942714824', 2019, 'SENIOR_HIGH_SCHOOL'),
(118, 246, 'David', 'Baker', NULL, 2019, 'BS Business Administration', 'Data Analyst', 'SM Investments', 'Pasay City', '/uploads/profiles/profile-1765458221153-937585322.jpg', 'Operations Management, Financial Analysis, Strategic Planning, Human Resource Management, Entrepreneurship', 'Alumni from La Consolacion College Bacolod batch 2019. Graduated with BS Business Administration. Currently working as Data Analyst at SM Investments.', 1, 1, '2025-12-11 12:13:33', '2025-12-11 12:13:33', 'david@gmail.com', '0965119770', 2019, 'SENIOR_HIGH_SCHOOL'),
(119, 247, 'Dylan', 'Hill', NULL, 2019, 'STEM', 'Senior Developer', 'Microsoft', 'Mandaluyong City', '/uploads/profiles/profile-1765458183426-488202043.jpg', 'Scientific Research, Critical Thinking, Problem Solving, Chemistry, Laboratory Skills', 'Alumni from La Consolacion College Bacolod batch 2019. Graduated with STEM. Currently working as Senior Developer at Microsoft.', 1, 1, '2025-12-11 12:13:33', '2025-12-11 12:13:33', 'dylan@gmail.com', '0940860509', 2019, 'SENIOR_HIGH_SCHOOL'),
(120, 248, 'Lillian', 'Rodriguez', NULL, 2019, 'HUMSS', 'Senior Developer', 'Universal Robina Corporation', 'Muntinlupa City', '/uploads/profiles/profile-1765458158993-988051077.jpg', 'Philosophy, Psychology Basics, Critical Analysis, Public Speaking', 'Alumni from La Consolacion College Bacolod batch 2019. Graduated with HUMSS. Currently working as Senior Developer at Universal Robina Corporation.', 1, 1, '2025-12-11 12:13:34', '2025-12-11 12:13:34', 'lillian@gmail.com', '0986866667', 2019, 'SENIOR_HIGH_SCHOOL'),
(121, 249, 'Evelyn', 'Smith', NULL, 2019, 'BS Accountancy', 'IT Consultant', 'SM Investments', 'Las Pinas City', '/uploads/profiles/profile-1765457897747-202297415.jpg', 'Tax Preparation, Cost Accounting, Auditing, Financial Accounting, Bookkeeping', 'Alumni from La Consolacion College Bacolod batch 2019. Graduated with BS Accountancy. Currently working as IT Consultant at SM Investments.', 1, 1, '2025-12-11 12:13:34', '2025-12-11 12:13:34', 'evelyn@gmail.com', '0947683072', 2019, 'SENIOR_HIGH_SCHOOL'),
(122, 250, 'Jackson', 'Young', NULL, 2020, 'BS Psychology', 'Project Manager', 'TechVision Philippines Inc.', 'Paranaque City', '/uploads/profiles/profile-1765458123043-66297518.jpg', 'Mental Health Support, Research Methods, Behavioral Analysis, Child Development, Crisis Intervention, Psychological Assessment', 'Alumni from La Consolacion College Bacolod batch 2020. Graduated with BS Psychology. Currently working as Project Manager at TechVision Philippines Inc..', 1, 1, '2025-12-11 12:13:34', '2025-12-11 12:13:34', 'jackson@gmail.com', '0938774101', 2020, 'COLLEGE'),
(123, 251, 'Riley', 'Wilson', NULL, 2020, 'BS Accountancy', 'Project Manager', 'Aboitiz Equity Ventures', 'Mandaluyong City', '/uploads/profiles/profile-1765458097123-777791291.jpg', 'Accounting Software (QuickBooks, SAP), Financial Reporting, Budget Analysis, Financial Accounting, Cost Accounting, Tax Preparation', 'Alumni from La Consolacion College Bacolod batch 2020. Graduated with BS Accountancy. Currently working as Project Manager at Aboitiz Equity Ventures.', 1, 1, '2025-12-11 12:13:35', '2025-12-11 12:13:35', 'riley@gmail.com', '0977565164', 2020, 'COLLEGE'),
(124, 252, 'Matthew', 'Gomez', NULL, 2020, 'HS', 'Marketing Manager', 'PLDT', 'Taguig City', '/uploads/profiles/profile-1765457869259-785745166.jpg', 'Problem Solving, Team Work, Time Management, Critical Thinking, Computer Literacy, Communication Skills', 'Alumni from La Consolacion College Bacolod batch 2020. Graduated with HS. Currently working as Marketing Manager at PLDT.', 1, 1, '2025-12-11 12:13:35', '2025-12-11 12:13:35', 'matthew@gmail.com', '0936589947', 2020, 'COLLEGE'),
(125, 253, 'Penelope', 'Garcia', NULL, 2020, 'BS Computer Science', 'Sales Executive', 'TechVision Philippines Inc.', 'Las Pinas City', '/uploads/profiles/profile-1765457803266-302995729.jpg', 'Mobile App Development, Database Design, Algorithm Design, Programming (Java, Python, C++)', 'Alumni from La Consolacion College Bacolod batch 2020. Graduated with BS Computer Science. Currently working as Sales Executive at TechVision Philippines Inc..', 1, 1, '2025-12-11 12:13:35', '2025-12-11 12:13:35', 'penelope@gmail.com', '0929433750', 2020, 'COLLEGE'),
(126, 254, 'Scarlett', 'Nguyen', NULL, 2020, 'GAS', 'IT Consultant', 'Aboitiz Equity Ventures', 'Pasig City', '/uploads/profiles/profile-1765457776539-670057937.jpg', 'Academic Writing, Research, Team Collaboration, Time Management, Problem Solving, Adaptability', 'Alumni from La Consolacion College Bacolod batch 2020. Graduated with GAS. Currently working as IT Consultant at Aboitiz Equity Ventures.', 1, 1, '2025-12-11 12:13:36', '2025-12-11 12:13:36', 'scarlett@gmail.com', '0965475585', 2020, 'COLLEGE'),
(127, 255, 'Elizabeth', 'Baker', NULL, 2020, 'BS Psychology', 'Sales Executive', 'Megaworld Corporation', 'Pasay City', '/uploads/profiles/profile-1765457752741-513353991.jpg', 'Counseling, Clinical Psychology, Mental Health Support, Crisis Intervention', 'Alumni from La Consolacion College Bacolod batch 2020. Graduated with BS Psychology. Currently working as Sales Executive at Megaworld Corporation.', 1, 1, '2025-12-11 12:13:36', '2025-12-11 12:13:36', 'elizabeth@gmail.com', '0916402140', 2020, 'COLLEGE'),
(128, 256, 'Sofia', 'Martinez', NULL, 2021, 'HUMSS', 'Data Analyst', 'SM Investments', 'Mandaluyong City', '/uploads/profiles/profile-1765457714657-461350504.jpg', 'Philosophy, Communication Skills, Creative Writing, Critical Analysis', 'Alumni from La Consolacion College Bacolod batch 2021. Graduated with HUMSS. Currently working as Data Analyst at SM Investments.', 1, 1, '2025-12-11 12:13:36', '2025-12-11 12:13:36', 'sofia@gmail.com', '0930990048', 2021, 'COLLEGE'),
(129, 257, 'Owen', 'Smith', NULL, 2021, 'ICT', 'Product Manager', 'BDO Unibank', 'Manila', '/uploads/profiles/profile-1765457688927-570175261.jpg', 'Network Fundamentals, Digital Graphics, Technical Support, Web Design, Software Applications, Computer Programming', 'Alumni from La Consolacion College Bacolod batch 2021. Graduated with ICT. Currently working as Product Manager at BDO Unibank.', 1, 1, '2025-12-11 12:13:37', '2025-12-11 12:13:37', 'owen@gmail.com', '0970353531', 2021, 'COLLEGE'),
(130, 258, 'Addison', 'Scott', NULL, 2021, 'STEM', 'Senior Developer', 'Google', 'Mandaluyong City', '/uploads/profiles/profile-1765457653264-379527617.jpg', 'Chemistry, Critical Thinking, Scientific Research, Data Analysis, Problem Solving', 'Alumni from La Consolacion College Bacolod batch 2021. Graduated with STEM. Currently working as Senior Developer at Google.', 1, 1, '2025-12-11 12:13:37', '2025-12-11 12:13:37', 'addison@gmail.com', '0923380641', 2021, 'COLLEGE'),
(131, 259, 'Gabriel', 'Adams', NULL, 2021, 'BS Electrical Engineering', 'Project Manager', 'Jollibee Foods Corporation', 'Manila', '/uploads/profiles/profile-1765457631016-188151577.jpg', 'Control Systems, PLC Programming, Electronics, Instrumentation', 'Alumni from La Consolacion College Bacolod batch 2021. Graduated with BS Electrical Engineering. Currently working as Project Manager at Jollibee Foods Corporation.', 1, 1, '2025-12-11 12:13:37', '2025-12-11 12:13:37', 'gabriel@gmail.com', '0925981782', 2021, 'COLLEGE'),
(132, 260, 'Harper', 'Carter', NULL, 2021, 'BS Information Technology', 'DevOps Engineer', 'Microsoft', 'Mandaluyong City', '/uploads/profiles/profile-1765457610359-212590882.jpg', 'Software Testing, Network Administration, Cloud Computing, Database Management, System Analysis', 'Alumni from La Consolacion College Bacolod batch 2021. Graduated with BS Information Technology. Currently working as DevOps Engineer at Microsoft.', 1, 1, '2025-12-11 12:13:37', '2025-12-11 12:13:37', 'harper@gmail.com', '0998583837', 2021, 'COLLEGE'),
(133, 261, 'Chloe', 'Brown', NULL, 2021, 'BS Business Administration', 'Financial Analyst', 'PLDT', 'Mandaluyong City', '/uploads/profiles/profile-1765457536954-831157890.jpg', 'Strategic Planning, Leadership, Operations Management, Financial Analysis, Marketing Management', 'Alumni from La Consolacion College Bacolod batch 2021. Graduated with BS Business Administration. Currently working as Financial Analyst at PLDT.', 1, 1, '2025-12-11 12:13:38', '2025-12-11 12:13:38', 'chloe@gmail.com', '0965732313', 2021, 'COLLEGE'),
(134, 262, 'Anthony', 'Collins', NULL, 2023, 'HUMSS', 'IT Consultant', 'BDO Unibank', 'Las Pinas City', '/uploads/profiles/profile-1765457487319-440280822.jpg', 'Public Speaking, Social Research, Psychology Basics, Communication Skills', 'Alumni from La Consolacion College Bacolod batch 2023. Graduated with HUMSS. Currently working as IT Consultant at BDO Unibank.', 1, 1, '2025-12-11 12:13:38', '2025-12-11 12:13:38', 'anthony@gmail.com', '0914331826', 2023, 'SENIOR_HIGH_SCHOOL'),
(135, 263, 'Sebastian', 'Reyes', NULL, 2023, 'BS Electrical Engineering', 'Project Manager', 'IBM Philippines', 'Manila', '/uploads/profiles/profile-1765457441672-115073065.jpg', 'Circuit Design, Instrumentation, MATLAB, Electronics, Control Systems, Power Systems', 'Alumni from La Consolacion College Bacolod batch 2023. Graduated with BS Electrical Engineering. Currently working as Project Manager at IBM Philippines.', 1, 1, '2025-12-11 12:13:39', '2025-12-11 12:13:39', 'sebastian@gmail.com', '0961157819', 2023, 'SENIOR_HIGH_SCHOOL'),
(136, 264, 'Wyatt', 'Baker', NULL, 2023, 'BS Accountancy', 'Quality Assurance Engineer', 'Jollibee Foods Corporation', 'Muntinlupa City', '/uploads/profiles/profile-1765457417150-341285603.jpg', 'Accounting Software (QuickBooks, SAP), Auditing, Tax Preparation, Cost Accounting, Financial Accounting, Financial Reporting', 'Alumni from La Consolacion College Bacolod batch 2023. Graduated with BS Accountancy. Currently working as Quality Assurance Engineer at Jollibee Foods Corporation.', 1, 1, '2025-12-11 12:13:39', '2025-12-11 12:13:39', 'wyatt@gmail.com', '0964605984', 2023, 'SENIOR_HIGH_SCHOOL'),
(137, 265, 'Lily', 'Nguyen', NULL, 2023, 'BS Information Technology', 'Operations Manager', 'SM Investments', 'Pasig City', '/uploads/profiles/profile-1765455591899-660525160.jpg', 'Cloud Computing, Web Development, Database Management, IT Project Management, Software Testing', 'Alumni from La Consolacion College Bacolod batch 2023. Graduated with BS Information Technology. Currently working as Operations Manager at SM Investments.', 1, 1, '2025-12-11 12:13:39', '2025-12-11 12:13:39', 'lily@gmail.com', '0982284510', 2023, 'SENIOR_HIGH_SCHOOL'),
(138, 266, 'Sophia', 'Green', NULL, 2015, 'HS', 'IT Consultant', 'TechVision Philippines Inc.', 'Makati City', '/uploads/profiles/profile-1765457376621-610364346.jpg', 'Time Management, Team Work, Critical Thinking, Computer Literacy', 'Alumni from La Consolacion College Bacolod batch 2015. Graduated with HS. Currently working as System Administrator at PLDT.', 1, 1, '2025-12-11 12:23:52', '2025-12-11 12:23:52', 'sophia@gmail.com', '0950646443', 2015, 'COLLEGE'),
(139, 267, 'Natalie', 'Jones', NULL, 2019, 'BS Computer Science', 'IT Consultant', 'PLDT', 'Pasig City', '/uploads/profiles/profile-1765457330358-934774938.jpg', 'Mobile App Development, Machine Learning, Artificial Intelligence, Software Engineering, Data Structures', 'Alumni from La Consolacion College Bacolod batch 2019. Graduated with BS Computer Science. Currently working as System Administrator at BDO Unibank.', 1, 1, '2025-12-11 12:23:52', '2025-12-11 12:23:52', 'natalie@gmail.com', '0947191354', 2019, 'SENIOR_HIGH_SCHOOL'),
(140, 268, 'Daniel', 'Evans', NULL, 2019, 'BS Nursing', 'IT Consultant', 'PLDT', 'Taguig City', '/uploads/profiles/profile-1765457266587-310757799.jpg', 'Medication Administration, Patient Care, Clinical Procedures, Emergency Care', 'Alumni from La Consolacion College Bacolod batch 2019. Graduated with BS Nursing. Currently working as Marketing Manager at Globe Telecom.', 1, 1, '2025-12-11 12:23:52', '2025-12-11 12:23:52', 'daniel@gmail.com', '0983130481', 2019, 'SENIOR_HIGH_SCHOOL'),
(141, 269, 'Samuel', 'Rodriguez', NULL, 2020, 'BS Civil Engineering', 'Business Analyst', 'IBM Philippines', 'Quezon City', '/uploads/profiles/profile-1765457234963-151415225.jpg', 'Materials Testing, Project Planning, Structural Design, Construction Management', 'Alumni from La Consolacion College Bacolod batch 2020. Graduated with BS Civil Engineering. Currently working as Business Analyst at TechVision Philippines Inc..', 1, 1, '2025-12-11 12:23:53', '2025-12-11 12:23:53', 'samuel@gmail.com', '0983006303', 2020, 'COLLEGE'),
(142, 270, 'Leo', 'Gomez', NULL, 2021, 'HUMSS', 'System Administrator', 'Globe Telecom', 'Taguig City', '/uploads/profiles/profile-1765457187659-209312389.jpg', 'Social Research, Communication Skills, Psychology Basics, Creative Writing, Public Speaking, Critical Analysis', 'Alumni from La Consolacion College Bacolod batch 2021. Graduated with HUMSS. Currently working as Senior Developer at PLDT.', 1, 1, '2025-12-11 12:23:54', '2025-12-11 12:23:54', 'leo@gmail.com', '0963340311', 2021, 'COLLEGE'),
(143, 271, 'Liam', 'Miller', NULL, 2021, 'GAS', 'Quality Assurance Engineer', 'SM Investments', 'Makati City', '/uploads/profiles/profile-1765457121091-919492460.jpg', 'Problem Solving, Communication, Research, Presentation Skills, Academic Writing', 'Alumni from La Consolacion College Bacolod batch 2021. Graduated with GAS. Currently working as Business Analyst at Google.', 1, 1, '2025-12-11 12:23:54', '2025-12-11 12:23:54', 'liam@gmail.com', '0930803621', 2021, 'COLLEGE'),
(144, 272, 'Amelia', 'Jackson', NULL, 2021, 'BS Electrical Engineering', 'Software Engineer', 'Ayala Corporation', 'Taguig City', '/uploads/profiles/profile-1765457086879-290723903.jpg', 'Circuit Design, Power Systems, MATLAB, Electronics, Control Systems, PLC Programming', 'Alumni from La Consolacion College Bacolod batch 2021. Graduated with BS Electrical Engineering. Currently working as Business Analyst at PLDT.', 1, 1, '2025-12-11 12:23:54', '2025-12-11 12:23:54', 'amelia@gmail.com', '0916167959', 2021, 'COLLEGE'),
(145, 273, 'Alexander', 'Brown', NULL, 2023, 'STEM', 'IT Consultant', 'SM Investments', 'Manila', '/uploads/profiles/profile-1765457060445-435135613.jpg', 'Critical Thinking, Scientific Research, Problem Solving, Mathematics, Laboratory Skills', 'Alumni from La Consolacion College Bacolod batch 2023. Graduated with STEM. Currently working as HR Specialist at Microsoft.', 1, 1, '2025-12-11 12:23:55', '2025-12-11 12:23:55', 'alexander@gmail.com', '0954336453', 2023, 'SENIOR_HIGH_SCHOOL'),
(146, 274, 'Noah', 'Gomez', NULL, 2023, 'ABM', 'Business Analyst', 'SM Investments', 'Taguig City', '/uploads/profiles/profile-1765457012357-993725450.jpg', 'Financial Literacy, Business Communication, Business Analysis, Economics, Accounting Basics, Marketing Fundamentals', 'Alumni from La Consolacion College Bacolod batch 2023. Graduated with ABM. Currently working as System Administrator at TechVision Philippines Inc..', 1, 1, '2025-12-11 12:23:55', '2025-12-11 12:23:55', 'noah@gmail.com', '0999569583', 2023, 'SENIOR_HIGH_SCHOOL'),
(149, 277, 'Jace', 'Randall', NULL, 2025, 'BSN', 'Office Administrator', 'SM Investments Corp.', 'Cebu City', '/uploads/profiles/profile-1765469733316-637859794.png', 'Organization, Multitasking, Written & Verbal Communication, Basic Accounting', NULL, 1, 0, '2025-12-11 16:14:55', '2025-12-11 16:14:55', 'jace@gmail.com', NULL, 2020, 'COLLEGE');

-- --------------------------------------------------------

--
-- Table structure for table `batch_officer`
--

CREATE TABLE `batch_officer` (
  `id` int(11) NOT NULL,
  `alumni_id` int(11) NOT NULL,
  `batch` int(11) NOT NULL,
  `position` varchar(100) NOT NULL,
  `term_start` int(11) DEFAULT NULL,
  `term_end` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `batch_officer`
--

INSERT INTO `batch_officer` (`id`, `alumni_id`, `batch`, `position`, `term_start`, `term_end`, `created_at`, `updated_at`) VALUES
(1, 108, 2014, 'President', 2014, 2014, '2025-12-11 13:33:03', '2025-12-11 13:33:03'),
(2, 104, 2014, 'Vice President', 2014, 2014, '2025-12-11 13:33:03', '2025-12-11 13:33:03'),
(3, 103, 2014, 'Secretary', 2014, 2014, '2025-12-11 13:33:03', '2025-12-11 13:33:03'),
(4, 102, 2014, 'Treasurer', 2014, 2014, '2025-12-11 13:33:03', '2025-12-11 13:33:03'),
(5, 106, 2014, 'Auditor', 2014, 2014, '2025-12-11 13:33:03', '2025-12-11 13:33:03'),
(6, 105, 2014, 'Public Relations Officer', 2014, 2014, '2025-12-11 13:33:03', '2025-12-11 13:33:03'),
(7, 101, 2014, 'Business Manager', 2014, 2014, '2025-12-11 13:33:03', '2025-12-11 13:33:03'),
(9, 113, 2015, 'Vice President', 2015, 2015, '2025-12-11 13:33:03', '2025-12-11 13:33:03'),
(10, 114, 2015, 'Secretary', 2015, 2015, '2025-12-11 13:33:03', '2025-12-11 13:33:03'),
(11, 110, 2015, 'Treasurer', 2015, 2015, '2025-12-11 13:33:03', '2025-12-11 13:33:03'),
(12, 115, 2015, 'Auditor', 2015, 2015, '2025-12-11 13:33:03', '2025-12-11 13:33:03'),
(13, 112, 2015, 'Public Relations Officer', 2015, 2015, '2025-12-11 13:33:03', '2025-12-11 13:33:03'),
(14, 35, 2015, 'Business Manager', 2015, 2015, '2025-12-11 13:33:03', '2025-12-11 13:33:03'),
(15, 140, 2019, 'President', 2019, 2019, '2025-12-11 13:33:03', '2025-12-11 13:33:03'),
(16, 120, 2019, 'Vice President', 2019, 2019, '2025-12-11 13:33:03', '2025-12-11 13:33:03'),
(17, 121, 2019, 'Secretary', 2019, 2019, '2025-12-11 13:33:03', '2025-12-11 13:33:03'),
(18, 139, 2019, 'Treasurer', 2019, 2019, '2025-12-11 13:33:03', '2025-12-11 13:33:03'),
(19, 32, 2019, 'Auditor', 2019, 2019, '2025-12-11 13:33:03', '2025-12-11 13:33:03'),
(20, 117, 2019, 'Public Relations Officer', 2019, 2019, '2025-12-11 13:33:03', '2025-12-11 13:33:03'),
(21, 118, 2019, 'Business Manager', 2019, 2019, '2025-12-11 13:33:03', '2025-12-11 13:33:03'),
(23, 122, 2020, 'Vice President', 2020, 2020, '2025-12-11 13:33:03', '2025-12-11 13:33:03'),
(24, 37, 2020, 'Secretary', 2020, 2020, '2025-12-11 13:33:03', '2025-12-11 13:33:03'),
(25, 124, 2020, 'Treasurer', 2020, 2020, '2025-12-11 13:33:03', '2025-12-11 13:33:03'),
(26, 125, 2020, 'Auditor', 2020, 2020, '2025-12-11 13:33:03', '2025-12-11 13:33:03'),
(27, 126, 2020, 'Public Relations Officer', 2020, 2020, '2025-12-11 13:33:03', '2025-12-11 13:33:03'),
(28, 123, 2020, 'Business Manager', 2020, 2020, '2025-12-11 13:33:03', '2025-12-11 13:33:03'),
(29, 132, 2021, 'President', 2021, 2021, '2025-12-11 13:33:03', '2025-12-11 13:33:03'),
(30, 130, 2021, 'Vice President', 2021, 2021, '2025-12-11 13:33:03', '2025-12-11 13:33:03'),
(31, 128, 2021, 'Secretary', 2021, 2021, '2025-12-11 13:33:03', '2025-12-11 13:33:03'),
(32, 143, 2021, 'Treasurer', 2021, 2021, '2025-12-11 13:33:03', '2025-12-11 13:33:03'),
(33, 38, 2021, 'Auditor', 2021, 2021, '2025-12-11 13:33:03', '2025-12-11 13:33:03'),
(34, 144, 2021, 'Public Relations Officer', 2021, 2021, '2025-12-11 13:33:03', '2025-12-11 13:33:03'),
(35, 131, 2021, 'Business Manager', 2021, 2021, '2025-12-11 13:33:03', '2025-12-11 13:33:03'),
(36, 136, 2023, 'President', 2023, 2023, '2025-12-11 13:33:03', '2025-12-11 13:33:03'),
(37, 146, 2023, 'Vice President', 2023, 2023, '2025-12-11 13:33:03', '2025-12-11 13:33:03'),
(38, 135, 2023, 'Secretary', 2023, 2023, '2025-12-11 13:33:03', '2025-12-11 13:33:03'),
(39, 134, 2023, 'Treasurer', 2023, 2023, '2025-12-11 13:33:03', '2025-12-11 13:33:03'),
(40, 137, 2023, 'Auditor', 2023, 2023, '2025-12-11 13:33:03', '2025-12-11 13:33:03'),
(41, 34, 2023, 'Public Relations Officer', 2023, 2023, '2025-12-11 13:33:03', '2025-12-11 13:33:03'),
(42, 145, 2023, 'Business Manager', 2023, 2023, '2025-12-11 13:33:03', '2025-12-11 13:33:03'),
(43, 111, 2015, 'President', NULL, NULL, '2025-12-11 15:59:56', '2025-12-11 15:59:56'),
(45, 149, 2020, 'President', NULL, NULL, '2025-12-11 16:17:44', '2025-12-11 16:17:44');

-- --------------------------------------------------------

--
-- Table structure for table `career_entry`
--

CREATE TABLE `career_entry` (
  `id` int(11) NOT NULL,
  `alumni_id` int(11) DEFAULT NULL,
  `company` varchar(255) DEFAULT NULL,
  `job_title` varchar(255) DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `description` text DEFAULT NULL,
  `is_current` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `career_entry`
--

INSERT INTO `career_entry` (`id`, `alumni_id`, `company`, `job_title`, `start_date`, `end_date`, `description`, `is_current`) VALUES
(7, 32, 'TechVision Philippines Inc.', 'Senior Software Engineer', '2025-01-15', NULL, 'We are seeking a talented Senior Software Engineer to join our growing team. You will be responsible for developing and maintaining high-quality web applications using modern technologies. Work on exciting projects for international clients in a collaborative and innovative environment.', 1),
(8, 32, 'Manila Digital Solutions', 'Full Stack Developer', '2025-02-01', NULL, 'Join our dynamic team as a Full Stack Developer! We need someone proficient in React, Node.js, and database management. You will work on cutting-edge e-commerce platforms and mobile applications. Competitive salary, HMO benefits, and work-from-home options available.', 1),
(9, 32, 'Philippine Business Analytics Corp.', 'Data Analyst', '2024-12-20', NULL, 'Exciting opportunity for a Data Analyst to work with one of the leading business intelligence firms in the Philippines. Requirements include strong analytical skills, proficiency in Python, SQL, and data visualization tools. Bachelor\'s degree in Computer Science, Statistics, or related field required. Experience with machine learning is a plus.', 1);

-- --------------------------------------------------------

--
-- Table structure for table `donation`
--

CREATE TABLE `donation` (
  `id` int(11) NOT NULL,
  `alumni_id` int(11) DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `date` date DEFAULT NULL,
  `purpose` varchar(255) DEFAULT NULL,
  `image` varchar(255) DEFAULT NULL,
  `category` varchar(100) DEFAULT NULL,
  `goal` decimal(10,2) DEFAULT NULL,
  `description` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `donation`
--

INSERT INTO `donation` (`id`, `alumni_id`, `amount`, `date`, `purpose`, `image`, `category`, `goal`, `description`) VALUES
(7, NULL, 700.00, '2025-11-30', 'Power Our School', '/uploads/donations/donation-1762168196053-4508383.jpg', 'Community', 10000.00, 'Every dollar you give lands straight inside our classrooms—no detours, no fees. Your gift buys microscopes that reveal invisible worlds, laptops that open global doors, and art supplies that turn blank pages into bold voices. It funds the breakfast that wakes up sleepy brains and the bus pass that delivers dreams on time. Together we’re building a school where curiosity never clocks out and every kid gets the tools to write their own epic story. Donate now—watch one gift ignite a thousand futures!'),
(8, NULL, 1000.00, '2025-11-27', 'Build Bright Futures', '/uploads/donations/donation-1763112275997-187642161.jpg', 'Community', 100000.00, 'Join us in empowering the next generation by supporting our school. Your generous donation will help provide essential resources, improve learning facilities, and create opportunities for students to thrive academically and personally. Together, we can build a brighter future for every child.\r\n\r\nIf you want more specific examples or to tailor it for a particular purpose (e.g., scholarships, library, technology), let me know! These suggestions are based on popular and effective fundraising campaign ideas for schools.'),
(9, NULL, 100.00, '2025-11-26', 'Support Students', '/uploads/donations/donation-1763112392564-497137419.jpg', 'Education', 20000.00, 'A support student plays a crucial role in fostering a positive and inclusive educational environment by assisting peers with academic challenges, sharing resources, and offering encouragement. They actively participate in group activities, help classmates understand difficult subjects, and serve as dependable allies to those facing personal or academic difficulties. Beyond peer support, they act as a bridge between students and school staff, helping to address behavioral, emotional, and social challenges through conflict resolution, study skills guidance, and stress management. They also support newcomers, promote positive attitudes, monitor attendance, and advocate for classmates in need, contributing to a safe, caring, and respectful learning environment where every student feels valued and supported. This comprehensive role strengthens community morale and helps ensure student success.'),
(10, NULL, 2000.00, '2025-12-30', 'Support School Supplies for Public Students', '/uploads/donations/donation-1765386930494-411550447.jpg', 'Education', 50000.00, 'Help provide essential school supplies and learning materials for students in our local public school who come from low‑income families. Your donation will be used to buy notebooks, pens, art materials, and other classroom needs so that every learner can participate fully in class. Even small contributions in PHP can already sponsor basic supplies for one child.');

-- --------------------------------------------------------

--
-- Table structure for table `event`
--

CREATE TABLE `event` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `date` date DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `image` varchar(255) DEFAULT NULL,
  `send_notification` tinyint(1) DEFAULT 0,
  `end_date` date DEFAULT NULL,
  `notified_current` tinyint(1) DEFAULT 0,
  `status` enum('UPCOMING','CURRENT','PREVIOUS') DEFAULT 'UPCOMING'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `event`
--

INSERT INTO `event` (`id`, `name`, `description`, `date`, `location`, `created_at`, `updated_at`, `image`, `send_notification`, `end_date`, `notified_current`, `status`) VALUES
(5, 'Family Gathering', 'The Family Gathering is a warm and joyful event where loved ones come together to reconnect, share stories, and create lasting memories. It’s a time to celebrate unity, strengthen bonds, and enjoy each other’s company through great food, laughter, and meaningful conversations. Whether reminiscing about cherished moments or making new ones, this gathering reminds everyone of the importance of family, love, and togetherness.', '2025-11-14', 'Cebu, Philippines', '2025-11-02 14:47:43', '2025-12-11 00:38:51', '/uploads/events/event-1762094863472-356861776.jpg', 0, NULL, 0, 'PREVIOUS'),
(7, 'Cultural Harmony Day', 'Cultural Harmony Day is a vibrant celebration of diversity where students proudly showcase their unique heritage through traditional food, music, dances, and artistic performances. The event transforms the venue into a colorful cultural showcase, featuring booths representing various ethnic groups and regions of the Philippines, as well as international influences. Participants exchange stories, customs, and traditions, creating an atmosphere of unity and mutual respect. Through engaging activities, cultural exhibitions, and collaborative performances, the celebration promotes inclusivity, strengthens community ties, and highlights the beauty of cultural understanding within the school and the wider Bacolod community.', '2025-11-13', 'Bacolod City', '2025-11-02 15:11:07', '2025-12-11 00:38:51', '/uploads/events/event-1762096267365-989356044.png', 0, NULL, 0, 'PREVIOUS'),
(8, 'Innovation Challenge', 'Students work in teams to solve real-world problems by designing creative solutions and prototypes. The event encourages critical thinking, teamwork, and practical application of classroom knowledge, culminating in presentations judged by teachers and community experts.', '2025-11-26', 'Bacolod City', '2025-11-03 11:15:44', '2025-12-11 00:38:51', '/uploads/events/event-1762168544066-661869604.png', 0, NULL, 0, 'PREVIOUS'),
(9, 'BayanFest 2025: A Celebration of Filipino Culture', 'BayanFest 2025 is a vibrant, day-long celebration dedicated to showcasing the heart and soul of Filipino culture. This event brings together artists, musicians, dancers, food vendors, and local entrepreneurs from across the country to create an immersive cultural experience for all ages. Guests can enjoy live performances featuring traditional folk dances and contemporary OPM music, explore interactive art exhibits, join hands-on craft workshops, and discover unique local products at the community marketplace.\r\n\r\nAside from entertainment, BayanFest 2025 also highlights meaningful cultural conversations through mini-talks and demonstrations focusing on Filipino heritage, regional traditions, and modern creative expression. Whether you\'re looking to celebrate national pride, support local talent, or simply enjoy a festive day with friends and family, BayanFest 2025 offers a warm, inclusive atmosphere that truly captures the spirit of the Filipino community.', '2025-11-18', 'Rizal Park Open Grounds, Manila, Philippines', '2025-11-16 05:51:45', '2025-12-11 00:38:51', '/uploads/events/event-1763272305595-965191551.jpg', 0, NULL, 0, 'PREVIOUS'),
(10, 'STEM Career Fair 2025', 'Connect with top tech companies and explore exciting career opportunities in Science, Technology, Engineering, and Mathematics. Representatives from leading Philippine tech firms will be present for on-the-spot interviews.', '2025-12-03', 'LCCB Main Gymnasium', '2025-12-04 03:36:16', '2025-12-11 00:38:51', '/uploads/events/event-1764829248283-188667542.jpg', 0, NULL, 0, 'PREVIOUS'),
(11, 'Leadership Summit: Empowering Tomorrow\'s Leaders', 'Join successful alumni and industry leaders as they share insights on effective leadership, entrepreneurship, and making a positive impact in your community. Includes interactive workshops and networking sessions.', '2025-12-03', 'Conference Hall, Building A', '2025-12-04 03:36:16', '2025-12-11 00:38:51', '/uploads/events/event-1764829269283-502166890.jpg', 0, NULL, 0, 'PREVIOUS'),
(12, 'Alumni Basketball Tournament Finals', 'Cheer for your batch as we crown this year\'s basketball champions! The final match promises to be an exciting showdown. Food stalls and raffle draws throughout the day.', '2025-12-03', 'LCCB Sports Complex', '2025-12-04 03:36:16', '2025-12-11 00:38:51', '/uploads/events/event-1764829303955-723806147.jpg', 0, NULL, 0, 'PREVIOUS'),
(13, 'Digital Marketing Workshop for Entrepreneurs', 'Learn the latest digital marketing strategies and social media techniques to grow your business online. Hands-on training includes SEO, content marketing, Facebook Ads, and Google Analytics. Perfect for startups and small business owners.', '2025-12-04', 'Innovation Lab, Building C', '2025-12-04 03:36:16', '2025-12-11 00:38:51', '/uploads/events/event-1764827898948-930819617.jpg', 0, NULL, 0, 'PREVIOUS'),
(14, 'Education Technology Conference 2025', 'Explore the future of education with EdTech innovations transforming Philippine classrooms. Topics include AI in education, online learning platforms, and gamification. Featuring guest speakers from DepEd and top universities.', '2025-12-10', 'Manila Convention Center', '2025-12-04 03:36:16', '2025-12-11 00:38:51', '/uploads/events/event-1764827917310-254220665.jpg', 0, NULL, 0, 'PREVIOUS'),
(15, 'Grand Alumni Homecoming 2025', 'Reconnect with old friends and celebrate school pride! This year\'s homecoming features cultural performances, batch reunions, campus tours, awarding ceremonies, and a special dinner gala. All batches welcome!', '2025-12-17', 'LCCB Campus Grounds', '2025-12-04 03:36:16', '2025-12-04 13:58:49', '/uploads/events/event-1764827929943-630314357.jpg', 0, NULL, 0, 'UPCOMING'),
(16, 'Bright Minds Expo', 'A day dedicated to celebrating student creativity and innovation through various exhibits, science projects, and interactive workshops that inspire learning and exploration.', '2025-12-05', 'Pahanocoy, Bacolod City', '2025-12-04 06:18:23', '2025-12-11 00:38:51', '/uploads/events/event-1764829103243-621549666.jpg', 0, NULL, 0, 'PREVIOUS'),
(17, 'Future Leaders Summit', 'A motivational event designed to empower students with leadership skills, featuring guest speakers, team-building activities, and opportunities to network with local community leaders.', '2025-12-04', 'Bacolod City', '2025-12-04 09:57:38', '2025-12-11 00:38:51', '/uploads/events/event-1764842258980-435482241.jpg', 0, NULL, 0, 'PREVIOUS'),
(18, 'Green School Initiative Day', 'A hands-on environmental awareness event where students participate in eco-friendly activities, tree planting, recycling drives, and workshops about sustainable living practices.', '2025-12-06', 'Manila', '2025-12-04 12:34:51', '2025-12-11 00:38:51', '/uploads/events/event-1764851691347-802429093.jpg', 0, NULL, 0, 'PREVIOUS'),
(19, 'Green School Initiative Day', 'A hands-on environmental awareness event where students participate in eco-friendly activities, tree planting, recycling drives, and workshops about sustainable living practices.', '2025-12-12', 'Bacolod City', '2025-12-10 15:34:51', '2025-12-14 19:33:02', '/uploads/events/event-1765380891952-220465322.jpg', 1, NULL, 1, 'PREVIOUS'),
(20, 'Sports Spirit Challenge', 'A fun and competitive sports event encouraging teamwork, healthy competition, and school spirit through various games and sports tournaments for all grade levels.', '2025-12-11', 'Makati', '2025-12-10 15:48:37', '2025-12-12 00:06:45', '/uploads/events/event-1765381717322-771654926.jpg', 1, NULL, 1, 'PREVIOUS'),
(21, 'Campus Innovation Fair', 'A showcase where students present their best projects, inventions, and research, allowing the school community to explore creative and practical solutions to real-world problems.', '2025-12-14', 'Mandaluyong City', '2025-12-10 16:07:29', '2025-12-15 09:31:54', '/uploads/events/event-1765382849149-428934455.jpg', 1, NULL, 1, 'PREVIOUS'),
(22, 'Academic Excellence Night', 'An evening program that recognizes outstanding student achievements in academics, featuring awards, student presentations, and messages from teachers and administrators.', '2025-12-12', 'Taguig', '2025-12-10 16:59:31', '2025-12-14 19:33:02', '/uploads/events/event-1765385971619-212591215.jpg', 1, NULL, 1, 'PREVIOUS'),
(23, 'Fun Run', 'run for the enivroment', '2025-12-16', 'Lagoon', '2025-12-15 02:28:16', '2025-12-15 02:28:16', '/uploads/events/event-1765765696946-999158388.jpg', 1, NULL, 0, 'UPCOMING');

-- --------------------------------------------------------

--
-- Table structure for table `event_attendance`
--

CREATE TABLE `event_attendance` (
  `id` int(11) NOT NULL,
  `event_id` int(11) DEFAULT NULL,
  `alumni_id` int(11) DEFAULT NULL,
  `registered_at` datetime DEFAULT current_timestamp(),
  `attended` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `event_attendance`
--

INSERT INTO `event_attendance` (`id`, `event_id`, `alumni_id`, `registered_at`, `attended`) VALUES
(3, 8, 34, '2025-12-04 02:59:47', 0),
(4, 8, 32, '2025-12-04 03:00:30', 0),
(6, 9, 33, '2025-12-04 03:01:19', 0),
(8, 13, 34, '2025-12-04 06:03:58', 0),
(9, 15, 32, '2025-12-04 06:04:45', 0),
(10, 15, 33, '2025-12-04 06:05:05', 0),
(11, 13, 35, '2025-12-04 10:30:04', 0),
(13, 16, 34, '2025-12-04 16:16:47', 0),
(18, 10, 37, '2025-12-10 07:59:55', 0),
(19, 21, 34, '2025-12-10 16:07:48', 0),
(21, 23, 34, '2025-12-15 02:30:25', 0);

-- --------------------------------------------------------

--
-- Table structure for table `event_gallery`
--

CREATE TABLE `event_gallery` (
  `id` int(11) NOT NULL,
  `event_id` int(11) NOT NULL,
  `image` varchar(255) NOT NULL,
  `caption` text DEFAULT NULL,
  `uploaded_by` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `event_gallery`
--

INSERT INTO `event_gallery` (`id`, `event_id`, `image`, `caption`, `uploaded_by`, `created_at`) VALUES
(21, 10, '/uploads/events/gallery/gallery-1764827302509-540788819.jpg', NULL, NULL, '2025-12-04 05:48:22'),
(22, 10, '/uploads/events/gallery/gallery-1764827302514-134722212.jpg', NULL, NULL, '2025-12-04 05:48:22'),
(23, 10, '/uploads/events/gallery/gallery-1764827302507-484243117.jpg', NULL, NULL, '2025-12-04 05:48:22'),
(24, 10, '/uploads/events/gallery/gallery-1764827302527-26928144.jpg', NULL, NULL, '2025-12-04 05:48:22'),
(25, 10, '/uploads/events/gallery/gallery-1764827302520-507295509.jpg', NULL, NULL, '2025-12-04 05:48:22'),
(26, 10, '/uploads/events/gallery/gallery-1765353137406-404851957.jpg', NULL, NULL, '2025-12-10 07:52:17');

-- --------------------------------------------------------

--
-- Table structure for table `google_accounts`
--

CREATE TABLE `google_accounts` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `google_id` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `role` varchar(100) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `picture` varchar(512) DEFAULT NULL,
  `access_token` varchar(1024) DEFAULT NULL,
  `refresh_token` varchar(1024) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `google_accounts`
--

INSERT INTO `google_accounts` (`id`, `user_id`, `google_id`, `email`, `role`, `name`, `picture`, `access_token`, `refresh_token`, `created_at`, `updated_at`) VALUES
(1, NULL, '106222882176085394883', 'lassthemarcc@gmail.com', 'ALUMNI', 'Lass Marcc', 'https://lh3.googleusercontent.com/a/ACg8ocLe1x-zscQ-BgDM7_qanFNOmieXnSiCZ-ms8ZfoxPWy5hzomkY=s96-c', NULL, NULL, '2025-10-16 18:35:25', '2025-12-06 11:04:56'),
(2, NULL, '110438290478071576216', 'lasmarcv2@gmail.com', 'ALUMNI', 'Marc Lorenz Las', 'https://lh3.googleusercontent.com/a/ACg8ocLQv1JoFzpJBaA91DcVUTrClrXsf6NQPmopjrvQHbLwu5jJIfk=s96-c', NULL, NULL, '2025-10-16 18:35:37', '2025-12-04 05:53:47'),
(3, NULL, '118095594280196037410', 'marclorenz.las@lccbonline.edu.ph', 'ALUMNI', 'MARC LORENZ LAS', 'https://lh3.googleusercontent.com/a/ACg8ocI2MjvQZRCSEzVQw1uLlX-NKZBivw-zxGYB13IbH7Ei2Zx3NA=s96-c', NULL, NULL, '2025-10-16 19:38:24', '2025-11-03 18:49:28'),
(4, NULL, '103743841475595774858', 'marclorenzlas@gmail.com', 'ALUMNI', 'Marc lorenz Las', 'https://lh3.googleusercontent.com/a/ACg8ocIt2VKCsN538m_HcvMDhL92ZCDMrRDUp_b9n_NeeeOc6sVXhRTi=s96-c', NULL, NULL, '2025-10-17 08:32:40', '2025-11-03 18:49:28'),
(5, NULL, '105317566082247534223', 'remeataylor@gmail.com', NULL, 'Remea Taylor', 'https://lh3.googleusercontent.com/a/ACg8ocIlrlD0k8FGN69RWVAGOrCER27YGGdt69f4OD3k3YCr-TzL_wE=s96-c', NULL, NULL, '2025-12-03 18:06:12', '2025-12-03 18:06:12'),
(6, NULL, '117167483958376530572', 'marcclassv3@gmail.com', NULL, 'marcclass v3', 'https://lh3.googleusercontent.com/a/ACg8ocJqTGHi_Z2CVKNURqB30tIOucwVSzeMtStyqtZGFuKZkKifrbs=s96-c', NULL, NULL, '2025-12-04 05:53:56', '2025-12-04 05:53:56');

-- --------------------------------------------------------

--
-- Table structure for table `job_posting`
--

CREATE TABLE `job_posting` (
  `id` int(11) NOT NULL,
  `posted_by_alumni_id` int(11) DEFAULT NULL,
  `job_title` varchar(255) NOT NULL,
  `company` varchar(255) NOT NULL,
  `location` varchar(255) DEFAULT NULL,
  `job_type` varchar(50) DEFAULT NULL,
  `salary_range` varchar(100) DEFAULT NULL,
  `requirements` text DEFAULT NULL,
  `description` text DEFAULT NULL,
  `application_deadline` date DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `job_posting`
--

INSERT INTO `job_posting` (`id`, `posted_by_alumni_id`, `job_title`, `company`, `location`, `job_type`, `salary_range`, `requirements`, `description`, `application_deadline`, `created_at`, `updated_at`) VALUES
(4, 32, 'Senior Software Engineer', 'TechVision Philippines Inc.', 'Makati City', 'Full-time', '₱80,000 - ₱120,000', 'Bachelor\'s degree in Computer Science\n5+ years experience in web development\nStrong knowledge of React and Node.js\nExperience with cloud platforms (AWS/Azure)\nExcellent problem-solving skills', 'We are seeking a talented Senior Software Engineer to join our growing team. You will be responsible for developing and maintaining high-quality web applications using modern technologies. Work on exciting projects for international clients in a collaborative and innovative environment. Opportunities for career growth and professional development.', '2025-01-30', '2025-12-04 10:00:59', '2025-12-04 10:00:59'),
(5, 32, 'Full Stack Developer', 'Manila Digital Solutions', 'Manila', 'Remote', '₱60,000 - ₱90,000', 'Bachelor\'s degree in Computer Science or related field\nProficient in React, Node.js, and database management\nExperience with e-commerce platforms\nStrong understanding of RESTful APIs\nMobile application development experience is a plus', 'Join our dynamic team as a Full Stack Developer! We need someone who can work on cutting-edge e-commerce platforms and mobile applications. This is a remote position with flexible working hours. We offer competitive salary, HMO benefits for you and your dependents, annual performance bonuses, and opportunities to work with the latest technologies.', '2025-02-15', '2025-12-04 10:00:59', '2025-12-04 10:00:59'),
(6, 32, 'Data Analyst', 'Philippine Business Analytics Corp.', 'BGC, Taguig', 'Part-time', '₱50,000 - ₱75,000', 'Bachelor\'s degree in Computer Science, Statistics, or related field\nStrong analytical and problem-solving skills\nProficiency in Python, SQL, and data visualization tools (Tableau, Power BI)\nExperience with machine learning algorithms\nExcellent communication and presentation skills', 'Exciting opportunity for a Data Analyst to work with one of the leading business intelligence firms in the Philippines. You will analyze complex datasets, create insightful visualizations, and help drive business decisions. Work with cross-functional teams to identify trends and patterns. Part-time schedule available (20 hours per week) with potential for full-time conversion.', '2025-01-15', '2025-12-04 10:00:59', '2025-12-04 10:00:59');

-- --------------------------------------------------------

--
-- Table structure for table `notification`
--

CREATE TABLE `notification` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `type` enum('EVENT','ACHIEVEMENT','ANNOUNCEMENT','GENERAL') NOT NULL DEFAULT 'GENERAL',
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `event_id` int(11) DEFAULT NULL,
  `link` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `notification`
--

INSERT INTO `notification` (`id`, `user_id`, `type`, `title`, `message`, `is_read`, `created_at`, `event_id`, `link`) VALUES
(41, 40, 'EVENT', 'New Event: Green School Initiative Day', 'A hands-on environmental awareness event where students participate in eco-friendly activities, tree planting, recycling drives, and workshops about sustainable living practices. on 12/12/2025', 0, '2025-12-10 15:34:51', 19, '/events/19'),
(42, 41, 'EVENT', 'New Event: Green School Initiative Day', 'A hands-on environmental awareness event where students participate in eco-friendly activities, tree planting, recycling drives, and workshops about sustainable living practices. on 12/12/2025', 0, '2025-12-10 15:34:51', 19, '/events/19'),
(43, 42, 'EVENT', 'New Event: Green School Initiative Day', 'A hands-on environmental awareness event where students participate in eco-friendly activities, tree planting, recycling drives, and workshops about sustainable living practices. on 12/12/2025', 1, '2025-12-10 15:34:51', 19, '/events/19'),
(44, 43, 'EVENT', 'New Event: Green School Initiative Day', 'A hands-on environmental awareness event where students participate in eco-friendly activities, tree planting, recycling drives, and workshops about sustainable living practices. on 12/12/2025', 0, '2025-12-10 15:34:51', 19, '/events/19'),
(45, 44, 'EVENT', 'New Event: Green School Initiative Day', 'A hands-on environmental awareness event where students participate in eco-friendly activities, tree planting, recycling drives, and workshops about sustainable living practices. on 12/12/2025', 0, '2025-12-10 15:34:51', 19, '/events/19'),
(46, 45, 'EVENT', 'New Event: Green School Initiative Day', 'A hands-on environmental awareness event where students participate in eco-friendly activities, tree planting, recycling drives, and workshops about sustainable living practices. on 12/12/2025', 1, '2025-12-10 15:34:51', 19, '/events/19'),
(47, 46, 'EVENT', 'New Event: Green School Initiative Day', 'A hands-on environmental awareness event where students participate in eco-friendly activities, tree planting, recycling drives, and workshops about sustainable living practices. on 12/12/2025', 0, '2025-12-10 15:34:51', 19, '/events/19'),
(48, 47, 'EVENT', 'New Event: Green School Initiative Day', 'A hands-on environmental awareness event where students participate in eco-friendly activities, tree planting, recycling drives, and workshops about sustainable living practices. on 12/12/2025', 0, '2025-12-10 15:34:51', 19, '/events/19'),
(49, 40, 'EVENT', 'New Event: Sports Spirit Challenge', 'A fun and competitive sports event encouraging teamwork, healthy competition, and school spirit through various games and sports tournaments for all grade levels. on 12/11/2025', 0, '2025-12-10 15:48:37', 20, '/events/20'),
(50, 41, 'EVENT', 'New Event: Sports Spirit Challenge', 'A fun and competitive sports event encouraging teamwork, healthy competition, and school spirit through various games and sports tournaments for all grade levels. on 12/11/2025', 0, '2025-12-10 15:48:37', 20, '/events/20'),
(51, 42, 'EVENT', 'New Event: Sports Spirit Challenge', 'A fun and competitive sports event encouraging teamwork, healthy competition, and school spirit through various games and sports tournaments for all grade levels. on 12/11/2025', 1, '2025-12-10 15:48:37', 20, '/events/20'),
(52, 43, 'EVENT', 'New Event: Sports Spirit Challenge', 'A fun and competitive sports event encouraging teamwork, healthy competition, and school spirit through various games and sports tournaments for all grade levels. on 12/11/2025', 0, '2025-12-10 15:48:37', 20, '/events/20'),
(53, 44, 'EVENT', 'New Event: Sports Spirit Challenge', 'A fun and competitive sports event encouraging teamwork, healthy competition, and school spirit through various games and sports tournaments for all grade levels. on 12/11/2025', 0, '2025-12-10 15:48:37', 20, '/events/20'),
(54, 45, 'EVENT', 'New Event: Sports Spirit Challenge', 'A fun and competitive sports event encouraging teamwork, healthy competition, and school spirit through various games and sports tournaments for all grade levels. on 12/11/2025', 1, '2025-12-10 15:48:37', 20, '/events/20'),
(55, 46, 'EVENT', 'New Event: Sports Spirit Challenge', 'A fun and competitive sports event encouraging teamwork, healthy competition, and school spirit through various games and sports tournaments for all grade levels. on 12/11/2025', 0, '2025-12-10 15:48:37', 20, '/events/20'),
(56, 47, 'EVENT', 'New Event: Sports Spirit Challenge', 'A fun and competitive sports event encouraging teamwork, healthy competition, and school spirit through various games and sports tournaments for all grade levels. on 12/11/2025', 0, '2025-12-10 15:48:37', 20, '/events/20'),
(57, 40, 'EVENT', 'New Event: Campus Innovation Fair', 'A showcase where students present their best projects, inventions, and research, allowing the school community to explore creative and practical solutions to real-world problems. on 12/14/2025', 0, '2025-12-10 16:07:29', 21, '/events/21'),
(58, 41, 'EVENT', 'New Event: Campus Innovation Fair', 'A showcase where students present their best projects, inventions, and research, allowing the school community to explore creative and practical solutions to real-world problems. on 12/14/2025', 0, '2025-12-10 16:07:29', 21, '/events/21'),
(59, 42, 'EVENT', 'New Event: Campus Innovation Fair', 'A showcase where students present their best projects, inventions, and research, allowing the school community to explore creative and practical solutions to real-world problems. on 12/14/2025', 1, '2025-12-10 16:07:29', 21, '/events/21'),
(60, 43, 'EVENT', 'New Event: Campus Innovation Fair', 'A showcase where students present their best projects, inventions, and research, allowing the school community to explore creative and practical solutions to real-world problems. on 12/14/2025', 0, '2025-12-10 16:07:29', 21, '/events/21'),
(61, 44, 'EVENT', 'New Event: Campus Innovation Fair', 'A showcase where students present their best projects, inventions, and research, allowing the school community to explore creative and practical solutions to real-world problems. on 12/14/2025', 0, '2025-12-10 16:07:29', 21, '/events/21'),
(62, 45, 'EVENT', 'New Event: Campus Innovation Fair', 'A showcase where students present their best projects, inventions, and research, allowing the school community to explore creative and practical solutions to real-world problems. on 12/14/2025', 1, '2025-12-10 16:07:29', 21, '/events/21'),
(63, 46, 'EVENT', 'New Event: Campus Innovation Fair', 'A showcase where students present their best projects, inventions, and research, allowing the school community to explore creative and practical solutions to real-world problems. on 12/14/2025', 0, '2025-12-10 16:07:29', 21, '/events/21'),
(64, 47, 'EVENT', 'New Event: Campus Innovation Fair', 'A showcase where students present their best projects, inventions, and research, allowing the school community to explore creative and practical solutions to real-world problems. on 12/14/2025', 0, '2025-12-10 16:07:29', 21, '/events/21'),
(65, 40, 'EVENT', 'Event Now Ongoing: Sports Spirit Challenge', 'Sports Spirit Challenge is now happening! Location: Makati Join us now!', 0, '2025-12-10 16:38:51', 20, '/events/20'),
(66, 41, 'EVENT', 'Event Now Ongoing: Sports Spirit Challenge', 'Sports Spirit Challenge is now happening! Location: Makati Join us now!', 0, '2025-12-10 16:38:51', 20, '/events/20'),
(67, 42, 'EVENT', 'Event Now Ongoing: Sports Spirit Challenge', 'Sports Spirit Challenge is now happening! Location: Makati Join us now!', 1, '2025-12-10 16:38:51', 20, '/events/20'),
(68, 43, 'EVENT', 'Event Now Ongoing: Sports Spirit Challenge', 'Sports Spirit Challenge is now happening! Location: Makati Join us now!', 0, '2025-12-10 16:38:51', 20, '/events/20'),
(69, 44, 'EVENT', 'Event Now Ongoing: Sports Spirit Challenge', 'Sports Spirit Challenge is now happening! Location: Makati Join us now!', 0, '2025-12-10 16:38:51', 20, '/events/20'),
(70, 45, 'EVENT', 'Event Now Ongoing: Sports Spirit Challenge', 'Sports Spirit Challenge is now happening! Location: Makati Join us now!', 1, '2025-12-10 16:38:51', 20, '/events/20'),
(71, 46, 'EVENT', 'Event Now Ongoing: Sports Spirit Challenge', 'Sports Spirit Challenge is now happening! Location: Makati Join us now!', 0, '2025-12-10 16:38:51', 20, '/events/20'),
(72, 47, 'EVENT', 'Event Now Ongoing: Sports Spirit Challenge', 'Sports Spirit Challenge is now happening! Location: Makati Join us now!', 0, '2025-12-10 16:38:51', 20, '/events/20'),
(73, 40, 'EVENT', 'New Event: Academic Excellence Night', 'An evening program that recognizes outstanding student achievements in academics, featuring awards, student presentations, and messages from teachers and administrators. on 12/12/2025', 0, '2025-12-10 16:59:31', 22, '/events/22'),
(74, 41, 'EVENT', 'New Event: Academic Excellence Night', 'An evening program that recognizes outstanding student achievements in academics, featuring awards, student presentations, and messages from teachers and administrators. on 12/12/2025', 0, '2025-12-10 16:59:31', 22, '/events/22'),
(75, 42, 'EVENT', 'New Event: Academic Excellence Night', 'An evening program that recognizes outstanding student achievements in academics, featuring awards, student presentations, and messages from teachers and administrators. on 12/12/2025', 1, '2025-12-10 16:59:31', 22, '/events/22'),
(76, 43, 'EVENT', 'New Event: Academic Excellence Night', 'An evening program that recognizes outstanding student achievements in academics, featuring awards, student presentations, and messages from teachers and administrators. on 12/12/2025', 0, '2025-12-10 16:59:31', 22, '/events/22'),
(77, 44, 'EVENT', 'New Event: Academic Excellence Night', 'An evening program that recognizes outstanding student achievements in academics, featuring awards, student presentations, and messages from teachers and administrators. on 12/12/2025', 0, '2025-12-10 16:59:31', 22, '/events/22'),
(78, 45, 'EVENT', 'New Event: Academic Excellence Night', 'An evening program that recognizes outstanding student achievements in academics, featuring awards, student presentations, and messages from teachers and administrators. on 12/12/2025', 1, '2025-12-10 16:59:31', 22, '/events/22'),
(79, 46, 'EVENT', 'New Event: Academic Excellence Night', 'An evening program that recognizes outstanding student achievements in academics, featuring awards, student presentations, and messages from teachers and administrators. on 12/12/2025', 0, '2025-12-10 16:59:31', 22, '/events/22'),
(80, 47, 'EVENT', 'New Event: Academic Excellence Night', 'An evening program that recognizes outstanding student achievements in academics, featuring awards, student presentations, and messages from teachers and administrators. on 12/12/2025', 0, '2025-12-10 16:59:31', 22, '/events/22'),
(81, 40, 'EVENT', 'Event Now Ongoing: Green School Initiative Day', 'Green School Initiative Day is now happening! Location: Bacolod City Join us now!', 0, '2025-12-11 16:06:45', 19, '/events/19'),
(82, 41, 'EVENT', 'Event Now Ongoing: Green School Initiative Day', 'Green School Initiative Day is now happening! Location: Bacolod City Join us now!', 0, '2025-12-11 16:06:45', 19, '/events/19'),
(83, 42, 'EVENT', 'Event Now Ongoing: Green School Initiative Day', 'Green School Initiative Day is now happening! Location: Bacolod City Join us now!', 0, '2025-12-11 16:06:45', 19, '/events/19'),
(84, 43, 'EVENT', 'Event Now Ongoing: Green School Initiative Day', 'Green School Initiative Day is now happening! Location: Bacolod City Join us now!', 0, '2025-12-11 16:06:45', 19, '/events/19'),
(85, 44, 'EVENT', 'Event Now Ongoing: Green School Initiative Day', 'Green School Initiative Day is now happening! Location: Bacolod City Join us now!', 0, '2025-12-11 16:06:45', 19, '/events/19'),
(86, 45, 'EVENT', 'Event Now Ongoing: Green School Initiative Day', 'Green School Initiative Day is now happening! Location: Bacolod City Join us now!', 1, '2025-12-11 16:06:45', 19, '/events/19'),
(87, 46, 'EVENT', 'Event Now Ongoing: Green School Initiative Day', 'Green School Initiative Day is now happening! Location: Bacolod City Join us now!', 0, '2025-12-11 16:06:45', 19, '/events/19'),
(88, 47, 'EVENT', 'Event Now Ongoing: Green School Initiative Day', 'Green School Initiative Day is now happening! Location: Bacolod City Join us now!', 0, '2025-12-11 16:06:45', 19, '/events/19'),
(89, 228, 'EVENT', 'Event Now Ongoing: Green School Initiative Day', 'Green School Initiative Day is now happening! Location: Bacolod City Join us now!', 0, '2025-12-11 16:06:45', 19, '/events/19'),
(90, 229, 'EVENT', 'Event Now Ongoing: Green School Initiative Day', 'Green School Initiative Day is now happening! Location: Bacolod City Join us now!', 0, '2025-12-11 16:06:45', 19, '/events/19'),
(91, 230, 'EVENT', 'Event Now Ongoing: Green School Initiative Day', 'Green School Initiative Day is now happening! Location: Bacolod City Join us now!', 0, '2025-12-11 16:06:45', 19, '/events/19'),
(92, 231, 'EVENT', 'Event Now Ongoing: Green School Initiative Day', 'Green School Initiative Day is now happening! Location: Bacolod City Join us now!', 0, '2025-12-11 16:06:45', 19, '/events/19'),
(93, 232, 'EVENT', 'Event Now Ongoing: Green School Initiative Day', 'Green School Initiative Day is now happening! Location: Bacolod City Join us now!', 0, '2025-12-11 16:06:45', 19, '/events/19'),
(94, 233, 'EVENT', 'Event Now Ongoing: Green School Initiative Day', 'Green School Initiative Day is now happening! Location: Bacolod City Join us now!', 0, '2025-12-11 16:06:45', 19, '/events/19'),
(95, 234, 'EVENT', 'Event Now Ongoing: Green School Initiative Day', 'Green School Initiative Day is now happening! Location: Bacolod City Join us now!', 0, '2025-12-11 16:06:45', 19, '/events/19'),
(96, 235, 'EVENT', 'Event Now Ongoing: Green School Initiative Day', 'Green School Initiative Day is now happening! Location: Bacolod City Join us now!', 0, '2025-12-11 16:06:45', 19, '/events/19'),
(97, 236, 'EVENT', 'Event Now Ongoing: Green School Initiative Day', 'Green School Initiative Day is now happening! Location: Bacolod City Join us now!', 0, '2025-12-11 16:06:45', 19, '/events/19'),
(98, 237, 'EVENT', 'Event Now Ongoing: Green School Initiative Day', 'Green School Initiative Day is now happening! Location: Bacolod City Join us now!', 0, '2025-12-11 16:06:45', 19, '/events/19'),
(99, 238, 'EVENT', 'Event Now Ongoing: Green School Initiative Day', 'Green School Initiative Day is now happening! Location: Bacolod City Join us now!', 0, '2025-12-11 16:06:45', 19, '/events/19'),
(100, 239, 'EVENT', 'Event Now Ongoing: Green School Initiative Day', 'Green School Initiative Day is now happening! Location: Bacolod City Join us now!', 0, '2025-12-11 16:06:45', 19, '/events/19'),
(101, 240, 'EVENT', 'Event Now Ongoing: Green School Initiative Day', 'Green School Initiative Day is now happening! Location: Bacolod City Join us now!', 0, '2025-12-11 16:06:45', 19, '/events/19'),
(102, 241, 'EVENT', 'Event Now Ongoing: Green School Initiative Day', 'Green School Initiative Day is now happening! Location: Bacolod City Join us now!', 0, '2025-12-11 16:06:45', 19, '/events/19'),
(103, 242, 'EVENT', 'Event Now Ongoing: Green School Initiative Day', 'Green School Initiative Day is now happening! Location: Bacolod City Join us now!', 0, '2025-12-11 16:06:45', 19, '/events/19'),
(104, 243, 'EVENT', 'Event Now Ongoing: Green School Initiative Day', 'Green School Initiative Day is now happening! Location: Bacolod City Join us now!', 0, '2025-12-11 16:06:45', 19, '/events/19'),
(105, 244, 'EVENT', 'Event Now Ongoing: Green School Initiative Day', 'Green School Initiative Day is now happening! Location: Bacolod City Join us now!', 0, '2025-12-11 16:06:45', 19, '/events/19'),
(106, 245, 'EVENT', 'Event Now Ongoing: Green School Initiative Day', 'Green School Initiative Day is now happening! Location: Bacolod City Join us now!', 0, '2025-12-11 16:06:45', 19, '/events/19'),
(107, 246, 'EVENT', 'Event Now Ongoing: Green School Initiative Day', 'Green School Initiative Day is now happening! Location: Bacolod City Join us now!', 0, '2025-12-11 16:06:45', 19, '/events/19'),
(108, 247, 'EVENT', 'Event Now Ongoing: Green School Initiative Day', 'Green School Initiative Day is now happening! Location: Bacolod City Join us now!', 0, '2025-12-11 16:06:45', 19, '/events/19'),
(109, 248, 'EVENT', 'Event Now Ongoing: Green School Initiative Day', 'Green School Initiative Day is now happening! Location: Bacolod City Join us now!', 0, '2025-12-11 16:06:45', 19, '/events/19'),
(110, 249, 'EVENT', 'Event Now Ongoing: Green School Initiative Day', 'Green School Initiative Day is now happening! Location: Bacolod City Join us now!', 0, '2025-12-11 16:06:45', 19, '/events/19'),
(111, 250, 'EVENT', 'Event Now Ongoing: Green School Initiative Day', 'Green School Initiative Day is now happening! Location: Bacolod City Join us now!', 0, '2025-12-11 16:06:45', 19, '/events/19'),
(112, 251, 'EVENT', 'Event Now Ongoing: Green School Initiative Day', 'Green School Initiative Day is now happening! Location: Bacolod City Join us now!', 0, '2025-12-11 16:06:45', 19, '/events/19'),
(113, 252, 'EVENT', 'Event Now Ongoing: Green School Initiative Day', 'Green School Initiative Day is now happening! Location: Bacolod City Join us now!', 0, '2025-12-11 16:06:45', 19, '/events/19'),
(114, 253, 'EVENT', 'Event Now Ongoing: Green School Initiative Day', 'Green School Initiative Day is now happening! Location: Bacolod City Join us now!', 0, '2025-12-11 16:06:45', 19, '/events/19'),
(115, 254, 'EVENT', 'Event Now Ongoing: Green School Initiative Day', 'Green School Initiative Day is now happening! Location: Bacolod City Join us now!', 0, '2025-12-11 16:06:45', 19, '/events/19'),
(116, 255, 'EVENT', 'Event Now Ongoing: Green School Initiative Day', 'Green School Initiative Day is now happening! Location: Bacolod City Join us now!', 0, '2025-12-11 16:06:45', 19, '/events/19'),
(117, 256, 'EVENT', 'Event Now Ongoing: Green School Initiative Day', 'Green School Initiative Day is now happening! Location: Bacolod City Join us now!', 0, '2025-12-11 16:06:45', 19, '/events/19'),
(118, 257, 'EVENT', 'Event Now Ongoing: Green School Initiative Day', 'Green School Initiative Day is now happening! Location: Bacolod City Join us now!', 0, '2025-12-11 16:06:45', 19, '/events/19'),
(119, 258, 'EVENT', 'Event Now Ongoing: Green School Initiative Day', 'Green School Initiative Day is now happening! Location: Bacolod City Join us now!', 0, '2025-12-11 16:06:45', 19, '/events/19'),
(120, 259, 'EVENT', 'Event Now Ongoing: Green School Initiative Day', 'Green School Initiative Day is now happening! Location: Bacolod City Join us now!', 0, '2025-12-11 16:06:45', 19, '/events/19'),
(121, 260, 'EVENT', 'Event Now Ongoing: Green School Initiative Day', 'Green School Initiative Day is now happening! Location: Bacolod City Join us now!', 0, '2025-12-11 16:06:45', 19, '/events/19'),
(122, 261, 'EVENT', 'Event Now Ongoing: Green School Initiative Day', 'Green School Initiative Day is now happening! Location: Bacolod City Join us now!', 0, '2025-12-11 16:06:45', 19, '/events/19'),
(123, 262, 'EVENT', 'Event Now Ongoing: Green School Initiative Day', 'Green School Initiative Day is now happening! Location: Bacolod City Join us now!', 0, '2025-12-11 16:06:45', 19, '/events/19'),
(124, 263, 'EVENT', 'Event Now Ongoing: Green School Initiative Day', 'Green School Initiative Day is now happening! Location: Bacolod City Join us now!', 0, '2025-12-11 16:06:45', 19, '/events/19'),
(125, 264, 'EVENT', 'Event Now Ongoing: Green School Initiative Day', 'Green School Initiative Day is now happening! Location: Bacolod City Join us now!', 0, '2025-12-11 16:06:45', 19, '/events/19'),
(126, 265, 'EVENT', 'Event Now Ongoing: Green School Initiative Day', 'Green School Initiative Day is now happening! Location: Bacolod City Join us now!', 0, '2025-12-11 16:06:45', 19, '/events/19'),
(127, 266, 'EVENT', 'Event Now Ongoing: Green School Initiative Day', 'Green School Initiative Day is now happening! Location: Bacolod City Join us now!', 0, '2025-12-11 16:06:45', 19, '/events/19'),
(128, 267, 'EVENT', 'Event Now Ongoing: Green School Initiative Day', 'Green School Initiative Day is now happening! Location: Bacolod City Join us now!', 0, '2025-12-11 16:06:45', 19, '/events/19'),
(129, 268, 'EVENT', 'Event Now Ongoing: Green School Initiative Day', 'Green School Initiative Day is now happening! Location: Bacolod City Join us now!', 0, '2025-12-11 16:06:45', 19, '/events/19'),
(130, 269, 'EVENT', 'Event Now Ongoing: Green School Initiative Day', 'Green School Initiative Day is now happening! Location: Bacolod City Join us now!', 0, '2025-12-11 16:06:45', 19, '/events/19'),
(131, 270, 'EVENT', 'Event Now Ongoing: Green School Initiative Day', 'Green School Initiative Day is now happening! Location: Bacolod City Join us now!', 0, '2025-12-11 16:06:45', 19, '/events/19'),
(132, 271, 'EVENT', 'Event Now Ongoing: Green School Initiative Day', 'Green School Initiative Day is now happening! Location: Bacolod City Join us now!', 0, '2025-12-11 16:06:45', 19, '/events/19'),
(133, 272, 'EVENT', 'Event Now Ongoing: Green School Initiative Day', 'Green School Initiative Day is now happening! Location: Bacolod City Join us now!', 0, '2025-12-11 16:06:45', 19, '/events/19'),
(134, 273, 'EVENT', 'Event Now Ongoing: Green School Initiative Day', 'Green School Initiative Day is now happening! Location: Bacolod City Join us now!', 0, '2025-12-11 16:06:45', 19, '/events/19'),
(135, 274, 'EVENT', 'Event Now Ongoing: Green School Initiative Day', 'Green School Initiative Day is now happening! Location: Bacolod City Join us now!', 1, '2025-12-11 16:06:45', 19, '/events/19'),
(136, 40, 'EVENT', 'Event Now Ongoing: Academic Excellence Night', 'Academic Excellence Night is now happening! Location: Taguig Join us now!', 0, '2025-12-11 16:06:45', 22, '/events/22'),
(137, 41, 'EVENT', 'Event Now Ongoing: Academic Excellence Night', 'Academic Excellence Night is now happening! Location: Taguig Join us now!', 0, '2025-12-11 16:06:45', 22, '/events/22'),
(138, 42, 'EVENT', 'Event Now Ongoing: Academic Excellence Night', 'Academic Excellence Night is now happening! Location: Taguig Join us now!', 0, '2025-12-11 16:06:45', 22, '/events/22'),
(139, 43, 'EVENT', 'Event Now Ongoing: Academic Excellence Night', 'Academic Excellence Night is now happening! Location: Taguig Join us now!', 0, '2025-12-11 16:06:45', 22, '/events/22'),
(140, 44, 'EVENT', 'Event Now Ongoing: Academic Excellence Night', 'Academic Excellence Night is now happening! Location: Taguig Join us now!', 0, '2025-12-11 16:06:45', 22, '/events/22'),
(141, 45, 'EVENT', 'Event Now Ongoing: Academic Excellence Night', 'Academic Excellence Night is now happening! Location: Taguig Join us now!', 1, '2025-12-11 16:06:45', 22, '/events/22'),
(142, 46, 'EVENT', 'Event Now Ongoing: Academic Excellence Night', 'Academic Excellence Night is now happening! Location: Taguig Join us now!', 0, '2025-12-11 16:06:45', 22, '/events/22'),
(143, 47, 'EVENT', 'Event Now Ongoing: Academic Excellence Night', 'Academic Excellence Night is now happening! Location: Taguig Join us now!', 0, '2025-12-11 16:06:45', 22, '/events/22'),
(144, 228, 'EVENT', 'Event Now Ongoing: Academic Excellence Night', 'Academic Excellence Night is now happening! Location: Taguig Join us now!', 0, '2025-12-11 16:06:45', 22, '/events/22'),
(145, 229, 'EVENT', 'Event Now Ongoing: Academic Excellence Night', 'Academic Excellence Night is now happening! Location: Taguig Join us now!', 0, '2025-12-11 16:06:45', 22, '/events/22'),
(146, 230, 'EVENT', 'Event Now Ongoing: Academic Excellence Night', 'Academic Excellence Night is now happening! Location: Taguig Join us now!', 0, '2025-12-11 16:06:45', 22, '/events/22'),
(147, 231, 'EVENT', 'Event Now Ongoing: Academic Excellence Night', 'Academic Excellence Night is now happening! Location: Taguig Join us now!', 0, '2025-12-11 16:06:45', 22, '/events/22'),
(148, 232, 'EVENT', 'Event Now Ongoing: Academic Excellence Night', 'Academic Excellence Night is now happening! Location: Taguig Join us now!', 0, '2025-12-11 16:06:45', 22, '/events/22'),
(149, 233, 'EVENT', 'Event Now Ongoing: Academic Excellence Night', 'Academic Excellence Night is now happening! Location: Taguig Join us now!', 0, '2025-12-11 16:06:45', 22, '/events/22'),
(150, 234, 'EVENT', 'Event Now Ongoing: Academic Excellence Night', 'Academic Excellence Night is now happening! Location: Taguig Join us now!', 0, '2025-12-11 16:06:45', 22, '/events/22'),
(151, 235, 'EVENT', 'Event Now Ongoing: Academic Excellence Night', 'Academic Excellence Night is now happening! Location: Taguig Join us now!', 0, '2025-12-11 16:06:45', 22, '/events/22'),
(152, 236, 'EVENT', 'Event Now Ongoing: Academic Excellence Night', 'Academic Excellence Night is now happening! Location: Taguig Join us now!', 0, '2025-12-11 16:06:45', 22, '/events/22'),
(153, 237, 'EVENT', 'Event Now Ongoing: Academic Excellence Night', 'Academic Excellence Night is now happening! Location: Taguig Join us now!', 0, '2025-12-11 16:06:45', 22, '/events/22'),
(154, 238, 'EVENT', 'Event Now Ongoing: Academic Excellence Night', 'Academic Excellence Night is now happening! Location: Taguig Join us now!', 0, '2025-12-11 16:06:45', 22, '/events/22'),
(155, 239, 'EVENT', 'Event Now Ongoing: Academic Excellence Night', 'Academic Excellence Night is now happening! Location: Taguig Join us now!', 0, '2025-12-11 16:06:45', 22, '/events/22'),
(156, 240, 'EVENT', 'Event Now Ongoing: Academic Excellence Night', 'Academic Excellence Night is now happening! Location: Taguig Join us now!', 0, '2025-12-11 16:06:45', 22, '/events/22'),
(157, 241, 'EVENT', 'Event Now Ongoing: Academic Excellence Night', 'Academic Excellence Night is now happening! Location: Taguig Join us now!', 0, '2025-12-11 16:06:45', 22, '/events/22'),
(158, 242, 'EVENT', 'Event Now Ongoing: Academic Excellence Night', 'Academic Excellence Night is now happening! Location: Taguig Join us now!', 0, '2025-12-11 16:06:45', 22, '/events/22'),
(159, 243, 'EVENT', 'Event Now Ongoing: Academic Excellence Night', 'Academic Excellence Night is now happening! Location: Taguig Join us now!', 0, '2025-12-11 16:06:45', 22, '/events/22'),
(160, 244, 'EVENT', 'Event Now Ongoing: Academic Excellence Night', 'Academic Excellence Night is now happening! Location: Taguig Join us now!', 0, '2025-12-11 16:06:45', 22, '/events/22'),
(161, 245, 'EVENT', 'Event Now Ongoing: Academic Excellence Night', 'Academic Excellence Night is now happening! Location: Taguig Join us now!', 0, '2025-12-11 16:06:45', 22, '/events/22'),
(162, 246, 'EVENT', 'Event Now Ongoing: Academic Excellence Night', 'Academic Excellence Night is now happening! Location: Taguig Join us now!', 0, '2025-12-11 16:06:45', 22, '/events/22'),
(163, 247, 'EVENT', 'Event Now Ongoing: Academic Excellence Night', 'Academic Excellence Night is now happening! Location: Taguig Join us now!', 0, '2025-12-11 16:06:45', 22, '/events/22'),
(164, 248, 'EVENT', 'Event Now Ongoing: Academic Excellence Night', 'Academic Excellence Night is now happening! Location: Taguig Join us now!', 0, '2025-12-11 16:06:45', 22, '/events/22'),
(165, 249, 'EVENT', 'Event Now Ongoing: Academic Excellence Night', 'Academic Excellence Night is now happening! Location: Taguig Join us now!', 0, '2025-12-11 16:06:45', 22, '/events/22'),
(166, 250, 'EVENT', 'Event Now Ongoing: Academic Excellence Night', 'Academic Excellence Night is now happening! Location: Taguig Join us now!', 0, '2025-12-11 16:06:45', 22, '/events/22'),
(167, 251, 'EVENT', 'Event Now Ongoing: Academic Excellence Night', 'Academic Excellence Night is now happening! Location: Taguig Join us now!', 0, '2025-12-11 16:06:45', 22, '/events/22'),
(168, 252, 'EVENT', 'Event Now Ongoing: Academic Excellence Night', 'Academic Excellence Night is now happening! Location: Taguig Join us now!', 0, '2025-12-11 16:06:45', 22, '/events/22'),
(169, 253, 'EVENT', 'Event Now Ongoing: Academic Excellence Night', 'Academic Excellence Night is now happening! Location: Taguig Join us now!', 0, '2025-12-11 16:06:45', 22, '/events/22'),
(170, 254, 'EVENT', 'Event Now Ongoing: Academic Excellence Night', 'Academic Excellence Night is now happening! Location: Taguig Join us now!', 0, '2025-12-11 16:06:45', 22, '/events/22'),
(171, 255, 'EVENT', 'Event Now Ongoing: Academic Excellence Night', 'Academic Excellence Night is now happening! Location: Taguig Join us now!', 0, '2025-12-11 16:06:45', 22, '/events/22'),
(172, 256, 'EVENT', 'Event Now Ongoing: Academic Excellence Night', 'Academic Excellence Night is now happening! Location: Taguig Join us now!', 0, '2025-12-11 16:06:45', 22, '/events/22'),
(173, 257, 'EVENT', 'Event Now Ongoing: Academic Excellence Night', 'Academic Excellence Night is now happening! Location: Taguig Join us now!', 0, '2025-12-11 16:06:45', 22, '/events/22'),
(174, 258, 'EVENT', 'Event Now Ongoing: Academic Excellence Night', 'Academic Excellence Night is now happening! Location: Taguig Join us now!', 0, '2025-12-11 16:06:45', 22, '/events/22'),
(175, 259, 'EVENT', 'Event Now Ongoing: Academic Excellence Night', 'Academic Excellence Night is now happening! Location: Taguig Join us now!', 0, '2025-12-11 16:06:45', 22, '/events/22'),
(176, 260, 'EVENT', 'Event Now Ongoing: Academic Excellence Night', 'Academic Excellence Night is now happening! Location: Taguig Join us now!', 0, '2025-12-11 16:06:45', 22, '/events/22'),
(177, 261, 'EVENT', 'Event Now Ongoing: Academic Excellence Night', 'Academic Excellence Night is now happening! Location: Taguig Join us now!', 0, '2025-12-11 16:06:45', 22, '/events/22'),
(178, 262, 'EVENT', 'Event Now Ongoing: Academic Excellence Night', 'Academic Excellence Night is now happening! Location: Taguig Join us now!', 0, '2025-12-11 16:06:45', 22, '/events/22'),
(179, 263, 'EVENT', 'Event Now Ongoing: Academic Excellence Night', 'Academic Excellence Night is now happening! Location: Taguig Join us now!', 0, '2025-12-11 16:06:45', 22, '/events/22'),
(180, 264, 'EVENT', 'Event Now Ongoing: Academic Excellence Night', 'Academic Excellence Night is now happening! Location: Taguig Join us now!', 0, '2025-12-11 16:06:45', 22, '/events/22'),
(181, 265, 'EVENT', 'Event Now Ongoing: Academic Excellence Night', 'Academic Excellence Night is now happening! Location: Taguig Join us now!', 0, '2025-12-11 16:06:45', 22, '/events/22'),
(182, 266, 'EVENT', 'Event Now Ongoing: Academic Excellence Night', 'Academic Excellence Night is now happening! Location: Taguig Join us now!', 0, '2025-12-11 16:06:45', 22, '/events/22'),
(183, 267, 'EVENT', 'Event Now Ongoing: Academic Excellence Night', 'Academic Excellence Night is now happening! Location: Taguig Join us now!', 0, '2025-12-11 16:06:45', 22, '/events/22'),
(184, 268, 'EVENT', 'Event Now Ongoing: Academic Excellence Night', 'Academic Excellence Night is now happening! Location: Taguig Join us now!', 0, '2025-12-11 16:06:45', 22, '/events/22'),
(185, 269, 'EVENT', 'Event Now Ongoing: Academic Excellence Night', 'Academic Excellence Night is now happening! Location: Taguig Join us now!', 0, '2025-12-11 16:06:45', 22, '/events/22'),
(186, 270, 'EVENT', 'Event Now Ongoing: Academic Excellence Night', 'Academic Excellence Night is now happening! Location: Taguig Join us now!', 0, '2025-12-11 16:06:45', 22, '/events/22'),
(187, 271, 'EVENT', 'Event Now Ongoing: Academic Excellence Night', 'Academic Excellence Night is now happening! Location: Taguig Join us now!', 0, '2025-12-11 16:06:45', 22, '/events/22'),
(188, 272, 'EVENT', 'Event Now Ongoing: Academic Excellence Night', 'Academic Excellence Night is now happening! Location: Taguig Join us now!', 0, '2025-12-11 16:06:45', 22, '/events/22'),
(189, 273, 'EVENT', 'Event Now Ongoing: Academic Excellence Night', 'Academic Excellence Night is now happening! Location: Taguig Join us now!', 0, '2025-12-11 16:06:45', 22, '/events/22'),
(190, 274, 'EVENT', 'Event Now Ongoing: Academic Excellence Night', 'Academic Excellence Night is now happening! Location: Taguig Join us now!', 1, '2025-12-11 16:06:45', 22, '/events/22'),
(191, 277, 'GENERAL', 'Registration Approved', 'Your registration has been approved! You can now login to your account.', 0, '2025-12-11 16:14:55', NULL, NULL),
(193, 40, 'EVENT', 'Event Now Ongoing: Campus Innovation Fair', 'Campus Innovation Fair is now happening! Location: Mandaluyong City Join us now!', 0, '2025-12-14 11:33:02', 21, '/events/21'),
(194, 41, 'EVENT', 'Event Now Ongoing: Campus Innovation Fair', 'Campus Innovation Fair is now happening! Location: Mandaluyong City Join us now!', 0, '2025-12-14 11:33:02', 21, '/events/21'),
(195, 42, 'EVENT', 'Event Now Ongoing: Campus Innovation Fair', 'Campus Innovation Fair is now happening! Location: Mandaluyong City Join us now!', 0, '2025-12-14 11:33:02', 21, '/events/21'),
(196, 43, 'EVENT', 'Event Now Ongoing: Campus Innovation Fair', 'Campus Innovation Fair is now happening! Location: Mandaluyong City Join us now!', 0, '2025-12-14 11:33:02', 21, '/events/21'),
(197, 44, 'EVENT', 'Event Now Ongoing: Campus Innovation Fair', 'Campus Innovation Fair is now happening! Location: Mandaluyong City Join us now!', 0, '2025-12-14 11:33:02', 21, '/events/21'),
(198, 45, 'EVENT', 'Event Now Ongoing: Campus Innovation Fair', 'Campus Innovation Fair is now happening! Location: Mandaluyong City Join us now!', 1, '2025-12-14 11:33:02', 21, '/events/21'),
(199, 46, 'EVENT', 'Event Now Ongoing: Campus Innovation Fair', 'Campus Innovation Fair is now happening! Location: Mandaluyong City Join us now!', 0, '2025-12-14 11:33:02', 21, '/events/21'),
(200, 47, 'EVENT', 'Event Now Ongoing: Campus Innovation Fair', 'Campus Innovation Fair is now happening! Location: Mandaluyong City Join us now!', 0, '2025-12-14 11:33:02', 21, '/events/21'),
(201, 228, 'EVENT', 'Event Now Ongoing: Campus Innovation Fair', 'Campus Innovation Fair is now happening! Location: Mandaluyong City Join us now!', 0, '2025-12-14 11:33:02', 21, '/events/21'),
(202, 229, 'EVENT', 'Event Now Ongoing: Campus Innovation Fair', 'Campus Innovation Fair is now happening! Location: Mandaluyong City Join us now!', 0, '2025-12-14 11:33:02', 21, '/events/21'),
(203, 230, 'EVENT', 'Event Now Ongoing: Campus Innovation Fair', 'Campus Innovation Fair is now happening! Location: Mandaluyong City Join us now!', 0, '2025-12-14 11:33:02', 21, '/events/21'),
(204, 231, 'EVENT', 'Event Now Ongoing: Campus Innovation Fair', 'Campus Innovation Fair is now happening! Location: Mandaluyong City Join us now!', 0, '2025-12-14 11:33:02', 21, '/events/21'),
(205, 232, 'EVENT', 'Event Now Ongoing: Campus Innovation Fair', 'Campus Innovation Fair is now happening! Location: Mandaluyong City Join us now!', 0, '2025-12-14 11:33:02', 21, '/events/21'),
(206, 233, 'EVENT', 'Event Now Ongoing: Campus Innovation Fair', 'Campus Innovation Fair is now happening! Location: Mandaluyong City Join us now!', 0, '2025-12-14 11:33:02', 21, '/events/21'),
(207, 234, 'EVENT', 'Event Now Ongoing: Campus Innovation Fair', 'Campus Innovation Fair is now happening! Location: Mandaluyong City Join us now!', 0, '2025-12-14 11:33:02', 21, '/events/21'),
(208, 235, 'EVENT', 'Event Now Ongoing: Campus Innovation Fair', 'Campus Innovation Fair is now happening! Location: Mandaluyong City Join us now!', 0, '2025-12-14 11:33:02', 21, '/events/21'),
(209, 236, 'EVENT', 'Event Now Ongoing: Campus Innovation Fair', 'Campus Innovation Fair is now happening! Location: Mandaluyong City Join us now!', 0, '2025-12-14 11:33:02', 21, '/events/21'),
(210, 237, 'EVENT', 'Event Now Ongoing: Campus Innovation Fair', 'Campus Innovation Fair is now happening! Location: Mandaluyong City Join us now!', 0, '2025-12-14 11:33:02', 21, '/events/21'),
(211, 238, 'EVENT', 'Event Now Ongoing: Campus Innovation Fair', 'Campus Innovation Fair is now happening! Location: Mandaluyong City Join us now!', 0, '2025-12-14 11:33:02', 21, '/events/21'),
(212, 239, 'EVENT', 'Event Now Ongoing: Campus Innovation Fair', 'Campus Innovation Fair is now happening! Location: Mandaluyong City Join us now!', 0, '2025-12-14 11:33:02', 21, '/events/21'),
(213, 240, 'EVENT', 'Event Now Ongoing: Campus Innovation Fair', 'Campus Innovation Fair is now happening! Location: Mandaluyong City Join us now!', 0, '2025-12-14 11:33:02', 21, '/events/21'),
(214, 241, 'EVENT', 'Event Now Ongoing: Campus Innovation Fair', 'Campus Innovation Fair is now happening! Location: Mandaluyong City Join us now!', 0, '2025-12-14 11:33:02', 21, '/events/21'),
(215, 242, 'EVENT', 'Event Now Ongoing: Campus Innovation Fair', 'Campus Innovation Fair is now happening! Location: Mandaluyong City Join us now!', 0, '2025-12-14 11:33:02', 21, '/events/21'),
(216, 243, 'EVENT', 'Event Now Ongoing: Campus Innovation Fair', 'Campus Innovation Fair is now happening! Location: Mandaluyong City Join us now!', 0, '2025-12-14 11:33:02', 21, '/events/21'),
(217, 244, 'EVENT', 'Event Now Ongoing: Campus Innovation Fair', 'Campus Innovation Fair is now happening! Location: Mandaluyong City Join us now!', 0, '2025-12-14 11:33:02', 21, '/events/21'),
(218, 245, 'EVENT', 'Event Now Ongoing: Campus Innovation Fair', 'Campus Innovation Fair is now happening! Location: Mandaluyong City Join us now!', 0, '2025-12-14 11:33:02', 21, '/events/21'),
(219, 246, 'EVENT', 'Event Now Ongoing: Campus Innovation Fair', 'Campus Innovation Fair is now happening! Location: Mandaluyong City Join us now!', 0, '2025-12-14 11:33:02', 21, '/events/21'),
(220, 247, 'EVENT', 'Event Now Ongoing: Campus Innovation Fair', 'Campus Innovation Fair is now happening! Location: Mandaluyong City Join us now!', 0, '2025-12-14 11:33:02', 21, '/events/21'),
(221, 248, 'EVENT', 'Event Now Ongoing: Campus Innovation Fair', 'Campus Innovation Fair is now happening! Location: Mandaluyong City Join us now!', 0, '2025-12-14 11:33:02', 21, '/events/21'),
(222, 249, 'EVENT', 'Event Now Ongoing: Campus Innovation Fair', 'Campus Innovation Fair is now happening! Location: Mandaluyong City Join us now!', 0, '2025-12-14 11:33:02', 21, '/events/21'),
(223, 250, 'EVENT', 'Event Now Ongoing: Campus Innovation Fair', 'Campus Innovation Fair is now happening! Location: Mandaluyong City Join us now!', 0, '2025-12-14 11:33:02', 21, '/events/21'),
(224, 251, 'EVENT', 'Event Now Ongoing: Campus Innovation Fair', 'Campus Innovation Fair is now happening! Location: Mandaluyong City Join us now!', 0, '2025-12-14 11:33:02', 21, '/events/21'),
(225, 252, 'EVENT', 'Event Now Ongoing: Campus Innovation Fair', 'Campus Innovation Fair is now happening! Location: Mandaluyong City Join us now!', 0, '2025-12-14 11:33:02', 21, '/events/21'),
(226, 253, 'EVENT', 'Event Now Ongoing: Campus Innovation Fair', 'Campus Innovation Fair is now happening! Location: Mandaluyong City Join us now!', 0, '2025-12-14 11:33:02', 21, '/events/21'),
(227, 254, 'EVENT', 'Event Now Ongoing: Campus Innovation Fair', 'Campus Innovation Fair is now happening! Location: Mandaluyong City Join us now!', 0, '2025-12-14 11:33:02', 21, '/events/21'),
(228, 255, 'EVENT', 'Event Now Ongoing: Campus Innovation Fair', 'Campus Innovation Fair is now happening! Location: Mandaluyong City Join us now!', 0, '2025-12-14 11:33:02', 21, '/events/21'),
(229, 256, 'EVENT', 'Event Now Ongoing: Campus Innovation Fair', 'Campus Innovation Fair is now happening! Location: Mandaluyong City Join us now!', 0, '2025-12-14 11:33:02', 21, '/events/21'),
(230, 257, 'EVENT', 'Event Now Ongoing: Campus Innovation Fair', 'Campus Innovation Fair is now happening! Location: Mandaluyong City Join us now!', 0, '2025-12-14 11:33:02', 21, '/events/21'),
(231, 258, 'EVENT', 'Event Now Ongoing: Campus Innovation Fair', 'Campus Innovation Fair is now happening! Location: Mandaluyong City Join us now!', 0, '2025-12-14 11:33:02', 21, '/events/21'),
(232, 259, 'EVENT', 'Event Now Ongoing: Campus Innovation Fair', 'Campus Innovation Fair is now happening! Location: Mandaluyong City Join us now!', 0, '2025-12-14 11:33:02', 21, '/events/21'),
(233, 260, 'EVENT', 'Event Now Ongoing: Campus Innovation Fair', 'Campus Innovation Fair is now happening! Location: Mandaluyong City Join us now!', 0, '2025-12-14 11:33:02', 21, '/events/21'),
(234, 261, 'EVENT', 'Event Now Ongoing: Campus Innovation Fair', 'Campus Innovation Fair is now happening! Location: Mandaluyong City Join us now!', 0, '2025-12-14 11:33:02', 21, '/events/21'),
(235, 262, 'EVENT', 'Event Now Ongoing: Campus Innovation Fair', 'Campus Innovation Fair is now happening! Location: Mandaluyong City Join us now!', 0, '2025-12-14 11:33:02', 21, '/events/21'),
(236, 263, 'EVENT', 'Event Now Ongoing: Campus Innovation Fair', 'Campus Innovation Fair is now happening! Location: Mandaluyong City Join us now!', 0, '2025-12-14 11:33:02', 21, '/events/21'),
(237, 264, 'EVENT', 'Event Now Ongoing: Campus Innovation Fair', 'Campus Innovation Fair is now happening! Location: Mandaluyong City Join us now!', 0, '2025-12-14 11:33:02', 21, '/events/21'),
(238, 265, 'EVENT', 'Event Now Ongoing: Campus Innovation Fair', 'Campus Innovation Fair is now happening! Location: Mandaluyong City Join us now!', 0, '2025-12-14 11:33:02', 21, '/events/21'),
(239, 266, 'EVENT', 'Event Now Ongoing: Campus Innovation Fair', 'Campus Innovation Fair is now happening! Location: Mandaluyong City Join us now!', 0, '2025-12-14 11:33:02', 21, '/events/21'),
(240, 267, 'EVENT', 'Event Now Ongoing: Campus Innovation Fair', 'Campus Innovation Fair is now happening! Location: Mandaluyong City Join us now!', 0, '2025-12-14 11:33:02', 21, '/events/21'),
(241, 268, 'EVENT', 'Event Now Ongoing: Campus Innovation Fair', 'Campus Innovation Fair is now happening! Location: Mandaluyong City Join us now!', 0, '2025-12-14 11:33:02', 21, '/events/21'),
(242, 269, 'EVENT', 'Event Now Ongoing: Campus Innovation Fair', 'Campus Innovation Fair is now happening! Location: Mandaluyong City Join us now!', 0, '2025-12-14 11:33:02', 21, '/events/21'),
(243, 270, 'EVENT', 'Event Now Ongoing: Campus Innovation Fair', 'Campus Innovation Fair is now happening! Location: Mandaluyong City Join us now!', 0, '2025-12-14 11:33:02', 21, '/events/21'),
(244, 271, 'EVENT', 'Event Now Ongoing: Campus Innovation Fair', 'Campus Innovation Fair is now happening! Location: Mandaluyong City Join us now!', 0, '2025-12-14 11:33:02', 21, '/events/21'),
(245, 272, 'EVENT', 'Event Now Ongoing: Campus Innovation Fair', 'Campus Innovation Fair is now happening! Location: Mandaluyong City Join us now!', 0, '2025-12-14 11:33:02', 21, '/events/21'),
(246, 273, 'EVENT', 'Event Now Ongoing: Campus Innovation Fair', 'Campus Innovation Fair is now happening! Location: Mandaluyong City Join us now!', 0, '2025-12-14 11:33:02', 21, '/events/21'),
(247, 274, 'EVENT', 'Event Now Ongoing: Campus Innovation Fair', 'Campus Innovation Fair is now happening! Location: Mandaluyong City Join us now!', 1, '2025-12-14 11:33:02', 21, '/events/21'),
(248, 277, 'EVENT', 'Event Now Ongoing: Campus Innovation Fair', 'Campus Innovation Fair is now happening! Location: Mandaluyong City Join us now!', 0, '2025-12-14 11:33:02', 21, '/events/21'),
(249, 40, 'EVENT', 'New Event: Fun Run', 'run for the enivroment on 12/16/2025', 0, '2025-12-15 02:28:17', 23, '/events/23'),
(250, 41, 'EVENT', 'New Event: Fun Run', 'run for the enivroment on 12/16/2025', 0, '2025-12-15 02:28:17', 23, '/events/23'),
(251, 42, 'EVENT', 'New Event: Fun Run', 'run for the enivroment on 12/16/2025', 0, '2025-12-15 02:28:17', 23, '/events/23'),
(252, 43, 'EVENT', 'New Event: Fun Run', 'run for the enivroment on 12/16/2025', 0, '2025-12-15 02:28:17', 23, '/events/23'),
(253, 44, 'EVENT', 'New Event: Fun Run', 'run for the enivroment on 12/16/2025', 0, '2025-12-15 02:28:17', 23, '/events/23'),
(254, 45, 'EVENT', 'New Event: Fun Run', 'run for the enivroment on 12/16/2025', 1, '2025-12-15 02:28:17', 23, '/events/23'),
(255, 46, 'EVENT', 'New Event: Fun Run', 'run for the enivroment on 12/16/2025', 0, '2025-12-15 02:28:17', 23, '/events/23'),
(256, 47, 'EVENT', 'New Event: Fun Run', 'run for the enivroment on 12/16/2025', 0, '2025-12-15 02:28:17', 23, '/events/23'),
(257, 228, 'EVENT', 'New Event: Fun Run', 'run for the enivroment on 12/16/2025', 0, '2025-12-15 02:28:17', 23, '/events/23'),
(258, 229, 'EVENT', 'New Event: Fun Run', 'run for the enivroment on 12/16/2025', 0, '2025-12-15 02:28:17', 23, '/events/23'),
(259, 230, 'EVENT', 'New Event: Fun Run', 'run for the enivroment on 12/16/2025', 0, '2025-12-15 02:28:17', 23, '/events/23'),
(260, 231, 'EVENT', 'New Event: Fun Run', 'run for the enivroment on 12/16/2025', 0, '2025-12-15 02:28:17', 23, '/events/23'),
(261, 232, 'EVENT', 'New Event: Fun Run', 'run for the enivroment on 12/16/2025', 0, '2025-12-15 02:28:17', 23, '/events/23'),
(262, 233, 'EVENT', 'New Event: Fun Run', 'run for the enivroment on 12/16/2025', 0, '2025-12-15 02:28:17', 23, '/events/23'),
(263, 234, 'EVENT', 'New Event: Fun Run', 'run for the enivroment on 12/16/2025', 0, '2025-12-15 02:28:17', 23, '/events/23'),
(264, 235, 'EVENT', 'New Event: Fun Run', 'run for the enivroment on 12/16/2025', 0, '2025-12-15 02:28:17', 23, '/events/23'),
(265, 236, 'EVENT', 'New Event: Fun Run', 'run for the enivroment on 12/16/2025', 0, '2025-12-15 02:28:17', 23, '/events/23'),
(266, 237, 'EVENT', 'New Event: Fun Run', 'run for the enivroment on 12/16/2025', 0, '2025-12-15 02:28:17', 23, '/events/23'),
(267, 238, 'EVENT', 'New Event: Fun Run', 'run for the enivroment on 12/16/2025', 0, '2025-12-15 02:28:17', 23, '/events/23'),
(268, 239, 'EVENT', 'New Event: Fun Run', 'run for the enivroment on 12/16/2025', 0, '2025-12-15 02:28:17', 23, '/events/23'),
(269, 240, 'EVENT', 'New Event: Fun Run', 'run for the enivroment on 12/16/2025', 0, '2025-12-15 02:28:17', 23, '/events/23'),
(270, 241, 'EVENT', 'New Event: Fun Run', 'run for the enivroment on 12/16/2025', 0, '2025-12-15 02:28:17', 23, '/events/23'),
(271, 242, 'EVENT', 'New Event: Fun Run', 'run for the enivroment on 12/16/2025', 0, '2025-12-15 02:28:17', 23, '/events/23'),
(272, 243, 'EVENT', 'New Event: Fun Run', 'run for the enivroment on 12/16/2025', 0, '2025-12-15 02:28:17', 23, '/events/23'),
(273, 244, 'EVENT', 'New Event: Fun Run', 'run for the enivroment on 12/16/2025', 0, '2025-12-15 02:28:17', 23, '/events/23'),
(274, 245, 'EVENT', 'New Event: Fun Run', 'run for the enivroment on 12/16/2025', 0, '2025-12-15 02:28:17', 23, '/events/23'),
(275, 246, 'EVENT', 'New Event: Fun Run', 'run for the enivroment on 12/16/2025', 0, '2025-12-15 02:28:17', 23, '/events/23'),
(276, 247, 'EVENT', 'New Event: Fun Run', 'run for the enivroment on 12/16/2025', 0, '2025-12-15 02:28:17', 23, '/events/23'),
(277, 248, 'EVENT', 'New Event: Fun Run', 'run for the enivroment on 12/16/2025', 0, '2025-12-15 02:28:17', 23, '/events/23'),
(278, 249, 'EVENT', 'New Event: Fun Run', 'run for the enivroment on 12/16/2025', 0, '2025-12-15 02:28:17', 23, '/events/23'),
(279, 250, 'EVENT', 'New Event: Fun Run', 'run for the enivroment on 12/16/2025', 0, '2025-12-15 02:28:17', 23, '/events/23'),
(280, 251, 'EVENT', 'New Event: Fun Run', 'run for the enivroment on 12/16/2025', 0, '2025-12-15 02:28:17', 23, '/events/23'),
(281, 252, 'EVENT', 'New Event: Fun Run', 'run for the enivroment on 12/16/2025', 0, '2025-12-15 02:28:17', 23, '/events/23'),
(282, 253, 'EVENT', 'New Event: Fun Run', 'run for the enivroment on 12/16/2025', 0, '2025-12-15 02:28:17', 23, '/events/23'),
(283, 254, 'EVENT', 'New Event: Fun Run', 'run for the enivroment on 12/16/2025', 0, '2025-12-15 02:28:17', 23, '/events/23'),
(284, 255, 'EVENT', 'New Event: Fun Run', 'run for the enivroment on 12/16/2025', 0, '2025-12-15 02:28:17', 23, '/events/23'),
(285, 256, 'EVENT', 'New Event: Fun Run', 'run for the enivroment on 12/16/2025', 0, '2025-12-15 02:28:17', 23, '/events/23'),
(286, 257, 'EVENT', 'New Event: Fun Run', 'run for the enivroment on 12/16/2025', 0, '2025-12-15 02:28:17', 23, '/events/23'),
(287, 258, 'EVENT', 'New Event: Fun Run', 'run for the enivroment on 12/16/2025', 0, '2025-12-15 02:28:17', 23, '/events/23'),
(288, 259, 'EVENT', 'New Event: Fun Run', 'run for the enivroment on 12/16/2025', 0, '2025-12-15 02:28:17', 23, '/events/23'),
(289, 260, 'EVENT', 'New Event: Fun Run', 'run for the enivroment on 12/16/2025', 0, '2025-12-15 02:28:17', 23, '/events/23'),
(290, 261, 'EVENT', 'New Event: Fun Run', 'run for the enivroment on 12/16/2025', 0, '2025-12-15 02:28:17', 23, '/events/23'),
(291, 262, 'EVENT', 'New Event: Fun Run', 'run for the enivroment on 12/16/2025', 0, '2025-12-15 02:28:17', 23, '/events/23'),
(292, 263, 'EVENT', 'New Event: Fun Run', 'run for the enivroment on 12/16/2025', 0, '2025-12-15 02:28:17', 23, '/events/23'),
(293, 264, 'EVENT', 'New Event: Fun Run', 'run for the enivroment on 12/16/2025', 0, '2025-12-15 02:28:17', 23, '/events/23'),
(294, 265, 'EVENT', 'New Event: Fun Run', 'run for the enivroment on 12/16/2025', 0, '2025-12-15 02:28:17', 23, '/events/23'),
(295, 266, 'EVENT', 'New Event: Fun Run', 'run for the enivroment on 12/16/2025', 0, '2025-12-15 02:28:17', 23, '/events/23'),
(296, 267, 'EVENT', 'New Event: Fun Run', 'run for the enivroment on 12/16/2025', 0, '2025-12-15 02:28:17', 23, '/events/23'),
(297, 268, 'EVENT', 'New Event: Fun Run', 'run for the enivroment on 12/16/2025', 0, '2025-12-15 02:28:17', 23, '/events/23'),
(298, 269, 'EVENT', 'New Event: Fun Run', 'run for the enivroment on 12/16/2025', 0, '2025-12-15 02:28:17', 23, '/events/23'),
(299, 270, 'EVENT', 'New Event: Fun Run', 'run for the enivroment on 12/16/2025', 0, '2025-12-15 02:28:17', 23, '/events/23'),
(300, 271, 'EVENT', 'New Event: Fun Run', 'run for the enivroment on 12/16/2025', 0, '2025-12-15 02:28:17', 23, '/events/23'),
(301, 272, 'EVENT', 'New Event: Fun Run', 'run for the enivroment on 12/16/2025', 0, '2025-12-15 02:28:17', 23, '/events/23'),
(302, 273, 'EVENT', 'New Event: Fun Run', 'run for the enivroment on 12/16/2025', 0, '2025-12-15 02:28:17', 23, '/events/23'),
(303, 274, 'EVENT', 'New Event: Fun Run', 'run for the enivroment on 12/16/2025', 1, '2025-12-15 02:28:17', 23, '/events/23'),
(304, 277, 'EVENT', 'New Event: Fun Run', 'run for the enivroment on 12/16/2025', 0, '2025-12-15 02:28:17', 23, '/events/23');

-- --------------------------------------------------------

--
-- Table structure for table `pending_registration`
--

CREATE TABLE `pending_registration` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `username` varchar(100) NOT NULL,
  `profile_image` varchar(255) DEFAULT NULL,
  `status` enum('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `rejected_reason` text DEFAULT NULL,
  `batch` int(11) DEFAULT NULL,
  `course` varchar(100) DEFAULT NULL,
  `graduation_year` int(11) DEFAULT NULL,
  `level` enum('COLLEGE','HIGH_SCHOOL','SENIOR_HIGH_SCHOOL') DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `pending_registration`
--

INSERT INTO `pending_registration` (`id`, `email`, `password`, `username`, `profile_image`, `status`, `created_at`, `updated_at`, `rejected_reason`, `batch`, `course`, `graduation_year`, `level`) VALUES
(28, 'archer@gmail.com', '$2a$10$iE7..CRvWBMy.U0ShFRjJuDoZDpFbprN0l.d6TaSSkPJrJ3PfD/qe', 'Archer Fox', NULL, 'REJECTED', '2025-12-11 16:33:18', '2025-12-11 16:34:00', 'Registration rejected by admin', 2021, 'AB-POLSCI', 2023, 'COLLEGE');

-- --------------------------------------------------------

--
-- Table structure for table `social_link`
--

CREATE TABLE `social_link` (
  `id` int(11) NOT NULL,
  `alumni_id` int(11) DEFAULT NULL,
  `platform` varchar(100) DEFAULT NULL,
  `url` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `social_link`
--

INSERT INTO `social_link` (`id`, `alumni_id`, `platform`, `url`) VALUES
(1, 34, 'Facebook', 'https://www.facebook.com/'),
(2, 34, 'YouTube', 'https://www.youtube.com/'),
(3, 37, 'Other', 'https://mail.google.com/mail/u/0/#inbox'),
(4, 37, 'YouTube', 'https://www.youtube.com/'),
(5, 37, 'Instagram', 'https://www.instagram.com/'),
(6, 149, 'Instagram', 'https://www.instagram.com/'),
(7, 149, 'Facebook', 'https://www.facebook.com/'),
(8, 146, 'Facebook', 'https://www.facebook.com/'),
(9, 146, 'Instagram', 'https://www.instagram.com/');

-- --------------------------------------------------------

--
-- Table structure for table `teacher`
--

CREATE TABLE `teacher` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `username` varchar(100) DEFAULT NULL,
  `department` varchar(100) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `profile_image` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `teacher`
--

INSERT INTO `teacher` (`id`, `email`, `username`, `department`, `password`, `profile_image`, `created_at`, `updated_at`) VALUES
(7, 'solomon@lccbonline.com', 'Solomon Bailey', 'Administration', '$2a$10$wCl7GTw1p1xSBdcSggu/jORaYh.K3bNIgVYiKQQe7wpQr36uzXiB6', '/uploads/profiles/profile-1764753589635-376750723.jpg', '2025-11-14 04:42:32', '2025-12-03 21:29:39'),
(11, 'ainhoa@lccbonline.com', 'Ainhoa Preston', 'Tourism Management', '$2a$10$O9R8Et1KVPU5nM2IkA86Du.XMwY1VNBm4532PH0FxZjixgqbYaqem', NULL, '2025-12-03 13:40:10', '2025-12-03 13:40:10'),
(12, 'zora@lccbonline.com', 'Zora Logan', 'Administration', '$2a$10$oEnCYU9OWLtLY0sIl.gb4Ovk5Xtn2vKm9JCXFLkxu67NxgQeWDcOW', '/uploads/profiles/profile-1764799360808-103636639.jpg', '2025-12-03 13:41:37', '2025-12-04 06:02:40');

-- --------------------------------------------------------

--
-- Table structure for table `user`
--

CREATE TABLE `user` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) DEFAULT NULL,
  `username` varchar(100) DEFAULT NULL,
  `profile_image` varchar(255) DEFAULT NULL,
  `role` enum('ADMIN','ALUMNI','STAFF') DEFAULT 'ALUMNI',
  `approval_status` enum('PENDING','APPROVED','REJECTED') DEFAULT 'PENDING',
  `is_active` tinyint(1) DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_blocked` tinyint(1) DEFAULT 0,
  `notification_enabled` tinyint(1) DEFAULT 1,
  `notification_prompt_shown` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user`
--

INSERT INTO `user` (`id`, `email`, `password`, `username`, `profile_image`, `role`, `approval_status`, `is_active`, `created_at`, `updated_at`, `is_blocked`, `notification_enabled`, `notification_prompt_shown`) VALUES
(40, 'kendra@gmail.com', '$2a$10$st7G35Wiv6RjQRme/mpT8.hUBc6bCQAm.pDeX16ET9JPu.u.560nO', 'Kendra Vaughn', '/uploads/profiles/profile-1764816633378-796648438.jpg', 'ALUMNI', 'APPROVED', 1, '2025-12-04 01:26:42', '2025-12-04 10:50:33', 0, 1, 0),
(41, 'lucas@gmail.com', '$2a$10$jKmTet9WDyXP/qQnu.ZDdeGw5Ic5Brh8gjJBo2UlByEB9iauIbtTW', 'Lucas McIntyre', '/uploads/profiles/profile-1764816812292-266714976.jpg', 'ALUMNI', 'APPROVED', 1, '2025-12-04 02:52:34', '2025-12-04 10:53:32', 0, 1, 0),
(42, 'marc@gmail.com', '$2a$10$GKnUIr4wjZy9RxgAPt2U7.4S6.aYFe8hkzt.SSR6umCa.iv5Yymw2', 'Marc Lorenz Las', '/uploads/profiles/profile-1764817148977-274096164.jpg', 'ALUMNI', 'APPROVED', 1, '2025-12-04 02:58:15', '2025-12-10 23:29:24', 0, 1, 1),
(43, 'brielle@gmail.com', '$2a$10$9t6hJ9d6FZeJkiWsOFFFmefEKsciVu4ghdXCl8cEfk2xMtHijug5C', 'Brielle Dawson', '/uploads/profiles/profile-1764844183760-49924905.jpg', 'ALUMNI', 'APPROVED', 1, '2025-12-04 10:27:18', '2025-12-04 18:29:43', 0, 1, 0),
(44, 'oscar@gmail.com', '$2a$10$sFZESC/oVmkie8JoerPPjupw206inLQtM/B26NctLzJpfr1hxNG/.', 'Oscar Hartman', '/uploads/profiles/profile-1764992669769-720462854.jpg', 'ALUMNI', 'APPROVED', 1, '2025-12-06 03:41:22', '2025-12-06 11:44:29', 0, 1, 0),
(45, 'vj@gmail.com', '$2a$10$VM2BiRMvQVbZEqWnCCa6auD5Seb8KbSlTJ0pxCaGieZwClEl4Hxeq', 'VJ Javellana', '/uploads/profiles/profile-1765353050676-257480606.jpg', 'ALUMNI', 'APPROVED', 1, '2025-12-07 09:39:50', '2025-12-11 01:00:11', 0, 1, 1),
(46, 'alaine@gmail.com', '$2a$10$pDQOA4.sL07i0Gd0x0s9m.qDY4dizdIbHfkmpsLvOjPmPrQf8xnae', 'Alaina Russo', '/uploads/profiles/profile-1765149231606-932198265.png', 'ALUMNI', 'APPROVED', 1, '2025-12-07 23:13:07', '2025-12-08 07:13:51', 0, 1, 0),
(47, 'joey@gmail.com', '$2a$10$HD1rZGXJCwzAE2FzP4G3nea5KkhFu0VMCXtk702ZwvJilQif5gU6i', 'joey Abunan', '/uploads/profiles/profile-1765355295328-508656422.jpg', 'ALUMNI', 'APPROVED', 1, '2025-12-10 08:26:29', '2025-12-10 16:28:57', 0, 1, 0),
(228, 'mia@gmail.com', '$2a$10$EROnxfka1lGzBb6h6R4kP.5Sfyz06tJZ0QE8N25flSliSU2J8vC9m', 'Mia Reyes', '/uploads/profiles/profile-1765458326609-149123256.jpg', 'ALUMNI', 'APPROVED', 1, '2025-12-11 12:13:29', '2025-12-11 21:05:26', 0, 1, 1),
(229, 'joseph@gmail.com', '$2a$10$ki4c/Lj7LJw.SxNfi9Eut.Hz.c9adNBc1RRgy.Zc1K3/MLj8c3422', 'Joseph Diaz', '/uploads/profiles/profile-1765458779144-893215765.jpg', 'ALUMNI', 'APPROVED', 1, '2025-12-11 12:13:29', '2025-12-11 21:12:59', 0, 1, 1),
(230, 'jack@gmail.com', '$2a$10$UigDDtYtpWZhoNRnilHp2us2Z/GhtHTsbpF9skz10vhtZuDwKX1aK', 'Jack Anderson', '/uploads/profiles/profile-1765458751545-126677729.jpg', 'ALUMNI', 'APPROVED', 1, '2025-12-11 12:13:29', '2025-12-11 21:12:31', 0, 1, 1),
(231, 'ethan@gmail.com', '$2a$10$tZrvJe5qHQrfA1VpCOTpZO4J.i/RKtWpaHJdacTim/HrlsCXSsTk6', 'Ethan Parker', '/uploads/profiles/profile-1765458719331-173179484.jpg', 'ALUMNI', 'APPROVED', 1, '2025-12-11 12:13:30', '2025-12-11 21:11:59', 0, 1, 1),
(232, 'isaac@gmail.com', '$2a$10$VauwN7Nd30SuWyi/TqB60uuRjl78eDzWU3G62W3fbTZld38fDF.NC', 'Isaac King', '/uploads/profiles/profile-1765458689827-764728952.jpg', 'ALUMNI', 'APPROVED', 1, '2025-12-11 12:13:30', '2025-12-11 21:11:29', 0, 1, 1),
(233, 'layla@gmail.com', '$2a$10$xyZAJ8Jx32v4FxYl2etxNeFJo/EWUHk.dqYfM5c6ZR/HisFMMBqkS', 'Layla Green', '/uploads/profiles/profile-1765458353825-581563429.jpg', 'ALUMNI', 'APPROVED', 1, '2025-12-11 12:13:30', '2025-12-11 21:05:53', 0, 1, 1),
(234, 'olivia@gmail.com', '$2a$10$jwGkts5cKEoJTMLiV.WdreCyQXpUirEuURBUTMevSgPj7I8UMN68G', 'Olivia Baker', '/uploads/profiles/profile-1765458401922-996070413.jpg', 'ALUMNI', 'APPROVED', 1, '2025-12-11 12:13:30', '2025-12-11 21:06:41', 0, 1, 1),
(235, 'ella@gmail.com', '$2a$10$xM.dlmDzeT9mi8HYC3Up2OyTXFk4Iq1uG/kCRRu3gfVhdUU3tNO3.', 'Ella Sanchez', '/uploads/profiles/profile-1765458376106-320029603.jpg', 'ALUMNI', 'APPROVED', 1, '2025-12-11 12:13:31', '2025-12-11 21:06:16', 0, 1, 1),
(236, 'emily@gmail.com', '$2a$10$FLnPQtdnsZx1xkPuz0chYOOC2IuCOYOssE9I1MXB9F.YXq.H2OXjG', 'Emily Flores', '/uploads/profiles/profile-1765458534631-531015773.jpg', 'ALUMNI', 'APPROVED', 1, '2025-12-11 12:13:31', '2025-12-11 21:08:54', 0, 1, 1),
(237, 'aiden@gmail.com', '$2a$10$v0YMNT3eAk9XRRYOCQRPsuCTSeDi2CkNTxXXLC4.bqHjSWhWXh3X6', 'Aiden Phillips', '/uploads/profiles/profile-1765458661171-135182328.jpg', 'ALUMNI', 'APPROVED', 1, '2025-12-11 12:13:31', '2025-12-11 21:11:01', 0, 1, 1),
(238, 'aubrey@gmail.com', '$2a$10$R3pANMcUH8ZDUbjL5zDce.U1lbs0dVY8NWvie.ToxhNQjGqcRL42q', 'Aubrey Taylor', '/uploads/profiles/profile-1765458637427-531092293.jpg', 'ALUMNI', 'APPROVED', 1, '2025-12-11 12:13:31', '2025-12-11 21:10:37', 0, 1, 1),
(239, 'zoey@gmail.com', '$2a$10$oP.zOGOxfxAz9vFyTLg7oe0mqqzOgwlOPTpf4WDoCB13ZTYbR4nMq', 'Zoey Allen', '/uploads/profiles/profile-1765458606639-168395860.jpg', 'ALUMNI', 'APPROVED', 1, '2025-12-11 12:13:31', '2025-12-11 21:10:06', 0, 1, 1),
(240, 'lincoln@gmail.com', '$2a$10$KHeornoccVYACxbEHP3XK.XqIERerwNEVDW1qSKuZxKPobvWFDN2C', 'Lincoln Adams', '/uploads/profiles/profile-1765458585647-639757807.jpg', 'ALUMNI', 'APPROVED', 1, '2025-12-11 12:13:32', '2025-12-11 21:09:45', 0, 1, 1),
(241, 'luke@gmail.com', '$2a$10$lp0720vlIVXykKoTeZ.oAuKOJBFqvcXedIodblh/eyGkakBDOKm6W', 'Luke Gonzalez', '/uploads/profiles/profile-1765458560063-320313593.jpg', 'ALUMNI', 'APPROVED', 1, '2025-12-11 12:13:32', '2025-12-11 21:09:20', 0, 1, 1),
(242, 'avery@gmail.com', '$2a$10$5Jo2zOkwfDU3HDXQYaMuiubQo2OjuaWjI3cvC9i7Lzq9euAnFRXWq', 'Avery Hill', '/uploads/profiles/profile-1765458301513-76467820.jpg', 'ALUMNI', 'APPROVED', 1, '2025-12-11 12:13:32', '2025-12-11 21:05:01', 0, 1, 1),
(243, 'grace@gmail.com', '$2a$10$3Qt6hUGey5hLbIKx0FE/JOYJeh55tYc22kaXyheTioW0bcSf.pBU2', 'Grace Rodriguez', '/uploads/profiles/profile-1765456951150-528597722.png', 'ALUMNI', 'APPROVED', 1, '2025-12-11 12:13:32', '2025-12-11 20:42:31', 0, 1, 1),
(244, 'mason@gmail.com', '$2a$10$vY6igJM1EI47Bs3PseJOYesPM15Nh9KnF9DWpL3jj6S6Wghu79H.m', 'Mason Reyes', '/uploads/profiles/profile-1765458276969-735275203.jpg', 'ALUMNI', 'APPROVED', 1, '2025-12-11 12:13:32', '2025-12-11 21:04:36', 0, 1, 1),
(245, 'charlotte@gmail.com', '$2a$10$a4lDxSZXurld/Fk.JzTTqOEqBL34EY7U5OyA7T9ugX/2J9LKYkjEO', 'Charlotte Evans', '/uploads/profiles/profile-1765458246625-244008657.jpg', 'ALUMNI', 'APPROVED', 1, '2025-12-11 12:13:33', '2025-12-11 21:04:06', 0, 1, 1),
(246, 'david@gmail.com', '$2a$10$wpxUak/5BsNEHlMwSxcZsuLCyOGCMfyHgnnISNBZv5Od0LsQcSnE2', 'David Baker', '/uploads/profiles/profile-1765458221153-937585322.jpg', 'ALUMNI', 'APPROVED', 1, '2025-12-11 12:13:33', '2025-12-11 21:03:41', 0, 1, 1),
(247, 'dylan@gmail.com', '$2a$10$AIhFzX.5vUZ3.YC0uMi..OtIqpgU/k13ERNOBw/JNS5qfw2a2ra7a', 'Dylan Hill', '/uploads/profiles/profile-1765458183426-488202043.jpg', 'ALUMNI', 'APPROVED', 1, '2025-12-11 12:13:33', '2025-12-11 21:03:03', 0, 1, 1),
(248, 'lillian@gmail.com', '$2a$10$9WjlXuIUf/vCA6bQwdUzW.wZGE5IRZaRrGdqD3mAqSe/0NVbwfcXy', 'Lillian Rodriguez', '/uploads/profiles/profile-1765458158993-988051077.jpg', 'ALUMNI', 'APPROVED', 1, '2025-12-11 12:13:34', '2025-12-11 21:02:38', 0, 1, 1),
(249, 'evelyn@gmail.com', '$2a$10$iRhC/t..3MFMntHFG2VxzOvgM/Fd9w0bLWOi3hW.nSsQLgHS8BOCC', 'Evelyn Smith', '/uploads/profiles/profile-1765457897747-202297415.jpg', 'ALUMNI', 'APPROVED', 1, '2025-12-11 12:13:34', '2025-12-11 20:58:17', 0, 1, 1),
(250, 'jackson@gmail.com', '$2a$10$Mn1waU89c.tkpXGixUTTHO/arnfTm8j/waEw6kyGDc2XMsF/7mE0S', 'Jackson Young', '/uploads/profiles/profile-1765458123043-66297518.jpg', 'ALUMNI', 'APPROVED', 1, '2025-12-11 12:13:34', '2025-12-11 21:02:03', 0, 1, 1),
(251, 'riley@gmail.com', '$2a$10$pQoAetMIla9PnczsPCKpPup3bdkkZnboqOMIwt.3xYSKp.oWb/Jve', 'Riley Wilson', '/uploads/profiles/profile-1765458097123-777791291.jpg', 'ALUMNI', 'APPROVED', 1, '2025-12-11 12:13:35', '2025-12-11 21:01:37', 0, 1, 1),
(252, 'matthew@gmail.com', '$2a$10$IvfUsOZU2ckLwl2ZTPP6Qepyf7s1.Da3KREojMWyxv.spPy0pxUby', 'Matthew Gomez', '/uploads/profiles/profile-1765457869259-785745166.jpg', 'ALUMNI', 'APPROVED', 1, '2025-12-11 12:13:35', '2025-12-11 20:57:49', 0, 1, 1),
(253, 'penelope@gmail.com', '$2a$10$91j1S65Apfpkvk0HgzmzJeH75N3Zn3/iIefXmw1ez84ZfedThQXnK', 'Penelope Garcia', '/uploads/profiles/profile-1765457803266-302995729.jpg', 'ALUMNI', 'APPROVED', 1, '2025-12-11 12:13:35', '2025-12-11 20:56:43', 0, 1, 1),
(254, 'scarlett@gmail.com', '$2a$10$Y4Vgnt81gei70GCqzyn3R.mUjlDy7l3OkNC/ZLX1xIJL2EP/1wLRu', 'Scarlett Nguyen', '/uploads/profiles/profile-1765457776539-670057937.jpg', 'ALUMNI', 'APPROVED', 1, '2025-12-11 12:13:36', '2025-12-11 20:56:16', 0, 1, 1),
(255, 'elizabeth@gmail.com', '$2a$10$KYg2iitYOgGi9sZgj8SDAuTLaBFSeDJDiMIHlTv2Ap09gb.JBofMC', 'Elizabeth Baker', '/uploads/profiles/profile-1765457752741-513353991.jpg', 'ALUMNI', 'APPROVED', 1, '2025-12-11 12:13:36', '2025-12-11 20:55:52', 0, 1, 1),
(256, 'sofia@gmail.com', '$2a$10$NCxeY53/53xLHjiV13NGIeiVLxPav9dLxyXVtRj.Bkz32zq6qEofK', 'Sofia Martinez', '/uploads/profiles/profile-1765457714657-461350504.jpg', 'ALUMNI', 'APPROVED', 1, '2025-12-11 12:13:36', '2025-12-11 20:55:14', 0, 1, 1),
(257, 'owen@gmail.com', '$2a$10$uCzf8hcyTUoHDVYa.gMGQOZpuplYxw/7P2s1Le8YcqBAxNe.E9ZdK', 'Owen Smith', '/uploads/profiles/profile-1765457688927-570175261.jpg', 'ALUMNI', 'APPROVED', 1, '2025-12-11 12:13:37', '2025-12-11 20:54:48', 0, 1, 1),
(258, 'addison@gmail.com', '$2a$10$/hQuRCpbhGRxq767byoQw.jSrv1mSeJLNL1SyliCxFdY.29/Q856u', 'Addison Scott', '/uploads/profiles/profile-1765457653264-379527617.jpg', 'ALUMNI', 'APPROVED', 1, '2025-12-11 12:13:37', '2025-12-11 20:54:13', 0, 1, 1),
(259, 'gabriel@gmail.com', '$2a$10$9Vr4JBrzemibJvHrwNh6c.g6quzOGfn3udxhSP.5DVuSB.3WA7.dm', 'Gabriel Adams', '/uploads/profiles/profile-1765457631016-188151577.jpg', 'ALUMNI', 'APPROVED', 1, '2025-12-11 12:13:37', '2025-12-11 20:53:51', 0, 1, 1),
(260, 'harper@gmail.com', '$2a$10$V572q.8NkH9M5yCoYPoofeWgsPiXuHLCbnPjB8vCvYaHoqT5WhAO.', 'Harper Carter', '/uploads/profiles/profile-1765457610359-212590882.jpg', 'ALUMNI', 'APPROVED', 1, '2025-12-11 12:13:37', '2025-12-11 20:53:30', 0, 1, 1),
(261, 'chloe@gmail.com', '$2a$10$6lEK92wgwDClSZbv1oEsi.hsJ0kOxV6rz4a0kacn.4sj/ssvVp3Au', 'Chloe Brown', '/uploads/profiles/profile-1765457536954-831157890.jpg', 'ALUMNI', 'APPROVED', 1, '2025-12-11 12:13:38', '2025-12-11 20:52:16', 0, 1, 1),
(262, 'anthony@gmail.com', '$2a$10$W9hRk8BZXTtNQHwxwcNgTut9.qRpAaq7.DBuTpFANzMYWnBppnJ2y', 'Anthony Collins', '/uploads/profiles/profile-1765457487319-440280822.jpg', 'ALUMNI', 'APPROVED', 1, '2025-12-11 12:13:38', '2025-12-11 20:51:27', 0, 1, 1),
(263, 'sebastian@gmail.com', '$2a$10$guJvASLSIeAjz/8bi7/ID.eix00zj.tbFVvMqJy2fNUXDIms2y8H2', 'Sebastian Reyes', '/uploads/profiles/profile-1765457441672-115073065.jpg', 'ALUMNI', 'APPROVED', 1, '2025-12-11 12:13:39', '2025-12-11 20:50:41', 0, 1, 1),
(264, 'wyatt@gmail.com', '$2a$10$IJ7vaT2d0zqgjYl37dQf7ehqwkB9NHiu9oBcVkARadnwqpG1dyLPe', 'Wyatt Baker', '/uploads/profiles/profile-1765457417150-341285603.jpg', 'ALUMNI', 'APPROVED', 1, '2025-12-11 12:13:39', '2025-12-11 20:50:17', 0, 1, 1),
(265, 'lily@gmail.com', '$2a$10$bwZxddsWFDPAGBR8.nRMZ.KdNvo/FXi//bOgb53qzPX2zM4wf9cUK', 'Lily Nguyen', '/uploads/profiles/profile-1765455591899-660525160.jpg', 'ALUMNI', 'APPROVED', 1, '2025-12-11 12:13:39', '2025-12-11 20:19:51', 0, 1, 1),
(266, 'sophia@gmail.com', '$2a$10$AL8jbFM/MguP3I0OxnfLS.OZo6XncsMS33gdo/O4xPybRRRjs3pTe', 'Sophia Green', '/uploads/profiles/profile-1765457376621-610364346.jpg', 'ALUMNI', 'APPROVED', 1, '2025-12-11 12:23:52', '2025-12-11 20:49:36', 0, 1, 1),
(267, 'natalie@gmail.com', '$2a$10$1RKstPyo2gUjPhHsX2/kf.mN0U/ahXS4Hu0prVxO8p/fpw97lXcCC', 'Natalie Jones', '/uploads/profiles/profile-1765457330358-934774938.jpg', 'ALUMNI', 'APPROVED', 1, '2025-12-11 12:23:52', '2025-12-11 20:48:50', 0, 1, 1),
(268, 'daniel@gmail.com', '$2a$10$k7hsajykco.fhjNsGmifcOGcnzCKsN0RKD3OVSwbzMv7uOQjiKWUS', 'Daniel Evans', '/uploads/profiles/profile-1765457266587-310757799.jpg', 'ALUMNI', 'APPROVED', 1, '2025-12-11 12:23:52', '2025-12-11 20:47:46', 0, 1, 1),
(269, 'samuel@gmail.com', '$2a$10$eLJDY7SETB3KhfIwE4VHpOx/5nSUpG.bz2DbGiL93SYheS8wmaYFy', 'Samuel Rodriguez', '/uploads/profiles/profile-1765457234963-151415225.jpg', 'ALUMNI', 'APPROVED', 1, '2025-12-11 12:23:53', '2025-12-11 20:47:14', 0, 1, 1),
(270, 'leo@gmail.com', '$2a$10$wlJy8p73q0fv9zgHjFFLqOp/PGzrHajS2Np/RVEdUiAJjklH6IH.C', 'Leo Gomez', '/uploads/profiles/profile-1765457187659-209312389.jpg', 'ALUMNI', 'APPROVED', 1, '2025-12-11 12:23:54', '2025-12-11 20:46:27', 0, 1, 1),
(271, 'liam@gmail.com', '$2a$10$5g3qP8CdPjDD.QCDHF9PF.km3x82QvWtYPgIPkEXmjrhyISpiGA52', 'Liam Miller', '/uploads/profiles/profile-1765457121091-919492460.jpg', 'ALUMNI', 'APPROVED', 1, '2025-12-11 12:23:54', '2025-12-11 20:45:21', 0, 1, 1),
(272, 'amelia@gmail.com', '$2a$10$UgbAa3Y1Lhw21SEazhwKBu55DB0i4kHfFrfv6S14Nt9PAYsJ..uea', 'Amelia Jackson', '/uploads/profiles/profile-1765457086879-290723903.jpg', 'ALUMNI', 'APPROVED', 1, '2025-12-11 12:23:54', '2025-12-11 20:44:46', 0, 1, 1),
(273, 'alexander@gmail.com', '$2a$10$fjXUwHwlBpI2vVIdMR.T/ukh5hMD5NhZIU4K2n/wCkS0rBfXzNRtC', 'Alexander Brown', '/uploads/profiles/profile-1765457060445-435135613.jpg', 'ALUMNI', 'APPROVED', 1, '2025-12-11 12:23:55', '2025-12-11 20:44:20', 0, 1, 1),
(274, 'noah@gmail.com', '$2a$10$1V/DT/SBRXoVGri1LcIwxeCdU2zf./K.0GGHoPUAC4Do0owaFdNkC', 'Noah Gomez', '/uploads/profiles/profile-1765457012357-993725450.jpg', 'ALUMNI', 'APPROVED', 1, '2025-12-11 12:23:55', '2025-12-11 20:43:32', 0, 1, 1),
(277, 'jace@gmail.com', '$2a$10$SQlT9snpT/RCIQ77isZHreheFpDJAf7Ox2Q.u/rEFeDRtmln11hB2', 'Jace Randall', '/uploads/profiles/profile-1765469733316-637859794.png', 'ALUMNI', 'APPROVED', 1, '2025-12-11 16:14:55', '2025-12-12 00:15:33', 0, 1, 1);

-- --------------------------------------------------------

--
-- Table structure for table `_prisma_migrations`
--

CREATE TABLE `_prisma_migrations` (
  `id` varchar(36) NOT NULL,
  `checksum` varchar(64) NOT NULL,
  `finished_at` datetime(3) DEFAULT NULL,
  `migration_name` varchar(255) NOT NULL,
  `logs` text DEFAULT NULL,
  `rolled_back_at` datetime(3) DEFAULT NULL,
  `started_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `applied_steps_count` int(10) UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `_prisma_migrations`
--

INSERT INTO `_prisma_migrations` (`id`, `checksum`, `finished_at`, `migration_name`, `logs`, `rolled_back_at`, `started_at`, `applied_steps_count`) VALUES
('0cdd2085-9d25-4472-8d79-9f6e9d667975', 'edbcf51f7a40576e42727ce893a89db27c9b2b381ce82ed49f0b4741a1add136', '2025-10-16 02:16:01.489', '20251016_add_google_account', NULL, NULL, '2025-10-16 02:16:01.476', 1);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `achievement`
--
ALTER TABLE `achievement`
  ADD PRIMARY KEY (`id`),
  ADD KEY `alumni_id` (`alumni_id`);

--
-- Indexes for table `alumni`
--
ALTER TABLE `alumni`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`);

--
-- Indexes for table `batch_officer`
--
ALTER TABLE `batch_officer`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_officer_position` (`alumni_id`,`batch`,`position`),
  ADD KEY `idx_batch` (`batch`),
  ADD KEY `idx_alumni_officer` (`alumni_id`);

--
-- Indexes for table `career_entry`
--
ALTER TABLE `career_entry`
  ADD PRIMARY KEY (`id`),
  ADD KEY `alumni_id` (`alumni_id`);

--
-- Indexes for table `donation`
--
ALTER TABLE `donation`
  ADD PRIMARY KEY (`id`),
  ADD KEY `alumni_id` (`alumni_id`);

--
-- Indexes for table `event`
--
ALTER TABLE `event`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `event_attendance`
--
ALTER TABLE `event_attendance`
  ADD PRIMARY KEY (`id`),
  ADD KEY `event_id` (`event_id`),
  ADD KEY `alumni_id` (`alumni_id`);

--
-- Indexes for table `event_gallery`
--
ALTER TABLE `event_gallery`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_event_id` (`event_id`),
  ADD KEY `idx_uploaded_by` (`uploaded_by`);

--
-- Indexes for table `google_accounts`
--
ALTER TABLE `google_accounts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `google_id_unique` (`google_id`),
  ADD KEY `idx_user_id` (`user_id`);

--
-- Indexes for table `job_posting`
--
ALTER TABLE `job_posting`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_posted_by` (`posted_by_alumni_id`);

--
-- Indexes for table `notification`
--
ALTER TABLE `notification`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `idx_notification_event` (`event_id`);

--
-- Indexes for table `pending_registration`
--
ALTER TABLE `pending_registration`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `pending_registration_email_key` (`email`);

--
-- Indexes for table `social_link`
--
ALTER TABLE `social_link`
  ADD PRIMARY KEY (`id`),
  ADD KEY `alumni_id` (`alumni_id`);

--
-- Indexes for table `teacher`
--
ALTER TABLE `teacher`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `teacher_email_key` (`email`);

--
-- Indexes for table `user`
--
ALTER TABLE `user`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `_prisma_migrations`
--
ALTER TABLE `_prisma_migrations`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `achievement`
--
ALTER TABLE `achievement`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `alumni`
--
ALTER TABLE `alumni`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=151;

--
-- AUTO_INCREMENT for table `batch_officer`
--
ALTER TABLE `batch_officer`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=46;

--
-- AUTO_INCREMENT for table `career_entry`
--
ALTER TABLE `career_entry`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `donation`
--
ALTER TABLE `donation`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `event`
--
ALTER TABLE `event`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT for table `event_attendance`
--
ALTER TABLE `event_attendance`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT for table `event_gallery`
--
ALTER TABLE `event_gallery`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=27;

--
-- AUTO_INCREMENT for table `google_accounts`
--
ALTER TABLE `google_accounts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `job_posting`
--
ALTER TABLE `job_posting`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `notification`
--
ALTER TABLE `notification`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=305;

--
-- AUTO_INCREMENT for table `pending_registration`
--
ALTER TABLE `pending_registration`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=29;

--
-- AUTO_INCREMENT for table `social_link`
--
ALTER TABLE `social_link`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `teacher`
--
ALTER TABLE `teacher`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `user`
--
ALTER TABLE `user`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=279;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `achievement`
--
ALTER TABLE `achievement`
  ADD CONSTRAINT `achievement_ibfk_1` FOREIGN KEY (`alumni_id`) REFERENCES `alumni` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `alumni`
--
ALTER TABLE `alumni`
  ADD CONSTRAINT `alumni_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `batch_officer`
--
ALTER TABLE `batch_officer`
  ADD CONSTRAINT `batch_officer_alumni_id_fkey` FOREIGN KEY (`alumni_id`) REFERENCES `alumni` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `career_entry`
--
ALTER TABLE `career_entry`
  ADD CONSTRAINT `career_entry_ibfk_1` FOREIGN KEY (`alumni_id`) REFERENCES `alumni` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `donation`
--
ALTER TABLE `donation`
  ADD CONSTRAINT `donation_ibfk_1` FOREIGN KEY (`alumni_id`) REFERENCES `alumni` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `event_attendance`
--
ALTER TABLE `event_attendance`
  ADD CONSTRAINT `event_attendance_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `event` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `event_attendance_ibfk_2` FOREIGN KEY (`alumni_id`) REFERENCES `alumni` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `event_gallery`
--
ALTER TABLE `event_gallery`
  ADD CONSTRAINT `event_gallery_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `event` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `event_gallery_uploaded_by_fkey` FOREIGN KEY (`uploaded_by`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `job_posting`
--
ALTER TABLE `job_posting`
  ADD CONSTRAINT `job_posting_posted_by_alumni_id_fkey` FOREIGN KEY (`posted_by_alumni_id`) REFERENCES `alumni` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `notification`
--
ALTER TABLE `notification`
  ADD CONSTRAINT `notification_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `event` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `notification_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `social_link`
--
ALTER TABLE `social_link`
  ADD CONSTRAINT `social_link_ibfk_1` FOREIGN KEY (`alumni_id`) REFERENCES `alumni` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

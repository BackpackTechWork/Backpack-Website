SET FOREIGN_KEY_CHECKS = 0;

-- MySQL dump 10.13  Distrib 9.4.0, for Win64 (x86_64)
--
-- Host: localhost    Database: backpack_tech_works
-- ------------------------------------------------------
-- Server version	8.0.42

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Dumping data for table `blogs`
--

LOCK TABLES `blogs` WRITE;
/*!40000 ALTER TABLE `blogs` DISABLE KEYS */;
INSERT INTO `blogs` VALUES (1,'We have launched','we-have-launched','We’re finally live, and it feels great to say that we’ve made the move. After sticking with our old Canva site for a while, we decided it was time for an upgrade. So we packed up, took everything we’ve built, and moved into our new official website right here. It’s cleaner, faster, and gives us the freedom to grow the way we want. Thanks for being here with us as we take this next step.','/images/Blogs/blog_image_1765094298738_v7n8l8.png','[\"/images/Blogs/blog_image_1765094298738_v7n8l8.png\"]','[]',1,1,'2025-12-06 23:58:18','2025-12-06 23:58:18');
/*!40000 ALTER TABLE `blogs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `brands`
--

LOCK TABLES `brands` WRITE;
/*!40000 ALTER TABLE `brands` DISABLE KEYS */;
INSERT INTO `brands` VALUES (1,'Walking Brands','/logos/brand_logo_1765033609756_2sfn0y.svg','2025-12-06 07:06:49','2025-12-06 07:06:49'),(2,'My Ringkasan','/logos/brand_logo_1765033628435_8ejx47.png','2025-12-06 07:07:08','2025-12-06 07:07:08'),(3,'Creative Coder Myanmar','/logos/brand_logo_1765033652712_5inw05.png','2025-12-06 07:07:32','2025-12-06 07:07:32'),(4,'Al-Osmani Pharmacy','/logos/brand_logo_1765033729030_oih2h6.png','2025-12-06 07:08:49','2025-12-06 07:08:49'),(5,'Quick Stop Solution','/logos/brand_logo_1765033764517_rpws4t.svg','2025-12-06 07:09:24','2025-12-06 07:09:40'),(6,'Quickmaster','/logos/brand_logo_1765033805715_nttf1p.ico','2025-12-06 07:10:05','2025-12-06 07:10:05'),(7,'NUZETA','/logos/brand_logo_1765033821694_iks0yc.png','2025-12-06 07:10:21','2025-12-06 07:10:21'),(8,'QSS Healthcare','/logos/brand_logo_1765033845408_guz9b5.png','2025-12-06 07:10:45','2025-12-06 07:10:45'),(9,'PHOTOMEDIC SOLUTIONS','/logos/brand_logo_1765034626336_k9da9v.png','2025-12-06 07:23:46','2025-12-06 07:23:46'),(11,'Nusantara Medical Solutions','/logos/brand_logo_1765085109255_2w2yx0.png','2025-12-06 21:25:09','2025-12-06 21:25:26'),(12,'Tuwaiq Acedemy','/logos/brand_logo_1765085171865_mo3p57.webp','2025-12-06 21:26:11','2025-12-06 21:26:11');
/*!40000 ALTER TABLE `brands` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `inquiries`
--

LOCK TABLES `inquiries` WRITE;
/*!40000 ALTER TABLE `inquiries` DISABLE KEYS */;
/*!40000 ALTER TABLE `inquiries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `milestone_tasks`
--

LOCK TABLES `milestone_tasks` WRITE;
/*!40000 ALTER TABLE `milestone_tasks` DISABLE KEYS */;
/*!40000 ALTER TABLE `milestone_tasks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `poll_votes`
--

LOCK TABLES `poll_votes` WRITE;
/*!40000 ALTER TABLE `poll_votes` DISABLE KEYS */;
/*!40000 ALTER TABLE `poll_votes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `polls`
--

LOCK TABLES `polls` WRITE;
/*!40000 ALTER TABLE `polls` DISABLE KEYS */;
/*!40000 ALTER TABLE `polls` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `project_milestones`
--

LOCK TABLES `project_milestones` WRITE;
/*!40000 ALTER TABLE `project_milestones` DISABLE KEYS */;
/*!40000 ALTER TABLE `project_milestones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `projects`
--

LOCK TABLES `projects` WRITE;
/*!40000 ALTER TABLE `projects` DISABLE KEYS */;
INSERT INTO `projects` VALUES (1,'Logistics and Fulfilment Client Analytics Dashboard','logistics-and-fulfilment-client-analytics-dashboard','A comprehensive logistics and fulfilment client management application built with Node.js, Express, EJS, and MySQL.',11,1,'[\"EJS\", \"MySQL\", \"Node.js\", \"Express.js\"]','image_1765034551721_v7wyam.png',NULL,NULL,'2025-12-09',1,'2025-12-06 07:22:31','2025-12-06 17:52:38'),(2,'Al-Osmani Full ERP System','al-osmani-full-erp-system','A full-featured pharmacy ERP system designed for multi-branch operations with integrated e-commerce capabilities. Built with modern web technologies, this system provides comprehensive inventory tracking, point-of-sale functionality, customer ordering platform, and role-based access control suitable for pharmacies of any size.',12,1,'[\"EJS\", \"MySQL\", \"Node.js\", \"Express.js\"]','image_1765073340999_7cqxkx.png','https://github.com/BackpackTechWork/Al-Osmani-Pharmacy-ERP-system',NULL,'2025-10-21',1,'2025-12-06 18:09:01','2025-12-06 21:17:46'),(3,'Tuwaiq Academy Website Design','tuwaiq-academy-website-design','',18,4,'[\"Premire Pro\", \"Google Workspace\", \"Tailwind CSS\", \"Figma\"]','image_1765085650542_jeivwe.png','https://tuwaiq.edu.sa/',NULL,'2024-06-07',1,'2025-12-06 21:34:10','2025-12-06 21:34:10'),(4,'Walking Brands Dynamic Website','walking-brands-dynamic-website','',13,1,'[\"Laravel\", \"React\", \"TypeScript\", \"Livewire\", \"MySQL\", \"Google Workspace\", \"Tailwind CSS\"]','image_1765085932478_4bak9v.png','https://walkingbrands.co/',NULL,'2025-10-30',1,'2025-12-06 21:38:52','2025-12-06 21:38:52'),(5,'QSS Healthcare Dynamic Website','qss-healthcare-dynamic-website','',25,1,'[\"PHP\", \"Laravel\", \"Vue\", \"TypeScript\", \"MySQL\"]','image_1765086354239_wj2zj6.png','https://qsshealthcare.onrender.com/',NULL,'2025-10-27',1,'2025-12-06 21:45:54','2025-12-07 16:32:16'),(6,'Creative Coder Myanmar Learning Platform','creative-coder-myanmar-learning-platform','',15,1,'[\"PHP\", \"Laravel\", \"Vue\", \"React\", \"Google Workspace\", \"Tailwind CSS\"]','image_1765086802373_8u1kds.png','https://creativecodermm.com/',NULL,'2022-12-07',1,'2025-12-06 21:53:22','2025-12-06 21:53:22'),(7,'Custom and Dynamic CRM System','custom-and-dynamic-crm-system','',20,1,'[\"PHP\", \"Laravel\", \"Livewire\"]','image_1765087029292_vemvq4.png','https://crm.quickstopsolution.com',NULL,'2024-10-07',1,'2025-12-06 21:57:09','2025-12-06 21:57:09');
/*!40000 ALTER TABLE `projects` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `services`
--

LOCK TABLES `services` WRITE;
/*!40000 ALTER TABLE `services` DISABLE KEYS */;
INSERT INTO `services` VALUES (1,'Web Development','web-development','We design and build clean, responsive websites and web apps that help your business stand out and run smoothly.','Our web development service helps businesses build modern, responsive, and reliable websites that match their brand and goals. We handle everything from planning and design to coding, testing, and launch. Whether you need a clean company site, an online store, or a custom web app, we create solutions that look good, load fast, and are easy for your customers to use.','globe','[\"Custom website and web app development\", \"Responsive layouts for all devices\", \"Modern UI and smooth user experience\", \"Fast loading and optimized performance\", \"Secure coding and best practices\", \"SEO friendly structure\", \"Ongoing support and updates\"]','[\"Laravel\", \"Vue\", \"React\", \"TypeScript\", \"JavaScript\", \"Livewire\", \"Node.js\", \"Express.js\", \"HTML\", \"CSS\", \"Django\", \"Flask\", \"Next.js\", \"Tailwind CSS\"]',1,0,'2025-12-06 06:49:23','2025-12-06 17:45:26'),(2,'Mobile Development','mobile-development','We build clean, reliable mobile apps for Android and iOS with a focus on performance and user experience.','Our mobile development service focuses on creating polished and reliable apps for both Android and iOS. We design smooth interfaces, build stable features, and ensure the app performs well across different devices. Whether you need a simple utility app or a full product with real-time features, we deliver mobile solutions that help your business connect with users on the go.','mobile-alt','[\"Native and cross-platform development\", \"Clean and intuitive UI\", \"Stable performance across devices\", \"Secure data handling\", \"Integration with APIs and backend systems\", \"Push notifications and in-app features\", \"Ongoing updates and maintenance\"]','[\"Laravel\", \"React Native\", \"TypeScript\", \"JavaScript\", \"Node.js\", \"Express.js\", \"Java\", \"C#\"]',1,1,'2025-12-06 06:54:15','2025-12-06 17:45:26'),(3,'App Script Development','app-script-development','We build custom Google Apps Script solutions that automate tasks, manage data, and improve how you use Google Workspace.','Our Apps Script development service helps you automate work, connect your Google Workspace tools, and build custom solutions that save time. We create scripts that streamline tasks, manage data, and enhance the way your team uses Sheets, Forms, Drive, and Gmail. Whether you need a workflow system, a custom dashboard, or an internal app, we design tools that fit your processes and run smoothly in the background.','/images/services/service_icon_1765033203824_hlfb3p.webp','[\"Automation for Sheets, Forms, Drive, and Gmail\", \"Custom dashboards and web apps\", \"Data processing and reporting tools\", \"API integration with external services\", \"Trigger-based workflows\", \"Secure and reliable script structure\", \"Ongoing improvements and support\"]','[\"JavaScript\", \"jQuery\", \"Google Workspace\", \"HTML\", \"CSS\", \"Tailwind CSS\"]',1,2,'2025-12-06 07:00:03','2025-12-06 07:00:03'),(4,'UI/UX  Design','ui-ux-design','We design clean, intuitive interfaces that make your product easy to use and visually appealing.','Our UI/UX design service focuses on creating interfaces that look clean and feel natural to use. We study your users, map out clear journeys, and craft layouts that guide people smoothly through your product. From wireframes to polished visuals, we design experiences that are consistent, intuitive, and aligned with your brand.','paint-brush','[\"User research and journey mapping\", \"Wireframes and prototypes\", \"Modern, consistent visual design\", \"Mobile and desktop responsive layouts\", \"Usability testing and feedback\", \"Design systems and style guides\", \"Collaboration with development teams\"]','[\"Premire Pro\", \"Figma\"]',1,3,'2025-12-06 07:02:25','2025-12-06 17:49:57'),(5,'Branding Support','branding-support','We help you shape a strong and consistent brand identity through clear messaging and professional visuals.','Our branding support service helps you build a clear and memorable identity for your business. We work with you to define your voice, refine your visuals, and create materials that reflect who you are. From logos and color palettes to brand guidelines and assets, we help you present a consistent image across every platform.','palette','[\"Logo design and refinement\", \"Color palettes and typography selection\", \"Brand voice and messaging guidelines\", \"Complete brand kits and asset creation\", \"Social media and marketing visuals\"]','[\"Premire Pro\", \"Figma\"]',1,4,'2025-12-06 07:05:09','2025-12-06 17:49:57');
/*!40000 ALTER TABLE `services` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `team_education`
--

LOCK TABLES `team_education` WRITE;
/*!40000 ALTER TABLE `team_education` DISABLE KEYS */;
INSERT INTO `team_education` VALUES (9,1,'IGCSE O Level','High School/Secondary Diplomas and Certificates','International Modern Arabic School','I completed my lower education at IMAS, where I had an enriching experience, made lifelong friends, and learned a valuable lesson: it’s not about others’ perceptions of you, but rather the actions and abilities you can demonstrate that truly define you.','2021-09-02','2024-06-12',0,'2025-12-07 04:42:17','2025-12-07 04:42:17'),(10,1,'Diploma of IT','Information Technology','Malaysia University of Science and Technology','The Diploma in Information Technology programme equips students with technologies and skills essential for the Digital Economy. It exposes students to information systems, computer programming, database systems, web and mobile applications, software development, data mining, cybersecurity, IoT, drone technology, computer network and communication technologies.','2024-12-31','2027-07-28',1,'2025-12-07 04:42:17','2025-12-07 04:42:17'),(15,5,'Advanced Diploma','Business Administration and Management','Nanyang Institute of Management',NULL,'2014-12-30','2016-12-30',0,'2025-12-07 05:01:48','2025-12-07 05:01:48'),(16,5,'Business Administration and Management','Business Administration and Management','York St. John University',NULL,NULL,NULL,1,'2025-12-07 05:01:48','2025-12-07 05:01:48'),(17,3,'Bachelor of Science in Computer Science (BCS)','Computer Science','University of the People',NULL,'2022-01-01','2025-01-01',0,'2025-12-07 05:11:58','2025-12-07 05:11:58'),(18,2,'Diploma, Animation','Interactive Technology, Video Graphics and Special Effects','Kolej Vokasional Kluang',NULL,'2015-01-01','2020-06-01',0,'2025-12-07 05:33:33','2025-12-07 05:33:33'),(19,2,'Bachelor of Technology','BTech, Information Technology','Malaysia University of Science and Technology',NULL,'2021-01-01','2023-01-07',1,'2025-12-07 05:33:33','2025-12-07 05:33:33'),(20,6,'BSc (Bachelor of Science)','Computer Science','University of the People',NULL,'2024-11-01',NULL,0,'2025-12-09 11:58:36','2025-12-09 11:58:36'),(21,6,'Bachelor of Engineering','BE, Petroleum Engineering','Thanlyin Technological University (Myanmar)','Enrolled at TTU (Thanlyin Technological University) in 2016 and completed coursework up to the fourth year. Currently on hiatus, taking a break from studies due to the impact of COVID-19 and the political situation.','2016-01-01','2020-01-01',1,'2025-12-09 11:58:36','2025-12-09 11:58:36');
/*!40000 ALTER TABLE `team_education` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `team_experiences`
--

LOCK TABLES `team_experiences` WRITE;
/*!40000 ALTER TABLE `team_experiences` DISABLE KEYS */;
INSERT INTO `team_experiences` VALUES (9,1,'Co-Founder','Backpack Techworks','As a co-founder, I developed custom systems in Google App Script as well as web apps in Node.js while setting up the company\'s initial websites in Canva using my design skills which I later developed the simple website to our current website on backpack2u.com as of today and representing the company as its spokesperson.','2025-01-28',NULL,1,0,'2025-12-07 04:42:17','2025-12-07 04:42:17'),(10,1,'Team Leader','Fussional','As a team leader, I focus on guiding the team toward our goals, ensuring everyone has what they need to succeed, and keeping things on track. I aim to create an environment where we can collaborate, solve problems, and deliver great results together.','2024-05-28','2025-09-06',0,1,'2025-12-07 04:42:17','2025-12-07 04:42:17'),(21,5,'Researcher/ Consultant','Myanmar Survey Research  · Full-time',NULL,'2018-06-05','2021-05-05',0,0,'2025-12-07 05:01:48','2025-12-07 05:01:48'),(22,5,'Director of Business Development','Coffee Sine',NULL,'2021-12-30',NULL,1,1,'2025-12-07 05:01:48','2025-12-07 05:01:48'),(23,5,'President','Walking Brands',NULL,'2023-09-29',NULL,1,2,'2025-12-07 05:01:48','2025-12-07 05:01:48'),(24,5,'Managing Director','Mahogany Woodworks',NULL,'2022-11-29',NULL,1,3,'2025-12-07 05:01:48','2025-12-07 05:01:48'),(25,5,'President','Dungeon Walkers Club',NULL,'2023-08-30',NULL,1,4,'2025-12-07 05:01:48','2025-12-07 05:01:48'),(26,3,'Developer Volunteer','Tee Htwin','Joining Tee Htwin was the best and we went through great adventures by building start-ups like Kanote and Pandora. A brief about Kanote is that it is a digital platform for artists that they can sell, trade and hold an auction of their paintings. Pandora is a touch-pad for Burmese languages aimed for the teachers, kindergartens and also for ones who are not able to write Burmese alphabets and words via physical keyboard. We put a speech-to-text feature so that it will help for writers and content-creators, of course. These were my best months and moments.','2023-03-01','2023-12-01',0,0,'2025-12-07 05:11:58','2025-12-07 05:11:58'),(27,3,'Full Stack Web Developer','Creative Coder Myanmar','Develop and maintain the learning platform which is the first learning platform in Myanmar, with the tech stack of Vue and Laravel ( fullstack ). Dealt with server maintenance, deployment and object storages like digital-ocean space and s3. And learnt a lot of new tech stacks like react and node. And developed a new startup with react too. A lot of experiences came from this work.','2022-12-01','2024-02-28',0,1,'2025-12-07 05:11:58','2025-12-07 05:11:58'),(28,3,'Founder','Backpack Tech Works','Backpack Tech Works is a premier custom software house specializing in building scalable, secure, and high-quality software solutions for enterprises and fast-growing brands. We transform complex business challenges into elegant, maintainable, and user-friendly software products through long-term partnerships, business-driven design, and technical excellence.','2025-02-01',NULL,1,2,'2025-12-07 05:11:58','2025-12-07 05:11:58'),(29,2,'Executive','World Education Placement Services','World Education Placement Services (WEPS), founded in 2017 in Malaysia, is a prominent HRDCorp, Perkeso & MDEC-approved Consultancy and Training Provider in Asia Pacific Region.','2023-08-01',NULL,1,0,'2025-12-07 05:33:33','2025-12-07 05:33:33'),(30,2,'Insurance Agent','AIA',NULL,'2020-10-01','2020-12-01',0,1,'2025-12-07 05:33:33','2025-12-07 05:33:33'),(31,2,'Food Delivery Driver','Foodpanda',NULL,'2020-07-01','2020-12-01',0,2,'2025-12-07 05:33:33','2025-12-07 05:33:33'),(32,6,'Full Stack Engineer','Backpack Techworks',NULL,'2025-12-01',NULL,1,0,'2025-12-09 11:58:36','2025-12-09 11:58:36'),(33,6,'Software Developer','株式会社 革新技術',NULL,'2024-12-01','2025-07-01',0,1,'2025-12-09 11:58:36','2025-12-09 11:58:36'),(34,6,'Web Developer','Creative Coder Myanmar','At Creative Coder Myanmar, I was a Laravel Vue.js developer, primarily focusing on feature development and error debugging for the Creative Coder Learning Platform. Fortunately, I gained hands-on experience in collaborative workflows and project management tools such as Git, GitHub, Jira, Trello, and Slack.','2023-08-01','2024-03-01',0,2,'2025-12-09 11:58:36','2025-12-09 11:58:36'),(35,6,'Freelance Web Developer','Myself','I am responsible for the development and maintenance of three Laravel-Vue.js projects. My tasks included implementing new designs, adding features, and fixing bugs. This experience marked my introduction to real-world project collaboration and significantly enhanced my skills in project development.','2023-02-01','2023-06-01',0,3,'2025-12-09 11:58:36','2025-12-09 11:58:36');
/*!40000 ALTER TABLE `team_experiences` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `team_languages`
--

LOCK TABLES `team_languages` WRITE;
/*!40000 ALTER TABLE `team_languages` DISABLE KEYS */;
INSERT INTO `team_languages` VALUES (13,1,'English','advanced',0,'2025-12-07 04:42:17','2025-12-07 04:42:17'),(14,1,'Burmese','intermediate',1,'2025-12-07 04:42:17','2025-12-07 04:42:17'),(15,1,'Malay','advanced',2,'2025-12-07 04:42:17','2025-12-07 04:42:17'),(22,5,'Arakanese','native',0,'2025-12-07 05:01:48','2025-12-07 05:01:48'),(23,5,'Burmese','native',1,'2025-12-07 05:01:48','2025-12-07 05:01:48'),(24,5,'English','advanced',2,'2025-12-07 05:01:48','2025-12-07 05:01:48'),(25,3,'Burmese','native',0,'2025-12-07 05:11:58','2025-12-07 05:11:58'),(26,3,'English','advanced',1,'2025-12-07 05:11:58','2025-12-07 05:11:58'),(27,2,'Malay','native',0,'2025-12-07 05:33:33','2025-12-07 05:33:33'),(28,2,'English','advanced',1,'2025-12-07 05:33:33','2025-12-07 05:33:33'),(29,6,'English','intermediate',0,'2025-12-09 11:58:36','2025-12-09 11:58:36'),(30,6,'Burmese','native',1,'2025-12-09 11:58:36','2025-12-09 11:58:36');
/*!40000 ALTER TABLE `team_languages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `team_licenses`
--

LOCK TABLES `team_licenses` WRITE;
/*!40000 ALTER TABLE `team_licenses` DISABLE KEYS */;
INSERT INTO `team_licenses` VALUES (7,2,'AWS Certified Cloud Practitioner','Amazon Web Services (AWS)','2023-07-01','2026-07-01',NULL,'https://www.credly.com/badges/605f6cb5-371d-4bd7-9b88-9bbe9ca0c153/linked_in_profile',0,'2025-12-07 05:33:33','2025-12-07 05:33:33'),(8,2,'Cloud Pak for Integration Technical Sales Intermediate','IBM','2025-08-01',NULL,NULL,'https://www.credly.com/badges/ba5c4cab-38de-4e4d-b89a-2e164338dc8f/linked_in_profile',1,'2025-12-07 05:33:33','2025-12-07 05:33:33'),(9,2,'Cloud Pak for Integration Sales Foundation V2',NULL,'2025-08-01',NULL,NULL,'https://www.credly.com/badges/bdffcb00-5969-4af6-936c-fd085e4accd6/linked_in_profile',2,'2025-12-07 05:33:33','2025-12-07 05:33:33'),(10,2,'Aspera Technical Sales Intermediate','IBM','2025-08-01',NULL,NULL,'https://www.credly.com/badges/b279607c-eeb1-4dde-8072-d0066b2adb9e/linked_in_profile',3,'2025-12-07 05:33:33','2025-12-07 05:33:33'),(11,2,'Cloud Pak for Business Automation Sales Foundation V2','IBM','2025-09-01',NULL,NULL,'https://www.credly.com/badges/b5a7bffb-34ce-46d3-85be-005ef4dc2ca6/linked_in_profile',4,'2025-12-07 05:33:33','2025-12-07 05:33:33'),(12,2,'Watson Discovery Technical Sales Intermediate','IBM','2025-10-07','2026-10-01',NULL,'https://www.credly.com/badges/5ce1625d-485a-47e6-bc94-d4484ce2d27c/linked_in_profile',5,'2025-12-07 05:33:33','2025-12-07 05:33:33'),(13,2,'Watson Discovery Sales Foundation V2',NULL,'2025-10-01','2026-10-01',NULL,'https://www.credly.com/badges/3d8dd124-daf8-4c2f-ba08-bb138ec83b9f/linked_in_profile',6,'2025-12-07 05:33:33','2025-12-07 05:33:33'),(14,6,'EF SET English Certificate 53/100 (B2 Upper Intermediate)','EF Set','2024-05-02',NULL,'WXXswf','https://cert.efset.org/WXXswf',0,'2025-12-09 11:58:36','2025-12-09 11:58:36');
/*!40000 ALTER TABLE `team_licenses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `team_members`
--

LOCK TABLES `team_members` WRITE;
/*!40000 ALTER TABLE `team_members` DISABLE KEYS */;
INSERT INTO `team_members` VALUES (1,1,'Co-Founder','Web Developer | Graphic Design | Video Editor There is nothing to protect, love and cherish more in life than your freedom.','','[\"EJS\", \"MySQL\", \"jQuery\", \"Premire Pro\", \"Google Workspace\", \"Node.js\", \"Bootstrap\", \"Express.js\", \"HTML\", \"CSS\", \"Tailwind CSS\"]','https://www.linkedin.com/in/mohamed-aiman-7365701ba/','https://github.com/Darkguyaiman','https://x.com/MohamedAiman103','https://www.instagram.com/darkguyaiman/','https://www.facebook.com/darkguyaiman',NULL,1,1,'2025-12-02 06:47:25','2025-12-07 01:15:52','builder','/profiles/profile_1_1765098952115_qpxnhn.jpeg'),(2,2,'Outreach Partner','World Education Placement Services (WEPS) specializes in HR training and consulting across the Asia Pacific region. As an Executive, I contribute to streamlining processes and delivering tailored graphic design solutions, leveraging my AWS Certified Cloud Practitioner credential to optimize IT-driven initiatives. \n\nGraduating from Malaysia University of Science and Technology with a Bachelor of Technology in Information Technology, I integrate technical expertise and a passion for innovation into organizational goals. Focused on problem-solving and collaboration, I aim to facilitate impactful outcomes for clients and teams alike.','','[]','https://linkedin.comhttps://www.linkedin.com/in/muzaffar-salim/',NULL,NULL,NULL,NULL,NULL,4,1,'2025-12-02 06:47:25','2025-12-09 11:41:57','builder',NULL),(3,3,'Founder','A web developer with over 3 years of experience in the field, focus on building modern web applications using latest languages, frameworks, and creative ideas. I am now developing customised systems for SMEs, corporates, and individuals such as solopreneurs and entrepreneurs. I am also working on a startup called Backpack, which builds scalable, reliable, and fully customised web systems.','','[\"PHP\", \"Laravel\", \"Vue\", \"React\", \"React Native\", \"TypeScript\", \"JavaScript\", \"Livewire\", \"MySQL\", \"PostgreSQL\", \"Node.js\", \"Bootstrap\", \"Express.js\", \"HTML\", \"CSS\", \"Git\", \"Next.js\", \"Tailwind CSS\"]','https://www.linkedin.com/in/aung-khant-ko-ko/','https://github.com/AKDev-H','https://x.com/aung__khant','https://www.instagram.com/aung_khant_ko_ko/','https://www.facebook.com/agkhantkk',NULL,0,1,'2025-12-06 06:34:07','2025-12-09 11:42:40','builder','/profiles/profile_3_1765112610817_xu1hf5.jpg'),(4,23,'Outreach Partner','Into the Thick of It',NULL,'[]','https://www.linkedin.com/in/dayana-batrisya-372b7a213/','','','',NULL,NULL,5,1,'2025-12-07 03:03:44','2025-12-09 11:41:57','markdown',NULL),(5,24,'Outreach Partner','The Soul of Walking Brands. Designer, Researcher, Consultant, and Educator. Likes cats, things that look aesthetically pleasing, and video games.','','[]','https://www.linkedin.com/in/henryham/','','','','',NULL,3,1,'2025-12-07 03:44:46','2025-12-09 11:41:57','builder','/profiles/profile_24_1765111740633_hzq642.png'),(6,27,'Full-Stack Engineer','I’m a passionate full-stack web developer with around 2 years of experience in building modern web and mobile applications. I specialize in Vue.js and React.js for frontend development, Laravel and Node.js (Express.js) for backend development, and work with databases like MySQL and PostgreSQL.\n\nI also have hands-on experience developing mobile applications using React Native (Expo). Having worked in both on-site and remote environments, I’ve developed strong teamwork, communication, and problem-solving skills. I’m always eager to learn new technologies and deliver efficient, scalable solutions.','','[\"PHP\", \"Laravel\", \"Vue\", \"React\", \"TypeScript\", \"JavaScript\", \"Livewire\", \"MySQL\", \"PostgreSQL\", \"Node.js\", \"Bootstrap\", \"Express.js\", \"HTML\", \"CSS\", \"Git\", \"Tailwind CSS\"]','https://www.linkedin.com/in/suanhsawmtung/','https://github.com/suanhsawmtung','','','',NULL,2,1,'2025-12-09 11:41:34','2025-12-09 12:03:05','builder','/profiles/profile_27_1765281785115_4dgzoa.jpeg');
/*!40000 ALTER TABLE `team_members` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `team_personal_projects`
--

LOCK TABLES `team_personal_projects` WRITE;
/*!40000 ALTER TABLE `team_personal_projects` DISABLE KEYS */;
/*!40000 ALTER TABLE `team_personal_projects` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'mohamedkyi@backpack2u.com','Mohamed Aiman','/profiles/profile_1_1765031762904_gofm4w.jpg','local','admin_local','admin',NULL,'2025-12-02 06:47:25','2025-12-06 16:14:12','$2b$10$JhR0d1XxOlBqolkyTXFjQuLSRMNp9gRlAYJaKEi.BCQ/4o1qxtXF6',NULL),(2,'mus@backpack2u.com','Muhammad Muzaffar Salim','/profiles/profile_1_1765105019231_h4961d.jpg','local','team_local','team_member',NULL,'2025-12-02 06:47:25','2025-12-07 03:01:51','$2b$10$joCiN5ZbjqcHQaMjcgpe5.mqkgfE35KMu3Ayj0A/Oo0592iTacnFa',NULL),(3,'aungkhant@backpack2u.com','Aung Khant','/profiles/profile_1_1765108110229_dcwiaq.jpg','local',NULL,'admin',NULL,'2025-12-06 06:34:07','2025-12-07 05:02:45','$2b$10$NBtMjQ8Vlf5CCqEak6IuRet1IWGnGPgSOFmyibYi7qlZPpj8d2ixa',NULL),(11,'Seng@gmail.com','Seng',NULL,'google',NULL,'client',6,'2025-12-06 17:52:38','2025-12-06 17:52:38',NULL,NULL),(12,'alosmani@gmail.com','Dr. Abdelrahman Elamin',NULL,'google',NULL,'client',4,'2025-12-06 21:17:46','2025-12-06 21:17:46',NULL,NULL),(13,'walkingbrands@gmail.com','Ko Htet Henry',NULL,'google',NULL,'client',1,'2025-12-06 21:19:02','2025-12-06 21:19:02',NULL,NULL),(14,'myringkasan@gmail.com','My Ringkasan',NULL,'google',NULL,'client',2,'2025-12-06 21:19:35','2025-12-06 21:19:35',NULL,NULL),(15,'hlaingminthan@gmail.com','Hlaing Min Than',NULL,'google',NULL,'client',3,'2025-12-06 21:20:50','2025-12-06 21:20:50',NULL,NULL),(16,'photomedicsolutions@gmail.com','Mr. Tamjin',NULL,'google',NULL,'client',9,'2025-12-06 21:23:32','2025-12-06 21:23:32',NULL,NULL),(17,'romjan@gmail.com','Mr. Romjan',NULL,'google',NULL,'client',7,'2025-12-06 21:24:38','2025-12-06 21:24:38',NULL,NULL),(18,'khalednaji@gmail.com','Mr. Khaled',NULL,'google',NULL,'client',12,'2025-12-06 21:26:48','2025-12-06 21:26:48',NULL,NULL),(19,'maunglay@gmai.com','Maung Shwe Hla',NULL,'google',NULL,'client',11,'2025-12-06 21:27:39','2025-12-06 21:27:39',NULL,NULL),(20,'unclekyi@gmail.com','Dr. Shah',NULL,'google',NULL,'client',5,'2025-12-06 21:28:41','2025-12-06 21:29:36',NULL,NULL),(23,'dayana@backpack2u.com','Dayana Batrisya','/profiles/profile_1_1765105424686_l7b8h8.jpg','local',NULL,'team_member',NULL,'2025-12-07 03:03:44','2025-12-07 03:04:06','$2b$10$SSxTlEcV9gXmnmOWqHZ7P.dsVlKWAgL1WtXGZoZ2YeV4xa1HXrFQC',NULL),(24,'kohtethenry@backpack2u.com','Ko Htet Henry','/profiles/profile_1_1765107886788_5bizyu.png','local',NULL,'team_member',NULL,'2025-12-07 03:44:46','2025-12-07 04:48:35','$2b$10$ArGl7YPprbjugnf3Lh76LeUDyddDXHo3fz.fBO7GewltCM0qpuFaC',NULL),(25,'nasreen@pain.com.my','Assoc Prof. Nasreen Khan',NULL,'google',NULL,'client',8,'2025-12-07 15:54:45','2025-12-07 15:54:45',NULL,NULL),(26,'mohamedaiman103@gmail.com','Mohamed Aiman','https://lh3.googleusercontent.com/a/ACg8ocKSGeg34C32GQvXSfS4vkj8dh_P9UCBZmIShBsTjpmvGCi3NWBU=s96-c','google','107121303979906765282','client',NULL,'2025-12-08 10:16:09','2025-12-08 10:16:09',NULL,NULL),(27,'augustine@backpack2u.com','Suanh Sawm Tung (Augustine)','/profiles/profile_1_1765280494766_42qvsg.jpg','local',NULL,'team_member',NULL,'2025-12-09 11:41:34','2025-12-09 11:47:52','$2b$10$.6St65ndc8GTPMd3m2gxzO3DI1TIEgF7uweyQ2mqXK1kFdtCZgoMi',NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-12-09 20:20:15



SET FOREIGN_KEY_CHECKS = 1;
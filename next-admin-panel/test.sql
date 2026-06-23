-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: May 18, 2026 at 01:20 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `test`
--

-- --------------------------------------------------------

--
-- Table structure for table `admins`
--

CREATE TABLE `admins` (
  `id` int(11) NOT NULL,
  `name` varchar(150) NOT NULL,
  `password` varchar(255) NOT NULL DEFAULT '',
  `email` varchar(190) NOT NULL,
  `createdOn` timestamp NOT NULL DEFAULT current_timestamp(),
  `modifiedOn` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `isDeleted` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `admins`
--

INSERT INTO `admins` (`id`, `name`, `password`, `email`, `createdOn`, `modifiedOn`, `isDeleted`) VALUES
(1, 'john', 'bf186163b0195e2afd4e5ab2b15ad0a3', 'john@gmail.com', '2026-04-14 11:03:10', '2026-04-14 11:03:10', 0);

-- --------------------------------------------------------

--
-- Table structure for table `master_form_inputs`
--

CREATE TABLE `master_form_inputs` (
  `id` int(11) NOT NULL,
  `text_title` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `website_url` varchar(2048) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `integer_qty` int(11) NOT NULL DEFAULT 1,
  `decimal_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `tax_percentage` decimal(5,2) NOT NULL DEFAULT 0.00,
  `range_slider_value` int(11) NOT NULL DEFAULT 50,
  `short_notes` text DEFAULT NULL,
  `rich_wysiwyg_content` text DEFAULT NULL,
  `dropdown_selection` varchar(50) NOT NULL DEFAULT 'standard',
  `radio_selection` varchar(50) NOT NULL DEFAULT 'credit_card',
  `checkbox_toggle` tinyint(1) NOT NULL DEFAULT 0,
  `switch_active` tinyint(1) NOT NULL DEFAULT 1,
  `date_picker` date DEFAULT NULL,
  `datetime_picker` datetime DEFAULT NULL,
  `time_picker` time DEFAULT NULL,
  `primary_image_url` varchar(500) DEFAULT NULL,
  `document_file_url` varchar(500) DEFAULT NULL,
  `gallery_images` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`gallery_images`)),
  `multi_select_tags` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`multi_select_tags`)),
  `json_metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`json_metadata`)),
  `repeater_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`repeater_data`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `master_form_inputs`
--

INSERT INTO `master_form_inputs` (`id`, `text_title`, `slug`, `email`, `password_hash`, `website_url`, `phone`, `integer_qty`, `decimal_price`, `tax_percentage`, `range_slider_value`, `short_notes`, `rich_wysiwyg_content`, `dropdown_selection`, `radio_selection`, `checkbox_toggle`, `switch_active`, `date_picker`, `datetime_picker`, `time_picker`, `primary_image_url`, `document_file_url`, `gallery_images`, `multi_select_tags`, `json_metadata`, `repeater_data`, `created_at`, `updated_at`) VALUES
(1, 'Premium Organic Toor Dal', 'premium-organic-toor-dal', 'catalog-manager@squadera.com', '$2b$12$K1.3zR5gZ6m1O0T.e6jLTu5JtPqgKx/w.kO2Uv4V/9X3y5Z.L/eK2', 'https://squadera.com/products/organic-toor-dal', '+919876543210', 250, 180.00, 5.00, 85, 'Unpolished premium grade lentils sourced from organic farms in Maharashtra.', '<h2>Protein-Rich Staples</h2><p>Our Toor Dal contains zero chemical polish or coloring additives. Hand-sorted and rich in nutritional fibers.</p>', 'grocery_staples', 'cod_allowed', 1, 1, '2026-05-18', '2026-05-18 16:30:00', '10:00:00', 'uploads/products/toor_dal_primary.jpg', 'uploads/certificates/organic_certification.pdf', '[\"uploads/products/toor_dal_g1.jpg\", \"uploads/products/toor_dal_g2.jpg\"]', '[\"organic\", \"staples\", \"protein-rich\", \"best-seller\"]', '{\"shelf_life_months\": 12, \"hsn_code\": \"19053100\"}', '[{\"min_qty\": 10, \"price\": 170.00}, {\"min_qty\": 50, \"price\": 160.00}]', '2026-05-18 11:19:45', '2026-05-18 11:19:45'),
(2, 'Mega Monsoon Promo Campaign', 'mega-monsoon-promo-campaign', 'marketing@squadera.com', '$2b$12$K1.3zR5gZ6m1O0T.e6jLTu5JtPqgKx/w.kO2Uv4V/9X3y5Z.L/eK2', 'https://squadera.com/promos/monsoon-mega', '+18009998888', 1000, 350.00, 0.00, 95, 'Flat ₹350 instant discount on high volume wholesale orders.', '<h1>Festive Discount Coupon</h1><p>Applicable to all verified vendor businesses. Code: <strong>MONSOON350</strong></p>', 'coupons_promos', 'online_only', 0, 1, '2026-07-31', '2026-05-18 23:59:59', '23:59:59', 'uploads/promos/monsoon_banner.jpg', 'uploads/contracts/marketing_terms.pdf', '[\"uploads/promos/monsoon_card_g1.jpg\"]', '[\"discount\", \"seasonal\", \"wholesale\"]', '{\"max_discount_cap\": 1000.00, \"min_order_value\": 3000.00}', '[{\"min_qty\": 1, \"price\": 350.00}]', '2026-05-18 11:19:45', '2026-05-18 11:19:45'),
(3, 'Annapurna Wholesale Traders', 'annapurna-wholesale-traders', 'annapurna.wholesalers@gmail.com', '$2b$12$K1.3zR5gZ6m1O0T.e6jLTu5JtPqgKx/w.kO2Uv4V/9X3y5Z.L/eK2', 'https://annapurnatraders.in', '+919876500111', 1, 0.00, 18.00, 90, 'Main central regional distributor located in Dadar Industrial MIDC zone.', '<h3>Certified Wholesale Distributor</h3><p>Authorized regional distributor for high-volume staples, beverage supplies, and farm grains.</p>', 'crm_vendor', 'credit_approved', 1, 1, '2026-12-31', '2026-05-18 09:00:00', '09:00:00', 'uploads/vendors/annapurna_logo.jpg', 'uploads/gstin/annapurna_gst_certificate.pdf', '[\"uploads/vendors/warehouse_view_g1.jpg\", \"uploads/vendors/office_view_g2.jpg\"]', '[\"verified-dealer\", \"bulk-supplier\", \"mumbai-zone\"]', '{\"gstin\": \"27AAAAA1111A1Z1\", \"credit_limit\": 500000}', '[{\"tier\": \"Gold\", \"discount_rate\": 8.50}]', '2026-05-18 11:19:45', '2026-05-18 11:19:45'),
(4, 'Squadera Global Admin Settings', 'squadera-global-admin-settings', 'support@squadera.com', '$2b$12$K1.3zR5gZ6m1O0T.e6jLTu5JtPqgKx/w.kO2Uv4V/9X3y5Z.L/eK2', 'https://admin.squadera.com/global-settings', '+919876543211', 500, 0.00, 18.00, 45, 'Core control settings for loyalty coins points, support desks, and logistics fees.', '<h2>Global System Control Board</h2><p>Updates system parameters automatically including conversion rates and security rules.</p>', 'system_configs', 'secured_portals', 1, 1, '2026-12-31', '2026-05-18 00:00:00', '00:00:00', 'uploads/brand/squadera_admin_logo.jpg', 'uploads/docs/system_guide.pdf', NULL, '[\"system\", \"global\", \"restricted-access\"]', '{\"loyalty_points_rate\": 5.00, \"coin_conversion\": 1.00}', '[{\"min_order\": 1500.00, \"delivery_charge\": 0.00}, {\"min_order\": 0.00, \"delivery_charge\": 50.00}]', '2026-05-18 11:19:45', '2026-05-18 11:19:45');

-- --------------------------------------------------------

--
-- Table structure for table `query_logger`
--

CREATE TABLE `query_logger` (
  `id` int(11) NOT NULL,
  `userID` int(11) NOT NULL DEFAULT 0,
  `query` longtext NOT NULL,
  `note` varchar(255) DEFAULT NULL,
  `createdOn` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admins`
--
ALTER TABLE `admins`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_admins_email` (`email`),
  ADD KEY `idx_admins_is_deleted` (`isDeleted`),
  ADD KEY `idx_admins_created_on` (`createdOn`);

--
-- Indexes for table `master_form_inputs`
--
ALTER TABLE `master_form_inputs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `slug` (`slug`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `query_logger`
--
ALTER TABLE `query_logger`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_query_logger_user_id` (`userID`),
  ADD KEY `idx_query_logger_created_on` (`createdOn`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `admins`
--
ALTER TABLE `admins`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `master_form_inputs`
--
ALTER TABLE `master_form_inputs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `query_logger`
--
ALTER TABLE `query_logger`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

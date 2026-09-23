-- Location hierarchy (LGD-shaped), PIN codes, and institutions (AISHE-shaped).
--
-- The baseline `locations`, `user_locations`, `institutions` and `user_education` tables were never
-- read or written by the application; their shapes cannot hold an administrative hierarchy, so they
-- are replaced rather than altered.
DROP TABLE IF EXISTS user_locations;
DROP TABLE IF EXISTS locations;
DROP TABLE IF EXISTS user_education;
DROP TABLE IF EXISTS institutions;

-- One row per administrative unit or settlement. `state_id` / `district_id` are denormalised
-- ancestors so "everyone in district X" is a single indexed predicate at any depth.
-- Coordinates are an approximate centroid and may be NULL (LGD itself carries none).
CREATE TABLE IF NOT EXISTS places (
  id VARCHAR(64) PRIMARY KEY,
  kind ENUM('state', 'district', 'subdistrict', 'city', 'town', 'village') NOT NULL,
  name VARCHAR(150) NOT NULL,
  parent_id VARCHAR(64) DEFAULT NULL,
  state_id VARCHAR(64) DEFAULT NULL,
  district_id VARCHAR(64) DEFAULT NULL,
  lgd_code INT UNSIGNED DEFAULT NULL,
  latitude DECIMAL(8, 5) DEFAULT NULL,
  longitude DECIMAL(8, 5) DEFAULT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_places_lgd (kind, lgd_code),
  KEY idx_places_parent (parent_id, name),
  KEY idx_places_name (name),
  KEY idx_places_state (state_id),
  KEY idx_places_district (district_id),
  KEY idx_places_coords (latitude, longitude),
  CONSTRAINT fk_places_parent FOREIGN KEY (parent_id) REFERENCES places(id),
  CONSTRAINT fk_places_state FOREIGN KEY (state_id) REFERENCES places(id),
  CONSTRAINT fk_places_district FOREIGN KEY (district_id) REFERENCES places(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One row per 6-digit PIN code, aggregated from the India Post office directory.
CREATE TABLE IF NOT EXISTS pincodes (
  pincode CHAR(6) PRIMARY KEY,
  area_name VARCHAR(150) NOT NULL DEFAULT '',
  district_id VARCHAR(64) DEFAULT NULL,
  state_id VARCHAR(64) DEFAULT NULL,
  latitude DECIMAL(8, 5) DEFAULT NULL,
  longitude DECIMAL(8, 5) DEFAULT NULL,
  KEY idx_pincodes_district (district_id),
  CONSTRAINT fk_pincodes_district FOREIGN KEY (district_id) REFERENCES places(id) ON DELETE SET NULL,
  CONSTRAINT fk_pincodes_state FOREIGN KEY (state_id) REFERENCES places(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A member's chosen area. Coordinates are stored already coarsened (never raw device GPS) and are
-- never returned by the API; `label_precision` controls how much of the area others see.
CREATE TABLE IF NOT EXISTS user_locations (
  user_id VARCHAR(64) PRIMARY KEY,
  place_id VARCHAR(64) DEFAULT NULL,
  pincode CHAR(6) DEFAULT NULL,
  latitude DECIMAL(8, 5) DEFAULT NULL,
  longitude DECIMAL(8, 5) DEFAULT NULL,
  source ENUM('place', 'pincode', 'device') NOT NULL,
  label_precision ENUM('locality', 'city', 'state') NOT NULL DEFAULT 'city',
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_user_locations_place (place_id),
  KEY idx_user_locations_pincode (pincode),
  KEY idx_user_locations_coords (latitude, longitude),
  CONSTRAINT fk_user_locations_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_locations_place FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE SET NULL,
  CONSTRAINT fk_user_locations_pincode FOREIGN KEY (pincode) REFERENCES pincodes(pincode) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Universities, colleges and standalone institutions. `aishe_code` is set for imported rows.
CREATE TABLE IF NOT EXISTS institutions (
  id VARCHAR(64) PRIMARY KEY,
  aishe_code VARCHAR(20) DEFAULT NULL,
  name VARCHAR(255) NOT NULL,
  short_name VARCHAR(60) NOT NULL DEFAULT '',
  kind ENUM('university', 'college', 'standalone') NOT NULL,
  state_id VARCHAR(64) DEFAULT NULL,
  district_id VARCHAR(64) DEFAULT NULL,
  city VARCHAR(150) NOT NULL DEFAULT '',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_institutions_aishe (aishe_code),
  KEY idx_institutions_name (name),
  KEY idx_institutions_short_name (short_name),
  KEY idx_institutions_state (state_id, name),
  CONSTRAINT fk_institutions_state FOREIGN KEY (state_id) REFERENCES places(id) ON DELETE SET NULL,
  CONSTRAINT fk_institutions_district FOREIGN KEY (district_id) REFERENCES places(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A member's (single, current) institution.
CREATE TABLE IF NOT EXISTS user_education (
  user_id VARCHAR(64) PRIMARY KEY,
  institution_id VARCHAR(64) NOT NULL,
  course VARCHAR(100) NOT NULL DEFAULT '',
  start_year SMALLINT DEFAULT NULL,
  end_year SMALLINT DEFAULT NULL,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_user_education_institution (institution_id),
  CONSTRAINT fk_user_education_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_education_institution FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

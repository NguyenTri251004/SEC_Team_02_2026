-- =====================================================
-- 2. MATERIALS TABLE
-- Master data for raw materials, APIs, containers, etc.
-- =====================================================

CREATE TABLE IF NOT EXISTS materials (
  material_id VARCHAR(20) PRIMARY KEY NOT NULL,
  part_number VARCHAR(20) NOT NULL UNIQUE,
  material_name VARCHAR(100) NOT NULL,
  material_type ENUM(
    'API',
    'Excipient',
    'Dietary Supplement',
    'Container',
    'Closure',
    'Process Chemical',
    'Testing Material'
  ) NOT NULL,
  storage_conditions VARCHAR(100),
  specification_document VARCHAR(50),
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes for better query performance
  INDEX idx_part_number (part_number),
  INDEX idx_material_type (material_type),
  INDEX idx_created_date (created_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Master data for raw materials, APIs, containers, etc.';

-- =====================================================
-- Sample Data (Optional)
-- =====================================================

-- INSERT INTO materials (material_id, part_number, material_name, material_type, storage_conditions, specification_document, created_date)
-- VALUES 
--   ('MAT001', 'PART-10001', 'Acetaminophen API', 'API', '15-25°C, dry place', 'SPEC-ACE-001', NOW()),
--   ('MAT002', 'PART-10002', 'Cellulose Microcrystalline', 'Excipient', 'Room temperature', 'SPEC-CEL-001', NOW()),
--   ('MAT003', 'PART-10003', 'Gelatin Capsule Size 0', 'Container', '15-25°C', 'SPEC-CAP-001', NOW()),
--   ('MAT004', 'PART-10004', 'Sodium Stearyl Fumarate', 'Excipient', 'Ambient', 'SPEC-SSF-001', NOW()),
--   ('MAT005', 'PART-10005', 'HDPE Bottle 60ml', 'Container', 'Room temperature', 'SPEC-BOT-001', NOW());

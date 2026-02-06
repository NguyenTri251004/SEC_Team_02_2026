CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL
);

INSERT INTO users (name)
VALUES ('hello world');

CREATE TABLE IF NOT EXISTS materials (
  material_id VARCHAR(20) PRIMARY KEY NOT NULL,
  part_number VARCHAR(20) NOT NULL UNIQUE,
  material_name VARCHAR(100) NOT NULL,
  material_type VARCHAR(50) NOT NULL,
  storage_conditions VARCHAR(100),
  specification_document VARCHAR(50),
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_part_number ON materials (part_number);
CREATE INDEX IF NOT EXISTS idx_material_type ON materials (material_type);
CREATE INDEX IF NOT EXISTS idx_created_date ON materials (created_date);

INSERT INTO materials (
  material_id,
  part_number,
  material_name,
  material_type,
  storage_conditions,
  specification_document,
  created_date
)
VALUES
  ('MAT001', 'PART-10001', 'Acetaminophen API', 'API', '15-25°C, dry place', 'SPEC-ACE-001', NOW());

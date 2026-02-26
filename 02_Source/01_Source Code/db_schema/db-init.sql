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

-- Bảng giao dịch nhập/xuất kho
CREATE TABLE IF NOT EXISTS transactions (
  transaction_id   VARCHAR(20) PRIMARY KEY,
  transaction_type VARCHAR(10) NOT NULL CHECK (transaction_type IN ('IN', 'OUT')),
  material_id      VARCHAR(20) NOT NULL REFERENCES materials(material_id),
  quantity         DECIMAL(10, 2) NOT NULL CHECK (quantity > 0),
  unit             VARCHAR(20),
  notes            TEXT,
  created_by       VARCHAR(100),
  created_date     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tx_material_id   ON transactions (material_id);
CREATE INDEX IF NOT EXISTS idx_tx_type          ON transactions (transaction_type);
CREATE INDEX IF NOT EXISTS idx_tx_created_date  ON transactions (created_date);

-- Dữ liệu mẫu
INSERT INTO transactions (transaction_id, transaction_type, material_id, quantity, unit, notes, created_by)
VALUES
  ('TXN001', 'IN',  'MAT001', 100.00, 'kg', 'Nhập kho lần đầu',    'admin'),
  ('TXN002', 'OUT', 'MAT001',  20.00, 'kg', 'Xuất cho sản xuất',   'operator1');

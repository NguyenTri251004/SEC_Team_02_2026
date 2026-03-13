-- ============================================================
-- IMS - Inventory Management System
-- Database Schema Initialization
-- Based on Domain Model v1.0
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Users (Nguoi dung)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  user_id         VARCHAR(36)  PRIMARY KEY,          -- equals Keycloak sub (UUID)
  username        VARCHAR(50)  NOT NULL UNIQUE,
  email           VARCHAR(100) NOT NULL UNIQUE,
  role            VARCHAR(20)  NOT NULL DEFAULT 'Viewer'
                    CHECK (role IN ('Admin','InventoryManager','QualityControl','Production','Viewer')),
  is_active       BOOLEAN      NOT NULL DEFAULT true,
  last_login      TIMESTAMP    NULL,
  created_date    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modified_date   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
  -- NOTE: No password column — passwords are managed exclusively by Keycloak.
);

-- Seed users (user_ids match Keycloak subs defined in inventory-realm.json)
INSERT INTO users (user_id, username, email, role, is_active, last_login) VALUES
  ('11111111-1111-4111-8111-111111111111', 'admin',       'admin@ims.local',      'Admin',            true,  '2026-03-09 08:30:00'),
  ('22222222-2222-4222-8222-222222222222', 'inv_manager', 'manager@ims.local',    'InventoryManager', true,  '2026-03-08 14:15:00'),
  ('33333333-3333-4333-8333-333333333333', 'qc_user',     'qc@ims.local',         'QualityControl',   true,  '2026-03-09 07:45:00'),
  ('44444444-4444-4444-8444-444444444444', 'prod_user',   'production@ims.local', 'Production',       true,  '2026-03-07 16:20:00'),
  ('55555555-5555-4555-8555-555555555555', 'viewer',      'viewer@ims.local',     'Viewer',           false, NULL);

-- ────────────────────────────────────────────────────────────
-- 2. Materials (Nguyen vat lieu)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS materials (
  material_id              VARCHAR(20)  PRIMARY KEY,
  part_number              VARCHAR(20)  NOT NULL UNIQUE,
  material_name            VARCHAR(100) NOT NULL,
  material_type            VARCHAR(50)  NOT NULL
                             CHECK (material_type IN (
                               'API','Excipient','Dietary Supplement',
                               'Container','Closure','Process Chemical','Testing Material'
                             )),
  storage_conditions       VARCHAR(100),
  specification_document   VARCHAR(50),
  created_date             TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modified_date            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_materials_part_number    ON materials (part_number);
CREATE INDEX IF NOT EXISTS idx_materials_material_type  ON materials (material_type);
CREATE INDEX IF NOT EXISTS idx_materials_created_date   ON materials (created_date);

INSERT INTO materials (material_id, part_number, material_name, material_type, storage_conditions, specification_document) VALUES
  ('MAT001', 'PART-10001', 'Acetaminophen API',       'API',              '15-25C, dry place',              'SPEC-ACE-001'),
  ('MAT002', 'PART-10002', 'Microcrystalline Cellulose','Excipient',      '15-30C, protect from moisture',  'SPEC-MCC-001'),
  ('MAT003', 'PART-10003', 'HDPE Bottle 500ml',       'Container',        'Room temperature',               'SPEC-BTL-001'),
  ('MAT004', 'PART-10004', 'Child-Resistant Cap 38mm','Closure',          'Room temperature',               'SPEC-CAP-001'),
  ('MAT005', 'PART-10005', 'Ethanol 96%',             'Process Chemical', '15-25C, ventilated area',        'SPEC-ETH-001'),
  ('MAT006', 'PART-10006', 'Ibuprofen API',           'API',              '15-25C, dry place',              'SPEC-IBU-001'),
  ('MAT007', 'PART-10007', 'Reference Standard Kit',  'Testing Material', '2-8C, refrigerated',             'SPEC-REF-001');



-- ────────────────────────────────────────────────────────────
-- 3a. LabelTemplates (Mau nhan)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS label_templates (
  template_id      VARCHAR(36)    PRIMARY KEY,
  template_name    VARCHAR(100)   NOT NULL,
  label_type       VARCHAR(50)    NOT NULL CHECK (label_type IN (
                                    'Raw Material', 'Sample', 'Finished Product', 
                                    'API', 'Status', 'Intermediate'
                                  )),
  template_content TEXT           NOT NULL,  -- JSON or HTML template with placeholders
  width            DECIMAL(10,2)  DEFAULT 100.0,  -- in mm
  height           DECIMAL(10,2)  DEFAULT 50.0,   -- in mm
  description      TEXT,
  is_active        BOOLEAN        DEFAULT true,
  created_by       VARCHAR(50)    NOT NULL,
  created_date     TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modified_by      VARCHAR(50),
  modified_date    TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_label_templates_type ON label_templates (label_type);
CREATE INDEX IF NOT EXISTS idx_label_templates_active ON label_templates (is_active);

INSERT INTO label_templates (template_id, template_name, label_type, template_content, width, height, description, is_active, created_by) VALUES
  ('TPL-001', 'Standard Raw Material Label', 'Raw Material',
   '{"fields":["lot_id","material_name","manufacturer_lot","received_date","expiration_date","quantity","storage_location"]}',
   100.0, 50.0, 'Standard label for raw materials', true, 'admin'),
  ('TPL-002', 'API Label', 'API',
   '{"fields":["lot_id","material_name","manufacturer_name","manufacturer_lot","received_date","expiration_date","quantity","storage_conditions"]}',
   100.0, 75.0, 'Label for API materials', true, 'admin'),
  ('TPL-003', 'Status Label', 'Status',
   '{"fields":["lot_id","material_name","status","modified_date"]}',
   75.0, 37.5, 'Label for lot status indication', true, 'admin'),
  ('TPL-004', 'Finished Product Label', 'Finished Product',
   '{"fields":["batch_number","product_name","manufacture_date","expiration_date","batch_size"]}',
   100.0, 75.0, 'Label for finished products', true, 'admin'),
  ('TPL-005', 'Sample Label', 'Sample',
   '{"fields":["lot_id","material_name","is_sample","parent_lot_id","quantity"]}',
   75.0, 50.0, 'Label for QC samples', true, 'admin');

-- ────────────────────────────────────────────────────────────
-- 3b. GeneratedLabels (Nhan da tao)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS generated_labels (
  label_id         VARCHAR(36)    PRIMARY KEY,
  material_id      VARCHAR(20)    NOT NULL REFERENCES materials(material_id),
  entity_type      VARCHAR(20)    NOT NULL DEFAULT 'material'
                      CHECK (entity_type IN ('material', 'lot', 'batch')),
  entity_id        VARCHAR(36)    NOT NULL,
  code_type        VARCHAR(10)    NOT NULL CHECK (code_type IN ('barcode', 'qrcode')),
  code_data        TEXT           NOT NULL,
  label_content    TEXT           NOT NULL,
  created_by       VARCHAR(50)    NOT NULL,
  created_date     TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_generated_labels_material_id ON generated_labels (material_id);
CREATE INDEX IF NOT EXISTS idx_generated_labels_entity_type ON generated_labels (entity_type);
CREATE INDEX IF NOT EXISTS idx_generated_labels_entity_id ON generated_labels (entity_id);
CREATE INDEX IF NOT EXISTS idx_generated_labels_created_date ON generated_labels (created_date);
CREATE INDEX IF NOT EXISTS idx_generated_labels_code_type ON generated_labels (code_type);

-- ────────────────────────────────────────────────────────────
-- 4. InventoryLots (Lo hang)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_lots (
  lot_id                  VARCHAR(36)    PRIMARY KEY,
  material_id             VARCHAR(20)    NOT NULL REFERENCES materials(material_id),
  manufacturer_name       VARCHAR(100)   NOT NULL,
  manufacturer_lot        VARCHAR(50)    NOT NULL,
  supplier_name           VARCHAR(100),
  received_date           DATE           NOT NULL,
  expiration_date         DATE           NOT NULL,
  in_use_expiration_date  DATE,
  status                  VARCHAR(20)    NOT NULL DEFAULT 'Quarantine'
                            CHECK (status IN ('Quarantine','Accepted','Rejected','Depleted')),
  quantity                DECIMAL(10,3)  NOT NULL CHECK (quantity >= 0),
  unit_of_measure         VARCHAR(10)    NOT NULL,
  storage_location        VARCHAR(50),
  is_sample               BOOLEAN        NOT NULL DEFAULT false,
  parent_lot_id           VARCHAR(36)    REFERENCES inventory_lots(lot_id),
  po_number               VARCHAR(30),
  receiving_form_id       VARCHAR(50),
  created_date            TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modified_date           TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lots_material_id      ON inventory_lots (material_id);
CREATE INDEX IF NOT EXISTS idx_lots_status            ON inventory_lots (status);
CREATE INDEX IF NOT EXISTS idx_lots_expiration_date   ON inventory_lots (expiration_date);
CREATE INDEX IF NOT EXISTS idx_lots_received_date     ON inventory_lots (received_date);
CREATE INDEX IF NOT EXISTS idx_lots_parent_lot_id     ON inventory_lots (parent_lot_id);

INSERT INTO inventory_lots (lot_id, material_id, manufacturer_name, manufacturer_lot, supplier_name, received_date, expiration_date, status, quantity, unit_of_measure, storage_location, is_sample, po_number, receiving_form_id) VALUES
  ('LOT-001', 'MAT001', 'PharmaChem Inc.',     'MFG-2026-001', 'Global Suppliers Co.',   '2026-01-15', '2027-06-15', 'Accepted',   450.000, 'kg',  'WH-A, Rack 3',          false, 'PO-2026-0100', 'RF-001'),
  ('LOT-002', 'MAT002', 'CelluChem Ltd.',      'MFG-2026-045', 'MedSupply Ltd.',         '2026-02-01', '2028-02-01', 'Quarantine', 200.000, 'kg',  'WH-B, Rack 1',          false, 'PO-2026-0112', 'RF-002'),
  ('LOT-003', 'MAT001', 'PharmaChem Inc.',      'MFG-2026-078', 'Global Suppliers Co.',   '2026-02-20', '2026-03-10', 'Rejected',    50.000, 'kg',  'WH-A, Quarantine Zone', true,  NULL,           NULL),
  ('LOT-004', 'MAT005', 'EthaChem Corp.',       'MFG-2026-102', 'ChemDistributors Inc.',  '2026-01-10', '2027-01-10', 'Accepted',   800.000, 'L',   'WH-C, Hazmat Area',     false, 'PO-2026-0098', 'RF-003'),
  ('LOT-005', 'MAT003', 'PlastiPack Co.',       'MFG-2026-200', 'PackageWorld Ltd.',      '2026-02-15', '2029-02-15', 'Accepted',  5000.000, 'each','WH-D, Shelf 2',         false, 'PO-2026-0130', 'RF-004'),
  ('LOT-006', 'MAT006', 'IbuPharma Labs',       'MFG-2026-055', 'Global Suppliers Co.',   '2026-03-01', '2027-09-01', 'Quarantine', 300.000, 'kg',  'WH-A, Rack 5',          false, 'PO-2026-0145', 'RF-005'),
  ('LOT-007', 'MAT004', 'CapMakers Inc.',       'MFG-2026-310', 'PackageWorld Ltd.',      '2026-02-20', '2029-02-20', 'Accepted',  8000.000, 'each','WH-D, Shelf 3',         false, 'PO-2026-0131', 'RF-006'),
  ('LOT-008', 'MAT002', 'CelluChem Ltd.',       'MFG-2026-090', 'MedSupply Ltd.',         '2026-01-05', '2027-12-05', 'Depleted',     0.000, 'kg',  'WH-B, Rack 1',          false, 'PO-2026-0080', 'RF-007');

-- LOT-003 is a sample split from LOT-001
UPDATE inventory_lots SET parent_lot_id = 'LOT-001' WHERE lot_id = 'LOT-003';

-- ────────────────────────────────────────────────────────────
-- 5. InventoryTransactions (Giao dich kho)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_transactions (
  transaction_id    VARCHAR(36)    PRIMARY KEY,
  lot_id            VARCHAR(36)    NOT NULL REFERENCES inventory_lots(lot_id),
  transaction_type  VARCHAR(20)    NOT NULL
                      CHECK (transaction_type IN ('Receipt','Usage','Split','Transfer','Adjustment','Disposal','QC_Approved','QC_Rejected')),
  quantity          DECIMAL(10,3)  NOT NULL,
  unit_of_measure   VARCHAR(10)    NOT NULL,
  reference_id      VARCHAR(50),
  notes             TEXT,
  performed_by      VARCHAR(50)    NOT NULL,
  transaction_date  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_date      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_txn_lot_id           ON inventory_transactions (lot_id);
CREATE INDEX IF NOT EXISTS idx_txn_type             ON inventory_transactions (transaction_type);
CREATE INDEX IF NOT EXISTS idx_txn_transaction_date ON inventory_transactions (transaction_date);
CREATE INDEX IF NOT EXISTS idx_txn_performed_by     ON inventory_transactions (performed_by);

INSERT INTO inventory_transactions (transaction_id, lot_id, transaction_type, quantity, unit_of_measure, reference_id, notes, performed_by, transaction_date) VALUES
  -- LOT-001: received 500kg, then 50kg split for sample
  ('TXN-001', 'LOT-001', 'Receipt',    500.000, 'kg',   'PO-2026-0100', 'Initial receipt from supplier',              'prod_user',   '2026-01-15 09:30:00'),
  ('TXN-002', 'LOT-001', 'Split',      -50.000, 'kg',   'LOT-003',      'Split sample for QC testing',                'prod_user',   '2026-02-20 10:00:00'),

  -- LOT-002: received 200kg
  ('TXN-003', 'LOT-002', 'Receipt',    200.000, 'kg',   'PO-2026-0112', 'New MCC delivery',                           'prod_user',   '2026-02-01 10:15:00'),

  -- LOT-003: sample received from split
  ('TXN-004', 'LOT-003', 'Receipt',     50.000, 'kg',   'LOT-001',      'Sample split from LOT-001',                  'prod_user',   '2026-02-20 10:00:00'),

  -- LOT-004: received, then used in production
  ('TXN-005', 'LOT-004', 'Receipt',   1000.000, 'L',    'PO-2026-0098', 'Ethanol delivery',                           'prod_user',   '2026-01-10 08:00:00'),
  ('TXN-006', 'LOT-004', 'Usage',     -200.000, 'L',    'BATCH-001',    'Used in production batch B-2026-001',        'prod_user',   '2026-01-22 14:00:00'),

  -- LOT-005: received containers
  ('TXN-007', 'LOT-005', 'Receipt',   5000.000, 'each', 'PO-2026-0130', 'HDPE bottles delivery',                      'prod_user',   '2026-02-15 11:00:00'),

  -- LOT-006: received
  ('TXN-008', 'LOT-006', 'Receipt',    300.000, 'kg',   'PO-2026-0145', 'Ibuprofen API delivery',                     'prod_user',   '2026-03-01 09:00:00'),

  -- LOT-007: received caps
  ('TXN-009', 'LOT-007', 'Receipt',   8000.000, 'each', 'PO-2026-0131', 'Caps delivery',                              'prod_user',   '2026-02-20 13:00:00'),

  -- LOT-008: received, used fully, now depleted
  ('TXN-010', 'LOT-008', 'Receipt',    100.000, 'kg',   'PO-2026-0080', 'MCC delivery (old batch)',                    'prod_user',   '2026-01-05 09:00:00'),
  ('TXN-011', 'LOT-008', 'Usage',     -100.000, 'kg',   'BATCH-001',    'Fully consumed in production',               'prod_user',   '2026-01-25 16:00:00'),

  -- LOT-001: adjustment after inventory count
  ('TXN-012', 'LOT-001', 'Adjustment',  0.000,  'kg',   NULL,           'Inventory count verified - no discrepancy',  'inv_manager', '2026-02-28 11:00:00');

-- ────────────────────────────────────────────────────────────
-- 6. QCTests (Kiem tra chat luong)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qc_tests (
  test_id              VARCHAR(36)   PRIMARY KEY,
  lot_id               VARCHAR(36)   NOT NULL REFERENCES inventory_lots(lot_id),
  test_type            VARCHAR(30)   NOT NULL
                         CHECK (test_type IN ('Identity','Potency','Microbial','Growth Promotion','Physical','Chemical')),
  test_method          VARCHAR(100)  NOT NULL,
  test_date            DATE          NOT NULL,
  test_result          VARCHAR(100),
  acceptance_criteria  VARCHAR(200),
  result_status        VARCHAR(10)   NOT NULL DEFAULT 'Pending'
                         CHECK (result_status IN ('Pass','Fail','Pending')),
  performed_by         VARCHAR(50)   NOT NULL,
  verified_by          VARCHAR(50),
  created_date         TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modified_date        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_qc_lot_id         ON qc_tests (lot_id);
CREATE INDEX IF NOT EXISTS idx_qc_result_status  ON qc_tests (result_status);
CREATE INDEX IF NOT EXISTS idx_qc_test_date      ON qc_tests (test_date);

INSERT INTO qc_tests (test_id, lot_id, test_type, test_method, test_date, test_result, acceptance_criteria, result_status, performed_by, verified_by) VALUES
  -- LOT-001: passed all tests -> Accepted
  ('QC-001', 'LOT-001', 'Identity',  'HPLC Analysis',         '2026-01-16', '98.5% purity',       '>= 98.0% purity',       'Pass', 'qc_user', 'admin'),
  ('QC-002', 'LOT-001', 'Potency',   'UV Spectroscopy',       '2026-01-16', '99.1% potency',      '>= 95.0% potency',      'Pass', 'qc_user', 'admin'),
  ('QC-003', 'LOT-001', 'Microbial', 'USP <61> Bioburden',    '2026-01-17', '< 10 CFU/g',         '< 100 CFU/g',           'Pass', 'qc_user', 'admin'),

  -- LOT-002: pending QC (still in Quarantine)
  ('QC-004', 'LOT-002', 'Identity',  'FTIR Spectroscopy',     '2026-02-03', NULL,                  'Match reference spectrum','Pending', 'qc_user', NULL),
  ('QC-005', 'LOT-002', 'Physical',  'Particle Size Analysis','2026-02-03', NULL,                  '50-150 um',              'Pending', 'qc_user', NULL),

  -- LOT-003: failed potency -> Rejected
  ('QC-006', 'LOT-003', 'Identity',  'HPLC Analysis',         '2026-02-21', '97.2% purity',       '>= 98.0% purity',       'Pass',  'qc_user', 'admin'),
  ('QC-007', 'LOT-003', 'Potency',   'UV Spectroscopy',       '2026-02-21', '85.2% potency',      '>= 95.0% potency',      'Fail',  'qc_user', 'admin'),

  -- LOT-004: passed -> Accepted
  ('QC-008', 'LOT-004', 'Identity',  'GC-MS Analysis',        '2026-01-11', '96.1% ethanol',      '>= 95.0%',              'Pass', 'qc_user', 'admin'),
  ('QC-009', 'LOT-004', 'Chemical',  'Water Content (KF)',    '2026-01-11', '3.8% water',         '< 5.0%',               'Pass', 'qc_user', 'admin'),

  -- LOT-005: passed -> Accepted (container visual inspection)
  ('QC-010', 'LOT-005', 'Physical',  'Visual Inspection',     '2026-02-16', 'No defects found',   'Zero visible defects',  'Pass', 'qc_user', 'admin'),

  -- LOT-006: pending QC (still in Quarantine)
  ('QC-011', 'LOT-006', 'Identity',  'HPLC Analysis',         '2026-03-02', NULL,                  '>= 98.0% purity',       'Pending', 'qc_user', NULL),
  ('QC-012', 'LOT-006', 'Potency',   'UV Spectroscopy',       '2026-03-02', NULL,                  '>= 95.0% potency',      'Pending', 'qc_user', NULL),
  ('QC-013', 'LOT-006', 'Microbial', 'USP <61> Bioburden',    '2026-03-03', NULL,                  '< 100 CFU/g',           'Pending', 'qc_user', NULL),

  -- LOT-007: passed -> Accepted (cap inspection)
  ('QC-014', 'LOT-007', 'Physical',  'Torque Test',           '2026-02-21', '12 in-lb',           '10-15 in-lb',           'Pass', 'qc_user', 'admin'),

  -- LOT-008: passed when it existed -> was Accepted, now Depleted
  ('QC-015', 'LOT-008', 'Identity',  'FTIR Spectroscopy',     '2026-01-06', 'Match confirmed',    'Match reference spectrum','Pass', 'qc_user', 'admin');

-- ────────────────────────────────────────────────────────────
-- 7. ProductionBatches (Lo san xuat)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS production_batches (
  batch_id          VARCHAR(36)    PRIMARY KEY,
  product_id        VARCHAR(20)    NOT NULL REFERENCES materials(material_id),
  batch_number      VARCHAR(50)    NOT NULL UNIQUE,
  batch_size        DECIMAL(10,3)  NOT NULL,
  unit_of_measure   VARCHAR(10)    NOT NULL,
  manufacture_date  DATE           NOT NULL,
  expiration_date   DATE           NOT NULL,
  status            VARCHAR(20)    NOT NULL DEFAULT 'Planned'
                      CHECK (status IN ('Planned','In Progress','Complete','Rejected')),
  created_date      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modified_date     TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_batch_product_id  ON production_batches (product_id);
CREATE INDEX IF NOT EXISTS idx_batch_status      ON production_batches (status);
CREATE INDEX IF NOT EXISTS idx_batch_mfg_date    ON production_batches (manufacture_date);

INSERT INTO production_batches (batch_id, product_id, batch_number, batch_size, unit_of_measure, manufacture_date, expiration_date, status) VALUES
  ('BATCH-001', 'MAT001', 'B-2026-001', 1000.000, 'tablets', '2026-01-20', '2028-01-20', 'Complete'),
  ('BATCH-002', 'MAT006', 'B-2026-002',  500.000, 'capsules','2026-03-10', '2028-03-10', 'Planned'),
  ('BATCH-003', 'MAT001', 'B-2026-003', 2000.000, 'tablets', '2026-03-15', '2028-03-15', 'Planned');

-- ────────────────────────────────────────────────────────────
-- 8. BatchComponents (Thanh phan lo san xuat)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS batch_components (
  component_id      VARCHAR(36)    PRIMARY KEY,
  batch_id          VARCHAR(36)    NOT NULL REFERENCES production_batches(batch_id),
  lot_id            VARCHAR(36)    NOT NULL REFERENCES inventory_lots(lot_id),
  planned_quantity  DECIMAL(10,3)  NOT NULL,
  actual_quantity   DECIMAL(10,3),
  unit_of_measure   VARCHAR(10)    NOT NULL,
  addition_date     TIMESTAMP,
  added_by          VARCHAR(50),
  created_date      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modified_date     TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_comp_batch_id ON batch_components (batch_id);
CREATE INDEX IF NOT EXISTS idx_comp_lot_id   ON batch_components (lot_id);

INSERT INTO batch_components (component_id, batch_id, lot_id, planned_quantity, actual_quantity, unit_of_measure, addition_date, added_by) VALUES
  -- BATCH-001 used LOT-001 (Acetaminophen) + LOT-008 (MCC) + LOT-004 (Ethanol)
  ('COMP-001', 'BATCH-001', 'LOT-001',  50.000,  50.000, 'kg', '2026-01-22 08:00:00', 'prod_user'),
  ('COMP-002', 'BATCH-001', 'LOT-008', 100.000, 100.000, 'kg', '2026-01-22 08:30:00', 'prod_user'),
  ('COMP-003', 'BATCH-001', 'LOT-004', 200.000, 200.000, 'L',  '2026-01-22 09:00:00', 'prod_user');

-- ============================================================
-- End of schema initialization
-- ============================================================

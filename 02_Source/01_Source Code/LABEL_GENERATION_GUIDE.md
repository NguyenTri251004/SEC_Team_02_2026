# Label Generation Feature

## Tổng quan

Tính năng tạo label với barcode/QR code cho sản phẩm và lô hàng trong kho. Khi quét mã sẽ hiển thị thông tin chi tiết của lô hàng hoặc batch sản xuất.

## Tính năng

### 1. Chọn Template
- Chọn từ danh sách template label có sẵn
- Mỗi template có loại và kích thước riêng
- Hiển thị suggestion về entity type phù hợp

### 2. Chọn Entity Type [NEW - v2.0]
- **Material**: Nguyên vật liệu cơ bản
- **Inventory Lot**: Lô hàng trong kho (recommended cho Raw Material labels)
- **Production Batch**: Lô sản xuất (recommended cho Finished Product labels)

### 3. Chọn Entity cụ thể
- Dropdown hiển thị entities tương ứng với type đã chọn
- **Lots**: Hiển thị lot_id, material_name, status
- **Batches**: Hiển thị batch_number, status  
- **Materials**: Hiển thị part_number, material_name, type

### 4. Chọn loại mã
- **QR Code**: Chứa toàn bộ thông tin JSON của entity
- **Barcode**: Chỉ chứa entity_id (lot_id, batch_id, hoặc material_id)

### 5. Preview & Download
- Xem trước label đã generate
- Hiển thị entity type và entity ID
- Xem nội dung được mã hóa
- Download dưới dạng PNG

## Cách sử dụng

### Frontend (UI)

1. Vào trang **Labels** từ sidebar
2. Click button **"Generate Label"**
3. Chọn template
4. Chọn entity type:
   - **Material**: Cho labels cơ bản
   - **Lot**: Cho labels lô hàng nguyên vật liệu (raw materials, APIs)
   - **Batch**: Cho labels lô sản xuất (finished products)
5. Chọn entity cụ thể từ dropdown (lot/batch/material)
6. Chọn loại code (QR Code hoặc Barcode)
7. Click **"Generate"**
8. Preview label với entity info
9. Download label

### Backend API

**Endpoint**: `POST /api/labels/generate-from-template`

**Request Body**:
```json
{
  "template_id": "TPL-001",
  "entity_type": "lot",       // "material", "lot", or "batch"
  "entity_id": "LOT-001",     // ID tương ứng với entity_type
  "code_type": "qrcode"       // "qrcode" hoặc "barcode"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "label_id": "uuid",
    "material_id": "MAT001",
    "material_name": "Acetaminophen API",
    "part_number": "PART-10001",
    "material_type": "API",
    "entity_type": "lot",
    "entity_id": "LOT-001",
    "code_type": "qrcode",
    "code_data": "data:image/png;base64,iVBORw0KGgo...",
    "label_content": {
      "entity_type": "lot",
      "entity_id": "LOT-001", 
      "lot_id": "LOT-001",
      "material_name": "Acetaminophen API",
      "manufacturer_name": "PharmaChem Inc.",
      "expiration_date": "2027-06-15",
      "quantity": 450.0,
      ...
    },
    "created_by": "prod_user",
    "created_date": "2026-03-12T10:30:00.000Z"
  }
}
```

## Workflow Chi tiết

### Frontend Flow (GenerateLabelModal)

```
User clicks "Generate Label"
  ↓
GenerateLabelModal opens
  ↓
Step 1: Chọn Template từ dropdown
  - Displays available templates (TPL-001, TPL-002, etc.)
  - Shows template name, type, dimensions
  ↓
Step 2: System hiển thị Alert với suggested entity type
  - Raw Material Template → suggest "Inventory Lot"
  - Finished Product Template → suggest "Production Batch"
  - General Template → suggest "Material"
  ↓
Step 3: Chọn Entity Type via Radio.Group
  - Radio Button: Material / Inventory Lot / Production Batch
  - onChange → triggers entity dropdown update
  ↓
Step 4: Chọn Entity cụ thể từ conditional Select
  - If entity_type="material":
      → dropdown Materials (part_number, material_name, type)
  - If entity_type="lot":
      → dropdown Inventory Lots (lot_id, material_name, status)
  - If entity_type="batch":
      → dropdown Production Batches (batch_number, material_name, status)
  ↓
Step 5: Chọn Code Type
  - Radio Button: QR Code / Barcode
  - QR Code: Full JSON data
  - Barcode: ID only (lot_id/batch_id/material_id)
  ↓
Step 6: Preview label
  - Template info (name, dimensions)
  - Entity type tag (color-coded)
  - Entity ID
  - Barcode/QRCode preview image
  ↓
Step 7: Click "Generate"
  → API call: POST /api/labels/generate-from-template
  → Request body:
     {
       template_id, 
       entity_type,
       entity_id,
       code_type
     }
  ↓
Step 8: Display generated label
  - Shows base64 image
  - Download button enabled
  ↓
Step 9: User downloads or prints
```

### Backend Flow (label.service.ts)

```
POST /api/labels/generate-from-template received
  ↓
Validate request:
  - Check entity_type IN ['material', 'lot', 'batch']
  - Check template_id exists
  - Check code_type IN ['qrcode', 'barcode']
  ↓
Call generateLabelFromTemplate(input)
  ↓
Fetch entity data (conditional query):
  
  IF entity_type === 'lot':
    SELECT l.*, m.material_name, m.part_number, m.material_type
    FROM inventory_lots l
    JOIN materials m ON l.material_id = m.material_id
    WHERE l.lot_id = entity_id
  
  ELSE IF entity_type === 'batch':
    SELECT b.*, m.material_name, m.part_number, m.material_type
    FROM production_batches b
    JOIN materials m ON b.material_id = m.material_id
    WHERE b.batch_number = entity_id
  
  ELSE (entity_type === 'material'):
    SELECT * FROM materials
    WHERE material_id = entity_id
  ↓
Validate entity exists:
  - If not found → throw error "Entity not found"
  ↓
Build label_content object:
  - Merge entity data với template layout
  - Include entity_type, entity_id
  - Add material_name, part_number, etc.
  ↓
Generate code image:
  - If code_type === 'qrcode':
      → QRCode.toDataURL(JSON.stringify(label_content))
  - If code_type === 'barcode':
      → bwipjs.toBuffer({ text: entity_id, bcid: 'code128' })
  - Result: base64 data URL
  ↓
Save to database:
  INSERT INTO generated_labels (
    label_id (UUID),
    template_id,
    material_id,
    entity_type,
    entity_id,
    code_type,
    code_data (base64),
    label_content (JSONB),
    created_by,
    created_date
  )
  ↓
Return response:
  {
    success: true,
    data: {
      label_id,
      material_id,
      entity_type,
      entity_id,
      code_data (base64),
      label_content,
      created_by,
      created_date
    }
  }
```

## Thông tin kỹ thuật

### Backend Dependencies
- `qrcode`: Generate QR codes
- `jsbarcode`: Generate barcodes (CODE128)
- `canvas`: Render codes to image

### Frontend Components
- `GenerateLabelModal`: Modal UI để tạo label
- `LabelTemplateFormModal`: Quản lý templates

### Permissions (RBAC)
- **read**: Admin, Inventory Manager, QC, Production, Viewer
- **create/update/delete** (templates): Admin, Inventory Manager
- **generate** (labels): Admin, Inventory Manager, QC, Production

### Database Schema

**Table: generated_labels**
```sql
CREATE TABLE generated_labels (
  label_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id VARCHAR(20) REFERENCES label_templates(template_id),
  material_id VARCHAR(20) NOT NULL REFERENCES materials(material_id),
  entity_type VARCHAR(20) DEFAULT 'material' 
    CHECK (entity_type IN ('material', 'lot', 'batch')),
  entity_id VARCHAR(36) NOT NULL,  -- lot_id, batch_id, or material_id
  code_type VARCHAR(10) NOT NULL CHECK (code_type IN ('qrcode', 'barcode')),
  code_data TEXT NOT NULL,  -- base64 image data
  label_content JSONB,  -- full entity data as JSON
  created_by VARCHAR(100),
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_generated_labels_entity_type ON generated_labels(entity_type);
CREATE INDEX idx_generated_labels_entity_id ON generated_labels(entity_id);
```

**Key Fields:**
- `entity_type`: Discriminator field - determines which table entity_id refers to
- `entity_id`: Universal ID field - stores lot_id, batch_id, or material_id
- `material_id`: Always populated - from entity's material reference or directly
- `label_content`: JSONB - stores complete entity data snapshot at generation time

## QR Code vs Barcode

### QR Code
- ✅ Chứa nhiều thông tin (full JSON)
- ✅ Có thể quét từ mọi góc độ
- ✅ Có khả năng sửa lỗi
- ❌ Cần không gian lớn hơn

### Barcode
- ✅ Compact, tiết kiệm không gian
- ✅ Dễ in ấn
- ❌ Chỉ chứa ID (cần tra cứu database)
- ❌ Phải quét theo hướng ngang

## Ứng dụng thực tế

1. **Nhập kho**: In label QR code cho mỗi lô hàng mới nhập
2. **Kiểm tra chất lượng**: Quét QR để xem lịch sử và thông tin test
3. **Sản xuất**: In barcode cho batch sản xuất để tracking
4. **Xuất hàng**: Scan QR/barcode để cập nhật số lượng tồn kho

## Demo Usage

```bash
# 1. Start backend
cd backend
npm run dev

# 2. Start frontend
cd frontend
npm run dev

# 3. Navigate to http://localhost:5173/labels
# 4. Click "Generate Label"
# 5. Select options and generate
```

## Notes

- Label templates phải được tạo trước khi generate labels
- QR code encode toàn bộ label_content object dưới dạng JSON
- Barcode chỉ encode entity_id (lot_id, batch_id, hoặc material_id)
- Code data được trả về dưới dạng base64 data URL
- Frontend có thể trực tiếp hiển thị trong `<img>` tag hoặc download
- ✅ **[v2.0]** Labels history được lưu vào database (generated_labels table)
- ✅ **[v2.0]** Support entity-based label generation (material/lot/batch)
- Entity type selector tự động suggest loại phù hợp dựa trên label_type của template

## Future Improvements

- [ ] Hỗ trợ in batch labels (nhiều labels cùng lúc cho 1 lot/batch)
- [ ] Tùy chỉnh template design trong UI (drag-drop editor)
- [ ] API endpoint để quét và decode QR/barcode
- [ ] Export labels dưới dạng PDF để in (multiple labels per page)
- [ ] Label reprinting history (track how many times a label was printed)
- [ ] Auto-generate labels on lot/batch creation (configurable)

# Label Generation Feature

## Tổng quan

Tính năng tạo label với barcode/QR code cho sản phẩm và lô hàng trong kho. Khi quét mã sẽ hiển thị thông tin chi tiết của lô hàng hoặc batch sản xuất.

## Tính năng

### 1. Chọn Template
- Chọn từ danh sách template label có sẵn
- Mỗi template có loại và kích thước riêng

### 2. Chọn Sản phẩm
- **Inventory Lot**: Lô hàng nguyên vật liệu trong kho
- **Production Batch**: Lô sản xuất

### 3. Chọn loại mã
- **QR Code**: Chứa toàn bộ thông tin JSON của sản phẩm
- **Barcode**: Chỉ chứa ID (lot_id hoặc batch_id)

### 4. Preview & Download
- Xem trước label đã generate
- Xem nội dung được mã hóa
- Download dưới dạng PNG

## Cách sử dụng

### Frontend (UI)

1. Vào trang **Labels** từ sidebar
2. Click button **"Generate Label"**
3. Chọn template
4. Chọn loại entity (Lot hoặc Batch)
5. Chọn lot/batch cụ thể
6. Chọn loại code (QR Code hoặc Barcode)
7. Click **"Generate"**
8. Preview và download label

### Backend API

**Endpoint**: `POST /api/labels/generate`

**Request Body**:
```json
{
  "template_id": "TPL-001",
  "lot_id": "LOT-001",        // hoặc batch_id
  "code_type": "qrcode"       // "qrcode" hoặc "barcode"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "template_id": "TPL-001",
    "template_name": "Standard Raw Material Label",
    "label_type": "Raw Material",
    "width": 4.0,
    "height": 2.0,
    "content": {
      "lot_id": "LOT-001",
      "material_name": "Acetaminophen API",
      "manufacturer_name": "PharmaChem Inc.",
      "expiration_date": "2027-06-15",
      "quantity": 450.0,
      "unit_of_measure": "kg",
      ...
    },
    "code_type": "qrcode",
    "code_data": "data:image/png;base64,iVBORw0KGgo...",
    "generated_date": "2026-03-12T10:30:00.000Z"
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
- QR code encode toàn bộ content object dưới dạng JSON
- Barcode chỉ encode lot_id hoặc batch_id
- Code data được trả về dưới dạng base64 data URL
- Frontend có thể trực tiếp hiển thị trong `<img>` tag hoặc download

## Future Improvements

- [ ] Lưu lịch sử labels đã generate vào database
- [ ] Hỗ trợ in batch labels (nhiều labels cùng lúc)
- [ ] Tùy chỉnh template design trong UI
- [ ] API endpoint để quét và decode QR/barcode
- [ ] Export labels dưới dạng PDF để in

# Prototype - Hệ thống Quản lý Kho (Inventory Management System - IMS)

## 1. Link Figma Prototype

🔗 **Figma Design:** https://www.figma.com/design/J2iBsmNlI9tuCvZyI6QGnB/Untitled?node-id=86-14&t=XX4o4W2xdVO2LrS8-1
🔗 **Main Workflow:** https://www.figma.com/proto/J2iBsmNlI9tuCvZyI6QGnB/Untitled?node-id=131-4&p=f&t=7EERWg3MwnsSbfUe-1&scaling=contain&content-scaling=fixed&page-id=86%3A14&starting-point-node-id=131%3A4

---

## 2. Quy trình Nghiệp vụ Chính (Main Workflow)

### Luồng End-to-End: Từ Nhận Nguyên liệu đến Sản phẩm Hoàn thành

> **Mục tiêu:** Minh họa toàn bộ luồng nghiệp vụ từ khi nhận nguyên liệu, kiểm tra chất lượng, đến sản xuất và hoàn thành sản phẩm.

**Bước 1: Tạo Nguyên vật liệu (CREATE Material)**

- Admin/Inventory manager tạo Material master data
  - Material ID: MAT-001
  - Material Name: "Vitamin D3 100K"
  - Material Type: API
  - Storage: "2-8°C, dry"

**Bước 2: Nhận hàng vào kho (RECEIVE InventoryLot)**

- Inventory manager nhập thông tin lô hàng mới:
  - Material: MAT-001 (Vitamin D3 100K)
  - Manufacturer: Acme Pharma
  - Manufacturer Lot: MFR-2025-001
  - Received Date: 2025-01-10
  - Expiration Date: 2026-01-10
  - Quantity: 25.5 kg
  - Status: **QUARANTINE** (tự động)
- Hệ thống tự động:
  - Tạo InventoryTransaction (type: RECEIPT, +25.5 kg)
  - Generate và in **RAW MATERIAL LABEL**

**Bước 3: Kiểm tra Chất lượng (QC TESTING)**

- QC thực hiện các test:
  - Identity Test → PASS
  - Potency Test → PASS
  - (Microbial, Physical... → PASS)
- QC Supervisor xác nhận kết quả
- Hệ thống cập nhật:
  - InventoryLot status: **QUARANTINE → ACCEPTED**
  - Generate và in **STATUS LABEL** (Accepted)

**Bước 4: Tạo Lô Sản xuất (CREATE ProductionBatch)**

- Production operator tạo batch:
  - Product: PROD-001 (Vitamin D3 Softgel 1000IU)
  - Batch Number: PB-2025-0001
  - Batch Size: 1000 units
  - Manufacture Date: 2025-01-20
  - Expiration Date: 2026-01-20
  - Status: **PLANNED**

**Bước 5: Bắt đầu Sản xuất (START Production)**

- Production operator click **Start Production**
- Hệ thống cập nhật ProductionBatch status:
  - **PLANNED → IN PROGRESS**

**Bước 6: Thêm Nguyên liệu (ADD BatchComponent)**

- Production operator thêm component:
  - Batch: PB-2025-0001
  - Lot: lot-uuid-001 (MAT-001, status: ACCEPTED)
  - Planned Quantity: 2.0 kg
  - Actual Quantity: 2.0 kg
- Hệ thống tự động:
  - Kiểm tra: Status = ACCEPTED? ✅
  - Kiểm tra: Chưa hết hạn? ✅
  - Kiểm tra: Đủ quantity? ✅ (25.5 kg available)
  - Tạo InventoryTransaction (type: USAGE, -2.0 kg)
  - Cập nhật InventoryLot quantity: 25.5 → 23.5 kg

**Bước 7: Hoàn thành Sản xuất (COMPLETE Batch)**

- Production operator click **Complete Batch**
- Hệ thống update:
  - ProductionBatch status: **IN PROGRESS → COMPLETE**
  - Generate và in **FINISHED PRODUCT LABEL**

**Bước 8: Trạng thái Cuối cùng (FINAL State)**

- InventoryLot (lot-uuid-001):
  - Quantity: 23.5 kg (còn lại sau khi dùng 2 kg)
  - Status: ACCEPTED
- ProductionBatch (batch-uuid-001):
  - Status: COMPLETE
  - Batch Size: 1000 units
  - Traceability: Dùng lot-uuid-001 (2.0 kg)

# 02. Domain Model

## 1. Tổng quan về Inventory Management
Dự án quản lý kho (Inventory Management) được xây dựng dựa trên 4 trụ cột chính để đảm bảo tính minh bạch, tuân thủ pháp luật và hiệu quả vận hành.

## 2. Bốn trụ cột kiến thức (Domain Pillars)

### 2.1 Material Management (Quản lý vật tư)
Đây là cốt lõi của hệ thống, quản lý thông tin định danh và vòng đời của nguyên vật liệu.
- **Khái niệm:** Quản lý danh mục, đơn vị tính (UoM), định mức tồn kho và quy tắc lưu kho.
- **Thực thể liên quan:** `Material/Item`, `Category`, `UnitOfMeasure`, `StorageCondition`.
- **Nghiệp vụ:** Phân loại vật tư, quản lý trạng thái vật tư (hoạt động/ngừng sử dụng), thiết lập ngưỡng tồn kho tối thiểu.

### 2.2 Inventory Lot Tracking (Truy vết theo lô)
Đảm bảo 100% khả năng truy xuất nguồn gốc (traceability), đặc biệt quan trọng cho vai trò QC và tuân thủ pháp luật.
- **Khái niệm:** Gán mã số định danh cho từng đợt nhập hàng (Lot/Batch) để theo dõi ngày sản xuất, hạn sử dụng và nhà cung cấp.
- **Thực thể liên quan:** `LotNumber`, `Batch`, `ExpiryDate`, `ManufactureDate`, `VendorSource`.
- **Nghiệp vụ:** Nhập hàng theo lô, xuất hàng theo quy tắc FIFO (First In First Out) hoặc FEFO (First Expired First Out), thu hồi hàng theo lô.

### 2.3 Label Generation (Khởi tạo nhãn dán)
Thay thế việc ghi chép tay bằng công nghệ nhận diện tự động (Barcode/QR Code).
- **Khái niệm:** Tự động tạo mã vạch hoặc mã QR chứa thông tin vật tư và mã lô ngay khi nhập kho.
- **Thực thể liên quan:** `LabelTemplate`, `Barcode`, `QRCode`, `PrintingJob`.
- **Nghiệp vụ:** In nhãn khi nhập kho, quét mã khi xuất/kiểm kho, dán nhãn vị trí kho.

### 2.4 Reporting (Hệ thống báo cáo)
Cung cấp dữ liệu cho quản lý và phục vụ thanh tra, kiểm tra pháp lý.
- **Khái niệm:** Tổng hợp dữ liệu từ các giao dịch để đưa ra cái nhìn toàn diện về tình trạng kho.
- **Thực thể liên quan:** `InventoryReport`, `StockLedger`, `MovementHistory`, `ValuationReport`.
- **Nghiệp vụ:** Báo cáo nhập-xuất-tồn, báo cáo hàng sắp hết hạn, báo cáo đối soát chênh lệch kiểm kê, báo cáo tuân thủ.

## 3. Danh sách các thực thể (Entities)

| Nhóm | Thực thể | Mô tả |
| :--- | :--- | :--- |
| **Cấu hình** | `User`, `Role`, `Warehouse`, `Supplier`, `Material`, `UoM` | Thông tin nền tảng của hệ thống |
| **Giao dịch** | `Receipt`, `Issue`, `Transfer`, `Stocktake` | Các hoạt động làm thay đổi số lượng tồn kho |
| **Truy vết** | `InventoryLot`, `SerialNumber`, `AuditLog` | Theo dõi chi tiết từng đơn vị hàng hóa và thao tác người dùng |
| **Vận hành** | `Label`, `Barcode`, `ApprovalWorkflow` | Công cụ hỗ trợ và quy trình kiểm soát (QC) |
| **Dữ liệu** | `StockLedger`, `StockSnapshot` | Lưu trữ lịch sử biến động và trạng thái tồn kho |

## 4. Mối quan hệ giữa các khái niệm
1. **Material Management** định nghĩa *cái gì* được quản lý.
2. **Inventory Lot Tracking** xác định *nguồn gốc và hạn dùng* của vật tư đó.
3. **Label Generation** cung cấp *công cụ nhận diện* vật lý cho vật tư và lô hàng.
4. **Reporting** tổng hợp toàn bộ thông tin trên thành *tri thức* để ra quyết định.

## 5. Quy trình nghiệp vụ tích hợp
1. **Tiếp nhận:** Operator lập `Receipt` -> Hệ thống tự động chia theo `Lot` -> `Label Generation` in nhãn QR.
2. **Kiểm tra:** QC quét `Label`, kiểm tra thông tin `Lot` -> Thực hiện `Approval`.
3. **Lưu trữ:** Hệ thống cập nhật `StockLedger` và `Material Management` ghi nhận vị trí.
4. **Báo cáo:** Manager xem `Reporting` để biết chính xác số lượng tồn theo từng lô và hạn sử dụng.

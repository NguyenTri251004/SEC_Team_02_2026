# 02. Domain Model

## 1. Tổng quan về Inventory Management
Dự án quản lý kho (Inventory Management) được xây dựng dựa trên các trụ cột chính để đảm bảo tính minh bạch, tuân thủ pháp luật và hiệu quả vận hành, tập trung vào nền tảng Web và xử lý dữ liệu lớn.

## 2. Chi tiết yêu cầu cho 4 Trụ cột chính (Domain Pillars)

### 2.1 Material Management (Quản lý vật tư)
Trụ cột này tập trung vào việc số hóa toàn bộ danh mục và thuộc tính vật tư để thay thế việc ghi chép sổ sách.
- **REQ-MM-01 (Quản lý danh mục):** Cho phép tạo, sửa, xóa và lưu trữ thông tin vật tư (Mã, Tên, Mô tả, Phân loại).
- **REQ-MM-02 (Quản lý Đơn vị tính - UoM):** Hỗ trợ đa đơn vị tính và quy tắc chuyển đổi (ví dụ: Thùng sang Chai).
- **REQ-MM-03 (Thiết lập định mức):** Cho phép thiết lập ngưỡng tồn kho tối thiểu (Safety Stock) để hệ thống tự động cảnh báo khi sắp hết hàng.
- **REQ-MM-04 (Điều kiện bảo quản):** Ghi chú các điều kiện bảo quản đặc biệt (nhiệt độ, độ ẩm) để phục vụ công tác kiểm soát chất lượng (QC).
- **REQ-MM-05 (Trạng thái vật tư):** Quản lý vòng đời vật tư từ khi kích hoạt đến khi ngừng sử dụng hoặc loại bỏ.

### 2.2 Inventory Lot Tracking (Truy vết theo lô)
Đây là yêu cầu then chốt để đảm bảo 100% tuân thủ pháp luật về truy xuất nguồn gốc và hạn sử dụng.
- **REQ-LT-01 (Tự động hóa số lô):** Hệ thống tự động sinh số lô (Lot Number) hoặc cho phép nhập mã lô từ nhà cung cấp khi thực hiện nhập kho.
- **REQ-LT-02 (Quản lý Hạn sử dụng - Expire Date):** Bắt buộc nhập ngày sản xuất và hạn sử dụng cho từng lô hàng.
- **REQ-LT-03 (Chiến lược xuất kho):** Hệ thống tự động gợi ý xuất kho theo quy tắc FEFO (Hàng hết hạn trước xuất trước) hoặc FIFO (Hàng nhập trước xuất trước).
- **REQ-LT-04 (Truy vết ngược - Recall):** Có khả năng tìm kiếm và liệt kê toàn bộ vị trí/trạng thái của một mã lô cụ thể trong trường hợp cần thu hồi hàng loạt.
- **REQ-LT-05 (Lịch sử biến động lô):** Ghi lại mọi giao dịch (nhập, xuất, chuyển kho) gắn liền với số lô để đối soát chứng từ.

### 2.3 Label Generation (Khởi tạo nhãn dán)
Yêu cầu về công cụ để số hóa việc nhận diện vật tư trên nền tảng Web.
- **REQ-LG-01 (Tạo mã QR tự động):** Tự động tạo mã QR chứa thông tin tích hợp (Mã vật tư + Mã lô + Ngày nhập) ngay khi hoàn tất phiếu nhận hàng.
- **REQ-LG-02 (Thiết kế nhãn chuẩn):** Cung cấp các mẫu nhãn (Label Template) chuẩn hóa, hiển thị thông tin rõ ràng theo quy định pháp luật.
- **REQ-LG-03 (In ấn trực tiếp từ Web):** Hỗ trợ lệnh in nhãn trực tiếp từ trình duyệt đến các máy in nhãn chuyên dụng.
- **REQ-LG-04 (Tích hợp quét mã):** Cho phép sử dụng máy quét hoặc thiết bị đầu cuối để đọc mã QR, tự động điền thông tin vào các phiếu xuất/kiểm kho thay vì nhập tay.
- **REQ-LG-05 (Quản lý nhãn vị trí):** Tạo và in nhãn cho các vị trí kệ kho (Bin/Location) để quản lý sơ đồ kho chính xác.

### 2.4 Reporting (Hệ thống báo cáo)
Yêu cầu về đầu ra dữ liệu phục vụ quản lý và kiểm tra pháp lý trên quy mô dữ liệu lớn.
- **REQ-RP-01 (Báo cáo Nhập-Xuất-Tồn):** Xuất báo cáo tổng hợp theo thời gian thực về lượng hàng biến động.
- **REQ-RP-02 (Cảnh báo hạn dùng):** Báo cáo danh sách các lô hàng sắp hết hạn trong vòng 30/60/90 ngày.
- **REQ-RP-03 (Báo cáo chênh lệch kiểm kê):** Tự động so sánh số liệu thực tế và số liệu hệ thống, xuất biên bản chênh lệch có chữ ký điện tử.
- **REQ-RP-04 (Truy xuất nhật ký Audit Log):** Xuất báo cáo lịch sử thao tác của người dùng (ai đã sửa, sửa lúc nào, giá trị cũ/mới) để phục vụ thanh tra.
- **REQ-RP-05 (Hiệu suất dữ liệu lớn):** Đảm bảo các báo cáo tổng hợp trên hàng triệu bản ghi được xử lý ổn định và nhanh chóng trong dưới 5 giây.

## 3. Danh sách các thực thể chính (Entities)
*(Giữ nguyên bảng thực thể cũ nhưng bổ sung các trường liên quan đến yêu cầu mới)*

| Nhóm | Thực thể | Thuộc tính chính |
| :--- | :--- | :--- |
| **Cấu hình** | `Material`, `UoM`, `Warehouse` | Name, Code, MinStock, StorageCondition |
| **Giao dịch** | `Receipt`, `Issue`, `Stocktake` | Date, OperatorID, QC_Status, TotalQty |
| **Truy vết** | `InventoryLot` | LotNo, ManufactureDate, ExpiryDate, CurrentQty |
| **Vận hành** | `Label`, `AuditLog` | QR_Content, ActionType, OldValue, NewValue, Timestamp |

## 4. Các thành phần loại trừ (Out of Scope)
- **CIM & Monet:** Không tích hợp.
- **Quản lý nhà cung cấp (Supplier Management):** Không quản lý danh mục và đánh giá.
- **Mobile App:** Hệ thống chỉ chạy trên nền tảng Web.

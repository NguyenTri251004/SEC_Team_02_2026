# 01_Product Requirements Document

## 1. Phạm vi & Bối cảnh

### 1.1. Mục tiêu Chiến lược

Dự án nhằm xây dựng **Hệ thống Quản lý Kho (IMS - Inventory Management System)** tập trung, thay thế hoàn toàn quy trình thủ công, đảm bảo tính tuân thủ pháp lý và hiệu suất vận hành cao.

**Các mục tiêu cụ thể:**

- **Tuân thủ pháp lý:** Đáp ứng 100% quy định pháp luật hiện hành về lưu trữ, quản lý và truy xuất nguồn gốc nguyên vật liệu.
- **Kiểm soát chặt chẽ (End-to-End tracking):** Theo dõi luồng vật liệu từ tiếp nhận (Receipt) đến sử dụng hoặc thanh lý (Usage, Transfer, Disposal).
- **Số hóa toàn diện:** Loại bỏ quy trình giấy tờ thủ công, giảm sai sót con người và tối ưu hóa thời gian xử lý.
- **Độ tin cậy cao:** Duy trì thời gian hoạt động liên tục (Uptime) **≥99.9%**.
- **Hiệu năng:** Xử lý ≥10.000 giao dịch/ngày, hỗ trợ ≥1.000.000 bản ghi, ≥100 người dùng đồng thời, đảm bảo khả năng xử lý dữ liệu lớn ổn định với tần suất giao dịch cao.
- **Trải nghiệm người dùng:** Đạt mục tiêu **90%** người dùng đánh giá mức độ Hài lòng/Xuất sắc.

### 1.2. Phạm vi dự án

### 1.2.1. Trong phạm vi

- **Quản lý Nguyên vật liệu (Material Management):** Danh mục, phiên bản, thông tin tuân thủ.
- **Quản lý Lô hàng (Lot Tracking):** Theo dõi vòng đời, hạn sử dụng, trạng thái chất lượng.
- **Kiểm soát Chất lượng (QC Integration):** Quy trình phê duyệt/từ chối, cách ly hàng hóa.
- **Tem nhãn (Labeling):** Tạo và in mã vạch/QR code định danh.
- **Báo cáo & Giám sát:** Báo cáo tồn kho, lịch sử giao dịch, audit trail.

### 1.2.2. Ngoài phạm vi

- Quản lý Tài chính / Kế toán (General Ledger).
- Quản lý quan hệ khách hàng (CRM).
- Hoạch định chuỗi cung ứng tổng thể (Supply Chain Management).
- Ứng dụng trên điện thoại di động (Mobile App).

---

## 2. Vai trò

| Vai trò                                   | Trách nhiệm chính                                                                                                                   |
| :---------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------- |
| **Quản trị viên (Admin)**                 | Cấu hình tham số hệ thống, quản lý tài khoản người dùng, phân quyền truy cập và theo dõi báo cáo hệ thống.                          |
| **Quản lý kho (InventoryManager)**        | Theo dõi báo cáo thống kê/phân tích, giám sát lịch sử biến động kho và đảm bảo tính tuân thủ quy trình.                             |
| **Kiểm soát Chất lượng (QualityControl)** | Thực hiện kiểm định kỹ thuật, lấy mẫu, phê duyệt hoặc từ chối trạng thái chất lượng của lô hàng.                                    |
| **Nhân viên vận hành (Production)**       | Thực hiện các thao tác nghiệp vụ kho hàng ngày: Nhập hàng, Xuất hàng, Kiểm kê, Chia lô, Chuyển kho, In tem nhãn, Sửa đổi thông tin. |

---

## 3. Phân tích Vấn đề & Nhu cầu

| Vai trò                                   | Vấn đề (Pain Points)                                                                                             | Nhu cầu (Needs)                                                                                                                                                                                                                                                                                  |
| :---------------------------------------- | :--------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Quản trị viên (Admin)**                 | Khó kiểm soát sức khỏe toàn hệ thống; Rủi ro mất mát dữ liệu hoặc lỗi kết nối API không được cảnh báo sớm.       | Công cụ cấu hình tập trung; Hệ thống giám sát sức khỏe (health monitoring); Cơ chế tự động sao lưu dữ liệu; Quản lý người dùng tập trung với phân quyền rõ ràng.                                                                                                                                 |
| **Quản lý kho (InventoryManager)**        | Báo cáo thủ công tốn thời gian tổng hợp; Khó truy xuất lịch sử tuân thủ pháp luật khi có thanh tra/kiểm toán.    | Hệ thống báo cáo tự động về tồn kho, lô hàng sắp hết hạn; Truy xuất lịch sử chi tiết (InventoryTransactions) cho audit; Dashboard quản lý với cảnh báo tự động (cảnh báo hạn sử dụng, lô bị từ chối); Xuất báo cáo CSV/Excel hỗ trợ kiểm toán.                                                   |
| **Kiểm soát Chất lượng (QualityControl)** | Khó ngăn chặn việc sử dụng lô hàng lỗi/hết hạn do quy trình giấy tờ chậm trễ; Dễ sai sót khi phê duyệt thủ công. | Tự động khóa/chặn lô hàng để không sử dụng; Số hóa quy trình kiểm định: ghi lại kết quả QC, cập nhật trạng thái chất lượng.                                                                                                                                                                      |
| **Nhân viên vận hành (Production)**       | Ghi chép sổ sách thủ công gây nhầm lẫn số liệu; Tốn nhiều thời gian tìm kiếm thông tin và đối chiếu kho.         | Giao diện nhập liệu tối ưu; Chức năng tìm kiếm tức thì; Hỗ trợ in ấn tem nhãn tự động; Ghi nhận giao dịch (Receipts, Usage, Transfer) với số lượng; Hỗ trợ quét QR code/barcode để xác định lô hàng; Hỗ trợ nhập/xuất hàng loạt dữ liệu qua CSV/Excel để tối ưu hóa quá trình nhập/xuất lô hàng. |

## 4. Yêu cầu Phi chức năng

### 4.1. Hiệu năng & Quy mô

- **Dữ liệu:** Hỗ trợ lưu trữ ≥1.000.000 bản ghi (InventoryLots, Transactions, QC results)
- **Người dùng:** Đáp ứng ≥100 người dùng đồng thời
- **Giao dịch:** Xử lý ≥10.000 giao dịch/ngày ổn định
- **Thời gian phản hồi:**
  - API: < 2 giây
  - Báo cáo/Xuất: < 30 giây
- **Caching:** Tích hợp Redis/Memcached để tăng tốc truy xuất

### 4.2. Bảo mật và An toàn

- **Rate Limiting:** Giới hạn lưu lượng truy cập API để tránh tấn công DDOS.
- **Mã hóa:** Toàn bộ thông tin quan trọng/nhạy cảm phải được mã hóa khi lưu trữ (Encryption at Rest).
- **Chống tấn công:** Tích hợp giải pháp ngăn chặn CSRF, XSS và các lỗ hổng bảo mật phổ biến (OWASP Top 10).

### 4.3. Vận hành và Quản trị

- **Backup:** Tự động sao lưu và có quy trình phục hồi dữ liệu (Disaster Recovery Plan).
- **Monitoring:** Theo dõi liên tục trạng thái vận hành (health checks), phân tích logs và dữ liệu hiệu suất hệ thống (metrics).

## 5. Luồng Quy trình Nghiệp vụ

1. **[Inventory Management Workflow - Tổng quan](10_Inventory_Management_Workflow.md)**

2. **[Inventory Management Workflow Detail - Chi tiết](11_Inventory_Management_Workflow_Detail.md)**

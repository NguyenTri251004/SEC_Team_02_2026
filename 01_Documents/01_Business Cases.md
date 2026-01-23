# Business Case: Hệ thống Quản lý Kho (Inventory Management System - IMS)

## 1. Mục tiêu Chiến lược (Objectives)
Dự án nhằm xây dựng hệ thống quản lý kho tập trung, thay thế hoàn toàn quy trình thủ công, đảm bảo tính tuân thủ pháp lý và hiệu suất vận hành cao.

*   **Tuân thủ pháp lý:** Đáp ứng 100% quy định pháp luật hiện hành về lưu trữ, quản lý và truy xuất nguồn gốc nguyên vật liệu.
*   **Kiểm soát chặt chẽ:** Theo dõi luồng vật liệu (End-to-End tracking) từ khi tiếp nhận (Receiving) đến khi chuyển giao (Transfer/Dispensing).
*   **Số hóa toàn diện:** Loại bỏ thao tác giấy tờ thủ công, giảm thiểu sai sót con người và tối ưu hóa thời gian xử lý.
*   **Độ tin cậy cao (Availability):** Duy trì thời gian hoạt động liên tục (Uptime) đạt cam kết **99.9%**.
*   **Hiệu năng & Big Data:** Đảm bảo khả năng xử lý dữ liệu lớn ổn định với tần suất giao dịch cao.
*   **Trải nghiệm người dùng (UX):** Đạt mục tiêu **90%** người dùng đánh giá mức độ Hài lòng/Xuất sắc.

## 2. Vai trò & Chân dung Người dùng (User Roles & Personas)

| Vai trò | Trách nhiệm chính |
| :--- | :--- |
| **Quản trị viên (Admin)** | Cấu hình tham số hệ thống, quản lý tài khoản người dùng, phân quyền truy cập và giám sát log hệ thống. |
| **Quản lý (Manager)** | Theo dõi báo cáo thống kê/phân tích, giám sát lịch sử biến động kho và đảm bảo tính tuân thủ quy trình. |
| **Kiểm soát Chất lượng (QC)** | Thực hiện kiểm định kỹ thuật, lấy mẫu, phê duyệt hoặc từ chối trạng thái chất lượng của lô hàng. |
| **Nhân viên vận hành (Operator)** | Thực hiện các thao tác nghiệp vụ kho hàng ngày: Nhập hàng, Xuất hàng, Kiểm kê, In nhãn, Sửa đổi thông tin. |

## 3. Phân tích Vấn đề & Nhu cầu (Pain Points & Needs)

| Vai trò | Vấn đề (Pain Points) | Nhu cầu giải pháp (Needs) |
| :--- | :--- | :--- |
| **Quản trị viên (Admin)** | Khó kiểm soát sức khỏe toàn hệ thống; Rủi ro mất mát dữ liệu hoặc lỗi kết nối API không được cảnh báo sớm. | Dashboard cấu hình tập trung; Hệ thống giám sát sức khỏe (Health Monitoring); Cơ chế tự động sao lưu dữ liệu. |
| **Quản lý (Manager)** | Báo cáo thủ công tốn thời gian tổng hợp; Khó truy xuất lịch sử tuân thủ pháp luật khi có thanh tra/kiểm toán. | Hệ thống báo cáo Real-time; Truy xuất lịch sử chi tiết (Audit Logging); Quản lý người dùng tập trung. |
| **Kiểm soát Chất lượng (QC)** | Khó ngăn chặn việc sử dụng lô hàng lỗi/hết hạn do quy trình giấy tờ chậm trễ; Dễ sai sót khi phê duyệt thủ công. | **Chức năng Khóa/Chặn (System Block)** tự động các lô hàng lỗi; Số hóa quy trình cập nhật trạng thái chất lượng. |
| **Nhân viên vận hành (Operator)** | Ghi chép sổ sách thủ công gây nhầm lẫn số liệu; Tốn nhiều thời gian tìm kiếm thông tin và đối chiếu kho. | Giao diện nhập liệu tối ưu; Chức năng tìm kiếm tức thì; Hỗ trợ in ấn tem nhãn tự động. |

## 4. Phạm vi dự án (Scope)

### 4.1. Trong phạm vi (In-Scope)
*   **Quản lý Nguyên vật liệu (Material Management):** Danh mục, phiên bản, thông tin tuân thủ.
*   **Quản lý Lô hàng (Lot Tracking):** Theo dõi vòng đời, hạn sử dụng, trạng thái chất lượng.
*   **Kiểm soát Chất lượng (QC Integration):** Quy trình phê duyệt/từ chối, cách ly hàng hóa.
*   **Tem nhãn (Labeling):** Tạo và in mã vạch/QR code định danh.
*   **Báo cáo & Giám sát:** Báo cáo tồn kho, lịch sử giao dịch, audit trail.

### 4.2. Ngoài phạm vi (Out-of-Scope)
*   Quản lý Tài chính / Kế toán (General Ledger).
*   Quản lý quan hệ khách hàng (CRM).
*   Hoạch định chuỗi cung ứng tổng thể (Supply Chain Management).
*   Ứng dụng trên điện thoại di động (Mobile App).

## 5. Yêu cầu Phi chức năng (Non-Functional Requirements)

### 5.1. Hiệu năng và Quy mô (Performance & Scalability)
*   **Dữ liệu:** Hỗ trợ lưu trữ và truy xuất tối thiểu **1.000.000** bản ghi.
*   **Người dùng:** Đáp ứng **100** người dùng truy cập đồng thời (Concurrent users).
*   **Giao dịch:** Xử lý ổn định hơn **10.000** giao dịch mỗi ngày.
*   **Thời gian phản hồi (Response Time):**
    *   API response: Dưới **2 giây**.
    *   Kết xuất báo cáo: Dưới **30 giây**.
*   **Tối ưu hóa:** Tích hợp cơ chế bộ nhớ đệm (Caching - Redis/Memcached) để tăng tốc độ truy xuất và giảm tải DB.

### 5.2. Bảo mật và An toàn (Security)
*   **Rate Limiting:** Giới hạn lưu lượng truy cập API để tránh tấn công DDOS.
*   **Mã hóa:** Toàn bộ thông tin quan trọng/nhạy cảm phải được mã hóa khi lưu trữ (Encryption at Rest).
*   **Chống tấn công:** Tích hợp giải pháp ngăn chặn CSRF, XSS và các lỗ hổng bảo mật phổ biến (OWASP Top 10).

### 5.3. Vận hành và Quản trị (Operations)
*   **Backup:** Tự động sao lưu và có quy trình phục hồi dữ liệu (Disaster Recovery).
*   **Monitoring:** Theo dõi liên tục trạng thái vận hành (Health checks), phân tích logs và dữ liệu hiệu suất hệ thống.

# 05_Architecture

## 1. Tổng quan kiến trúc
Hệ thống **Inventory Management System** được thiết kế theo mô hình nhiều lớp (multi‑layer) kết hợp hướng dịch vụ (service‑oriented) để đảm bảo:
- Dễ mở rộng và bảo trì
- Phân tách rõ ràng trách nhiệm
- Hỗ trợ tích hợp và mở rộng tính năng trong tương lai

## 2. Các mô hình và góc nhìn kiến trúc

### 2.1. Góc nhìn nghiệp vụ (Business View)
- **Tác nhân chính:** Quản trị viên, Nhân viên kho, Kế toán, Nhà cung cấp.
- **Quy trình chính:** Nhập kho, Xuất kho, Kiểm kê, Báo cáo.
- **Mục tiêu:** Tăng khả năng kiểm soát tồn kho, giảm sai sót, cung cấp dữ liệu báo cáo kịp thời.

### 2.2. Góc nhìn logic (Logical View)
- **Mô hình phân lớp (Layered Architecture):**
  - **Presentation/UI:** Giao diện người dùng, nhập liệu, hiển thị báo cáo.
  - **Application/Service:** Xử lý nghiệp vụ (nhập/xuất, tồn kho, báo cáo).
  - **Domain/Business Logic:** Quy tắc nghiệp vụ, kiểm tra dữ liệu.
  - **Data Access:** Giao tiếp với cơ sở dữ liệu.
- **Mô hình MVC/MVVM** (tùy công nghệ frontend): tách giao diện và xử lý dữ liệu.

### 2.3. Góc nhìn dữ liệu (Data View)
- **Thực thể chính:** Sản phẩm, Phiếu nhập, Phiếu xuất, Tồn kho, Nhà cung cấp, Người dùng, Phân quyền.
- **Quan hệ:**
  - Sản phẩm – Nhà cung cấp (1‑n)
  - Phiếu nhập/xuất – Chi tiết phiếu (1‑n)
  - Người dùng – Vai trò/Quyền (n‑n)
- **Lưu trữ:** CSDL quan hệ với các bảng chuẩn hóa, đảm bảo tính toàn vẹn.

### 2.4. Góc nhìn triển khai (Deployment/Physical View)
- **Client:** Trình duyệt Web hoặc ứng dụng desktop/mobile.
- **Application Server:** Xử lý API và nghiệp vụ.
- **Database Server:** Lưu trữ dữ liệu hệ thống.
- **Các môi trường:** Dev, Test, Production.

### 2.5. Góc nhìn bảo mật (Security View)
- **Xác thực:** Đăng nhập tài khoản, có thể mở rộng OAuth/JWT.
- **Phân quyền:** RBAC (Role‑Based Access Control).
- **Bảo vệ dữ liệu:** Mã hóa dữ liệu nhạy cảm, sao lưu định kỳ.
- **Audit:** Ghi log thao tác quan trọng (nhập/xuất, chỉnh sửa dữ liệu).

## 3. Công nghệ và công cụ lựa chọn

> Lưu ý: Các mục dưới đây là khung mô tả. Cập nhật theo công nghệ thực tế nhóm lựa chọn.

- **Frontend:** [Framework/Library – ví dụ: React/Angular/Vue/Flutter]
- **Backend:** [Ngôn ngữ + Framework – ví dụ: Node.js + Express / .NET / Spring]
- **Database:** [MySQL/PostgreSQL/SQL Server]
- **Authentication:** [JWT / OAuth2 / Session]
- **DevOps/CI-CD:** [GitHub Actions/GitLab CI/Jenkins]
- **Tools:** [Postman, Docker, ORM, v.v.]

## 4. Diễn giải kiến trúc theo các mô hình phổ biến

### 4.1. Mô hình Client‑Server
- Client gửi yêu cầu (API/HTTP) đến server.
- Server xử lý và trả kết quả.
- Phù hợp cho hệ thống quản lý tập trung.

### 4.2. Mô hình Layered
- Tăng khả năng bảo trì và kiểm thử.
- Dễ thay đổi một lớp mà không ảnh hưởng lớp khác.

### 4.3. Mô hình Service‑Oriented (mở rộng)
- Tách các dịch vụ theo chức năng chính (Inventory, Report, User).
- Có thể mở rộng thành microservices trong tương lai.

## 5. Kết luận
Kiến trúc hệ thống được thiết kế theo mô hình nhiều lớp kết hợp client‑server, đảm bảo khả năng mở rộng, an toàn và phù hợp với yêu cầu quản lý kho. Các lựa chọn công nghệ sẽ được chốt và cập nhật vào tài liệu khi nhóm thống nhất triển khai.
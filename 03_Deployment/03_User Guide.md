# User Guide

Tài liệu hướng dẫn **người dùng cuối (End User)** cách truy cập và sử dụng Inventory Management System (IMS).

## 1. Truy cập hệ thống

**Địa chỉ ứng dụng (production):** https://ims-frontend-sec02.vercel.app

Hệ thống là web application — không cần cài đặt, chỉ cần trình duyệt web hiện đại (Chrome, Edge, Firefox, Safari) có kết nối Internet.

## 2. Tài khoản đăng nhập

Hệ thống dùng **Keycloak** làm hệ thống xác thực và quản lý danh tính. Người dùng được Quản trị viên cấp tài khoản theo vai trò.

### Các vai trò (Role)

| Vai trò | Quyền chính | Trang chủ sau đăng nhập |
|---------|-------------|-------------------------|
| **Admin** (Quản trị viên) | Quản lý người dùng, cấu hình hệ thống, xem báo cáo tổng | Admin Dashboard |
| **Inventory Manager** (Quản lý kho) | Giám sát tồn kho, duyệt giao dịch, xem báo cáo | Inventory Dashboard |
| **Quality Control** (QC) | Kiểm định chất lượng lô hàng, duyệt/từ chối QC | QC Dashboard |
| **Production** (Vận hành) | Tạo batch sản xuất, tiêu thụ nguyên liệu, in tem nhãn | Production Dashboard |
| **Viewer** | Chỉ xem, không chỉnh sửa | Dashboard read-only |

### Tài khoản demo

5 tài khoản demo đã được định nghĩa sẵn trong realm `inventory-management` (file `02_Source/01_Source Code/keycloak/inventory-realm.json`) và import lên Keycloak Cloud-IAM production (`https://lemur-6.cloud-iam.com/auth`):

| Vai trò | Username | Password | Trạng thái (production lemur-6) |
|---------|----------|----------|--------------------------------|
| Admin | `admin` | `admin123` | ⚠️ **Cần reset password trên Cloud-IAM** (hiện fail `Invalid credentials`) |
| Inventory Manager | `inv_manager` | `manager123` | ✅ Login OK |
| Quality Control | `qc_user` | `qc123` | ✅ Login OK |
| Production | `prod_user` | `prod123` | ✅ Login OK |
| Viewer | `viewer` | `viewer123` | ✅ Login OK |

**Ghi chú quan trọng:**
- Password ở dạng plaintext trong file `inventory-realm.json` chỉ dùng cho mục đích **demo / đồ án học thuật** — không dùng cho hệ thống thật.
- Khi chấm điểm, giảng viên có thể dùng bất kỳ tài khoản nào ở trên.
- Tài khoản `admin` trên production cần được **Leader reset password** về `admin123` qua Cloud-IAM admin console: https://lemur-6.cloud-iam.com/auth/admin → realm `inventory-management` → Users → `admin` → Credentials → Reset password.

## 3. Hướng dẫn sử dụng theo vai trò

### 3.1. Đăng nhập

1. Truy cập https://ims-frontend-sec02.vercel.app
2. Hệ thống chuyển hướng đến trang Keycloak login
3. Nhập `username` và `password`
4. Sau đăng nhập, hệ thống tự động chuyển tới dashboard tương ứng với vai trò

### 3.2. Quản lý Nguyên vật liệu (Material Catalog)

**Truy cập:** sidebar → **Materials**

- **Xem danh sách:** hiển thị mã vật liệu, tên, loại (API / Excipient / Packaging), điều kiện bảo quản
- **Thêm mới** (Admin / Inventory Manager): nút **New Material** → điền form → Save
- **Chỉnh sửa:** click vào dòng material → chỉnh sửa → Save
- **Tìm kiếm:** ô search trên đầu bảng (full-text Elasticsearch)

### 3.3. Nhập kho — Tạo lô mới (Inventory Lot)

**Truy cập:** sidebar → **Lots** → nút **New Lot**

1. Chọn `Material` từ danh sách
2. Nhập thông tin: `Manufacturer`, `Manufacturer Lot`, `Received Date`, `Expiration Date`, `Quantity`, `Unit`, `Storage Location`
3. Nhấn **Save** → lô được tạo với trạng thái **Quarantine** (tự động)
4. Hệ thống tự tạo một `InventoryTransaction` loại `RECEIPT` và in **Raw Material Label** (barcode + QR)

### 3.4. Kiểm định Chất lượng (QC Testing)

**Truy cập (vai trò QC):** sidebar → **QC Queue**

1. Chọn lô đang `Quarantine`
2. Tab **QC Tests** → click **Add Test** → nhập kết quả cho từng chỉ tiêu (Identity, Potency, Microbial…)
3. Sau khi hoàn tất, click **Approve Lot** (duyệt) hoặc **Reject Lot** (từ chối)
4. Trạng thái lô đổi thành **Accepted** hoặc **Rejected**
5. Nếu Accepted, hệ thống in **Status Label**

### 3.5. Sản xuất (Production)

**Truy cập (vai trò Production):** sidebar → **Batches**

**Tạo batch mới:**
1. Click **New Batch** → chọn `Product` (finished good), nhập `Batch Number`, `Batch Size`, `Manufacture Date`, `Expiration Date`
2. Trạng thái ban đầu: **Planned**

**Bắt đầu sản xuất:**
3. Mở batch → **Start Production** → trạng thái chuyển **In Progress**

**Tiêu thụ nguyên liệu (Consume Material):**
4. Tab **Components** → **Add Component** → chọn `Inventory Lot` (bắt buộc trạng thái **Accepted**, chưa hết hạn, còn đủ số lượng)
5. Nhập `Planned Quantity` và `Actual Quantity`
6. Hệ thống tự động:
   - Giảm số lượng trên lô nguyên liệu (có thể đổi thành **Depleted** nếu hết)
   - Tạo `InventoryTransaction` loại `USAGE`
   - Lưu audit log

**Hoàn tất batch:**
7. Click **Complete Batch** → trạng thái **Complete** → in **Finished Product Label**

### 3.6. In tem nhãn (Label Printing)

**Truy cập:** sidebar → **Labels**

- Chọn template: `Raw Material` / `Status Label` / `Finished Product`
- Chọn lô hoặc batch cần in
- Preview → Print hoặc Export PDF (dùng jsPDF)

### 3.7. Báo cáo (Reports)

**Truy cập:** sidebar → **Reports**

| Loại báo cáo | Nội dung | Xuất |
|-------------|----------|------|
| Inventory Report | Tồn kho theo vật liệu, trạng thái, vị trí | CSV / Excel / PDF |
| Transaction Report | Lịch sử Nhập / Xuất / Kiểm kê / Chuyển kho | CSV / Excel / PDF |
| Audit Report | Audit log biến động trạng thái lô và QC | CSV / Excel / PDF |

Có thể lọc theo khoảng thời gian, vật liệu, nhà cung cấp, loại giao dịch.

### 3.8. Dashboard theo vai trò

Mỗi vai trò có dashboard riêng khi đăng nhập:

- **Admin:** Uptime, số user online, số giao dịch/ngày, error log
- **Inventory Manager:** Tổng tồn, lô sắp hết hạn, cảnh báo lô bị chặn
- **Quality Control:** Queue QC cần xử lý, lịch sử QC gần đây
- **Production:** Batch đang chạy, lịch sử batch hoàn thành

## 4. Video giới thiệu cách sử dụng hệ thống

> ⚠️ **[TODO] Cần quay và upload YouTube**
>
> **Nội dung cần có (theo yêu cầu syllabus):** giới thiệu cách sử dụng hệ thống của nhóm — từ đăng nhập → xem dashboard → demo các luồng nghiệp vụ chính (Material → Lot → QC → Production → Label → Report).
>
> **YouTube link:** _(sẽ bổ sung)_

## 5. Hỗ trợ và phản hồi

- **Báo lỗi:** tạo issue tại https://github.com/Inventory-management-SEC/SEC_Team_02_2026/issues
- **Đội ngũ:** SEC Team 02 — xem chi tiết tại `01_Documents/08_Project Management.md`

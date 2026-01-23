# Compilation Guide

Tài liệu hướng dẫn Developer cách cài đặt môi trường, biên dịch mã nguồn và chạy hệ thống.

## 1. Yêu cầu Tiên quyết (Prerequisites)
Để chạy được dự án, máy tính cần cài đặt sẵn:
*   **Hệ điều hành:** Windows 10/11, macOS, hoặc Linux (Ubuntu 20.04+).
*   **Runtime:** Node.js v16+, Python 3.9+ (hoặc JDK 11+ tùy backend).
*   **Database:** PostgreSQL 13+ hoặc Docker để chạy container.
*   **Git:** Phiên bản mới nhất.

## 2. Hướng dẫn Cài đặt & Biên dịch (Build Instructions)

### Bước 1: Clone Source Code
```bash
git clone https://github.com/username/project-repo.git
cd project-repo
```

### Bước 2: Cài đặt Dependencies
**Cho Backend:**
```bash
cd backend
npm install  # Hoặc pip install -r requirements.txt
```

**Cho Frontend:**
```bash
cd frontend
npm install
```

### Bước 3: Cấu hình Môi trường
*   Copy file `.env.example` thành `.env`.
*   Cập nhật các thông số kết nối Database, API Key trong file `.env`.
*(Trình bày cách chỉnh sửa các thông tin cấu hình)*

### Bước 4: Khởi chạy Hệ thống
**Chạy Backend:**
```bash
npm run start:dev
```

**Chạy Frontend:**
```bash
npm start
```
Truy cập trình duyệt tại địa chỉ: `http://localhost:3000`

## 3. Video Hướng dẫn Cài đặt (Setup Video)
*(Một đoạn riêng chứa liên kết đến video trên YouTube biểu diễn quá trình cài đặt môi trường, biên dịch, cấu hình và chạy mã nguồn)*
> **YouTube Link:** [Chèn link video hướng dẫn dev setup tại đây]

## 4. Source Control Access
*(Một đoạn riêng chứa liên kết, và ảnh chụp hành động mời tham gia hệ thống với vai trò admin/user để truy cập hệ thống source control)*

> **Link Repository (GitHub/GitLab):** [Chèn link repo tại đây]

**Ảnh chụp màn hình mời thành viên:**
![Source Control Invite](https://via.placeholder.com/600x400?text=Insert+Screenshot+Here)

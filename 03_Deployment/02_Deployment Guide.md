# Deployment Guide

Tài liệu hướng dẫn Quản trị viên hệ thống (IT Administrator) triển khai hệ thống lên môi trường thực tế (Production).

## 1. Kết quả Triển khai (Deployment Outputs)
*(Trình bày các kết quả thu được sau khi triển khai hệ thống lên môi trường Internet)*
*   **Public URL (Web UI):** `https://inventory-system.example.com`
*   **API Endpoint:** `https://api.inventory-system.example.com`
*   **Database Host:** `db-prod.example.com`
*   **Trạng thái:** Online - SSL Secured.

## 2. Yêu cầu Môi trường Server
*   **Server:** VPS/Cloud Instance (AWS EC2, DigitalOcean Droplet, Google Compute Engine).
*   **OS:** Ubuntu Server 20.04 LTS.
*   **RAM:** Tối thiểu 4GB.
*   **Disk:** SSD 40GB+.

## 3. Quy trình Triển khai (Step-by-Step)

### Bước 1: Chuẩn bị Server
*   SSH vào server.
*   Cài đặt Docker & Docker Compose.

### Bước 2: Tải gói triển khai
Copy thư mục `01_Deployment_Package` lên server hoặc pull từ Git Registry.

### Bước 3: Cấu hình Production
*   Thiết lập biến môi trường `NODE_ENV=production`.
*   Cấu hình Nginx/Apache làm Reverse Proxy.
*   Cài đặt SSL Certificate (Let's Encrypt).

### Bước 4: Khởi chạy Container
```bash
docker-compose up -d --build
```

## 4. Video Hướng dẫn Triển khai (Deployment Video)
*(Một đoạn riêng chứa liên kết đến video trên YouTube biểu diễn cách triển khai hệ thống của nhóm)*
> **YouTube Link:** [Chèn link video hướng dẫn deploy tại đây]

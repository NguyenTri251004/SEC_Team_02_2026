# System Evaluation and Validation

## 1. Kiểm thử hệ thống (Testing Strategy)

### 1.1. Công cụ kiểm thử
*(Trình bày cách đăng ký và/hoặc cài đặt các công cụ để kiểm thử hệ thống)*
*   **Unit Test:** Jest (cho Frontend), PyTest/JUnit (cho Backend).
*   **API Test:** Postman / SoapUI.
*   **Performance Test:** JMeter / k6.
*   **Automation Test:** Selenium / Cypress.

### 1.2. Phương pháp thực thi
*   Kiểm thử đơn vị (Unit Testing) được chạy tự động mỗi khi commit code.
*   Kiểm thử tích hợp (Integration Testing) thực hiện định kỳ hàng tuần.
*   Kiểm thử chấp nhận (UAT) thực hiện trước mỗi lần release Milestone.

### 1.3. Kết quả kiểm thử
*(Trình bày các kết quả kiểm thử thu được)*
*   Total Test Cases: 150
*   Passed: 145
*   Failed: 5 (Đã log bug và fix trong Sprint tới)
*   Code Coverage: 85%

## 2. Video Hướng dẫn Kiểm thử
*(Một đoạn riêng chứa liên kết đến video trên YouTube biểu diễn quá trình đăng ký hoặc cài đặt các công cụ để kiểm thử)*
> **YouTube Link:** [Chèn link video setup testing tool tại đây]

## 3. Khảo sát và Đánh giá (Evaluation)

### 3.1. Kết quả khảo sát người dùng
*(Trình bày các kết quả khảo sát)*
*   Số lượng người tham gia: 20
*   Mức độ hài lòng trung bình: 4.5/5
*   Phản hồi tích cực: Giao diện dễ nhìn, thao tác nhanh.
*   Phản hồi tiêu cực: Chức năng báo cáo còn chậm.

### 3.2. So sánh với hệ thống tương tự
*(Bảng so sánh hệ thống với các hệ thống tương tự)*

| Tiêu chí | Hệ thống của Nhóm | Hệ thống A (Tham khảo) | Hệ thống B (Tham khảo) |
| :--- | :--- | :--- | :--- |
| Chi phí | Miễn phí (Open Source) | Trả phí hàng tháng | Trả phí trọn gói |
| Tính năng Custom | Dễ dàng tùy chỉnh | Khó tùy chỉnh | Trung bình |
| Giao diện | Hiện đại, tối giản | Cổ điển, nhiều nút | Hiện đại nhưng rối |
| Hỗ trợ Mobile | Chưa (Web only) | Có (App riêng) | Có (Web Responsive) |

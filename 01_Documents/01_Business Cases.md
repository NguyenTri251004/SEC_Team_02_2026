# 01. Business Cases

## 1. Tổng quan
Tài liệu mô tả nhu cầu quản lý nguyên vật liệu theo đúng quy định pháp luật, từ lúc nhận vào đến lúc chuyển giao đi, thay thế công việc giấy tờ thủ công bằng hệ thống, với báo cáo đầy đủ và dễ đối chiếu.

## 2. Các vai trò chính
- Quản lý: theo dõi báo cáo và quản lý người dùng.
- Quality Control: kiểm tra và phê duyệt từng đơn hàng.
- Operator: quản lý toàn bộ inventory (nhập, xóa, kiểm, sửa).
- Người phụ trách hệ thống: đảm bảo hệ thống ổn định và chịu trách nhiệm về dữ liệu.

## 3. Vấn đề và mục tiêu theo vai trò

### 3.1 Quản lý
**Vấn đề hiện tại**
- Theo dõi báo cáo thủ công, thiếu số liệu tổng hợp.

**Mục tiêu**
- Có báo cáo tổng hợp rõ ràng, tra cứu nhanh.
- Quản lý người dùng tập trung, dễ kiểm soát.

### 3.2 Quality Control
**Vấn đề hiện tại**
- Kiểm tra và phê duyệt từng đơn hàng hoàn toàn thủ công.

**Mục tiêu**
- Có quy trình phê duyệt rõ ràng, giảm sai sót.
- Lưu vết đầy đủ cho từng lần kiểm tra.

### 3.3 Operator
**Vấn đề hiện tại**
- Nhập/xóa/kiểm/sửa tồn kho bằng tay, dễ lệch số liệu.

**Mục tiêu**
- Quản lý inventory tập trung, thao tác nhanh và chính xác.
- Theo dõi nhập/xuất/tồn theo thời gian thực.

### 3.4 Người phụ trách hệ thống
**Vấn đề hiện tại**
- Khó kiểm soát mức ổn định hệ thống và rủi ro mất dữ liệu khi hệ thống down.

**Mục tiêu**
- Theo dõi trạng thái hệ thống và cảnh báo lỗi kịp thời.
- Đảm bảo dữ liệu không mất khi sự cố xảy ra.

## 4. Mục tiêu chung của hệ thống
- Quản lý nguyên vật liệu xuyên suốt từ nhận đến chuyển giao.
- Thay thế công việc giấy tờ, nhập tay bằng quy trình số.
- Đảm bảo 100% tuân thủ quy định pháp luật về chứng từ, lưu vết.
- Có báo cáo đầy đủ, dễ xuất và dễ kiểm tra.
- Đảm bảo độ sẵn sàng hệ thống 99.99% (uptime).
- 90% người dùng đánh giá tốt sau khi sử dụng.
- Hệ thống hỗ trợ xử lý dữ liệu lớn ổn định.

## 5. Các nội dung cần có trong dự án Inventory Management
- Quản lý danh mục: nguyên vật liệu, đơn vị tính, nhà cung cấp, kho/bộ phận.
- Quy trình nhập kho: lập phiếu nhận, kiểm tra, phê duyệt, lưu chứng từ.
- Quy trình xuất/chuyển giao: lập phiếu xuất, phê duyệt, cập nhật tồn.
- Kiểm kê và đối chiếu: kiểm kê định kỳ, ghi nhận chênh lệch, lý do.
- Quản lý tồn kho theo thời gian thực và cảnh báo mức tồn tối thiểu.
- Phân quyền người dùng theo vai trò và nhật ký thao tác (audit log).
- Báo cáo tổng hợp: nhập/xuất/tồn, theo thời gian, theo nhà cung cấp, theo loại vật tư.
- Tuân thủ pháp lý: lưu vết, chứng từ chuẩn, khả năng truy xuất khi kiểm tra.
- Đảm bảo dữ liệu: sao lưu, phục hồi, không mất dữ liệu khi sự cố.
- Vận hành ổn định: theo dõi trạng thái hệ thống, cảnh báo lỗi.
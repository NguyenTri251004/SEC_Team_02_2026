# 01. Business Cases

## 1. Tổng quan
Tài liệu này mô tả các vai trò chính, các vấn đề đang gặp, các mục tiêu mỗi vai trò muốn đạt được, và các luồng quy trình nghiệp vụ mà nhóm sẽ xây dựng để đạt mục tiêu trong đời sống thực. Ngoài ra, tài liệu cũng ghi nhận các quy trình thủ công hiện có để làm cơ sở cải tiến.

## 2. Các vai trò chính
- Chủ cơ sở/Quản lý vận hành
- Nhân viên phục vụ/thu ngân
- Khách hàng
- Nhân viên kho
- Nhân viên kế toán/đối soát
- Quản trị hệ thống (Admin)

## 3. Vấn đề và mục tiêu theo vai trò

### 3.1 Chủ cơ sở/Quản lý vận hành
**Vấn đề**
- Khó theo dõi doanh thu theo ca/ngày/tháng một cách kịp thời.
- Dữ liệu phân tán, báo cáo thủ công dễ sai lệch.
- Không kiểm soát được hiệu suất nhân viên theo ca.

**Mục tiêu**
- Có báo cáo doanh thu và lợi nhuận theo thời gian thực.
- Theo dõi hoạt động bán hàng theo từng ca và từng nhân viên.
- Nắm rõ tình trạng kho và chi phí vận hành.

### 3.2 Nhân viên phục vụ/thu ngân
**Vấn đề**
- Quy trình ghi nhận đơn hàng và thanh toán mất thời gian.
- Dễ nhầm lẫn khi có nhiều đơn cùng lúc.
- Khó tra cứu giá hoặc khuyến mãi.

**Mục tiêu**
- Ghi nhận đơn hàng nhanh, chính xác.
- Thanh toán nhanh, hạn chế sai sót.
- Tự động áp dụng khuyến mãi nếu có.

### 3.3 Khách hàng
**Vấn đề**
- Chờ đợi lâu khi gọi món hoặc thanh toán.
- Không rõ tình trạng đơn hàng.
- Trải nghiệm không đồng nhất.

**Mục tiêu**
- Nhận phục vụ nhanh và đúng yêu cầu.
- Biết trạng thái đơn hàng.
- Có trải nghiệm mượt mà, minh bạch giá cả.

### 3.4 Nhân viên kho
**Vấn đề**
- Theo dõi nhập/xuất kho bằng sổ tay gây thất lạc.
- Không có cảnh báo khi sắp hết hàng.
- Khó đối chiếu số liệu cuối ngày.

**Mục tiêu**
- Cập nhật tồn kho tự động theo bán hàng.
- Có cảnh báo tồn kho tối thiểu.
- Dễ đối soát nhập/xuất theo ca/ngày.

### 3.5 Nhân viên kế toán/đối soát
**Vấn đề**
- Tổng hợp số liệu thủ công, tốn thời gian.
- Sai lệch giữa doanh thu thực tế và báo cáo.
- Thiếu chứng từ/bảng kê rõ ràng.

**Mục tiêu**
- Xuất báo cáo doanh thu, chi phí chuẩn.
- Tự động đối soát doanh thu theo phương thức thanh toán.
- Dễ trích xuất dữ liệu phục vụ kế toán.

### 3.6 Quản trị hệ thống (Admin)
**Vấn đề**
- Khó quản lý phân quyền nếu dữ liệu rời rạc.
- Thiếu cơ chế nhật ký hoạt động (audit log).

**Mục tiêu**
- Quản lý người dùng và phân quyền rõ ràng.
- Theo dõi nhật ký thao tác để truy vết sự cố.

## 4. Các luồng quy trình nghiệp vụ sẽ xây dựng

### 4.1 Luồng đặt món và thanh toán tại quầy
1. Nhân viên tiếp nhận yêu cầu của khách.
2. Nhập món vào hệ thống, hệ thống tự tính tổng tiền và áp dụng khuyến mãi.
3. Xác nhận đơn hàng và in hóa đơn (nếu cần).
4. Thu ngân nhận thanh toán, chọn phương thức thanh toán.
5. Hệ thống ghi nhận giao dịch và cập nhật tồn kho.

### 4.2 Luồng phục vụ tại bàn
1. Nhân viên tạo đơn theo số bàn.
2. Gửi món vào bếp/bar (nếu có).
3. Theo dõi trạng thái đơn hàng (đang chuẩn bị/đã xong).
4. Cập nhật trạng thái khi phục vụ xong.
5. Thực hiện thanh toán khi khách yêu cầu.

### 4.3 Luồng quản lý tồn kho
1. Nhập hàng vào hệ thống (phiếu nhập).
2. Tồn kho tự động giảm theo đơn hàng bán ra.
3. Khi tồn kho dưới mức tối thiểu, hệ thống cảnh báo.
4. Cuối ngày đối soát tồn kho với thực tế.

### 4.4 Luồng đối soát doanh thu theo ca
1. Mỗi ca bán hàng được hệ thống ghi nhận giao dịch.
2. Cuối ca, nhân viên chốt ca và xuất báo cáo.
3. Quản lý kiểm tra, xác nhận số liệu.

### 4.5 Luồng quản lý khuyến mãi
1. Admin tạo chương trình khuyến mãi (giảm %, tặng món, combo).
2. Hệ thống tự động áp dụng khi thỏa điều kiện.
3. Báo cáo hiệu quả khuyến mãi theo doanh thu.

## 5. Quy trình nghiệp vụ thủ công hiện có (tham khảo)
- Ghi nhận đơn hàng bằng giấy khi hệ thống quá tải.
- Đối soát doanh thu cuối ngày bằng Excel thủ công.
- Kiểm kho bằng sổ tay khi thiếu thiết bị.

## 6. Phạm vi áp dụng
Các quy trình trên được thiết kế cho hoạt động kinh doanh dịch vụ tại chỗ, có nhân viên phục vụ và thu ngân, có quản lý kho và đối soát doanh thu định kỳ.
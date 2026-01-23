# Prototype

## 1. Luồng quy trình nghiệp vụ chính
*(Trình bày giao diện từng bước của ít nhất một luồng quy trình nghiệp vụ chính trong hệ thống)*

### Luồng nghiệp vụ: Nhập kho (Receiving Process)

#### Bước 1: Danh sách Đơn hàng chờ nhập
- **Mô tả:** Nhân viên kho xem danh sách các đơn đặt hàng (PO) đã được duyệt và đang chờ hàng về.
- **Giao diện:**
![Danh sách PO chờ nhập](link_anh_minh_hoa_1)

#### Bước 2: Tạo Phiếu Nhập kho (Goods Receipt Note)
- **Mô tả:** Nhân viên chọn một PO, hệ thống hiển thị form nhập kho. Nhân viên quét mã hoặc nhập số lượng thực tế nhận.
- **Giao diện:**
![Form tạo phiếu nhập](link_anh_minh_hoa_2)

#### Bước 3: Xác nhận và In tem nhãn
- **Mô tả:** Sau khi lưu phiếu nhập, hệ thống hiển thị thông báo thành công và tùy chọn in tem nhãn (Barcode/QR) cho các lô hàng vừa nhập.
- **Giao diện:**
![Xác nhận và In tem](link_anh_minh_hoa_3)

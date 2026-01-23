# 02. Domain Model

## 1. Domain Knowledge (Inventory Management)
Inventory Management là nghiệp vụ quản lý vòng đời nguyên vật liệu từ lúc tiếp nhận, lưu kho, kiểm kê đến khi xuất/chuyển giao. Mục tiêu là đảm bảo số liệu tồn kho chính xác, truy xuất được chứng từ, tuân thủ pháp lý và hỗ trợ báo cáo.

## 2. Khái niệm chính
- Nguyên vật liệu (Item): đối tượng được quản lý tồn kho.
- Kho (Warehouse/Location): nơi lưu trữ vật tư.
- Nhà cung cấp (Supplier): đơn vị giao vật tư.
- Người dùng/Role: phân quyền thao tác trên hệ thống.
- Chứng từ: phiếu nhận, phiếu xuất, biên bản kiểm kê.
- Tồn kho (Stock/On-hand): số lượng hiện có tại kho.
- Kiểm kê (Stocktaking): đối chiếu số liệu thực tế và hệ thống.
- Nhật ký thao tác (Audit Log): lịch sử thay đổi dữ liệu.

## 3. Thực thể chính
- User
- Role
- InventoryItem
- Category
- UnitOfMeasure
- Warehouse
- Supplier
- Receipt (phiếu nhận)
- ReceiptLine (chi tiết phiếu nhận)
- Issue (phiếu xuất/chuyển giao)
- IssueLine (chi tiết phiếu xuất)
- StockLedger (sổ biến động tồn)
- StockSnapshot (tồn tại thời điểm)
- Stocktake (phiếu kiểm kê)
- StocktakeLine (chi tiết kiểm kê)
- Approval (phê duyệt)
- AuditLog
- Report

## 4. Mối quan hệ tiêu biểu
- InventoryItem thuộc Category và UnitOfMeasure.
- Receipt gồm nhiều ReceiptLine, mỗi dòng gắn với InventoryItem và Supplier.
- Issue gồm nhiều IssueLine, mỗi dòng gắn với InventoryItem.
- StockLedger ghi nhận mọi biến động tồn từ Receipt/Issue/Stocktake.
- Stocktake gồm nhiều StocktakeLine, dùng để đối chiếu tồn.
- Approval gắn với Receipt/Issue/Stocktake khi cần phê duyệt.
- User thuộc Role và tạo/duyệt chứng từ.
- AuditLog ghi lại thao tác tạo/sửa/xóa.

## 5. Quy trình nghiệp vụ chính
- Nhập kho: lập Receipt -> kiểm tra -> phê duyệt -> cập nhật StockLedger.
- Xuất/chuyển giao: lập Issue -> phê duyệt -> cập nhật StockLedger.
- Kiểm kê: lập Stocktake -> ghi số thực tế -> đối chiếu -> điều chỉnh.
- Báo cáo: tổng hợp từ StockLedger và StockSnapshot.

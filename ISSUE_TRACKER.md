# Issue Tracker

## Issue 1: Thêm test files cho các module còn thiếu

- Trạng thái: `Open`
- Ưu tiên: `Trung bình`

### Phạm vi

- Ưu tiên nâng coverage cho các luồng nghiệp vụ P1 có rủi ro cao
- Bao phủ đủ happy path, validation path, permission path và error path
- Tập trung vào các flow chính: xem danh sách, xem chi tiết, tạo mới, cập nhật, xóa
- Đảm bảo coverage phản ánh đúng runtime thực tế, không chỉ test logic tách rời

## Issue 2: Viết lại test `label.routes` theo kiểu route/integration

- Trạng thái: `Open`
- Ưu tiên: `Trung bình`

### Phạm vi

- Kiểm thử theo flow API thực tế từ request đến response
- Bao phủ đầy đủ các nhánh auth, permission, validate dữ liệu đầu vào và lỗi nghiệp vụ
- Xác nhận các endpoint labels hoạt động ổn định cho cả thành công và thất bại
- Đảm bảo kết quả test được ghi nhận vào coverage của route runtime

## Issue 3: Lỗi DB khi khởi động container (`database "myuser" does not exist`)

- Trạng thái: `Open`
- Ưu tiên: `Cao`

### Log liên quan

- `2026-03-06 14:32:56.261 UTC [2282] FATAL: database "myuser" does not exist`

### Phạm vi

- Kiểm tra toàn bộ flow cấu hình DB từ env đến lúc ứng dụng mở kết nối
- Xác nhận database đích được tạo đúng và đồng nhất giữa các môi trường
- Chuẩn hóa giá trị mặc định để tránh kết nối nhầm database
- Bổ sung bước verify kết nối DB ngay sau khi hệ thống khởi động

## Issue 4: Lỗi compile TypeScript ở `dashboard.service.ts` (TS2344, TS2345)

- Trạng thái: `Open`
- Ưu tiên: `Cao`

### Log liên quan

- `TS2344: Type 'T' does not satisfy the constraint 'QueryResultRow'` (line 17, 30)
- `TS2345: Argument of type '{ unit_of_measure: string; total_quantity: number; }' is not assignable to parameter of type 'never'` (line 75)

### Phân tích lỗi có thể gây ra log trên

- Generic type `T` trong helper query chưa ràng buộc `extends QueryResultRow` theo typing mới của `pg`
- Kiểu dữ liệu khởi tạo mảng/accumulator bị suy luận thành `never[]` do thiếu type annotation
- Mismatch giữa kiểu dữ liệu query trả về và kiểu interface nội bộ của dashboard
- Khác biệt version `typescript` hoặc `@types/pg` giữa local và container làm lộ lỗi strict typing

### Phạm vi

- Rà soát flow tính toán dashboard có dùng generic/aggregate để xử lý typing nhất quán
- Đồng bộ kiểu dữ liệu giữa query result, model nội bộ và dữ liệu trả về API
- Loại bỏ các điểm có thể bị suy luận kiểu sai gây lỗi compile
- Verify toàn bộ luồng build và runtime sau khi chỉnh typing

## Issue 5: Lỗi Create Material (`material_type`, `404 /materials`)

- Trạng thái: `Open`
- Ưu tiên: `Cao`

### Vấn đề

- Tại [MaterialsPage.tsx](), dropdown `material_type` không tương thích với domain model chuẩn.
- `Failed to load resource: the server responded with a status of 404 (Not Found)` tại `http://localhost:3000/materials`
- Khi create material chỉ hiện `An error occurred while saving.` và không thấy chi tiết lỗi từ BE

### Phân tích nguyên nhân

- Frontend đang gọi `POST /materials` trong `useSaveMaterial` thay vì `POST /api/materials`, nên request có thể `404` dù backend vẫn chạy.
- Backend mount route materials tại `/api/materials`, không có route `/materials`.
- `MaterialFormModal` bắt lỗi quá chung và chỉ hiển thị message cố định, không log `error.response.data`, nên khó thấy nguyên nhân thật.
- `material_type` frontend đang dùng bộ giá trị `RAW/PACKAGING/CONSUMABLE/FINISHED` không khớp domain model nghiệp vụ.

### Domain model chuẩn

- `API`
- `Excipient`
- `Dietary Supplement`
- `Container`
- `Closure`
- `Process Chemical`
- `Testing Material`

### Phạm vi

- Chuẩn hóa flow tạo mới material từ form UI đến API request và phản hồi
- Đồng bộ danh mục `material_type` giữa UI, backend validation và dữ liệu nghiệp vụ
- Đảm bảo routing/API path đúng để không phát sinh `404` giả do sai endpoint
- Cải thiện error handling để hiển thị lỗi thực tế giúp debug nhanh

## Issue 6: Chuyển cấu hình `BYPASS_AUTH=false`

- Trạng thái: `Open`
- Ưu tiên: `Cao`

### Vấn đề

- Cần tắt chế độ bypass auth để chạy đúng luồng xác thực/phân quyền thực tế.

### Phạm vi

- Tắt bypass auth ở môi trường cần kiểm thử để chạy đúng flow bảo mật thực tế
- Đồng bộ cấu hình auth giữa các môi trường local/docker
- Verify luồng đăng nhập, refresh token và truyền token qua toàn bộ request
- Xác nhận các route protected cho kết quả đúng theo quyền người dùng

## Issue 7: `docker-compose up -d` không khởi tạo được backend/frontend do `ims-keycloak is unhealthy`

- Trạng thái: `Open`
- Ưu tiên: `Cao`

### Vấn đề

- `dependency failed to start: container ims-keycloak is unhealthy`
- Hệ quả: backend và frontend không thể start theo `depends_on` trong `docker-compose`

### Phạm vi

- Kiểm tra flow khởi động container theo dependency chain từ DB đến Keycloak đến backend/frontend
- Xác định nguyên nhân khiến Keycloak không đạt trạng thái healthy
- Điều chỉnh cấu hình startup/healthcheck để giảm fail giả do timing
- Verify lại khả năng khởi động end-to-end bằng `docker-compose up -d`

## Issue 8: Không thể edit material

- Trạng thái: `Open`
- Ưu tiên: `Cao`

### Test case fail

- Mở modal chỉnh sửa material
- Cập nhật material thành công

### Expected

- `Edit Material` modal mở khi bấm nút edit trên một dòng
- Field được pre-fill đúng dữ liệu dòng đã chọn
- `Material ID` bị disable khi edit
- Nhấn `OK` cập nhật thành công, hiển thị `Material updated successfully!`, modal đóng, bảng refresh dữ liệu mới

### Phạm vi

- Xác nhận dữ liệu dòng được pre-fill đúng vào form và khóa `Material ID` khi edit
- Verify flow submit cập nhật: request gửi đúng, phản hồi thành công, UI cập nhật lại bảng
- Đảm bảo thông báo thành công/lỗi phản ánh đúng kết quả thực tế của thao tác cập nhật

## Issue 9: `npm run build` frontend báo `Found 38 errors`

- Trạng thái: `Open`
- Ưu tiên: `Cao`

### Vấn đề

- Khi chạy `npm run build` trong `SEC_Team_02_2026\02_Source\01_Source Code\frontend` thì quá trình build thất bại với thông báo `Found 38 errors`.

### Phạm vi

- Thu thập đầy đủ danh sách 38 lỗi build hiện tại và nhóm theo loại lỗi chính
- Xác định file/module gây lỗi và mức độ ảnh hưởng đến luồng build production
- Sửa các lỗi compile/build để frontend có thể build thành công bằng `npm run build`
- Verify lại build sau khi sửa để đảm bảo không còn lỗi mới phát sinh

## Issue 10: Nút `Sign out` chưa nối đúng flow logout chuẩn

- Trạng thái: `Open`
- Ưu tiên: `Cao`

### Vấn đề

- Nút `Sign out` trên header chưa được nối đầy đủ vào flow đăng xuất chuẩn của hệ thống.
- Cần đảm bảo khi người dùng bấm logout thì session xác thực bị kết thúc đúng cách, không chỉ đổi trạng thái giao diện.

### Phạm vi

- Xác nhận nút `Sign out` luôn gọi đúng flow logout của hệ thống xác thực hiện tại
- Nếu dùng Keycloak hoặc identity provider, verify người dùng được đăng xuất đúng session
- Sau logout, người dùng không còn truy cập được các màn protected nếu chưa đăng nhập lại
- Đảm bảo UI phản hồi đúng sau logout: điều hướng, xóa session/token và trạng thái người dùng

## Issue 11: Disable role switcher và lỗi `403` tại `GET /api/materials`

- Trạng thái: `In Progress`
- Ưu tiên: `Cao`

### Vấn đề

- UI vẫn còn role switcher trong khi môi trường đang test auth thật (không bypass).
- `useMaterialsData.ts` gọi `GET http://localhost:3000/api/materials` nhận `403 (Forbidden)`.

### Nguyên nhân đã xác định

- Role switcher là cơ chế demo, có thể gây hiểu nhầm role thực lấy từ token.
- Parse `Authorization` header cần cứng hơn để tránh token malformed khi header bị gộp.

### Đã xử lý

- Gỡ role switcher khỏi layout header.
- Bổ sung helper parse bearer token an toàn trong `backend/src/security/auth.ts`.
- Xác minh trong backend container: token Keycloak hợp lệ gọi `GET /api/materials` trả `200`.

### Phạm vi verify tiếp

- Đăng nhập lại trên UI bằng user realm `inventory-management`.
- Xác nhận tab Materials không còn `403` và load danh sách thành công.
- Xác nhận phân quyền theo role từ token, không còn đổi role thủ công trên UI.

## Issue 12: Seed Keycloak realm, client và tài khoản test

- Trạng thái: `Open`
- Ưu tiên: `Cao`

### Vấn đề

- Cần có sẵn realm, client, roles và user test trong Keycloak để chạy được luồng login end-to-end.
- Nếu không seed sẵn, frontend có thể cấu hình đúng nhưng vẫn không đăng nhập/test RBAC được.

### Phạm vi

- Bổ sung file seed realm cho Keycloak và mount/import tự động khi khởi động
- Xác nhận realm `inventory-management` được tạo đúng
- Xác nhận client `inventory-frontend` hoạt động với standard flow
- Xác nhận roles `admin`, `inventory_manager`, `quality_control`, `production`, `viewer` tồn tại đúng
- Xác nhận các tài khoản test đăng nhập được và map đúng role tương ứng

## Issue 13: Đồng bộ cấu hình auth/keycloak giữa `.env` và `.env.example`

- Trạng thái: `Open`
- Ưu tiên: `Cao`

### Vấn đề

- Cấu hình môi trường auth hiện có rủi ro lệch giữa file `.env` thực tế và `.env.example`.
- Nếu template không đồng bộ với môi trường local/docker, nhóm khác hoặc giảng viên rất dễ chạy sai flow auth.

### Phạm vi

- Đồng bộ các biến `KEYCLOAK_REALM`, `KEYCLOAK_CLIENT_ID`, `VITE_BYPASS_KEYCLOAK`, `BYPASS_AUTH` giữa các file env
- Xác nhận giá trị mặc định phục vụ login flow thật thay vì bypass
- Verify backend/frontend/docker compose cùng đọc đúng bộ biến môi trường
- Cập nhật tài liệu/hướng dẫn chạy để tránh lệch cấu hình giữa các môi trường

## Issue 14: Lỗi compile TypeScript ở `reports.service.ts`

- Trạng thái: `Open`
- Ưu tiên: `Cao`

### Vấn đề

- Ngoài `dashboard.service.ts`, module `reports.service.ts` cũng có lỗi TypeScript liên quan đến generic query typing của `pg`.

### Phân tích lỗi có thể gây ra

- Generic dùng với `pool.query<T>` chưa ràng buộc `T extends QueryResultRow`
- Kiểu dữ liệu query result và DTO trả về report chưa được đồng bộ chặt chẽ
- Cùng nhóm nguyên nhân typing strict như lỗi ở `dashboard.service.ts`, nhưng chưa được track riêng trong tracker

### Phạm vi

- Rà soát toàn bộ query typing trong `reports.service.ts`
- Bổ sung ràng buộc `QueryResultRow` và chuẩn hóa kiểu row trả về
- Verify module reports compile ổn định sau khi sửa
- Chạy lại build backend để đảm bảo không còn lỗi compile liên quan reports

## Issue 15: Backend JWT verify theo public key Keycloak chưa được verify đầy đủ

- Trạng thái: `Open`
- Ưu tiên: `Cao`

### Vấn đề

- Backend cần verify JWT theo public key của Keycloak realm thay vì chỉ phụ thuộc cấu hình cục bộ hoặc bypass.
- Nếu lấy metadata/key không ổn định hoặc fallback không rõ ràng, flow auth thật có thể lỗi ngầm hoặc khó debug.

### Phạm vi

- Xác nhận backend lấy đúng realm metadata/public key từ Keycloak
- Cache key hợp lý và xử lý lỗi refresh key an toàn
- Verify token của các user test được xác thực đúng bằng Keycloak key
- Xác nhận fallback `JWT_SECRET` chỉ được dùng đúng ngữ cảnh cần thiết và không làm sai lệch test auth thật

## Issue 16: Admin Dashboard crash do mismatch shape dữ liệu stats

- Trạng thái: `Open`
- Ưu tiên: `Cao`

### Vấn đề

- Admin Dashboard có thể crash ở runtime với lỗi `Cannot read properties of undefined (reading 'map')`.
- Nguyên nhân là frontend đang giả định payload stats có `users_by_role`, trong khi backend có thể trả về shape khác như `usersByRole`, `activeUsers`, `todayTransactions`, `totalLots`, `quarantineLots`.

### Phạm vi

- Chuẩn hóa contract dữ liệu giữa `frontend/src/pages/dashboard/AdminDashboard.tsx` và `backend/src/modules/admin/*`
- Xử lý an toàn các trường optional hoặc payload shape khác biệt để dashboard không crash
- Verify pie chart `Users by Role` và các KPI admin render đúng khi dùng dữ liệu thật
- Cập nhật typing/frontend mapping để không phụ thuộc vào mock shape cũ

## Issue 17: Dashboard/User table crash do mismatch giá trị `role` giữa backend và frontend

- Trạng thái: `Open`
- Ưu tiên: `Cao`

### Vấn đề

- Các bảng dùng `createUserRoleColumn()` có thể crash với lỗi `Cannot read properties of undefined (reading 'color')`.
- Frontend map role theo key `admin`, `inventory_manager`, `quality_control`, `production`, `viewer`, trong khi backend có thể trả `Admin`, `InventoryManager`, `QualityControl`, `Production`, `Viewer`.

### Phạm vi

- Chuẩn hóa enum/serialization `role` giữa backend và frontend
- Bổ sung fallback render an toàn cho tag role để UI không crash nếu gặp giá trị lạ
- Verify các dashboard/table liên quan user render đúng màu và label role
- Rà soát các nơi khác có mapping enum tương tự để tránh lỗi cùng nhóm

## Issue 18: Lỗi lấy QC queue do query tham chiếu cột không tồn tại `il.lot_number`

- Trạng thái: `Open`
- Ưu tiên: `Cao`

### Log liên quan

- `error: column il.lot_number does not exist`
- `hint: Perhaps you meant to reference the column "il.po_number".`
- Phát sinh tại `backend/src/modules/qc/qc.service.ts:276`

### Vấn đề

- Query lấy QC queue đang tham chiếu `inventory_lots.lot_number`, nhưng schema hiện tại không có cột này.
- Hệ quả là QC dashboard/queue không tải được dữ liệu thật và có thể rơi về mock hoặc lỗi `500`.

### Phạm vi

- Rà soát toàn bộ `qc.service.ts` để loại bỏ các tham chiếu `il.lot_number` không tồn tại
- Đồng bộ query với schema thực tế của `inventory_lots`
- Verify các API QC list/detail/queue hoạt động với dữ liệu DB hiện tại
- Đảm bảo QC dashboard không còn lỗi khi load queue thật

## Issue 19: Lỗi lấy danh sách giao dịch do query sai tên bảng `transactions`

- Trạng thái: `Open`
- Ưu tiên: `Cao`

### Log liên quan

- `error: relation "transactions" does not exist`
- `code: '42P01'`
- Phát sinh tại `backend/src/modules/transactions/transaction.service.ts:5`

### Vấn đề

- Module transactions đang query bảng `transactions`, trong khi schema hiện tại nhiều khả năng dùng tên khác như `inventory_transactions`.
- Hệ quả là màn Transactions và các dashboard phụ thuộc recent transactions không lấy được dữ liệu thật.

### Phạm vi

- Đồng bộ `transaction.service.ts` với schema DB thực tế
- Rà soát toàn bộ CRUD/query transactions để dùng đúng tên bảng và cột
- Verify màn `Transactions` và các dashboard dùng recent transactions không còn lỗi `500`
- Bổ sung kiểm tra schema/query để tránh tái diễn mismatch tên bảng

## Issue 20: Chưa thống nhất rule các trường ID là auto-generated hay nhập tay

- Trạng thái: `Open`
- Ưu tiên: `Cao`

### Vấn đề

- Hiện chưa thống nhất rõ ràng các trường định danh ở nhiều module là:
  - được sinh tự động theo schema/hệ thống
  - hay phải nhập tay từ UI/API
- Vấn đề này không chỉ xảy ra ở Materials mà còn có thể ảnh hưởng tới Lots, Transactions, QC Tests, Batches, Labels và các module khác.

### Hệ quả

- UI form có thể yêu cầu nhập tay các trường lẽ ra phải sinh tự động
- Backend/API contract có thể không đồng nhất với kỳ vọng của frontend
- Người test và người handover dễ hiểu sai rule nghiệp vụ khi tạo mới dữ liệu

### Phạm vi

- Rà soát từng module để xác định rõ field ID nào:
  - auto-generated bởi DB/service
  - nhập tay từ UI/API
- Đồng bộ rule này giữa schema DB, backend DTO/validation, frontend form và tài liệu nghiệp vụ
- Chuẩn hóa thông báo/luồng create để người dùng không phải đoán cách sinh ID
- Ưu tiên rà các trường như:
  - `material_id`
  - `part_number`
  - `lot_id`
  - `transaction_id`
  - `test_id`
  - `batch_id`
  - `template_id`

# 03_Prototype — Vibe Coding

Tài liệu ghi lại **quá trình vibe coding** đã dẫn tới prototype Figma trong `03_Prototype.md` — các vòng prompt đi từ user journey → wireframe sơ khai → final mockup dùng Ant Design aesthetics.

## 0. Công cụ AI và thiết kế đã sử dụng

| Công cụ | Vai trò |
|---------|---------|
| **Figma** | Công cụ thiết kế prototype chính (link trong `03_Prototype.md`) |
| **Figma AI (First Draft)** | Sinh wireframe sơ khai từ prompt mô tả màn hình |
| **Claude (Anthropic)** | Viết kịch bản user journey, đề xuất copywriting, đặt tên màn hình |
| **Ant Design gallery** (ant.design/components) | Tham khảo mẫu component — Figma AI bị Ant Design-style khi được prompt rõ |
| **ChatGPT** | Viết copy tiếng Việt trang trọng cho form, placeholder, error message |

---

## 1. User Journey End-to-End

### 1.1. Vòng prompt 1 — brief luồng nghiệp vụ

**Prompt gốc (Claude):**
> "Viết user journey end-to-end cho hệ thống IMS pharma, từ khi nhận nguyên liệu đến xuất thành phẩm. Mỗi bước có: (a) actor (role nào), (b) action (làm gì), (c) trạng thái hệ thống trước/sau, (d) side-effect (audit log, label print, notification). Tiếng Việt trang trọng. Tối thiểu 10 bước."

**Output AI:** 12 bước — từ "Nhận raw material từ supplier" đến "In Finished Product Label". Nhưng **thiếu bước QC reject** — AI chỉ vẽ happy path.

**Prompt refine:**
> "User journey chỉ có happy path. Thêm 2 nhánh rẽ: (1) QC reject → lot chuyển Rejected → xử lý thu hồi / tiêu hủy, (2) Production batch fail (batch cancelled) → trả component về lot nếu còn tồn. Mỗi nhánh rẽ có side-effect riêng vào audit log."

**Output:** 15 bước, có 2 nhánh rẽ. Khớp với state machine Domain Model.

**Kết quả:** Section "User Journey" Prototype — làm base để thiết kế màn hình.

---

## 2. Wireframe sơ khai (Figma First Draft)

### 2.1. Vòng prompt cho Figma AI

**Prompt:**
> "Design a dashboard for **Inventory Manager** role in a pharmaceutical warehouse system. Include:
> - Top KPI cards: Total lots, Quarantine count, Near-expiry lots (<30 days), Total value
> - Line chart: stock trend last 30 days
> - Table of lots with status badges (Quarantine=yellow, Accepted=green, Rejected=red, Depleted=grey)
> - Sidebar navigation: Materials, Lots, QC, Batches, Labels, Reports
> - Top bar: search, notification bell, user menu
> Modern, clean, **Ant Design 6 aesthetics**, Vietnamese UI text."

**Output Figma AI:** wireframe 1 màn hình Inventory Manager dashboard — OK layout nhưng **màu sắc chưa đúng Ant Design** (dùng Material palette).

**Prompt refine (Figma AI tiếp):**
> "Use exact Ant Design 6 color tokens: primary `#1677ff`, success `#52c41a`, warning `#faad14`, error `#ff4d4f`. Status badge dùng đúng preset antd Tag component màu. Table row dùng `rgba(0,0,0,0.04)` hover."

**Output:** wireframe màu chuẩn. Export sang Figma project team.

**Kết quả:** Figma frame "Inventory Manager Dashboard" (link trong `03_Prototype.md`).

### 2.2. Các màn hình còn lại

Tương tự prompt cho 4 role dashboard khác (Admin, QC, Production, Viewer) + các form chính:
- **New Lot form** — prompt yêu cầu validate inline, auto-fill supplier khi chọn material
- **QC Test form** — prompt yêu cầu table nhập kết quả theo chỉ tiêu, nút Approve/Reject cuối form
- **Production Batch detail** — prompt yêu cầu tab Components với nút Add Component, progress bar

**Vấn đề:** Figma AI sinh form quá dài → scroll nhiều. Team refactor thủ công thành 2 cột cho desktop.

---

## 3. Copywriting tiếng Việt

### 3.1. Vòng prompt — labels + placeholder

**Prompt (Claude):**
> "Đề xuất label form, placeholder text, nút bấm, thông báo lỗi tiếng Việt cho form 'Tạo lô nhập kho mới' với 8 field: Material, Manufacturer, Manufacturer Lot, Received Date, Expiration Date, Quantity, Unit, Storage Location. Phong cách trang trọng, phù hợp nhân viên kho dược. Mỗi field có: label, placeholder, required mark, error message khi validation fail."

**Output:** bảng 8 field × 4 property. Ngôn ngữ OK nhưng **1 số error message Anglicism** — "Trường này là bắt buộc" nghe Tây.

**Prompt refine:**
> "Error message Vietnamese-native hơn. Thay 'Trường này là bắt buộc' → 'Vui lòng nhập [tên field]'. Thay 'Không hợp lệ' → 'Sai định dạng' hoặc cụ thể 'Ngày hết hạn phải sau ngày nhập'."

**Output:** error message tự nhiên, cụ thể từng trường hợp.

**Kết quả:** copywriting đưa vào Figma + sau này implement thẳng vào `frontend/src/pages/lots/NewLotForm.tsx`.

---

## 4. Review UX

### 4.1. Vòng prompt — tìm friction

**Prompt:**
> "Đọc user journey đã viết. Xác định các điểm có thể gây lỗi người dùng:
> - Misclick (nút gần nhau cùng màu, Approve/Reject cạnh nhau)
> - Thiếu confirmation cho thao tác destructive (reject lot, cancel batch)
> - Step quá dài (form > 10 field 1 màn)
> - Thiếu feedback sau action (không có toast sau submit thành công)
> Đề xuất cải thiện cụ thể cho mỗi friction."

**Output:** 6 friction + 6 đề xuất. Áp dụng 5/6 vào Figma:
- Approve xanh, Reject đỏ, cách nhau padding lớn
- Reject lot confirm modal với lý do bắt buộc
- Form New Lot chia 2 tab
- Toast success sau mỗi mutation
- Loading skeleton cho table

**Kết quả:** prototype Figma v2 gọn hơn, ít friction hơn. Click-through test đạt >90% task completion.

---

## 5. Phương pháp review của con người

1. **Export prototype Figma** cho cả nhóm xem qua link share — mỗi thành viên click qua đủ 4 dashboard role
2. **Chạy click-through test** với 2-3 thành viên đóng vai user thật (không phải developer), ghi lại điểm bị stuck
3. **Feedback vào Discord + GitHub Issue** với label `ux-feedback` — tracked sprint cho đến khi close
4. **Update Figma theo feedback** trước khi chuyển sang implementation — tránh rework ở code
5. **Cross-check với Domain Model** — mỗi trường trong form phải khớp entity attribute; field nào không có trong entity thì flag (hoặc thêm entity attribute, hoặc bỏ field)
6. **Copywriting có native speaker review** — Leader (native) đọc lại mọi text Vietnamese, sửa phần Anglicism hoặc thuật ngữ sai

# Tóm Tắt Hệ Thống Pre-Booster & Time Bonus

## Tổng Quan

Hệ thống Pre-Booster cho phép người chơi chọn boosters trước khi vào level. UI Pre-Booster sẽ hiện lên khi nhấn Play thay vì vào thẳng level như trước.

## 1. Pre-Booster: Hint Plus

### Mô Tả
- **Hiệu ứng**: Tự động highlight 4 elements cùng chung 1 topic
- **Unlock**: Level 9
- **Kích hoạt**: Tự động sau khi map spawn, trước khi người chơi thao tác

### Quy Tắc
- Chỉ kích hoạt **1 lần duy nhất** mỗi level
- Không phụ thuộc win/lose
- Không thể kích hoạt lại trong cùng level

---

## 2. Pre-Booster: Extra Time (+20s)

### Mô Tả
- **Hiệu ứng**: Cộng +20s vào thời gian level
- **Unlock**: Level 13
- **Kích hoạt**: Tự động trước khi countdown bắt đầu

### Quy Tắc
- Kích hoạt **mỗi lần vào level** nếu sở hữu booster
- Không phụ thuộc win/lose

---

## 3. Win Streak Gift (+20s)

### Mô Tả
- **Điều kiện**: Thắng liên tục ≥7 level
- **Hiệu ứng**: +20s bonus thời gian
- **Unlock**: Level 20

### Quy Tắc
- **Chỉ áp dụng từ level kế tiếp** (N+1)
  - VD: Đạt streak 7 ở level N → Bonus bắt đầu từ level N+1
- **Reset khi thua** - Win streak về 0, không còn bonus
- **Không stack nhiều lần** - Chỉ +20s dù streak > 7

---

## 4. Stacking Rules

Extra Time và Win Streak Gift **CÓ THỂ CỘNG DỒN**:

```
Pre-Booster Extra Time: +20s
Win Streak Gift:        +20s
────────────────────────────
Tổng bonus:             +40s
```

---

## 5. UI Pre-Booster

### Flow Mới
```
[Home] → [Play Button] → [UIPreBooster Panel] → [Play trong Panel] → [Game Level]
```

### Cấu Trúc UI

```
┌──────────────────────────────────────────┐
│ [X]                          LEVEL N     │  ← Header đỏ
├──────────────────────────────────────────┤
│                                          │
│   ⏳ Win Streak Gift                     │
│   +20s   [Unlocks at Level 20] 🔒       │  ← Section Win Streak
│                                          │
├──────────────────────────────────────────┤
│                                          │
│   Select Boosters:                       │
│                                          │
│   ┌─────────┐    ┌─────────┐            │
│   │   💡    │    │ Level   │            │
│   │  (✓)    │    │   13    │            │
│   │         │    │   🔒    │            │
│   └─────────┘    └─────────┘            │
│   Booster 1      Booster 2              │  ← 2 Booster Slots
│                                          │
├──────────────────────────────────────────┤
│         💀 Hard 💀                       │  ← Difficulty Badge
│   ┌──────────────────────────┐          │
│   │        PLAY              │          │  ← Nút Play xanh
│   └──────────────────────────┘          │
│                                          │
└──────────────────────────────────────────┘
```

### Trạng Thái Booster Slot

| Trạng Thái | Hiển Thị |
|------------|----------|
| **Locked** | Nền xám, icon khóa, text "Level X" |
| **Unlocked (Chưa có)** | Màu bình thường, tap để mua |
| **Unlocked (Đã có)** | Màu bình thường, có thể chọn |
| **Selected** | Viền highlight, icon checkmark |

### Unlock Progression

| Feature | Unlock Level |
|---------|--------------|
| Hint Plus | Level 9 |
| Extra Time | Level 13 |
| Win Streak Gift | Level 20 |

---

## 6. Files Cần Tạo/Sửa

### Files Mới
- `UIPreBooster.cs` - UI controller cho panel pre-booster
- `PreBoosterSave.cs` - Save data cho boosters
- `WinStreakSave.cs` - Save data cho win streak
- `PreBoosterManager.cs` - Logic manager
- `HintPlusBooster.cs` - Logic hint plus
- `ExtraTimeBooster.cs` - Logic extra time
- `WinStreakGift.cs` - Logic win streak gift

### Files Cần Sửa
- `UIHome.cs` hoặc `UILevelMap.cs` - Thay đổi flow Play button
- `LevelController.cs` - Thêm execution pre-boosters sau map spawn
- `WinConditionChecker.cs` - Cập nhật win streak khi thắng/thua

---

## 7. Timeline Thực Thi

```
1. User nhấn Play ở Home/LevelMap
         ↓
2. UIPreBooster.Show() - Hiện panel chọn booster
         ↓
3. User chọn boosters & nhấn Play trong panel
         ↓
4. LevelController.LoadLevel() - Load level
         ↓
5. Map.CreateTileGrid() - Spawn tiles với animation
         ↓
6. PreBoosterManager.ExecutePreBoosters()
   ├─► ExtraTimeBooster.Apply() - Cộng bonus time
   └─► HintPlusBooster.Execute() - Highlight 4 elements
         ↓
7. Enable Input - Game bắt đầu
```

---

## 8. Lưu Ý Quan Trọng

1. **Hint Plus chỉ 1 lần** - Track state để không kích hoạt lại
2. **Win Streak Gift từ level tiếp theo** - Không áp dụng cho level hiện tại
3. **Reset streak khi thua** - Phải reset ngay khi level fail
4. **Time stacking** - Đảm bảo tính toán đúng cả 2 bonus
5. **Async execution** - Dùng callback pattern đúng cách

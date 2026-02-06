# Hat Race - Tóm Tắt Tiếng Việt

## Tổng Quan

**Hat Race** là event cạnh tranh theo thời gian cố định (3 ngày) nơi người chơi kiếm điểm bằng cách thắng level và cạnh tranh với AI bots để nhận phần thưởng.

## Đặc Điểm Chính

### 1. Thời Gian Event
- **Thời lượng**: 3 ngày cố định
- **Tính theo**: Giờ hệ thống (giống Daily Reward, Weekly Leaderboard)
- **KHÔNG phải**: Tính từ lúc user join (khác Match Race, Rise Up)
- **Ví dụ**: Bắt đầu 15h ngày 2/12 → Kết thúc 15h ngày 5/12

### 2. Cơ Chế Tham Gia
1. User mở popup Join → Click "Join"
2. Join vào Event -> Show UI HatRace

### 3. Hệ Thống Điểm & Score Multiplier

| Thắng Liên Tiếp | Multiplier |
|-----------------|------------|
| Bắt đầu         | x1         |
| 1 level         | x2         |
| 2 level         | x4         |
| 3 level         | x6         |
| 4+ level        | x10        |
**Độ khó**: 
Normal: 1 điểm
Hard: 2 điểm
Super Hard: 3 điểm

**Công thức**: `Điểm = Điểm Level dựa theo độ khó × Multiplier`

**Quy tắc**:

- Thắng level → Multiplier tăng lên tier tiếp theo (max là x cao nhất của event)
- Thua level → Multiplier reset về x thấp nhất của chặng hiện tại
- Có 3 chặng multiplier
  - Chặng 1 (default - dành cho tất cả user): x1 → x2 → x4 → x6 → x10
  - Chặng 2 (chỉ dành cho user trong top 10 khi end event với cách tính điểm của chặng 1 - qualify user): x1 → x5 → x10 → x30 → x100
  - Chặng 3 (chỉ dành cho user trong top 10 khi end event với cách tính điểm của chặng 2): x1 -> x10 -> x50 -> x100 -> x300
- Thua level → Multiplier reset về neo thấp nhất của chặng:
  - Chặng 1 → x1
  - Chặng 2 → x1
  - Chặng 3 → x1
- Quy tắc qualify
  - Qualify chỉ áp dụng cho event kế tiếp
  - Nếu user qualify nhưng không tham gia event kế tiếp:
    - Qualify KHÔNG được giữ vĩnh viễn
    - User sẽ quay lại chặng mặc định ở event sau đó
- Leaderboard theo chặng
  - Mỗi chặng có leaderboard riêng
  - User chỉ được xếp hạng với user cùng chặng
  - Không có trường hợp user chặng 1 và chặng 2 đua chung
- Reward Pending: Nếu user không mở game khi event kết thúc
  - Reward được lưu ở trạng thái pending
  - Hiển thị popup result ở lần login tiếp theo
- Nếu User hết event mà trong top10 thì event sau sẽ tăng lên chặng tiếp theo (nếu đang ở chặng cuối thì event sau vẫn là chặng cuối)
- Nếu User hết event mà out khỏi top10 thì event sau sẽ về Chặng 1 (default - dành cho tất cả user)

### 4. Leaderboard
- Hiển thị **top 50 users**
- **100% là Bot AI** (không có người chơi thật)
- Bot được sinh ra dựa trên điểm của user
- Có Scroll View giống Weekly Leaderboard

### 5. Kết Thúc Event
- Khi hết thời gian → Hiển thị popup Result
- Hiển thị rank và phần thưởng của user
- Sau khi claim/dismiss → Reset event mới

## UI Components

### 1. PopupHatRaceJoin (HatRace_Join.png)
- Hiển thị khi user mở Hat Race lần đầu
- Message: "Win a level to enter! Compete for rewards!"
- Button "Continue" để trigger join flow

### 2. ScreenHatRace (HatRace_Demo.png)
- Màn hình chính với leaderboard
- Timer countdown (e.g., "1d 22m")
- Score Multiplier bar (x1, x2, x4, x6, x10)
- Scroll view 50 users
- Current user card ở cuối

### 3. PopupHatRaceResult (HatRace_Result.png)
- Hiển thị khi event kết thúc
- "Finished!" label
- Rank và Reward của user
- Top 3 podium display

## So Sánh Với Events Khác

| Đặc Điểm | Hat Race | Match Race/Rise Up | Weekly Leaderboard |
|----------|----------|-------------------|-------------------|
| Timer | System time | Personal timer | System time |
| Reset | Tự động mỗi 3 ngày | Per-user | Tự động mỗi tuần |
| Đối thủ | Bots only | Bots only | Bots + Real users |

## Files Cần Tạo

### Core Classes
1. `HatRaceSave.cs` - Lưu trữ dữ liệu
2. `HatRaceTimeHelper.cs` - Tính toán thời gian
3. `HatRaceScoreHelper.cs` - Tính điểm/multiplier
4. `HatRaceBotGenerator.cs` - Sinh bot
5. `HatRaceUserData.cs` - Cấu trúc dữ liệu user
6. `HatRaceController.cs` - Controller chính

### UI Classes
1. `ScreenHatRace.cs` - Màn hình chính
2. `PopupHatRaceJoin.cs` - Popup join
3. `PopupHatRaceResult.cs` - Popup result
4. `HatRaceCard.cs` - Leaderboard card

## Lưu Ý Quan Trọng

⚠️ **Time-based**: Sử dụng `DateTime.UtcNow` để tránh vấn đề timezone

⚠️ **Bot generation**: Sinh bot dựa trên điểm user, cập nhật khi điểm thay đổi đáng kể

⚠️ **Multiplier reset**: Khi user thua level → reset về x1

⚠️ **Event reset**: Khi cycle mới bắt đầu, cần check pending reward trước khi reset data

⚠️ **Save system**: Sử dụng `SaveController.MarkAsSaveIsRequired()` cho performance

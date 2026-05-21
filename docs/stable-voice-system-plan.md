# Stable Personal Voice System

Mục tiêu của hệ thống là ổn định cho một người dùng cụ thể, ưu tiên hiểu đúng các câu/cụm thường dùng hơn là nhận diện tự do mọi câu.

## Nguyên tắc

- Không tự học mạnh từ một lần review.
- Không ép raw STT vào corpus khi đó là câu tự do, lời chào, tên riêng hoặc phrase mới.
- Phrase cá nhân có bằng chứng cao hơn corpus chung.
- Khi top candidates sát nhau, app hỏi lại hoặc dùng raw thay vì phát nhầm.
- Một lần sai phải giảm trust rõ ràng để tránh kéo sai dây chuyền.

## Pipeline ổn định

1. Thu audio và kiểm tra có giọng nói.
2. Chạy local STT bằng Whisper.
3. Chạy personal correction engine để sửa token/bigram/trigram theo review đúng.
4. Chạy phrase/corpus matcher để lấy top candidates.
5. Chạy personal audio match engine để tăng confidence bằng embedding giọng cá nhân.
6. Chạy AI arbiter nếu có `OPENAI_API_KEY`.
7. Decision engine chọn một trong bốn trạng thái:
   - `use_raw`: dùng raw STT.
   - `use_guess`: dùng câu đoán.
   - `ask_user`: hỏi lại trước khi học/phát.
   - `learn_new_phrase`: lưu phrase cá nhân mới.
8. Review đúng/sai cập nhật phrasebook cá nhân và trust, không cập nhật bừa corpus matcher.

## Personal phrasebook

Phrasebook lưu trong trình duyệt bằng key `voicecoach_personal_phrasebook`.

Mỗi record có:

- `text`: câu/cụm hiển thị.
- `normalized`: dạng normalize để so khớp.
- `correctCount`: số lần được xác nhận đúng.
- `wrongCount`: số lần bị đánh sai.
- `locked`: phrase đã đủ tin cậy.
- `lastSource`: nguồn học gần nhất.

Quy tắc hiện tại:

- Đúng 2 lần: phrase được đưa vào candidate cá nhân.
- Đúng 3 lần: phrase được khóa.
- Đúng 5 lần và sai <= 1: phrase được promote mạnh.
- Sai 2 lần và số sai >= số đúng: bỏ khóa.

## Personal audio embedding

Mỗi mẫu audio được trích feature nhẹ trong browser:

- `duration`
- `rmsMean`
- `zcr`
- `speakingRate`
- `speechRatio`
- `energyVector`
- `pausePattern`
- `spectralFrames`

Audio matcher chỉ dùng learned samples đã review đúng. Confidence được boost mạnh khi câu có ít nhất 5 mẫu đúng hoặc trust record đạt `correctCount >= 5 && wrongCount <= 1`.

## Chế độ học

- `Learning`: học token/cụm/audio từ review đúng nếu confidence đủ.
- `Stability`: freeze learning, không ghi correction, phrasebook, audio sample hoặc trust mới.
- `Debug`: hiển thị raw STT, corrected text, correction rules, confidence, audio similarity, trust và source engine.

## Hướng mở rộng

- Thêm màn hình quản lý phrasebook để sửa/xóa phrase sai.
- Lưu phrasebook lên SQLite để dùng bền hơn giữa trình duyệt.
- Thêm chế độ luyện 50 phrase cá nhân quan trọng nhất.
- Thêm test replay bằng các audio đã lưu để đo độ ổn định sau mỗi thay đổi.

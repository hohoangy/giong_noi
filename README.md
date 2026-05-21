# Voice Coach - Month 2

Prototype app luyện nói và thu âm bộ dữ liệu giọng nói cá nhân tiếng Việt.

## Thành phần chính

- `index.html`: giao diện luyện nói và thu âm
- `styles.css`: layout responsive
- `app.js`: nhận diện local bằng Whisper nếu có, fallback bằng mẫu audio, gợi ý câu gần đúng, phát lại
- `recorder.js`: thu âm từng câu, đặt tên file theo speaker, pack, câu, take
- `month2-corpus.js`: corpus huấn luyện gồm 400 mẫu, tách 200 câu ngắn và 200 câu dài
- `docs/personal-voice-training-corpus.md`: tài liệu bộ câu huấn luyện giọng nói cá nhân
- `scripts/generate-dataset-manifest.js`: tạo manifest từ các file audio đã thu

## Cách chạy

Chạy trong PowerShell:

```powershell
node server.js
```

Sau đó mở URL server in ra, thường là:

```text
http://localhost:3000
```

Nếu muốn dùng npm script:

```powershell
npm.cmd start
```

Nên chạy bằng Chrome hoặc Edge qua `localhost` để quyền micro, MediaRecorder, và tải mẫu audio local ổn định hơn.

## Nhận diện local bằng Whisper

App có endpoint local:

```text
POST /api/transcribe
```

Luồng luyện nói sẽ ưu tiên gửi audio đến endpoint này. Server gọi `scripts/transcribe-local.py` để chạy Whisper trên máy, sau đó app dùng transcript để tìm câu gần nhất trong cùng loại câu đang luyện, ví dụ đang ở câu ngắn thì so với toàn bộ 200 câu ngắn. Nếu Python/Whisper chưa sẵn sàng, app tự fallback về matcher audio mẫu.

Cài đặt một lần trên máy:

```powershell
winget install Python.Python.3.12
py -3 -m pip install faster-whisper
```

Sau đó restart server:

```powershell
npm start
```

Server sẽ preload Whisper khi khởi động. Khi thấy log kiểu `Transcriber worker ready`, các lượt nhận diện sau sẽ nhanh hơn vì model đã nằm sẵn trong RAM.

Mặc định dùng model `base`. Có thể đổi model trước khi chạy server:

```powershell
$env:WHISPER_MODEL="small"
npm start
```

`small` thường chính xác hơn `base` nhưng chậm hơn trên CPU.

Nếu cần nhanh hơn, dùng model nhỏ hơn:

```powershell
$env:WHISPER_MODEL="tiny"
npm start
```

`tiny` nhanh hơn nhưng kém chính xác hơn `base`.

## AI arbiter để giảm học sai

App có thêm endpoint:

```text
POST /api/ai-arbiter
```

Sau khi Whisper trả transcript, client gửi `raw STT`, câu app đoán, top candidates và lịch sử review gần đây cho AI để phân xử nên dùng raw, dùng câu đoán, hỏi lại, hoặc học phrase mới. Lớp này giúp giảm lỗi over-correction, ví dụ raw nghe là câu chào/từ mới nhưng phrase engine ép nhầm vào một câu trong corpus.

Cấu hình trước khi chạy server:

```powershell
$env:OPENAI_API_KEY="sk-..."
$env:OPENAI_AI_ARBITER_MODEL="gpt-5.5"
npm start
```

Nếu không có `OPENAI_API_KEY`, app tự fallback về nhận diện local như cũ. Endpoint chỉ gửi text/candidate metadata lên AI, không gửi audio raw.

## Thu âm dữ liệu giọng cá nhân

Recorder hiện dùng bộ `400 mẫu` gồm `200 câu ngắn` và `200 câu dài`. Mỗi loại được chia thành `20 pack`, mỗi pack có `10 câu` để dễ điều hướng và thu lại.

Quy trình:

1. Chọn `Speaker ID`, `Pack`, và `Take`
2. Đọc đúng một câu mẫu
3. Bấm `Dừng thu`
4. Nghe lại file vừa thu
5. Bấm `Tải file`

Tên file được tạo theo dạng:

```text
user01_p01_s001_t01.webm
```

Ghi chú:

- Mỗi file chỉ chứa một câu
- Nên thu ít nhất `2 take` cho mỗi câu
- Nên thu hết câu ngắn trước để app học phát âm nền, rồi tiếp tục đến câu dài
- Sau khi copy file vào `dataset/audio/<speaker_id>`, chạy manifest để kiểm tra dữ liệu

## Review nhận diện

Sau khi chọn câu trong recorder, dùng `Nhận diện câu này` để app nghe câu đang đọc. Phần review sẽ hiển thị:

- câu gốc
- câu app nhận diện
- điểm khớp với câu gốc
- nhãn đúng hoặc sai cho từng `sentence + take`
- ghi chú lỗi nếu cần

Nút `Copy JSON review` copy toàn bộ review trong trình duyệt ra clipboard để lưu lại hoặc phân tích tiếp.

## Hiểu giọng bằng mẫu audio

App có thêm lớp `App hiểu giọng` dùng template matching local:

```text
audio mới vừa thu
-> trích đặc trưng âm lượng / nhịp / zero-crossing
-> so với các file trong dataset/manifest.<speaker>.json
-> chọn mẫu audio gần nhất
```

Đây là fallback khi Whisper chưa chạy được. Nó dùng chính file giọng nói đã lưu để đoán câu. Lần đầu so giọng có thể chậm vì trình duyệt phải tải và decode các file `.webm`.

Phần luyện nói ở đầu trang cũng dùng luồng local này thay cho Web Speech API online, nên không phụ thuộc dịch vụ nhận diện giọng nói của trình duyệt.

Điều kiện:

- Chạy app qua `localhost`
- Có file `dataset/manifest.user01.json`
- Các file audio trong manifest còn đúng đường dẫn

## Tạo manifest dữ liệu

```powershell
node scripts/generate-dataset-manifest.js user01
```

File đầu ra:

```text
dataset/manifest.user01.json
```

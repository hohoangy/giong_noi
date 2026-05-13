# Month 2 - Bộ Câu Mẫu Huấn Luyện Giọng Nói Cá Nhân

`project-context.md` hiện chưa có trong workspace, nên tài liệu này bám theo mục tiêu tháng 2 bạn vừa nêu:

- dạy ứng dụng hiểu giọng nói riêng của bạn
- bắt đầu từ bước nền tảng là xây bộ câu mẫu để thu âm

## 1. Mục tiêu sản phẩm

Ở tháng 2, mục tiêu đúng không phải là "huấn luyện mô hình lớn" ngay lập tức, mà là tạo ra một bộ dữ liệu giọng nói cá nhân đủ sạch, đủ thực tế, đủ đa dạng để:

- đo độ nhận diện của app với chính giọng của bạn
- tạo nền cho bước fine-tune, phrase boosting, hoặc personalized correction về sau
- phát hiện nhóm câu nào app nhận sai nhiều nhất
- xây workflow thu âm và gắn nhãn ngay từ đầu

## 2. Nguyên tắc thiết kế bộ 300 câu

Tôi đề xuất bộ 300 câu theo 5 nguyên tắc:

1. Ưu tiên câu người dùng thật sẽ nói mỗi ngày, không dùng câu sách vở.
2. Câu ngắn đến vừa, dễ đọc thành tiếng, tránh quá nhiều tên riêng hiếm.
3. Có đủ kiểu phát ngôn: chào hỏi, yêu cầu, xác nhận, hỏi, trả lời, mô tả trạng thái.
4. Có cả câu gần với hành vi app như phát lại, mở ứng dụng, lỗi micro, nhắc lịch.
5. Chia thành nhóm chủ đề để sau này biết nhóm nào nhận diện tốt hoặc kém.

## 3. Cấu trúc bộ dữ liệu

Tổng cộng `300 câu` chia thành `12 nhóm`, mỗi nhóm `25 câu`.

| Nhóm | Chủ đề | Mục đích chính |
| --- | --- | --- |
| 1 | Chào hỏi và mở đầu | câu bắt đầu hội thoại, làm quen, thử micro |
| 2 | Gia đình và ở nhà | ngữ cảnh nói ở nhà, vật dụng, sinh hoạt |
| 3 | Ăn uống và sinh hoạt hằng ngày | các câu dùng rất thường xuyên |
| 4 | Thời gian và lịch trình | giờ giấc, hẹn lịch, nhắc việc |
| 5 | Mua sắm và thanh toán | câu dịch vụ, đổi trả, hóa đơn |
| 6 | Công việc và học tập | bối cảnh đi làm, học, họp |
| 7 | Sức khỏe và cảm xúc | mô tả cơ thể, trạng thái tinh thần |
| 8 | Điện thoại và lệnh ứng dụng | rất quan trọng cho app dùng giọng nói |
| 9 | Nhắn tin và hẹn gặp | hội thoại xã giao thực tế |
| 10 | Hỏi đường và di chuyển | vị trí, chỉ đường, phương tiện |
| 11 | Sự cố và hỗ trợ | lỗi, phản hồi, tình huống khó |
| 12 | Sở thích và mục tiêu cá nhân | phản hồi sản phẩm và ý định người dùng |

## 4. Cách chia phần để dễ thu âm

Không nên thu một lèo 300 câu. Với prototype thật, nên chia nhỏ như sau:

- Mỗi nhóm có `2 phần`
- `Phần A`: câu `01-12`
- `Phần B`: câu `13-25`
- Mỗi phần khoảng `12-13 câu`, thu trong `3-5 phút`
- Sau mỗi phần, nghỉ `1-2 phút`

Mốc thực tế:

- `1 buổi ngắn`: 2 phần, khoảng 25 câu
- `1 buổi vừa`: 4 phần, khoảng 50 câu
- `1 tuần đầu`: chỉ nên hoàn thành 60 câu ưu tiên đầu tiên

## 5. Bộ 300 câu mẫu

### Nhóm 1. Chào hỏi và mở đầu

**Phần A**

- G1-01: Chào bạn, hôm nay bạn thấy thế nào.
- G1-02: Chào buổi sáng, tôi đã sẵn sàng bắt đầu ngày mới.
- G1-03: Chào buổi tối, mình nói chuyện một chút nhé.
- G1-04: Xin chào, tôi tên là Hòa.
- G1-05: Rất vui được gặp bạn hôm nay.
- G1-06: Cảm ơn bạn đã đến đúng giờ.
- G1-07: Bạn có nghe rõ tôi nói không.
- G1-08: Tôi đang thử micro của ứng dụng.  
- G1-09: Bạn có thể nhắc lại câu vừa rồi không.
- G1-10: Hôm nay thời tiết khá dễ chịu.
- G1-11: Mình bắt đầu từ câu đơn giản trước nhé.
- G1-12: Tôi muốn luyện nói chậm và rõ hơn.

**Phần B**

- G1-13: Bạn khỏe không, dạo này công việc thế nào.
- G1-14: Mình vừa tới nơi, bạn đang ở đâu.
- G1-15: Xin lỗi, tôi đến hơi muộn một chút.
- G1-16: Để tôi giới thiệu ngắn gọn về mình.
- G1-17: Tôi đang có mặt ở nhà.
- G1-18: Hôm nay tôi hơi mệt nhưng vẫn ổn.
- G1-19: Tôi muốn nói tự nhiên hơn mỗi ngày.
- G1-20: Bây giờ chúng ta bắt đầu bài tập nhé.
- G1-21: Tôi đang kiểm tra xem hệ thống có nhận đúng không.
- G1-22: Bạn trả lời tôi bằng một câu ngắn nhé.
- G1-23: Tôi sẽ nói lại câu này một lần nữa.
- G1-24: Hôm nay tôi muốn luyện giọng nói của mình.
- G1-25: Cảm ơn, chúng ta tiếp tục sang phần tiếp theo.

### Nhóm 2. Gia đình và ở nhà

**Phần A**

- G2-01: Tôi đang ở nhà với gia đình.
- G2-02: Mẹ tôi đang nấu bữa tối.
- G2-03: Ba tôi thường dậy rất sớm.
- G2-04: Em gái tôi đang học bài trong phòng.
- G2-05: Nhà tôi cách công ty khoảng mười phút.
- G2-06: Tôi vừa dọn phòng xong.
- G2-07: Tôi cần mở cửa sổ cho thoáng.
- G2-08: Hôm nay nhà tôi có khách.
- G2-09: Tôi để chìa khóa trên bàn.
- G2-10: Tôi quên tắt đèn phòng ngủ.
- G2-11: Buổi tối tôi thường tưới cây.
- G2-12: Tôi cần giặt quần áo vào chiều nay.

**Phần B**

- G2-13: Nhà bếp hôm nay khá bừa bộn.
- G2-14: Tôi đang tìm cái ví màu đen.
- G2-15: Bình nước đang ở trong tủ lạnh.
- G2-16: Tôi sẽ ra ban công một lát.
- G2-17: Con mèo đang ngủ trên ghế sofa.
- G2-18: Sáng nào tôi cũng quét nhà.
- G2-19: Tôi cần mua thêm giấy vệ sinh.
- G2-20: Cửa trước hình như chưa khóa.
- G2-21: Tôi muốn sửa lại cái quạt trong phòng.
- G2-22: Tiếng máy giặt hôm nay hơi to.
- G2-23: Tôi đang sắp xếp lại bàn làm việc ở nhà.
- G2-24: Tối nay cả nhà ăn cơm cùng nhau.
- G2-25: Tôi muốn nhà cửa gọn gàng hơn.

### Nhóm 3. Ăn uống và sinh hoạt hằng ngày

**Phần A**

- G3-01: Sáng nay tôi ăn bánh mì và uống cà phê.
- G3-02: Tôi muốn một ly nước lọc không đá.
- G3-03: Trưa nay mình ăn gì cho nhanh.
- G3-04: Tôi đang hơi đói, đi ăn nhé.
- G3-05: Tôi muốn gọi một tô phở bò.
- G3-06: Cho tôi thêm một ít rau.
- G3-07: Món này hơi mặn với tôi.
- G3-08: Tôi không ăn cay lắm.
- G3-09: Cho tôi xin hóa đơn bàn này.
- G3-10: Tôi muốn đặt đồ ăn về nhà.
- G3-11: Cơm hôm nay nấu hơi khô.
- G3-12: Tôi cần mua thêm sữa và trứng.

**Phần B**

- G3-13: Chiều nay tôi sẽ tự nấu ăn.
- G3-14: Tôi đang uống trà nóng.
- G3-15: Bạn có muốn ăn thêm món tráng miệng không.
- G3-16: Tôi cần hâm nóng thức ăn.
- G3-17: Đừng quên mang theo chai nước.
- G3-18: Tối nay tôi ăn nhẹ thôi.
- G3-19: Tôi muốn thử món mới ở quán kia.
- G3-20: Mời bạn ăn thêm một chút.
- G3-21: Tôi đã no rồi, cảm ơn.
- G3-22: Bữa sáng là lúc tôi ăn ngon nhất.
- G3-23: Tôi đang giảm đường trong khẩu phần ăn.
- G3-24: Mình đặt bàn trước cho chắc nhé.
- G3-25: Quán này phục vụ khá nhanh.

### Nhóm 4. Thời gian và lịch trình

**Phần A**

- G4-01: Bây giờ là mấy giờ rồi.
- G4-02: Tôi có cuộc hẹn lúc chín giờ sáng.
- G4-03: Chiều nay tôi phải họp lúc ba giờ.
- G4-04: Tối nay tôi rảnh sau bảy giờ.
- G4-05: Ngày mai tôi sẽ dậy sớm hơn.
- G4-06: Tuần này lịch làm việc khá kín.
- G4-07: Tôi muốn đổi lịch sang thứ sáu.
- G4-08: Hãy nhắc tôi lúc sáu giờ tối.
- G4-09: Tôi cần hoàn thành việc này trước trưa.
- G4-10: Cuối tuần này bạn có bận không.
- G4-11: Tôi sẽ tới sau khoảng mười lăm phút.
- G4-12: Chúng ta gặp nhau vào đầu giờ chiều nhé.

**Phần B**

- G4-13: Hôm qua tôi về nhà rất muộn.
- G4-14: Tháng này tôi có nhiều việc phải làm.
- G4-15: Tôi thường tập thể dục vào buổi sáng.
- G4-16: Tôi muốn nghỉ ngơi vài phút.
- G4-17: Cuộc họp kéo dài lâu hơn dự kiến.
- G4-18: Tôi sẽ gửi lại lịch xác nhận sau.
- G4-19: Bạn rảnh vào sáng thứ hai không.
- G4-20: Tôi cần một khoảng thời gian yên tĩnh.
- G4-21: Hôm nay tôi có ba đầu việc chính.
- G4-22: Tôi vừa hoàn thành việc đầu tiên.
- G4-23: Mình bắt đầu đúng giờ nhé.
- G4-24: Tôi sẽ quay lại sau năm phút.
- G4-25: Hẹn bạn vào tối mai nhé.

### Nhóm 5. Mua sắm và thanh toán

**Phần A**

- G5-01: Tôi muốn mua một chiếc áo sơ mi trắng.
- G5-02: Size này hơi rộng với tôi.
- G5-03: Bạn có màu khác không.
- G5-04: Tôi chỉ xem một chút thôi.
- G5-05: Cho tôi thanh toán bằng thẻ.
- G5-06: Tôi cần đổi món hàng này.
- G5-07: Giá này đã bao gồm thuế chưa.
- G5-08: Tôi muốn mua loại rẻ hơn một chút.
- G5-09: Bạn gói giúp tôi món này nhé.
- G5-10: Tôi cần một hóa đơn điện tử.
- G5-11: Đơn hàng của tôi đã giao chưa.
- G5-12: Tôi muốn kiểm tra lại địa chỉ nhận hàng.

**Phần B**

- G5-13: Sản phẩm này còn bảo hành không.
- G5-14: Tôi sẽ chuyển khoản ngay bây giờ.
- G5-15: Bạn có thể giảm giá thêm không.
- G5-16: Tôi đang so sánh hai mẫu này.
- G5-17: Hôm nay siêu thị khá đông.
- G5-18: Tôi cần mua kem đánh răng và xà phòng.
- G5-19: Túi này hơi nặng, giúp tôi với.
- G5-20: Tôi muốn đặt lịch sửa máy lạnh.
- G5-21: Nhân viên tư vấn rất nhiệt tình.
- G5-22: Tôi cần thay pin cho đồng hồ.
- G5-23: Xin giữ lại phiếu bảo hành cho tôi.
- G5-24: Tôi sẽ quay lại lấy hàng sau.
- G5-25: Món này bán chạy không.

### Nhóm 6. Công việc và học tập

**Phần A**

- G6-01: Sáng nay tôi có buổi họp nhóm.
- G6-02: Tôi cần gửi báo cáo trước mười giờ.
- G6-03: Bạn xem giúp tôi tài liệu này nhé.
- G6-04: Tôi đang chỉnh sửa bản trình bày.
- G6-05: Công việc hôm nay nhiều hơn dự kiến.
- G6-06: Tôi muốn xin nghỉ nửa ngày.
- G6-07: Hãy gửi email xác nhận cho tôi.
- G6-08: Tôi đang học một kỹ năng mới.
- G6-09: Bài tập này khó hơn tôi nghĩ.
- G6-10: Tôi cần thêm thời gian để hoàn thành.
- G6-11: Chúng ta nên ưu tiên việc quan trọng trước.
- G6-12: Tôi vừa cập nhật tiến độ dự án.

**Phần B**

- G6-13: Bạn có thể chia sẻ màn hình không.
- G6-14: Tôi muốn ghi chú lại ý chính.
- G6-15: Tôi sẽ gọi lại sau cuộc họp.
- G6-16: Máy tính của tôi đang chạy chậm.
- G6-17: Tôi cần kiểm tra lại số liệu.
- G6-18: Tôi đang chuẩn bị cho buổi thuyết trình.
- G6-19: Hôm nay tôi làm việc ở nhà.
- G6-20: Tôi muốn tập trung mà không bị làm phiền.
- G6-21: Chúng ta chốt phương án này nhé.
- G6-22: Tôi cần học thêm từ vựng chuyên ngành.
- G6-23: Bài kiểm tra diễn ra vào tuần sau.
- G6-24: Tôi đã nộp bài đúng hạn.
- G6-25: Tôi muốn cải thiện cách nói trước đám đông.

### Nhóm 7. Sức khỏe và cảm xúc

**Phần A**

- G7-01: Hôm nay tôi hơi đau đầu.
- G7-02: Tôi cần nghỉ ngơi một lát.
- G7-03: Cổ họng tôi hơi khô.
- G7-04: Tôi nên uống thêm nước.
- G7-05: Tôi thấy người hơi mệt.
- G7-06: Tối qua tôi ngủ không ngon.
- G7-07: Tôi muốn đi bộ cho thư giãn.
- G7-08: Tâm trạng hôm nay của tôi khá tốt.
- G7-09: Tôi đang hơi lo lắng về công việc.
- G7-10: Tôi cần hít thở sâu và bình tĩnh lại.
- G7-11: Tôi bị đau vai sau khi ngồi lâu.
- G7-12: Tôi muốn ăn uống lành mạnh hơn.

**Phần B**

- G7-13: Hôm nay tôi thấy rất có năng lượng.
- G7-14: Tôi cần đặt lịch khám tổng quát.
- G7-15: Tôi vừa uống thuốc xong.
- G7-16: Tôi không bị sốt nhưng hơi mệt.
- G7-17: Tôi muốn nghỉ ngơi vào cuối tuần.
- G7-18: Bài tập này giúp tôi giảm căng thẳng.
- G7-19: Tôi cần ngủ sớm hơn.
- G7-20: Mắt tôi hơi mỏi vì nhìn màn hình lâu.
- G7-21: Tôi muốn duy trì thói quen tốt mỗi ngày.
- G7-22: Hôm nay tôi cảm thấy tự tin hơn.
- G7-23: Tôi cần một ngày thật nhẹ nhàng.
- G7-24: Cơ thể tôi đang phục hồi khá tốt.
- G7-25: Tôi muốn giữ tinh thần tích cực.

### Nhóm 8. Điện thoại và lệnh ứng dụng

**Phần A**

- G8-01: Mở ứng dụng ghi âm giúp tôi.
- G8-02: Tăng âm lượng lên một chút.
- G8-03: Giảm âm lượng xuống.
- G8-04: Phát lại câu vừa rồi.
- G8-05: Xóa nội dung tôi vừa nói.
- G8-06: Lưu đoạn ghi âm này lại.
- G8-07: Chuyển sang câu tiếp theo.
- G8-08: Quay lại màn hình trước.
- G8-09: Bật chế độ tối giúp tôi.
- G8-10: Tắt thông báo trong một giờ.
- G8-11: Mở danh sách bài tập hôm nay.
- G8-12: Đặt báo thức lúc sáu giờ sáng.

**Phần B**

- G8-13: Gửi tin nhắn cho mẹ giúp tôi.
- G8-14: Gọi cho anh Nam ngay bây giờ.
- G8-15: Mở bản đồ đến công ty.
- G8-16: Tìm bài hát tôi nghe hôm qua.
- G8-17: Kết nối với tai nghe bluetooth.
- G8-18: Tắt nhạc khi tôi bắt đầu nói.
- G8-19: Đổi ngôn ngữ sang tiếng Việt.
- G8-20: Kiểm tra pin của điện thoại.
- G8-21: Mở camera trước giúp tôi.
- G8-22: Chụp một tấm ảnh nhé.
- G8-23: Tải lại trang này giúp tôi.
- G8-24: Tìm file ghi âm gần nhất.
- G8-25: Đồng bộ dữ liệu lên đám mây.

### Nhóm 9. Nhắn tin và hẹn gặp

**Phần A**

- G9-01: Tôi sẽ nhắn cho bạn sau.
- G9-02: Bạn có thể gọi lại cho tôi không.
- G9-03: Tối nay mình gặp nhau ở quán cũ nhé.
- G9-04: Tôi đã gửi địa chỉ cho bạn rồi.
- G9-05: Bạn tới nơi thì báo tôi nhé.
- G9-06: Tôi đang trên đường đến.
- G9-07: Hôm nay mình dời lịch được không.
- G9-08: Tôi xin lỗi vì trả lời muộn.
- G9-09: Cảm ơn bạn đã chờ tôi.
- G9-10: Tôi sẽ xác nhận lại trong chiều nay.
- G9-11: Bạn có rảnh nói chuyện một chút không.
- G9-12: Mình gặp nhau trước cổng chính nhé.

**Phần B**

- G9-13: Tôi đã đọc tin nhắn của bạn rồi.
- G9-14: Để tôi gọi video cho bạn.
- G9-15: Chúc bạn có một ngày thật tốt.
- G9-16: Hẹn gặp bạn vào cuối tuần.
- G9-17: Tôi muốn mời bạn đi ăn tối.
- G9-18: Tôi vừa đến nơi hẹn.
- G9-19: Mình đổi sang chỗ ngồi gần cửa sổ nhé.
- G9-20: Bạn gửi giúp tôi số điện thoại đó.
- G9-21: Tôi cần trả lời tin nhắn này ngay.
- G9-22: Mình nói chuyện sau giờ làm nhé.
- G9-23: Tôi muốn hỏi ý kiến của bạn.
- G9-24: Cảm ơn bạn đã giúp tôi hôm qua.
- G9-25: Tôi sẽ gửi lại chi tiết sau.

### Nhóm 10. Hỏi đường và di chuyển

**Phần A**

- G10-01: Bến xe gần nhất ở đâu vậy.
- G10-02: Tôi muốn đi đến trung tâm thành phố.
- G10-03: Đường này có bị kẹt xe không.
- G10-04: Rẽ trái ở ngã tư phía trước.
- G10-05: Đi thẳng thêm khoảng hai trăm mét.
- G10-06: Cho tôi xuống ở trạm tiếp theo.
- G10-07: Tôi đang chờ xe trước cửa nhà.
- G10-08: Chuyến xe này có đi qua sân bay không.
- G10-09: Tôi cần đặt một chuyến xe công nghệ.
- G10-10: Bạn có thể chỉ đường giúp tôi không.
- G10-11: Tôi bị lạc gần khu này rồi.
- G10-12: Từ đây đến công ty mất bao lâu.

**Phần B**

- G10-13: Hôm nay đường đông hơn bình thường.
- G10-14: Tôi muốn chọn tuyến đường nhanh nhất.
- G10-15: Bãi đỗ xe nằm ở tầng hầm.
- G10-16: Tàu sắp đến ga tiếp theo.
- G10-17: Tôi quên mang theo vé xe buýt.
- G10-18: Giúp tôi kiểm tra giờ khởi hành.
- G10-19: Tôi sẽ tới nơi trong mười phút nữa.
- G10-20: Đường về nhà tối nay khá vắng.
- G10-21: Tôi muốn xuống ở gần công viên.
- G10-22: Chúng ta đi bộ thêm một đoạn nhé.
- G10-23: Tôi đang đứng trước cửa hàng tiện lợi.
- G10-24: Xe của tôi đang hết xăng.
- G10-25: Hôm nay tôi muốn đi bằng xe máy.

### Nhóm 11. Sự cố và hỗ trợ

**Phần A**

- G11-01: Tôi không đăng nhập được tài khoản.
- G11-02: Mật khẩu của tôi có vẻ sai.
- G11-03: Ứng dụng đang bị treo.
- G11-04: Màn hình điện thoại không phản hồi.
- G11-05: Tôi cần hỗ trợ ngay bây giờ.
- G11-06: Đơn hàng của tôi bị giao thiếu.
- G11-07: Tôi chưa nhận được mã xác nhận.
- G11-08: Kết nối mạng hôm nay rất yếu.
- G11-09: Tôi nghe tiếng rè trong tai nghe.
- G11-10: Micro của tôi không hoạt động.
- G11-11: Vui lòng kiểm tra lại giúp tôi.
- G11-12: Tôi cần khởi động lại thiết bị.

**Phần B**

- G11-13: Dữ liệu vừa rồi chưa được lưu.
- G11-14: Hệ thống báo lỗi nhiều lần.
- G11-15: Tôi muốn gửi phản hồi cho bộ phận hỗ trợ.
- G11-16: Ứng dụng tự thoát khi đang dùng.
- G11-17: Tôi không tìm thấy file đã lưu.
- G11-18: Màn hình này tải quá lâu.
- G11-19: Tôi cần hướng dẫn từng bước.
- G11-20: Tôi muốn thử lại từ đầu.
- G11-21: Vui lòng nói chậm hơn một chút.
- G11-22: Hãy cho tôi biết lỗi ở đâu.
- G11-23: Tôi cần một cách xử lý đơn giản hơn.
- G11-24: Máy đang nóng lên khá nhanh.
- G11-25: Tôi sẽ gửi ảnh màn hình lỗi sau.

### Nhóm 12. Sở thích và mục tiêu cá nhân

**Phần A**

- G12-01: Tôi thích cách nói tự nhiên và rõ ràng.
- G12-02: Tôi muốn luyện mỗi ngày mười phút.
- G12-03: Tôi thấy bài tập này khá hữu ích.
- G12-04: Tôi thích câu ngắn trước rồi mới tới câu dài.
- G12-05: Tôi muốn giao diện đơn giản hơn.
- G12-06: Tôi thích giọng đọc chậm hơn một chút.
- G12-07: Tôi muốn ứng dụng nhớ câu tôi hay nói.
- G12-08: Tôi cần ví dụ gần với cuộc sống thật.
- G12-09: Tôi muốn theo dõi tiến bộ theo tuần.
- G12-10: Tôi thích học vào buổi tối.
- G12-11: Tôi muốn tập trung vào phát âm rõ.
- G12-12: Tôi thấy phần hướng dẫn nên ngắn hơn.

**Phần B**

- G12-13: Tôi thích tự thu âm ở nhà.
- G12-14: Tôi muốn ứng dụng phản hồi nhanh hơn.
- G12-15: Tôi thích chủ đề ăn uống và đi làm.
- G12-16: Tôi muốn thêm bài tập cho lúc đang lái xe.
- G12-17: Tôi thấy câu này hơi dài với tôi.
- G12-18: Tôi muốn lặp lại câu khó thêm vài lần.
- G12-19: Tôi thích luyện bằng tiếng Việt hằng ngày.
- G12-20: Tôi muốn hệ thống hiểu giọng của riêng tôi.
- G12-21: Tôi thích kết quả hiển thị thật dễ đọc.
- G12-22: Tôi muốn bắt đầu từ những câu quen thuộc.
- G12-23: Tôi cần một lộ trình rõ ràng hơn.
- G12-24: Tôi muốn ứng dụng giúp tôi tự tin hơn khi nói.
- G12-25: Tôi nghĩ chúng ta nên bắt đầu bằng dữ liệu chất lượng cao.

## 6. 60 câu ưu tiên để bắt đầu trong tuần 1

Không nên đụng ngay toàn bộ 300 câu. Tuần 1 nên làm `60 câu ưu tiên` để kiểm thử workflow trước.

Tôi đề xuất lấy:

- `Nhóm 1 - Phần A` (`12 câu`): để thử câu mở đầu, câu tự nhiên, câu test micro
- `Nhóm 3 - Phần A` (`12 câu`): vì đây là ngôn ngữ đời sống rất thường gặp
- `Nhóm 4 - Phần A` (`12 câu`): để phủ thời gian, lịch, nhắc việc
- `Nhóm 8 - Phần A` (`12 câu`): để phủ lệnh ứng dụng và hành vi giọng nói
- `Nhóm 11 - Phần A` (`12 câu`): để phủ lỗi, support, micro, mạng

Tổng cộng đúng `60 câu`.

## 7. Tuần 1 nên làm gì trước

Nếu làm như đang xây sản phẩm thật, tuần 1 nên đi theo thứ tự này:

### Bước 1. Chốt format dữ liệu

Trước khi thu âm, chốt luôn metadata cho từng câu:

- `sentence_id`
- `group_id`
- `part_id`
- `text`
- `priority`
- `recorded`
- `transcript_reference`
- `notes`

Lý do: nếu không chốt format sớm, về sau thu âm xong rất khó kiểm soát dữ liệu.

### Bước 2. Khóa bộ 60 câu đầu tiên

Đừng thu 300 câu ngay. Hãy khóa trước `60 câu ưu tiên` ở mục trên.

Mục tiêu:

- đo xem app hiện nhận giọng của bạn tới đâu
- phát hiện câu nào quá dài hoặc khó đọc
- biết nhóm nào đang sai nhiều

### Bước 3. Làm một bài test pilot nhỏ

Thu thử `20 câu đầu` trong một buổi ngắn.

Yêu cầu pilot:

- cùng một micro
- cùng một vị trí ngồi
- âm lượng nói tự nhiên
- mỗi câu đọc `2 lần`
- lưu lại bản nhận diện của app để so sánh

Đầu ra cần có:

- câu gốc
- câu app nhận diện
- đúng hay sai
- lỗi nằm ở từ nào

### Bước 4. Rà lại chất lượng bộ câu

Sau pilot, loại hoặc sửa các câu có vấn đề:

- quá dài
- quá giống nhau
- nhiều từ riêng khó đọc
- dễ nuốt âm
- không giống cách bạn nói thật ngoài đời

### Bước 5. Hoàn thành 60 câu nền

Khi pilot ổn, mới thu tiếp hết `60 câu ưu tiên`.

Tôi đề xuất:

- `Ngày 1`: chốt bộ câu và format dữ liệu
- `Ngày 2`: thu pilot 20 câu
- `Ngày 3`: rà lỗi và chỉnh câu
- `Ngày 4`: thu tiếp 20 câu
- `Ngày 5`: thu tiếp 20 câu cuối

### Bước 6. Chỉ sau đó mới mở rộng lên 300 câu

Khi 60 câu đầu đã sạch, lúc đó mới tiếp tục:

- mở rộng sang các phần B
- tăng độ dài câu
- thêm biến thể tốc độ nói
- thêm điều kiện môi trường khác nhau

## 8. Definition of done cho tuần 1

Tuần 1 xem như đạt nếu bạn có đủ:

- bộ `300 câu v1` đã khóa nội dung
- danh sách `60 câu ưu tiên` đã chọn xong
- ít nhất `20 câu pilot` đã được thu âm
- bảng so sánh `câu gốc` và `câu app nhận`
- danh sách lỗi phổ biến đầu tiên của chính giọng bạn

## 9. Bước tiếp theo nên làm sau tài liệu này

Sau khi chốt bộ câu, việc nên làm tiếp là:

1. tạo file dữ liệu có cấu trúc để app đọc được
2. tạo giao diện thu âm theo từng phần A và B
3. lưu transcript gốc và transcript app nhận ra
4. thêm màn hình review để đánh dấu đúng hoặc sai

Nếu muốn, bước tiếp theo tôi có thể làm luôn là tạo:

- file `CSV/JSON` cho bộ 300 câu
- màn hình thu âm theo từng pack
- cấu trúc lưu dữ liệu cho tháng 2

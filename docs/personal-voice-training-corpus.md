# Bộ câu huấn luyện giọng nói cá nhân

Tài liệu này mô tả bộ dữ liệu câu mẫu đang được app sử dụng để thu âm, học phát âm cá nhân và nhận diện lại giọng nói theo hướng phrase-first. Nội dung được đồng bộ từ `month2-corpus.js`.

## Mục tiêu

- Thu âm từng mẫu để tạo bộ giọng cá nhân sạch và nhất quán.
- Dạy app hiểu cụm ngắn trước, sau đó mới ghép với câu dài để giảm đoán sai.
- Giữ đủ độ rộng về nhu cầu, sức khỏe, ăn uống, giao tiếp, gia đình, công việc, công nghệ, di chuyển, cảm xúc và tình huống khẩn cấp.
- Chia nhỏ theo pack 10 câu để dễ thu, dễ kiểm tra và dễ thu lại khi cần.

## Cấu trúc bộ dữ liệu

- Tổng số mẫu: 400.
- Câu ngắn: 200 mẫu, dùng để học phát âm theo từ/cụm và sửa phrase.
- Câu dài: 200 mẫu, đã rút còn khoảng 5-7 từ để học ngữ cảnh và sentence matching ổn định hơn.
- Mỗi pack trong giao diện gồm 10 câu để điều hướng nhanh.
- Mỗi câu nên thu 1 file riêng, đọc đúng nội dung đang hiển thị.

## Quy tắc thu âm

- Giữ im lặng khoảng nửa giây trước khi nói.
- Đọc đúng một câu hoặc một cụm, tốc độ tự nhiên, không cần cố đọc quá nhanh.
- Nếu nói sai, thu lại take mới thay vì cắt ghép file.
- Ưu tiên hoàn thành câu ngắn trước để app học phát âm nền.
- Sau khi có đủ câu ngắn, tiếp tục thu câu dài để app học ngữ cảnh.

## Bảng pack thu âm

| Pack | Dải ID | Chủ đề |
| --- | --- | --- |
| Câu ngắn 01 | S001-S010 | Câu ngắn - nhu cầu cơ bản |
| Câu ngắn 02 | S011-S020 | Câu ngắn - nhu cầu cơ bản |
| Câu ngắn 03 | S021-S030 | Câu ngắn - sức khỏe |
| Câu ngắn 04 | S031-S040 | Câu ngắn - sức khỏe |
| Câu ngắn 05 | S041-S050 | Câu ngắn - ăn uống |
| Câu ngắn 06 | S051-S060 | Câu ngắn - ăn uống |
| Câu ngắn 07 | S061-S070 | Câu ngắn - giao tiếp |
| Câu ngắn 08 | S071-S080 | Câu ngắn - giao tiếp |
| Câu ngắn 09 | S081-S090 | Câu ngắn - gia đình |
| Câu ngắn 10 | S091-S100 | Câu ngắn - gia đình |
| Câu ngắn 11 | S101-S110 | Câu ngắn - công việc |
| Câu ngắn 12 | S111-S120 | Câu ngắn - công việc |
| Câu ngắn 13 | S121-S130 | Câu ngắn - công nghệ |
| Câu ngắn 14 | S131-S140 | Câu ngắn - công nghệ |
| Câu ngắn 15 | S141-S150 | Câu ngắn - di chuyển |
| Câu ngắn 16 | S151-S160 | Câu ngắn - di chuyển |
| Câu ngắn 17 | S161-S170 | Câu ngắn - cảm xúc |
| Câu ngắn 18 | S171-S180 | Câu ngắn - cảm xúc |
| Câu ngắn 19 | S181-S190 | Câu ngắn - khẩn cấp |
| Câu ngắn 20 | S191-S200 | Câu ngắn - khẩn cấp |
| Câu dài 01 | S201-S210 | Câu dài - nhu cầu cơ bản |
| Câu dài 02 | S211-S220 | Câu dài - nhu cầu cơ bản |
| Câu dài 03 | S221-S230 | Câu dài - sức khỏe |
| Câu dài 04 | S231-S240 | Câu dài - sức khỏe |
| Câu dài 05 | S241-S250 | Câu dài - ăn uống |
| Câu dài 06 | S251-S260 | Câu dài - ăn uống |
| Câu dài 07 | S261-S270 | Câu dài - giao tiếp |
| Câu dài 08 | S271-S280 | Câu dài - giao tiếp |
| Câu dài 09 | S281-S290 | Câu dài - gia đình |
| Câu dài 10 | S291-S300 | Câu dài - gia đình |
| Câu dài 11 | S301-S310 | Câu dài - công việc |
| Câu dài 12 | S311-S320 | Câu dài - công việc |
| Câu dài 13 | S321-S330 | Câu dài - công nghệ |
| Câu dài 14 | S331-S340 | Câu dài - công nghệ |
| Câu dài 15 | S341-S350 | Câu dài - di chuyển |
| Câu dài 16 | S351-S360 | Câu dài - di chuyển |
| Câu dài 17 | S361-S370 | Câu dài - cảm xúc |
| Câu dài 18 | S371-S380 | Câu dài - cảm xúc |
| Câu dài 19 | S381-S390 | Câu dài - khẩn cấp |
| Câu dài 20 | S391-S400 | Câu dài - khẩn cấp |

## Danh sách 200 câu ngắn

Câu ngắn dùng để học phát âm theo cụm, token, bigram và trigram. Đây là lớp nền cho phrase correction.

Tổng cộng: 200 mẫu.

### SHORT1. Câu ngắn - nhu cầu cơ bản

| ID | Câu mẫu | Pack thu âm |
| --- | --- | --- |
| S001 | uống nước | Câu ngắn 01 |
| S002 | ăn cơm | Câu ngắn 01 |
| S003 | đi vệ sinh | Câu ngắn 01 |
| S004 | nghỉ một chút | Câu ngắn 01 |
| S005 | đổi tư thế | Câu ngắn 01 |
| S006 | ngồi dậy | Câu ngắn 01 |
| S007 | nằm xuống | Câu ngắn 01 |
| S008 | mở cửa | Câu ngắn 01 |
| S009 | đóng cửa | Câu ngắn 01 |
| S010 | bật đèn | Câu ngắn 01 |
| S011 | tắt đèn | Câu ngắn 02 |
| S012 | mở quạt | Câu ngắn 02 |
| S013 | tắt quạt | Câu ngắn 02 |
| S014 | lấy áo | Câu ngắn 02 |
| S015 | lấy khăn | Câu ngắn 02 |
| S016 | lấy điện thoại | Câu ngắn 02 |
| S017 | giúp tôi | Câu ngắn 02 |
| S018 | đợi chút | Câu ngắn 02 |
| S019 | không sao | Câu ngắn 02 |
| S020 | cảm ơn | Câu ngắn 02 |

### SHORT2. Câu ngắn - sức khỏe

| ID | Câu mẫu | Pack thu âm |
| --- | --- | --- |
| S021 | tôi đau | Câu ngắn 03 |
| S022 | đau đầu | Câu ngắn 03 |
| S023 | đau vai | Câu ngắn 03 |
| S024 | đau cổ | Câu ngắn 03 |
| S025 | đau lưng | Câu ngắn 03 |
| S026 | đau bụng | Câu ngắn 03 |
| S027 | hơi mệt | Câu ngắn 03 |
| S028 | rất mệt | Câu ngắn 03 |
| S029 | khó thở | Câu ngắn 03 |
| S030 | chóng mặt | Câu ngắn 03 |
| S031 | buồn nôn | Câu ngắn 04 |
| S032 | khát nước | Câu ngắn 04 |
| S033 | muốn ngủ | Câu ngắn 04 |
| S034 | uống thuốc | Câu ngắn 04 |
| S035 | gọi bác sĩ | Câu ngắn 04 |
| S036 | đo nhiệt độ | Câu ngắn 04 |
| S037 | kiểm tra huyết áp | Câu ngắn 04 |
| S038 | tôi ổn | Câu ngắn 04 |
| S039 | không ổn | Câu ngắn 04 |
| S040 | cần nghỉ | Câu ngắn 04 |

### SHORT3. Câu ngắn - ăn uống

| ID | Câu mẫu | Pack thu âm |
| --- | --- | --- |
| S041 | ăn sáng | Câu ngắn 05 |
| S042 | ăn trưa | Câu ngắn 05 |
| S043 | ăn tối | Câu ngắn 05 |
| S044 | uống sữa | Câu ngắn 05 |
| S045 | uống trà | Câu ngắn 05 |
| S046 | uống cà phê | Câu ngắn 05 |
| S047 | thêm cơm | Câu ngắn 05 |
| S048 | thêm rau | Câu ngắn 05 |
| S049 | ít thôi | Câu ngắn 05 |
| S050 | nhiều quá | Câu ngắn 05 |
| S051 | không cay | Câu ngắn 06 |
| S052 | không mặn | Câu ngắn 06 |
| S053 | hơi nóng | Câu ngắn 06 |
| S054 | hơi lạnh | Câu ngắn 06 |
| S055 | đủ rồi | Câu ngắn 06 |
| S056 | no rồi | Câu ngắn 06 |
| S057 | đói quá | Câu ngắn 06 |
| S058 | hâm nóng | Câu ngắn 06 |
| S059 | lấy muỗng | Câu ngắn 06 |
| S060 | lấy đũa | Câu ngắn 06 |

### SHORT4. Câu ngắn - giao tiếp

| ID | Câu mẫu | Pack thu âm |
| --- | --- | --- |
| S061 | xin chào | Câu ngắn 07 |
| S062 | chào bạn | Câu ngắn 07 |
| S063 | cảm ơn bạn | Câu ngắn 07 |
| S064 | xin lỗi | Câu ngắn 07 |
| S065 | được không | Câu ngắn 07 |
| S066 | ở đâu | Câu ngắn 07 |
| S067 | mấy giờ | Câu ngắn 07 |
| S068 | bao lâu | Câu ngắn 07 |
| S069 | nói lại | Câu ngắn 07 |
| S070 | nói chậm | Câu ngắn 07 |
| S071 | nghe rõ | Câu ngắn 08 |
| S072 | không nghe | Câu ngắn 08 |
| S073 | tôi hiểu | Câu ngắn 08 |
| S074 | chưa hiểu | Câu ngắn 08 |
| S075 | đúng rồi | Câu ngắn 08 |
| S076 | sai rồi | Câu ngắn 08 |
| S077 | đợi tôi | Câu ngắn 08 |
| S078 | gọi lại | Câu ngắn 08 |
| S079 | nhắn tin | Câu ngắn 08 |
| S080 | hẹn gặp | Câu ngắn 08 |

### SHORT5. Câu ngắn - gia đình

| ID | Câu mẫu | Pack thu âm |
| --- | --- | --- |
| S081 | gọi mẹ | Câu ngắn 09 |
| S082 | gọi ba | Câu ngắn 09 |
| S083 | gọi anh | Câu ngắn 09 |
| S084 | gọi chị | Câu ngắn 09 |
| S085 | gọi em | Câu ngắn 09 |
| S086 | mẹ đâu | Câu ngắn 09 |
| S087 | ba đâu | Câu ngắn 09 |
| S088 | về nhà | Câu ngắn 09 |
| S089 | ở nhà | Câu ngắn 09 |
| S090 | ra ngoài | Câu ngắn 09 |
| S091 | vào phòng | Câu ngắn 10 |
| S092 | xuống bếp | Câu ngắn 10 |
| S093 | lên lầu | Câu ngắn 10 |
| S094 | mở tivi | Câu ngắn 10 |
| S095 | tắt tivi | Câu ngắn 10 |
| S096 | dọn bàn | Câu ngắn 10 |
| S097 | quét nhà | Câu ngắn 10 |
| S098 | giặt đồ | Câu ngắn 10 |
| S099 | phơi đồ | Câu ngắn 10 |
| S100 | khóa cửa | Câu ngắn 10 |

### SHORT6. Câu ngắn - công việc

| ID | Câu mẫu | Pack thu âm |
| --- | --- | --- |
| S101 | đi làm | Câu ngắn 11 |
| S102 | họp nhóm | Câu ngắn 11 |
| S103 | gửi báo cáo | Câu ngắn 11 |
| S104 | mở tài liệu | Câu ngắn 11 |
| S105 | chia sẻ màn hình | Câu ngắn 11 |
| S106 | gửi email | Câu ngắn 11 |
| S107 | kiểm tra lịch | Câu ngắn 11 |
| S108 | đổi lịch | Câu ngắn 11 |
| S109 | xin nghỉ | Câu ngắn 11 |
| S110 | hoàn thành rồi | Câu ngắn 11 |
| S111 | cần thêm giờ | Câu ngắn 12 |
| S112 | bắt đầu họp | Câu ngắn 12 |
| S113 | kết thúc họp | Câu ngắn 12 |
| S114 | ghi chú lại | Câu ngắn 12 |
| S115 | xem giúp | Câu ngắn 12 |
| S116 | gọi khách | Câu ngắn 12 |
| S117 | trả lời sau | Câu ngắn 12 |
| S118 | ưu tiên việc này | Câu ngắn 12 |
| S119 | máy chậm | Câu ngắn 12 |
| S120 | mất mạng | Câu ngắn 12 |

### SHORT7. Câu ngắn - công nghệ

| ID | Câu mẫu | Pack thu âm |
| --- | --- | --- |
| S121 | mở ứng dụng | Câu ngắn 13 |
| S122 | đóng ứng dụng | Câu ngắn 13 |
| S123 | tải lại | Câu ngắn 13 |
| S124 | lưu lại | Câu ngắn 13 |
| S125 | xóa nội dung | Câu ngắn 13 |
| S126 | phát lại | Câu ngắn 13 |
| S127 | tăng âm lượng | Câu ngắn 13 |
| S128 | giảm âm lượng | Câu ngắn 13 |
| S129 | bật bluetooth | Câu ngắn 13 |
| S130 | tắt bluetooth | Câu ngắn 13 |
| S131 | mở camera | Câu ngắn 14 |
| S132 | chụp ảnh | Câu ngắn 14 |
| S133 | gửi ảnh | Câu ngắn 14 |
| S134 | kiểm tra pin | Câu ngắn 14 |
| S135 | cắm sạc | Câu ngắn 14 |
| S136 | mở bản đồ | Câu ngắn 14 |
| S137 | tìm file | Câu ngắn 14 |
| S138 | đăng nhập | Câu ngắn 14 |
| S139 | quên mật khẩu | Câu ngắn 14 |
| S140 | báo lỗi | Câu ngắn 14 |

### SHORT8. Câu ngắn - di chuyển

| ID | Câu mẫu | Pack thu âm |
| --- | --- | --- |
| S141 | đi thẳng | Câu ngắn 15 |
| S142 | rẽ trái | Câu ngắn 15 |
| S143 | rẽ phải | Câu ngắn 15 |
| S144 | dừng lại | Câu ngắn 15 |
| S145 | đi chậm | Câu ngắn 15 |
| S146 | đi nhanh | Câu ngắn 15 |
| S147 | chờ xe | Câu ngắn 15 |
| S148 | gọi xe | Câu ngắn 15 |
| S149 | xuống xe | Câu ngắn 15 |
| S150 | lên xe | Câu ngắn 15 |
| S151 | đến nơi | Câu ngắn 16 |
| S152 | bị lạc | Câu ngắn 16 |
| S153 | hỏi đường | Câu ngắn 16 |
| S154 | gần đây | Câu ngắn 16 |
| S155 | xa quá | Câu ngắn 16 |
| S156 | kẹt xe | Câu ngắn 16 |
| S157 | về công ty | Câu ngắn 16 |
| S158 | ra cổng | Câu ngắn 16 |
| S159 | vào nhà | Câu ngắn 16 |
| S160 | đợi ngoài cửa | Câu ngắn 16 |

### SHORT9. Câu ngắn - cảm xúc

| ID | Câu mẫu | Pack thu âm |
| --- | --- | --- |
| S161 | tôi vui | Câu ngắn 17 |
| S162 | tôi buồn | Câu ngắn 17 |
| S163 | tôi lo | Câu ngắn 17 |
| S164 | tôi sợ | Câu ngắn 17 |
| S165 | tôi giận | Câu ngắn 17 |
| S166 | tôi ổn | Câu ngắn 17 |
| S167 | hơi căng thẳng | Câu ngắn 17 |
| S168 | rất thoải mái | Câu ngắn 17 |
| S169 | muốn yên tĩnh | Câu ngắn 17 |
| S170 | cần bình tĩnh | Câu ngắn 17 |
| S171 | khó chịu | Câu ngắn 18 |
| S172 | dễ chịu | Câu ngắn 18 |
| S173 | mệt quá | Câu ngắn 18 |
| S174 | vui hơn | Câu ngắn 18 |
| S175 | ổn hơn | Câu ngắn 18 |
| S176 | tự tin | Câu ngắn 18 |
| S177 | bối rối | Câu ngắn 18 |
| S178 | ngại quá | Câu ngắn 18 |
| S179 | không thích | Câu ngắn 18 |
| S180 | thích lắm | Câu ngắn 18 |

### SHORT10. Câu ngắn - khẩn cấp

| ID | Câu mẫu | Pack thu âm |
| --- | --- | --- |
| S181 | giúp ngay | Câu ngắn 19 |
| S182 | gọi cấp cứu | Câu ngắn 19 |
| S183 | gọi người nhà | Câu ngắn 19 |
| S184 | khó thở quá | Câu ngắn 19 |
| S185 | đau nhiều | Câu ngắn 19 |
| S186 | ngã rồi | Câu ngắn 19 |
| S187 | không đứng được | Câu ngắn 19 |
| S188 | không nói được | Câu ngắn 19 |
| S189 | mở cửa ngay | Câu ngắn 19 |
| S190 | đưa thuốc | Câu ngắn 19 |
| S191 | đưa nước | Câu ngắn 20 |
| S192 | đưa điện thoại | Câu ngắn 20 |
| S193 | đừng đi | Câu ngắn 20 |
| S194 | ở lại đây | Câu ngắn 20 |
| S195 | bật chuông | Câu ngắn 20 |
| S196 | kiểm tra tôi | Câu ngắn 20 |
| S197 | đưa tôi đi | Câu ngắn 20 |
| S198 | cần xe ngay | Câu ngắn 20 |
| S199 | rất nguy hiểm | Câu ngắn 20 |
| S200 | bình tĩnh | Câu ngắn 20 |

## Danh sách 200 câu dài

Câu dài dùng để học ngữ cảnh giao tiếp, nhưng được giữ ở khoảng 5-7 từ để dễ thu âm, dễ khớp mẫu và giảm sai lệch nhịp đọc.

Tổng cộng: 200 mẫu.

### LONG1. Câu dài - nhu cầu cơ bản

| ID | Câu mẫu | Pack thu âm |
| --- | --- | --- |
| S201 | Tôi muốn uống nước lọc. | Câu dài 01 |
| S202 | Giúp tôi đổi tư thế ngồi. | Câu dài 01 |
| S203 | Tôi cần nằm nghỉ mười phút. | Câu dài 01 |
| S204 | Mở cửa sổ cho thoáng phòng. | Câu dài 01 |
| S205 | Lấy giúp tôi điện thoại trên bàn. | Câu dài 01 |
| S206 | Bật đèn trong phòng khách. | Câu dài 01 |
| S207 | Tắt quạt vì tôi thấy lạnh. | Câu dài 01 |
| S208 | Tôi cần đi vệ sinh. | Câu dài 01 |
| S209 | Lấy khăn trắng gần giường. | Câu dài 01 |
| S210 | Tôi muốn ngồi dậy từ từ. | Câu dài 01 |
| S211 | Đóng cửa phòng giúp tôi. | Câu dài 02 |
| S212 | Tôi cần thay áo ướt. | Câu dài 02 |
| S213 | Kéo rèm cửa cho bớt nắng. | Câu dài 02 |
| S214 | Cho tôi nghe lại câu vừa rồi. | Câu dài 02 |
| S215 | Đợi tôi trước khi chuyển việc. | Câu dài 02 |
| S216 | Tôi cần không gian yên tĩnh. | Câu dài 02 |
| S217 | Đặt ly nước bên tay phải. | Câu dài 02 |
| S218 | Tôi muốn đổi sang ghế khác. | Câu dài 02 |
| S219 | Kiểm tra cửa trước đã khóa chưa. | Câu dài 02 |
| S220 | Tôi ổn rồi, cảm ơn bạn. | Câu dài 02 |

### LONG2. Câu dài - sức khỏe

| ID | Câu mẫu | Pack thu âm |
| --- | --- | --- |
| S221 | Hôm nay tôi hơi đau đầu. | Câu dài 03 |
| S222 | Tôi đau vai sau khi ngồi. | Câu dài 03 |
| S223 | Lấy thuốc trong hộp màu xanh. | Câu dài 03 |
| S224 | Tôi hơi khó thở hôm nay. | Câu dài 03 |
| S225 | Đo nhiệt độ giúp tôi. | Câu dài 03 |
| S226 | Tôi cần uống thuốc sau ăn. | Câu dài 03 |
| S227 | Cho tôi uống nước ấm. | Câu dài 03 |
| S228 | Tôi chóng mặt khi đứng dậy. | Câu dài 03 |
| S229 | Kiểm tra huyết áp giúp tôi. | Câu dài 03 |
| S230 | Cơ thể tôi vẫn rất mệt. | Câu dài 03 |
| S231 | Tôi muốn đi bộ nhẹ. | Câu dài 04 |
| S232 | Gọi bác sĩ nếu kéo dài. | Câu dài 04 |
| S233 | Tôi cần nằm nghiêng trái. | Câu dài 04 |
| S234 | Mắt tôi hơi mỏi hôm nay. | Câu dài 04 |
| S235 | Tôi muốn hít thở sâu. | Câu dài 04 |
| S236 | Nhắc tôi uống thuốc tối nay. | Câu dài 04 |
| S237 | Tôi đang hồi phục tốt hơn. | Câu dài 04 |
| S238 | Cơn đau bụng đã giảm. | Câu dài 04 |
| S239 | Tôi muốn đặt lịch khám. | Câu dài 04 |
| S240 | Khó thở hơn thì gọi cấp cứu. | Câu dài 04 |

### LONG3. Câu dài - ăn uống

| ID | Câu mẫu | Pack thu âm |
| --- | --- | --- |
| S241 | Tôi muốn ăn cơm với rau. | Câu dài 05 |
| S242 | Cho tôi thêm nước canh. | Câu dài 05 |
| S243 | Món này hơi mặn với tôi. | Câu dài 05 |
| S244 | Tôi không ăn cay được. | Câu dài 05 |
| S245 | Hâm nóng phần thức ăn này. | Câu dài 05 |
| S246 | Tôi muốn uống sữa ấm. | Câu dài 05 |
| S247 | Lấy giúp tôi cái muỗng. | Câu dài 05 |
| S248 | Tôi no rồi, không thêm cơm. | Câu dài 05 |
| S249 | Bữa sáng tôi ăn nhẹ thôi. | Câu dài 05 |
| S250 | Đặt bát cơm gần tay phải. | Câu dài 05 |
| S251 | Tôi muốn uống trà nóng. | Câu dài 06 |
| S252 | Món này nóng, để nguội thêm. | Câu dài 06 |
| S253 | Tôi cần ăn chậm hơn. | Câu dài 06 |
| S254 | Cho tôi thêm rau vừa đủ. | Câu dài 06 |
| S255 | Tôi muốn món mềm dễ nuốt. | Câu dài 06 |
| S256 | Cắt nhỏ thức ăn giúp tôi. | Câu dài 06 |
| S257 | Tôi uống nước rồi ăn tiếp. | Câu dài 06 |
| S258 | Tối nay tôi ăn phần nhỏ. | Câu dài 06 |
| S259 | Còn canh nóng cho tôi xin. | Câu dài 06 |
| S260 | Bữa ăn hôm nay vừa miệng. | Câu dài 06 |

### LONG4. Câu dài - giao tiếp

| ID | Câu mẫu | Pack thu âm |
| --- | --- | --- |
| S261 | Xin chào, hôm nay bạn khỏe không. | Câu dài 07 |
| S262 | Bạn nói chậm để tôi nghe rõ. | Câu dài 07 |
| S263 | Tôi chưa hiểu, nhắc lại nhé. | Câu dài 07 |
| S264 | Cảm ơn bạn đã chờ tôi. | Câu dài 07 |
| S265 | Tôi muốn nói chuyện thêm. | Câu dài 07 |
| S266 | Bạn gọi lại vào buổi tối. | Câu dài 07 |
| S267 | Tôi xin lỗi vì trả lời chậm. | Câu dài 07 |
| S268 | Không rõ thì tôi nói lại. | Câu dài 07 |
| S269 | Tôi muốn cảm ơn mọi người. | Câu dài 07 |
| S270 | Nhắn tin cho mẹ giúp tôi. | Câu dài 07 |
| S271 | Tôi đồng ý phương án này. | Câu dài 08 |
| S272 | Tôi không đồng ý việc này. | Câu dài 08 |
| S273 | Cho tôi thêm thời gian nghĩ. | Câu dài 08 |
| S274 | Tôi muốn hỏi ý kiến bạn. | Câu dài 08 |
| S275 | Hẹn gặp bạn cuối tuần. | Câu dài 08 |
| S276 | Gửi tôi địa chỉ chính xác. | Câu dài 08 |
| S277 | Tôi hiểu rồi, cảm ơn bạn. | Câu dài 08 |
| S278 | Nói từng ý ngắn giúp tôi. | Câu dài 08 |
| S279 | Tôi muốn kết thúc ở đây. | Câu dài 08 |
| S280 | Chúc bạn một ngày nhẹ nhàng. | Câu dài 08 |

### LONG5. Câu dài - gia đình

| ID | Câu mẫu | Pack thu âm |
| --- | --- | --- |
| S281 | Gọi mẹ giúp tôi nói chuyện. | Câu dài 09 |
| S282 | Tôi muốn về nhà sớm. | Câu dài 09 |
| S283 | Ba ở đâu, kiểm tra giúp. | Câu dài 09 |
| S284 | Tôi vào phòng lấy áo khoác. | Câu dài 09 |
| S285 | Mở tivi nhỏ thôi nhé. | Câu dài 09 |
| S286 | Tắt tivi vì phòng hơi ồn. | Câu dài 09 |
| S287 | Dọn bàn sau khi ăn xong. | Câu dài 09 |
| S288 | Tôi muốn ra ban công ngồi. | Câu dài 09 |
| S289 | Kiểm tra máy giặt xong chưa. | Câu dài 09 |
| S290 | Tôi cần lấy chìa khóa. | Câu dài 09 |
| S291 | Khóa cửa trước khi đi ngủ. | Câu dài 10 |
| S292 | Tôi muốn gọi video tối nay. | Câu dài 10 |
| S293 | Món này ngon, tôi ăn thêm. | Câu dài 10 |
| S294 | Nhờ anh đưa tôi đi khám. | Câu dài 10 |
| S295 | Tìm giúp tôi ví màu đen. | Câu dài 10 |
| S296 | Tôi muốn sắp xếp góc làm. | Câu dài 10 |
| S297 | Nhà hơi bừa, dọn từng chút. | Câu dài 10 |
| S298 | Có chuông cửa, ra xem giúp. | Câu dài 10 |
| S299 | Đèn phòng ngủ hơi sáng. | Câu dài 10 |
| S300 | Tôi muốn cả nhà ăn cơm. | Câu dài 10 |

### LONG6. Câu dài - công việc

| ID | Câu mẫu | Pack thu âm |
| --- | --- | --- |
| S301 | Tôi cần gửi báo cáo sáng nay. | Câu dài 11 |
| S302 | Mở giúp tôi tài liệu họp. | Câu dài 11 |
| S303 | Tôi muốn xin nghỉ nửa ngày. | Câu dài 11 |
| S304 | Kiểm tra lại lịch họp tôi. | Câu dài 11 |
| S305 | Tôi cần thêm thời gian. | Câu dài 11 |
| S306 | Chia sẻ màn hình giúp tôi. | Câu dài 11 |
| S307 | Tôi vừa cập nhật tiến độ. | Câu dài 11 |
| S308 | Ưu tiên việc quan trọng trước. | Câu dài 11 |
| S309 | Tôi trả lời email sau họp. | Câu dài 11 |
| S310 | Máy tính của tôi chạy chậm. | Câu dài 11 |
| S311 | Ghi chú lại ý chính nhé. | Câu dài 12 |
| S312 | Tôi muốn gọi khách hàng. | Câu dài 12 |
| S313 | Bản trình bày cần sửa thêm. | Câu dài 12 |
| S314 | Tôi đã nộp bài đúng hạn. | Câu dài 12 |
| S315 | Mạng yếu thì gọi điện thoại. | Câu dài 12 |
| S316 | Tôi cần kiểm tra số liệu. | Câu dài 12 |
| S317 | Cuộc họp kéo dài hơn dự kiến. | Câu dài 12 |
| S318 | Tôi muốn làm việc yên tĩnh. | Câu dài 12 |
| S319 | Nhắc tôi gửi email xác nhận. | Câu dài 12 |
| S320 | Chúng ta chốt phương án này. | Câu dài 12 |

### LONG7. Câu dài - công nghệ

| ID | Câu mẫu | Pack thu âm |
| --- | --- | --- |
| S321 | Mở ứng dụng ghi âm giúp tôi. | Câu dài 13 |
| S322 | Tăng âm lượng để nghe rõ. | Câu dài 13 |
| S323 | Giảm âm lượng xuống một chút. | Câu dài 13 |
| S324 | Phát lại câu vừa rồi. | Câu dài 13 |
| S325 | Xóa nội dung tôi vừa nói. | Câu dài 13 |
| S326 | Lưu đoạn ghi âm này. | Câu dài 13 |
| S327 | Chuyển sang câu tiếp theo. | Câu dài 13 |
| S328 | Quay lại mục trước giúp tôi. | Câu dài 13 |
| S329 | Bật bluetooth kết nối tai nghe. | Câu dài 13 |
| S330 | Tắt nhạc khi tôi nói. | Câu dài 13 |
| S331 | Mở camera trước giúp tôi. | Câu dài 14 |
| S332 | Kiểm tra pin điện thoại. | Câu dài 14 |
| S333 | Tải lại trang bị treo. | Câu dài 14 |
| S334 | Tìm file ghi âm gần nhất. | Câu dài 14 |
| S335 | Tôi không đăng nhập được. | Câu dài 14 |
| S336 | Mật khẩu có vẻ không đúng. | Câu dài 14 |
| S337 | Ứng dụng treo, mở lại. | Câu dài 14 |
| S338 | Kết nối mạng hôm nay yếu. | Câu dài 14 |
| S339 | Micro không hoạt động ổn định. | Câu dài 14 |
| S340 | Tôi muốn gửi phản hồi. | Câu dài 14 |

### LONG8. Câu dài - di chuyển

| ID | Câu mẫu | Pack thu âm |
| --- | --- | --- |
| S341 | Tôi muốn đến trung tâm. | Câu dài 15 |
| S342 | Chỉ đường đến bệnh viện gần nhất. | Câu dài 15 |
| S343 | Đi thẳng thêm hai trăm mét. | Câu dài 15 |
| S344 | Rẽ trái ở ngã tư trước. | Câu dài 15 |
| S345 | Cho tôi xuống trạm tiếp theo. | Câu dài 15 |
| S346 | Tôi chờ xe trước cửa nhà. | Câu dài 15 |
| S347 | Xe này có qua sân bay không. | Câu dài 15 |
| S348 | Tôi cần đặt xe công nghệ. | Câu dài 15 |
| S349 | Đến công ty mất bao lâu. | Câu dài 15 |
| S350 | Hôm nay đường đông hơn. | Câu dài 15 |
| S351 | Tôi muốn tuyến đường nhanh nhất. | Câu dài 16 |
| S352 | Bãi đỗ ở tầng hầm phải không. | Câu dài 16 |
| S353 | Tôi quên mang vé xe buýt. | Câu dài 16 |
| S354 | Kiểm tra giờ khởi hành giúp tôi. | Câu dài 16 |
| S355 | Tôi tới nơi trong mười phút. | Câu dài 16 |
| S356 | Đường về nhà tối nay vắng. | Câu dài 16 |
| S357 | Tôi muốn xuống gần công viên. | Câu dài 16 |
| S358 | Chúng ta đi bộ thêm chút. | Câu dài 16 |
| S359 | Tôi đứng trước cửa hàng tiện lợi. | Câu dài 16 |
| S360 | Xe của tôi gần hết xăng. | Câu dài 16 |

### LONG9. Câu dài - cảm xúc

| ID | Câu mẫu | Pack thu âm |
| --- | --- | --- |
| S361 | Hôm nay tôi cảm thấy vui. | Câu dài 17 |
| S362 | Tôi hơi lo cuộc hẹn chiều. | Câu dài 17 |
| S363 | Nói nhẹ nhàng để tôi bình tĩnh. | Câu dài 17 |
| S364 | Tôi muốn ở một mình. | Câu dài 17 |
| S365 | Không gian ồn làm tôi khó chịu. | Câu dài 17 |
| S366 | Tôi căng thẳng, cần hít thở. | Câu dài 17 |
| S367 | Tôi biết ơn bạn đã giúp. | Câu dài 17 |
| S368 | Tôi tự tin hơn mỗi ngày. | Câu dài 17 |
| S369 | Bài tập này làm tôi thoải mái. | Câu dài 17 |
| S370 | Tôi không thích nói quá nhanh. | Câu dài 17 |
| S371 | Tôi muốn bắt đầu từ câu quen. | Câu dài 18 |
| S372 | Kết quả rõ làm tôi yên tâm. | Câu dài 18 |
| S373 | Tôi cần một ngày nhẹ nhàng. | Câu dài 18 |
| S374 | Tôi hơi bối rối hôm nay. | Câu dài 18 |
| S375 | Đừng vội, tôi cần thêm thời gian. | Câu dài 18 |
| S376 | Tôi vui vì app hiểu hơn. | Câu dài 18 |
| S377 | Tôi hơi buồn nhưng muốn luyện. | Câu dài 18 |
| S378 | Tâm trạng hôm nay khá ổn. | Câu dài 18 |
| S379 | Tôi muốn giữ tinh thần tích cực. | Câu dài 18 |
| S380 | Cảm ơn bạn đã lắng nghe. | Câu dài 18 |

### LONG10. Câu dài - khẩn cấp

| ID | Câu mẫu | Pack thu âm |
| --- | --- | --- |
| S381 | Tôi khó thở, gọi cấp cứu. | Câu dài 19 |
| S382 | Tôi bị ngã, không đứng được. | Câu dài 19 |
| S383 | Gọi người nhà giúp tôi ngay. | Câu dài 19 |
| S384 | Tôi đau hơn, cần kiểm tra. | Câu dài 19 |
| S385 | Ở lại đây với tôi. | Câu dài 19 |
| S386 | Mở cửa ngay để vào giúp. | Câu dài 19 |
| S387 | Đưa điện thoại để gọi người thân. | Câu dài 19 |
| S388 | Lấy thuốc khẩn cấp trong túi. | Câu dài 19 |
| S389 | Tôi không nói rõ được. | Câu dài 19 |
| S390 | Tôi lịm đi thì gọi bác sĩ. | Câu dài 19 |
| S391 | Đưa tôi đến bệnh viện gần nhất. | Câu dài 20 |
| S392 | Đừng để tôi ở một mình. | Câu dài 20 |
| S393 | Bật chuông báo cho mọi người. | Câu dài 20 |
| S394 | Kiểm tra tôi còn thở đều. | Câu dài 20 |
| S395 | Tôi hoảng, hãy nói chậm. | Câu dài 20 |
| S396 | Dọn vật cản dưới chân. | Câu dài 20 |
| S397 | Tôi cần xe lăn cạnh giường. | Câu dài 20 |
| S398 | Đừng nâng tôi quá nhanh. | Câu dài 20 |
| S399 | Gọi cấp cứu nếu đau không giảm. | Câu dài 20 |
| S400 | Mọi người bình tĩnh từng bước. | Câu dài 20 |


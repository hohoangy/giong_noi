const fs = require("fs");
const path = require("path");

const rootDir = path.join(__dirname, "..");

const groups = [
  {
    id: "SHORT1",
    name: "Câu ngắn - nhu cầu cơ bản",
    type: "short",
    items: [
      "uống nước",
      "ăn cơm",
      "đi vệ sinh",
      "nghỉ một chút",
      "đổi tư thế",
      "ngồi dậy",
      "nằm xuống",
      "mở cửa",
      "đóng cửa",
      "bật đèn",
      "tắt đèn",
      "mở quạt",
      "tắt quạt",
      "lấy áo",
      "lấy khăn",
      "lấy điện thoại",
      "giúp tôi",
      "đợi chút",
      "không sao",
      "cảm ơn"
    ]
  },
  {
    id: "SHORT2",
    name: "Câu ngắn - sức khỏe",
    type: "short",
    items: [
      "tôi đau",
      "đau đầu",
      "đau vai",
      "đau cổ",
      "đau lưng",
      "đau bụng",
      "hơi mệt",
      "rất mệt",
      "khó thở",
      "chóng mặt",
      "buồn nôn",
      "khát nước",
      "muốn ngủ",
      "uống thuốc",
      "gọi bác sĩ",
      "đo nhiệt độ",
      "kiểm tra huyết áp",
      "tôi ổn",
      "không ổn",
      "cần nghỉ"
    ]
  },
  {
    id: "SHORT3",
    name: "Câu ngắn - ăn uống",
    type: "short",
    items: [
      "ăn sáng",
      "ăn trưa",
      "ăn tối",
      "uống sữa",
      "uống trà",
      "uống cà phê",
      "thêm cơm",
      "thêm rau",
      "ít thôi",
      "nhiều quá",
      "không cay",
      "không mặn",
      "hơi nóng",
      "hơi lạnh",
      "đủ rồi",
      "no rồi",
      "đói quá",
      "hâm nóng",
      "lấy muỗng",
      "lấy đũa"
    ]
  },
  {
    id: "SHORT4",
    name: "Câu ngắn - giao tiếp",
    type: "short",
    items: [
      "xin chào",
      "chào bạn",
      "cảm ơn bạn",
      "xin lỗi",
      "được không",
      "ở đâu",
      "mấy giờ",
      "bao lâu",
      "nói lại",
      "nói chậm",
      "nghe rõ",
      "không nghe",
      "tôi hiểu",
      "chưa hiểu",
      "đúng rồi",
      "sai rồi",
      "đợi tôi",
      "gọi lại",
      "nhắn tin",
      "hẹn gặp"
    ]
  },
  {
    id: "SHORT5",
    name: "Câu ngắn - gia đình",
    type: "short",
    items: [
      "gọi mẹ",
      "gọi ba",
      "gọi anh",
      "gọi chị",
      "gọi em",
      "mẹ đâu",
      "ba đâu",
      "về nhà",
      "ở nhà",
      "ra ngoài",
      "vào phòng",
      "xuống bếp",
      "lên lầu",
      "mở tivi",
      "tắt tivi",
      "dọn bàn",
      "quét nhà",
      "giặt đồ",
      "phơi đồ",
      "khóa cửa"
    ]
  },
  {
    id: "SHORT6",
    name: "Câu ngắn - công việc",
    type: "short",
    items: [
      "đi làm",
      "họp nhóm",
      "gửi báo cáo",
      "mở tài liệu",
      "chia sẻ màn hình",
      "gửi email",
      "kiểm tra lịch",
      "đổi lịch",
      "xin nghỉ",
      "hoàn thành rồi",
      "cần thêm giờ",
      "bắt đầu họp",
      "kết thúc họp",
      "ghi chú lại",
      "xem giúp",
      "gọi khách",
      "trả lời sau",
      "ưu tiên việc này",
      "máy chậm",
      "mất mạng"
    ]
  },
  {
    id: "SHORT7",
    name: "Câu ngắn - công nghệ",
    type: "short",
    items: [
      "mở ứng dụng",
      "đóng ứng dụng",
      "tải lại",
      "lưu lại",
      "xóa nội dung",
      "phát lại",
      "tăng âm lượng",
      "giảm âm lượng",
      "bật bluetooth",
      "tắt bluetooth",
      "mở camera",
      "chụp ảnh",
      "gửi ảnh",
      "kiểm tra pin",
      "cắm sạc",
      "mở bản đồ",
      "tìm file",
      "đăng nhập",
      "quên mật khẩu",
      "báo lỗi"
    ]
  },
  {
    id: "SHORT8",
    name: "Câu ngắn - di chuyển",
    type: "short",
    items: [
      "đi thẳng",
      "rẽ trái",
      "rẽ phải",
      "dừng lại",
      "đi chậm",
      "đi nhanh",
      "chờ xe",
      "gọi xe",
      "xuống xe",
      "lên xe",
      "đến nơi",
      "bị lạc",
      "hỏi đường",
      "gần đây",
      "xa quá",
      "kẹt xe",
      "về công ty",
      "ra cổng",
      "vào nhà",
      "đợi ngoài cửa"
    ]
  },
  {
    id: "SHORT9",
    name: "Câu ngắn - cảm xúc",
    type: "short",
    items: [
      "tôi vui",
      "tôi buồn",
      "tôi lo",
      "tôi sợ",
      "tôi giận",
      "tôi ổn",
      "hơi căng thẳng",
      "rất thoải mái",
      "muốn yên tĩnh",
      "cần bình tĩnh",
      "khó chịu",
      "dễ chịu",
      "mệt quá",
      "vui hơn",
      "ổn hơn",
      "tự tin",
      "bối rối",
      "ngại quá",
      "không thích",
      "thích lắm"
    ]
  },
  {
    id: "SHORT10",
    name: "Câu ngắn - khẩn cấp",
    type: "short",
    items: [
      "giúp ngay",
      "gọi cấp cứu",
      "gọi người nhà",
      "khó thở quá",
      "đau nhiều",
      "ngã rồi",
      "không đứng được",
      "không nói được",
      "mở cửa ngay",
      "đưa thuốc",
      "đưa nước",
      "đưa điện thoại",
      "đừng đi",
      "ở lại đây",
      "bật chuông",
      "kiểm tra tôi",
      "đưa tôi đi",
      "cần xe ngay",
      "rất nguy hiểm",
      "bình tĩnh"
    ]
  },
  {
    id: "LONG1",
    name: "Câu dài - nhu cầu cơ bản",
    type: "long",
    items: [
      "Tôi muốn uống một ly nước lọc ngay bây giờ.",
      "Bạn giúp tôi đổi tư thế ngồi cho dễ chịu hơn.",
      "Tôi cần nằm xuống nghỉ khoảng mười phút.",
      "Làm ơn mở cửa sổ cho phòng thoáng hơn một chút.",
      "Bạn lấy giúp tôi điện thoại đang để trên bàn.",
      "Tôi muốn bật đèn trong phòng khách lên.",
      "Bạn tắt quạt giúp tôi vì tôi đang thấy lạnh.",
      "Tôi cần đi vệ sinh, bạn giúp tôi chuẩn bị nhé.",
      "Lấy giúp tôi cái khăn màu trắng ở gần giường.",
      "Tôi muốn ngồi dậy từ từ để đỡ chóng mặt.",
      "Bạn đóng cửa phòng lại giúp tôi một chút.",
      "Tôi cần thay áo vì áo này hơi ướt.",
      "Làm ơn kéo rèm cửa lại cho bớt nắng.",
      "Tôi muốn nghe lại câu vừa rồi một lần nữa.",
      "Bạn đợi tôi một chút trước khi chuyển việc khác.",
      "Tôi cần không gian yên tĩnh để nghỉ ngơi.",
      "Bạn đặt ly nước ở bên tay phải giúp tôi.",
      "Tôi muốn chuyển sang ghế khác cho thoải mái hơn.",
      "Làm ơn kiểm tra xem cửa trước đã khóa chưa.",
      "Tôi ổn rồi, cảm ơn bạn đã giúp tôi."
    ]
  },
  {
    id: "LONG2",
    name: "Câu dài - sức khỏe",
    type: "long",
    items: [
      "Hôm nay tôi thấy hơi đau đầu và cần nghỉ thêm.",
      "Tôi bị đau vai sau khi ngồi lâu một chỗ.",
      "Bạn giúp tôi lấy thuốc trong hộp màu xanh nhé.",
      "Tôi cảm thấy hơi khó thở, hãy gọi người nhà giúp tôi.",
      "Làm ơn đo nhiệt độ cho tôi trước khi uống thuốc.",
      "Tôi cần uống thuốc sau bữa ăn khoảng mười phút.",
      "Cổ họng tôi hơi khô, cho tôi uống nước ấm.",
      "Tôi thấy chóng mặt khi đứng dậy quá nhanh.",
      "Bạn kiểm tra huyết áp giúp tôi ngay bây giờ.",
      "Tôi không bị sốt nhưng cơ thể vẫn rất mệt.",
      "Tôi muốn đi bộ nhẹ trong nhà vài phút.",
      "Làm ơn gọi bác sĩ nếu tình trạng này kéo dài.",
      "Tôi cần nằm nghiêng sang bên trái một chút.",
      "Mắt tôi hơi mỏi vì nhìn màn hình quá lâu.",
      "Tôi muốn hít thở sâu và bình tĩnh lại.",
      "Bạn nhắc tôi uống thuốc đúng giờ tối nay.",
      "Tôi đang hồi phục tốt hơn so với hôm qua.",
      "Cơn đau bụng giảm rồi nhưng tôi vẫn cần theo dõi.",
      "Tôi muốn đặt lịch khám tổng quát trong tuần này.",
      "Nếu tôi khó thở hơn, hãy gọi cấp cứu ngay."
    ]
  },
  {
    id: "LONG3",
    name: "Câu dài - ăn uống",
    type: "long",
    items: [
      "Tôi muốn ăn cơm với một ít rau luộc.",
      "Bạn cho tôi thêm một chút nước canh nhé.",
      "Món này hơi mặn với tôi, cho tôi uống nước.",
      "Tôi không ăn cay nên bạn đừng thêm ớt.",
      "Làm ơn hâm nóng phần thức ăn này giúp tôi.",
      "Tôi muốn uống sữa ấm trước khi đi ngủ.",
      "Bạn lấy giúp tôi cái muỗng ở trong bếp.",
      "Tôi đã no rồi, không cần lấy thêm cơm.",
      "Bữa sáng hôm nay tôi muốn ăn nhẹ thôi.",
      "Bạn đặt bát cơm gần tay phải của tôi.",
      "Tôi muốn uống trà nóng nhưng đừng pha quá đậm.",
      "Món này hơi nóng, để nguội thêm một chút.",
      "Tôi cần ăn chậm hơn để không bị nghẹn.",
      "Cho tôi thêm rau nhưng đừng lấy quá nhiều.",
      "Tôi muốn thử món mềm và dễ nuốt hơn.",
      "Bạn giúp tôi cắt nhỏ thức ăn này nhé.",
      "Tôi cần uống nước trước rồi mới ăn tiếp.",
      "Tối nay tôi chỉ muốn ăn một phần nhỏ.",
      "Nếu còn canh nóng, cho tôi xin một ít.",
      "Tôi cảm ơn, bữa ăn hôm nay rất vừa miệng."
    ]
  },
  {
    id: "LONG4",
    name: "Câu dài - giao tiếp",
    type: "long",
    items: [
      "Xin chào, hôm nay bạn có khỏe không.",
      "Bạn nói chậm hơn một chút để tôi nghe rõ.",
      "Tôi chưa hiểu câu vừa rồi, bạn nhắc lại nhé.",
      "Cảm ơn bạn đã kiên nhẫn chờ tôi trả lời.",
      "Tôi muốn nói chuyện với bạn thêm vài phút.",
      "Bạn có thể gọi lại cho tôi vào buổi tối không.",
      "Tôi xin lỗi vì phản hồi hơi chậm hôm nay.",
      "Nếu bạn nghe không rõ, tôi sẽ nói lại lần nữa.",
      "Tôi muốn gửi lời cảm ơn đến mọi người.",
      "Bạn giúp tôi nhắn tin cho mẹ được không.",
      "Tôi đồng ý với phương án này, chúng ta làm nhé.",
      "Tôi không đồng ý, mình thử cách khác được không.",
      "Bạn cho tôi thêm thời gian để suy nghĩ.",
      "Tôi muốn hỏi ý kiến của bạn về việc này.",
      "Hẹn gặp bạn vào cuối tuần nếu bạn rảnh.",
      "Bạn gửi giúp tôi địa chỉ chính xác nhé.",
      "Tôi đã hiểu rồi, cảm ơn bạn giải thích.",
      "Làm ơn nói từng ý ngắn để tôi dễ theo dõi.",
      "Tôi muốn kết thúc cuộc nói chuyện ở đây.",
      "Chúc bạn có một ngày thật nhẹ nhàng."
    ]
  },
  {
    id: "LONG5",
    name: "Câu dài - gia đình",
    type: "long",
    items: [
      "Bạn gọi mẹ giúp tôi vì tôi muốn nói chuyện.",
      "Tôi muốn về nhà sớm hơn một chút hôm nay.",
      "Ba đang ở đâu, bạn kiểm tra giúp tôi nhé.",
      "Tôi cần vào phòng ngủ để lấy áo khoác.",
      "Mở tivi nhỏ thôi để tôi nghe tin tức.",
      "Tắt tivi giúp tôi vì phòng đang hơi ồn.",
      "Bạn giúp tôi dọn bàn sau khi ăn xong.",
      "Tôi muốn ra ban công ngồi khoảng năm phút.",
      "Làm ơn kiểm tra máy giặt đã chạy xong chưa.",
      "Tôi cần lấy chìa khóa đang để trên kệ.",
      "Bạn khóa cửa trước khi cả nhà đi ngủ nhé.",
      "Tôi muốn gọi video cho người thân tối nay.",
      "Mẹ nấu món này rất ngon, tôi muốn ăn thêm.",
      "Tôi cần nhờ anh đưa tôi đi khám.",
      "Bạn giúp tôi tìm cái ví màu đen.",
      "Tôi muốn sắp xếp lại góc làm việc trong phòng.",
      "Nhà hôm nay hơi bừa, mình dọn từng chút nhé.",
      "Tôi nghe tiếng chuông cửa, bạn ra xem giúp.",
      "Đèn phòng ngủ hơi sáng, bạn giảm xuống nhé.",
      "Tôi muốn cả nhà ăn cơm cùng nhau tối nay."
    ]
  },
  {
    id: "LONG6",
    name: "Câu dài - công việc",
    type: "long",
    items: [
      "Tôi cần gửi báo cáo trước mười giờ sáng.",
      "Bạn mở giúp tôi tài liệu cuộc họp hôm nay.",
      "Tôi muốn xin nghỉ nửa ngày vào thứ sáu.",
      "Làm ơn kiểm tra lại lịch họp của tôi.",
      "Tôi cần thêm thời gian để hoàn thành việc này.",
      "Bạn chia sẻ màn hình để tôi xem nội dung.",
      "Tôi vừa cập nhật tiến độ dự án xong.",
      "Chúng ta nên ưu tiên việc quan trọng trước.",
      "Tôi sẽ trả lời email này sau cuộc họp.",
      "Máy tính của tôi đang chạy chậm hơn bình thường.",
      "Bạn giúp tôi ghi chú lại ý chính nhé.",
      "Tôi muốn gọi khách hàng vào đầu giờ chiều.",
      "Bản trình bày này cần sửa thêm vài chỗ.",
      "Tôi đã nộp bài đúng hạn cho nhóm.",
      "Nếu mạng yếu, mình chuyển sang gọi điện thoại.",
      "Tôi cần kiểm tra lại số liệu trước khi gửi.",
      "Cuộc họp hôm nay kéo dài hơn dự kiến.",
      "Tôi muốn làm việc yên tĩnh trong một giờ.",
      "Bạn nhắc tôi gửi email xác nhận tối nay.",
      "Chúng ta chốt phương án này rồi triển khai."
    ]
  },
  {
    id: "LONG7",
    name: "Câu dài - công nghệ",
    type: "long",
    items: [
      "Mở ứng dụng ghi âm giúp tôi ngay bây giờ.",
      "Tăng âm lượng lên một chút để tôi nghe rõ.",
      "Giảm âm lượng xuống vì âm thanh hơi lớn.",
      "Phát lại câu vừa rồi để tôi kiểm tra.",
      "Xóa nội dung tôi vừa nói và bắt đầu lại.",
      "Lưu đoạn ghi âm này vào thư mục hôm nay.",
      "Chuyển sang câu tiếp theo trong danh sách.",
      "Quay lại mục trước để tôi thu âm lại.",
      "Bật bluetooth để kết nối với tai nghe.",
      "Tắt nhạc khi tôi bắt đầu nói câu mới.",
      "Mở camera trước để tôi chụp một tấm ảnh.",
      "Kiểm tra pin điện thoại giúp tôi một chút.",
      "Tải lại trang này nếu màn hình bị treo.",
      "Tìm file ghi âm gần nhất cho tôi.",
      "Tôi không đăng nhập được vào tài khoản.",
      "Mật khẩu của tôi có vẻ không chính xác.",
      "Ứng dụng đang bị treo, hãy thử mở lại.",
      "Kết nối mạng hôm nay yếu hơn bình thường.",
      "Micro của tôi không hoạt động ổn định.",
      "Tôi muốn gửi phản hồi cho bộ phận hỗ trợ."
    ]
  },
  {
    id: "LONG8",
    name: "Câu dài - di chuyển",
    type: "long",
    items: [
      "Tôi muốn đi đến trung tâm thành phố.",
      "Bạn chỉ đường giúp tôi đến bệnh viện gần nhất.",
      "Đi thẳng thêm khoảng hai trăm mét nữa.",
      "Rẽ trái ở ngã tư phía trước nhé.",
      "Cho tôi xuống ở trạm xe tiếp theo.",
      "Tôi đang chờ xe trước cửa nhà.",
      "Chuyến xe này có đi qua sân bay không.",
      "Tôi cần đặt một chuyến xe công nghệ.",
      "Từ đây đến công ty mất bao lâu.",
      "Hôm nay đường đông hơn bình thường.",
      "Tôi muốn chọn tuyến đường nhanh nhất.",
      "Bãi đỗ xe nằm ở tầng hầm phải không.",
      "Tôi quên mang theo vé xe buýt.",
      "Giúp tôi kiểm tra giờ khởi hành của chuyến xe.",
      "Tôi sẽ tới nơi trong mười phút nữa.",
      "Đường về nhà tối nay khá vắng.",
      "Tôi muốn xuống ở gần công viên.",
      "Chúng ta đi bộ thêm một đoạn ngắn nhé.",
      "Tôi đang đứng trước cửa hàng tiện lợi.",
      "Xe của tôi đang gần hết xăng."
    ]
  },
  {
    id: "LONG9",
    name: "Câu dài - cảm xúc",
    type: "long",
    items: [
      "Hôm nay tôi cảm thấy vui hơn hôm qua.",
      "Tôi hơi lo lắng về cuộc hẹn chiều nay.",
      "Bạn nói chuyện nhẹ nhàng để tôi bình tĩnh lại.",
      "Tôi muốn ở một mình trong vài phút.",
      "Không gian này hơi ồn nên tôi thấy khó chịu.",
      "Tôi đang căng thẳng và cần hít thở sâu.",
      "Tôi rất biết ơn vì bạn đã giúp tôi.",
      "Tôi cảm thấy tự tin hơn khi luyện mỗi ngày.",
      "Bài tập này làm tôi thấy thoải mái hơn.",
      "Tôi không thích cách nói quá nhanh.",
      "Tôi muốn bắt đầu từ những câu quen thuộc.",
      "Kết quả hiển thị rõ ràng làm tôi yên tâm.",
      "Tôi cần một ngày thật nhẹ nhàng hôm nay.",
      "Tôi thấy hơi bối rối khi có quá nhiều lựa chọn.",
      "Bạn đừng vội, tôi cần thêm thời gian.",
      "Tôi vui vì hệ thống hiểu giọng của tôi hơn.",
      "Tôi hơi buồn nhưng vẫn muốn luyện tiếp.",
      "Tâm trạng hôm nay của tôi khá ổn.",
      "Tôi muốn giữ tinh thần tích cực mỗi ngày.",
      "Cảm ơn bạn đã lắng nghe tôi chậm rãi."
    ]
  },
  {
    id: "LONG10",
    name: "Câu dài - khẩn cấp",
    type: "long",
    items: [
      "Tôi đang khó thở, hãy gọi cấp cứu ngay.",
      "Tôi bị ngã và không thể đứng dậy được.",
      "Gọi người nhà giúp tôi càng sớm càng tốt.",
      "Tôi đau nhiều hơn, cần kiểm tra ngay bây giờ.",
      "Bạn ở lại đây với tôi thêm một chút.",
      "Mở cửa ngay để người bên ngoài vào giúp.",
      "Đưa điện thoại cho tôi để gọi người thân.",
      "Làm ơn lấy thuốc khẩn cấp trong túi nhỏ.",
      "Tôi không nói rõ được, hãy nhìn ký hiệu của tôi.",
      "Nếu tôi lịm đi, hãy gọi bác sĩ ngay lập tức.",
      "Tôi cần được đưa đến bệnh viện gần nhất.",
      "Đừng để tôi ở một mình trong lúc này.",
      "Bật chuông báo để mọi người nghe thấy.",
      "Kiểm tra xem tôi còn thở đều không.",
      "Tôi đang rất hoảng, hãy nói chậm với tôi.",
      "Có vật cản dưới chân, hãy dọn ra giúp tôi.",
      "Tôi cần xe lăn ngay cạnh giường.",
      "Đừng nâng tôi lên quá nhanh, tôi đang chóng mặt.",
      "Hãy gọi cấp cứu nếu cơn đau không giảm.",
      "Mọi người bình tĩnh và làm từng bước nhé."
    ]
  }
];

const entries = [];

groups.forEach((group, groupIndex) => {
  group.items.forEach((text, itemIndex) => {
    const sentenceNumber = entries.length + 1;
    const id = `S${String(sentenceNumber).padStart(3, "0")}`;
    const isShort = group.type === "short";
    const typeEntries = entries.filter((entry) => entry.utteranceType === group.type);

    entries.push({
      id,
      originalId: `${group.id}-${String(itemIndex + 1).padStart(2, "0")}`,
      sentenceNumber,
      groupId: isShort ? "SHORT" : "LONG",
      groupNumber: isShort ? 1 : 2,
      groupName: isShort ? "Câu ngắn" : "Câu dài",
      partId: "A",
      categoryId: group.id,
      categoryName: group.name,
      positionInGroup: typeEntries.length + 1,
      positionInPart: typeEntries.length + 1,
      text,
      priority: true,
      utteranceType: group.type
    });
  });
});

const shortEntries = entries.filter((entry) => entry.utteranceType === "short");

fs.writeFileSync(
  path.join(rootDir, "month2-corpus.js"),
  `window.MONTH2_CORPUS = ${JSON.stringify(entries, null, 2)};\n\nwindow.SAMPLE_SENTENCES = window.MONTH2_CORPUS.map((entry) => entry.text);\n`,
  "utf8"
);

fs.writeFileSync(
  path.join(rootDir, "sample-sentences.js"),
  `window.SAMPLE_SENTENCES = ${JSON.stringify(entries.map((entry) => entry.text), null, 2)};\n`,
  "utf8"
);

fs.mkdirSync(path.join(rootDir, "data", "phrases"), { recursive: true });
fs.writeFileSync(
  path.join(rootDir, "data", "phrases", "phrases.json"),
  `${JSON.stringify(
    {
      version: 3,
      description: "Personal speech phrase dataset generated from the 200 short utterances.",
      phrases: shortEntries.map((entry) => ({
        id: entry.id.replace(/^S/, "P"),
        text: entry.text,
        priority: 3
      }))
    },
    null,
    2
  )}\n`,
  "utf8"
);

console.log(`Generated ${entries.length} corpus entries: ${shortEntries.length} short, ${entries.length - shortEntries.length} long.`);

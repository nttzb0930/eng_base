# Thiết kế chuẩn hóa 20 đặc tả Use Case trong báo cáo English Base

## Mục tiêu

Tạo một bản báo cáo Word mới dựa trên `English_Base_Bao_Cao_Do_An_Thuc_Te.docx`, trong đó mục 3.14 được viết lại thành 20 đặc tả Use Case thống nhất, đúng bản chất nghiệp vụ và có thể truy vết tới source hiện tại. Bản gốc được giữ nguyên để đối chiếu.

File đầu ra dự kiến là `English_Base_Bao_Cao_Do_An_UseCase_ChuanHoa.docx`. Một bản PDF kiểm tra có thể được tạo trong quá trình rà soát bố cục, nhưng Word là sản phẩm bàn giao chính.

## Phạm vi

Giữ nguyên nội dung các chương khác, sơ đồ Use Case và hệ thống đánh số hiện có nếu không có mâu thuẫn trực tiếp. Viết lại toàn bộ 20 Use Case trong mục 3.14; cập nhật mục lục, tham chiếu hình/bảng, ngắt trang và số trang bị ảnh hưởng bởi phần nội dung mới.

Không bổ sung tính năng chưa tồn tại trong source. Không xem module nội bộ, database hoặc capability như một actor. Actor là người dùng hoặc hệ thống bên ngoài có tương tác quan sát được với English Base.

## Danh mục Use Case

Giữ bộ mã UC01–UC20 hiện có để tránh làm hỏng tham chiếu chéo:

| ID | Tên Use Case | Actor chính |
|---|---|---|
| UC01 | Đăng ký tài khoản | Khách |
| UC02 | Xác thực email | Khách/Người học |
| UC03 | Đăng nhập | Khách |
| UC04 | Khôi phục mật khẩu | Khách |
| UC05 | Thực hiện bài kiểm tra đầu vào | Người học |
| UC06 | Khám phá và truy cập khóa học | Người học |
| UC07 | Thực hiện bài học và thử thách | Người học |
| UC08 | Lưu và quản lý từ vựng | Người học |
| UC09 | Luyện từ bằng flashcard và ôn tập | Người học |
| UC10 | Thực hiện bài luyện tập | Người học |
| UC11 | Làm bài đọc hiểu | Người học |
| UC12 | Luyện TOEIC Listening | Người học |
| UC13 | Luyện TOEIC Reading | Người học |
| UC14 | Luyện TOEIC Grammar | Người học |
| UC15 | Luyện TOEIC Dictation | Người học |
| UC16 | Xem bảng điều khiển và tiến độ | Người học |
| UC17 | Xem bảng xếp hạng | Người học |
| UC18 | Quản lý khóa học | Quản trị viên |
| UC19 | Quản lý bài đọc và nội dung | Quản trị viên |
| UC20 | Quản lý người dùng và thiết lập | Quản trị viên |

Tên tiếng Việt được ưu tiên trong nội dung báo cáo; thuật ngữ tiếng Anh chỉ giữ khi đó là tên sản phẩm, chuẩn kỹ thuật hoặc nhãn giao diện thực tế.

## Mẫu đặc tả bắt buộc

Mỗi Use Case bắt đầu bằng một bảng thông tin có đủ các trường sau:

| Trường | Yêu cầu nội dung |
|---|---|
| Use Case Name | Tên mục tiêu nghiệp vụ, dùng động từ và đối tượng |
| Use Case ID | Mã ổn định UC01–UC20 |
| Use Case Description | Tóm tắt tương tác và giá trị actor nhận được |
| Actor | Actor chính; actor phụ chỉ xuất hiện nếu là hệ thống bên ngoài |
| Priority | Cao, Trung bình hoặc Thấp, có căn cứ theo giá trị và phụ thuộc nghiệp vụ |
| Trigger | Sự kiện quan sát được khởi phát Use Case |
| Pre-Condition | Trạng thái phải đúng trước khi bắt đầu |
| Post-Condition | Trạng thái hệ thống có thể kiểm chứng sau khi thành công |

Sau bảng thông tin là các tiểu mục theo đúng thứ tự:

1. Luồng chính.
2. Luồng thay thế.
3. Luồng ngoại lệ.
4. Quy tắc nghiệp vụ.
5. Dữ liệu vào và dữ liệu ra.
6. Truy vết triển khai.

## Quy tắc viết luồng

Luồng chính được trình bày bằng bảng ba cột gồm số bước, hành động của Actor và phản hồi của hệ thống. Mỗi bước mô tả một tương tác quan sát được; không biến các chi tiết nội bộ như gọi mapper hoặc mở transaction thành một bước nghiệp vụ độc lập.

Luồng thay thế ghi mã theo bước gốc, chẳng hạn `A3.1`, và kết thúc bằng vị trí quay lại luồng chính hoặc trạng thái hoàn thành riêng. Luồng ngoại lệ ghi mã `E2.1`, mô tả lỗi, thông báo/phản hồi của hệ thống và trạng thái dữ liệu sau lỗi. Không dùng một đoạn văn chung áp dụng máy móc cho cả 20 Use Case.

Pre-Condition không chứa hành động diễn ra bên trong Use Case. Post-Condition mô tả trạng thái cuối có thể kiểm chứng, không chỉ ghi “Use Case hoàn tất”. Trigger khác với Pre-Condition: trigger là sự kiện bắt đầu, còn pre-condition là trạng thái đã tồn tại trước sự kiện đó.

## Priority

Mức Cao dành cho hành trình thiết yếu để truy cập hệ thống, học tập cốt lõi, bảo toàn tiến độ hoặc quản trị nội dung bắt buộc. Mức Trung bình dành cho hành trình bổ trợ có giá trị rõ nhưng không chặn toàn bộ sản phẩm. Mức Thấp chỉ dùng cho tiện ích không ảnh hưởng hành trình chính. Việc gán mức ưu tiên phải nhất quán giữa 20 Use Case và không dựa vào độ khó triển khai.

## Actor và ranh giới hệ thống

Các actor người dùng gồm Khách, Người học và Quản trị viên. Dịch vụ thư điện tử có thể là actor phụ trong luồng gửi mã nếu source thực sự tích hợp dịch vụ bên ngoài. Những tên như Courses, Progress, Vocabulary, Reading, Practice, Dashboard và TOEIC là capability nội bộ nên được mô tả trong phần truy vết, không đặt vào trường Actor.

Database, Prisma, controller, use case class và giao diện Web/Admin đều nằm trong ranh giới English Base. Chúng không phải actor của sơ đồ hay đặc tả nghiệp vụ.

## Truy vết tới source

Phần truy vết của từng Use Case ghi ngắn gọn các bằng chứng hiện có: route giao diện, endpoint HTTP, controller/use case hoặc service sở hữu hành vi, model/bảng dữ liệu chính và test liên quan. Đường dẫn phải tồn tại ở phiên bản source được đối chiếu. Nội dung không khẳng định workflow dữ liệu đã chạy chỉ vì schema hoặc source catalog tồn tại.

Chi tiết triển khai được đặt sau luồng nghiệp vụ để không làm loãng đặc tả. Đoạn code chỉ được giữ nếu minh họa trực tiếp một quy tắc quan trọng; không sao chép code dài vào từng Use Case.

## Định dạng Word

Mỗi Use Case sử dụng cùng hệ thống heading và bảng. Header của bảng có nền màu nhất quán, hàng không bị tách tùy tiện qua trang, tiêu đề Use Case được giữ cùng bảng thông tin theo sau. Luồng chính ưu tiên nằm liền mạch; nếu bảng dài qua trang thì lặp lại hàng tiêu đề.

Tài liệu phải cập nhật mục lục tự động, số bảng/hình và tham chiếu chéo. Không ghi đè file nguồn. File mới được xuất ra thư mục Downloads theo tên đã thống nhất sau khi được cấp quyền ghi ngoài workspace.

## Kiểm tra và tiêu chí nghiệm thu

Quá trình kiểm tra phải xác nhận đủ UC01–UC20, không trùng hoặc thiếu mã. Mỗi Use Case phải có đủ tám trường thông tin và sáu tiểu mục bắt buộc. Không còn module nội bộ trong trường Actor. Mỗi luồng chính có tối thiểu một hành động Actor và một phản hồi hệ thống; luồng thay thế và ngoại lệ phải gắn với bước cụ thể khi có thể.

Kiểm tra tự động sẽ đối chiếu heading, bảng, trường bắt buộc, đường dẫn source và các cụm từ cấm/placeholder. Sau đó tài liệu được render sang PDF hoặc ảnh trang để kiểm tra bảng tràn lề, hàng bị cắt, tiêu đề mồ côi, chú thích sai trang và mục lục chưa cập nhật.

Nghiệm thu đạt khi file Word mới mở bình thường, mục 3.14 chứa đủ 20 đặc tả theo mẫu, nội dung phù hợp source, bố cục đọc được và file báo cáo gốc không thay đổi.

## Rủi ro và kiểm soát

Rủi ro lớn nhất là mô tả rộng hơn chức năng thực tế. Việc này được kiểm soát bằng truy vết source cho từng Use Case và diễn đạt rõ giới hạn dữ liệu. Rủi ro thứ hai là tài liệu tăng nhiều trang và làm vỡ bố cục; công cụ sinh Word phải áp dụng quy tắc giữ heading với bảng, lặp header và render toàn bộ tài liệu trước bàn giao. Rủi ro cuối là nội dung lặp máy móc; mỗi trigger, điều kiện, luồng và ngoại lệ phải được viết riêng theo hành trình nghiệp vụ.

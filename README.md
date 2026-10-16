# PawCare Frontend

## Nạp dữ liệu giả để trải nghiệm 4 vai trò

1. Chạy `npm start` trong `my-app` (PowerShell có thể dùng `npm.cmd start`). Đăng nhập Admin `admin@admin / 123456`, hoặc tài khoản Admin hiện có của bạn.
2. Mở `/admin/dashboard`, chọn **Nạp dữ liệu demo**, đọc lưu ý và tick xác nhận. Không có seed tự động khi tải trang.
3. Chọn tiếp **Bổ sung dữ liệu demo V2** và xác nhận. Nếu bạn đã nạp V1 trước đó, chỉ cần bước này; không xóa localStorage hay nạp lại V1. Bản bổ sung giữ nguyên dữ liệu bạn đã sửa.
4. Đăng xuất qua avatar và đăng nhập tài khoản bên dưới. Trang đăng nhập có mục **Tài khoản trải nghiệm dữ liệu mẫu** để điền nhanh; bạn vẫn phải bấm Đăng nhập.

| Vai trò | Email | Mật khẩu | Bắt đầu thử |
|---|---|---|---|
| Admin | `admin@admin` | `123456` (nếu chưa đổi) | `/admin/dashboard` |
| Khách hàng | `demo.customer@pawcare.vn` | `123456` | `/portal/pets` |
| Lễ tân | `demo.reception@pawcare.vn` | `123456` | `/reception/intake` |
| Bác sĩ | `demo.vet@pawcare.vn` | `123456` | `/vet/today` |

Bộ mẫu V1 + V2 bổ sung **14 tài khoản** (8 CUSTOMER, 4 VETERINARIAN, 2 RECEPTIONIST), **1 khách trực tiếp không có tài khoản**, **12 pet**, **4 phòng**, **7 dịch vụ**, **7 thuốc/lô**, **31 lịch hẹn**, **21 hồ sơ khám** (20 COMPLETED, 1 IN_PROGRESS), **16 hóa đơn**, **26 lịch/mũi tiêm**, **6 hồ sơ nhân sự**, thông báo và nhật ký có nhãn DEMO. Số trên là số fixture đã thêm, không phải tổng nguồn có sẵn hoặc thông báo tự sinh sau đó. Tài khoản Admin có sẵn được giữ nguyên, không tạo lại hay đổi mật khẩu. Khách thứ 8 và lễ tân thứ 2 có trạng thái INACTIVE để thử màn quản lý/khóa, không thể đăng nhập. Các tài khoản khác có email `demo.customer2…7@pawcare.vn`, `demo.vet2…4@pawcare.vn` và cùng mật khẩu `123456` lúc khởi tạo.

- Khách chính có Milo/Luna, lịch chờ/xác nhận/hủy, hồ sơ khám đã chốt, đơn thuốc, lịch tiêm quá ngày/hôm nay và hóa đơn chưa trả/trả một phần/đã trả. Khách `demo.customer2@pawcare.vn` có Bông/Lucky để xem hóa đơn hủy; `demo.customer5@pawcare.vn` có Bắp và hóa đơn hoàn tiền. Ngày sinh/hẹn/khám/tiêm/hạn lô tính theo ngày Việt Nam lúc nạp; **không chạy lại seed khi ngày thay đổi**, để giữ các chỉnh sửa của bạn.
- Bác sĩ: **hoàn tất hồ sơ Luna đang khám trước**, sau đó mở ca Milo đã tiếp nhận để thử bắt đầu khám, ghi triệu chứng/chẩn đoán, kê đơn/chỉ định. Milo có ba số đo trong ba hồ sơ hoàn tất để xem biểu đồ cân nặng. Hồ sơ bác sĩ khác không vào danh sách ca của bạn, nhưng lịch sử sức khỏe công khai của pet được phân công vẫn đọc được.
- Lễ tân: lọc yêu cầu PENDING, đối chiếu đúng chủ/pet rồi phân công bác sĩ/phòng; các tài nguyên có ca IN_PROGRESS vẫn bị giữ bận theo guard hiện có. Có các hồ sơ hoàn tất chưa có hóa đơn để thử lập hóa đơn và thu tiền demo. Giá/tổng/thanh toán được tính từ snapshot/ledger, không hard-code KPI.
- Admin: `/admin/staff` hiển thị hồ sơ nhân viên/bác sĩ mẫu, chuyên môn, kinh nghiệm, thông tin chuyên môn và ghi chú ca; tìm/lọc vai trò/trạng thái/phân trang, link về trang Người dùng để sửa/khóa tài khoản. Hồ sơ nhân sự chỉ đọc, không xác nhận bằng cấp hay phân ca thật. Danh mục thuốc có tồn thấp, hết hạn và sắp hết hạn. Nhật ký V2 đủ các loại thao tác/nhóm hiện hỗ trợ, nhãn `[DEMO V2]` không phải thao tác thật đã diễn ra.
- `/admin/reports`: tổng hợp từ nguồn đang lưu, gồm hóa đơn, lần khám đã chốt, thú cưng hiện tại, lịch hẹn theo trạng thái và dòng dịch vụ đã tính tiền; giữ thống kê khách mới/danh mục/kho/audit. Giá trị hóa đơn và dịch vụ theo ngày lập (bỏ hóa đơn hủy), tiền thu/hoàn theo ngày giao dịch kể cả hóa đơn lập ngoài kỳ, thu ròng có thể âm. Còn phải thu là dư hiện tại của hóa đơn lập trong kỳ. Không phân bổ khoản hoàn vào từng dịch vụ hoặc gọi giá trị hóa đơn là lợi nhuận/doanh thu kế toán. Biểu đồ và bảng cùng nguồn, lọc ngày theo giờ Việt Nam.
- V2 có 6 tình huống khám khác nhau, đơn 0–2 dòng, kết quả xét nghiệm/hình ảnh, chỉ định hoàn tất/chờ/hủy, thuốc mẫu đã cấp/chưa cấp, 5 hóa đơn mới đủ trạng thái và một hồ sơ chưa có hóa đơn cho lễ tân. Khách chính Milo/Luna xem được cả 5 trạng thái hóa đơn.
- `/portal/notifications`: danh sách đúng chủ nuôi, tìm/lọc loại và đã/chưa đọc, phân trang, đánh dấu đã đọc có persistence. Ngoài fixture, thao tác đặt/xác nhận/tiếp nhận/đổi/hủy lịch, chốt khám, lập hóa đơn và thu tiền tạo thông báo demo cục bộ; nháp khám không tạo thông báo. Khi mở khu vực khách hàng, lịch tiêm PLANNED đến hạn trong 30 ngày hoặc quá hạn và đề nghị tái khám từ hồ sơ COMPLETED gần nhất của mỗi pet ACTIVE tạo nhắc nhở một lần theo entity/ngày; làm mới mỗi phút khi layout còn mở. Tôn trọng lựa chọn nhận nhắc lịch. Link kiểm tra quyền và nguồn hiện tại, không lộ ghi chú nội bộ; nguồn thông báo lỗi/quota báo cảnh báo mà không hoàn tác nghiệp vụ đã lưu. **Không gửi email/SMS, không tự tư vấn, đặt lịch, xác nhận tiêm hoặc kê đơn.**

Mọi dữ liệu lâm sàng, hướng dẫn thuốc, kết quả và giao dịch trong bộ mẫu là **giả, chỉ để kiểm thử**, không dùng điều trị hoặc làm chứng từ thật. Invoice chỉ tính SERVICE COMPLETED/MEDICINE DISPENSED; V2 có snapshot cấp thuốc giả trong các ca lịch sử, không coi kê đơn mới là thuốc đã cấp và không trừ kho khi nạp. Tồn kho là snapshot mẫu, chưa có inventory transaction/FEFO hoặc giao diện cấp thuốc thực tế.

### Bảo toàn dữ liệu và giới hạn

`features/demo/buildDemoDataset.js` và `buildDemoExtension.js` là fixture factory xác định, không dùng random. `demoRepository` được ADMIN ACTIVE bảo vệ, thêm namespace `demo-v1-…`/`demo-v2-…` vào các store chung; không ghi đè record, không đổi phiên đăng nhập/draft/theme. Marker `pawcare_demo_dataset_v1` ngăn nạp trùng từng bản, `revision: 2` đánh dấu bổ sung đã hoàn tất. V2 đọc ID/tên/giá hiện tại, không thay dữ liệu V1, users/pets/kho; thiếu dependency hoặc trùng slot lịch sử sẽ dừng để đối chiếu. Mỗi lần nạp có rollback riêng, không coi hai lần xác nhận là một giao dịch atomic. Page không import fixture trực tiếp.

Nguồn lỗi JSON/sai root/thiếu-trùng ID, mã/email/điện thoại demo xung đột hoặc marker lỗi sẽ dừng trước khi ghi. Nếu quota thất bại giữa chừng, adapter khôi phục các key đã thay đổi theo snapshot trước thao tác và báo lỗi; rollback vẫn best-effort, không phải giao dịch backend/cross-tab. Không có nút xóa/reset toàn bộ dữ liệu. Muốn thử bộ mới với ngày hiện tại, dùng profile trình duyệt riêng hoặc cửa sổ riêng tư, đăng nhập Admin rồi nạp lại trong profile đó; không xóa dữ liệu trình duyệt đang dùng.

Kiểm tra: `npm test -- --watchAll=false --runInBand`, `npm run build`, `node scripts/preview-demo.cjs`. Preview dùng Chrome profile tạm, nạp V1/V2 và login qua UI thật, kiểm tra trang 4 vai trò/nhân sự/báo cáo thu chi ở 375/768/1280 px, modal focus, light/dark, biểu đồ cân nặng, notification/read/deep-link, reload không seed trùng và page/dialog không tràn ngang. Không can thiệp dữ liệu Chrome của bạn. Giữ CRA/JavaScript/localStorage, không thêm thư viện, chưa TS/MSW/backend authorization.

## Giao diện Admin theo template TailAdmin

- Áp dụng chung cho Tổng quan, Người dùng, Dịch vụ, Thuốc và các dialog: nền navy `#101828`, điểm nhấn xanh `#465fff`, card bo góc, border mảnh, bảng/form dễ đọc hơn.
- Mặc định giao diện tối như template được cung cấp. Nút mặt trời/mặt trăng trên header chuyển sáng/tối, ghi nhớ tại `pawcare_admin_theme_v1`. Chỉ đặt `data-theme` trên AdminLayout, không đổi theme Home/Auth/Customer.
- Phông Outfit variable WOFF2 được lưu tại `src/assets/fonts/`, không cần CDN để chạy Admin; ký tự không có trong phông dùng Arial fallback. Giấy phép OFL đi kèm tại `public/licenses/OFL-Outfit.txt` và được sao chép vào bản build.
- Header cố định khi cuộn, ô tìm kiếm có viền/focus ring theo mẫu và tìm trang quản trị theo tên không dấu; menu responsive đóng bằng Escape. Dashboard hiển thị biểu đồ vai trò từ dữ liệu tài khoản thực tế và các liên kết truy cập nhanh.
- Giữ nguyên repository, phân quyền và các thao tác quản lý đã xây dựng; không thêm dữ liệu doanh thu CRM giả từ template.

Nguồn palette/phông tham khảo: [stylesheet chính thức TailAdmin](https://github.com/TailAdmin/free-react-tailwind-admin-dashboard/blob/main/src/index.css).
Đây là thiết kế áp dụng lại trong CSS hiện có của PawCare, không đưa Alpine/bundle.js hoặc toàn bộ template vào dự án.

Kiểm tra toàn bộ giao diện: `node scripts/preview-admin.cjs dashboard users services medicines`.
Script kiểm tra hai theme ở 375/768/1280 px, header sticky khi cuộn, menu mobile, font nội bộ, dialog editor và lô hàng; ảnh nằm trong thư mục tạm.

## Lễ tân: quản lý khách hàng và thú cưng

Đăng nhập `reception@pawcare.vn / 123456` để vào `/reception/customers`. Sidebar và dropdown avatar có năm mục dành riêng cho RECEPTIONIST: tiếp nhận, lịch hẹn, hóa đơn, khách hàng và thú cưng.

- `/reception/customers`: tìm tên/số điện thoại/email không dấu, lọc có tài khoản/khách vãng lai, phân trang; xem chi tiết và thêm/sửa họ tên, điện thoại, email, địa chỉ.
- `/reception/customers/:customerId`: thông tin liên hệ, trạng thái tài khoản chỉ đọc, các pet đang quản lý/đã lưu trữ; thêm pet với chủ nuôi được liên kết sẵn.
- `/reception/pets`: tìm tên/mã hồ sơ/mã chip/tên chủ/số điện thoại, lọc loài/trạng thái, phân trang; thêm, sửa, lưu trữ và khôi phục. `/reception/pets/:petId` hiển thị thông tin nhận diện, chủ nuôi, ảnh, tuổi/cân nặng, dị ứng và lưu ý chăm sóc. Những thông tin này do chủ nuôi cung cấp, không phải chẩn đoán của bác sĩ.
- Khách có tài khoản được đọc bằng projection contact từ repository accounts; sửa hồ sơ giữ nguyên ID, vai trò, trạng thái và mật khẩu, đồng bộ với portal khách hàng. Email/điện thoại của những khách này cũng là thông tin đăng nhập, được ghi rõ trong form. Không cấp quyền quản lý tài khoản, đổi mật khẩu hay khóa tài khoản cho lễ tân.
- Khách vãng lai lưu riêng tại `pawcare_customer_profiles_v1`, ID `walkin-…`, không có mật khẩu hoặc tài khoản tự động. Email có thể để trống, điện thoại bắt buộc. Chặn điện thoại/email trùng giữa hồ sơ vãng lai và tất cả tài khoản, kể cả khi tạo/sửa tài khoản qua các chức năng cũ. Chưa có luồng liên kết/claim hồ sơ vãng lai thành tài khoản; cần backend contract trước khi triển khai luồng đó.
- Pet dùng chung `pawcare_pets_v1`, liên kết bằng `ownerId`; chỉ chọn chủ khi tạo, không chuyển chủ của hồ sơ đã có vì còn liên kết lịch khám/hóa đơn. Lưu trữ/khôi phục không xóa dữ liệu; khách hàng vẫn chỉ xem/sửa đúng pet của mình. Form cập nhật và xác nhận trạng thái kiểm tra revision khi ghi, khóa submit, lỗi quota giữ form; có xác nhận bỏ thay đổi và cảnh báo đóng tab, chưa có blocker Back của SPA.
- Route và repository đều yêu cầu RECEPTIONIST ACTIVE từ tài khoản hiện tại. DTO lễ tân không trả mật khẩu/tài khoản nhân viên hoặc trường clinical nội bộ. Thao tác hồ sơ khách hàng/pet ghi đúng người thực hiện là lễ tân trong nhật ký Admin; không ghi thông tin liên hệ/ảnh/nội dung sức khỏe.
- `ReceptionLayout` dùng lại token/component console hiện tại: Outfit nội bộ, xanh #465fff và theme sáng/tối, sidebar/header/footer, menu mobile và Escape/focus. Lựa chọn theme riêng tại `pawcare_reception_theme_v1`, không đổi theme Admin/Home. Loading/empty/error/retry và đồng bộ sự kiện/storage/đổi tab/mỗi phút được hỗ trợ.

Code tách `pages/Reception`, `features/reception` (profile storage/schema/repository/hook/editors), `components/reception` và `styles/reception.css`; dùng lại Modal, form ảnh/pet, pagination, icons và theme hook. Giữ CRA/JavaScript theo dự án hiện tại, không thêm dependencies.

Đây vẫn là demo localStorage, không phải bảo mật server hoặc giao dịch atomic giữa tab. Lễ tân không được kê đơn hoặc ghi hồ sơ lâm sàng; bác sĩ có khu vực khám riêng bên dưới. Báo cáo khách mới chỉ đếm tài khoản CUSTOMER (không đếm hồ sơ vãng lai); báo cáo lịch/khám/hóa đơn có cả dữ liệu vãng lai liên kết hợp lệ. Chưa có timeline riêng cho hồ sơ khách vãng lai.

Kiểm tra: `npm test -- --watchAll=false --runInBand`, `npm run build`, `node scripts/preview-reception.cjs`. Preview dùng Chrome profile tạm riêng ở 320/375/768/1024/1280 px, thực hiện thêm khách/trùng điện thoại/thêm pet đúng chủ/sửa/reload/lưu trữ/khôi phục, hai theme, dropdown Header, menu và kiểm tra tràn ngang/focus. Không thay dữ liệu trong profile Chrome của người dùng.

## Lễ tân: tiếp nhận, lịch hẹn, hóa đơn và thanh toán

Dùng tài khoản `reception@pawcare.vn / 123456`, chọn chức năng trên sidebar hoặc menu avatar. Giữ ReceptionLayout, phông Outfit, xanh #465fff, theme riêng sáng/tối, header/footer và responsive của console hiện có.

- `/reception/intake`: ba tab lịch đã xác nhận, yêu cầu online và hàng đợi; tìm mã/pet/chủ/điện thoại, lọc ngày/bác sĩ/nguồn và phân trang. Xác nhận yêu cầu `PENDING → CONFIRMED`, sau đó đối chiếu chủ, pet, dị ứng do chủ cung cấp, bác sĩ/phòng và checklist để `CONFIRMED → CHECKED_IN` cho lịch hôm nay. Tiếp nhận khách trực tiếp tạo `WALK_IN/CHECKED_IN`; có liên kết mở form khách/pet hiện có ở tab mới, đồng bộ khi quay lại. Queue ưu tiên rồi giờ đến, hiển thị thời gian chờ; không bắt đầu khám hoặc tạo kết quả/hóa đơn tự động.
- `/reception/appointments`: danh sách mọi trạng thái, tìm/lọc/phân trang; tạo lịch tại quầy, sửa giờ/lý do/phân công lịch PENDING/CONFIRMED; sửa PENDING đồng thời xác nhận. Hủy cần lý do, giữ lịch sử; đánh dấu NO_SHOW chỉ với CONFIRMED đã quá 30 phút. Pet phải ACTIVE và đúng chủ, bác sĩ/phòng đang hoạt động. Chặn trùng pet và phân công vet/phòng theo khoảng demo 30 phút; lượt IN_PROGRESS giữ tài nguyên bận. Các form giữ version ban đầu, từ chối dữ liệu cũ và khóa gửi lặp.
- `/reception/invoices`: danh sách, tìm chủ/pet/mã/điện thoại, lọc ngày/trạng thái, phân trang, tổng còn phải thu/đã thu ròng; chọn hồ sơ khám COMPLETED có khoản hợp lệ để lập hóa đơn. SERVICE chỉ tính COMPLETED, MEDICINE chỉ tính DISPENSED; giữ quantity/unitPrice từ nguồn, không lấy giá danh mục hiện tại hoặc coi kê đơn là cấp thuốc. Một lượt khám không được lập trùng hóa đơn đang hiệu lực.
- `/reception/invoices/:invoiceId`: xem dòng dịch vụ/thuốc, tổng tiền, lịch sử thanh toán; ghi nhận một phần/toàn bộ bằng tiền mặt/chuyển khoản/thẻ/khác (đều demo), số tiền và ghi chú. Bắt buộc đối chiếu, chặn số tiền sai/vượt dư, form cũ và mã ghi nhận lặp; trạng thái cập nhật theo ledger, khách hàng thấy cùng hóa đơn qua portal. In HTML/CSS A4, ẩn điều hướng và chuyển màu sáng; không phải hóa đơn điện tử hợp pháp hay xác nhận giao dịch ngân hàng.

Code mới chia `features/intake` và `features/billing` thành policy/repository/hook/components; page ở `pages/Reception`. Dùng lại Modal, pagination, InvoiceDetail và các adapter đã có; không thêm thư viện hoặc đổi CRA/JavaScript. Route và repository đều kiểm tra tài khoản RECEPTIONIST ACTIVE; Customer vẫn có ownership guard. Audit ghi mã/thao tác đúng lễ tân, không ghi ghi chú sức khỏe hoặc nội dung thu ngân. DTO Customer không lộ ghi chú tiếp nhận hay người thực hiện nội bộ.

Hợp đồng dữ liệu cục bộ:

- Lịch dùng chung `pawcare_appointments_v1` / `pawcare:appointments-changed`; thêm assignedDoctorId/Name, roomId/Name, priority, intakeNote, confirmedAt/By và checkedInAt/By. Không tạo store lịch thứ hai.
- Phòng đọc `pawcare_rooms_v1` / `pawcare:rooms-changed`; khi chưa có nguồn dùng hai phòng ghi rõ `(demo)`, không tự ghi store. Khi có nguồn chỉ nhận phòng ACTIVE. Chưa có ca trực/availability API hoặc transaction server: kiểm tra tài nguyên cục bộ không thay thế bảo đảm đặt lịch thực tế.
- Nguồn tính tiền là `pawcare_medical_records_v1` có status COMPLETED, ownerId/petId và examinedAt hợp lệ, với `billableItems` snapshot theo schema items của hóa đơn. Hồ sơ cũ chỉ được dùng giá khám từ appointmentId trỏ đúng lịch COMPLETED cùng chủ/pet nếu có; thiếu nguồn thì không tạo khoản thu. Lễ tân không được đánh dấu hoàn tất khám để tự phát sinh hóa đơn.
- Hóa đơn/thanh toán ghi `pawcare_invoices_v1` / `pawcare:invoices-changed`, giữ hợp đồng reader Customer hiện có. Thêm visitId/version và metadata người lập/thu; ghi chú thanh toán không được chiếu ra portal Customer. Không ghi giảm kho, hoàn tiền, thuế/chiết khấu giả hoặc giao dịch bên ngoài.

Nguồn clinical/billing ban đầu trống nếu chưa nạp demo hoặc thực hiện khám. Bác sĩ hoàn tất khám tạo khoản khám theo giá snapshot để lễ tân lập hóa đơn; Admin có nút nạp fixture rõ nhãn và xác nhận ở đầu README. Báo cáo đọc ledger và thông báo demo tự sinh sau thao tác đã lưu. Chưa có giao diện cấp thuốc, backend/API/MSW hoặc cổng thanh toán. Cảnh báo bỏ thay đổi/đóng tab có trong form, chưa chặn Back SPA.

Kiểm tra: `npm test -- --watchAll=false --runInBand`, `npm run build`, `node scripts/preview-reception.cjs --workflow`. Workflow preview dùng Chrome profile riêng ở 320/375/768/1024/1280 px, kiểm tra xác nhận/check-in/queue ưu tiên, lịch tại quầy/sửa/hủy, nguồn trống và fixture hoàn tất, lập hóa đơn/thanh toán một phần/toàn bộ/reload/chặn vượt dư, hai theme, focus/tràn ngang và PDF A4. Chạy thêm preview Reception mặc định, Customer và Admin để kiểm tra hồi quy.

## Bác sĩ thú y: lịch khám, điều trị và lịch sử sức khỏe

Đăng nhập `vet@pawcare.vn / 123456` (Trần Minh Khang) hoặc `ngoc@pawcare.vn / 123456` (Vũ Bảo Ngọc). Login chuyển `/vet/today`; avatar Home/Profile và sidebar có bảy mục: **Thực hiện khám bệnh**, **Quản lý lịch khám**, **Lập hồ sơ khám**, **Triệu chứng & chẩn đoán**, **Kê đơn thuốc**, **Chỉ định dịch vụ**, **Lịch sử sức khỏe**. Lễ tân cần gán đúng bác sĩ và tiếp nhận trước khi bác sĩ bắt đầu khám. Không tự seed lịch/hồ sơ lâm sàng; bác sĩ chưa được phân ca có trạng thái trống.

- `/vet/appointments`: chỉ các lịch được phân công cho tài khoản hiện tại; tìm mã/pet/chủ/điện thoại, lọc ngày/trạng thái/nguồn, phân trang, xem chi tiết và tiến trình xác nhận/tiếp nhận/bắt đầu/hoàn tất. Có thao tác mở ca, tiếp tục khám hoặc xem hồ sơ theo trạng thái. Bác sĩ không tự đổi giờ, đổi phân công, tiếp nhận hoặc hủy lịch của lễ tân.
- `/vet/today`: KPI lịch hôm nay, ca còn chờ và đang khám; tiếp tục ca đang khám trước, sau đó queue ưu tiên/giờ check-in, thời gian chờ cập nhật mỗi phút. Không bỏ sót ca đang mở từ ngày khác, có nhãn đối chiếu lễ tân. Hiện dị ứng do chủ nuôi cung cấp, chủ/pet/phòng và lý do khám.
- `/vet/records`: danh sách hồ sơ đúng bác sĩ, KPI nháp/hoàn tất/ca chờ; tìm mã hồ sơ/lịch/thú cưng/chủ nuôi, lọc thú cưng/trạng thái/ngày cập nhật và phân trang. **Lập hồ sơ khám mới** cho chọn ca đủ điều kiện, đối chiếu rồi xác nhận bắt đầu tại `/vet/records/:appointmentId`. Chọn ca chưa tạo hồ sơ; một lượt chỉ dùng một record. Mã `MR-…` được derive từ ID, ổn định cho cả hồ sơ cũ, không tạo store hay migration riêng.
- `/vet/diagnoses`: tìm/lọc triệu chứng và chẩn đoán; phân biệt chưa ghi, đánh giá sơ bộ, chẩn đoán đang soạn, đã chốt và chưa xác định. `/vet/diagnoses/:appointmentId` dùng lại editor và writer của hồ sơ, có nút chuyển tab/focus nhanh tới triệu chứng hoặc chẩn đoán; hồ sơ hoàn tất chỉ xem. Nháp không được công bố thành kết quả cuối, danh sách không chứa ghi chú nội bộ.
- `/vet/health-history` và `/vet/health-history/:petId`: danh sách thú cưng có lịch phân công đúng bác sĩ/owner/pet (kể cả đã lưu trữ), tìm tên/chip/chủ/điện thoại, lọc trạng thái/phân trang. Dòng thời gian chỉ đọc theo thú cưng gồm lần khám đã hoàn tất, kết quả, đơn thuốc, chỉ định, tiêm phòng và lịch hẹn; tabs/counts, tìm kiếm, lọc ngày theo múi giờ phòng khám, kiểm tra khoảng sai và phân trang query URL. Chi tiết xem qua dialog có focus; trạng thái dự kiến/quá ngày/đã tiêm/hủy phân biệt rõ. Lịch chưa khám vẫn thấy hồ sơ sức khỏe trống, không tự tạo bệnh án.
- Lịch sử thú cưng được phân công có thể gồm hồ sơ COMPLETED của bác sĩ khác/nguồn cũ không có appointmentId, đúng owner/pet. Nháp và doctorOnlyNotes/intakeNote/giá nhập/credential không có trong DTO; lịch hẹn chỉ của bác sĩ hiện tại. Chỉ link tới editor hồ sơ nếu lượt vẫn thuộc bác sĩ hiện tại, không mở URL ca bác sĩ khác. Kết quả/thuốc luôn gắn với record gốc; thời gian kết quả/đơn theo lần khám khi nguồn thiếu thời điểm riêng, tiêm dự kiến chỉ hiện ngày không tự đặt giờ.
- Cân nặng lấy từ số đo trong các lần khám COMPLETED, không lấy cân nặng khai báo của pet hoặc tự điền số đo thiếu. Bảng/biểu đồ theo khoảng ngày đang lọc, tối đa 20 số đo gần nhất; chỉ dựng biểu đồ khi có ít nhất 3 thời điểm đo khác nhau, luôn có bảng để đọc số chính xác. Ngày tái khám từ lần khám gần nhất chỉ là đề nghị, không tạo lịch hoặc đánh giá sức khỏe tự động; khu vực khách hàng có nhắc nhở demo cho đề nghị đến/quá hạn. Link từ tab Lịch sử khám mở dòng thời gian đầy đủ.
- `/vet/prescriptions` và `/vet/prescriptions/:appointmentId`: chọn hồ sơ được phân công, tìm thuốc trong danh mục ACTIVE; thêm/xóa dòng, tự nhập liều dùng/tần suất/thời gian/số lượng/hướng dẫn. Đối chiếu dị ứng rồi xác nhận lưu; kiểm tra trùng thuốc, số lượng nguyên dương và nội dung bắt buộc. Lưu `prescriptions` trong record chung, không tạo store kê đơn thứ hai; không tự tính liều, giảm tồn kho hoặc thêm khoản thu. Customer chỉ thấy đơn sau khi bác sĩ hoàn tất khám.
- `/vet/service-orders` và `/vet/service-orders/:appointmentId`: chọn hồ sơ và dịch vụ ACTIVE, xem nhóm/yêu cầu kết quả, nhập số lượng/ghi chú và xem dự kiến không phải hóa đơn. Xác nhận lưu `serviceOrders` với trạng thái ORDERED, ID/bác sĩ/thời điểm/giá snapshot từ nguồn chuẩn. Giá danh mục thay đổi trước lần lưu mới bị chặn để chọn lại; chỉ định cũ giữ giá gốc. Hủy chỉ định đã lưu chuyển CANCELLED, không xóa lịch sử; không tự thực hiện/hoàn tất hoặc nhập kết quả. Chỉ định đang thực hiện/hoàn tất/hủy chỉ xem trong editor này. Đơn/chỉ định dùng chung version record và version lịch, hồ sơ COMPLETED chỉ đọc.
- Hai editor dùng chung `ClinicalPlanPage`, `ClinicalPlanEditor`, policy/repository/hook; link tắt ở tab Chẩn đoán & điều trị. Cần lưu nháp lâm sàng trước khi chuyển màn. Nháp đơn/chỉ định giữ cục bộ trong sessionStorage riêng theo bác sĩ/lượt/loại, có khôi phục và xác nhận nháp cũ, không tự ghi đè nháp lỗi; cảnh báo click link/đóng tab. Đây không phải autosave server; cần xác nhận lưu vào hồ sơ. Back SPA không bị chặn, đóng hẳn tab có thể mất nháp cục bộ.
- `/vet/examinations/:appointmentId`: PetSummary/chủ nuôi/cảnh báo dị ứng luôn ngoài tab; thông tin cân nặng hồ sơ không thay số đo thực tế. Chỉ `CHECKED_IN` đúng bác sĩ, pet ACTIVE và phân phòng hợp lệ mới được xác nhận bắt đầu; tạo một medical record IN_PROGRESS và đổi lịch tương ứng. Chặn lượt đang khám khác dùng cùng bác sĩ/pet/phòng.
- Form chia Khám lâm sàng, Chẩn đoán & điều trị, Lịch sử khám. Nhập lý do/triệu chứng, số đo tùy chọn weight/temperature/heartRate/respiratoryRate, kết quả thăm khám, đánh giá sơ bộ, chẩn đoán cuối hoặc lý do chưa xác định, kế hoạch điều trị, dặn dò công khai, ghi chú nội bộ và ngày tái khám tùy chọn. Không tính chẩn đoán tự động; giới hạn nhập số chỉ là kiểm tra dữ liệu, không biểu diễn khoảng bình thường y khoa.
- Lưu nháp hồ sơ giữ IN_PROGRESS, Customer chưa thấy kết quả. Form tự giữ bản nháp sessionStorage theo bác sĩ/lượt, có timestamp, nút khôi phục khi tải lại; bản nháp cũ cần xác nhận đối chiếu, bản nháp lỗi không tự ghi đè. Lưu thành công xóa bản nháp cục bộ. Đây không phải autosave server: cần bấm **Lưu nháp hồ sơ** để ghi nguồn dùng chung. Cảnh báo đóng tab và click link nội bộ khi bẩn; Back SPA không bị chặn nhưng bản nháp vẫn được giữ trong tab. Đóng hẳn tab có thể mất sessionStorage.
- **Hoàn tất khám** yêu cầu nội dung tối thiểu và xác nhận, ghi đồng bộ lịch/record COMPLETED rồi chỉ đọc, không sửa lại hồ sơ đã chốt. Customer thấy chẩn đoán/kế hoạch điều trị/dặn dò trong lịch sử, không thấy doctorOnlyNotes hay nháp. Lễ tân thấy khoản SERVICE/COMPLETED cho phí khám, giữ estimatedPrice từ lịch; thiếu giá thì không tự đoán khoản thu. Không lập hóa đơn/thu tiền tự động hoặc thêm thuốc.

Code ở `features/examinations` (policy/repository/hook/editor), `features/healthHistory` (read-only policy/repository/hook/timeline/detail/weight UI), `pages/Veterinarian`, `components/veterinarian`, `styles/veterinarian.css`. Medical-record/vaccine projection thuần dùng chung với Customer, không gọi reader bằng tài khoản chủ nuôi. `StaffLayout` dùng chung sidebar/header/footer/theme với ReceptionLayout/VeterinarianLayout; Outfit/xanh #465fff, theme bác sĩ riêng `pawcare_vet_theme_v1`. Route và repository đều yêu cầu VETERINARIAN ACTIVE, đối chiếu assignedDoctorId và cặp owner/pet từ nguồn chuẩn. Mở URL ca bác sĩ khác bị từ chối; contact/pet reader cũng không cấp quyền xem toàn bộ hồ sơ. Audit chỉ ghi mã lượt/thao tác/bác sĩ, không clinical payload.

Nguồn dùng chung `pawcare_appointments_v1` và `pawcare_medical_records_v1`, phát các event cũ để các khu vực cập nhật. Record thêm appointmentId/doctorId/version/startedAt/updatedAt/completedAt/examinedAt, các field form; mới bắt đầu có results/prescriptions rỗng, serviceOrders cũ thiếu field được xem như rỗng. Writer đơn/chỉ định chỉ sửa mảng tương ứng, giữ clinical fields và arrays khác; hoàn tất khám giữ đơn/chỉ định, billableItems hiện chỉ gồm phí khám thực hiện. Writer whitelist field, giữ định danh/quan hệ/giá từ nguồn, recheck cả version lịch và record; khóa submit và giữ form khi lỗi. Hộp xác nhận bắt đầu giữ version lúc mở, không dùng version mới một cách im lặng nếu lễ tân thay đổi lịch. Reader từ chối quan hệ hoặc trạng thái lịch/hồ sơ lệch, không tự sửa nguồn lỗi. Ghi hai store có rollback best-effort khi quota lỗi, không thay thế transaction server hoặc chống race/crash giữa tab.

Chưa có API/MSW/backend authorization, ca trực thực, thực hiện dịch vụ/nhập kết quả xét nghiệm, cấp thuốc/dispense/vaccine hoặc tự đặt lịch tái khám. Đã có thông báo và nhắc nhở demo cục bộ, không gửi email/SMS. Kê đơn/chỉ định và fixture lịch sử chỉ minh họa, không đại diện nghiệp vụ lâm sàng hay giao dịch kho thật. Không cập nhật cân nặng khai báo của pet từ số đo khám. Giữ CRA/JavaScript, không migration TypeScript hoặc thêm dependency.

Kiểm tra: `npm test -- --watchAll=false --runInBand`, `npm run build`, `node scripts/preview-vet.cjs`. Chrome profile riêng ở 320/375/768/1024/1280 px kiểm tra nguồn trống/lịch đúng bác sĩ/detail/chọn ca/lập một hồ sơ/mã MR/nháp/reload/khôi phục/lưu/chẩn đoán đang soạn và đã chốt/tìm kiếm/focus nhanh/hoàn tất/read-only; thêm picker/form/validate/xác nhận lưu đơn thuốc và chỉ định, không giảm kho/tự thu tiền, giá snapshot, Customer xem đơn đã chốt và không lộ ghi chú nội bộ; hai theme/mobile menu/focus/tràn ngang, fixture chỉ trong profile tạm. Unit/integration còn kiểm tra trùng thuốc/dịch vụ, source/draft lỗi, hồ sơ chốt, đổi giá/conflict, luồng thực walk-in → khám → lịch sử → lập hóa đơn → thanh toán và rollback quota. Chạy preview Reception khi sửa layout chung để kiểm tra hồi quy.

Preview Vet còn kiểm tra menu/lựa chọn thú cưng sức khỏe, timeline/tabs/chẩn đoán/đơn/kết quả, vaccine dự kiến và đã tiêm, biểu đồ/bảng cân nặng, tìm kiếm/khoảng ngày sai và modal/focus/privacy. Dữ liệu lịch sử/vaccine trong preview chỉ được tạo ở profile Chrome tạm riêng, không nhập vào UI hoặc dữ liệu người dùng. Dùng `node scripts/preview-vet.cjs --quick` để kiểm tra nhanh 375/1280 px; mặc định vẫn chạy đủ năm kích thước. Health reader dùng nguồn medical/vaccine chung, không có writer hoặc tự sửa/migration dữ liệu sai.

## Header và menu tài khoản

- Header dùng chung của Home và khu vực cá nhân giữ gam kem–cam, phông chữ hiện tại; tài khoản đã đăng nhập dùng avatar chữ cái tên thay cho các nút tài khoản rời rạc.
- Bấm avatar để xem tên/email/vai trò, mở **Thông tin cá nhân** hoặc **Đăng xuất**. `/portal/profile` dành cho mọi tài khoản đã đăng nhập; cập nhật hồ sơ không đổi vai trò/trạng thái tài khoản.
- Khách hàng có **Thú cưng của tôi** ở thanh điều hướng và trong dropdown, dẫn đến `/portal/pets`. Admin có **Trang quản trị** trong dropdown; không hiển thị chức năng thú cưng dành riêng cho khách hàng.
- Khách hàng có thêm **Đặt lịch khám**, **Lịch hẹn của tôi**, **Lịch sử khám bệnh** trong dropdown và thanh điều hướng khu vực cá nhân. Nút Đặt lịch của Header và CTA Home dẫn đến luồng đặt lịch thật trong bản demo (khách chưa đăng nhập được chuyển qua login).
- Các mục **Lịch tiêm phòng**, **Đơn thuốc**, **Hóa đơn** cũng có trong cả hai menu. Danh sách menu được quản lý chung tại `constants/customerNavigation.js`, tránh lệch đường dẫn giữa Header và khu vực khách hàng.
- Dropdown đóng khi bấm ra ngoài, chuyển focus ra ngoài, chuyển trang hoặc nhấn Escape (trả focus về avatar). Avatar luôn hiện trên mobile; menu điều hướng và dropdown không mở đồng thời.
- Component tài khoản tách tại `components/layout/AccountMenu.js`, dùng chung AuthContext. Header riêng trong AdminLayout không thay đổi trong task này.

## Tài khoản demo

- Vai trò: Quản trị viên
- Tài khoản: `admin@admin`
- Mật khẩu: `123456`
- Sau khi đăng nhập, truy cập `/admin/dashboard` hoặc `/admin/users` để quản lý tài khoản.

Tài khoản khách hàng mẫu: `customer@pawcare.vn / 123456`, quản lý hồ sơ tại `/portal/profile`, thú cưng tại `/portal/pets`.
Tài khoản nhân viên mẫu: `vet@pawcare.vn / 123456` (bác sĩ), `reception@pawcare.vn / 123456` (lễ tân).

## Quản lý tài khoản và người dùng

- `/admin/dashboard`: số lượng tài khoản theo trạng thái, vai trò và các tài khoản mới nhất.
- `/admin/users`: tìm tên/email/điện thoại, lọc vai trò/trạng thái, phân trang, tạo/sửa tài khoản, đổi mật khẩu và khóa/mở khóa.
- Tài khoản đăng ký hoặc được Admin tạo có thể đăng nhập lại bằng email hoặc số điện thoại.
- Không xóa cứng người dùng. Khóa tài khoản giữ nguyên hồ sơ và chặn đăng nhập.
- Không được khóa hoặc đổi vai trò Admin đang đăng nhập. Khách hàng mở URL Admin sẽ nhận trang 403.
- Phiên mặc định lưu trong sessionStorage; chọn “Ghi nhớ đăng nhập” để dùng localStorage.

Mã nguồn được chia thành `layouts/AdminLayout.js`, `pages/Admin/`, `components/admin/` và `features/users/`.
Trang gọi hook `useUsers`, hook gọi repository. Dữ liệu được lưu tại khóa `pawcare_users_v1` trong localStorage.
Repository là adapter cục bộ cho bản demo; API/MSW sẽ thay thế adapter khi thực hiện migration kiến trúc.

Kiểm tra: `npm test -- --watchAll=false`, `npm run build`.
Kiểm tra giao diện bản build bằng Chrome trên Windows: `node scripts/preview-admin.cjs` (Node 22 trở lên).
Script kiểm tra độ rộng 375/768/1280 px, hộp thoại và focus bàn phím, lưu ảnh vào thư mục tạm.
Có thể đặt biến `CHROME_BIN` nếu Chrome được cài ở đường dẫn khác.

Tài khoản, phiên đăng nhập và hồ sơ hiện là mock client-side, không phải cơ chế xác thực production.

## Admin: quản lý dịch vụ và thuốc

- `/admin/services`: tìm mã/tên không dấu, lọc nhóm/trạng thái, phân trang, thêm/sửa/ngừng/kích hoạt dịch vụ; quản lý giá VND, loại dịch vụ, yêu cầu kết quả và cho phép đính kèm.
- `/admin/medicines`: quản lý mã/tên, nhóm thuốc, đơn vị, giá bán và ngưỡng tồn; tìm kiếm, lọc và phân trang. Chọn **Lô hàng** để xem số lô, hạn sử dụng, số lượng nhập/còn lại, giá nhập và nhập lô mới.
- Tồn tổng = tổng số lượng còn lại trong các lô. Tồn có thể dùng loại trừ lô đã hết hạn. Cảnh báo tồn thấp dùng tồn có thể dùng, sắp hết hạn tính trong 30 ngày (bao gồm hôm nay và ngày thứ 30, múi giờ Việt Nam).
- Mã danh mục phải duy nhất; số lô duy nhất trong từng thuốc. Không cho nhập lô quá hạn, số lượng không nguyên/dương hoặc thuốc ngừng sử dụng. Thuốc đã có lô không được đổi đơn vị.
- Không xóa cứng danh mục/lô. Chưa triển khai kê đơn, xuất kho FEFO, điều chỉnh/hủy tồn hay hóa đơn; nhập lô không đồng nghĩa xuất thuốc.
- Cả route lẫn repository kiểm tra ADMIN đang hoạt động. Đây là kiểm tra client-side cho demo, cần backend authorization khi triển khai thật.

Mã chung tại `features/catalog/`; nghiệp vụ tại `features/services/` và `features/medicines/`; trang tại `pages/Admin/`, dùng chung `AdminLayout`, bảng, bộ lọc, phân trang, form và dialog.
Dữ liệu demo lưu riêng trong localStorage: `pawcare_services_v1`, `pawcare_medicines_v1`; thuốc và lô cùng một snapshot để cập nhật nhất quán. Chưa đồng bộ danh mục này với nội dung tĩnh ở Home.

Kiểm tra giao diện hai trang: `node scripts/preview-admin.cjs services medicines`.
Script kiểm tra 375/768/1280 px, dialog tạo danh mục và dialog lô hàng (không tràn ngang, focus bàn phím); ảnh lưu vào thư mục tạm.

## Admin: hoạt động hệ thống và báo cáo

- `/admin/activity`: kiểm tra tình trạng đọc bốn nguồn dữ liệu cục bộ; nhật ký thao tác thành công, tìm kiếm không dấu, lọc chức năng/thao tác/ngày, phân trang và xem chi tiết. Không hiển thị trạng thái máy chủ/API giả.
- Nhật ký ghi đăng nhập/đăng xuất, đăng ký/cập nhật hồ sơ, tạo/sửa/khóa tài khoản, tạo/sửa/ngừng dịch vụ hoặc thuốc và nhập lô. Thao tác bị từ chối/validation hoặc đăng nhập thất bại chưa được ghi. Không tạo lịch sử giả cho dữ liệu mẫu có từ trước.
- Mỗi sự kiện chỉ lưu thời gian, người thực hiện (ID/tên/vai trò), loại thao tác, đối tượng (ID/tên) và tên các trường danh mục đã đổi. Không lưu mật khẩu, email/điện thoại, nội dung hồ sơ, giá trị trước/sau hoặc payload phiên đăng nhập. Chỉ tên trường `password` được ghi nhận khi quản trị viên đổi mật khẩu, không ghi giá trị.
- Lưu tối đa 2.000 sự kiện gần nhất tại `pawcare_audit_v1`. Khi ghi nhật ký lỗi, thao tác dữ liệu đã thành công không bị báo thất bại; hai trang mới cảnh báo việc ghi nhật ký trong phiên hiện tại. Nhật ký hỏng không bị ghi đè tự động. Đây là best-effort localStorage, không phải nhật ký bất biến/đầy đủ hoặc giao dịch server; production cần backend audit và phân quyền server.
- `/admin/reports`: trong kỳ gồm khách hàng mới (vai trò hiện tại, ngày tạo), số lô nhập, chi phí nhập và thao tác đã lưu. Biểu đồ và bảng dùng chung số liệu theo ngày; khoảng trên 63 ngày gộp theo tháng và vẫn cắt đúng biên kỳ. Chi phí nhập = số lượng nhập × giá nhập, **không phải doanh thu/lợi nhuận**.
- Phần hiện tại gồm tài khoản hoạt động/phân bổ vai trò, dịch vụ đang dùng theo nhóm và khoảng giá danh mục, thuốc đang dùng, giá trị tồn chưa hết hạn theo giá nhập, cảnh báo tồn thấp/sắp hết hạn/hết hạn. Không cộng số lượng tồn của các đơn vị khác nhau; giá trị tồn gồm cả thuốc ngừng dùng, tồn hết hạn tách riêng.
- Bộ lọc ngày dùng `?from=YYYY-MM-DD&to=YYYY-MM-DD`, bao gồm cả hai biên theo `Asia/Ho_Chi_Minh`, kiểm tra ngày sai/thứ tự sai; báo cáo tối đa 366 ngày và mặc định 30 ngày. Bộ lọc chỉ thay số liệu **trong kỳ**; tồn kho/vai trò/danh mục **hiện tại** không đổi theo kỳ. Dữ liệu tự cập nhật khi có thao tác, thay đổi tab/storage, mỗi phút hoặc nhấn **Làm mới**.
- Báo cáo đã nối nguồn lịch hẹn/medical records/pets/invoices: số lần khám hoàn tất, lịch theo trạng thái, tổng hóa đơn/thu/hoàn/dư và dịch vụ trên hóa đơn. Thú cưng là tổng snapshot hiện tại, chưa thống kê pet mới theo ngày tạo. Dữ liệu demo không phải chứng từ, doanh thu kế toán hay lợi nhuận. Không đồng bộ với nội dung tĩnh Home; nhật ký giới hạn lưu trữ nên không phải toàn bộ lịch sử hệ thống.

Tách code tại `features/activity/` (writer + reader có guard ADMIN), `features/reports/` (date policy, report builder, chart/kho), `features/admin/useAdminInsights` (đọc/đồng bộ nguồn), các filter/pagination dùng chung tại `components/admin/`. Hai route dùng `AdminLayout`, menu/tìm trang chung, Outfit và theme sáng/tối hiện tại. Không thêm thư viện chart hoặc thay đổi Home.

Kiểm tra: `npm test -- --watchAll=false --runInBand`, `npm run build`, `node scripts/preview-admin.cjs activity reports`.
Script preview dùng hồ sơ Chrome tạm riêng và fixture nhật ký trong trình duyệt kiểm thử; ứng dụng chỉ thêm nhật ký fixture khi Admin xác nhận nạp demo, không tự seed.

## Khách hàng: quản lý thông tin thú cưng

Đăng nhập bằng tài khoản khách hàng (demo: `customer@pawcare.vn / 123456`), chọn **Thú cưng của tôi** trên Header hoặc trong dropdown avatar. Tài khoản Admin không truy cập chức năng này; khách mới bắt đầu với danh sách trống và có thể thêm hồ sơ riêng.

- `/portal/pets`: danh sách dạng card, tổng hồ sơ/đang quản lý/đã lưu trữ, tìm kiếm tên/giống/mã chip không dấu, lọc loài/trạng thái, phân trang 6 hồ sơ và làm mới. Header/footer dùng chung với Home; navigation Customer dùng chung giữa thông tin cá nhân và thú cưng.
- `/portal/pets/:petId`: hồ sơ chi tiết theo đúng chủ nuôi, gồm thông tin cơ bản, tuổi theo ngày sinh, cân nặng khai báo, dị ứng/ghi chú và trạng thái lưu trữ; có đường dẫn đặt lịch và xem lịch sử khám. Thông tin chủ nuôi khai báo không được coi là xác nhận hoặc hồ sơ khám của bác sĩ; chưa có timeline lâm sàng trực tiếp trên trang thú cưng.
- Form thêm/sửa: tên, loài (chó/mèo/thỏ/chim/khác), giống, giới tính, ngày sinh hoặc ngày sinh ước tính, cân nặng, màu lông, mã chip, đã triệt sản, dị ứng, ghi chú và ảnh đại diện. Tên/loài bắt buộc; ngày sinh không ở tương lai, cân nặng tùy chọn từ 0,01–500 kg/tối đa 2 số thập phân; tên tối đa 60, giống/màu/chip tối đa 80 và ghi chú/dị ứng tối đa 1.000 ký tự. Mã chip không được trùng nếu đã nhập; không ép tên thú cưng phải duy nhất.
- Ảnh JPG/PNG/WebP tối đa 2 MB được đọc, thu nhỏ tối đa 800 px và nén phía trình duyệt (WebP, PNG fallback) để lưu bản demo; có preview, bỏ ảnh và lỗi loại/kích thước/ảnh hỏng. Không hotlink ảnh người dùng, không nhận SVG/URL tùy ý; không phải upload server. Avatar mặc định theo loài; ảnh mẫu tái sử dụng assets nội bộ từ Home.
- Lưu trữ/khôi phục có xác nhận, không xóa cứng. Hồ sơ đã lưu trữ vẫn xem được qua URL của chính chủ, không sửa cho đến khi khôi phục. Form hỏi xác nhận khi Hủy/đóng/Escape nếu đã thay đổi và cảnh báo `beforeunload` khi đóng tab/reload; chưa có blocker cho Back của SPA. Có khóa chống double submit, revision check khi lưu form cũ bị chỉnh sửa ở tab khác và lỗi quota không báo thành công/ghi đè dữ liệu đã lưu.
- Route và repository đều kiểm tra CUSTOMER đang hoạt động, reader/mutation đều lọc `ownerId` từ tài khoản, không tin `ownerId/status/id` trong payload form. Khách khác sửa URL được báo không tìm thấy và không lộ hồ sơ. Đây là mock client-side, cần backend authorization khi triển khai thật.
- Dữ liệu tại `pawcare_pets_v1`, đồng bộ khi repository phát sự kiện/storage/đổi tab. Chỉ tài khoản mẫu `customer@pawcare.vn / 123456` có 2 hồ sơ mẫu Bô/Bella được gắn nhãn; khách mới/khách khác bắt đầu danh sách trống. Dữ liệu hỏng không bị seed ghi đè tự động.
- Thêm/sửa/lưu trữ/khôi phục pet ghi metadata tối thiểu vào nhật ký Admin (module Thú cưng), không ghi ảnh, cân nặng, mã chip, dị ứng hoặc nội dung ghi chú. Không tự thêm KPI thú cưng vào báo cáo Admin trong task giao diện Customer này.
- Sau khi thêm thành công, bộ lọc được đặt lại và quay về trang đầu để thấy ngay hồ sơ mới. Form sửa giữ phiên bản của hồ sơ tại lúc mở: nếu có cập nhật ở tab khác, không ghi đè; đóng rồi mở lại form để lấy thông tin mới. Nếu lưu thất bại, giữ nguyên nội dung form để thử lại.

Mã nghiệp vụ/schema/hook và editor/card/status dialog ở `features/pets/`, avatar/icon/navigation ở `components/customer/`, pages ở `pages/Customer/`, CSS tách `customer.css` (shell chung) và `pets.css` (trang/modal). Modal dùng lại primitive chung với variant Customer; giao diện vẫn giữ kem–cam/hồng, DM Sans/Space Grotesk, không đổi theme Admin hoặc Home.

Kiểm tra: `npm test -- --watchAll=false --runInBand`, `npm run build`, `node scripts/preview-customer.cjs`.
Preview dùng Chrome profile tạm ở 320/375/768/1024/1280 px để kiểm tra Pets/Detail/Profile, header/footer, dropdown tài khoản, đường dẫn thú cưng trong menu mobile, Escape/focus, ảnh local, upload/canvas preview thật, xác nhận bỏ thay đổi và tràn ngang. Script còn thêm hồ sơ kèm ảnh, tải lại trang xác nhận dữ liệu đã lưu, sửa thông tin, lưu trữ và khôi phục mà không mất dữ liệu. Ảnh chụp lưu trong thư mục tạm; không thay dữ liệu trong profile Chrome của người dùng.

## Khách hàng: đặt lịch khám và lịch sử khám bệnh

- `/portal/booking`: wizard 4 bước (thú cưng → dịch vụ/lý do → ngày/giờ/bác sĩ mong muốn → kiểm tra/gửi). Chỉ nhận thú cưng ACTIVE của chính khách hàng và dịch vụ EXAM đang hoạt động từ danh mục Admin. Giá là tham khảo, snapshot tại lúc đặt, không phải hóa đơn hoặc thanh toán.
- Ngày tối đa 60 ngày tới, giờ phải cách hiện tại hơn 30 phút, tính theo `Asia/Ho_Chi_Minh`. Khung giờ demo là 08:00–11:30 và 13:30–17:00, mỗi 30 phút. Đây là **giờ yêu cầu**, chưa có API availability/ca trực/phòng: không hứa slot hoặc bác sĩ còn trống. Bác sĩ mong muốn lấy từ tài khoản VETERINARIAN đang hoạt động, chỉ chiếu ID/tên.
- Gửi tạo `ONLINE/PENDING` có mã `APT-…`, không tự chuyển CONFIRMED/COMPLETED, không tạo hồ sơ khám, thuốc hoặc hóa đơn. Kiểm tra lại quyền sở hữu/trạng thái thú cưng/dịch vụ/bác sĩ và trùng khung giờ của cùng thú cưng ngay lúc ghi. Đây là kiểm tra cục bộ, không có khóa/giao dịch server để giải quyết race giữa các tab hoặc người dùng.
- Bản nháp trong sessionStorage riêng theo ID khách hàng, giữ bước và dữ liệu khi quay lại/tải lại; xóa sau gửi thành công. Lỗi lưu giữ form để thử lại, khóa double submit trong cùng trang; có cảnh báo đóng tab khi form bẩn, chưa có blocker Back của SPA.
- `/portal/appointments`: danh sách lịch hẹn của chính khách hàng, tìm mã/thú cưng/dịch vụ, lọc trạng thái, phân trang, chi tiết, đặt mới và hủy có lý do. Chỉ hủy PENDING/CONFIRMED trước giờ hẹn; kiểm tra revision khi xác nhận. Hủy không xóa lịch, không tự xóa hồ sơ y tế.
- `/portal/medical-history` và `/portal/medical-history/:recordId`: nguồn hồ sơ khám **chỉ đọc** đã COMPLETED, theo đúng chủ nuôi và thú cưng (bao gồm pet đã lưu trữ). Có tìm kiếm không dấu, lọc thú cưng/ngày inclusive theo Việt Nam, phân trang, chẩn đoán, dặn dò, cân nặng lúc khám, kết quả dịch vụ, thuốc được kê và ngày tái khám nếu được cung cấp. Explicit projection không đưa `doctorOnlyNotes` hay trường nội bộ ở kết quả/thuốc ra khách hàng.
- Ban đầu lịch sử trống và giải thích nguồn dữ liệu; chỉ có fixture clinical khi Admin chủ động nạp bộ demo có xác nhận (xem đầu README). Lễ tân xác nhận/check-in, bác sĩ hoàn tất khám và thông báo demo cục bộ; chưa có email/SMS thật, API hoặc backend authorization.

Mã tại `features/appointments/` (policy/repository/hooks/dialog), `features/medicalHistory/` (reader), `pages/Customer/` và `styles/care.css`; dùng lại CustomerLayout, Header/Footer, field/dialog/card/button hiện có. Giữ CRA/JavaScript theo kiến trúc hiện tại, không migration TypeScript hoặc cài thư viện trong task này.

Storage: `pawcare_appointments_v1`, `pawcare_medical_records_v1`, `pawcare_booking_draft_v1:<ownerId>`. Nguồn hồ sơ khám tương lai cần ghi mỗi record có `id`, `ownerId`, `petId`, `status: COMPLETED`, `examinedAt` ISO có timezone, `doctorName`, `diagnosis`, `recommendations`, `weight` (number/null), `followUpDate` (YYYY-MM-DD hoặc rỗng), `results` (id/name/result), `prescriptions` (id/medicineName/dosage/instructions); phát `pawcare:medical-records-changed` sau cập nhật trong cùng tab. Reader không cho khách ghi/xác nhận chẩn đoán. Storage/event/tab được đồng bộ; lỗi dữ liệu không tự ghi đè.

Kiểm tra: `npm test -- --watchAll=false --runInBand`, `npm run build`, `node scripts/preview-customer.cjs`. Preview bổ sung wizard, gửi/reload/hủy lịch thật, lịch sử trống, lịch sử/chi tiết populated bằng fixture riêng, kiểm tra không lộ doctor-only note và responsive 320/375/768/1024/1280 px.

## Khách hàng: lịch tiêm phòng, đơn thuốc và hóa đơn

Đăng nhập `customer@pawcare.vn / 123456` hoặc tài khoản CUSTOMER của bạn, mở menu avatar hay thanh điều hướng khu vực khách hàng. Cả danh sách và trang chi tiết đều có guard CUSTOMER, reader kiểm tra tài khoản ACTIVE và quyền sở hữu thú cưng, kể cả hồ sơ pet đã lưu trữ. Không đổi vai trò Admin để truy cập các trang này.

- `/portal/vaccinations` và `/:recordId`: theo dõi ngày dự kiến/mũi đã tiêm, tìm không dấu, lọc pet/trạng thái/ngày, phân trang và xem chi tiết. PLANNED được tính thành quá ngày, đến ngày, sắp đến (tối đa 30 ngày) hoặc dự kiến xa hơn, theo ngày Việt Nam. COMPLETED cần thời điểm đã tiêm hợp lệ, không ở tương lai; CANCELLED không bị coi là quá ngày. Ngày/vaccine/mũi do phòng khám cung cấp, không tự tính phác đồ từ ngày sinh và không cho khách tự xác nhận đã tiêm.
- `/portal/prescriptions` và `/:recordId`: đơn được nhóm theo lần khám COMPLETED có thuốc trong nguồn medical records hiện có, không tạo store đơn thứ hai. Giữ đúng liều/hướng dẫn; tần suất, thời gian, số lượng và đơn vị là dữ liệu tùy chọn do nguồn hồ sơ cung cấp. Nếu thiếu, ghi “Chưa được cung cấp”, không tự suy ra. Có liên kết về lần khám; kê thuốc không đồng nghĩa đã cấp thuốc, giảm kho hoặc thanh toán.
- `/portal/invoices` và `/:recordId`: xem mã, thú cưng, ngày, trạng thái, khoản còn phải thanh toán, dòng SERVICE/MEDICINE, lịch sử tiền được cung cấp và in hóa đơn. Tổng = tổng quantity × unitPrice của SERVICE/COMPLETED và MEDICINE/DISPENSED; thuốc dùng số lượng đã cấp từ dòng hóa đơn, bỏ dịch vụ hủy/chưa hoàn tất và thuốc chưa cấp. Không tin trường total từ storage; kiểm tra số nguyên an toàn, số lượng dương và ledger không vượt số tiền hợp lệ. Hóa đơn đã hủy/hoàn tiền không yêu cầu thanh toán lại.
- Giao diện chỉ đọc. Không có checkout, xác nhận thu tiền, kê/sửa thuốc, xuất kho hay ghi nhận tiêm. Bản in dùng HTML/CSS và hộp thoại in trình duyệt (có thể lưu PDF), không tự tải phần mềm/in lên thiết bị ngoài.
- Cả ba nguồn ban đầu trống nếu chưa nạp demo hoặc có dữ liệu phòng khám cung cấp. Admin có thể chủ động nạp fixture vaccine/thuốc/tiền rõ nhãn, không tự seed. Lễ tân lập hóa đơn/ghi nhận thanh toán demo và bác sĩ lập hồ sơ khám; chưa có backend/API/MSW hoặc màn hình ghi vaccine/cấp thuốc.

Tách reader/policy theo `features/vaccinations/`, `features/prescriptions/`, `features/invoices/`; bộ đọc storage/projection và cấu hình list dùng chung ở `features/customerRecords/`. Hook đọc/refresh dùng lại tại `features/customer/useCustomerData`; hai page chung list/detail và card/InvoiceDetail ở `components/customer/`. Giữ CRA/JavaScript theo stack hiện tại, màu kem–cam, phông và Header/Footer chung; menu dùng chung `CUSTOMER_LINKS`, không thêm dependency.

Hợp đồng adapter cục bộ:

- `pawcare_vaccinations_v1`: mảng record có `id/ownerId/petId`, `vaccineName/doseLabel`, `dueDate` YYYY-MM-DD, `status` PLANNED/COMPLETED/CANCELLED. COMPLETED có `administeredAt` ISO có timezone. `doctorName/clinicName/customerNotes` tùy chọn; mọi ghi chú nội bộ khác không được chiếu ra UI. Sau cập nhật cùng tab phát `pawcare:vaccinations-changed`.
- Đơn thuốc dùng `pawcare_medical_records_v1` và event hiện có; mỗi dòng `prescriptions` có id/medicineName/dosage/instructions, tùy chọn frequency/duration/unit (string) và quantity (số nguyên dương). Trang đơn chỉ nhìn hồ sơ COMPLETED của thú cưng đúng chủ.
- `pawcare_invoices_v1`: mảng record có id/ownerId/petId/code/issuedAt, status ISSUED/CANCELLED, items và payments. Mỗi item có id/type/name/quantity/unitPrice/fulfillmentStatus, unit tùy chọn. Mỗi payment có id/type (PAYMENT/REFUND)/status (COMPLETED/VOID)/amount/method (CASH/TRANSFER/CARD/OTHER)/paidAt. VND là số nguyên; items cần phản ánh dịch vụ hoàn tất hoặc lượng thuốc đã cấp. UI derive tổng/đã trả/đã hoàn/còn lại và trạng thái, không sửa dữ liệu. Event: `pawcare:invoices-changed`.

Các reader whitelist field công khai, không lộ notes nội bộ kể cả trong thuốc/dòng hóa đơn/thanh toán, không tự ghi đè storage lỗi; đồng bộ qua event/storage/đổi tab và refresh mỗi phút. Đây là kiểm tra client-side, production cần backend authorization và nguồn clinical/billing đáng tin cậy.

Kiểm tra: `npm test -- --watchAll=false --runInBand`, `npm run build`, `node scripts/preview-customer.cjs`. Preview 320/375/768/1024/1280 px kiểm tra các feed trống/populated/chi tiết, không lộ notes, số tiền từ item hợp lệ, không tràn ngang toàn trang, responsive và PDF A4 trong thư mục tạm. Bảng hóa đơn trên mobile cuộn ngang trong vùng riêng, không đẩy tràn cả trang.

# Getting Started with Create React App


This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)

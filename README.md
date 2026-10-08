# Gia phả dòng họ

Trang web cây gia phả có các tính năng sau:

- Phân biệt người còn sống và người đã mất. Thẻ người đã mất có màu trầm và biểu tượng nén hương.
- Danh sách ngày giỗ theo âm lịch.
- Tìm kiếm theo tên, gõ không dấu cũng được.
- Ai có **mật khẩu chung của dòng họ** đều có thể thêm hoặc sửa người ngay trên web.

Có tất cả 3 bước. Bước 1 xem được ngay, bước 2 và 3 là để cả họ cùng dùng chung dữ liệu.

---

## Bước 1: Đưa web lên GitHub Pages (khoảng 5 phút)

1. Đăng nhập [github.com](https://github.com), bấm **New repository**.
2. Đặt tên, ví dụ `gia-pha`, chọn **Public**, rồi bấm **Create repository**.
3. Trong repo mới, bấm **uploading an existing file**. Kéo thả **tất cả các file trong thư mục này** vào (không kéo cả file zip). Bấm **Commit changes**.
4. Vào **Settings → Pages**:
   - Ở mục *Source*, chọn **Deploy from a branch**.
   - Ở mục *Branch*, chọn **main** và **/ (root)**.
   - Bấm **Save**.
5. Đợi 1–2 phút, tải lại trang Settings → Pages. Bạn sẽ thấy link dạng `https://ten-cua-ban.github.io/gia-pha/`.

Lúc này web chạy **bản thử** với dữ liệu mẫu:

- Bạn bấm *Chỉnh sửa* và nhập `123456` để thử thêm/sửa người.
- Dữ liệu bản thử chỉ lưu trên máy đang mở. Người khác sẽ không thấy những gì bạn nhập.

---

## Bước 2: Tạo Firebase để cả họ dùng chung (khoảng 10 phút, miễn phí)

1. Vào [console.firebase.google.com](https://console.firebase.google.com) và đăng nhập bằng Gmail.
2. Bấm **Create a project** (Tạo dự án), đặt tên `gia-pha-ho-nguyen`. Có thể tắt Google Analytics.
3. **Tạo tài khoản nhập liệu chung:**
   - Ở menu trái, chọn **Build → Authentication → Get started**.
   - Ở tab **Sign-in method**, chọn **Email/Password**, bật **Enable** rồi **Save**.
   - Ở tab **Users**, bấm **Add user**:
     - Email: `nhaplieu@giapha.app`. Email này không cần có thật, chỉ cần trùng với file cấu hình.
     - Password: **mật khẩu chung của dòng họ**, ít nhất 6 ký tự. Nên đặt khó đoán.
4. **Tạo cơ sở dữ liệu:**
   - Chọn **Build → Firestore Database → Create database**.
   - Chọn vị trí `asia-southeast1 (Singapore)` cho nhanh, chọn **production mode**.
5. **Dán quy tắc bảo mật:**
   - Trong Firestore, mở tab **Rules**.
   - Xóa hết nội dung cũ, dán toàn bộ nội dung file `firestore.rules`, rồi bấm **Publish**.
   - Nếu bạn dùng email khác ở bước 3, sửa email trong rules cho trùng.
6. **Lấy cấu hình:**
   - Bấm biểu tượng bánh răng → **Project settings**.
   - Kéo xuống *Your apps*, bấm biểu tượng **`</>`** (Web). Đặt tên app tùy ý rồi bấm **Register app**.
   - Firebase hiện một đoạn `firebaseConfig = { apiKey: "...", ... }`. Giữ trang này lại để làm bước 3.

---

## Bước 3: Nối web với Firebase

1. Trên GitHub, mở file `config.js` và bấm biểu tượng bút chì để sửa.
2. Điền thông tin:
   - `familyName` và `subtitle`: tên dòng họ, quê quán.
   - `editorEmail`: email tài khoản nhập liệu ở bước 2.
   - Phần `firebase`: chép lần lượt các giá trị `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId` từ Firebase vào.
3. Bấm **Commit changes**, đợi 1–2 phút rồi tải lại web.

Từ giờ, dòng "Bản thử" sẽ biến mất. Gia phả bắt đầu trống, và mọi người dùng chung một dữ liệu:

1. Bấm **Chỉnh sửa**, nhập mật khẩu chung.
2. Bấm **Thêm cụ tổ** để tạo người đầu tiên.
3. Bấm vào thẻ từng người để thêm con, thêm vợ/chồng, hoặc sửa thông tin.

Gửi link web và mật khẩu cho người trong họ là họ điền được. Ai chỉ có link thì chỉ xem.

---

## Câu hỏi thường gặp

**Mã `apiKey` để công khai trên GitHub có sao không?**
Không sao, đây là cách Firebase vẫn hoạt động. Dữ liệu được bảo vệ bằng quy tắc ở file `firestore.rules`: ai cũng đọc được, nhưng chỉ tài khoản nhập liệu mới ghi được.

**Đổi mật khẩu chung thế nào?**
1. Vào Firebase → Authentication → Users.
2. Xóa tài khoản nhập liệu cũ.
3. Bấm **Add user** để tạo lại tài khoản với **đúng email cũ** và mật khẩu mới.

Dữ liệu gia phả không bị ảnh hưởng.

**Lỡ ai xóa nhầm thì sao?**
Web không cho xóa người còn con trong cây, và luôn hỏi lại trước khi xóa. Bạn nên thỉnh thoảng sao lưu: Firebase → Firestore → chọn bộ sưu tập `members` để xem và xuất dữ liệu.

**Nên điền thông tin gì?**
Web chỉ có các mục: tên, năm sinh, năm mất, ngày giỗ, nơi an táng, ảnh, ghi chú. Ai có link cũng xem được, nên **không ghi số điện thoại, địa chỉ nhà hay giấy tờ** của người còn sống.

**Thêm ảnh thế nào?**
Khi thêm hoặc sửa một người, bấm **Chọn ảnh**:
- Trên máy tính, chọn ảnh từ máy.
- Trên điện thoại, chọn từ thư viện hoặc chụp luôn.

Ảnh được tự thu nhỏ rồi lưu vào Firebase. Không cần link, không tốn thêm phí. Bấm vào ảnh trong phần chi tiết để xem ảnh lớn.

**Vợ hai, con của vợ nào?**
Thêm nhiều vợ/chồng cho một người được. Khi thêm con, chọn mẹ (hoặc cha) ở ô thứ hai.

---

## Các file

| File | Nội dung |
|---|---|
| `index.html` | Khung trang |
| `style.css` | Giao diện |
| `app.js` | Vẽ cây, tìm kiếm, thêm/sửa, kết nối Firebase |
| `config.js` | **Phần bạn cần sửa**: tên dòng họ và cấu hình Firebase |
| `firestore.rules` | Quy tắc bảo mật để dán vào Firebase |

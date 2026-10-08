// ======================================================
//  CẤU HÌNH GIA PHẢ — chỉ cần sửa file này
// ======================================================
export const CONFIG = {
  // Tên dòng họ, hiện trên đầu trang: "Gia phả Họ Nguyễn"
  familyName: "Họ Nguyễn",

  // Dòng nhỏ dưới tên (quê quán, chi, nhánh…). Để "" nếu không cần.
  subtitle: "",

  // Email của tài khoản nhập liệu chung đã tạo trong Firebase
  // (Authentication → Users). Phải trùng với email trong firestore.rules.
  editorEmail: "nhaplieu@giapha.app",

  // Mật khẩu dùng cho BẢN THỬ (khi chưa điền Firebase bên dưới).
  demoPassword: "123456",

  // Dán cấu hình Firebase vào đây (Project settings → Your apps → Web app).
  // Khi apiKey còn trống, trang chạy BẢN THỬ: dữ liệu mẫu, chỉ lưu trên máy đang mở.
  firebase: {
    apiKey: "AIzaSyA8h_-7ZELsJkO3bbqRlN8xCJHf_oL1QlE",
    authDomain: "gia-pha-246c2.firebaseapp.com",
    projectId: "gia-pha-246c2",
    storageBucket: "gia-pha-246c2.firebasestorage.app",
    messagingSenderId: "978959654415",
    appId: "1:978959654415:web:7250c15c076ec24b088d7a"
  }
};

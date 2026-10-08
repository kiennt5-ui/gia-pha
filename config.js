// ======================================================
//  CẤU HÌNH GIA PHẢ — chỉ cần sửa file này
// ======================================================
export const CONFIG = {
  // Tên dòng họ, hiện trên đầu trang: "Gia phả Họ Nguyễn"
  familyName: "Họ Nguyễn",

  // Dòng nhỏ dưới tên (quê quán, chi, nhánh…). Để "" nếu không cần.
  subtitle: "Làng Phú Thọ, xã An Hòa",

  // Email của tài khoản nhập liệu chung đã tạo trong Firebase
  // (Authentication → Users). Phải trùng với email trong firestore.rules.
  editorEmail: "nhaplieu@giapha.app",

  // Mật khẩu dùng cho BẢN THỬ (khi chưa điền Firebase bên dưới).
  demoPassword: "123456",

  // Dán cấu hình Firebase vào đây (Project settings → Your apps → Web app).
  // Khi apiKey còn trống, trang chạy BẢN THỬ: dữ liệu mẫu, chỉ lưu trên máy đang mở.
  firebase: {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
  }
};

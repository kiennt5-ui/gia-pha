import { CONFIG } from './config.js';

/* =========================================================
   Tiện ích
   ========================================================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const boDau = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
const giamChuyenDong = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const THOI_GIAN = giamChuyenDong ? 0 : 450;
const TEN_THANG = ['Giêng', 'Hai', 'Ba', 'Tư', 'Năm', 'Sáu', 'Bảy', 'Tám', 'Chín', 'Mười', 'Mười một', 'Chạp'];
const GP_GOC = 'chinh';
const MAU = {
  son: { ten: 'Đỏ son', c: '#8C1D18', d: '#5E120F' },
  cham: { ten: 'Xanh chàm', c: '#1F3A5F', d: '#12253F' },
  reu: { ten: 'Xanh rêu', c: '#2E4A3B', d: '#1C3027' },
  nau: { ten: 'Nâu gụ', c: '#5B3A24', d: '#3D2617' },
  tim: { ten: 'Tím than', c: '#3E2A4F', d: '#291B35' }
};
const mauGP = g => MAU[g && g.mau] || MAU.son;
const gpCua = p => (p && p.giaPhaId) || GP_GOC;
const kyTu = p => (String(p.ten || '').trim().split(/\s+/).pop() || '?')[0].toUpperCase();

// Kích thước thẻ trong cây
const W = 224, GAPX = 26, GAPY = 62, H0 = 66, HV = 22, COT_DOI = 92;

/* =========================================================
   Kho dữ liệu: Firebase (thật) hoặc bản thử (lưu trên máy)
   Bộ sưu tập: giaPha (các cuốn gia phả), members (người), anh (ảnh)
   ========================================================= */
async function khoFirebase() {
  const base = 'https://www.gstatic.com/firebasejs/10.12.2';
  const [{ initializeApp }, fs, au] = await Promise.all([
    import(`${base}/firebase-app.js`),
    import(`${base}/firebase-firestore.js`),
    import(`${base}/firebase-auth.js`)
  ]);
  const app = initializeApp(CONFIG.firebase);
  const db = fs.getFirestore(app);
  const auth = au.getAuth(app);
  const emailSua = String(CONFIG.editorEmail || '').toLowerCase();
  const tl = (n, id) => fs.doc(db, n, id);

  return {
    thu: false,
    theoDoi(n, cb, loi) {
      return fs.onSnapshot(fs.collection(db, n), s => cb(s.docs.map(d => ({ ...d.data(), id: d.id }))), loi);
    },
    async them(n, o) {
      const r = await fs.addDoc(fs.collection(db, n), { ...o, taoLuc: fs.serverTimestamp() });
      return r.id;
    },
    async dat(n, id, o) { await fs.setDoc(tl(n, id), { ...o, suaLuc: fs.serverTimestamp() }, { merge: true }); },
    async sua(n, id, o) { await fs.updateDoc(tl(n, id), { ...o, suaLuc: fs.serverTimestamp() }); },
    async suaNhieu(n, ls) {
      const b = fs.writeBatch(db);
      ls.forEach(({ id, data }) => b.update(tl(n, id), data));
      await b.commit();
    },
    async xoa(ls) {
      const b = fs.writeBatch(db);
      ls.forEach(({ n, id }) => b.delete(tl(n, id)));
      await b.commit();
    },
    async lay(n, id) {
      const s = await fs.getDoc(tl(n, id));
      return s.exists() ? s.data() : null;
    },
    dangNhap: mk => au.signInWithEmailAndPassword(auth, CONFIG.editorEmail, mk),
    dangXuat: () => au.signOut(auth),
    theoDoiQuyen(cb) {
      au.onAuthStateChanged(auth, u => cb(!!u && String(u.email || '').toLowerCase() === emailSua));
    }
  };
}

function khoThu() {
  const KHOA = 'gia-pha-thu-v2';
  let dl = null;
  try { dl = JSON.parse(localStorage.getItem(KHOA)); } catch { /* bỏ qua */ }
  if (!dl || !Array.isArray(dl.members)) dl = duLieuMau();
  let anh = {};
  try { anh = JSON.parse(localStorage.getItem(KHOA + '-anh')) || {}; } catch { /* bỏ qua */ }
  let suaDuoc = false;
  try { suaDuoc = sessionStorage.getItem(KHOA + '-sua') === '1'; } catch { /* bỏ qua */ }
  const nghe = {}, ngheQuyen = [];
  const phat = n => (nghe[n] || []).forEach(f => f((dl[n] || []).map(x => ({ ...x }))));
  const luu = n => {
    try { localStorage.setItem(KHOA, JSON.stringify(dl)); } catch { /* bỏ qua */ }
    phat(n);
  };
  const luuAnh = () => {
    try { localStorage.setItem(KHOA + '-anh', JSON.stringify(anh)); return true; } catch { return false; }
  };
  const datQuyen = v => {
    suaDuoc = v;
    try { sessionStorage.setItem(KHOA + '-sua', v ? '1' : '0'); } catch { /* bỏ qua */ }
    ngheQuyen.forEach(f => f(v));
  };
  const dat = async (n, id, o) => {
    if (n === 'anh') {
      const cu = anh[id];
      anh[id] = { ...cu, ...o };
      if (!luuAnh()) { if (cu) anh[id] = cu; else delete anh[id]; throw { code: 'bo-nho-day' }; }
      return;
    }
    const l = dl[n] = dl[n] || [];
    const i = l.findIndex(x => x.id === id);
    if (i >= 0) l[i] = { ...l[i], ...o, id }; else l.push({ ...o, id });
    luu(n);
  };
  return {
    thu: true,
    theoDoi(n, cb) { (nghe[n] = nghe[n] || []).push(cb); cb((dl[n] || []).map(x => ({ ...x }))); },
    async them(n, o) {
      const id = 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      (dl[n] = dl[n] || []).push({ ...o, id }); luu(n); return id;
    },
    dat,
    sua: dat,
    async suaNhieu(n, ls) {
      const m = new Map(ls.map(x => [x.id, x.data]));
      dl[n] = (dl[n] || []).map(p => (m.has(p.id) ? { ...p, ...m.get(p.id), id: p.id } : p));
      luu(n);
    },
    async xoa(ls) {
      const doi = new Set();
      ls.forEach(({ n, id }) => {
        if (n === 'anh') delete anh[id];
        else { dl[n] = (dl[n] || []).filter(x => x.id !== id); doi.add(n); }
      });
      luuAnh();
      doi.forEach(luu);
    },
    async lay(n, id) { return n === 'anh' ? (anh[id] || null) : ((dl[n] || []).find(x => x.id === id) || null); },
    async dangNhap(mk) {
      if (mk !== String(CONFIG.demoPassword)) throw { code: 'auth/invalid-credential' };
      datQuyen(true);
    },
    async dangXuat() { datQuyen(false); },
    theoDoiQuyen(cb) { ngheQuyen.push(cb); cb(suaDuoc); }
  };
}

function duLieuMau() {
  const p = (id, gp, ten, gioiTinh, namSinh, extra = {}) => ({
    id, giaPhaId: gp, ten, gioiTinh, namSinh, daMat: false, namMat: null, ngayGio: '', noiAnTang: '',
    parentId: null, parent2Id: null, spouseOf: null, lienKet: null, ghiChu: '', ...extra
  });
  const mat = (namMat, ngayGio, noiAnTang = '') => ({ daMat: true, namMat, ngayGio, noiAnTang });
  const N = GP_GOC, L = 'le';
  return {
    giaPha: [
      { id: N, ten: 'Họ Nguyễn', nhan: 'Bên nội', phuDe: 'Làng Phú Thọ, xã An Hòa', mau: 'son', thuTu: 1 },
      { id: L, ten: 'Họ Lê', nhan: 'Bên ngoại', phuDe: 'Thôn Đông, xã Yên Lạc', mau: 'cham', thuTu: 2 }
    ],
    members: [
      p('n1', N, 'Nguyễn Văn Thành', 'nam', 1898, { ...mat(1965, '12/3', 'Nghĩa trang làng Phú Thọ'), ghiChu: 'Cụ tổ đời thứ nhất, dựng nhà thờ họ năm 1932.' }),
      p('n2', N, 'Trần Thị Lựu', 'nu', 1902, { ...mat(1978, '20/10', 'Nghĩa trang làng Phú Thọ'), spouseOf: 'n1' }),
      p('n3', N, 'Nguyễn Văn Hòa', 'nam', 1925, { ...mat(1992, '8/1'), parentId: 'n1', thuTu: 1 }),
      p('n4', N, 'Lê Thị Mai', 'nu', 1930, { ...mat(2010, '15/7'), spouseOf: 'n3', lienKet: 'l5' }),
      p('n5', N, 'Nguyễn Thị Hiền', 'nu', 1929, { ...mat(2018, '24/12'), parentId: 'n1', thuTu: 2 }),
      p('n6', N, 'Nguyễn Văn Phúc', 'nam', 1933, { ...mat(2001, '3/5'), parentId: 'n1', thuTu: 3 }),
      p('n7', N, 'Phạm Thị Lan', 'nu', 1936, { spouseOf: 'n6' }),
      p('n8', N, 'Đỗ Thị Hạnh', 'nu', 1940, { ...mat(1999, '27/9'), spouseOf: 'n6' }),
      p('n9', N, 'Nguyễn Văn Đức', 'nam', 1952, { parentId: 'n3' }),
      p('n10', N, 'Hoàng Thị Thu', 'nu', 1955, { spouseOf: 'n9' }),
      p('n11', N, 'Nguyễn Văn Tài', 'nam', 1958, { ...mat(2020, '2/2'), parentId: 'n3' }),
      p('n12', N, 'Nguyễn Thị Hương', 'nu', 1962, { parentId: 'n6', parent2Id: 'n7' }),
      p('n13', N, 'Nguyễn Văn Khánh', 'nam', 1965, { parentId: 'n6', parent2Id: 'n8' }),
      p('n14', N, 'Nguyễn Văn Minh', 'nam', 1980, { parentId: 'n9' }),
      p('n15', N, 'Vũ Thị Ngọc', 'nu', 1983, { spouseOf: 'n14' }),
      p('n16', N, 'Nguyễn Thị Lan Anh', 'nu', 1985, { parentId: 'n9' }),
      p('n17', N, 'Nguyễn Văn Quân', 'nam', 1990, { parentId: 'n13' }),
      p('n18', N, 'Nguyễn Gia Bảo', 'nam', 2010, { parentId: 'n14', parent2Id: 'n15' }),
      p('n19', N, 'Nguyễn Ngọc Hân', 'nu', 2014, { parentId: 'n14', parent2Id: 'n15' }),
      p('l1', L, 'Lê Văn Cẩn', 'nam', 1900, { ...mat(1972, '6/11', 'Nghĩa trang thôn Đông') }),
      p('l2', L, 'Phạm Thị Nụ', 'nu', 1905, { ...mat(1980, '19/4'), spouseOf: 'l1' }),
      p('l3', L, 'Lê Văn Tùng', 'nam', 1927, { ...mat(1995, '10/8'), parentId: 'l1', thuTu: 1 }),
      p('l4', L, 'Đào Thị Gấm', 'nu', 1931, { spouseOf: 'l3' }),
      p('l5', L, 'Lê Thị Mai', 'nu', 1930, { ...mat(2010, '15/7'), parentId: 'l1', thuTu: 2 }),
      p('l6', L, 'Lê Văn Bình', 'nam', 1934, { parentId: 'l1', thuTu: 3 }),
      p('l7', L, 'Lê Văn Hải', 'nam', 1955, { parentId: 'l3' }),
      p('l8', L, 'Lê Thị Yến', 'nu', 1958, { parentId: 'l3' })
    ]
  };
}

/* =========================================================
   Trạng thái & chỉ mục
   ========================================================= */
const S = {
  gpDocs: [], gps: [], gpTheoId: new Map(),
  tatCa: [], tatCaTheoId: new Map(), lienKetVe: new Map(),
  gp: null, ds: [], theoId: new Map(), conCua: new Map(), voChongCua: new Map(), doi: new Map(), viTri: new Map(),
  thuGon: new Set(), anh: new Map(), chon: null, choChon: null, loc: 'tat-ca', suaDuoc: false, view: null,
  daVua: false, form: null, formGP: null, loiTai: '', daTaiGP: false, daTaiTV: false, loiQuyenGP: false
};
let kho = null;

function lapDanhSachGP() {
  const ds = [];
  let coGoc = false;
  for (const g of S.gpDocs) {
    if (g.id === GP_GOC) coGoc = true;
    if (!g.an && g.ten) ds.push({ ...g });
  }
  if (!coGoc) ds.push({ id: GP_GOC, ten: CONFIG.familyName || 'Dòng họ', phuDe: CONFIG.subtitle || '', nhan: '', mau: 'son', thuTu: 0, ao: true });
  ds.sort((a, b) => (a.thuTu ?? 0) - (b.thuTu ?? 0) || String(a.ten).localeCompare(String(b.ten), 'vi'));
  S.gps = ds;
  S.gpTheoId = new Map(ds.map(g => [g.id, g]));
}

function lapChiMucChung() {
  S.tatCaTheoId = new Map(S.tatCa.map(p => [p.id, p]));
  S.lienKetVe = new Map();
  for (const p of S.tatCa) {
    if (p.spouseOf && p.lienKet && S.tatCaTheoId.has(p.lienKet)) {
      if (!S.lienKetVe.has(p.lienKet)) S.lienKetVe.set(p.lienKet, []);
      S.lienKetVe.get(p.lienKet).push(p);
    }
  }
}

function lapChiMuc() {
  S.ds = S.tatCa.filter(p => gpCua(p) === S.gp);
  S.theoId = new Map(S.ds.map(p => [p.id, p]));
  S.conCua = new Map();
  S.voChongCua = new Map();
  const day = (m, k, v) => { if (!m.has(k)) m.set(k, []); m.get(k).push(v); };
  for (const p of S.ds) {
    if (p.spouseOf) {
      if (S.theoId.has(p.spouseOf)) day(S.voChongCua, p.spouseOf, p);
    } else {
      day(S.conCua, p.parentId && S.theoId.has(p.parentId) ? p.parentId : '__goc', p);
    }
  }
  const theoNam = (a, b) => (a.namSinh || 9999) - (b.namSinh || 9999) || a.ten.localeCompare(b.ten, 'vi');
  const theoThuTu = (a, b) => (a.thuTu ?? 1e9) - (b.thuTu ?? 1e9) || theoNam(a, b);
  S.conCua.forEach(l => l.sort(theoThuTu));
  S.voChongCua.forEach(l => l.sort(theoNam));

  S.doi = new Map();
  const daQua = new Set();
  const di = (id, d) => {
    for (const c of S.conCua.get(id) || []) {
      if (daQua.has(c.id)) continue;
      daQua.add(c.id);
      S.doi.set(c.id, d);
      di(c.id, d + 1);
    }
  };
  di('__goc', 1);
  S.voChongCua.forEach((l, id) => l.forEach(v => S.doi.set(v.id, S.doi.get(id))));
}

function thongKeGP(id) {
  const ds = S.tatCa.filter(p => gpCua(p) === id);
  const ids = new Set(ds.map(p => p.id));
  const con = new Map();
  for (const p of ds) {
    if (p.spouseOf) continue;
    const k = p.parentId && ids.has(p.parentId) ? p.parentId : '__goc';
    if (!con.has(k)) con.set(k, []);
    con.get(k).push(p.id);
  }
  let doi = 0;
  const daQua = new Set();
  const st = [['__goc', 0]];
  while (st.length) {
    const [k, d] = st.pop();
    for (const c of con.get(k) || []) {
      if (daQua.has(c)) continue;
      daQua.add(c);
      doi = Math.max(doi, d + 1);
      st.push([c, d + 1]);
    }
  }
  return { nguoi: ds.length, doi };
}

const hopLoc = p => (S.loc === 'song' ? !p.daMat : S.loc === 'mat' ? !!p.daMat : true);
const nhanVC = p => (p.gioiTinh === 'nu' ? 'Chồng' : 'Vợ');            // vợ/chồng CỦA người p
const banDoi = p => (p.spouseOf ? S.tatCaTheoId.get(p.spouseOf) : null);
const tenNganGP = g => (g ? (g.nhan || g.ten) : '');
function dongNam(p) {
  if (p.daMat) return p.namSinh || p.namMat ? `${p.namSinh || '?'} – ${p.namMat || '?'}` : 'Đã mất';
  return p.namSinh ? `Sinh năm ${p.namSinh}` : 'Còn sống';
}
function namNgan(p) {
  if (p.daMat) return `${p.namSinh || '?'}–${p.namMat || '?'}`;
  return p.namSinh ? String(p.namSinh) : '';
}
function moTaNgan(p) {
  const b = banDoi(p);
  if (b) return `${nhanVC(b)} của ${b.ten}`;
  const d = S.doi.get(p.id);
  return `${d ? 'Đời ' + d : 'Chưa nối vào cây'}${p.namSinh ? ', sinh ' + p.namSinh : ''}`;
}
function moTaTim(p) {
  const g = S.gpTheoId.get(gpCua(p));
  const phan = [];
  if (S.gps.length > 1 && g) phan.push(tenNganGP(g));
  if (gpCua(p) === S.gp) phan.push(moTaNgan(p));
  else {
    const b = banDoi(p);
    phan.push(b ? `${nhanVC(b)} của ${b.ten}` : (p.namSinh ? `sinh ${p.namSinh}` : ''));
  }
  return phan.filter(Boolean).join(', ');
}
function hauDue(id) {
  const out = new Set(), st = [id];
  while (st.length) {
    const x = st.pop();
    for (const c of S.conCua.get(x) || []) if (!out.has(c.id)) { out.add(c.id); st.push(c.id); }
  }
  return out;
}
function chaMeThu2(p) {
  if (!p.parentId) return null;
  if (p.parent2Id && S.theoId.has(p.parent2Id)) return S.theoId.get(p.parent2Id);
  const vcs = S.voChongCua.get(p.parentId) || [];
  return vcs.length === 1 ? vcs[0] : null;
}
function nhanThuTu(i, n) {
  if (i === 0) return 'Con cả';
  if (i === n - 1) return `Con út (thứ ${i + 1})`;
  return `Con thứ ${i + 1}`;
}
async function luuThuTu(ids) {
  const doi = ids.map((id, i) => ({ id, data: { thuTu: i + 1 } }))
    .filter(x => S.tatCaTheoId.get(x.id)?.thuTu !== x.data.thuTu);
  if (doi.length) await kho.suaNhieu('members', doi);
}
function docNgayGio(s) {
  const m = String(s || '').match(/^\s*(\d{1,2})\s*[\/\-.]\s*(\d{1,2})/);
  if (!m) return null;
  const d = +m[1], th = +m[2];
  if (d < 1 || d > 30 || th < 1 || th > 12) return null;
  return { d, th, nhuan: /nhu[aậâ]n/i.test(s) };
}
function docNam(s) {
  if (!s) return null;
  if (!/^\d{3,4}$/.test(s)) return false;
  const n = +s;
  return n < 1000 || n > new Date().getFullYear() ? false : n;
}

/* =========================================================
   Ảnh: thu nhỏ trên máy trước khi lưu
   ========================================================= */
async function taoAnh(nguon, { max = 640, vuong = false, q = 0.85 } = {}) {
  const laBlob = nguon instanceof Blob;
  if (laBlob && !/^image\//.test(nguon.type)) throw new Error('khong-phai-anh');
  const url = laBlob ? URL.createObjectURL(nguon) : nguon;
  try {
    const img = await new Promise((ok, hong) => { const i = new Image(); i.onload = () => ok(i); i.onerror = hong; i.src = url; });
    let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
    if (vuong) {
      const m = Math.min(sw, sh);
      sx = (sw - m) / 2; sy = (sh - m) * 0.3; sw = sh = m;
    }
    const k = Math.min(1, max / Math.max(sw, sh));
    const w = Math.max(1, Math.round(sw * k)), h = Math.max(1, Math.round(sh * k));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
    let qq = q, d = c.toDataURL('image/jpeg', qq);
    while (d.length > 600000 && qq > 0.4) { qq -= 0.15; d = c.toDataURL('image/jpeg', qq); }
    return d;
  } finally {
    if (laBlob) URL.revokeObjectURL(url);
  }
}
async function layAnhNguoi(p) {
  if (!p.coAnh) return /^https?:\/\//i.test(p.anh || '') ? p.anh : null;
  const c = S.anh.get(p.id);
  if (c && c.v === p.anhV) return c.data;
  const doc = await kho.lay('anh', p.id);
  const data = doc && doc.data;
  if (data) S.anh.set(p.id, { v: p.anhV, data });
  return data || null;
}
const anhNhoCua = p => p.anhNho || (/^https?:\/\//i.test(p.anh || '') ? p.anh : '');

/* =========================================================
   Cây gia phả (D3)
   ========================================================= */
let svg, gGoc, gNen, gDuong, gThe, zoom;

function khoiCay() {
  svg = d3.select('#cay');
  svg.append('defs').html('<clipPath id="cat-tron" clipPathUnits="objectBoundingBox"><circle cx=".5" cy=".5" r=".5"/></clipPath>');
  gGoc = svg.append('g');
  gNen = gGoc.append('g');
  gDuong = gGoc.append('g');
  gThe = gGoc.append('g');
  zoom = d3.zoom().scaleExtent([0.15, 2.5]).on('zoom', e => gGoc.attr('transform', e.transform));
  svg.call(zoom).on('dblclick.zoom', null);
  $('#zoom-in').onclick = () => svg.transition().duration(THOI_GIAN / 2).call(zoom.scaleBy, 1.3);
  $('#zoom-out').onclick = () => svg.transition().duration(THOI_GIAN / 2).call(zoom.scaleBy, 1 / 1.3);
  $('#zoom-fit').onclick = () => vuaKhung(true);
}

const caoThe = p => {
  const v = (S.voChongCua.get(p.id) || []).length;
  return H0 + (v ? 12 + v * HV : 0);
};

// Cắt chữ cho vừa bề ngang, giữ nguyên phần đuôi (nếu có)
function vuaChu(textEl, phanCat, chu, maxW) {
  phanCat.textContent = chu;
  if (textEl.getComputedTextLength() <= maxW) return;
  let lo = 1, hi = chu.length;
  while (lo < hi) {
    const m = (lo + hi + 1) >> 1;
    phanCat.textContent = chu.slice(0, m).trimEnd() + '…';
    if (textEl.getComputedTextLength() <= maxW) lo = m; else hi = m - 1;
  }
  phanCat.textContent = chu.slice(0, lo).trimEnd() + '…';
  const t = document.createElementNS('http://www.w3.org/2000/svg', 'title');
  t.textContent = chu;
  textEl.appendChild(t);
}

function duongNoi(sx, sy, tx, ty) {
  const my = ty - GAPY / 2 + 2;
  if (Math.abs(sx - tx) < 1) return `M${sx},${sy}V${ty}`;
  const r = Math.max(0, Math.min(12, Math.abs(tx - sx) / 2, my - sy - 2, ty - my - 2));
  const h = tx > sx ? 1 : -1;
  return `M${sx},${sy}V${my - r}Q${sx},${my} ${sx + h * r},${my}H${tx - h * r}Q${tx},${my} ${tx},${my + r}V${ty}`;
}

function veCay() {
  if (!svg) return;
  hienTrong();
  const h = d3.hierarchy({ id: '__goc' }, d => {
    if (d.id !== '__goc' && S.thuGon.has(d.id)) return null;
    const c = S.conCua.get(d.id) || [];
    return c.length ? c : null;
  });
  d3.tree().nodeSize([W + GAPX, 1]).separation((a, b) => (a.parent === b.parent ? 1 : 1.12))(h);

  const nodes = h.descendants().filter(d => d.depth > 0);
  gNen.selectAll('*').remove();
  gThe.selectAll('*').remove();
  S.viTri = new Map();
  if (!nodes.length) { gDuong.selectAll('*').remove(); return; }

  const maxH = [];
  nodes.forEach(d => { maxH[d.depth] = Math.max(maxH[d.depth] || 0, caoThe(d.data)); });
  const yDoi = [];
  let y = 0;
  for (let i = 1; i < maxH.length; i++) { yDoi[i] = y; y += (maxH[i] || 0) + GAPY; }
  nodes.forEach(d => { d.Y = yDoi[d.depth]; d.X = d.x - W / 2; d.Hh = caoThe(d.data); });

  // Dải nền theo đời + cột "Đời"
  const minX = d3.min(nodes, d => d.X), maxX = d3.max(nodes, d => d.X + W);
  for (let i = 1; i < maxH.length; i++) {
    if (!maxH[i]) continue;
    gNen.append('rect')
      .attr('class', i % 2 ? 'dai le' : 'dai chan')
      .attr('x', minX - COT_DOI - 28).attr('y', yDoi[i] - GAPY / 2)
      .attr('width', maxX - minX + COT_DOI + 56).attr('height', maxH[i] + GAPY);
    const g = gNen.append('g').attr('class', 'nhan-doi')
      .attr('transform', `translate(${minX - COT_DOI / 2 - 14},${yDoi[i] + Math.min(maxH[i], H0) / 2})`);
    g.append('text').attr('class', 'nd-chu').attr('y', -10).text('Đời');
    g.append('text').attr('class', 'nd-so').attr('y', 20).text(i);
  }
  gNen.append('line').attr('class', 'ke-doi')
    .attr('x1', minX - 28).attr('x2', minX - 28)
    .attr('y1', -GAPY / 2 + 10).attr('y2', y - GAPY / 2 - 10);

  const lienKet = nodes.filter(d => d.parent && d.parent.depth > 0);
  gDuong.selectAll('path').data(lienKet, d => d.data.id).join('path')
    .attr('class', 'duong')
    .attr('d', d => duongNoi(d.parent.x, d.parent.Y + d.parent.Hh + 10, d.x, d.Y));

  nodes.forEach(veThe);
}

function veAvatar(el, p, cx, cy, r) {
  const src = anhNhoCua(p);
  el.append('circle').attr('class', 'av-nen').attr('cx', cx).attr('cy', cy).attr('r', r);
  if (src) {
    el.append('image').attr('href', src)
      .attr('x', cx - r).attr('y', cy - r).attr('width', 2 * r).attr('height', 2 * r)
      .attr('preserveAspectRatio', 'xMidYMid slice').attr('clip-path', 'url(#cat-tron)');
  } else {
    el.append('text').attr('class', 'av-chu').attr('x', cx).attr('y', cy + 6.5).text(kyTu(p));
  }
  el.append('circle').attr('class', 'av-vien').attr('cx', cx).attr('cy', cy).attr('r', r);
}

function veHuongNho(g) {
  const h = g.append('g').attr('class', 'huong').attr('aria-hidden', 'true');
  for (let i = 0; i < 3; i++) {
    const x = 1.5 + i * 3.6;
    h.append('line').attr('x1', x).attr('x2', x).attr('y1', -9.5).attr('y2', -2);
    h.append('circle').attr('cx', x).attr('cy', -10.6).attr('r', 1.15);
  }
  h.append('rect').attr('x', -0.6).attr('y', -2.2).attr('width', 11).attr('height', 2.6).attr('rx', 0.9);
}

function veThe(d) {
  const p = d.data, vc = S.voChongCua.get(p.id) || [], mat = !!p.daMat;
  const khop = hopLoc(p), vcKhop = vc.map(hopLoc);
  const lop = ['the', mat ? 'mat' : 'song'];
  if (S.chon === p.id || vc.some(v => v.id === S.chon)) lop.push('dang-chon');
  if (!khop && !vcKhop.some(Boolean)) lop.push('mo');

  const kichHoat = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); chonNguoi(p.id, true); } };
  const el = gThe.append('g')
    .attr('class', lop.join(' '))
    .attr('transform', `translate(${d.X},${d.Y})`)
    .attr('tabindex', 0)
    .attr('role', 'button')
    .attr('data-id', p.id)
    .attr('aria-label', `${p.ten}, ${moTaNgan(p)}${mat ? ', đã mất' : ''}`)
    .on('click', () => chonNguoi(p.id))
    .on('keydown', kichHoat);

  el.append('rect').attr('class', 'bong').attr('x', 0).attr('y', 3).attr('width', W).attr('height', d.Hh).attr('rx', 10);
  el.append('rect').attr('class', 'nen').attr('width', W).attr('height', d.Hh).attr('rx', 10);

  const chu = el.append('g').attr('class', khop ? null : 'mo-chu');
  veAvatar(chu, p, 34, 33, 21);
  const tTen = chu.append('text').attr('class', 'ten').attr('x', 64).attr('y', 30);
  vuaChu(tTen.node(), tTen.node(), p.ten, W - 64 - 12);
  const dong = chu.append('g').attr('transform', 'translate(64,50)');
  if (mat) veHuongNho(dong);
  dong.append('text').attr('class', 'phu').attr('x', mat ? 16 : 0).text(dongNam(p));

  if (vc.length) {
    el.append('line').attr('class', 'ke').attr('x1', 14).attr('x2', W - 14).attr('y1', H0).attr('y2', H0);
    vc.forEach((v, i) => {
      const t = el.append('text')
        .attr('class', `vc${v.daMat ? ' mat-vc' : ''}${vcKhop[i] ? '' : ' mo-chu'}`)
        .attr('x', 16).attr('y', H0 + 19 + i * HV)
        .on('click', e => { e.stopPropagation(); chonNguoi(v.id); });
      t.append('tspan').attr('class', 'vc-nhan').text(`${nhanVC(p)}  `);
      const ten = t.append('tspan').attr('class', 'vc-ten');
      if (v.daMat) t.append('tspan').attr('class', 'vc-duoi').text('  đã mất');
      if (v.lienKet && S.tatCaTheoId.has(v.lienKet)) t.append('tspan').attr('class', 'vc-lk').text('  ↗');
      vuaChu(t.node(), ten.node(), v.ten, W - 30);
    });
  }

  const con = S.conCua.get(p.id) || [];
  if (con.length) {
    const gon = S.thuGon.has(p.id);
    const nhan = gon ? `+${hauDue(p.id).size}` : '−';
    const bw = gon ? Math.max(34, 16 + nhan.length * 8) : 28;
    const doiGon = e => { e.stopPropagation(); gon ? S.thuGon.delete(p.id) : S.thuGon.add(p.id); veCay(); };
    const gp = el.append('g')
      .attr('class', 'gap')
      .attr('transform', `translate(${W / 2},${d.Hh})`)
      .attr('role', 'button')
      .attr('tabindex', 0)
      .attr('aria-label', gon ? `Mở nhánh con cháu của ${p.ten}` : `Thu gọn nhánh con cháu của ${p.ten}`)
      .on('click', doiGon)
      .on('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); doiGon(e); } });
    gp.append('rect').attr('x', -bw / 2).attr('y', -10).attr('width', bw).attr('height', 20).attr('rx', 10);
    gp.append('text').attr('y', 4).text(nhan);
  }

  S.viTri.set(p.id, d);
  vc.forEach(v => S.viTri.set(v.id, d));
}

function vungNhin() {
  const r = svg.node().getBoundingClientRect();
  let w = r.width, h = r.height;
  const pn = $('#chi-tiet');
  if (!pn.hidden) {
    const pr = pn.getBoundingClientRect();
    if (pr.width < r.width * 0.9) w -= pr.width; else h -= pr.height;
  }
  return { w: Math.max(w, 100), h: Math.max(h, 100) };
}

function vuaKhung(hoatHinh) {
  if (!svg || !gGoc.node() || !S.ds.length) return;
  const b = gGoc.node().getBBox();
  const r = svg.node().getBoundingClientRect();
  if (!b.width || !r.width) return;
  const vua = 0.94 * Math.min(r.width / b.width, r.height / b.height);
  const k = Math.min(1, Math.max(r.width < 700 ? 0.55 : 0.35, vua));
  const tx = r.width / 2 - k * (b.x + b.width / 2);
  const ty = k === vua ? r.height / 2 - k * (b.y + b.height / 2) : 16 - k * b.y;
  const t = d3.zoomIdentity.translate(tx, ty).scale(k);
  (hoatHinh ? svg.transition().duration(THOI_GIAN) : svg).call(zoom.transform, t);
}

function denNguoi(id) {
  const d = S.viTri.get(id);
  if (!d) return;
  const { w, h } = vungNhin();
  const k = Math.max(d3.zoomTransform(svg.node()).k, 0.85);
  const t = d3.zoomIdentity.translate(w / 2 - k * d.x, h / 2 - k * (d.Y + d.Hh / 2)).scale(k);
  svg.transition().duration(THOI_GIAN).call(zoom.transform, t);
}

function damBaoThay(id) {
  const d = S.viTri.get(id);
  if (!d) return;
  const t = d3.zoomTransform(svg.node());
  const { w, h } = vungNhin();
  const x1 = t.applyX(d.X), x2 = t.applyX(d.X + W), y1 = t.applyY(d.Y), y2 = t.applyY(d.Y + d.Hh);
  if (x1 < 0 || x2 > w || y1 < 0 || y2 > h) denNguoi(id);
}

function moNhanhToiNguoi(id) {
  let x = S.theoId.get(id);
  if (x && x.spouseOf) x = S.theoId.get(x.spouseOf);
  const daQua = new Set();
  while (x && x.parentId && !daQua.has(x.id)) {
    daQua.add(x.id);
    S.thuGon.delete(x.parentId);
    x = S.theoId.get(x.parentId);
  }
}

function chonNguoi(id, tuBanPhim = false) {
  S.chon = id;
  veCay();
  moChiTiet(id);
  requestAnimationFrame(() => damBaoThay(id));
  if (tuBanPhim) {
    const the = gThe.node().querySelector(`[data-id="${CSS.escape(S.theoId.get(id)?.spouseOf || id)}"]`);
    if (the) the.focus();
  }
}

function chonVaDen(id) {
  moNhanhToiNguoi(id);
  S.chon = id;
  veCay();
  moChiTiet(id);
  requestAnimationFrame(() => denNguoi(id));
}

// Đi tới một người ở bất kỳ gia phả nào
function denVaChon(id) {
  const p = S.tatCaTheoId.get(id);
  if (!p) return;
  const gp = gpCua(p);
  if (gp !== S.gp || S.view !== 'cay') {
    S.choChon = id;
    diToi(gp, 'cay');
    return;
  }
  chonVaDen(id);
}

/* =========================================================
   Bảng chi tiết
   ========================================================= */
function nhomDS(tieuDe, ds, { danhSo = false, sapXep = false } = {}) {
  const muiTen = (x, i) => sapXep ? `<span class="sap-xep">
      <button type="button" data-len="${esc(x.id)}" aria-label="Đưa ${esc(x.ten)} lên trước"${i === 0 ? ' class="an"' : ''}>↑</button>
      <button type="button" data-xuong="${esc(x.id)}" aria-label="Đưa ${esc(x.ten)} xuống sau"${i === ds.length - 1 ? ' class="an"' : ''}>↓</button>
    </span>` : '';
  return `<div class="ct-nhom"><h3>${esc(tieuDe)}</h3>${sapXep ? '<p class="goi-y-sx">Bấm ↑ ↓ để xếp anh chị trước, em sau.</p>' : ''}<ul>${ds.map((x, i) =>
    `<li${sapXep ? ' class="co-sx"' : ''}><button type="button" data-den="${esc(x.id)}">${danhSo ? `<b class="so">${i + 1}</b>` : ''}<span class="ten-ds">${esc(x.ten)}</span><span>${esc(namNgan(x))}</span></button>${muiTen(x, i)}</li>`
  ).join('')}</ul></div>`;
}

function nutLienKet(p) {
  const out = [];
  if (p.spouseOf && p.lienKet) {
    const q = S.tatCaTheoId.get(p.lienKet);
    const g = q && S.gpTheoId.get(gpCua(q));
    if (g) {
      out.push(`<button type="button" class="lien-ket" data-den="${esc(q.id)}" style="--mau:${mauGP(g).c}">
        <span class="lk-o" aria-hidden="true">譜</span>
        <span><b>Mở gia phả ${esc(g.ten)}</b><small>Gia đình nơi ${p.gioiTinh === 'nu' ? 'bà' : 'ông'} sinh ra${g.nhan ? ', ' + esc(g.nhan.toLowerCase()) : ''}</small></span>
      </button>`);
    }
  }
  for (const s of S.lienKetVe.get(p.id) || []) {
    const g = S.gpTheoId.get(gpCua(s));
    const ban = S.tatCaTheoId.get(s.spouseOf);
    if (!g) continue;
    out.push(`<button type="button" class="lien-ket" data-den="${esc(s.id)}" style="--mau:${mauGP(g).c}">
      <span class="lk-o" aria-hidden="true">譜</span>
      <span><b>Mở gia phả ${esc(g.ten)}</b><small>Về làm ${p.gioiTinh === 'nu' ? 'dâu' : 'rể'}${ban ? ', ' + (p.gioiTinh === 'nu' ? 'vợ' : 'chồng') + ' của ' + esc(ban.ten) : ''}</small></span>
    </button>`);
  }
  return out.join('');
}

function moChiTiet(id) {
  const pn = $('#chi-tiet');
  const p = S.theoId.get(id);
  if (!p) { pn.hidden = true; S.chon = null; return; }

  const ban = banDoi(p), mat = !!p.daMat, doi = S.doi.get(id);
  const nho = anhNhoCua(p);
  const anh = `<button type="button" class="o-anh" data-xem-anh aria-label="Xem ảnh lớn của ${esc(p.ten)}" disabled>${nho ? `<img src="${esc(nho)}" alt="">` : `<div class="chu-cai" aria-hidden="true">${esc(kyTu(p))}</div>`}</button>`;

  const hang = [];
  const them = (k, v) => { if (v !== null && v !== undefined && v !== '') hang.push(`<dt>${k}</dt><dd>${esc(v)}</dd>`); };
  them('Giới tính', p.gioiTinh === 'nu' ? 'Nữ' : 'Nam');
  them('Năm sinh', p.namSinh);
  if (!ban && p.parentId && S.theoId.has(p.parentId)) {
    const ae = S.conCua.get(p.parentId) || [];
    if (ae.length > 1) them('Thứ tự', `${nhanThuTu(ae.findIndex(c => c.id === p.id), ae.length)} trong ${ae.length} anh chị em`);
  }
  if (mat) {
    them('Năm mất', p.namMat);
    if (p.ngayGio) them('Ngày giỗ', `${p.ngayGio} âm lịch`);
    them('An táng', p.noiAnTang);
  }

  const nhom = [];
  if (ban) {
    nhom.push(nhomDS(ban.gioiTinh === 'nu' ? 'Vợ' : 'Chồng', [ban]));
    const vcBan = S.voChongCua.get(ban.id) || [];
    const con = (S.conCua.get(ban.id) || []).filter(c => c.parent2Id === p.id || (!c.parent2Id && vcBan.length === 1));
    if (con.length) nhom.push(nhomDS(`Con (${con.length})`, con, { danhSo: true }));
  } else {
    const cha = p.parentId && S.theoId.get(p.parentId);
    if (cha) nhom.push(nhomDS('Cha mẹ', [cha, chaMeThu2(p)].filter(Boolean)));
    const vc = S.voChongCua.get(id) || [];
    if (vc.length) nhom.push(nhomDS(nhanVC(p), vc));
    const con = S.conCua.get(id) || [];
    if (con.length) nhom.push(nhomDS(`Con (${con.length})`, con, { danhSo: true, sapXep: S.suaDuoc && con.length > 1 }));
  }

  const nhan = [];
  if (doi && !ban) nhan.push(`<span>Đời thứ ${doi}</span>`);
  nhan.push(mat ? '<span class="mat">Đã mất</span>' : '<span class="song">Còn sống</span>');

  const sua = S.suaDuoc ? `<div class="ct-sua">
      <button type="button" class="nut nut-nho" data-hd="sua">Sửa thông tin</button>
      <button type="button" class="nut nut-nho" data-hd="them-con">Thêm con</button>
      ${ban ? '' : '<button type="button" class="nut nut-nho" data-hd="them-vc">Thêm vợ/chồng</button>'}
      <button type="button" class="nut nut-nho nut-nguy" data-hd="xoa">Xóa</button>
    </div>` : '';

  pn.innerHTML = `
    <button type="button" class="dong" aria-label="Đóng">×</button>
    <div class="ct-dau ${mat ? 'mat' : 'song'}">
      ${anh}
      <div>
        <h2>${esc(p.ten)}</h2>
        ${ban ? `<p class="ct-quan-he">${esc(nhanVC(ban))} của ${esc(ban.ten)}</p>` : ''}
        <div class="nhan">${nhan.join('')}</div>
      </div>
    </div>
    <dl class="ct-ds">${hang.join('')}</dl>
    ${nutLienKet(p)}
    ${nhom.join('')}
    ${p.ghiChu ? `<p class="ghi-chu">${esc(p.ghiChu)}</p>` : ''}
    ${sua}`;
  if (pn.dataset.id !== id) pn.scrollTop = 0;
  pn.dataset.id = id;
  pn.hidden = false;

  if (p.coAnh || p.anh) {
    layAnhNguoi(p).then(async src => {
      if (!src || S.chon !== id) return;
      const o = pn.querySelector('.o-anh');
      if (!o) return;
      o.innerHTML = '';
      const img = new Image();
      img.alt = '';
      img.src = src;
      o.appendChild(img);
      o.disabled = false;
      // Ảnh cũ chưa có ảnh nhỏ trên cây: tạo bổ sung khi đang chỉnh sửa
      if (S.suaDuoc && p.coAnh && !p.anhNho) {
        try { await kho.sua('members', p.id, { anhNho: await taoAnh(src, { max: 120, vuong: true, q: 0.8 }) }); }
        catch (err) { console.error(err); }
      }
    }).catch(err => console.error(err));
  }
}

function dongChiTiet() {
  S.chon = null;
  $('#chi-tiet').hidden = true;
  if (S.view === 'cay') veCay();
}

/* =========================================================
   Ngày giỗ
   ========================================================= */
function veGio() {
  const g = S.gpTheoId.get(S.gp);
  const co = [], khong = [];
  for (const p of S.ds) {
    if (!p.daMat) continue;
    const gi = docNgayGio(p.ngayGio);
    gi ? co.push({ p, g: gi }) : khong.push(p);
  }
  co.sort((a, b) => a.g.th - b.g.th || a.g.nhuan - b.g.nhuan || a.g.d - b.g.d || a.p.ten.localeCompare(b.p.ten, 'vi'));

  const moTa = p => {
    const b = banDoi(p);
    const goc = b ? `${nhanVC(b)} của ${b.ten}` : (S.doi.get(p.id) ? `Đời thứ ${S.doi.get(p.id)}` : '');
    return [goc, p.namMat ? `mất năm ${p.namMat}` : ''].filter(Boolean).join(', ');
  };

  let html = `<div class="gio-khung"><h2 class="gio-tieu-de">Ngày giỗ gia phả ${esc(g ? g.ten : '')}</h2>`;
  if (!co.length && !khong.length) {
    html += '<p class="gio-gioi-thieu">Chưa có ai đã mất trong gia phả này. Khi thêm người đã mất, điền ngày giỗ theo âm lịch để danh sách hiện ở đây.</p>';
  } else {
    html += '<p class="gio-gioi-thieu">Tính theo âm lịch, xếp theo tháng trong năm. Bấm vào tên để xem trên cây.</p>';
    let thang = 0, nhuan = false;
    for (const { p, g: gi } of co) {
      if (gi.th !== thang || gi.nhuan !== nhuan) {
        if (thang) html += '</ol></section>';
        thang = gi.th; nhuan = gi.nhuan;
        html += `<section class="thang"><h3>Tháng ${TEN_THANG[thang - 1]}${nhuan ? ' (nhuận)' : ''}</h3><ol>`;
      }
      html += `<li><button type="button" data-den="${esc(p.id)}">
        <span class="ngay">${gi.d}</span>
        <span class="ten-gio">${esc(p.ten)}</span>
        <span class="mo-ta">${esc(moTa(p))}</span></button></li>`;
    }
    if (thang) html += '</ol></section>';
    if (khong.length) {
      html += `<section class="thang chua-ro"><h3>Chưa ghi ngày giỗ (${khong.length})</h3><ul>${khong.map(p =>
        `<li><button type="button" data-den="${esc(p.id)}"><span class="ten-gio">${esc(p.ten)}</span><span class="mo-ta">${esc(moTa(p))}</span></button></li>`
      ).join('')}</ul></section>`;
    }
  }
  $('#view-gio').innerHTML = html + '</div>';
}

/* =========================================================
   Tủ gia phả (trang đầu)
   ========================================================= */
function veNha() {
  const bia = S.gps.map(g => {
    const tk = thongKeGP(g.id), m = mauGP(g);
    return `<button type="button" class="bia-sach" style="--mau:${m.c};--mau-dam:${m.d}" data-mo-gp="${esc(g.id)}">
      <span class="bs-gay" aria-hidden="true"></span>
      <span class="bs-khung">
        ${g.nhan ? `<span class="bs-nhan">${esc(g.nhan)}</span>` : ''}
        <span class="bs-an" aria-hidden="true">譜</span>
        <span class="bs-tieu">Gia phả</span>
        <span class="bs-ten">${esc(g.ten)}</span>
        ${g.phuDe ? `<span class="bs-phu">${esc(g.phuDe)}</span>` : ''}
        <span class="bs-so">${tk.nguoi ? `${tk.nguoi} người, ${tk.doi} đời` : 'Chưa có ai'}</span>
      </span>
    </button>`;
  }).join('');
  const them = S.suaDuoc
    ? '<button type="button" class="bia-sach bia-them" data-them-gp><span class="bt-cong" aria-hidden="true">+</span><span class="bt-chu">Thêm gia phả</span><small>Bên ngoại, bên nội của vợ…</small></button>'
    : '';
  const goiY = S.suaDuoc
    ? (S.loiQuyenGP ? '<p class="nha-canh-bao">Firebase chưa cho phép lưu nhiều gia phả. Cập nhật Rules theo hướng dẫn rồi tải lại trang.</p>' : '')
    : '<p class="nha-goi-y">Muốn thêm gia phả bên ngoại? Bấm “Chỉnh sửa” và nhập mật khẩu dòng họ.</p>';
  $('#view-nha').innerHTML = `<div class="nha-khung">
      <div class="tu-sach">${bia}${them}</div>
      ${goiY}
    </div>`;
}

/* =========================================================
   Điều hướng: #nha, #gp=<id>, #gp=<id>&v=gio
   ========================================================= */
function diToi(gp, view = 'cay') {
  const h = gp ? `#gp=${encodeURIComponent(gp)}${view === 'gio' ? '&v=gio' : ''}` : '#nha';
  if (location.hash !== h) location.hash = h;
  else apDungHash();
}

function apDungHash() {
  if (!S.daTaiGP || !S.daTaiTV) return;
  const q = new URLSearchParams(location.hash.slice(1));
  let gp = q.get('gp');
  const v = q.get('v') === 'gio' ? 'gio' : 'cay';
  if (gp && !S.gpTheoId.has(gp)) gp = null;
  if (!gp && !q.has('nha') && S.gps.length === 1) gp = S.gps[0].id;
  if (gp) moCay(gp, v); else moNha();
}

function datMau(g) {
  const m = mauGP(g);
  document.documentElement.style.setProperty('--son', m.c);
  document.documentElement.style.setProperty('--son-dam', m.d);
}

function moNha() {
  S.view = 'nha';
  S.chon = null;
  datMau(null);
  $('#chi-tiet').hidden = true;
  $('#view-nha').hidden = false;
  $('#view-cay').hidden = true;
  $('#view-gio').hidden = true;
  $('#thanh-cong-cu').hidden = true;
  veNha();
  capNhatDau();
}

function moCay(gp, v) {
  const doiGP = S.gp !== gp;
  if (doiGP) {
    S.gp = gp;
    S.thuGon.clear();
    S.chon = null;
    S.daVua = false;
    $('#chi-tiet').hidden = true;
  }
  datMau(S.gpTheoId.get(gp));
  lapChiMuc();
  $('#view-nha').hidden = true;
  $('#thanh-cong-cu').hidden = false;
  datView(v);
  capNhatDau();
  capNhatThongKe();
  capNhatChipGP();
  if (S.choChon) {
    const id = S.choChon;
    S.choChon = null;
    if (S.theoId.has(id)) requestAnimationFrame(() => chonVaDen(id));
  }
}

function datView(v) {
  S.view = v;
  $$('.tabs button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.view === v)));
  $('#view-cay').hidden = v !== 'cay';
  $('#view-gio').hidden = v !== 'gio';
  $('.loc').hidden = v !== 'cay';
  if (v === 'gio') {
    S.chon = null;
    $('#chi-tiet').hidden = true;
    veGio();
  } else {
    veCay();
    if (S.chon) moChiTiet(S.chon);
    if (!S.daVua && S.ds.length) { S.daVua = true; requestAnimationFrame(() => vuaKhung(false)); }
  }
}

/* =========================================================
   Giao diện chung
   ========================================================= */
function capNhatDau() {
  const g = S.view !== 'nha' ? S.gpTheoId.get(S.gp) : null;
  if (g) {
    $('#tieu-de-nho').textContent = g.nhan || '';
    $('#ten-dong-ho').textContent = `Gia phả ${g.ten}`;
    $('#phu-de').textContent = g.phuDe || '';
    document.title = `Gia phả ${g.ten}`;
  } else {
    const n = S.tatCa.length;
    $('#tieu-de-nho').textContent = '';
    $('#ten-dong-ho').textContent = 'Tủ gia phả';
    $('#phu-de').textContent = S.gps.length ? `${S.gps.length} cuốn gia phả, ${n} người` : '';
    document.title = 'Tủ gia phả';
  }
  $('#ve-nha').setAttribute('aria-label', 'Về tủ gia phả');
}

function capNhatChipGP() {
  const c = $('#chon-gp');
  if (S.gps.length < 2) { c.hidden = true; c.innerHTML = ''; return; }
  c.hidden = false;
  c.innerHTML = `<button type="button" class="chip-nha" data-ve-nha aria-label="Về tủ gia phả" title="Tủ gia phả">
      <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path d="M4 5h6v14H4zM10 5h4v14h-4zM15 6.2l3.8-1 3 13.6-3.8 1z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>
    </button>${S.gps.map(g =>
    `<button type="button" class="chip-gp" data-mo-gp="${esc(g.id)}" aria-pressed="${g.id === S.gp}" style="--mau:${mauGP(g).c}" title="Gia phả ${esc(g.ten)}">${esc(tenNganGP(g))}</button>`
  ).join('')}`;
}

function hienTrong() {
  const t = $('#trong');
  const g = S.gpTheoId.get(S.gp);
  if (S.loiTai) {
    t.innerHTML = `<div><h2>Không tải được gia phả</h2><p>${esc(S.loiTai)}</p></div>`;
    t.hidden = false;
  } else if (!S.ds.length) {
    const ten = g ? g.ten : '';
    t.innerHTML = S.suaDuoc
      ? `<div><h2>Gia phả ${esc(ten)} chưa có ai</h2><p>Thêm người đứng đầu dòng họ, sau đó thêm con cháu từ thẻ của từng người.</p><button type="button" class="nut nut-chinh" data-them-goc>Thêm cụ tổ</button></div>`
      : `<div><h2>Gia phả ${esc(ten)} chưa có ai</h2><p>Bấm “Chỉnh sửa” ở góc trên và nhập mật khẩu dòng họ để thêm người đầu tiên.</p></div>`;
    t.hidden = false;
  } else {
    t.hidden = true;
  }
}

function capNhatThongKe() {
  const song = S.ds.filter(p => !p.daMat).length;
  const soDoi = S.doi.size ? Math.max(...S.doi.values()) : 0;
  $('#thong-ke').innerHTML = S.ds.length
    ? `<span><b>${S.ds.length}</b> người</span><span><b>${soDoi}</b> đời</span><span><b>${song}</b> còn sống</span><span><b>${S.ds.length - song}</b> đã mất</span>`
    : '';
}

function veLai() {
  if (!S.daTaiGP || !S.daTaiTV) return;
  if (S.view === 'nha' || !S.view) { if (S.view === 'nha') { veNha(); capNhatDau(); } return; }
  if (!S.gpTheoId.has(S.gp)) { diToi(null); return; }
  datMau(S.gpTheoId.get(S.gp));
  lapChiMuc();
  if (S.chon && !S.theoId.has(S.chon)) { S.chon = null; $('#chi-tiet').hidden = true; }
  capNhatThongKe();
  capNhatChipGP();
  capNhatDau();
  if (S.view === 'cay') veCay(); else veGio();
  if (S.chon) moChiTiet(S.chon);
  if (!S.daVua && S.ds.length && S.view === 'cay') { S.daVua = true; requestAnimationFrame(() => vuaKhung(false)); }
}

function capNhatCheDoSua() {
  document.body.classList.toggle('dang-sua', S.suaDuoc);
  $('#nut-sua').textContent = S.suaDuoc ? 'Thoát chỉnh sửa' : 'Chỉnh sửa';
  $('#nut-them').hidden = !S.suaDuoc;
  $('#nut-sua-gp').hidden = !S.suaDuoc;
  if (S.view === 'nha') veNha();
  else if (S.view) { hienTrong(); if (S.chon) moChiTiet(S.chon); }
}

let henGioTB;
function thongBao(msg, loi = false) {
  const t = $('#thong-bao');
  t.textContent = msg;
  t.classList.toggle('loi-tb', loi);
  t.classList.add('hien');
  clearTimeout(henGioTB);
  henGioTB = setTimeout(() => t.classList.remove('hien'), loi ? 6000 : 2600);
}

const loiGhi = e => (e && e.code === 'permission-denied'
  ? 'Firebase không cho lưu. Cập nhật Rules theo hướng dẫn, hoặc bấm “Thoát chỉnh sửa” rồi nhập lại mật khẩu.'
  : 'Không lưu được. Kiểm tra kết nối mạng rồi thử lại.');

function loiDangNhap(e) {
  const c = e && e.code;
  if (['auth/invalid-credential', 'auth/wrong-password', 'auth/invalid-login-credentials', 'auth/user-not-found', 'auth/missing-password'].includes(c))
    return 'Sai mật khẩu. Kiểm tra lại rồi thử lần nữa.';
  if (c === 'auth/too-many-requests') return 'Nhập sai quá nhiều lần. Đợi vài phút rồi thử lại.';
  if (c === 'auth/network-request-failed') return 'Không có kết nối mạng. Kiểm tra mạng rồi thử lại.';
  return `Không mở được chỉnh sửa (${c || 'lỗi không rõ'}).`;
}

/* =========================================================
   Form thêm / sửa người
   ========================================================= */
const F = () => $('#form-nguoi');

function moForm({ mode, id = null, parentId = '', parent2Id = '', spouseOf = null }) {
  const f = F();
  f.reset();
  $$('[aria-invalid]', f).forEach(x => x.removeAttribute('aria-invalid'));
  $('#form-loi').textContent = '';
  const p = id ? S.theoId.get(id) : null;
  if (p && mode === 'spouse') spouseOf = p.spouseOf;
  if (p && mode === 'blood') { parentId = p.parentId || ''; parent2Id = p.parent2Id || ''; }
  S.form = { mode, id, spouseOf, anhMoi: null, boAnh: false };
  $('#loi-anh').textContent = '';
  veXemAnh(p ? anhNhoCua(p) || null : null);
  if (p && (p.coAnh || p.anh)) {
    layAnhNguoi(p).then(src => { if (S.form && S.form.id === id && !S.form.anhMoi && !S.form.boAnh) veXemAnh(src); }).catch(() => {});
  }

  const ban = spouseOf ? S.theoId.get(spouseOf) : null;
  const cha = parentId ? S.theoId.get(parentId) : null;
  $('#form-tieu-de').textContent = p ? 'Sửa thông tin' : mode === 'spouse' ? `Thêm ${ban ? nhanVC(ban).toLowerCase() : 'vợ/chồng'}` : cha ? 'Thêm con' : 'Thêm người';
  $('#form-phu').textContent = mode === 'spouse' && ban ? `${nhanVC(ban)} của ${ban.ten}` : (!p && cha ? `Con của ${cha.ten}` : '');

  if (p) {
    f.ten.value = p.ten || '';
    f.namSinh.value = p.namSinh || '';
    f.namMat.value = p.namMat || '';
    f.ngayGio.value = p.ngayGio || '';
    f.noiAnTang.value = p.noiAnTang || '';
    f.ghiChu.value = p.ghiChu || '';
  }
  const gt = p ? (p.gioiTinh || 'nam') : (ban ? (ban.gioiTinh === 'nu' ? 'nam' : 'nu') : 'nam');
  f.querySelector(`[name="gioiTinh"][value="${gt}"]`).checked = true;
  f.querySelector(`[name="tinhTrang"][value="${p && p.daMat ? 'mat' : 'song'}"]`).checked = true;

  $('#nhom-cha-me').hidden = mode === 'spouse';
  if (mode === 'blood') {
    dienChonCha(id);
    f.parentId.value = parentId && S.theoId.has(parentId) ? parentId : '';
    capNhatChonCha2(parent2Id);
    capNhatChonThuTu();
  }
  dienChonLienKet(mode === 'spouse' ? (p && p.lienKet) || '' : null);
  capNhatNhomMat();
  $('#hop-form').showModal();
  setTimeout(() => f.ten.focus(), 30);
}

function dienChonLienKet(giaTri) {
  const sel = F().lienKet;
  const khac = S.gps.filter(g => g.id !== S.gp);
  const hien = giaTri !== null && khac.length > 0;
  $('#nhan-lien-ket').hidden = !hien;
  sel.replaceChildren(new Option('Không', ''));
  if (!hien) return;
  for (const g of khac) {
    const ds = S.tatCa.filter(x => gpCua(x) === g.id && !x.spouseOf).sort((a, b) => a.ten.localeCompare(b.ten, 'vi'));
    if (!ds.length) continue;
    const og = document.createElement('optgroup');
    og.label = `Gia phả ${g.ten}${g.nhan ? ' (' + g.nhan.toLowerCase() + ')' : ''}`;
    ds.forEach(x => og.appendChild(new Option(`${x.ten}${x.namSinh ? ', ' + x.namSinh : ''}`, x.id)));
    sel.appendChild(og);
  }
  sel.value = giaTri && S.tatCaTheoId.has(giaTri) ? giaTri : '';
}

function dienChonCha(dangSuaId) {
  const sel = F().parentId;
  const loaiTru = dangSuaId ? hauDue(dangSuaId) : new Set();
  if (dangSuaId) loaiTru.add(dangSuaId);
  const ds = S.ds.filter(p => !p.spouseOf && !loaiTru.has(p.id))
    .sort((a, b) => (S.doi.get(a.id) || 99) - (S.doi.get(b.id) || 99) || a.ten.localeCompare(b.ten, 'vi'));
  sel.replaceChildren(new Option('Không có (người đứng đầu dòng họ)', ''));
  ds.forEach(p => sel.add(new Option(`${p.ten} (đời ${S.doi.get(p.id) || '?'}${p.namSinh ? ', ' + p.namSinh : ''})`, p.id)));
}

function capNhatChonCha2(giaTri = '') {
  const f = F();
  const pid = f.parentId.value;
  const cha = S.theoId.get(pid);
  const vcs = pid ? (S.voChongCua.get(pid) || []) : [];
  $('#nhan-cha-me-2').hidden = !vcs.length;
  $('#chu-cha-me-2').textContent = cha && cha.gioiTinh === 'nu' ? 'Cha' : 'Mẹ';
  f.parent2Id.replaceChildren(new Option('Không rõ', ''));
  vcs.forEach(v => f.parent2Id.add(new Option(v.ten, v.id)));
  f.parent2Id.value = giaTri && vcs.some(v => v.id === giaTri) ? giaTri : (vcs.length === 1 ? vcs[0].id : '');
}

function capNhatChonThuTu() {
  const f = F();
  const pid = f.parentId.value, dangSua = S.form && S.form.id;
  const ds = pid ? (S.conCua.get(pid) || []).filter(c => c.id !== dangSua) : [];
  $('#nhan-thu-tu').hidden = !ds.length;
  f.viTri.replaceChildren();
  if (!ds.length) return;
  for (let i = 0; i <= ds.length; i++) {
    const t = i === 0 ? `Con cả (trước ${ds[0].ten})`
      : i === ds.length ? `Con út, thứ ${i + 1} (sau ${ds[i - 1].ten})`
      : `Con thứ ${i + 1} (sau ${ds[i - 1].ten}, trước ${ds[i].ten})`;
    f.viTri.add(new Option(t, String(i)));
  }
  let macDinh = ds.length;
  if (dangSua) {
    const idx = (S.conCua.get(pid) || []).findIndex(c => c.id === dangSua);
    if (idx >= 0) macDinh = idx;
  }
  f.viTri.value = String(macDinh);
}

function veXemAnh(src) {
  const o = $('#xem-anh');
  o.innerHTML = src ? `<img src="${esc(src)}" alt="Ảnh đã chọn">` : '<svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><circle cx="12" cy="9" r="4" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M4.5 20c1.4-3.6 4.2-5.4 7.5-5.4s6.1 1.8 7.5 5.4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  $('#nut-chon-anh').textContent = src ? 'Đổi ảnh' : 'Chọn ảnh';
  $('#nut-bo-anh').hidden = !src;
}

async function chonAnh(file) {
  $('#loi-anh').textContent = '';
  if (!file) return;
  $('#nut-chon-anh').textContent = 'Đang xử lý…';
  try {
    const d = await taoAnh(file, { max: 640 });
    S.form.anhMoi = d; S.form.boAnh = false;
    veXemAnh(d);
  } catch (err) {
    console.error(err);
    $('#loi-anh').textContent = 'Không đọc được ảnh này. Hãy chọn ảnh JPG hoặc PNG.';
    veXemAnh(S.form.anhMoi);
  }
}

function capNhatNhomMat() {
  $('#nhom-mat').hidden = F().querySelector('[name="tinhTrang"]:checked').value !== 'mat';
}

async function luuForm(e) {
  e.preventDefault();
  const f = F();
  const v = n => (f.elements[n].value || '').trim();
  const loi = (msg, truong) => {
    $('#form-loi').textContent = msg;
    if (truong) { f.elements[truong].setAttribute('aria-invalid', 'true'); f.elements[truong].focus(); }
  };
  $$('[aria-invalid]', f).forEach(x => x.removeAttribute('aria-invalid'));

  const ten = v('ten').replace(/\s+/g, ' ');
  if (!ten) return loi('Nhập họ và tên.', 'ten');
  const namSinh = docNam(v('namSinh'));
  if (namSinh === false) return loi('Năm sinh ghi bằng 4 chữ số, ví dụ 1950.', 'namSinh');
  const daMat = f.querySelector('[name="tinhTrang"]:checked').value === 'mat';
  let namMat = null, ngayGio = '', noiAnTang = '';
  if (daMat) {
    namMat = docNam(v('namMat'));
    if (namMat === false) return loi('Năm mất ghi bằng 4 chữ số, ví dụ 1990.', 'namMat');
    if (namSinh && namMat && namMat < namSinh) return loi('Năm mất đang trước năm sinh. Kiểm tra lại hai năm này.', 'namMat');
    ngayGio = v('ngayGio');
    if (ngayGio && !docNgayGio(ngayGio)) return loi('Ngày giỗ ghi theo dạng ngày/tháng âm lịch, ví dụ 15/7.', 'ngayGio');
    noiAnTang = v('noiAnTang');
  }

  const { mode, id, spouseOf, anhMoi, boAnh } = S.form;
  const cu = id ? S.theoId.get(id) : null;
  const laMau = mode === 'blood';
  const o = {
    ten, gioiTinh: f.querySelector('[name="gioiTinh"]:checked').value,
    namSinh, daMat, namMat, ngayGio, noiAnTang, ghiChu: v('ghiChu'),
    anh: boAnh ? '' : (cu && cu.anh) || '',
    giaPhaId: cu ? gpCua(cu) : S.gp,
    parentId: laMau ? (f.parentId.value || null) : null,
    parent2Id: laMau && f.parentId.value ? (f.parent2Id.value || null) : null,
    spouseOf: laMau ? null : spouseOf,
    lienKet: laMau ? null : (f.lienKet.value || null)
  };

  const nut = $('#form-luu');
  nut.disabled = true; nut.textContent = 'Đang lưu…';
  try {
    let moiId = id;
    const viTri = laMau && o.parentId && !$('#nhan-thu-tu').hidden ? +f.viTri.value : null;
    const anhChiEm = viTri !== null ? (S.conCua.get(o.parentId) || []).filter(c => c.id !== id).map(c => c.id) : null;
    if (id) {
      if (boAnh) { o.coAnh = false; o.anhV = null; o.anhNho = null; }
      await kho.sua('members', id, o);
    } else {
      moiId = await kho.them('members', { ...o, coAnh: false });
    }
    if (anhChiEm) {
      const ids = anhChiEm.filter(x => x !== moiId);
      ids.splice(Math.min(viTri, ids.length), 0, moiId);
      await luuThuTu(ids);
    }
    let loiAnh = null;
    if (anhMoi) {
      try {
        await kho.dat('anh', moiId, { data: anhMoi });
        const v2 = Date.now();
        S.anh.set(moiId, { v: v2, data: anhMoi });
        const anhNho = await taoAnh(anhMoi, { max: 120, vuong: true, q: 0.8 });
        await kho.sua('members', moiId, { coAnh: true, anhV: v2, anhNho });
      } catch (err) { console.error(err); loiAnh = err; }
    } else if (boAnh && cu && cu.coAnh) {
      kho.xoa([{ n: 'anh', id }]).catch(err => console.error(err));
      S.anh.delete(id);
    }
    $('#hop-form').close();
    if (loiAnh) {
      thongBao(loiAnh.code === 'permission-denied'
        ? 'Đã lưu thông tin nhưng chưa lưu được ảnh: cần cập nhật Rules trong Firebase.'
        : loiAnh.code === 'bo-nho-day' ? 'Đã lưu thông tin nhưng bộ nhớ bản thử đã đầy, không lưu thêm ảnh được.'
        : 'Đã lưu thông tin nhưng chưa lưu được ảnh. Thử chọn lại ảnh sau.', true);
    } else {
      thongBao(id ? 'Đã lưu thay đổi' : `Đã thêm ${ten}`);
    }
    if (!id) denVaChon(moiId); else moChiTiet(id);
  } catch (err) {
    console.error(err);
    loi(loiGhi(err));
  } finally {
    nut.disabled = false; nut.textContent = 'Lưu';
  }
}

async function doiThuTu(conId, buoc) {
  const ids = (S.conCua.get(S.chon) || []).map(c => c.id);
  const i = ids.indexOf(conId), j = i + buoc;
  if (i < 0 || j < 0 || j >= ids.length) return;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  try {
    await luuThuTu(ids);
    const ten = S.theoId.get(conId)?.ten || '';
    thongBao(`${ten} giờ là ${nhanThuTu(j, ids.length).toLowerCase()}`);
    requestAnimationFrame(() => $(`#chi-tiet [data-${buoc < 0 ? 'len' : 'xuong'}="${CSS.escape(conId)}"]:not(.an)`)?.focus());
  } catch (err) {
    console.error(err);
    thongBao(loiGhi(err), true);
  }
}

async function xoaNguoi(id) {
  const p = S.theoId.get(id);
  if (!p) return;
  const con = p.spouseOf ? [] : (S.conCua.get(id) || []);
  if (con.length) {
    thongBao(`${p.ten} còn ${con.length} người con trong cây. Xóa hoặc chuyển các con sang người khác trước.`, true);
    return;
  }
  const vc = p.spouseOf ? [] : (S.voChongCua.get(id) || []);
  const hoi = vc.length
    ? `Xóa ${p.ten} cùng ${vc.length} người ${nhanVC(p).toLowerCase()} khỏi gia phả? Việc này không hoàn tác được.`
    : `Xóa ${p.ten} khỏi gia phả? Việc này không hoàn tác được.`;
  if (!window.confirm(hoi)) return;
  try {
    const tatCa = [p, ...vc];
    await kho.xoa([
      ...tatCa.map(x => ({ n: 'members', id: x.id })),
      ...tatCa.filter(x => x.coAnh).map(x => ({ n: 'anh', id: x.id }))
    ]);
    dongChiTiet();
    thongBao(`Đã xóa ${p.ten}`);
  } catch (err) {
    console.error(err);
    thongBao(loiGhi(err), true);
  }
}

/* =========================================================
   Form thêm / sửa cuốn gia phả
   ========================================================= */
function moFormGP(id) {
  const f = $('#form-gp');
  f.reset();
  $('#gp-loi').textContent = '';
  const g = id ? S.gpTheoId.get(id) : null;
  S.formGP = { id };
  $('#gp-tieu-de').textContent = g ? `Sửa gia phả ${g.ten}` : 'Thêm gia phả';
  const daDung = new Set(S.gps.map(x => x.mau));
  const mauMoi = Object.keys(MAU).find(k => !daDung.has(k)) || 'son';
  f.ten.value = g ? g.ten : '';
  f.nhan.value = g ? g.nhan || '' : (S.gps.length === 1 ? 'Bên ngoại' : '');
  f.phuDe.value = g ? g.phuDe || '' : '';
  const m = g ? (MAU[g.mau] ? g.mau : 'son') : mauMoi;
  f.querySelector(`[name="mau"][value="${m}"]`).checked = true;
  $('#gp-xoa').hidden = !g;
  $('#hop-gp').showModal();
  setTimeout(() => f.ten.focus(), 30);
}

async function luuGP(e) {
  e.preventDefault();
  const f = e.target;
  const ten = f.ten.value.trim().replace(/\s+/g, ' ');
  if (!ten) { $('#gp-loi').textContent = 'Nhập tên dòng họ, ví dụ: Họ Đinh.'; f.ten.focus(); return; }
  const o = { ten, nhan: f.nhan.value.trim(), phuDe: f.phuDe.value.trim(), mau: f.querySelector('[name="mau"]:checked').value, an: false };
  const nut = f.querySelector('[type="submit"]');
  nut.disabled = true;
  try {
    let id = S.formGP.id;
    if (id) {
      const g = S.gpTheoId.get(id);
      await kho.dat('giaPha', id, { ...o, thuTu: g ? g.thuTu ?? 0 : 0 });
    } else {
      o.thuTu = Math.max(0, ...S.gps.map(g => g.thuTu ?? 0)) + 1;
      // Lưu bìa gia phả gốc lần đầu để thứ tự không đổi
      if (S.gpTheoId.get(GP_GOC)?.ao) {
        const goc = S.gpTheoId.get(GP_GOC);
        await kho.dat('giaPha', GP_GOC, { ten: goc.ten, nhan: goc.nhan || '', phuDe: goc.phuDe || '', mau: goc.mau || 'son', thuTu: 0 });
      }
      id = await kho.them('giaPha', o);
    }
    $('#hop-gp').close();
    thongBao(S.formGP.id ? 'Đã lưu gia phả' : `Đã thêm gia phả ${ten}`);
    if (!S.formGP.id) diToi(id, 'cay');
  } catch (err) {
    console.error(err);
    $('#gp-loi').textContent = loiGhi(err);
  } finally {
    nut.disabled = false;
  }
}

async function xoaGP() {
  const id = S.formGP && S.formGP.id;
  const g = id && S.gpTheoId.get(id);
  if (!g) return;
  const n = S.tatCa.filter(p => gpCua(p) === id).length;
  if (n) { $('#gp-loi').textContent = `Gia phả này còn ${n} người. Xóa hết người trong cây trước khi xóa gia phả.`; return; }
  if (!window.confirm(`Xóa gia phả ${g.ten}?`)) return;
  try {
    if (id === GP_GOC) await kho.dat('giaPha', id, { an: true, ten: g.ten });
    else await kho.xoa([{ n: 'giaPha', id }]);
    $('#hop-gp').close();
    thongBao(`Đã xóa gia phả ${g.ten}`);
    diToi(null);
  } catch (err) {
    console.error(err);
    $('#gp-loi').textContent = loiGhi(err);
  }
}

/* =========================================================
   Gắn sự kiện
   ========================================================= */
function ganSuKien() {
  window.addEventListener('hashchange', apDungHash);

  // Điều hướng giữa các gia phả
  document.addEventListener('click', e => {
    const mo = e.target.closest('[data-mo-gp]');
    if (mo) { diToi(mo.dataset.moGp, S.view === 'gio' && S.gp ? 'gio' : 'cay'); return; }
    if (e.target.closest('[data-ve-nha]')) { diToi(null); return; }
    if (e.target.closest('[data-them-gp]')) moFormGP(null);
  });
  $('#ve-nha').addEventListener('click', () => diToi(null));

  // Tabs & lọc
  $$('.tabs button').forEach(b => b.addEventListener('click', () => diToi(S.gp, b.dataset.view)));
  $$('.loc button').forEach(b => b.addEventListener('click', () => {
    S.loc = b.dataset.loc;
    $$('.loc button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    veCay();
  }));

  // Tìm kiếm (trong mọi gia phả)
  const o = $('#tim'), kq = $('#ket-qua');
  const dongKQ = () => { kq.hidden = true; };
  o.addEventListener('input', () => {
    const q = boDau(o.value.trim());
    if (!q) return dongKQ();
    const ds = S.tatCa.filter(p => S.gpTheoId.has(gpCua(p)) && boDau(p.ten).includes(q))
      .sort((a, b) => (gpCua(a) === S.gp ? 0 : 1) - (gpCua(b) === S.gp ? 0 : 1))
      .slice(0, 10);
    kq.innerHTML = ds.length
      ? ds.map(p => `<li><button type="button" data-id="${esc(p.id)}"><span>${esc(p.ten)}</span><small>${esc(moTaTim(p))}</small></button></li>`).join('')
      : '<li class="khong">Không tìm thấy ai có tên này</li>';
    kq.hidden = false;
  });
  o.addEventListener('keydown', e => {
    if (e.key === 'Escape') { dongKQ(); o.blur(); }
    if (e.key === 'Enter') { const b = kq.querySelector('button'); if (b) b.click(); }
    if (e.key === 'ArrowDown') { const b = kq.querySelector('button'); if (b) { e.preventDefault(); b.focus(); } }
  });
  kq.addEventListener('click', e => {
    const b = e.target.closest('button[data-id]');
    if (!b) return;
    dongKQ(); o.value = '';
    denVaChon(b.dataset.id);
  });
  kq.addEventListener('keydown', e => {
    const b = e.target.closest('li');
    if (e.key === 'ArrowDown') { e.preventDefault(); b?.nextElementSibling?.querySelector('button')?.focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); const t = b?.previousElementSibling?.querySelector('button'); t ? t.focus() : o.focus(); }
    if (e.key === 'Escape') { dongKQ(); o.focus(); }
  });
  document.addEventListener('click', e => { if (!e.target.closest('.tim')) dongKQ(); });

  // Chi tiết
  $('#chi-tiet').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.classList.contains('dong')) return dongChiTiet();
    if (b.dataset.den) return denVaChon(b.dataset.den);
    if (b.hasAttribute('data-xem-anh')) {
      const img = b.querySelector('img');
      if (!img) return;
      $('#anh-lon').src = img.src;
      $('#anh-lon-ten').textContent = S.theoId.get(S.chon)?.ten || '';
      $('#hop-anh').showModal();
      return;
    }
    if ((b.dataset.len || b.dataset.xuong) && S.suaDuoc) return doiThuTu(b.dataset.len || b.dataset.xuong, b.dataset.len ? -1 : 1);
    const id = S.chon, p = S.theoId.get(id);
    if (!p || !S.suaDuoc) return;
    const hd = b.dataset.hd;
    if (hd === 'sua') moForm({ mode: p.spouseOf ? 'spouse' : 'blood', id });
    if (hd === 'them-con') moForm(p.spouseOf ? { mode: 'blood', parentId: p.spouseOf, parent2Id: p.id } : { mode: 'blood', parentId: id });
    if (hd === 'them-vc') moForm({ mode: 'spouse', spouseOf: id });
    if (hd === 'xoa') xoaNguoi(id);
  });
  $('#hop-anh').addEventListener('click', () => $('#hop-anh').close());
  $('#view-gio').addEventListener('click', e => {
    const b = e.target.closest('button[data-den]');
    if (b) denVaChon(b.dataset.den);
  });
  $('#trong').addEventListener('click', e => {
    if (e.target.closest('[data-them-goc]')) moForm({ mode: 'blood' });
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !document.querySelector('dialog[open]') && !$('#chi-tiet').hidden && document.activeElement !== o) dongChiTiet();
  });

  // Chỉnh sửa
  $('#nut-sua').addEventListener('click', async () => {
    if (S.suaDuoc) {
      await kho.dangXuat();
      thongBao('Đã thoát chỉnh sửa');
      return;
    }
    const f = $('#form-mk');
    f.reset();
    $('#mk-loi').textContent = '';
    $('#hop-mat-khau').showModal();
    setTimeout(() => f.mk.focus(), 30);
  });
  $('#form-mk').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target, nut = f.querySelector('[type="submit"]');
    const mk = f.mk.value;
    if (!mk) { $('#mk-loi').textContent = 'Nhập mật khẩu trước.'; return; }
    nut.disabled = true;
    try {
      await kho.dangNhap(mk);
      $('#hop-mat-khau').close();
      thongBao('Đã mở chỉnh sửa. Bấm vào một người để thêm con, vợ/chồng hoặc sửa.');
    } catch (err) {
      $('#mk-loi').textContent = loiDangNhap(err);
    } finally {
      nut.disabled = false;
    }
  });
  $('#nut-them').addEventListener('click', () => moForm({ mode: 'blood', parentId: S.chon && !S.theoId.get(S.chon)?.spouseOf ? S.chon : '' }));
  $('#nut-sua-gp').addEventListener('click', () => moFormGP(S.gp));

  // Ảnh
  $('#file-anh').addEventListener('change', e => { chonAnh(e.target.files[0]); e.target.value = ''; });
  $('#nut-bo-anh').addEventListener('click', () => { S.form.anhMoi = null; S.form.boAnh = true; veXemAnh(null); });

  // Form
  $('#form-nguoi').addEventListener('submit', luuForm);
  $('#form-nguoi').addEventListener('input', e => { if (e.target.hasAttribute('aria-invalid')) e.target.removeAttribute('aria-invalid'); });
  $$('[name="tinhTrang"]').forEach(r => r.addEventListener('change', capNhatNhomMat));
  F().parentId.addEventListener('change', () => { capNhatChonCha2(); capNhatChonThuTu(); });
  $('#form-gp').addEventListener('submit', luuGP);
  $('#gp-xoa').addEventListener('click', xoaGP);
  $$('[data-huy]').forEach(b => b.addEventListener('click', () => b.closest('dialog').close()));
}

/* =========================================================
   Khởi động
   ========================================================= */
async function khoiDong() {
  ganSuKien();

  if (!window.d3) {
    S.loiTai = 'Không tải được thư viện vẽ cây. Kiểm tra kết nối mạng rồi tải lại trang.';
    $('#thanh-cong-cu').hidden = false;
    hienTrong();
    return;
  }
  khoiCay();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (S.view === 'cay') veCay(); });

  try {
    kho = CONFIG.firebase && CONFIG.firebase.apiKey ? await khoFirebase() : khoThu();
  } catch (err) {
    console.error(err);
    S.loiTai = 'Không kết nối được Firebase. Kiểm tra mạng và phần firebase trong file config.js.';
    $('#thanh-cong-cu').hidden = false;
    $('#view-cay').hidden = false;
    hienTrong();
    return;
  }

  if (kho.thu) {
    const b = $('#bang-demo');
    b.textContent = `Bản thử: dữ liệu mẫu, chỉ lưu trên máy này. Mật khẩu chỉnh sửa thử: ${CONFIG.demoPassword}`;
    b.hidden = false;
  }

  kho.theoDoiQuyen(ok => { S.suaDuoc = ok; capNhatCheDoSua(); });

  const xongTai = () => {
    lapDanhSachGP();
    lapChiMucChung();
    if (!S.view) apDungHash(); else veLai();
  };
  kho.theoDoi('giaPha', ds => {
    S.gpDocs = ds;
    S.daTaiGP = true;
    S.loiQuyenGP = false;
    xongTai();
  }, err => {
    // Rules cũ chưa cho đọc "giaPha": vẫn chạy với một gia phả mặc định
    console.error(err);
    S.gpDocs = [];
    S.daTaiGP = true;
    S.loiQuyenGP = true;
    xongTai();
  });
  kho.theoDoi('members', ds => {
    S.loiTai = '';
    S.tatCa = ds.filter(p => p && p.ten);
    S.daTaiTV = true;
    xongTai();
  }, err => {
    console.error(err);
    S.loiTai = err && err.code === 'permission-denied'
      ? 'Firebase chặn quyền đọc. Kiểm tra lại phần Rules của Firestore theo hướng dẫn.'
      : 'Không đọc được dữ liệu. Kiểm tra kết nối mạng rồi tải lại trang.';
    S.daTaiTV = true;
    $('#thanh-cong-cu').hidden = false;
    $('#view-cay').hidden = false;
    hienTrong();
  });
}

khoiDong();

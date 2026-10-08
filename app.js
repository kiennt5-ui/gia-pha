import { CONFIG } from './config.js';

/* =========================================================
   Tiện ích
   ========================================================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const boDau = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
const cat = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
const giamChuyenDong = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const THOI_GIAN = giamChuyenDong ? 0 : 450;
const TEN_THANG = ['Giêng', 'Hai', 'Ba', 'Tư', 'Năm', 'Sáu', 'Bảy', 'Tám', 'Chín', 'Mười', 'Mười một', 'Chạp'];

// Kích thước thẻ trong cây
const W = 200, GAPX = 28, GAPY = 58, H0 = 62, HV = 22;

/* =========================================================
   Kho dữ liệu: Firebase (thật) hoặc bản thử (lưu trên máy)
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
  const bang = fs.collection(db, 'members');
  const emailSua = String(CONFIG.editorEmail || '').toLowerCase();

  return {
    thu: false,
    theoDoi(cb, loi) {
      return fs.onSnapshot(bang, s => cb(s.docs.map(d => ({ ...d.data(), id: d.id }))), loi);
    },
    async them(o) {
      const r = await fs.addDoc(bang, { ...o, taoLuc: fs.serverTimestamp() });
      return r.id;
    },
    async sua(id, o) {
      await fs.updateDoc(fs.doc(db, 'members', id), { ...o, suaLuc: fs.serverTimestamp() });
    },
    async suaNhieu(ds) {
      const b = fs.writeBatch(db);
      ds.forEach(({ id, data }) => b.update(fs.doc(db, 'members', id), data));
      await b.commit();
    },
    async xoa(ids) {
      const b = fs.writeBatch(db);
      ids.forEach(id => b.delete(fs.doc(db, 'members', id)));
      await b.commit();
    },
    dangNhap: mk => au.signInWithEmailAndPassword(auth, CONFIG.editorEmail, mk),
    dangXuat: () => au.signOut(auth),
    theoDoiQuyen(cb) {
      au.onAuthStateChanged(auth, u => cb(!!u && String(u.email || '').toLowerCase() === emailSua));
    }
  };
}

function khoThu() {
  const KHOA = 'gia-pha-ban-thu';
  let ds = null;
  try { ds = JSON.parse(localStorage.getItem(KHOA)); } catch { /* bỏ qua */ }
  if (!Array.isArray(ds)) ds = duLieuMau();
  let suaDuoc = false;
  try { suaDuoc = sessionStorage.getItem(KHOA + '-sua') === '1'; } catch { /* bỏ qua */ }
  const nghe = [], ngheQuyen = [];
  const phat = () => nghe.forEach(f => f(ds.map(p => ({ ...p }))));
  const luu = () => {
    try { localStorage.setItem(KHOA, JSON.stringify(ds)); } catch { /* bỏ qua */ }
    phat();
  };
  const datQuyen = v => {
    suaDuoc = v;
    try { sessionStorage.setItem(KHOA + '-sua', v ? '1' : '0'); } catch { /* bỏ qua */ }
    ngheQuyen.forEach(f => f(v));
  };
  return {
    thu: true,
    theoDoi(cb) { nghe.push(cb); cb(ds.map(p => ({ ...p }))); },
    async them(o) {
      const id = 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      ds.push({ ...o, id }); luu(); return id;
    },
    async sua(id, o) { ds = ds.map(p => (p.id === id ? { ...p, ...o, id } : p)); luu(); },
    async suaNhieu(ls) {
      const m = new Map(ls.map(x => [x.id, x.data]));
      ds = ds.map(p => (m.has(p.id) ? { ...p, ...m.get(p.id), id: p.id } : p)); luu();
    },
    async xoa(ids) { ds = ds.filter(p => !ids.includes(p.id)); luu(); },
    async dangNhap(mk) {
      if (mk !== String(CONFIG.demoPassword)) throw { code: 'auth/invalid-credential' };
      datQuyen(true);
    },
    async dangXuat() { datQuyen(false); },
    theoDoiQuyen(cb) { ngheQuyen.push(cb); cb(suaDuoc); }
  };
}

function duLieuMau() {
  const p = (id, ten, gioiTinh, namSinh, extra = {}) => ({
    id, ten, gioiTinh, namSinh, daMat: false, namMat: null, ngayGio: '', noiAnTang: '',
    parentId: null, parent2Id: null, spouseOf: null, anh: '', ghiChu: '', ...extra
  });
  const mat = (namMat, ngayGio, noiAnTang = '') => ({ daMat: true, namMat, ngayGio, noiAnTang });
  return [
    p('n1', 'Nguyễn Văn Thành', 'nam', 1898, { ...mat(1965, '12/3', 'Nghĩa trang làng Phú Thọ'), ghiChu: 'Cụ tổ đời thứ nhất, dựng nhà thờ họ năm 1932.' }),
    p('n2', 'Trần Thị Lựu', 'nu', 1902, { ...mat(1978, '20/10', 'Nghĩa trang làng Phú Thọ'), spouseOf: 'n1' }),
    p('n3', 'Nguyễn Văn Hòa', 'nam', 1925, { ...mat(1992, '8/1'), parentId: 'n1' }),
    p('n4', 'Lê Thị Mai', 'nu', 1930, { ...mat(2010, '15/7'), spouseOf: 'n3' }),
    p('n5', 'Nguyễn Thị Hiền', 'nu', 1929, { ...mat(2018, '24/12'), parentId: 'n1' }),
    p('n6', 'Nguyễn Văn Phúc', 'nam', 1933, { ...mat(2001, '3/5'), parentId: 'n1' }),
    p('n7', 'Phạm Thị Lan', 'nu', 1936, { spouseOf: 'n6' }),
    p('n8', 'Đỗ Thị Hạnh', 'nu', 1940, { ...mat(1999, '27/9'), spouseOf: 'n6' }),
    p('n9', 'Nguyễn Văn Đức', 'nam', 1952, { parentId: 'n3' }),
    p('n10', 'Hoàng Thị Thu', 'nu', 1955, { spouseOf: 'n9' }),
    p('n11', 'Nguyễn Văn Tài', 'nam', 1958, { ...mat(2020, '2/2'), parentId: 'n3' }),
    p('n12', 'Nguyễn Thị Hương', 'nu', 1962, { parentId: 'n6', parent2Id: 'n7' }),
    p('n13', 'Nguyễn Văn Khánh', 'nam', 1965, { parentId: 'n6', parent2Id: 'n8' }),
    p('n14', 'Nguyễn Văn Minh', 'nam', 1980, { parentId: 'n9' }),
    p('n15', 'Vũ Thị Ngọc', 'nu', 1983, { spouseOf: 'n14' }),
    p('n16', 'Nguyễn Thị Lan Anh', 'nu', 1985, { parentId: 'n9' }),
    p('n17', 'Nguyễn Văn Quân', 'nam', 1990, { parentId: 'n13' }),
    p('n18', 'Nguyễn Gia Bảo', 'nam', 2010, { parentId: 'n14', parent2Id: 'n15' }),
    p('n19', 'Nguyễn Ngọc Hân', 'nu', 2014, { parentId: 'n14', parent2Id: 'n15' })
  ];
}

/* =========================================================
   Trạng thái & chỉ mục
   ========================================================= */
const S = {
  ds: [], theoId: new Map(), conCua: new Map(), voChongCua: new Map(), doi: new Map(), viTri: new Map(),
  thuGon: new Set(), chon: null, loc: 'tat-ca', suaDuoc: false, view: 'cay', daVua: false, form: null, loiTai: ''
};
let kho = null;

function lapChiMuc() {
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

const hopLoc = p => (S.loc === 'song' ? !p.daMat : S.loc === 'mat' ? !!p.daMat : true);
const nhanVC = p => (p.gioiTinh === 'nu' ? 'Chồng' : 'Vợ');            // vợ/chồng CỦA người p
const banDoi = p => (p.spouseOf ? S.theoId.get(p.spouseOf) : null);
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
    .filter(x => S.theoId.get(x.id)?.thuTu !== x.data.thuTu);
  if (doi.length) await kho.suaNhieu(doi);
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
   Cây gia phả (D3)
   ========================================================= */
let svg, gGoc, gDuong, gThe, zoom;

function khoiCay() {
  svg = d3.select('#cay');
  gGoc = svg.append('g');
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

function veCay() {
  if (!svg) return;
  hienTrong();
  const h = d3.hierarchy({ id: '__goc' }, d => {
    if (d.id !== '__goc' && S.thuGon.has(d.id)) return null;
    const c = S.conCua.get(d.id) || [];
    return c.length ? c : null;
  });
  d3.tree().nodeSize([W + GAPX, 1]).separation((a, b) => (a.parent === b.parent ? 1 : 1.15))(h);

  const nodes = h.descendants().filter(d => d.depth > 0);
  const maxH = [];
  nodes.forEach(d => { maxH[d.depth] = Math.max(maxH[d.depth] || 0, caoThe(d.data)); });
  const yDoi = [];
  let y = 0;
  for (let i = 1; i < maxH.length; i++) { yDoi[i] = y; y += (maxH[i] || 0) + GAPY; }
  nodes.forEach(d => { d.Y = yDoi[d.depth]; d.X = d.x - W / 2; d.Hh = caoThe(d.data); });

  const lienKet = nodes.filter(d => d.parent && d.parent.depth > 0);
  gDuong.selectAll('path').data(lienKet, d => d.data.id).join('path')
    .attr('class', 'duong')
    .attr('d', d => {
      const s = d.parent, sy = s.Y + s.Hh + 10, my = d.Y - GAPY / 2 + 4;
      return `M${s.x},${sy}V${my}H${d.x}V${d.Y}`;
    });

  gThe.selectAll('*').remove();
  S.viTri = new Map();
  nodes.forEach(veThe);
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

  el.append('rect').attr('class', 'nen').attr('width', W).attr('height', d.Hh).attr('rx', 7);
  const chu = el.append('g').attr('class', khop ? null : 'mo-chu');
  chu.append('text').attr('class', 'ten').attr('x', 14).attr('y', 27).text(cat(p.ten, mat ? 19 : 22));
  chu.append('text').attr('class', 'phu').attr('x', 14).attr('y', 47).text(dongNam(p));
  if (mat) veHuong(el);

  if (vc.length) {
    el.append('line').attr('class', 'ke').attr('x1', 12).attr('x2', W - 12).attr('y1', H0).attr('y2', H0);
    vc.forEach((v, i) => {
      el.append('text')
        .attr('class', `vc${v.daMat ? ' mat-vc' : ''}${vcKhop[i] ? '' : ' mo-chu'}`)
        .attr('x', 14).attr('y', H0 + 18 + i * HV)
        .text(cat(`${nhanVC(p)}: ${v.ten}${v.daMat ? ' (đã mất)' : ''}`, 30))
        .on('click', e => { e.stopPropagation(); chonNguoi(v.id); });
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

function veHuong(el) {
  const g = el.append('g').attr('class', 'huong').attr('aria-hidden', 'true');
  for (let i = 0; i < 3; i++) {
    const x = W - 30 + i * 6;
    g.append('line').attr('x1', x).attr('x2', x).attr('y1', 15).attr('y2', 32);
    g.append('circle').attr('cx', x).attr('cy', 13.5).attr('r', 1.7);
  }
  g.append('rect').attr('x', W - 35).attr('y', 32).attr('width', 22).attr('height', 5).attr('rx', 1.5);
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
  if (!svg || !gGoc.node()) return;
  const b = gGoc.node().getBBox();
  const r = svg.node().getBoundingClientRect();
  if (!b.width || !r.width) return;
  const vua = 0.92 * Math.min(r.width / b.width, r.height / b.height);
  const k = Math.min(1, Math.max(r.width < 700 ? 0.6 : 0.35, vua));
  const tx = r.width / 2 - k * (b.x + b.width / 2);
  const ty = k === vua ? r.height / 2 - k * (b.y + b.height / 2) : 24 - k * b.y;
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

function denVaChon(id) {
  if (S.view !== 'cay') datView('cay');
  moNhanhToiNguoi(id);
  S.chon = id;
  veCay();
  moChiTiet(id);
  requestAnimationFrame(() => denNguoi(id));
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

function moChiTiet(id) {
  const pn = $('#chi-tiet');
  const p = S.theoId.get(id);
  if (!p) { pn.hidden = true; S.chon = null; return; }

  const ban = banDoi(p), mat = !!p.daMat, doi = S.doi.get(id);
  const kyTu = p.ten.trim().split(/\s+/).pop()?.[0] || '?';
  const anh = /^https?:\/\//i.test(p.anh || '') ? `<img src="${esc(p.anh)}" alt="">` : `<div class="chu-cai" aria-hidden="true">${esc(kyTu)}</div>`;

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
    ${nhom.join('')}
    ${p.ghiChu ? `<p class="ghi-chu">${esc(p.ghiChu)}</p>` : ''}
    ${sua}`;
  pn.hidden = false;
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
  const co = [], khong = [];
  for (const p of S.ds) {
    if (!p.daMat) continue;
    const g = docNgayGio(p.ngayGio);
    g ? co.push({ p, g }) : khong.push(p);
  }
  co.sort((a, b) => a.g.th - b.g.th || a.g.nhuan - b.g.nhuan || a.g.d - b.g.d || a.p.ten.localeCompare(b.p.ten, 'vi'));

  const moTa = p => {
    const b = banDoi(p);
    const goc = b ? `${nhanVC(b)} của ${b.ten}` : (S.doi.get(p.id) ? `Đời thứ ${S.doi.get(p.id)}` : '');
    return [goc, p.namMat ? `mất năm ${p.namMat}` : ''].filter(Boolean).join(', ');
  };

  let html = '<div class="gio-khung">';
  if (!co.length && !khong.length) {
    html += '<p class="gio-gioi-thieu">Chưa có ai đã mất trong gia phả. Khi thêm người đã mất, điền ngày giỗ theo âm lịch để danh sách hiện ở đây.</p>';
  } else {
    html += '<p class="gio-gioi-thieu">Ngày giỗ tính theo âm lịch, xếp theo tháng trong năm. Bấm vào tên để xem trên cây.</p>';
    let thang = 0, nhuan = false;
    for (const { p, g } of co) {
      if (g.th !== thang || g.nhuan !== nhuan) {
        if (thang) html += '</ol></section>';
        thang = g.th; nhuan = g.nhuan;
        html += `<section class="thang"><h2>Tháng ${TEN_THANG[thang - 1]}${nhuan ? ' (nhuận)' : ''}</h2><ol>`;
      }
      html += `<li><button type="button" data-den="${esc(p.id)}">
        <span class="ngay">${g.d}</span>
        <span class="ten-gio">${esc(p.ten)}</span>
        <span class="mo-ta">${esc(moTa(p))}</span></button></li>`;
    }
    if (thang) html += '</ol></section>';
    if (khong.length) {
      html += `<section class="thang chua-ro"><h2>Chưa ghi ngày giỗ (${khong.length})</h2><ul>${khong.map(p =>
        `<li><button type="button" data-den="${esc(p.id)}"><span class="ten-gio">${esc(p.ten)}</span><span class="mo-ta">${esc(moTa(p))}</span></button></li>`
      ).join('')}</ul></section>`;
    }
  }
  $('#view-gio').innerHTML = html + '</div>';
}

/* =========================================================
   Giao diện chung
   ========================================================= */
function hienTrong() {
  const t = $('#trong');
  if (S.loiTai) {
    t.innerHTML = `<div><h2>Không tải được gia phả</h2><p>${esc(S.loiTai)}</p></div>`;
    t.hidden = false;
  } else if (!S.ds.length) {
    t.innerHTML = S.suaDuoc
      ? '<div><h2>Bắt đầu từ cụ tổ</h2><p>Thêm người đứng đầu dòng họ, sau đó thêm con cháu từ thẻ của từng người.</p><button type="button" class="nut nut-chinh" data-them-goc>Thêm cụ tổ</button></div>'
      : '<div><h2>Gia phả chưa có ai</h2><p>Bấm “Chỉnh sửa” ở góc trên và nhập mật khẩu dòng họ để thêm người đầu tiên.</p></div>';
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

function veTatCa() {
  capNhatThongKe();
  if (S.view === 'cay') veCay(); else veGio();
  if (S.chon) moChiTiet(S.chon);
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
    if (!S.daVua && S.ds.length) { S.daVua = true; requestAnimationFrame(() => vuaKhung(false)); }
  }
}

function capNhatCheDoSua() {
  document.body.classList.toggle('dang-sua', S.suaDuoc);
  $('#nut-sua').textContent = S.suaDuoc ? 'Thoát chỉnh sửa' : 'Chỉnh sửa';
  $('#nut-them').hidden = !S.suaDuoc;
  hienTrong();
  if (S.chon) moChiTiet(S.chon);
}

let henGioTB;
function thongBao(msg, loi = false) {
  const t = $('#thong-bao');
  t.textContent = msg;
  t.classList.toggle('loi-tb', loi);
  t.classList.add('hien');
  clearTimeout(henGioTB);
  henGioTB = setTimeout(() => t.classList.remove('hien'), loi ? 5000 : 2500);
}

const loiGhi = e => (e && e.code === 'permission-denied'
  ? 'Không có quyền lưu. Bấm “Thoát chỉnh sửa” rồi nhập lại mật khẩu.'
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
   Form thêm / sửa
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
  S.form = { mode, id, spouseOf };

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
    f.anh.value = p.anh || '';
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
  capNhatNhomMat();
  $('#hop-form').showModal();
  setTimeout(() => f.ten.focus(), 30);
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
  const anh = v('anh');
  if (anh && !/^https?:\/\//i.test(anh)) return loi('Link ảnh cần bắt đầu bằng https://', 'anh');

  const { mode, id, spouseOf } = S.form;
  const laMau = mode === 'blood';
  const o = {
    ten, gioiTinh: f.querySelector('[name="gioiTinh"]:checked').value,
    namSinh, daMat, namMat, ngayGio, noiAnTang, anh, ghiChu: v('ghiChu'),
    parentId: laMau ? (f.parentId.value || null) : null,
    parent2Id: laMau && f.parentId.value ? (f.parent2Id.value || null) : null,
    spouseOf: laMau ? null : spouseOf
  };

  const nut = $('#form-luu');
  nut.disabled = true; nut.textContent = 'Đang lưu…';
  try {
    let moiId = id;
    const viTri = laMau && o.parentId && !$('#nhan-thu-tu').hidden ? +f.viTri.value : null;
    const anhChiEm = viTri !== null ? (S.conCua.get(o.parentId) || []).filter(c => c.id !== id).map(c => c.id) : null;
    if (id) await kho.sua(id, o);
    else moiId = await kho.them(o);
    if (anhChiEm) {
      const ids = anhChiEm.filter(x => x !== moiId);
      ids.splice(Math.min(viTri, ids.length), 0, moiId);
      await luuThuTu(ids);
    }
    $('#hop-form').close();
    thongBao(id ? 'Đã lưu thay đổi' : `Đã thêm ${ten}`);
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
    await kho.xoa([id, ...vc.map(x => x.id)]);
    dongChiTiet();
    thongBao(`Đã xóa ${p.ten}`);
  } catch (err) {
    console.error(err);
    thongBao(loiGhi(err), true);
  }
}

/* =========================================================
   Gắn sự kiện
   ========================================================= */
function ganSuKien() {
  // Tabs & lọc
  $$('.tabs button').forEach(b => b.addEventListener('click', () => datView(b.dataset.view)));
  $$('.loc button').forEach(b => b.addEventListener('click', () => {
    S.loc = b.dataset.loc;
    $$('.loc button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    veCay();
  }));

  // Tìm kiếm
  const o = $('#tim'), kq = $('#ket-qua');
  const dongKQ = () => { kq.hidden = true; };
  o.addEventListener('input', () => {
    const q = boDau(o.value.trim());
    if (!q) return dongKQ();
    const ds = S.ds.filter(p => boDau(p.ten).includes(q)).slice(0, 8);
    kq.innerHTML = ds.length
      ? ds.map(p => `<li><button type="button" data-id="${esc(p.id)}"><span>${esc(p.ten)}</span><small>${esc(moTaNgan(p))}</small></button></li>`).join('')
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
    if ((b.dataset.len || b.dataset.xuong) && S.suaDuoc) return doiThuTu(b.dataset.len || b.dataset.xuong, b.dataset.len ? -1 : 1);
    const id = S.chon, p = S.theoId.get(id);
    if (!p || !S.suaDuoc) return;
    const hd = b.dataset.hd;
    if (hd === 'sua') moForm({ mode: p.spouseOf ? 'spouse' : 'blood', id });
    if (hd === 'them-con') moForm(p.spouseOf ? { mode: 'blood', parentId: p.spouseOf, parent2Id: p.id } : { mode: 'blood', parentId: id });
    if (hd === 'them-vc') moForm({ mode: 'spouse', spouseOf: id });
    if (hd === 'xoa') xoaNguoi(id);
  });
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

  // Form
  $('#form-nguoi').addEventListener('submit', luuForm);
  $('#form-nguoi').addEventListener('input', e => { if (e.target.hasAttribute('aria-invalid')) e.target.removeAttribute('aria-invalid'); });
  $$('[name="tinhTrang"]').forEach(r => r.addEventListener('change', capNhatNhomMat));
  F().parentId.addEventListener('change', () => { capNhatChonCha2(); capNhatChonThuTu(); });
  $$('[data-huy]').forEach(b => b.addEventListener('click', () => b.closest('dialog').close()));
}

/* =========================================================
   Khởi động
   ========================================================= */
async function khoiDong() {
  const tieuDe = `Gia phả ${CONFIG.familyName || ''}`.trim();
  $('#ten-dong-ho').textContent = tieuDe;
  $('#phu-de').textContent = CONFIG.subtitle || '';
  document.title = tieuDe;

  ganSuKien();

  if (!window.d3) {
    S.loiTai = 'Không tải được thư viện vẽ cây. Kiểm tra kết nối mạng rồi tải lại trang.';
    hienTrong();
    return;
  }
  khoiCay();

  try {
    kho = CONFIG.firebase && CONFIG.firebase.apiKey ? await khoFirebase() : khoThu();
  } catch (err) {
    console.error(err);
    S.loiTai = 'Không kết nối được Firebase. Kiểm tra mạng và phần firebase trong file config.js.';
    hienTrong();
    return;
  }

  if (kho.thu) {
    const b = $('#bang-demo');
    b.textContent = `Bản thử: dữ liệu mẫu, chỉ lưu trên máy này. Mật khẩu chỉnh sửa thử: ${CONFIG.demoPassword}`;
    b.hidden = false;
  }

  kho.theoDoiQuyen(ok => { S.suaDuoc = ok; capNhatCheDoSua(); });
  kho.theoDoi(ds => {
    S.loiTai = '';
    S.ds = ds.filter(p => p && p.ten);
    lapChiMuc();
    if (S.chon && !S.theoId.has(S.chon)) { S.chon = null; $('#chi-tiet').hidden = true; }
    veTatCa();
    if (!S.daVua && S.ds.length && S.view === 'cay') {
      S.daVua = true;
      requestAnimationFrame(() => vuaKhung(false));
    }
  }, err => {
    console.error(err);
    S.loiTai = err && err.code === 'permission-denied'
      ? 'Firebase chặn quyền đọc. Kiểm tra lại phần Rules của Firestore theo hướng dẫn.'
      : 'Không đọc được dữ liệu. Kiểm tra kết nối mạng rồi tải lại trang.';
    hienTrong();
  });
}

khoiDong();

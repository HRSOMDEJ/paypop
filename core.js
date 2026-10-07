/**
 * core.js — แกนหน้าเว็บ PayPop: เครือข่าย แคช ล็อกอิน เมนู ชิ้นส่วน UI (toast/modal/drawer/popover/tooltip/confetti) และตัวนำทาง
 * หลักการความเร็ว: แสดงข้อมูลที่จำไว้ในเครื่องทันที → ถามหลังบ้านเฉพาะส่วนที่เปลี่ยน (rev/dv) · บันทึกครั้งเดียวต่อหน้า
 */
var APP_BUILD = '2569-10-07.2', APP_BUILD_TH = '7 ต.ค. 2569';
var S = { codes: {}, token: null, boot: null, roundId: null, data: null, items: {}, itemsList: [], cats: {}, page: null, busy: 0, dirty: null };

/* ================================================================ utils */
function $(sel, root) { return (root || document).querySelector(sel); }
function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
var NF2 = new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), NF0 = new Intl.NumberFormat('th-TH', { maximumFractionDigits: 0 });
function fmt(n) { return NF2.format(+n || 0); }
function fmt0(n) { return NF0.format(Math.round(+n || 0)); }
function fmtM(n) { n = +n || 0; var a = Math.abs(n); if (a >= 1e6) return (n / 1e6).toFixed(a >= 1e7 ? 1 : 2).replace(/\.0+$/, '') + ' ล้าน'; if (a >= 1e3) return fmt0(n); return fmt(n); }
function pct(a, b) { if (!b) return null; return (a - b) / b * 100; }
function fmtPct(p) { if (p == null || !isFinite(p)) return '—'; return (p > 0 ? '+' : '') + p.toFixed(Math.abs(p) < 10 ? 1 : 0) + '%'; }
function thDateTime(iso) {
  if (!iso) return '';
  var m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/); if (!m) return String(iso);
  return (+m[3]) + ' ' + R.MTH_S[+m[2] - 1] + ' ' + String(+m[1] + 543).slice(2) + (m[4] ? ' ' + m[4] + ':' + m[5] : '');
}
function debounce(fn, ms) { var t; return function () { var a = arguments, s = this; clearTimeout(t); t = setTimeout(function () { fn.apply(s, a); }, ms || 200); }; }
function nowStamp() { var d = new Date(); return d.getDate() + '-' + (d.getMonth() + 1) + '-' + String(d.getFullYear() + 543).slice(2) + '_' + ('0' + d.getHours()).slice(-2) + ('0' + d.getMinutes()).slice(-2); }
function lsGet(k) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
function lsDel(k) { try { localStorage.removeItem(k); } catch (e) { } }
function catOf(code) { return S.cats[code] || { code: code || '', name: code ? code : 'ยังไม่จัดหมวด', color: '#94a3b8', icon: 'help' }; }
function stName(code) { for (var i = 0; i < R.HR_STATUS.length; i++) if (R.HR_STATUS[i].code === code) return R.HR_STATUS[i].name; return code ? code : 'ไม่ระบุ'; }
function stPill(code) { return '<span class="pill st-' + esc(code || 'NONE') + '">' + esc(stName(code)) + '</span>'; }
function hmPill(s) { var c = s === 'อนุมัติ' ? 'hm-ok' : (s === 'รออนุมัติ' || !s) ? 'hm-pending' : 'hm-other'; return '<span class="pill nodot ' + c + '">' + esc(s || 'รออนุมัติ') + '</span>'; }
function catChip(code) { var c = catOf(code); return '<span class="chip" style="--c:' + esc(c.color) + '"><span class="c"></span>' + esc(c.name) + '</span>'; }
function userName(code) { var u = (S.boot && S.boot.users || []).filter(function (x) { return x.empCode === code; })[0]; return u ? u.fullName.replace(/^(นาย|นางสาว|นาง)\s*/, '') : (code || ''); }

/* ================================================================ icons (เส้น 24px) */
var ICONS = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  paste: 'M9 4h6v3H9z|M7 5H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-1|M12 11v6|M9 14.5l3 3 3-3',
  docs: 'M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z|M14 3v5h5|M9 13h6|M9 17h4',
  check: 'M4 7l2 2 4-4|M4 15l2 2 4-4|M13 7h7|M13 15h7',
  wallet: 'M4 7a2 2 0 0 1 2-2h11v3|M4 7v11a2 2 0 0 0 2 2h14V8H6a2 2 0 0 1-2-1|M16.5 14h.01',
  lockr: 'M5 11h14v10H5z|M8 11V7a4 4 0 0 1 8 0v4',
  unlock: 'M5 11h14v10H5z|M8 11V7a4 4 0 0 1 7.7-1.5',
  chart: 'M4 20V10|M10 20V4|M16 20v-7|M21 20H3',
  steth: 'M6 3v5a4 4 0 0 0 8 0V3|M10 12v3a5 5 0 0 0 10 0v-1.5|M20 11.5a1.6 1.6 0 1 0 0-.01',
  minus: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18|M8 12h8',
  grid: 'M4 4h6v6H4z|M14 4h6v6h-6z|M4 14h6v6H4z|M14 14h6v6h-6z',
  cal: 'M4 6h16v15H4z|M4 10h16|M8 3v4|M16 3v4',
  gear: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6|M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  help: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18|M9.2 9.2a2.9 2.9 0 0 1 5.6 1c0 1.9-2.8 2.5-2.8 4|M12 17.5h.01',
  x: 'M6 6l12 12|M18 6 6 18', ok: 'M5 12.5l4.5 4.5L19 7.5', plus: 'M12 5v14|M5 12h14', trash: 'M4 7h16|M9 7V4h6v3|M6 7l1 13h10l1-13',
  copy: 'M9 9h11v11H9z|M5 15H4V4h11v1', dl: 'M12 4v11|M7.5 10.5 12 15l4.5-4.5|M5 20h14', up: 'M12 20V9|M7.5 13.5 12 9l4.5 4.5|M5 4h14',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14|M20 20l-4-4', filter: 'M4 5h16l-6 8v6l-4-2v-4z', down: 'M6 9l6 6 6-6', right: 'M9 6l6 6-6 6', left: 'M15 6l-6 6 6 6',
  moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z', sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8|M12 2v2|M12 20v2|M4.9 4.9l1.4 1.4|M17.7 17.7l1.4 1.4|M2 12h2|M20 12h2|M4.9 19.1l1.4-1.4|M17.7 6.3l1.4-1.4',
  out: 'M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4|M10 17l5-5-5-5|M15 12H4', user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8|M4 21a8 8 0 0 1 16 0',
  key: 'M8 15a4 4 0 1 1 3.4-6.1L20 9v3h-2v2h-2v2h-3.6A4 4 0 0 1 8 15z', refresh: 'M20 11a8 8 0 0 0-14.6-4.4L4 8|M4 4v4h4|M4 13a8 8 0 0 0 14.6 4.4L20 16|M20 20v-4h-4',
  alert: 'M12 3 2.5 20h19z|M12 10v4|M12 17h.01', info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18|M12 11v5|M12 8h.01', spark: 'M12 3v4|M12 17v4|M3 12h4|M17 12h4|M6 6l2.5 2.5|M15.5 15.5 18 18|M18 6l-2.5 2.5|M8.5 15.5 6 18',
  undo: 'M9 14 4 9l5-5|M4 9h10a6 6 0 0 1 0 12h-3', pin: 'M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z|M12 7a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5',
  gem: 'M6 3h12l3 6-9 12L3 9z|M3 9h18|M9 3l3 6 3-6|M12 9v12', pulse: 'M3 12h4l3-7 4 14 3-7h4', doc: 'M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z|M14 3v5h5',
  tag: 'M3 12V4h8l10 10-8 8z|M7.5 7.5h.01', hist: 'M3 12a9 9 0 1 0 3-6.7L3 8|M3 3v5h5|M12 7v5l3 3', eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z|M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
  edit: 'M4 20h4L19 9l-4-4L4 16z|M13.5 6.5l4 4', move: 'M7 4 3 8l4 4|M3 8h14|M17 12l4 4-4 4|M21 16H7', file: 'M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z|M14 3v5h5|M9 15h6',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1|M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1', menu: 'M4 7h16|M4 12h16|M4 17h16',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z', party: 'M4 20l4.5-11 6.5 6.5z|M13 4c1 1.5 1 3-1 4|M18 8c1 .5 2 .3 3-.5|M15 3l.5 1.5|M20 13l1.2.4|M17 11c1.5-1 3-.5 3.5 1',
  calc: 'M6 3h12v18H6z|M9 7h6|M9 12h.01|M12 12h.01|M15 12h.01|M9 16h.01|M12 16h.01|M15 16h.01', db: 'M12 3c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3|M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6|M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6',
  users: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8|M2 21a7 7 0 0 1 14 0|M16 3.5a4 4 0 0 1 0 7|M18 14a7 7 0 0 1 4 7', flag: 'M5 21V4|M5 4h11l-2 4 2 4H5'
};
function icon(name, cls) { return '<svg class="i ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + String(ICONS[name] || ICONS.info).split('|').map(function (d) { return '<path d="' + d + '"/>'; }).join('') + '</svg>'; }
function q(tip) { return '<span class="q" tabindex="0" data-tip="' + esc(tip) + '">?</span>'; }

/* ================================================================ mascot "น้องป๊อป" (เหรียญยิ้ม) */
function mascot(size, mood) {
  size = size || 96; mood = mood || 'happy';
  var eyes = mood === 'wow' ? '<circle class="blink" cx="38" cy="46" r="5" fill="#1b2236"/><circle class="blink" cx="62" cy="46" r="5" fill="#1b2236"/>'
    : mood === 'think' ? '<ellipse class="blink" cx="39" cy="44" rx="4" ry="5" fill="#1b2236"/><ellipse class="blink" cx="63" cy="44" rx="4" ry="5" fill="#1b2236"/><circle cx="40.5" cy="42" r="1.4" fill="#fff"/><circle cx="64.5" cy="42" r="1.4" fill="#fff"/><path d="M31 35q6-4 12-1M57 34q6-3 12 1" stroke="#1b2236" stroke-width="2.6" fill="none" stroke-linecap="round"/>'
    : mood === 'sleep' ? '<path d="M33 47q5 4 10 0M57 47q5 4 10 0" stroke="#1b2236" stroke-width="3.6" fill="none" stroke-linecap="round"/>'
    : '<ellipse class="blink" cx="38" cy="46" rx="4.4" ry="5.4" fill="#1b2236"/><ellipse class="blink" cx="62" cy="46" rx="4.4" ry="5.4" fill="#1b2236"/><circle cx="39.6" cy="44" r="1.5" fill="#fff"/><circle cx="63.6" cy="44" r="1.5" fill="#fff"/>';
  var mouth = mood === 'wow' ? '<ellipse cx="50" cy="62" rx="6" ry="7" fill="#1b2236"/><ellipse cx="50" cy="65" rx="3.6" ry="3" fill="#ff7a94"/>'
    : mood === 'think' ? '<ellipse cx="53" cy="62" rx="4.5" ry="4" fill="#1b2236"/><circle cx="80" cy="20" r="3" fill="#7c5cff"/><circle cx="87" cy="11" r="4.5" fill="#7c5cff" opacity=".8"/>'
    : '<path d="M40 58q10 11 20 0" stroke="#1b2236" stroke-width="3.8" fill="#ff7a94" stroke-linecap="round" stroke-linejoin="round"/>';
  var id = 'mg' + Math.random().toString(36).slice(2, 7);
  return '<span class="mascot" style="display:inline-block;width:' + size + 'px"><svg viewBox="0 0 100 110" width="' + size + '" height="' + Math.round(size * 1.1) + '" aria-hidden="true"><defs>' +
    '<radialGradient id="' + id + '" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#fff0a8"/><stop offset=".55" stop-color="#ffc23a"/><stop offset="1" stop-color="#ff9417"/></radialGradient></defs>' +
    '<ellipse cx="50" cy="104" rx="26" ry="4" fill="#1b2236" opacity=".12"/>' +
    '<g class="bob"><circle cx="50" cy="52" r="42" fill="url(#' + id + ')"/><circle cx="50" cy="52" r="33" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="3"/>' +
    '<path class="shine" d="M24 34q8-14 24-16" stroke="#fff" stroke-width="5" stroke-linecap="round" fill="none" opacity=".8"/>' +
    '<circle cx="29" cy="58" r="5.5" fill="#ff7a94" opacity=".55"/><circle cx="71" cy="58" r="5.5" fill="#ff7a94" opacity=".55"/>' + eyes + mouth +
    '<path d="M86 30l3-6M90 38l6-2M82 22l1-6" stroke="#ff4f7b" stroke-width="3" stroke-linecap="round"/></g></svg></span>';
}

/* ================================================================ network
 * Apps Script บางช่วง Google ให้รอคิว 10–30 วิ หรือตอบหน้า error (ไม่มี CORS header → "Failed to fetch")
 * - จำกัดพร้อมกัน 2 คำขอ · คำขออ่านที่ซ้ำกันขณะรอ ใช้คำตอบเดียวกัน
 * - ทุกคำขอมีเวลาหมด (อ่าน 75 วิ · งานใหญ่ 330 วิ) ไม่ค้างตลอดไป
 * - อ่าน: ลองใหม่ 3 ครั้ง (2/5/10 วิ) · เขียน: ลองใหม่ 3 ครั้งด้วยรหัสคำขอ (rid) เดิม หลังบ้านจำผลไว้ จึงไม่บันทึกซ้ำ
 * - เก็บเวลา 30 คำขอล่าสุด (รวม/หลังบ้าน) ดูได้ที่ ตั้งค่า › เกี่ยวกับ */
var NET = { active: 0, queue: [], MAX: 2, inflight: {}, log: [], slow: 0 };
var NET_LONG = /^(historyRound|historyInit|commitImport|previewImport|closeRound|reopenRound|deleteRound|resetSystem|saveIncomeCodes)$/;
function netSlot() { return new Promise(function (res) { if (NET.active < NET.MAX) { NET.active++; res(); } else NET.queue.push(res); }); }
function netDone() { var n = NET.queue.shift(); if (n) n(); else NET.active = Math.max(0, NET.active - 1); }
function isRead(a) { return /^(get|list|bootstrap|ping|login|smcLookup|historyStatus)/.test(a); }
function newRid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 10); }
function netLog(action, ms, srv, ok, note) {
  NET.log.unshift({ at: Date.now(), action: action, ms: ms, srv: srv == null ? null : srv, ok: ok, note: note || '' });
  if (NET.log.length > 30) NET.log.length = 30;
}
function netSlow(d) { NET.slow = Math.max(0, NET.slow + d); syncState(S.busy ? 'busy' : 'ok'); }
function fetchOnce(action, payload, rid) {
  var t0 = Date.now(), ctl = typeof AbortController !== 'undefined' ? new AbortController() : null, timedOut = false, slowOn = false;
  var limit = NET_LONG.test(action) ? 330000 : 75000;
  var to = setTimeout(function () { timedOut = true; if (ctl) ctl.abort(); }, limit);
  var sl = setTimeout(function () { slowOn = true; netSlow(1); }, 8000);
  var body = { action: action, token: S.token, payload: payload || {} };
  if (rid) body.rid = rid;
  var stop = function () { clearTimeout(to); clearTimeout(sl); if (slowOn) netSlow(-1); };
  return fetch(API_URL, { method: 'POST', redirect: 'follow', credentials: 'omit', cache: 'no-store', body: JSON.stringify(body), signal: ctl ? ctl.signal : undefined })
    .then(function (r) { return r.text(); })
    .then(function (t) {
      stop();
      if (String(t).trim().charAt(0) !== '{') { netLog(action, Date.now() - t0, null, false, 'Google ตอบหน้า error'); var e = new Error('Google ไม่ว่างชั่วคราว'); e.busy = true; throw e; }
      var res = JSON.parse(t);
      netLog(action, Date.now() - t0, res.ms, res.ok !== false, res.ok === false ? (res.code || '') : '');
      return res;
    }, function (e) {
      stop();
      var x = new Error(timedOut ? 'Google ไม่ตอบภายใน ' + Math.round(limit / 1000) + ' วิ' : 'Google ไม่ตอบ/ตัดการเชื่อมต่อ (' + (e && e.message ? e.message : e) + ')');
      x.busy = true; x.net = true;
      netLog(action, Date.now() - t0, null, false, timedOut ? 'หมดเวลา' : 'เชื่อมต่อไม่ได้');
      throw x;
    });
}
/** ตารางเวลาคำขอล่าสุด: รวม = ที่ผู้ใช้รอจริง · หลังบ้าน = สคริปต์ทำงาน · ส่วนต่าง = รอคิว/เครือข่ายของ Google */
function netReport() {
  var rows = NET.log.map(function (x) {
    var wait = x.srv != null ? Math.max(0, x.ms - x.srv) : null;
    return '<tr><td class="small">' + new Date(x.at).toLocaleTimeString('th-TH') + '</td><td class="mono small">' + esc(x.action) + '</td><td class="n">' + (x.ms / 1000).toFixed(1) + '</td><td class="n">' + (x.srv != null ? (x.srv / 1000).toFixed(1) : '—') + '</td><td class="n">' + (wait != null ? (wait / 1000).toFixed(1) : '—') + '</td><td>' + (x.ok ? '<span class="pill st-APPROVED">สำเร็จ</span>' : '<span class="pill st-RETURN">' + esc(x.note || 'ไม่สำเร็จ') + '</span>') + '</td></tr>';
  }).join('');
  return '<div class="card mt12"><div class="card-h"><h3>' + icon('pulse') + 'ความเร็วการเชื่อมต่อ (30 คำขอล่าสุดในหน้านี้)</h3>' + q('รวม = เวลาที่รอจริง · หลังบ้าน = เวลาที่สคริปต์ทำงาน · ส่วนต่าง = รอคิว/เครือข่ายของ Google ถ้าส่วนต่างสูง (10–30 วิ) แปลว่า Google ช้าเอง ไม่ใช่ข้อมูลเยอะ') + '</div>' +
    (rows ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>เวลา</th><th>คำสั่ง</th><th class="n">รวม (วิ)</th><th class="n">หลังบ้าน</th><th class="n">รอคิว</th><th>ผล</th></tr></thead><tbody>' + rows + '</tbody></table></div>' : '<p class="small muted" style="margin:0">ยังไม่มีคำขอ</p>') + '</div>';
}
function api(action, payload, opt) {
  opt = opt || {};
  var read = isRead(action), key = read ? action + '|' + JSON.stringify(payload || {}) : null;
  if (key && NET.inflight[key]) return NET.inflight[key];
  var waits = read ? [2000, 5000, 10000] : [3000, 8000, 15000], tries = 0, rid = read ? null : newRid();
  busy(1);
  var attempt = function () {
    return netSlot().then(function () { return fetchOnce(action, payload, rid); }).then(function (x) {
      netDone();
      if (x && x.ok === false && x.code === 'BUSY' && tries < waits.length) { var w0 = waits[tries++]; return new Promise(function (r) { setTimeout(r, w0); }).then(attempt); }
      return x;
    }, function (e) {
      netDone();
      if (e.busy && tries < waits.length && opt.retry !== false) { var w = waits[tries++]; syncState('retry', tries); return new Promise(function (r) { setTimeout(r, w); }).then(attempt); }
      e.message = (read ? 'โหลดข้อมูลไม่สำเร็จ: ' : 'บันทึกไม่สำเร็จ: ') + e.message + ' — ลองใหม่อีกครั้งในอีกสักครู่' + (read ? '' : ' (ถ้าไม่แน่ใจว่าบันทึกแล้วหรือยัง กดซิงก์ข้อมูลใหม่ก่อน)');
      throw e;
    });
  };
  var p = attempt().then(function (res) {
    busy(-1); if (key) delete NET.inflight[key];
    if (res.ok) { if (res.dv && S.boot && !opt.keepDv) S.boot.dv = res.dv; return res.data; }
    var err = new Error(res.error || 'เกิดข้อผิดพลาด'); err.code = res.code;
    if (res.code === 'UNAUTHORIZED') { App.logout(true); toast('หมดเวลาการใช้งาน กรุณาเข้าสู่ระบบอีกครั้ง', 'warn'); }
    throw err;
  }, function (e) { busy(-1); if (key) delete NET.inflight[key]; syncState('err'); throw e; });
  if (key) NET.inflight[key] = p;
  return p;
}
function busy(d) {
  S.busy = Math.max(0, S.busy + d);
  var p = $('.topprog'); if (p) { if (S.busy) { p.classList.add('on'); p.style.width = (30 + Math.random() * 50) + '%'; } else { p.style.width = '100%'; setTimeout(function () { if (!S.busy) { p.classList.remove('on'); p.style.width = '0'; } }, 350); } }
  syncState(S.busy ? 'busy' : 'ok');
}
function syncState(st, n) {
  var el = $('#sync'); if (!el) return;
  if (st === 'busy' && NET.slow) st = 'slow';
  el.className = 'sync ' + (st === 'busy' || st === 'slow' || st === 'retry' ? 'busy' : st === 'err' ? 'err' : '');
  el.innerHTML = '<span class="dot"></span>' + (st === 'busy' ? 'กำลังซิงก์…' : st === 'slow' ? 'Google ตอบช้า กำลังรอ…' : st === 'retry' ? 'Google ไม่ว่าง ลองใหม่ครั้งที่ ' + n + '…' : st === 'err' ? 'เชื่อมต่อไม่ได้ (ใช้ข้อมูลในเครื่อง)' : 'ข้อมูลล่าสุด');
}
function keyFor(k) { return 'pp:' + (S.boot && S.boot.me ? S.boot.me.empCode : 'x') + ':' + k; }

/* ================================================================ UI kit */
function toast(msg, type, ms) {
  var box = $('#toasts'); if (!box) return;
  var el = document.createElement('div');
  el.className = 'toast ' + (type || 'ok');
  el.innerHTML = icon(type === 'bad' ? 'alert' : type === 'warn' ? 'info' : 'ok') + '<span>' + esc(msg) + '</span>';
  box.appendChild(el);
  setTimeout(function () { el.classList.add('out'); setTimeout(function () { el.remove(); }, 320); }, ms || (type === 'bad' ? 6000 : 3200));
}
/** แสดงกล่องโหลดไม่สำเร็จ + ปุ่มลองใหม่ แทนโครงกระดูกที่ค้าง */
function loadErr(box, e, retry) {
  fail(e); if (!box) return;
  box.innerHTML = '<div class="card empty">' + mascot(90, 'sleep') + '<h3>โหลดข้อมูลไม่สำเร็จ</h3><p class="small muted">' + esc(e && e.message ? e.message : String(e)) + '</p><button class="btn pri" data-retry>' + icon('refresh') + 'ลองอีกครั้ง</button></div>';
  $('[data-retry]', box).onclick = retry;
}
function fail(e) { toast(e && e.message ? e.message : String(e), 'bad'); console.warn(e); }
/** modal({title, body(html), wide, actions:[{label, cls, value, click}]}) → Promise(value) */
function modal(o) {
  return new Promise(function (resolve) {
    var ov = document.createElement('div'); ov.className = 'ov';
    ov.innerHTML = '<div class="modal ' + (o.wide ? 'wide' : o.mid ? 'mid' : '') + '" role="dialog" aria-modal="true" aria-label="' + esc(o.title) + '"><div class="modal-h">' + (o.icon ? '<span class="kpi"><span class="ico ' + (o.tone || 't-pri') + '" style="position:static">' + icon(o.icon) + '</span></span>' : '') +
      '<h3>' + esc(o.title) + '</h3><button class="btn ghost icon sm" data-x aria-label="ปิด">' + icon('x') + '</button></div><div class="modal-b">' + (o.body || '') + '</div>' +
      (o.actions === false ? '' : '<div class="modal-f"></div>') + '</div>';
    document.body.appendChild(ov);
    var done = function (v) { ov.remove(); document.removeEventListener('keydown', onKey); resolve(v); };
    var onKey = function (e) { if (e.key === 'Escape') done(null); };
    document.addEventListener('keydown', onKey);
    ov.addEventListener('mousedown', function (e) { if (e.target === ov && !o.sticky) done(null); });
    $('[data-x]', ov).onclick = function () { done(null); };
    var f = $('.modal-f', ov);
    (o.actions || [{ label: 'ปิด', value: null }]).forEach(function (a) {
      if (!f) return;
      var b = document.createElement('button'); b.className = 'btn ' + (a.cls || ''); b.innerHTML = (a.icon ? icon(a.icon) : '') + esc(a.label);
      b.onclick = function () {
        if (!a.click) return done(a.value);
        var r = a.click(ov, b);
        if (r && r.then) { b.classList.add('loading'); r.then(function (v) { if (v !== false) done(v === undefined ? a.value : v); else b.classList.remove('loading'); }, function (e) { b.classList.remove('loading'); fail(e); }); }
        else if (r !== false) done(r === undefined ? a.value : r);
      };
      f.appendChild(b);
    });
    if (o.onOpen) o.onOpen(ov, done);
    var first = $('input,select,textarea', ov); if (first) setTimeout(function () { first.focus(); }, 60);
  });
}
function confirmDlg(title, body, okLabel, danger) {
  return modal({ title: title, body: '<p style="margin:0">' + body + '</p>', icon: danger ? 'alert' : 'help', tone: danger ? 't-bad' : 't-pri',
    actions: [{ label: 'ยกเลิก', value: false, cls: 'ghost' }, { label: okLabel || 'ยืนยัน', value: true, cls: danger ? 'danger fillb' : 'pri' }] });
}
/** ขอรหัสผ่านยืนยัน (ใช้กับการกระทำสำคัญ) → Promise(password|null) */
function askPassword(title, body, extraHtml) {
  return modal({ title: title, icon: 'key', tone: 't-sun', body: (body ? '<p style="margin:0">' + body + '</p>' : '') + (extraHtml || '') +
      '<div class="field"><label for="pw-confirm">รหัสผ่านของคุณ (ยืนยันตัวตน)</label><input id="pw-confirm" class="inp" type="password" autocomplete="current-password"></div>',
    actions: [{ label: 'ยกเลิก', value: null, cls: 'ghost' }, { label: 'ยืนยัน', cls: 'pri', click: function (ov) { var v = $('#pw-confirm', ov).value; if (!v) { toast('กรุณากรอกรหัสผ่าน', 'warn'); return false; } var x = $('#pw-extra', ov); return { password: v, extra: x ? x.value : '' }; } }] });
}
function drawer(html, cls) {
  var ov = document.createElement('div'); ov.className = 'ov drawer-ov';
  ov.innerHTML = '<aside class="drawer ' + (cls || '') + '" role="dialog" aria-modal="true">' + html + '</aside>';
  document.body.appendChild(ov);
  var close = function () { ov.remove(); document.removeEventListener('keydown', k); };
  var k = function (e) { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', k);
  ov.addEventListener('mousedown', function (e) { if (e.target === ov) close(); });
  $$('[data-close]', ov).forEach(function (b) { b.onclick = close; });
  return { el: ov, close: close };
}
/** เมนูลอย (อยู่ใน body เสมอ — บทเรียน: ห้ามอยู่ใต้ element ที่มี transform) */
function popover(anchor, items, onPick) {
  closePops();
  var p = document.createElement('div'); p.className = 'pop'; p.setAttribute('role', 'menu');
  if (items && items.nodeType === 1) p.appendChild(items);   // เนื้อหาเอง (เช่น รายการเลือกคอลัมน์)
  else items.forEach(function (it) {
    if (it === '-') { var s = document.createElement('div'); s.className = 'sep'; p.appendChild(s); return; }
    var b = document.createElement('button'); b.type = 'button'; b.className = it.on ? 'on' : ''; b.innerHTML = (it.icon ? icon(it.icon) : '') + (it.html || esc(it.label));
    b.onclick = function () { closePops(); onPick(it.value, it); };
    p.appendChild(b);
  });
  document.body.appendChild(p);
  var r = anchor.getBoundingClientRect(), w = p.offsetWidth, h = p.offsetHeight;
  var left = Math.min(window.innerWidth - w - 8, Math.max(8, r.left)), top = r.bottom + 6;
  if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 6);
  p.style.left = left + 'px'; p.style.top = top + 'px';
  setTimeout(function () { document.addEventListener('mousedown', outside); }, 0);
  function outside(e) { if (!p.contains(e.target)) closePops(); }
  p._off = function () { document.removeEventListener('mousedown', outside); };
}
function closePops() { $$('.pop').forEach(function (p) { if (p._off) p._off(); p.remove(); }); }
function copyText(text, label) {
  var done = function () { toast('คัดลอก' + (label ? ' ' + label : '') + ' แล้ว', 'ok', 1800); };
  if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
  fallbackCopy(text); done();
}
function fallbackCopy(text) { var t = document.createElement('textarea'); t.value = text; t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); } catch (e) { } t.remove(); }
function countUp(root) {
  $$('[data-count]', root).forEach(function (el) {
    var to = +el.getAttribute('data-count') || 0, money = el.hasAttribute('data-money'), t0 = performance.now(), d = 700;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = money ? fmt(to) : fmt0(to); return; }
    var step = function (t) { var k = Math.min(1, (t - t0) / d), e = 1 - Math.pow(1 - k, 3), v = to * e; el.textContent = money ? fmt(v) : fmt0(v); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
}
function confetti() {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var c = document.createElement('canvas'); c.className = 'confetti'; document.body.appendChild(c);
  var W = c.width = innerWidth, H = c.height = innerHeight, ctx = c.getContext('2d'), cols = ['#ff4f7b', '#ff8a3d', '#ffc53d', '#12a594', '#7c5cff', '#4c7cff'];
  var ps = []; for (var i = 0; i < 140; i++) ps.push({ x: W / 2 + (Math.random() - .5) * 200, y: H * .45, vx: (Math.random() - .5) * 16, vy: -Math.random() * 15 - 5, r: Math.random() * 6 + 4, c: cols[i % cols.length], a: Math.random() * 6, s: Math.random() < .5 });
  var t0 = performance.now();
  (function f(t) {
    ctx.clearRect(0, 0, W, H);
    ps.forEach(function (p) { p.vy += .42; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.a += .15; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c; if (p.s) ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); else { ctx.beginPath(); ctx.arc(0, 0, p.r / 2.4, 0, 7); ctx.fill(); } ctx.restore(); });
    if (t - t0 < 2200) requestAnimationFrame(f); else c.remove();
  })(t0);
}
/* tooltip สำหรับ [data-tip] */
(function () {
  var tip = null;
  function show(el) {
    hide(); var t = el.getAttribute('data-tip'); if (!t) return;
    tip = document.createElement('div'); tip.className = 'tip'; tip.textContent = t; document.body.appendChild(tip);
    var r = el.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
    var left = Math.min(innerWidth - w - 8, Math.max(8, r.left + r.width / 2 - w / 2)), top = r.top - h - 8; if (top < 8) top = r.bottom + 8;
    if (el.closest('.side')) { left = r.right + 10; top = r.top + r.height / 2 - h / 2; }   // เมนูข้าง: แสดงทางขวา
    tip.style.left = left + 'px'; tip.style.top = top + 'px';
  }
  function hide() { if (tip) { tip.remove(); tip = null; } }
  document.addEventListener('mouseover', function (e) { var el = e.target.closest && e.target.closest('[data-tip]'); if (el) show(el); else hide(); });
  document.addEventListener('focusin', function (e) { var el = e.target.closest && e.target.closest('[data-tip]'); if (el) show(el); });
  document.addEventListener('focusout', hide); document.addEventListener('scroll', hide, true);
  document.addEventListener('click', function (e) {   // ripple
    var b = e.target.closest && e.target.closest('.btn'); if (!b || b.disabled) return;
    var r = b.getBoundingClientRect(), s = document.createElement('span'), d = Math.max(r.width, r.height);
    s.className = 'ripple'; s.style.width = s.style.height = d + 'px'; s.style.left = (e.clientX - r.left - d / 2) + 'px'; s.style.top = (e.clientY - r.top - d / 2) + 'px';
    b.appendChild(s); setTimeout(function () { s.remove(); }, 600);
  });
})();
function helpBtn(key) { return '<button class="helpbtn" data-help="' + esc(key) + '" aria-label="วิธีใช้หน้านี้" data-tip="วิธีใช้หน้านี้">?</button>'; }
function openHelp(key) {
  var h = (window.HELP || {})[key] || { title: 'วิธีใช้', intro: 'ยังไม่มีคำแนะนำสำหรับหน้านี้' };
  var html = '<div class="row"><span class="kpi"><span class="ico t-pri" style="position:static">' + icon('help') + '</span></span><h3 class="flex1">' + esc(h.title) + '</h3><button class="btn ghost icon sm" data-close aria-label="ปิด">' + icon('x') + '</button></div>' +
    '<div class="row">' + mascot(70, 'happy') + '<p class="flex1 muted" style="margin:0">' + h.intro + '</p></div><div class="help-body">' +
    (h.steps ? '<h4>ทำตามนี้</h4><div class="steps">' + h.steps.map(function (s) { return '<div><div>' + s + '</div></div>'; }).join('') + '</div>' : '') +
    (h.tips ? '<h4>เคล็ดลับ</h4><ul>' + h.tips.map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ul>' : '') +
    (h.terms ? '<h4>คำศัพท์ในหน้านี้</h4><dl class="kv">' + h.terms.map(function (t) { return '<dt>' + esc(t[0]) + '</dt><dd>' + t[1] + '</dd>'; }).join('') + '</dl>' : '') + '</div>';
  drawer(html);
}
document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-help]'); if (b) openHelp(b.getAttribute('data-help')); });

/* ================================================================ data helpers */
function setBoot(b) {
  S.boot = b;
  if (b.items && b.items.cols) {
    var cols = b.items.cols; S.itemsList = b.items.rows.map(function (r) { var o = {}; cols.forEach(function (k, i) { o[k] = r[i] == null ? '' : r[i]; }); return o; });
  } else if (Array.isArray(b.items)) S.itemsList = b.items;
  S.items = {}; S.itemsList.forEach(function (it) { S.items[it.key] = it; });
  S.cats = {}; (b.categories || []).forEach(function (c) { S.cats[c.code] = c; });
  S.codes = {}; (b.incomeCodes || []).forEach(function (r) { S.codes[r[0]] = r[1]; });
  lsSet(keyFor('boot'), b);
}
/** รหัสรายได้ HRMi ของชื่อนี้ ('' = ไม่พบ) */
function codeOf(name) { return S.codes[R.itemKey(name, '').replace(/\|$/, '')] || ''; }
function setItems(compact) { if (!compact) return; S.boot.items = compact; setBoot(S.boot); }
function activeCats() { return (S.boot.categories || []).filter(function (c) { return c.active !== false; }); }
function roundsList() { return (S.boot && S.boot.rounds) || []; }
function curRound() { return roundsList().filter(function (r) { return r.id === S.roundId; })[0] || null; }
function setRounds(list) { S.boot.rounds = list; lsSet(keyFor('boot'), S.boot); }
function pickDefaultRound() {
  var list = roundsList(), saved = lsGet(keyFor('round'));
  if (saved && list.some(function (r) { return r.id === saved; })) return saved;
  var open = list.filter(function (r) { return r.status === 'OPEN'; });
  return open.length ? open[open.length - 1].id : list.length ? list[list.length - 1].id : null;
}
/** โหลดข้อมูลรอบ: แสดงที่จำไว้ทันที (onCache) แล้วถามหลังบ้านด้วย rev */
function loadRound(id, onData, force) {
  if (!id) { S.data = null; onData && onData(null); return Promise.resolve(null); }
  var ck = keyFor('round:' + id), cached = S.data && S.data.round.id === id ? S.data : lsGet(ck);
  if (cached && !force) { S.data = cached; onData && onData(cached, true); }
  return api('getRound', { id: id, rev: force ? '' : cached && cached.rev }).then(function (d) {
    if (d.same) return S.data;
    applyRound(d); onData && onData(d, false); return d;
  });
}
/** กล่องรอข้อมูลรอบ: โครงโหลด หรือ (ถ้าโหลดไม่สำเร็จ) ข้อความ + ปุ่มลองใหม่ — ไม่ค้างโครงโหลดตลอดไป */
function roundWait() {
  if (!S.roundErr) return '<div class="card"><div class="sk" style="height:300px"></div><p class="small muted mt8" style="text-align:center">กำลังโหลดข้อมูลรอบ… ถ้า Google ตอบช้าอาจใช้เวลา 10–30 วินาที</p></div>';
  return '<div class="card empty">' + mascot(90, 'sleep') + '<h3>โหลดข้อมูลรอบไม่สำเร็จ</h3><p class="small muted">' + esc(S.roundErr) + '</p><button class="btn pri" onclick="App.reloadRound()">' + icon('refresh') + 'ลองอีกครั้ง</button></div>';
}
function applyRound(d) {
  if (!d || !d.round) return;
  S.data = d; lsSet(keyFor('round:' + d.round.id), d);
  var list = roundsList().map(function (r) { return r.id === d.round.id ? d.round : r; });
  if (!list.some(function (r) { return r.id === d.round.id; })) list.push(d.round);
  setRounds(list.sort(function (a, b) { return a.id < b.id ? -1 : 1; }));
  updateRoundPick();
}
function isOpenRound() { return S.data && S.data.round && S.data.round.status === 'OPEN'; }

/* ================================================================ shell + router */
var Pages = {};
var NAV = [
  { sec: 'ภาพรวม' }, { key: 'home', label: 'หน้าแรก', icon: 'home' }, { key: 'rounds', label: 'รอบการจ่าย', icon: 'cal' },
  { sec: 'งานประจำรอบ' }, { key: 'import', label: 'นำเข้าจาก HRMi', icon: 'paste' }, { key: 'docs', label: 'เอกสารรอบนี้', icon: 'docs', badge: 'docs' },
  { key: 'checklist', label: 'เช็กลิสต์ความครบ', icon: 'check', badge: 'missing' }, { key: 'plan', label: 'ประมาณการ', icon: 'wallet' }, { key: 'close', label: 'ปิดรอบ', icon: 'lockr' },
  { key: 'report', label: 'รายงาน & Export', icon: 'chart' },
  { sec: 'เครื่องมือ' }, { key: 'smc', label: 'ตรวจแพทย์ SMC 80/20', icon: 'steth' }, { key: 'deduct', label: 'รายการเงินหัก', icon: 'minus' }, { key: 'wl', label: 'ตรวจ WL รายฝ่าย', icon: 'grid' },
  { sec: 'ระบบ' }, { key: 'settings', label: 'ตั้งค่า', icon: 'gear' }
];
var MBAR = ['home', 'import', 'docs', 'checklist'];
function navHtml() {
  return NAV.map(function (n) {
    if (n.sec) return '<div class="nav-sec">' + esc(n.sec) + '</div><div class="nav-sep"></div>';
    return '<a href="#/' + n.key + '" data-nav="' + n.key + '">' + icon(n.icon) + '<span>' + esc(n.label) + '</span>' + (n.badge ? '<span class="badge" data-badge="' + n.badge + '" hidden></span>' : '') + '</a>';
  }).join('');
}
function renderShell() {
  var me = S.boot.me, ini = (me.fullName || '?').replace(/^(นาย|นางสาว|นาง)\s*/, '').charAt(0);
  $('#app').innerHTML = '<div class="topprog"></div><div class="shell"><aside class="side">' +
    '<div class="side-top"><a class="brand" href="#/home">' + mascot(44) + '<span><span class="brand-name">Pay<b>Pop</b></span><span class="brand-sub">ระบบสรุปบันทึกการจ่าย</span></span></a>' +
    '<button class="side-tog" id="sideTog" type="button" aria-label="ยุบ/ขยายเมนู">' + icon('left') + '</button></div>' +
    '<button class="round-pick" id="roundPick" type="button"></button><nav class="nav" aria-label="เมนูหลัก">' + navHtml() + '</nav>' +
    '<div class="side-foot"><div class="me"><span class="avatar">' + esc(ini) + '</span><span class="grow"><span class="nm ellip" style="display:block">' + esc(me.fullName) + '</span><span class="cd">' + esc(me.empCode) + '</span></span>' +
    '<button class="btn ghost icon sm" id="themeBtn" data-tip="สลับโหมดสว่าง/มืด" aria-label="สลับธีม">' + icon('moon') + '</button><button class="btn ghost icon sm" id="meBtn" data-tip="บัญชีของฉัน" aria-label="บัญชี">' + icon('down') + '</button></div>' +
    '<div class="tiny muted" style="padding:0 8px">v' + esc(S.boot.app.version) + ' · build ' + esc(APP_BUILD) + '</div></div></aside>' +
    '<main class="main"><div class="mhead">' + mascot(36) + '<button class="round-pick" id="roundPick2" type="button"></button><button class="btn icon" id="mMenu" aria-label="เมนู">' + icon('menu') + '</button></div>' +
    '<div id="banner"></div><div id="view"></div></main></div>' +
    '<nav class="mbar" aria-label="เมนูมือถือ">' + MBAR.map(function (k) { var n = NAV.filter(function (x) { return x.key === k; })[0]; return '<a href="#/' + k + '" data-nav="' + k + '">' + icon(n.icon) + '<span>' + esc(n.label.replace('จาก HRMi', '').replace('ความครบ', '')) + '</span></a>'; }).join('') +
    '<button type="button" id="mMore">' + icon('menu') + '<span>เพิ่มเติม</span></button></nav>';
  $('#roundPick').onclick = roundMenu; $('#roundPick2').onclick = roundMenu;
  $('#themeBtn').onclick = toggleTheme;
  $('#sideTog').onclick = function () { Layout.toggleSide(); };
  $('#meBtn').onclick = function () {
    var dense = Layout.density() === 'compact';
    popover($('#meBtn'), [{ label: dense ? 'มุมมองสบายตา (ตัวใหญ่)' : 'มุมมองกะทัดรัด (เห็นข้อมูลมากขึ้น)', icon: 'grid', value: 'dense' }, { label: 'สลับโหมดสว่าง/มืด', icon: 'moon', value: 'theme' }, '-', { label: 'เปลี่ยนรหัสผ่าน', icon: 'key', value: 'pw' }, { label: 'ซิงก์ข้อมูลใหม่ทั้งหมด', icon: 'refresh', value: 'sync' }, '-', { label: 'ออกจากระบบ', icon: 'out', value: 'out' }], function (v) {
      if (v === 'dense') Layout.setDensity(dense ? 'comfy' : 'compact'); else if (v === 'theme') toggleTheme();
      else if (v === 'pw') changePasswordDlg(); else if (v === 'sync') App.resync(); else if (v === 'out') App.logout();
    });
  };
  var more = function (e) {
    popover(e.currentTarget, NAV.filter(function (n) { return n.key; }).map(function (n) { return { label: n.label, icon: n.icon, value: n.key, on: S.page === n.key }; }).concat(['-', { label: 'สลับธีม', icon: 'moon', value: '_theme' }, { label: 'ออกจากระบบ', icon: 'out', value: '_out' }]), function (v) {
      if (v === '_theme') toggleTheme(); else if (v === '_out') App.logout(); else location.hash = '#/' + v;
    });
  };
  $('#mMore').onclick = more; $('#mMenu').onclick = more;
  updateRoundPick(); checkBanner(); Layout.apply();
}

/* ================================================================ layout: เมนูข้างยุบได้ · ความหนาแน่น (จำไว้ในเครื่อง) */
var Layout = {
  pref: function () { try { return localStorage.getItem('pp:side') || ''; } catch (e) { return ''; } },
  mini: function () { var p = Layout.pref(); return p ? p === 'mini' : window.innerWidth < 1280; },
  density: function () { try { return localStorage.getItem('pp:density') || 'compact'; } catch (e) { return 'compact'; } },
  apply: function () {
    var root = document.documentElement, mini = Layout.mini();
    root.setAttribute('data-density', Layout.density());
    root.classList.toggle('side-mini', mini);
    $$('.side .nav a').forEach(function (a) { var t = $('span', a); if (mini && t) a.setAttribute('data-tip', t.textContent); else a.removeAttribute('data-tip'); });
    var rp = $('#roundPick'); if (rp) { if (mini) rp.setAttribute('data-tip', 'เปลี่ยนรอบที่กำลังดู'); else rp.removeAttribute('data-tip'); }
    var tg = $('#sideTog'); if (tg) tg.setAttribute('data-tip', mini ? 'ขยายเมนู' : 'ยุบเมนู');
  },
  toggleSide: function () { try { localStorage.setItem('pp:side', Layout.mini() ? 'full' : 'mini'); } catch (e) { } Layout.apply(); },
  setDensity: function (v) { try { localStorage.setItem('pp:density', v); } catch (e) { } Layout.apply(); toast(v === 'compact' ? 'มุมมองกะทัดรัด' : 'มุมมองสบายตา', 'ok', 1600); }
};
window.addEventListener('resize', debounce(function () { if (!Layout.pref()) Layout.apply(); }, 200));
function updateRoundPick() {
  var r = curRound();
  ['#roundPick', '#roundPick2'].forEach(function (s) {
    var el = $(s); if (!el) return;
    el.innerHTML = '<span class="nm-s">' + (r ? icon('cal') + '<b>' + esc(R.ymLabel(r.id)) + '</b>' + (r.status === 'OPEN' ? '<i class="dot ok"></i>' : '') : icon('cal')) + '</span><span class="lab">รอบที่กำลังดู ' + icon('down') + '</span><span class="nm">' + (r ? esc(r.name) + ' ' + (r.status === 'OPEN' ? '<span class="pill st-APPROVED">เปิด</span>' : '<span class="pill st-NONE">ปิดแล้ว</span>') : '<span class="muted">ยังไม่มีรอบ</span>') + '</span>';
  });
  updateBadges();
}
function roundMenu(e) {
  var list = roundsList().slice().reverse();
  var items = list.slice(0, 14).map(function (r) { return { html: esc(r.name) + ' <span class="pill ' + (r.status === 'OPEN' ? 'st-APPROVED' : 'st-NONE') + '" style="margin-left:auto">' + (r.status === 'OPEN' ? 'เปิด' : 'ปิด') + '</span>', value: r.id, on: r.id === S.roundId }; });
  items.push('-'); items.push({ label: 'จัดการรอบทั้งหมด / สร้างรอบใหม่', icon: 'cal', value: '_all' });
  popover(e.currentTarget, items, function (v) { if (v === '_all') location.hash = '#/rounds'; else App.selectRound(v); });
}
function updateBadges() {
  var d = S.data, docs = $('[data-badge="docs"]'), miss = $('[data-badge="missing"]');
  if (docs) { var n = d && d.docs ? d.docs.filter(function (x) { return x.flag !== 'REMOVED' && x.flag !== 'MOVED'; }).length : 0; docs.textContent = n; docs.hidden = !n; docs.className = 'badge soft'; }
  if (miss && window.Logic && d && d.round.status === 'OPEN') { var m = Logic.checklist(d).missing; miss.textContent = m; miss.hidden = !m; } else if (miss) miss.hidden = true;
}
function toggleTheme() {
  var cur = document.documentElement.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  var nx = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', nx); try { localStorage.setItem('pp:theme', nx); } catch (e) { }
}
function checkBanner() {
  var b = $('#banner'); if (!b || !S.boot) return;
  var msgs = [];
  if (S.boot.app.build !== APP_BUILD) msgs.push('หน้าเว็บ build ' + APP_BUILD + ' แต่หลังบ้าน build ' + S.boot.app.build + ' — ผู้ดูแลต้อง Deploy › Manage deployments › New version ให้ตรงกัน');
  if (S.newVersion) msgs.push('มีหน้าเว็บเวอร์ชันใหม่ (' + S.newVersion + ') <button class="btn sm" onclick="location.reload(true)">' + icon('refresh') + 'โหลดใหม่</button>');
  b.innerHTML = msgs.map(function (m) { return '<div class="banner">' + icon('alert') + '<span class="flex1">' + m + '</span></div>'; }).join('');
}
function pageHead(key, title, sub, actions) {
  var n = NAV.filter(function (x) { return x.key === key; })[0];
  return '<div class="topbar"><div class="grow"><h1>' + (n ? '<span class="kpi"><span class="ico t-pri" style="position:static;width:42px;height:42px">' + icon(n.icon) + '</span></span>' : '') + esc(title) + helpBtn(key) + '</h1>' + (sub ? '<div class="sub">' + sub + '</div>' : '') + '</div>' +
    '<div class="top-actions">' + (actions || '') + '<span class="sync" id="sync"><span class="dot"></span>ข้อมูลล่าสุด</span></div></div>';
}
function noRound(msg) {
  return '<div class="card empty">' + mascot(110, 'think') + '<h3>' + esc(msg || 'ยังไม่ได้เลือกรอบการจ่าย') + '</h3><p>สร้างรอบใหม่หรือเลือกรอบจากเมนูด้านซ้ายก่อนนะ</p><a class="btn pri" href="#/rounds">' + icon('plus') + 'ไปหน้ารอบการจ่าย</a></div>';
}
function lockedNote() {
  return S.data && S.data.round.status !== 'OPEN' ? '<div class="callout info mb12">' + icon('lockr') + '<div><b>' + esc(S.data.round.name) + ' ปิดรอบแล้ว</b> — ดูได้อย่างเดียว ถ้าต้องแก้ไขให้ไปที่ <a href="#/rounds">รอบการจ่าย</a> แล้วกด "เปิดรอบอีกครั้ง"</div></div>' : '';
}
function route() {
  var h = (location.hash || '#/home').replace(/^#\/?/, ''), key = h.split('?')[0] || 'home';
  if (!Pages[key]) key = 'home';
  if (S.bulk && S.page !== key) { history.replaceState(null, '', '#/' + S.page + (S.page === 'settings' ? '?tab=history' : '')); toast('กำลังนำเข้าข้อมูลอยู่ กรุณารอให้เสร็จก่อนเปลี่ยนหน้า', 'warn'); return; }
  if (S.dirty && S.page !== key) {
    var leaving = S.page;
    confirmDlg('ยังไม่ได้บันทึก', 'มีการแก้ไขที่ยังไม่ได้กดบันทึกในหน้านี้ ต้องการออกโดยไม่บันทึกใช่ไหม', 'ออกโดยไม่บันทึก', true).then(function (y) {
      if (y) { S.dirty = null; route(); } else history.replaceState(null, '', '#/' + leaving);
    });
    return;
  }
  S.page = key; closePops();
  $$('[data-nav]').forEach(function (a) { a.classList.toggle('on', a.getAttribute('data-nav') === key); });
  var v = $('#view'); v.innerHTML = '';
  var wrap = document.createElement('div'); wrap.className = 'page'; v.appendChild(wrap);
  try { Pages[key].render(wrap, h); } catch (e) { console.error(e); wrap.innerHTML = '<div class="card">' + esc(e.message) + '</div>'; }
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);
window.addEventListener('beforeunload', function (e) { if (S.dirty) { e.preventDefault(); e.returnValue = ''; } });
function refreshPage() { if (S.page && Pages[S.page]) { var keep = S.dirty; S.dirty = null; route(); S.dirty = keep; } }

/* ================================================================ login / password */
function renderLogin(msg) {
  $('#app').innerHTML = '<div class="login"><section class="login-art">' +
    '<span class="bubble" style="width:180px;height:180px;left:-40px;top:8%"></span><span class="bubble" style="width:110px;height:110px;right:12%;top:14%;animation-delay:-3s"></span><span class="bubble" style="width:240px;height:240px;right:-70px;bottom:-60px;animation-delay:-5s"></span>' +
    mascot(150) + '<h1>PayPop</h1><p>สรุปบันทึกการจ่ายประจำเดือน วาง → จัดหมวด → เช็กครบ → ปิดรอบ จบในที่เดียว</p>' +
    '<div class="feat"><span>วางจาก HRMi ได้ทันที</span><span>จัดหมวดอัตโนมัติ</span><span>เช็กลิสต์ความครบ</span><span>Export Excel</span></div></section>' +
    '<section class="login-form"><form class="login-box" id="loginForm" autocomplete="on"><div><h2>เข้าสู่ระบบ</h2><p class="muted" style="margin:4px 0 0">งานเงินเดือน ฝ่ายทรัพยากรบุคคล รพ.สมเด็จฯ</p></div>' +
    (msg ? '<div class="callout warn">' + icon('info') + '<span>' + esc(msg) + '</span></div>' : '') +
    '<div class="field"><label for="lg-code">รหัสพนักงาน ' + q('ตัวเลข 7 หลัก เช่น 5660101') + '</label><input id="lg-code" class="inp" inputmode="numeric" maxlength="7" autocomplete="username" required></div>' +
    '<div class="field"><label for="lg-pw">รหัสผ่าน ' + q('เข้าครั้งแรกใช้รหัสพนักงานเป็นรหัสผ่าน แล้วระบบจะให้ตั้งรหัสใหม่') + '</label><input id="lg-pw" class="inp" type="password" autocomplete="current-password" required></div>' +
    '<button class="btn pri" id="lgBtn" type="submit" style="padding:12px">' + icon('right') + 'เข้าสู่ระบบ</button>' +
    '<div class="conn" id="conn"><span class="sync busy" style="padding:2px 8px"><span class="dot"></span>กำลังตรวจการเชื่อมต่อ…</span></div>' +
    '<p class="tiny muted" style="margin:0">PayPop v1.2569 · build ' + APP_BUILD + ' · ' + APP_BUILD_TH + '</p></form></section></div>';
  var lc = lsGet('pp:lastCode'); if (lc) $('#lg-code').value = lc;
  setTimeout(function () { ($('#lg-code').value ? $('#lg-pw') : $('#lg-code')).focus(); }, 50);
  var connMsg = function (cls, txt) { var c = $('#conn'); if (c) c.innerHTML = '<span class="sync ' + cls + '" style="padding:2px 8px"><span class="dot"></span>' + txt + '</span>'; };
  var pingTry = 0, ping = function () {
    fetchOnce('ping', {}).then(function (r) {
      var ok = r.ok && r.data.installed;
      connMsg(ok ? '' : 'err', ok ? 'เชื่อมต่อระบบแล้ว · หลังบ้าน build ' + esc(r.data.build) : (r.ok ? 'หลังบ้านยังไม่ได้ติดตั้ง (Run setupSystem)' : 'เชื่อมต่อไม่ได้'));
    }, function () {
      pingTry++;
      if (pingTry < 4) { connMsg('busy', 'Google ตอบช้า กำลังลองใหม่ (' + pingTry + '/3)…'); setTimeout(ping, pingTry * 3000); }
      else connMsg('err', 'Google ไม่ว่างชั่วคราว (ไม่ใช่ปัญหา config.js) — เข้าสู่ระบบได้ตามปกติ ระบบจะลองใหม่ให้เอง');
    });
  };
  ping();
  $('#loginForm').onsubmit = function (e) {
    e.preventDefault();
    var code = $('#lg-code').value.trim(), pw = $('#lg-pw').value, b = $('#lgBtn'), n = 0;
    b.classList.add('loading');
    var go = function () {
      fetchOnce('login', { empCode: code, password: pw, withBoot: true, dv: '' }).then(function (r) {
        b.classList.remove('loading');
        if (!r.ok) { toast(r.error, 'bad'); return; }
        lsSet('pp:lastCode', code);
        S.token = r.data.token; lsSet('pp:token', S.token);
        if (r.data.mustChange) return forcePassword(code, r.data.fullName);
        setBoot(r.data.boot); App.enter();
      }, function (e) {
        if (n < 3) { n++; connMsg('busy', 'Google ตอบช้า กำลังลองเข้าสู่ระบบใหม่ (' + n + '/3)…'); setTimeout(go, n * 3000); return; }
        b.classList.remove('loading'); connMsg('err', 'Google ไม่ว่างชั่วคราว กรุณารอ 1–2 นาทีแล้วกดเข้าสู่ระบบอีกครั้ง'); fail(e);
      });
    };
    go();
  };
}
function forcePassword(code, name) {
  $('#app').innerHTML = '<div class="login"><section class="login-art">' + mascot(140, 'wow') + '<h1>ยินดีต้อนรับ!</h1><p>' + esc(name || '') + '<br>ตั้งรหัสผ่านใหม่ของคุณก่อนเริ่มใช้งานนะ</p></section>' +
    '<section class="login-form"><form class="login-box" id="pwForm"><h2>ตั้งรหัสผ่านใหม่</h2><div class="callout info">' + icon('info') + '<span>อย่างน้อย 8 ตัว มีทั้งตัวอักษรภาษาอังกฤษและตัวเลข และต้องไม่ใช่รหัสพนักงาน</span></div>' +
    '<div class="field"><label for="np1">รหัสผ่านใหม่</label><input id="np1" class="inp" type="password" autocomplete="new-password" required></div>' +
    '<div class="field"><label for="np2">ยืนยันรหัสผ่านใหม่</label><input id="np2" class="inp" type="password" autocomplete="new-password" required></div>' +
    '<button class="btn pri" id="npBtn" type="submit" style="padding:12px">' + icon('ok') + 'บันทึกและเริ่มใช้งาน</button></form></section></div>';
  $('#np1').focus();
  $('#pwForm').onsubmit = function (e) {
    e.preventDefault();
    if ($('#np1').value !== $('#np2').value) return toast('รหัสผ่านใหม่ 2 ช่องไม่ตรงกัน', 'warn');
    var b = $('#npBtn'); b.classList.add('loading');
    api('changePassword', { oldPassword: code, newPassword: $('#np1').value, withBoot: true }).then(function (r) {
      setBoot(r.boot); toast('ตั้งรหัสผ่านเรียบร้อย ยินดีต้อนรับสู่ PayPop 🎉', 'ok'); confetti(); App.enter();
    }, function (e) { b.classList.remove('loading'); fail(e); });
  };
}
function changePasswordDlg() {
  modal({ title: 'เปลี่ยนรหัสผ่าน', icon: 'key', tone: 't-sun', body:
    '<div class="field"><label for="cp0">รหัสผ่านเดิม</label><input id="cp0" class="inp" type="password" autocomplete="current-password"></div>' +
    '<div class="field"><label for="cp1">รหัสผ่านใหม่ ' + q('อย่างน้อย 8 ตัว มีตัวอักษรอังกฤษและตัวเลข') + '</label><input id="cp1" class="inp" type="password" autocomplete="new-password"></div>' +
    '<div class="field"><label for="cp2">ยืนยันรหัสผ่านใหม่</label><input id="cp2" class="inp" type="password" autocomplete="new-password"></div>',
    actions: [{ label: 'ยกเลิก', cls: 'ghost', value: null }, { label: 'บันทึก', cls: 'pri', click: function (ov) {
      if ($('#cp1', ov).value !== $('#cp2', ov).value) { toast('รหัสผ่านใหม่ 2 ช่องไม่ตรงกัน', 'warn'); return false; }
      return api('changePassword', { oldPassword: $('#cp0', ov).value, newPassword: $('#cp1', ov).value }).then(function () { toast('เปลี่ยนรหัสผ่านแล้ว', 'ok'); });
    } }] });
}

/* ================================================================ app lifecycle */
var App = {
  start: function () {
    Layout.apply();
    if (typeof API_URL === 'undefined' || /ใส่|PASTE|xxxxx/i.test(API_URL)) { $('#app').innerHTML = '<div class="boot-splash">' + mascot(120, 'think') + '<h2>ยังไม่ได้ตั้งค่า config.js</h2><p>ใส่ลิงก์ /exec ของ Apps Script ในไฟล์ config.js</p></div>'; return; }
    S.token = lsGet('pp:token');
    var code = lsGet('pp:lastCode');
    if (S.token && code) {
      var cached = lsGet('pp:' + code + ':boot');
      if (cached) { setBoot(cached); App.enter(true); }
      api('bootstrap', { dv: cached ? cached.dv : '' }).then(function (b) {
        if (!b.same) { setBoot(b); if (!cached) App.enter(); else { updateRoundPick(); checkBanner(); refreshPage(); } }
      }, function (e) { if (e.code !== 'UNAUTHORIZED') { if (!cached) renderLogin(); fail(e); } });
    } else renderLogin();
    App.versionWatch();
  },
  enter: function () {
    renderShell();
    S.roundId = pickDefaultRound();
    if (!location.hash || location.hash === '#/' || location.hash === '#') history.replaceState(null, '', '#/home');
    route();
    if (S.roundId) App.reloadRound(true);
    setTimeout(App.prefetch, 20000);
  },
  /** โหลดข้อมูลรอบปัจจุบัน · ไม่สำเร็จ = แสดงปุ่มลองใหม่ และลองเองอีก 2 ครั้ง (20/60 วิ) */
  reloadRound: function (first, n) {
    var id = S.roundId; if (!id) return;
    n = n || 0; S.roundErr = null; if (!first && !S.data) refreshPage();
    loadRound(id, function (d, fromCache) { updateBadges(); if (!fromCache || !first) refreshPage(); }).then(function () { S.roundErr = null; }, function (e) {
      if (S.roundId !== id) return;
      if (S.data && S.data.round.id === id) { toast('ใช้ข้อมูลที่จำไว้ในเครื่อง (' + e.message + ')', 'warn', 5000); return; }
      S.roundErr = e.message; refreshPage();
      if (n < 2) setTimeout(function () { if (S.roundId === id && !S.data) App.reloadRound(false, n + 1); }, n ? 60000 : 20000);
    });
  },
  /** โหลดข้อมูลหน้าที่เปิดบ่อยเก็บไว้ในเครื่องล่วงหน้า (หลังหน้าแรกขึ้นแล้ว ทีละคำขอ ไม่แย่งหน้าที่ใช้อยู่) */
  prefetch: function () {
    if (!S.token || S.bulk) return;
    if (NET.log.slice(0, 5).some(function (x) { return !x.ok || x.ms > 15000; })) return;   // Google กำลังช้า → ไม่โหลดล่วงหน้า
    var rid = S.roundId, jobs = [];
    if (rid && S.page !== 'deduct') jobs.push(function () { return api('getDeductions', { roundId: rid }).then(function (r) { lsSet(keyFor('ded:' + rid), r); }); });
    if (S.page !== 'wl') jobs.push(function () { return api('getWl', {}).then(function (r) { lsSet(keyFor('wl'), r.rows); }); });
    jobs.reduce(function (p, j) { return p.then(j).catch(function () { }); }, Promise.resolve());
  },
  selectRound: function (id) {
    if (S.dirty) return toast('กรุณาบันทึกหรือยกเลิกการแก้ไขในหน้านี้ก่อนเปลี่ยนรอบ', 'warn');
    S.roundId = id; lsSet(keyFor('round'), id); S.data = null; S.roundErr = null; updateRoundPick();
    refreshPage();
    App.reloadRound(false);
  },
  resync: function () {
    try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf(keyFor('')) === 0) localStorage.removeItem(k); }); } catch (e) { }
    api('bootstrap', {}).then(function (b) { setBoot(b); updateRoundPick(); return loadRound(S.roundId, null, true); }).then(function () { refreshPage(); toast('ซิงก์ข้อมูลใหม่ทั้งหมดแล้ว', 'ok'); }, fail);
  },
  logout: function (silent) {
    if (!silent) api('logout', {}).catch(function () { });
    S.token = null; S.data = null; S.dirty = null; lsDel('pp:token');
    renderLogin();
  },
  versionWatch: function () {
    var check = function () {
      fetch('version.json?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (v) {
        if (v && v.build && v.build !== APP_BUILD) { S.newVersion = v.build; checkBanner(); }
      }).catch(function () { });
    };
    setTimeout(check, 4000); setInterval(check, 600000);
  }
};

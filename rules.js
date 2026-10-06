/**
 * Rules.gs = rules.js (หน้าเว็บ) — กฎกลางของ PayPop ต้องเหมือนกันทุกตัวอักษร
 * แก้ที่ไฟล์หนึ่งแล้วคัดลอกไปอีกไฟล์ (ชุดทดสอบตรวจให้)
 * ไม่มีการเรียก Google API ในไฟล์นี้ ใช้ได้ทั้งหลังบ้านและหน้าเว็บ
 */
var R = (function () {
  var MTH_S = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  var MTH_L = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  var HR_STATUS = [
    { code: 'WAIT', name: 'รอเอกสาร', tip: 'ต้นทางคีย์เบิกใน HRMi แล้ว แต่ HR ยังไม่ได้รับเอกสาร' },
    { code: 'PROC', name: 'กำลังดำเนินการ', tip: 'เอกสารถึง HR แล้ว กำลังตรวจ' },
    { code: 'RETURN', name: 'ส่งคืนแก้ไข', tip: 'ส่งเอกสารกลับหน่วยงานเพื่อแก้ไข รอติดตาม' },
    { code: 'APPROVED', name: 'อนุมัติ', tip: 'ตรวจเรียบร้อย พร้อมไปกดอนุมัติใน HRMi' }
  ];
  var FIELDS = ['docNo', 'docDate', 'incomeName', 'remark', 'hrmiStatus', 'effectDate', 'income', 'deduct', 'orgUnit', 'div', 'payType', 'jobName'];
  var HEAD_TH = { 'เลขที่เอกสาร': 'docNo', 'วันที่เอกสาร': 'docDate', 'ชื่อรายได้/รายการหัก': 'incomeName', 'ชื่อรายได้/รายหัก': 'incomeName', 'ชื่อรายได้': 'incomeName',
    'รายละเอียด': 'remark', 'สถานะ': 'hrmiStatus', 'วันที่มีผล': 'effectDate', 'รวมรายได้ทั้งหมด': 'income', 'รวมรายหักทั้งหมด': 'deduct', 'หน่วยงาน': 'orgUnit',
    'ฝ่าย': 'div', 'ประเภทการจ่าย': 'payType', 'ชื่องาน': 'jobName',
    'Docuno': 'docNo', 'Docudate': 'docDate', 'IncomeDeductName': 'incomeName', 'Remark': 'remark', 'Status': 'hrmiStatus', 'EffectDate': 'effectDate',
    'TotalIncome': 'income', 'TotalDeduct': 'deduct', 'OrgUnitName': 'orgUnit', 'ParentOrgUnitName': 'div', 'PaymentType': 'payType', 'JobName': 'jobName' };
  var PAYTYPE = { PayEndPeriod: 'จ่ายปลายงวด', PayAdvance: 'จ่ายล่วงหน้า', PayBeginPeriod: 'จ่ายล่วงหน้า', AdvancePayment: 'จ่ายล่วงหน้า' };

  function str(v) { return v === null || v === undefined ? '' : String(v); }
  function clean(v) { return str(v).replace(/[ \t\r\n]+/g, ' ').replace(/\s+/g, ' ').trim(); }
  function pad(n, w) { n = String(n); while (n.length < (w || 2)) n = '0' + n; return n; }
  function money(v) {
    if (typeof v === 'number') return isFinite(v) ? Math.round(v * 100) / 100 : 0;
    var s = str(v).replace(/[,\s฿]/g, '');
    if (/^\(.*\)$/.test(s)) s = '-' + s.slice(1, -1);
    var n = parseFloat(s);
    return isNaN(n) ? 0 : Math.round(n * 100) / 100;
  }
  function r2(n) { return Math.round((+n || 0) * 100) / 100; }

  /** วันที่ทุกแบบ → dd/mm/พ.ศ. ('' ถ้าว่าง) */
  function normDate(v) {
    var s = clean(v), m;
    if (!s) return '';
    if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) {
      var y = +m[1]; if (y < 2400) y += 543;
      return pad(+m[3]) + '/' + pad(+m[2]) + '/' + y;
    }
    if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/))) {
      var yy = +m[3]; if (yy < 100) yy += 2500; else if (yy < 2400) yy += 543;
      return pad(+m[1]) + '/' + pad(+m[2]) + '/' + yy;
    }
    return s;
  }
  function payType(v) { var s = clean(v); return PAYTYPE[s] || (/advance/i.test(s) ? 'จ่ายล่วงหน้า' : s); }

  /** แถวดิบ (array ตามลำดับ FIELDS หรือ object) → เอกสารมาตรฐาน */
  function normRow(x) {
    var o = {};
    if (x && x.join) FIELDS.forEach(function (f, i) { o[f] = x[i]; }); else FIELDS.forEach(function (f) { o[f] = x ? x[f] : ''; });
    return {
      docNo: clean(o.docNo).toUpperCase(), docDate: normDate(o.docDate), incomeName: clean(o.incomeName), remark: clean(o.remark),
      hrmiStatus: clean(o.hrmiStatus), effectDate: normDate(o.effectDate), income: money(o.income), deduct: money(o.deduct),
      orgUnit: clean(o.orgUnit), div: clean(o.div), payType: payType(o.payType), jobName: clean(o.jobName)
    };
  }
  function validDocNo(s) { return /^[A-Z]{2,5}\d{4,8}-\d{2,6}$/.test(str(s)); }

  /** ข้อความที่คัดลอกจาก HRMi (คั่น Tab) → {rows, errors, header} */
  function parseText(text) {
    var lines = str(text).replace(/^﻿/, '').split(/\r?\n/), rows = [], errors = [], map = null, header = false;
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (!clean(line)) continue;
      var cells = line.split('\t');
      if (cells.length < 2 && line.indexOf(',') > 0 && /^"?[A-Z]{2,5}\d/.test(line)) cells = csvLine(line);
      var first = clean(cells[0]);
      if (!map && HEAD_TH[first]) {
        map = cells.map(function (c) { return HEAD_TH[clean(c)] || ''; }); header = true; continue;
      }
      var o = {};
      if (map) map.forEach(function (f, k) { if (f) o[f] = cells[k]; });
      else FIELDS.forEach(function (f, k) { o[f] = cells[k]; });
      var d = normRow(o);
      if (!validDocNo(d.docNo)) { errors.push({ line: i + 1, text: line.slice(0, 80), why: 'ไม่พบเลขที่เอกสารในคอลัมน์แรก' }); continue; }
      if (!map && cells.length < 12) { errors.push({ line: i + 1, text: line.slice(0, 80), why: 'คอลัมน์ไม่ครบ 12 ช่อง (มี ' + cells.length + ')' }); continue; }
      rows.push(d);
    }
    return { rows: rows, errors: errors, header: header };
  }
  function csvLine(line) {
    var out = [], cur = '', q = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line.charAt(i);
      if (q) { if (ch === '"') { if (line.charAt(i + 1) === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
      else if (ch === '"') q = true; else if (ch === ',') { out.push(cur); cur = ''; } else cur += ch;
    }
    out.push(cur); return out;
  }
  /** ตาราง 2 มิติ (จากไฟล์ Export) → {rows, errors} หาแถวหัวคอลัมน์เอง */
  function parseTable(grid) {
    var map = null, rows = [], errors = [];
    for (var i = 0; i < grid.length; i++) {
      var cells = grid[i] || [];
      if (!map) {
        var m = cells.map(function (c) { return HEAD_TH[clean(c)] || ''; });
        if (m.indexOf('docNo') >= 0 && m.indexOf('income') >= 0) { map = m; continue; }
        if (validDocNo(clean(cells[0]).toUpperCase())) map = FIELDS.slice(); else continue;
      }
      var o = {}; map.forEach(function (f, k) { if (f) o[f] = cells[k]; });
      var d = normRow(o);
      if (!d.docNo) continue;
      if (!validDocNo(d.docNo)) { errors.push({ line: i + 1, text: clean(cells.join(' ')).slice(0, 80), why: 'เลขที่เอกสารไม่ถูกต้อง' }); continue; }
      rows.push(d);
    }
    if (!map) errors.push({ line: 0, text: '', why: 'ไม่พบหัวคอลัมน์ของ HRMi ในไฟล์' });
    return { rows: rows, errors: errors };
  }

  function isPay(docNo, prefixes) {
    var list = str(prefixes || 'PAY').split(/[,\s]+/).filter(Boolean);
    for (var i = 0; i < list.length; i++) if (str(docNo).indexOf(list[i].toUpperCase()) === 0) return true;
    return false;
  }
  function divShort(div) { return clean(div).replace(/^รพ\.?\s*สมเด็จฯ?\s*-\s*/, '').replace(/^โรงพยาบาลสมเด็จพระบรมราชเทวี ณ ศรีราชา\s*-?\s*/, ''); }
  function itemKey(name, div) { return clean(name) + '|' + clean(div); }
  function docTail(docNo) { var m = str(docNo).match(/-(\d+)$/); return m ? pad(m[1].slice(-4), 4) : str(docNo).slice(-4); }

  /** ทำความสะอาดข้อความสำหรับชื่อไฟล์ Scan (อักขระที่ HRMi ไม่รับ) */
  function safeName(s, rules) {
    rules = rules || {};
    var out = clean(s);
    (rules.replace || [['&', 'และ'], ['/', '-'], ['\\', '-']]).forEach(function (p) { out = out.split(p[0]).join(p[1]); });
    var rm = rules.remove == null ? '()[]{}+#\'":*?<>|;,' : rules.remove;
    for (var i = 0; i < rm.length; i++) out = out.split(rm.charAt(i)).join(' ');
    return out.replace(/\s+/g, ' ').replace(/[.\s-]+$/, '').trim();
  }
  /** ค่าตั้ง (FILE_SEP, FILE_REPLACE "ก => ข" ทีละบรรทัด, FILE_REMOVE) → rules */
  function fileRules(s) {
    s = s || {};
    var rep = [];
    str(s.FILE_REPLACE == null ? '& => และ\n/ => -' : s.FILE_REPLACE).split(/\r?\n/).forEach(function (line) {
      var i = line.indexOf('=>'); if (i < 0) return;
      var a = line.slice(0, i).trim(), b = line.slice(i + 2).trim(); if (a) rep.push([a, b]);
    });
    return { sep: s.FILE_SEP == null ? '. ' : str(s.FILE_SEP), replace: rep, remove: s.FILE_REMOVE == null ? null : str(s.FILE_REMOVE) };
  }
  /** ชื่อไฟล์ Scan ของทุกเอกสารในรอบ (ชื่อซ้ำ → ต่อท้ายฝ่าย) คืน map docNo → ชื่อไฟล์ (ไม่มี .pdf) */
  function fileNames(docs, rules) {
    rules = rules || {};
    var sep = rules.sep == null ? '. ' : rules.sep, base = {}, count = {}, out = {};
    docs.forEach(function (d) { var b = safeName(d.incomeName, rules); base[d.docNo] = b; count[b] = (count[b] || 0) + 1; });
    docs.forEach(function (d) {
      var b = base[d.docNo];
      if (count[b] > 1) { var dv = safeName(divShort(d.divFix || d.div), rules); if (dv && b.indexOf(dv) < 0) b += ' ' + dv; }
      out[d.docNo] = docTail(d.docNo) + sep + b;
    });
    return out;
  }

  /** เดือนงานจากรายละเอียด/ชื่องาน → 'yyyy-mm' (พ.ศ.) หรือ '' */
  /** เดือนงานจากรายละเอียด (ไม่พบ → ใช้งวดในชื่องาน) · strict = ต้องระบุเดือนในรายละเอียดเท่านั้น */
  function workYm(remark, jobName, strict) {
    // ตัดส่วน "(รอบจ่าย/รอบเบิก …)" ออก · แก้สะกด กรกฏาคม · ใช้เดือนที่ปรากฏก่อนในข้อความ
    var s = clean(remark).replace(/\(\s*รอบ\s*(จ่าย|เบิก)[^)]*\)?/g, ' ').replace(/กรกฏาคม/g, 'กรกฎาคม'), i, m, hits = [];
    for (i = 0; i < 12; i++) {
      var sh = MTH_S[i].replace(/\./g, '\\.'), bare = MTH_S[i].replace(/\./g, '');
      var re = new RegExp('(' + MTH_L[i] + '|' + sh + '?|' + bare + '(?=\\s*\\d{2}))\\s*(25\\d\\d|\\d\\d)?', 'g');
      while ((m = re.exec(s))) hits.push({ at: m.index, i: i, y: m[2] ? (+m[2] < 100 ? 2500 + (+m[2]) : +m[2]) : 0 });
    }
    hits.sort(function (a, b) { return a.at - b.at; });
    for (var h = 0; h < hits.length; h++) {
      var y = hits[h].y;
      if (!y && strict) continue;   // แบบเข้ม: ต้องมีปีในรายละเอียดด้วย
      if (!y) { var jy = jobYm(jobName); if (jy) { y = +jy.slice(0, 4); if (hits[h].i + 1 > +jy.slice(5)) y--; } }   // ไม่มีปี → ปีของงวด (เดือนเกินงวด = ปีก่อน)
      if (y) return y + '-' + pad(hits[h].i + 1);
    }
    if (strict) return '';
    return jobYm(jobName);
  }
  /** งวดจากชื่องาน เช่น "1-30 ก.ย. 69" → '2569-09' */
  function jobYm(jobName) {
    var m = clean(jobName).match(/([ก-๙]+\.[ก-๙]*\.?)\s*(\d{2,4})\s*$/), i;
    if (m) {
      var key = m[1].replace(/\.?$/, '.');
      for (i = 0; i < 12; i++) if (MTH_S[i] === key || MTH_S[i].replace(/\./g, '') === m[1].replace(/\./g, '')) {
        var yy = +m[2]; if (yy < 100) yy += 2500; return yy + '-' + pad(i + 1);
      }
    }
    return '';
  }
  function ymLabel(ym) { var p = str(ym).split('-'); if (p.length < 2) return str(ym); return MTH_S[+p[1] - 1] + ' ' + p[0].slice(2); }
  function ymLong(ym) { var p = str(ym).split('-'); if (p.length < 2) return str(ym); return MTH_L[+p[1] - 1] + ' ' + p[0]; }
  function roundName(id) { return 'รอบจ่าย ' + ymLabel(id); }
  function ymAdd(ym, n) { var p = str(ym).split('-'), t = (+p[0]) * 12 + (+p[1] - 1) + n; return Math.floor(t / 12) + '-' + pad(t % 12 + 1); }

  /** แบ่ง 80/20: ปัดส่วน 80 เป็น 2 ตำแหน่ง ส่วนที่เหลือเป็น 20 (รวมกันตรงยอดเต็มเสมอ) */
  function split(amount, rate) {
    var a = money(amount), p = r2(a * (rate == null ? 80 : +rate) / 100);
    return { full: a, a: p, b: r2(a - p) };
  }
  /** วางรหัส + ยอด (แพทย์ SMC) → [{empCode, amount, line}] รวมรหัสซ้ำ */
  function parseCodeAmount(text) {
    var out = [], idx = {}, errors = [];
    str(text).split(/\r?\n/).forEach(function (line, i) {
      if (!clean(line)) return;
      var code = (line.match(/\b(\d{7})\b/) || [])[1];
      var nums = line.replace(/\b\d{7}\b/, ' ').match(/-?\d[\d,]*(?:\.\d+)?/g);
      if (!code) { if (/\d/.test(line)) errors.push({ line: i + 1, text: clean(line).slice(0, 60), why: 'ไม่พบรหัส จนท. 7 หลัก' }); return; }
      if (!nums || !nums.length) { errors.push({ line: i + 1, text: clean(line).slice(0, 60), why: 'ไม่พบยอดเงิน' }); return; }
      var amt = money(nums[nums.length - 1]);
      if (idx[code] != null) { out[idx[code]].amount = r2(out[idx[code]].amount + amt); out[idx[code]].dup = (out[idx[code]].dup || 1) + 1; }
      else { idx[code] = out.length; out.push({ empCode: code, amount: amt, line: i + 1 }); }
    });
    return { rows: out, errors: errors };
  }

  /** ตัดสินหมวดของเอกสาร: แก้เอง > ตารางรายการ (ชื่อ×ฝ่าย > ชื่อ) > กฎฝ่ายตกเบิก > '' */
  function catOf(doc, items, tkDiv) {
    if (doc.catFix && doc.category) return doc.category;
    var it = items[itemKey(doc.incomeName, doc.div)] || items[itemKey(doc.incomeName, '')];
    if (it && it.category) return it.category;
    var any = null;
    for (var k in items) if (items.hasOwnProperty(k) && items[k].name === doc.incomeName && items[k].category) { any = items[k]; break; }
    if (any) return any.category;
    if (tkDiv && clean(doc.div) === clean(tkDiv)) return 'TK';
    return '';
  }
  /** หารายการในเช็กลิสต์ของเอกสาร */
  function itemOf(doc, items) {
    var d = doc.divFix || doc.div;
    return items[itemKey(doc.incomeName, d)] || items[itemKey(doc.incomeName, doc.div)] || items[itemKey(doc.incomeName, '')] || null;
  }

  /** สรุปรอบรายหมวด {cat: {docs, income, pending, approved, other, deduct, est}} */
  function roundStats(docs, estimates, items) {
    var out = {}, byName = {};
    if (items) for (var k in items) if (items.hasOwnProperty(k) && items[k].category && !byName[items[k].name]) byName[items[k].name] = items[k].category;
    function g(c) { return out[c] || (out[c] = { docs: 0, income: 0, pending: 0, approved: 0, other: 0, deduct: 0, est: 0 }); }
    (docs || []).forEach(function (d) {
      if (d.flag === 'REMOVED') return;
      var x = g(d.category || '');
      x.docs++; x.income = r2(x.income + money(d.income)); x.deduct = r2(x.deduct + money(d.deduct));
      if (d.hrmiStatus === 'อนุมัติ') x.approved = r2(x.approved + money(d.income));
      else if (d.hrmiStatus === 'รออนุมัติ' || !d.hrmiStatus) x.pending = r2(x.pending + money(d.income));
      else x.other = r2(x.other + money(d.income));
    });
    (estimates || []).forEach(function (e) { var x = g(e.category || byName[e.name] || ''); x.est = r2(x.est + Math.max(0, money(e.amount) - money(e.cut))); });
    return out;
  }
  function sum(list, f) { var s = 0; (list || []).forEach(function (x) { s += money(typeof f === 'function' ? f(x) : x[f]); }); return r2(s); }

  return {
    MTH_S: MTH_S, MTH_L: MTH_L, HR_STATUS: HR_STATUS, FIELDS: FIELDS, HEAD_TH: HEAD_TH,
    str: str, clean: clean, pad: pad, money: money, r2: r2, normDate: normDate, payType: payType, normRow: normRow, validDocNo: validDocNo,
    parseText: parseText, parseTable: parseTable, isPay: isPay, divShort: divShort, itemKey: itemKey, docTail: docTail,
    safeName: safeName, fileRules: fileRules, fileNames: fileNames, workYm: workYm, ymLabel: ymLabel, ymLong: ymLong, roundName: roundName, ymAdd: ymAdd,
    split: split, parseCodeAmount: parseCodeAmount, catOf: catOf, itemOf: itemOf, roundStats: roundStats, sum: sum
  };
})();
if (typeof module !== 'undefined') module.exports = R;

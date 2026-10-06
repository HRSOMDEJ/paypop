/**
 * logic.js — คำนวณฝั่งหน้าเว็บ: เช็กลิสต์ความครบ · ยอดผิดปกติ · ด่านปิดรอบ · สถิติแนวโน้ม · สร้างไฟล์ Excel รายงาน
 * ใช้กฎกลางจาก rules.js (เหมือนหลังบ้านทุกตัวอักษร)
 */
var Logic = (function () {
  var memo = { key: '', val: null };
  function liveDocs(d) { return (d && d.docs || []).filter(function (x) { return x.flag !== 'REMOVED' && x.flag !== 'MOVED'; }); }
  function settings() { return (S.boot && S.boot.settings) || {}; }

  /** เช็กลิสต์ทั้งรอบ → {byCat:{code:{rows,count,missing,amount}}, rows, missing, idle, none, anomaly, unknown} */
  function checklist(d) {
    if (!d) return { byCat: {}, rows: [], missing: 0, idle: 0, none: 0, anomaly: 0, unknown: 0 };
    var key = d.round.id + ':' + d.rev + ':' + (S.boot && S.boot.dv);
    if (memo.key === key) return memo.val;
    var items = S.items, marks = {}, est = {}, avg = (d.stats && d.stats.avg) || {}, prev = (d.stats && d.stats.prev) || {}, lim = +settings().ANOMALY_PCT || 30;
    (d.checklist || []).forEach(function (m) { marks[m.itemKey] = m; });
    (d.estimates || []).forEach(function (e) { est[e.name] = (est[e.name] || 0) + Math.max(0, (+e.amount || 0) - (+e.cut || 0)); });
    var rows = {}, present = {}, presentName = {};
    liveDocs(d).forEach(function (doc) {
      var it = R.itemOf(doc, items), ik = it ? it.key : R.itemKey(doc.incomeName, doc.divFix || doc.div), cat = doc.category || '';
      var rk = cat + '||' + ik;
      var r = rows[rk] || (rows[rk] = { key: rk, itemKey: ik, item: it, name: doc.incomeName, div: it ? it.div : (doc.divFix || doc.div), cat: cat, docs: [], amount: 0, status: 'HAS', avgKeys: {} });
      r.docs.push(doc); r.amount = R.r2(r.amount + (+doc.income || 0)); r.avgKeys[R.itemKey(doc.incomeName, doc.divFix || doc.div)] = 1;
      present[ik] = 1; presentName[doc.incomeName] = 1;
    });
    Object.keys(rows).forEach(function (k) {
      var r = rows[k], a = 0, p = 0, has = false;
      Object.keys(r.avgKeys).forEach(function (x) { if (avg[x] != null) { a += avg[x]; has = true; } if (prev[x] != null) p += prev[x]; });
      r.avg = has ? R.r2(a) : null; r.prev = p || null;
      r.diff = r.avg ? (r.amount - r.avg) / r.avg * 100 : null;
      r.anomaly = r.avg != null && r.avg > 0 && Math.abs(r.diff) > lim;
    });
    S.itemsList.forEach(function (it) {
      if (it.freq === 'RETIRED' || !it.category || present[it.key]) return;
      if (!it.div && presentName[it.name]) return;
      var cat = it.category, rk = cat + '||' + it.key, m = marks[it.key];
      var st = m && m.state === 'NONE' ? 'NONE' : it.freq === 'MONTHLY' ? 'MISSING' : 'IDLE';
      rows[rk] = { key: rk, itemKey: it.key, item: it, name: it.name, div: it.div, cat: cat, docs: [], amount: 0, status: st, mark: m, avg: avg[it.key] != null ? avg[it.key] : null, prev: prev[it.key] || null, est: est[it.name] || 0 };
    });
    var byCat = {}, out = { byCat: byCat, rows: [], missing: 0, idle: 0, none: 0, anomaly: 0, unknown: 0, covered: 0 };
    Object.keys(rows).forEach(function (k) {
      var r = rows[k]; if (r.est == null) r.est = est[r.name] || 0;
      var g = byCat[r.cat] || (byCat[r.cat] = { rows: [], count: 0, missing: 0, amount: 0, idle: 0, none: 0, anomaly: 0 });
      g.rows.push(r); out.rows.push(r);
      if (r.status === 'HAS') { g.count += r.docs.length; g.amount = R.r2(g.amount + r.amount); }
      if (r.status === 'MISSING') { if (r.est > 0) { r.covered = true; out.covered++; } else { g.missing++; out.missing++; } }
      if (r.status === 'IDLE') { g.idle++; out.idle++; }
      if (r.status === 'NONE') { g.none++; out.none++; }
      if (r.anomaly) { g.anomaly++; out.anomaly++; }
      if (!r.cat) out.unknown += r.docs.length;
    });
    var order = { MISSING: 0, HAS: 1, NONE: 2, IDLE: 3 };
    Object.keys(byCat).forEach(function (c) { byCat[c].rows.sort(function (a, b) { return (order[a.status] - order[b.status]) || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0); }); });
    memo = { key: key, val: out };
    return out;
  }

  /** เรื่องค้างก่อนปิดรอบ */
  function gate(d) {
    var cl = checklist(d), docs = liveDocs(d), lim = +settings().RETURN_DAYS || 5, now = Date.now();
    var ret = docs.filter(function (x) { return x.hrStatus === 'RETURN'; });
    var retOld = ret.filter(function (x) { return x.statusAt && (now - new Date(x.statusAt).getTime()) / 86400000 > lim; });
    var names = {}; docs.forEach(function (x) { names[x.incomeName] = (names[x.incomeName] || 0) + (+x.income || 0); });
    var estOpen = (d.estimates || []).filter(function (e) { return names[e.name] && (+e.amount || 0) - (+e.cut || 0) > 0; });
    var notApproved = docs.filter(function (x) { return x.hrStatus !== 'APPROVED'; }).length;
    var issues = [
      { key: 'missing', n: cl.missing, tone: 'bad', icon: 'alert', title: 'รายการประจำที่ยังไม่มา', desc: 'ยังไม่มีเอกสาร ไม่ได้ยืนยัน "ไม่มีเบิก" และไม่มีประมาณการ', href: '#/checklist?f=MISSING' },
      { key: 'unknown', n: cl.unknown, tone: 'bad', icon: 'tag', title: 'เอกสารที่ยังไม่จัดหมวด', desc: 'เลือกหมวดให้รายการใหม่ ระบบจะจำไว้ใช้ครั้งต่อไป', href: '#/docs?cat=_none' },
      { key: 'return', n: ret.length, tone: 'warn', icon: 'undo', title: 'เอกสารส่งคืนแก้ไข', desc: retOld.length ? 'ค้างเกิน ' + lim + ' วัน ' + retOld.length + ' ใบ' : 'ติดตามให้หน่วยงานส่งกลับ', href: '#/docs?st=RETURN' },
      { key: 'est', n: estOpen.length, tone: 'warn', icon: 'wallet', title: 'ประมาณการที่มีเอกสารจริงแล้วแต่ยังไม่ตัด', desc: 'กดตัดยอดในหน้าประมาณการ', href: '#/plan' }
    ];
    return { issues: issues, total: issues.reduce(function (s, x) { return s + (x.tone === 'bad' || x.tone === 'warn' ? x.n : 0); }, 0), notApproved: notApproved, checklist: cl };
  }

  /** สรุปรายหมวดของรอบ + เทียบรอบก่อน/ค่าเฉลี่ย (จาก RoundStats) */
  function catSummary(d) {
    var st = R.roundStats(liveDocs(d), d.estimates, S.items), all = (S.boot && S.boot.stats) || [], id = d.round.id, n = +settings().AVG_ROUNDS || 6;
    var ids = {}; all.forEach(function (x) { if (x.roundId < id) ids[x.roundId] = 1; });
    var past = Object.keys(ids).sort().slice(-n), prevId = past[past.length - 1];
    return activeCats().concat(st[''] ? [{ code: '', name: st[''].docs ? 'ยังไม่จัดหมวด' : 'ประมาณการ (ไม่ระบุหมวด)', color: '#94a3b8', icon: 'help' }] : []).map(function (c) {
      var x = st[c.code] || { docs: 0, income: 0, pending: 0, approved: 0, other: 0, deduct: 0, est: 0 };
      var hist = past.map(function (rid) { var r = all.filter(function (s) { return s.roundId === rid && s.cat === c.code; })[0]; return r ? r.income : 0; });
      var avg = hist.length ? hist.reduce(function (a, b) { return a + b; }, 0) / hist.length : null;
      var prev = prevId ? (all.filter(function (s) { return s.roundId === prevId && s.cat === c.code; })[0] || { income: 0 }).income : null;
      return { cat: c, x: x, total: R.r2(x.income + x.est), prev: prev, avg: avg, spark: hist.concat([x.income]) };
    });
  }
  /** แนวโน้ม 12 รอบล่าสุด: [{roundId, name, byCat:{code:income}, est}] */
  function trend(d, n) {
    var all = (S.boot && S.boot.stats) || [], by = {};
    all.forEach(function (x) { var r = by[x.roundId] || (by[x.roundId] = { roundId: x.roundId, byCat: {}, est: 0, total: 0 }); r.byCat[x.cat] = (r.byCat[x.cat] || 0) + x.income; r.est += x.est; r.total += x.income; });
    roundsList().filter(function (r) { return r.status === 'OPEN'; }).forEach(function (r) {
      if (d && d.round.id === r.id) {
        var st = R.roundStats(liveDocs(d), d.estimates, S.items), o = { roundId: r.id, byCat: {}, est: 0, total: 0, live: true };
        Object.keys(st).forEach(function (k) { o.byCat[k] = st[k].income; o.est += st[k].est; o.total += st[k].income; });
        by[r.id] = o;
      } else if (!by[r.id]) by[r.id] = { roundId: r.id, byCat: { '': r.income }, est: r.est, total: r.income, live: true };
    });
    return Object.keys(by).sort().slice(-(n || 12)).map(function (k) { by[k].name = R.ymLabel(k); return by[k]; });
  }
  function fileNames(docs) { return R.fileNames(docs, R.fileRules(settings())); }

  /* ------------------------------------------------ Excel: รายงานรอบ */
  function headRows(title, d, extra) {
    var s = settings(), r = d.round;
    return [[{ v: title, s: 'title' }], [{ v: (s.ORG_LINE1 || '') + ' · ' + (s.ORG_LINE2 || ''), s: 'sub' }],
      [{ v: r.name + ' (' + (r.status === 'OPEN' ? 'ยังไม่ปิดรอบ' : 'ปิดรอบแล้ว') + ') · ส่งออกเมื่อ ' + new Date().toLocaleString('th-TH') + ' โดย ' + (S.boot.me.fullName || '') + (extra ? ' · ' + extra : ''), s: 'sub' }], []];
  }
  function reportBook(d, opt) {
    opt = opt || {};
    var sel = opt.cats || activeCats().map(function (c) { return c.code; }).concat(['']), set = {}; sel.forEach(function (c) { set[c] = 1; });
    var sum = catSummary(d).filter(function (r) { return set[r.cat.code]; }), docs = liveDocs(d), fn = fileNames(docs), cl = checklist(d), sheets = [];
    var H = ['หมวด', 'จำนวนเอกสาร', 'รายได้ รออนุมัติ', 'รายได้ อนุมัติแล้ว', 'รายได้ สถานะอื่น', 'รายหัก', 'ประมาณการยังไม่คีย์', 'รวมเตรียมเงิน'];
    var rows = headRows('สรุปบันทึกการจ่าย ' + d.round.name, d, opt.cats ? 'เฉพาะ ' + sum.length + ' หมวด' : 'ทุกหมวด');
    rows.push(H.map(function (h) { return { v: h, s: 'head' }; }));
    var t = [0, 0, 0, 0, 0, 0, 0];
    sum.forEach(function (r) {
      var x = r.x, v = [x.docs, x.pending, x.approved, x.other, x.deduct, x.est, R.r2(x.income + x.est)];
      v.forEach(function (n, i) { t[i] += n; });
      rows.push([r.cat.name, { v: x.docs, s: 'int' }, x.pending, x.approved, x.other, x.deduct, x.est, R.r2(x.income + x.est)]);
    });
    var noCatEst = [];
    rows.push([{ v: 'รวมทั้งหมด', s: 'totText' }, { v: t[0], s: 'totMoney' }].concat(t.slice(1).map(function (n) { return { v: R.r2(n), s: 'totMoney' }; })));
    rows.push([]);
    var hs = {}; docs.forEach(function (x) { if (set[x.category || '']) hs[x.hrStatus || ''] = (hs[x.hrStatus || ''] || 0) + 1; });
    rows.push([{ v: 'สถานะเอกสาร (HR)', s: 'head' }, { v: 'จำนวน', s: 'head' }]);
    R.HR_STATUS.forEach(function (s) { rows.push([s.name, { v: hs[s.code] || 0, s: 'int' }]); });
    rows.push([{ v: 'เช็กลิสต์: ยังไม่มา ' + cl.missing + ' · ไม่มีเบิก ' + cl.none + ' · ยอดผิดปกติ ' + cl.anomaly, s: 'sub' }]);
    if (noCatEst.length) rows.push([{ v: '* ประมาณการที่ไม่ระบุหมวดรวมอยู่ในแถว "ยังไม่จัดหมวด"', s: 'sub' }]);
    sheets.push({ name: 'สรุป', rows: rows, cols: [34, 14, 18, 18, 16, 14, 20, 20], merges: ['A1:H1', 'A2:H2', 'A3:H3'], freeze: 5 });
    if (opt.detail !== false) sum.forEach(function (r) {
      var list = docs.filter(function (x) { return (x.category || '') === r.cat.code; }).sort(function (a, b) { return a.docNo < b.docNo ? -1 : 1; });
      var gg = cl.byCat[r.cat.code]; if (!list.length && !(gg && gg.missing)) return;
      var rr = headRows('รายละเอียด ' + r.cat.name + ' · ' + d.round.name, d);
      var HD = ['ลำดับ', 'เลขที่เอกสาร', 'วันที่เอกสาร', 'ชื่อรายได้', 'รายละเอียด', 'ฝ่าย', 'ชื่องาน', 'รวมรายได้', 'รวมรายหัก', 'สถานะ HRMi', 'สถานะ HR', 'หมายเหตุ', 'ชื่อไฟล์ Scan'];
      rr.push(HD.map(function (h) { return { v: h, s: 'head' }; }));
      list.forEach(function (x, i) {
        rr.push([{ v: i + 1, s: 'int' }, x.docNo, x.docDate || '', { v: x.incomeName, s: 'wrap' }, { v: x.remark || '', s: 'wrap' }, R.divShort(x.divFix || x.div), x.jobName || '', +x.income || 0, +x.deduct || 0,
          x.hrmiStatus || '', { v: stName(x.hrStatus), s: x.hrStatus === 'APPROVED' ? 'ok' : x.hrStatus === 'RETURN' ? 'bad' : x.hrStatus === 'WAIT' ? 'warn' : 'text' }, x.hrNote || '', fn[x.docNo] || '']);
      });
      rr.push([{ v: 'รวม ' + list.length + ' เอกสาร', s: 'totText' }, '', '', '', '', '', '', { v: R.sum(list, 'income'), s: 'totMoney' }, { v: R.sum(list, 'deduct'), s: 'totMoney' }]);
      var g = cl.byCat[r.cat.code], miss = g ? g.rows.filter(function (x) { return x.status === 'MISSING' || x.status === 'NONE'; }) : [];
      if (miss.length && opt.checklist !== false) {
        rr.push([]); rr.push([{ v: 'รายการประจำที่ไม่มีเอกสารในรอบนี้', s: 'head' }, { v: 'ฝ่าย', s: 'head' }, { v: 'สถานะ', s: 'head' }, { v: 'ประมาณการ', s: 'head' }, { v: 'หมายเหตุ', s: 'head' }]);
        miss.forEach(function (m) { rr.push([m.name, R.divShort(m.div), { v: m.status === 'NONE' ? 'ไม่มีเบิก (ยืนยันแล้ว)' : 'ยังไม่มา', s: m.status === 'NONE' ? 'text' : 'bad' }, m.est || '', (m.mark && m.mark.note) || '']); });
      }
      sheets.push({ name: r.cat.name, rows: rr, cols: [7, 17, 12, 40, 40, 26, 14, 15, 12, 12, 15, 24, 46], merges: ['A1:M1', 'A2:M2', 'A3:M3'], freeze: 5, landscape: true });
    });
    if (opt.estimates !== false) {
      var er = headRows('ประมาณการเงินที่ยังไม่คีย์ในระบบ · ' + d.round.name, d);
      er.push(['ลำดับ', 'รายการ', 'รายละเอียด', 'หมวด', 'ยอดประมาณการ', 'ตัดแล้ว', 'คงเหลือ', 'หมายเหตุ'].map(function (h) { return { v: h, s: 'head' }; }));
      var list = (d.estimates || []).filter(function (e) { return set[e.category || ''] || !opt.cats; });
      list.forEach(function (e, i) { er.push([{ v: i + 1, s: 'int' }, e.name, e.detail || '', catOf(e.category).name, +e.amount || 0, +e.cut || 0, R.r2((+e.amount || 0) - (+e.cut || 0)), e.note || '']); });
      er.push([{ v: 'รวม', s: 'totText' }, '', '', '', { v: R.sum(list, 'amount'), s: 'totMoney' }, { v: R.sum(list, 'cut'), s: 'totMoney' }, { v: R.sum(list, function (e) { return e.amount - e.cut; }), s: 'totMoney' }]);
      sheets.push({ name: 'ประมาณการ', rows: er, cols: [7, 42, 30, 22, 16, 14, 16, 30], merges: ['A1:H1', 'A2:H2', 'A3:H3'], freeze: 5 });
    }
    return sheets;
  }
  function exportReport(d, opt) {
    var b = XLSX.book(reportBook(d, opt));
    XLSX.download(b, 'PayPop_' + d.round.name.replace(/\s+/g, '_') + (opt && opt.cats ? '_เลือกหมวด' : '') + '_' + nowStamp() + '.xlsx');
  }
  return { checklist: checklist, gate: gate, catSummary: catSummary, trend: trend, liveDocs: liveDocs, fileNames: fileNames, reportBook: reportBook, exportReport: exportReport, headRows: headRows };
})();

/**
 * pages-plan.js — ประมาณการเงินที่ยังไม่คีย์ · ปิดรอบ (ด่านตรวจ + เทียบชุดสุดท้าย) · รายงาน & Export
 */
Pages.plan = {
  rows: null,
  render: function (el) {
    var P = Pages.plan, d = S.data;
    el.innerHTML = pageHead('plan', 'ประมาณการเงินที่ยังไม่คีย์', 'ประมาณยอดไว้ก่อนส่งยอดเตรียมเงิน · เมื่อเอกสารจริงเข้ามา ให้กด "ตัดยอด" เอง');
    if (!S.roundId) { el.innerHTML += noRound(); return; }
    if (!d) { el.innerHTML += '<div class="card"><div class="sk" style="height:300px"></div></div>'; return; }
    var open = d.round.status === 'OPEN';
    if (!P.rows || P.round !== d.round.id || !S.dirty) { P.rows = (d.estimates || []).map(function (e) { return Object.assign({}, e); }); P.round = d.round.id; }
    if (P.addFrom && open) { P.rows.push(Object.assign({ id: '', amount: 0, cut: 0, note: '' }, P.addFrom)); P.addFrom = null; S.dirty = 'plan'; toast('เพิ่มรายการประมาณการแล้ว กรอกยอดแล้วกดบันทึก', 'ok'); }
    el.innerHTML += lockedNote() + '<div class="card"><div class="card-h"><h2>' + icon('wallet') + esc(d.round.name) + '</h2><span class="grow"></span>' +
      (open ? '<button class="btn sm" id="plCopy">' + icon('hist') + 'ยกยอดจากรอบก่อน</button><button class="btn sm pri" id="plAdd">' + icon('plus') + 'เพิ่มรายการ</button>' : '') + '</div><div id="plTable"></div></div><div id="plBulk"></div>';
    P.el = el; P.draw();
    if (open) {
      $('#plAdd').onclick = function () { P.rows.push({ id: '', name: '', detail: '', category: '', amount: 0, cut: 0, note: '' }); S.dirty = 'plan'; P.draw(); var ins = $$('[data-k="name"]'); if (ins.length) ins[ins.length - 1].focus(); };
      $('#plCopy').onclick = function () {
        var prev = roundsList().filter(function (r) { return r.id < d.round.id; }).pop();
        if (!prev) return toast('ไม่พบรอบก่อนหน้า', 'warn');
        var b = this; b.classList.add('loading');
        api('getRound', { id: prev.id }).then(function (pd) {
          b.classList.remove('loading');
          var have = {}; P.rows.forEach(function (r) { have[r.name + '|' + r.detail] = 1; });
          var add = (pd.estimates || []).filter(function (e) { return !have[e.name + '|' + e.detail]; }).map(function (e) { return { id: '', name: e.name, detail: e.detail, category: e.category, amount: e.amount, cut: 0, note: e.note }; });
          P.rows = P.rows.concat(add); S.dirty = add.length ? 'plan' : S.dirty; P.draw();
          toast(add.length ? 'ยกมาจาก ' + prev.name + ' ' + add.length + ' รายการ' : 'รายการของรอบก่อนมีครบแล้ว', add.length ? 'ok' : 'warn');
        }, function (e) { b.classList.remove('loading'); fail(e); });
      };
    }
  },
  draw: function () {
    var P = this, d = S.data, open = d.round.status === 'OPEN', docs = Logic.liveDocs(d), byName = {};
    docs.forEach(function (x) { (byName[x.incomeName] = byName[x.incomeName] || []).push(x); });
    var names = {}; S.itemsList.forEach(function (i) { if (i.freq !== 'RETIRED') names[i.name] = 1; });
    var catOpts = '<option value="">ไม่ระบุหมวด</option>' + activeCats().map(function (c) { return '<option value="' + esc(c.code) + '">' + esc(c.name) + '</option>'; }).join('');
    var tA = 0, tC = 0;
    P.rows.forEach(function (r) { tA += +r.amount || 0; tC += +r.cut || 0; });
    $('#plTable').innerHTML = (P.rows.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>#</th><th>รายการ</th><th>รายละเอียด</th><th>หมวด</th><th class="n">ยอดประมาณการ</th><th class="n">ตัดแล้ว ' + q('ยอดที่เอกสารจริงเข้ามาใน HRMi แล้ว จะไม่ถูกนับซ้ำในยอดเตรียมเงิน') + '</th><th class="n">คงเหลือ</th><th>เอกสารจริง</th><th>หมายเหตุ</th>' + (open ? '<th></th>' : '') + '</tr></thead><tbody>' +
      P.rows.map(function (r, i) {
        var m = byName[r.name] || [], mSum = R.sum(m, 'income'), left = R.r2((+r.amount || 0) - (+r.cut || 0));
        var inp = function (k, cls, type) { return open ? '<input class="inp sm ' + (cls || '') + '" data-i="' + i + '" data-k="' + k + '" value="' + esc(r[k] == null ? '' : r[k]) + '"' + (type ? ' inputmode="decimal"' : '') + (k === 'name' ? ' list="plNames"' : '') + '>' : esc(type ? fmt(r[k]) : r[k] || ''); };
        return '<tr><td class="muted">' + (i + 1) + '</td><td style="min-width:220px">' + inp('name') + '</td><td style="min-width:140px">' + inp('detail') + '</td>' +
          '<td>' + (open ? '<select class="inp sm" data-i="' + i + '" data-k="category">' + catOpts.replace('value="' + esc(r.category || '') + '"', 'value="' + esc(r.category || '') + '" selected') + '</select>' : esc(catOf(r.category).name)) + '</td>' +
          '<td class="n" style="min-width:120px">' + inp('amount', 'num', 1) + '</td><td class="n" style="min-width:110px">' + inp('cut', 'num', 1) + '</td><td class="n num"><b>' + fmt(left) + '</b></td>' +
          '<td>' + (m.length ? '<span class="chip" style="--c:var(--ok)"><span class="c"></span>' + m.length + ' ใบ ' + fmtM(mSum) + '</span>' + (open && left > 0 ? ' <button class="btn xs pri" data-cut="' + i + '">' + icon('ok') + 'ตัดยอด</button>' : '') : '<span class="muted small">ยังไม่มี</span>') + '</td>' +
          '<td style="min-width:140px">' + inp('note') + '</td>' + (open ? '<td><button class="btn xs ghost" data-del="' + i + '" aria-label="ลบ">' + icon('trash') + '</button></td>' : '') + '</tr>';
      }).join('') + '</tbody><tfoot><tr><td colspan="4">รวม ' + P.rows.length + ' รายการ</td><td class="n">' + fmt(tA) + '</td><td class="n">' + fmt(tC) + '</td><td class="n">' + fmt(tA - tC) + '</td><td colspan="' + (open ? 3 : 2) + '"></td></tr></tfoot></table></div>' +
      '<datalist id="plNames">' + Object.keys(names).sort().map(function (n) { return '<option value="' + esc(n) + '">'; }).join('') + '</datalist>'
      : '<div class="empty">' + mascot(90, 'think') + '<h3>ยังไม่มีรายการประมาณการ</h3><p>เพิ่มรายการที่ต้องเตรียมเงินแต่หน่วยงานยังไม่คีย์ หรือกด "ยกยอดจากรอบก่อน"</p></div>');
    $$('#plTable [data-k]').forEach(function (inp) {
      inp.onchange = function () { var r = P.rows[+inp.getAttribute('data-i')], k = inp.getAttribute('data-k'); r[k] = k === 'amount' || k === 'cut' ? R.money(inp.value) : inp.value; S.dirty = 'plan'; P.draw(); };
    });
    $$('#plTable [data-del]').forEach(function (b) { b.onclick = function () { P.rows.splice(+b.getAttribute('data-del'), 1); S.dirty = 'plan'; P.draw(); }; });
    $$('#plTable [data-cut]').forEach(function (b) { b.onclick = function () { P.cutDlg(+b.getAttribute('data-cut'), byName); }; });
    var box = $('#plBulk');
    box.innerHTML = S.dirty === 'plan' ? '<div class="bulk"><span class="flex1">ยอดคงเหลือรวม <b>' + fmt(tA - tC) + '</b> บาท · ยังไม่ได้บันทึก</span><button class="btn sm" id="plUndo">' + icon('undo') + 'ยกเลิก</button><button class="btn pri" id="plSave">' + icon('ok') + 'บันทึกประมาณการ</button></div>' : '';
    if (S.dirty === 'plan') {
      $('#plUndo').onclick = function () { S.dirty = null; P.rows = null; refreshPage(); };
      $('#plSave').onclick = function () {
        var b = this; b.classList.add('loading');
        api('saveEstimates', { roundId: S.roundId, list: P.rows.filter(function (r) { return R.clean(r.name) || +r.amount; }) }).then(function (res) { S.dirty = null; P.rows = null; applyRound(res.data); toast('บันทึกประมาณการแล้ว', 'ok'); refreshPage(); }, function (e) { b.classList.remove('loading'); fail(e); });
      };
    }
  },
  cutDlg: function (i, byName) {
    var P = this, r = P.rows[i], m = byName[r.name] || [], used = String(r.cutDocs || '').split(',').filter(Boolean);
    modal({ title: 'ตัดยอดประมาณการ', icon: 'wallet', tone: 't-sun', mid: true, body:
      '<p style="margin:0"><b>' + esc(r.name) + '</b> ' + esc(r.detail || '') + ' · ประมาณไว้ ' + fmt(r.amount) + ' บาท</p><p class="muted small" style="margin:0">เลือกเอกสารจริงที่เข้ามาแทนยอดประมาณการนี้ ระบบจะใส่ยอดตัดให้ (แก้ได้)</p>' +
      '<div class="tbl-wrap"><table class="tbl"><tbody>' + m.map(function (x, k) { return '<tr><td class="c"><input type="checkbox" data-k="' + k + '"' + (!used.length || used.indexOf(x.docNo) >= 0 ? ' checked' : '') + '></td><td class="mono">' + esc(x.docNo) + '</td><td><div class="t1">' + esc(x.remark || x.incomeName) + '</div><div class="t2">' + esc(R.divShort(x.divFix || x.div)) + '</div></td><td class="n">' + fmt(x.income) + '</td></tr>'; }).join('') + '</tbody></table></div>' +
      '<div class="field"><label for="cutAmt">ยอดที่ตัด (บาท)</label><input id="cutAmt" class="inp num" inputmode="decimal"></div>',
      onOpen: function (ov) {
        var upd = function () { var s = 0; $$('[data-k]', ov).forEach(function (c) { if (c.checked) s += +m[+c.getAttribute('data-k')].income || 0; }); $('#cutAmt', ov).value = Math.min(s, +r.amount || 0).toFixed(2); };
        $$('[data-k]', ov).forEach(function (c) { c.onchange = upd; }); upd();
      },
      actions: [{ label: 'ยกเลิก', cls: 'ghost', value: null }, { label: 'ตัดยอด', cls: 'pri', click: function (ov) {
        r.cut = Math.min(R.money($('#cutAmt', ov).value), +r.amount || 0);
        r.cutDocs = $$('[data-k]', ov).filter(function (c) { return c.checked; }).map(function (c) { return m[+c.getAttribute('data-k')].docNo; }).join(',');
        S.dirty = 'plan'; P.draw();
      } }] });
  }
};

Pages.close = {
  batches: [],
  render: function (el) {
    var P = Pages.close, d = S.data;
    el.innerHTML = pageHead('close', 'ปิดรอบ', 'ตรวจเรื่องค้าง → วางข้อมูล HRMi ชุดสุดท้ายเพื่อเทียบยอด → ปิดรอบ (ล็อกข้อมูล + เก็บลงคลัง)');
    if (!S.roundId) { el.innerHTML += noRound(); return; }
    if (!d) { el.innerHTML += '<div class="card"><div class="sk" style="height:300px"></div></div>'; return; }
    if (P.round !== d.round.id) { P.batches = []; P.round = d.round.id; P.compared = false; }
    if (d.round.status !== 'OPEN') {
      el.innerHTML += '<div class="card empty">' + mascot(120, 'happy') + '<h3>' + esc(d.round.name) + ' ปิดรอบแล้ว</h3><p>ปิดเมื่อ ' + thDateTime(d.round.closedAt) + ' โดย ' + esc(userName(d.round.closedBy)) + (d.round.closeNote ? '<br>หมายเหตุ: ' + esc(d.round.closeNote) : '') + '</p><div class="row"><a class="btn" href="#/report">' + icon('dl') + 'ดูรายงาน</a><a class="btn" href="#/rounds">' + icon('unlock') + 'เปิดรอบอีกครั้ง</a></div></div>';
      return;
    }
    var g = Logic.gate(d), views = String(S.boot.settings.VIEWS || '').split(/\r?\n/).filter(Boolean);
    var toneCls = { bad: 't-bad', warn: 't-sun' };
    el.innerHTML += '<div class="grid g3"><div class="span2 grid" style="align-content:start">' +
      '<div class="card"><div class="card-h"><h2>' + icon('flag') + '1. ตรวจเรื่องค้าง</h2><span class="grow"></span>' + (g.total ? '<span class="pill st-RETURN">ค้าง ' + g.total + '</span>' : '<span class="pill st-APPROVED">ไม่มีเรื่องค้าง</span>') + '</div><div class="todo">' +
      g.issues.map(function (t) { return '<a class="todo-i" href="' + t.href + '"><span class="ico ' + (t.n ? toneCls[t.tone] : 't-ok') + '">' + icon(t.n ? t.icon : 'ok') + '</span><span class="tx"><b>' + esc(t.title) + '</b><span>' + (t.n ? esc(t.desc) : 'เรียบร้อย') + '</span></span><span class="n">' + t.n + '</span>' + icon('right') + '</a>'; }).join('') +
      '<div class="todo-i"><span class="ico t-info">' + icon('docs') + '</span><span class="tx"><b>เอกสารที่สถานะ HR ยังไม่ใช่ "อนุมัติ"</b><span>เป็นข้อมูลประกอบ ไม่ขวางการปิดรอบ</span></span><span class="n">' + g.notApproved + '</span></div></div></div>' +
      '<div class="card"><div class="card-h"><h2>' + icon('paste') + '2. วางข้อมูลชุดสุดท้ายจาก HRMi</h2>' + q('วางได้หลาย View (เช่น รออนุมัติ + อนุมัติจ่ายเดือนนี้) ระบบรวมเป็นชุดเดียว แล้วเทียบว่ามีใบไหนยอดเปลี่ยน ใหม่ หรือหายไป') + '</div>' +
      '<div class="row mb12"><select id="clView" class="inp" style="width:auto">' + views.map(function (v) { return '<option>' + esc(v) + '</option>'; }).join('') + '</select><span class="grow"></span><button class="btn sm" id="clFileBtn">' + icon('up') + 'แนบไฟล์</button><input type="file" id="clFile" accept=".xls,.xlsx,.csv,.txt" hidden></div>' +
      '<textarea id="clText" class="inp paste" placeholder="วางข้อมูล View นี้แล้วกด เพิ่มชุดนี้"></textarea><div class="row end mt8"><button class="btn" id="clAdd">' + icon('plus') + 'เพิ่มชุดนี้</button></div>' +
      '<div id="clBatches" class="mt12"></div><div class="row end mt12"><button class="btn pri" id="clCompare">' + icon('eye') + 'เทียบชุดสุดท้าย</button></div></div><div id="clPreview"></div></div>' +
      '<div class="grid" style="align-content:start"><div class="card"><div class="card-h"><h2>' + icon('lockr') + '3. ปิดรอบ</h2></div>' + mascot(80, g.total ? 'think' : 'happy') +
      '<p class="small">' + (P.compared ? '<span class="pill st-APPROVED">เทียบชุดสุดท้ายแล้ว</span>' : '<span class="pill st-WAIT">ยังไม่ได้เทียบชุดสุดท้าย</span>') + '</p>' +
      '<p class="muted small">เมื่อปิดรอบ ข้อมูลรอบนี้จะถูกล็อก ย้ายลงคลัง และใช้เป็นค่าเฉลี่ยของรอบถัดไป เปิดรอบอีกครั้งได้ภายหลัง (ต้องยืนยันรหัสผ่าน)</p>' +
      '<button class="btn pri" id="clClose" style="width:100%">' + icon('lockr') + 'ปิด ' + esc(d.round.name) + '</button></div>' +
      '<div class="card"><div class="card-h"><h3>' + icon('calc') + 'ยอดสุดท้าย</h3></div><dl class="kv"><dt>เอกสาร</dt><dd class="num">' + fmt0(Logic.liveDocs(d).length) + '</dd><dt>ยอด HRMi</dt><dd class="num">' + fmt(R.sum(Logic.liveDocs(d), 'income')) + '</dd><dt>ประมาณการ</dt><dd class="num">' + fmt(R.sum(d.estimates, function (e) { return Math.max(0, e.amount - e.cut); })) + '</dd></dl></div></div></div>';
    P.drawBatches();
    var addBatch = function (p, label) {
      if (!p.rows.length) return toast('ไม่พบรายการในข้อมูลที่วาง', 'warn');
      P.batches.push({ view: label || $('#clView').value, rows: p.rows, total: R.sum(p.rows, 'income') }); $('#clText').value = ''; P.drawBatches(); toast('เพิ่มชุด ' + p.rows.length + ' แถว', 'ok');
    };
    $('#clAdd').onclick = function () { addBatch(R.parseText($('#clText').value)); };
    $('#clFileBtn').onclick = function () { $('#clFile').click(); };
    $('#clFile').onchange = function () { var f = this.files[0]; this.value = ''; if (f) ImportFlow.parseFile(f).then(function (p) { addBatch(p, $('#clView').value + ' (' + f.name + ')'); }, fail); };
    $('#clCompare').onclick = function () {
      if (!P.batches.length) return toast('วางข้อมูลอย่างน้อย 1 ชุดก่อน', 'warn');
      var rows = [], seen = {}; P.batches.forEach(function (b) { b.rows.forEach(function (r) { seen[r.docNo] = r; }); }); Object.keys(seen).forEach(function (k) { rows.push(seen[k]); });
      var b = this; b.classList.add('loading');
      api('previewImport', { roundId: S.roundId, view: 'ปิดรอบ: ' + P.batches.map(function (x) { return x.view; }).join(' + '), source: 'final', rows: rows, mode: 'final' }).then(function (pv) {
        b.classList.remove('loading');
        ImportFlow.showPreview($('#clPreview'), pv, function () { P.compared = true; P.batches = []; refreshPage(); }, function () { $('#clPreview').innerHTML = ''; });
      }, function (e) { b.classList.remove('loading'); fail(e); });
    };
    $('#clClose').onclick = function () { P.doClose(g); };
  },
  drawBatches: function () {
    var P = this, box = $('#clBatches'); if (!box) return;
    box.innerHTML = P.batches.length ? '<div class="chips">' + P.batches.map(function (b, i) { return '<span class="chip">' + icon('paste') + esc(b.view) + ' · ' + b.rows.length + ' แถว · ' + fmtM(b.total) + ' <button class="btn xs ghost" data-rm="' + i + '" aria-label="ลบชุด">' + icon('x') + '</button></span>'; }).join('') + '</div>' : '<p class="muted small" style="margin:0">ยังไม่มีชุดข้อมูล</p>';
    $$('[data-rm]', box).forEach(function (b) { b.onclick = function () { P.batches.splice(+b.getAttribute('data-rm'), 1); P.drawBatches(); }; });
  },
  doClose: function (g) {
    var P = this, d = S.data, need = g.total > 0 && S.boot.settings.CLOSE_REQUIRE_REASON !== false;
    modal({ title: 'ปิด ' + d.round.name, icon: 'lockr', tone: g.total ? 't-sun' : 't-ok', body:
      (g.total ? '<div class="callout warn">' + icon('alert') + '<div>ยังมีเรื่องค้าง <b>' + g.total + '</b> เรื่อง' + (need ? ' — กรุณากรอกเหตุผลก่อนปิดรอบ' : '') + '<ul style="margin:6px 0 0;padding-left:18px">' + g.issues.filter(function (x) { return x.n; }).map(function (x) { return '<li>' + esc(x.title) + ' ' + x.n + '</li>'; }).join('') + '</ul></div></div>' : '<div class="callout ok">' + icon('ok') + '<span>ไม่มีเรื่องค้าง พร้อมปิดรอบ</span></div>') +
      (P.compared ? '' : '<div class="callout info">' + icon('info') + '<span>ยังไม่ได้วางข้อมูลชุดสุดท้ายเพื่อเทียบยอด (ข้ามได้)</span></div>') +
      '<div class="field"><label for="clReason">เหตุผล / หมายเหตุการปิดรอบ' + (need ? ' (จำเป็น)' : '') + '</label><textarea id="clReason" class="inp" style="min-height:70px" placeholder="เช่น รอเอกสารจากหน่วยงาน จะตามในรอบหน้า"></textarea></div>',
      actions: [{ label: 'ยกเลิก', cls: 'ghost', value: null }, { label: 'ยืนยันปิดรอบ', cls: 'pri', icon: 'lockr', click: function (ov) {
        var reason = $('#clReason', ov).value.trim();
        if (need && !reason) { toast('กรุณากรอกเหตุผล', 'warn'); return false; }
        return api('closeRound', { id: d.round.id, issues: g.total, reason: reason }).then(function (res) {
          setRounds(res.rounds); S.boot.stats = res.stats; applyRound(res.data); confetti(); toast('ปิด ' + d.round.name + ' เรียบร้อย 🎉', 'ok', 5000); refreshPage();
        });
      } }] });
  }
};

Pages.report = {
  sel: null,
  render: function (el) {
    var P = Pages.report, d = S.data;
    el.innerHTML = pageHead('report', 'รายงาน & Export', 'สรุปยอดเตรียมเงินภาพรวมและรายละเอียดรายหมวด · เลือกหมวดที่จะส่งออกได้');
    if (!S.roundId) { el.innerHTML += noRound(); return; }
    if (!d) { el.innerHTML += '<div class="card"><div class="sk" style="height:300px"></div></div>'; return; }
    var cats = activeCats().concat(Logic.catSummary(d).some(function (r) { return r.cat.code === ''; }) ? [{ code: '', name: 'ยังไม่จัดหมวด', color: '#94a3b8' }] : []);
    if (!P.sel || P.round !== d.round.id) { P.sel = {}; cats.forEach(function (c) { P.sel[c.code] = true; }); P.round = d.round.id; }
    P.opt = P.opt || { detail: true, estimates: true, checklist: true };
    el.innerHTML += '<div class="card mb12"><div class="card-h"><h2>' + icon('filter') + 'เลือกหมวด</h2><span class="grow"></span><button class="btn sm ghost" id="rpAll">เลือกทั้งหมด</button><button class="btn sm ghost" id="rpNone">ไม่เลือก</button></div>' +
      '<div class="chips" id="rpCats">' + cats.map(function (c) { return '<button class="chip' + (P.sel[c.code] ? ' on' : '') + '" data-c="' + esc(c.code) + '" style="--c:' + esc(c.color) + '"><span class="c"></span>' + esc(c.name) + '</button>'; }).join('') + '</div>' +
      '<div class="row mt12"><label class="check"><input type="checkbox" id="rpDet"' + (P.opt.detail ? ' checked' : '') + '> แผ่นรายละเอียดรายหมวด</label><label class="check"><input type="checkbox" id="rpEst"' + (P.opt.estimates ? ' checked' : '') + '> แผ่นประมาณการ</label><label class="check"><input type="checkbox" id="rpChk"' + (P.opt.checklist ? ' checked' : '') + '> รายการที่ยังไม่มา (ท้ายแผ่นหมวด)</label>' +
      '<span class="grow"></span><button class="btn" id="rpSum">' + icon('dl') + 'Export ภาพรวม</button><button class="btn pri" id="rpGo">' + icon('dl') + 'Export ตามที่เลือก</button></div></div><div id="rpView"></div>';
    var drawView = function () {
      var sum = Logic.catSummary(d).filter(function (r) { return P.sel[r.cat.code]; }), t = { docs: 0, pend: 0, appr: 0, other: 0, ded: 0, est: 0 };
      sum.forEach(function (r) { t.docs += r.x.docs; t.pend += r.x.pending; t.appr += r.x.approved; t.other += r.x.other; t.ded += r.x.deduct; t.est += r.x.est; });
      $('#rpView').innerHTML = '<div class="card pad0"><div class="card-h" style="padding:14px 18px 0"><h2>' + icon('chart') + 'สรุป ' + esc(d.round.name) + '</h2></div><div class="tbl-wrap" style="border:0;border-radius:0"><table class="tbl"><thead><tr><th>หมวด</th><th class="n">เอกสาร</th><th class="n">รออนุมัติ</th><th class="n">อนุมัติแล้ว</th><th class="n hide-sm">สถานะอื่น</th><th class="n hide-sm">รายหัก</th><th class="n">ประมาณการ</th><th class="n">รวมเตรียมเงิน</th><th class="n hide-sm">เทียบรอบก่อน</th></tr></thead><tbody>' +
        sum.map(function (r) { var p = pct(r.x.income, r.prev); return '<tr><td>' + catChip(r.cat.code) + '</td><td class="n">' + fmt0(r.x.docs) + '</td><td class="n">' + fmt(r.x.pending) + '</td><td class="n">' + fmt(r.x.approved) + '</td><td class="n hide-sm">' + fmt(r.x.other) + '</td><td class="n hide-sm">' + fmt(r.x.deduct) + '</td><td class="n">' + fmt(r.x.est) + '</td><td class="n"><b>' + fmt(r.total) + '</b></td><td class="n hide-sm ' + (p > 0 ? 'up' : 'down') + '">' + fmtPct(p) + '</td></tr>'; }).join('') +
        '</tbody><tfoot><tr><td>รวม</td><td class="n">' + fmt0(t.docs) + '</td><td class="n">' + fmt(t.pend) + '</td><td class="n">' + fmt(t.appr) + '</td><td class="n hide-sm">' + fmt(t.other) + '</td><td class="n hide-sm">' + fmt(t.ded) + '</td><td class="n">' + fmt(t.est) + '</td><td class="n">' + fmt(t.pend + t.appr + t.other + t.est) + '</td><td class="hide-sm"></td></tr></tfoot></table></div></div>';
    };
    drawView();
    $$('#rpCats [data-c]').forEach(function (b) { b.onclick = function () { var c = b.getAttribute('data-c'); P.sel[c] = !P.sel[c]; b.classList.toggle('on', P.sel[c]); drawView(); }; });
    $('#rpAll').onclick = function () { cats.forEach(function (c) { P.sel[c.code] = true; }); P.render(el); };
    $('#rpNone').onclick = function () { cats.forEach(function (c) { P.sel[c.code] = false; }); P.render(el); };
    $('#rpDet').onchange = function () { P.opt.detail = this.checked; }; $('#rpEst').onchange = function () { P.opt.estimates = this.checked; }; $('#rpChk').onchange = function () { P.opt.checklist = this.checked; };
    $('#rpSum').onclick = function () { Logic.exportReport(d, { detail: false, estimates: true, checklist: false }); toast('ดาวน์โหลดไฟล์สรุปแล้ว', 'ok'); };
    $('#rpGo').onclick = function () {
      var picked = cats.filter(function (c) { return P.sel[c.code]; }).map(function (c) { return c.code; });
      if (!picked.length) return toast('เลือกอย่างน้อย 1 หมวด', 'warn');
      Logic.exportReport(d, { cats: picked.length === cats.length ? null : picked, detail: P.opt.detail, estimates: P.opt.estimates, checklist: P.opt.checklist });
      toast('ดาวน์โหลดไฟล์ Excel แล้ว', 'ok');
    };
  }
};

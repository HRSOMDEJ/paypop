/**
 * pages-import.js — นำเข้าจาก HRMi (วาง / แนบไฟล์) · หน้าตรวจก่อนบันทึก · จัดหมวดรายการใหม่
 */
var ImportFlow = {
  /** อ่านข้อความหรือไฟล์ → {rows, errors} */
  parseText: function (t) { return R.parseText(t); },
  parseFile: function (file) {
    return XLSX.readFile(file).then(function (x) { return x.grid ? R.parseTable(x.grid) : R.parseText(x.text); });
  },
  summary: function (p) {
    var pref = S.boot.settings.PAY_PREFIXES || 'PAY', pay = p.rows.filter(function (r) { return R.isPay(r.docNo, pref); });
    return { n: p.rows.length, pay: pay.length, other: p.rows.length - pay.length, total: R.sum(pay, 'income'), errors: p.errors };
  },
  /** แสดงหน้าตรวจ (preview) ใน host · onDone(result) หลังบันทึก */
  showPreview: function (host, pv, onDone, onCancel) {
    var st = { changed: {}, other: {}, include: {}, missing: {} };
    pv.changed.forEach(function (x) { st.changed[x.doc.docNo] = true; });
    pv.missing.forEach(function (m) { st.missing[m.docNo] = 'keep'; });
    var tile = function (n, label, tone, ic, tip) { return '<div class="card kpi"><span class="ico ' + tone + '">' + icon(ic) + '</span><div class="kpi-l">' + esc(label) + (tip ? q(tip) : '') + '</div><div class="kpi-v num">' + fmt0(n) + '</div></div>'; };
    var docCell = function (d) { return '<div class="t1">' + esc(d.incomeName) + '</div><div class="t2">' + esc(d.remark || '') + (d.remark ? ' · ' : '') + esc(R.divShort(d.div)) + ' · ' + esc(d.jobName || '') + '</div>'; };
    var draw = function () {
      var undecided = pv.other.filter(function (o) { return !st.other[o.doc.docNo]; }).length;
      var nChanged = pv.changed.filter(function (x) { return st.changed[x.doc.docNo]; }).length, nMove = pv.other.filter(function (o) { return st.other[o.doc.docNo] === 'move'; }).length;
      var nInc = Object.keys(st.include).filter(function (k) { return st.include[k]; }).length, nRem = Object.keys(st.missing).filter(function (k) { return st.missing[k] === 'remove'; }).length;
      var willSave = pv.added.length + nChanged + nMove + nInc + nRem;
      host.innerHTML = '<div class="card"><div class="card-h"><h2>' + icon('eye') + 'ตรวจก่อนบันทึก · ' + esc(pv.roundName) + '</h2><span class="grow"></span><span class="chip">' + icon('paste') + esc(pv.view || 'ไม่ระบุ View') + '</span>' +
        (pv.mode === 'final' ? '<span class="pill st-RETURN">โหมดปิดรอบ</span>' : '') + '</div>' +
        '<p class="muted small" style="margin:0 0 12px">อ่านได้ ' + fmt0(pv.count + pv.skipped.length) + ' เอกสาร · ยอดรวม ' + fmt(pv.total) + ' บาท' + (pv.dup ? ' · ตัดแถวซ้ำ ' + pv.dup : '') + '</p>' +
        '<div class="grid g4 stagger">' + tile(pv.added.length, 'เอกสารใหม่', 't-ok', 'plus', 'ยังไม่เคยมีในระบบ จะถูกเพิ่มเข้ารอบนี้ (สถานะ HR = รอเอกสาร)') + tile(pv.changed.length, 'ยอด/สถานะเปลี่ยน', 't-sun', 'refresh', 'มีอยู่แล้วในรอบนี้ แต่ข้อมูลใน HRMi ต่างจากที่บันทึกไว้') +
        tile(pv.same, 'เหมือนเดิม', 't-info', 'ok', 'ข้อมูลตรงกับที่บันทึกไว้ทุกช่อง ไม่ต้องทำอะไร') + tile(pv.other.length, 'อยู่ในรอบอื่น', 't-vio', 'move', 'เอกสารนี้เคยถูกบันทึกในรอบอื่น ต้องเลือกว่าจะย้ายมารอบนี้หรือคงไว้') + '</div>' +
        (pv.unknown.length ? '<div class="callout info mt12">' + icon('tag') + '<div>พบ <b>ชื่อรายได้ใหม่ ' + pv.unknown.length + ' ชื่อ</b> ที่ยังไม่มีในตารางรายการ — หลังบันทึก ระบบจะให้เลือกหมวดครั้งเดียว แล้วจำไว้ใช้ทุกเดือน</div></div>' : '') + '</div>' +
        (pv.changed.length ? '<div class="card mt12"><div class="card-h"><h3>' + icon('refresh') + 'ยอดหรือสถานะเปลี่ยน (' + pv.changed.length + ')</h3>' + q('ติ๊ก = ใช้ข้อมูลใหม่จาก HRMi (ยึดการวางครั้งล่าสุด) · เอาติ๊กออก = คงข้อมูลเดิม') + '<span class="grow"></span><button class="btn sm" data-allc="1">ใช้ข้อมูลใหม่ทั้งหมด</button><button class="btn sm ghost" data-allc="0">คงของเดิมทั้งหมด</button></div>' +
          '<div class="tbl-wrap"><table class="tbl"><thead><tr><th class="c">ใช้ใหม่</th><th>เลขที่</th><th>รายการ</th><th>สิ่งที่เปลี่ยน</th></tr></thead><tbody>' +
          pv.changed.map(function (x) {
            return '<tr><td class="c"><input type="checkbox" data-ch="' + esc(x.doc.docNo) + '"' + (st.changed[x.doc.docNo] ? ' checked' : '') + ' aria-label="ใช้ข้อมูลใหม่"></td><td class="mono nowrap">' + esc(x.doc.docNo) + '</td><td>' + docCell(x.doc) + '</td><td>' +
              x.diffs.map(function (df) { var money = df.f === 'income' || df.f === 'deduct'; return '<div class="small"><b>' + esc(df.label) + '</b>: <span class="diff-old">' + esc(money ? fmt(df.old) : (df.old || '—')) + '</span> → <span class="diff-new">' + esc(money ? fmt(df.now) : (df.now || '—')) + '</span>' + (money ? ' <span class="muted">(' + (df.now - df.old > 0 ? '+' : '') + fmt(df.now - df.old) + ')</span>' : '') + '</div>'; }).join('') + '</td></tr>';
          }).join('') + '</tbody></table></div></div>' : '') +
        (pv.other.length ? '<div class="card mt12"><div class="card-h"><h3>' + icon('move') + 'เอกสารที่อยู่ในรอบอื่น (' + pv.other.length + ')</h3>' + q('ระบบถามทุกครั้ง: ย้ายมารอบนี้ = นับยอดในรอบนี้ · คงไว้ = ไม่แตะเอกสารนี้') + '<span class="grow"></span>' +
          (undecided ? '<span class="pill st-RETURN">ยังไม่เลือก ' + undecided + '</span>' : '<span class="pill st-APPROVED">เลือกครบแล้ว</span>') + '<button class="btn sm" data-allo="move">ย้ายมาทั้งหมด</button><button class="btn sm ghost" data-allo="keep">คงไว้ทั้งหมด</button></div>' +
          '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>เลขที่</th><th>รายการ</th><th class="n">ยอด</th><th>อยู่ในรอบ</th><th>เลือก</th></tr></thead><tbody>' +
          pv.other.map(function (o) {
            var k = o.doc.docNo, v = st.other[k];
            return '<tr><td class="mono nowrap">' + esc(k) + '</td><td>' + docCell(o.doc) + '</td><td class="n">' + fmt(o.doc.income) + '</td><td>' + esc(o.fromName) + ' ' + (o.fromStatus === 'CLOSED' ? '<span class="pill st-NONE">ปิดแล้ว</span>' : '<span class="pill st-APPROVED">เปิด</span>') + '</td>' +
              '<td><div class="seg"><button data-o="' + esc(k) + '" data-v="move" class="' + (v === 'move' ? 'on' : '') + '">ย้ายมารอบนี้</button><button data-o="' + esc(k) + '" data-v="keep" class="' + (v === 'keep' ? 'on' : '') + '">คงไว้</button></div></td></tr>';
          }).join('') + '</tbody></table></div></div>' : '') +
        (pv.missing.length ? '<div class="card mt12"><div class="card-h"><h3>' + icon('alert') + 'อยู่ในระบบแต่ไม่พบใน HRMi ชุดนี้ (' + pv.missing.length + ')</h3>' + q('เอกสารที่อาจถูกลบหรือยกเลิกใน HRMi · ถูกลบแล้ว = ไม่นับยอด แต่ยังเห็นประวัติ') + '<span class="grow"></span><button class="btn sm" data-allm="remove">ถูกลบทั้งหมด</button><button class="btn sm ghost" data-allm="keep">คงไว้ทั้งหมด</button></div>' +
          '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>เลขที่</th><th>รายการ</th><th class="n">ยอด</th><th>เลือก</th></tr></thead><tbody>' +
          pv.missing.map(function (m) { var v = st.missing[m.docNo]; return '<tr><td class="mono">' + esc(m.docNo) + '</td><td>' + docCell(m) + '</td><td class="n">' + fmt(m.income) + '</td><td><div class="seg"><button data-m="' + esc(m.docNo) + '" data-v="keep" class="' + (v === 'keep' ? 'on' : '') + '">คงไว้</button><button data-m="' + esc(m.docNo) + '" data-v="remove" class="' + (v === 'remove' ? 'on' : '') + '">ถูกลบจาก HRMi</button></div></td></tr>'; }).join('') +
          '</tbody></table></div></div>' : '') +
        (pv.skipped.length ? '<div class="card mt12"><div class="card-h"><h3>' + icon('x') + 'เอกสารที่ไม่ใช่ PAY (' + pv.skipped.length + ')</h3>' + q('ค่าเริ่มต้นคือไม่นับรวม (เช่น PWF เงินสวัสดิการ) ติ๊กเพื่อรวมเข้ารอบนี้') + '</div><div class="tbl-wrap"><table class="tbl"><tbody>' +
          pv.skipped.map(function (s) { return '<tr><td class="c"><input type="checkbox" data-inc="' + esc(s.docNo) + '"' + (st.include[s.docNo] ? ' checked' : '') + ' aria-label="รวม"></td><td class="mono">' + esc(s.docNo) + '</td><td>' + docCell(s) + '</td><td class="n">' + fmt(s.income) + '</td></tr>'; }).join('') + '</tbody></table></div></div>' : '') +
        (pv.added.length ? '<details class="card mt12"><summary style="cursor:pointer;font-weight:600">' + icon('plus') + ' ดูเอกสารใหม่ ' + pv.added.length + ' รายการ</summary><div class="tbl-wrap mt12 tall"><table class="tbl"><thead><tr><th>เลขที่</th><th>รายการ</th><th class="n">ยอด</th><th>สถานะ HRMi</th></tr></thead><tbody>' +
          pv.added.map(function (a) { return '<tr><td class="mono nowrap">' + esc(a.docNo) + '</td><td>' + docCell(a) + '</td><td class="n">' + fmt(a.income) + '</td><td>' + hmPill(a.hrmiStatus) + '</td></tr>'; }).join('') + '</tbody></table></div></details>' : '') +
        '<div class="bulk"><span class="flex1">จะบันทึก <b>' + fmt0(willSave) + '</b> รายการ' + (undecided ? ' · <span style="color:#fbbf24">เลือกเอกสารรอบอื่นอีก ' + undecided + ' รายการ</span>' : '') + '</span><button class="btn" id="pvCancel">' + icon('x') + 'ยกเลิก</button>' +
        '<button class="btn pri" id="pvSave"' + (undecided ? ' disabled' : '') + '>' + icon('ok') + 'ยืนยันบันทึก</button></div>';
      $$('[data-ch]', host).forEach(function (c) { c.onchange = function () { st.changed[c.getAttribute('data-ch')] = c.checked; draw(); }; });
      $$('[data-allc]', host).forEach(function (b) { b.onclick = function () { pv.changed.forEach(function (x) { st.changed[x.doc.docNo] = b.getAttribute('data-allc') === '1'; }); draw(); }; });
      $$('[data-o]', host).forEach(function (b) { b.onclick = function () { st.other[b.getAttribute('data-o')] = b.getAttribute('data-v'); draw(); }; });
      $$('[data-allo]', host).forEach(function (b) { b.onclick = function () { pv.other.forEach(function (o) { st.other[o.doc.docNo] = b.getAttribute('data-allo'); }); draw(); }; });
      $$('[data-m]', host).forEach(function (b) { b.onclick = function () { st.missing[b.getAttribute('data-m')] = b.getAttribute('data-v'); draw(); }; });
      $$('[data-allm]', host).forEach(function (b) { b.onclick = function () { pv.missing.forEach(function (m) { st.missing[m.docNo] = b.getAttribute('data-allm'); }); draw(); }; });
      $$('[data-inc]', host).forEach(function (c) { c.onchange = function () { st.include[c.getAttribute('data-inc')] = c.checked; draw(); }; });
      $('#pvCancel', host).onclick = function () { S.dirty = null; onCancel && onCancel(); };
      $('#pvSave', host).onclick = function () {
        var b = this; b.classList.add('loading');
        var dec = { changed: {}, other: st.other, include: Object.keys(st.include).filter(function (k) { return st.include[k]; }), missing: st.missing };
        pv.changed.forEach(function (x) { if (!st.changed[x.doc.docNo]) dec.changed[x.doc.docNo] = false; });
        api('commitImport', { previewId: pv.previewId, decisions: dec }).then(function (res) {
          S.dirty = null; applyRound(res.data); if (res.items) setItems(res.items); updateBadges();
          var r = res.result;
          toast('บันทึกแล้ว: ใหม่ ' + r.added + ' · เปลี่ยน ' + r.changed + ' · ย้าย ' + r.moved + (r.removed ? ' · ถูกลบ ' + r.removed : ''), 'ok', 5000);
          if (r.added + r.changed + r.moved > 0) confetti();
          onDone && onDone(res);
          if (res.needCategorize) setTimeout(ImportFlow.categorize, 450);
        }, function (e) { b.classList.remove('loading'); fail(e); });
      };
    };
    S.dirty = 'import';
    draw();
    host.scrollIntoView({ behavior: 'smooth', block: 'start' });
  },
  /** เลือกหมวดให้รายการรายได้ที่ยังไม่มีหมวด (ที่มีเอกสารในรอบนี้) */
  categorize: function (onlyKeys) {
    var d = S.data, docs = Logic.liveDocs(d).filter(function (x) { return !x.category; }), byKey = {};
    docs.forEach(function (x) { var k = R.itemKey(x.incomeName, x.div), it = S.items[k] || R.itemOf(x, S.items); var kk = it ? it.key : k; (byKey[kk] = byKey[kk] || { key: kk, name: x.incomeName, div: it ? it.div : x.div, docs: [], amount: 0 }); byKey[kk].docs.push(x); byKey[kk].amount += +x.income || 0; });
    var list = Object.keys(byKey).map(function (k) { return byKey[k]; });
    if (!list.length) return toast('ทุกเอกสารมีหมวดแล้ว', 'ok');
    var opts = activeCats().map(function (c) { return '<option value="' + esc(c.code) + '">' + esc(c.name) + '</option>'; }).join('');
    modal({ title: 'จัดหมวดรายการรายได้ใหม่', icon: 'tag', wide: true, body:
      '<div class="row">' + mascot(64, 'wow') + '<p class="flex1 muted" style="margin:0">พบชื่อรายได้ที่ยังไม่มีหมวด ' + list.length + ' รายการ เลือกหมวดครั้งเดียว ระบบจะจำไว้ จัดให้อัตโนมัติทุกเดือน และใช้เป็นเช็กลิสต์ความครบ</p></div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>ชื่อรายได้ / ฝ่าย</th><th class="n">เอกสาร</th><th class="n">ยอด</th><th>หมวด</th><th>ความถี่ ' + q('ประจำทุกเดือน = ถ้าเดือนไหนไม่มา ระบบจะเตือน · บางเดือน = ไม่เตือน') + '</th></tr></thead><tbody>' +
      list.map(function (x, i) {
        return '<tr><td><div class="t1">' + esc(x.name) + '</div><div class="t2">' + esc(R.divShort(x.div) || 'ทุกฝ่าย') + '</div></td><td class="n">' + x.docs.length + '</td><td class="n">' + fmt(x.amount) + '</td>' +
          '<td><select class="inp sm" data-cat="' + i + '"><option value="">— เลือกหมวด —</option>' + opts + '</select></td><td><select class="inp sm" data-freq="' + i + '"><option value="MONTHLY">ประจำทุกเดือน</option><option value="SOMETIMES" selected>บางเดือน</option></select></td></tr>';
      }).join('') + '</tbody></table></div>',
      actions: [{ label: 'ไว้ทีหลัง', cls: 'ghost', value: null }, { label: 'บันทึกหมวด', cls: 'pri', icon: 'ok', click: function (ov) {
        var items = [];
        list.forEach(function (x, i) { var c = $('[data-cat="' + i + '"]', ov).value; if (c) items.push({ key: x.key, name: x.name, div: x.div, category: c, freq: $('[data-freq="' + i + '"]', ov).value }); });
        if (!items.length) { toast('ยังไม่ได้เลือกหมวดเลย', 'warn'); return false; }
        return api('saveItems', { items: items }).then(function (res) {
          setItems(res.items); toast('บันทึกหมวด ' + items.length + ' รายการ · ปรับเอกสาร ' + res.recategorized + ' ใบ', 'ok');
          return loadRound(S.roundId, null, true).then(function () { refreshPage(); });
        });
      } }] });
  }
};

Pages.import = {
  render: function (el) {
    var d = S.data;
    el.innerHTML = pageHead('import', 'นำเข้าจาก HRMi', 'คัดลอกจากตาราง "บันทึกการจ่าย" ใน HRMi มาวาง หรือแนบไฟล์ Export · วางซ้ำได้ทุกเวลา ระบบเทียบด้วยเลขที่เอกสาร');
    if (!S.roundId) { el.innerHTML += noRound(); return; }
    if (!d) { el.innerHTML += '<div class="card"><div class="sk" style="height:200px"></div></div>'; return; }
    if (d.round.status !== 'OPEN') { el.innerHTML += lockedNote(); return; }
    var views = String(S.boot.settings.VIEWS || '').split(/\r?\n/).filter(Boolean), last = lsGet(keyFor('lastView')) || views[0];
    el.innerHTML += '<div class="grid g3"><div class="span2 grid" id="impLeft">' +
      '<div class="card"><div class="card-h"><h2>' + icon('paste') + 'วางข้อมูล · ' + esc(d.round.name) + '</h2></div>' +
      '<div class="row mb12"><div class="field grow"><label for="imView">View ที่คัดลอกมาจาก HRMi ' + q('HRMi คัดลอกได้ทีละ View เลือกให้ตรง เพื่อให้ประวัติการนำเข้าอ่านง่าย') + '</label><select id="imView" class="inp">' + views.map(function (v) { return '<option' + (v === last ? ' selected' : '') + '>' + esc(v) + '</option>'; }).join('') + '</select></div></div>' +
      '<div class="field"><label for="imText">วางข้อมูลที่นี่ (Ctrl+V) ' + q('ใน HRMi กดที่ตาราง → Ctrl+A → Ctrl+C แล้วมาวางในช่องนี้ ระบบอ่านทันที') + '</label><textarea id="imText" class="inp paste" placeholder="PAY256910-0001	01/10/2569	ค่าเวรแพทย์	…"></textarea></div>' +
      '<div id="imParse" class="mt12"></div>' +
      '<div class="drop mt12" id="imDrop" tabindex="0" role="button" aria-label="แนบไฟล์">' + icon('up', 'big') + '<div><b>หรือลากไฟล์ Export จาก HRMi มาวาง</b><div class="small">รองรับ .xls (Export ของ HRMi) · .xlsx · .csv · .txt</div></div><input type="file" id="imFile" accept=".xls,.xlsx,.csv,.txt,.tsv" hidden></div>' +
      '<div class="row end mt12"><button class="btn ghost" id="imClear">' + icon('x') + 'ล้าง</button><button class="btn pri" id="imCheck" disabled>' + icon('eye') + 'ตรวจข้อมูล</button></div></div><div id="imPreview"></div></div>' +
      '<div class="grid" style="align-content:start"><div class="card"><div class="card-h"><h3>' + icon('help') + 'วิธีคัดลอกจาก HRMi</h3></div><div class="steps small">' +
      '<div><div>เปิดเมนู <b>บันทึกการจ่าย</b> ใน HRMi</div></div><div><div>เลือก <b>View</b> เช่น "เอกสารที่รอการอนุมัติ"</div></div><div><div>คลิกในตาราง กด <b>Ctrl+A</b> แล้ว <b>Ctrl+C</b></div></div><div><div>กลับมาที่นี่ กด <b>Ctrl+V</b> ในช่องวาง แล้วกด <b>ตรวจข้อมูล</b></div></div></div></div>' +
      '<div class="card"><div class="card-h"><h3>' + icon('hist') + 'ประวัติการนำเข้ารอบนี้</h3></div>' + ((d.imports || []).length ? '<div class="grid" style="gap:8px">' + d.imports.slice(0, 8).map(function (x) {
        return '<div class="todo-i" style="padding:9px 10px"><span class="ico t-info">' + icon(x.mode === 'final' ? 'lockr' : 'paste') + '</span><span class="tx"><b class="small">' + esc(x.view || x.source) + '</b><span>' + thDateTime(x.at) + ' · ' + esc(userName(x.by)) + ' · ' + fmt0(x.rows) + ' แถว · ใหม่ ' + x.added + ' / เปลี่ยน ' + x.changed + (+x.moved ? ' / ย้าย ' + x.moved : '') + '</span></span></div>';
      }).join('') + '</div>' : '<p class="muted small" style="margin:0">ยังไม่มี</p>') + '</div></div></div>';
    var parsed = null, src = 'paste';
    var showParsed = function (p, label) {
      parsed = p; var s = ImportFlow.summary(p), box = $('#imParse');
      $('#imCheck').disabled = !s.n;
      if (!s.n && !s.errors.length) { box.innerHTML = ''; return; }
      box.innerHTML = '<div class="row"><span class="chip">' + icon('docs') + fmt0(s.n) + ' แถว</span><span class="chip">' + icon('calc') + 'ยอด PAY ' + fmt(s.total) + '</span>' + (s.other ? '<span class="chip">' + icon('x') + 'ไม่ใช่ PAY ' + s.other + '</span>' : '') +
        (label ? '<span class="chip">' + icon('file') + esc(label) + '</span>' : '') + '</div>' +
        (s.errors.length ? '<details class="callout warn mt8"><summary style="cursor:pointer">' + icon('alert') + ' อ่านไม่ได้ ' + s.errors.length + ' บรรทัด (กดดู)</summary><div class="small mt8">' + s.errors.slice(0, 20).map(function (e) { return 'บรรทัด ' + e.line + ': ' + esc(e.why) + ' — <span class="mono">' + esc(e.text) + '</span>'; }).join('<br>') + '</div></details>' : '');
    };
    var ta = $('#imText');
    ta.addEventListener('input', debounce(function () { src = 'paste'; showParsed(ImportFlow.parseText(ta.value)); }, 250));
    var drop = $('#imDrop'), fileIn = $('#imFile');
    var takeFile = function (f) {
      if (!f) return;
      ImportFlow.parseFile(f).then(function (p) { src = 'file:' + f.name; ta.value = ''; showParsed(p, f.name); toast('อ่านไฟล์ ' + f.name + ' ได้ ' + p.rows.length + ' แถว', 'ok'); }, fail);
    };
    drop.onclick = function () { fileIn.click(); }; drop.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') fileIn.click(); };
    fileIn.onchange = function () { takeFile(fileIn.files[0]); fileIn.value = ''; };
    ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); }); });
    drop.addEventListener('drop', function (e) { takeFile(e.dataTransfer.files[0]); });
    $('#imClear').onclick = function () { ta.value = ''; parsed = null; showParsed({ rows: [], errors: [] }); $('#imPreview').innerHTML = ''; S.dirty = null; };
    $('#imCheck').onclick = function () {
      if (!parsed || !parsed.rows.length) return;
      var b = this, view = $('#imView').value; lsSet(keyFor('lastView'), view);
      b.classList.add('loading');
      api('previewImport', { roundId: S.roundId, view: view, source: src, rows: parsed.rows }).then(function (pv) {
        b.classList.remove('loading');
        ImportFlow.showPreview($('#imPreview'), pv, function () { refreshPage(); }, function () { $('#imPreview').innerHTML = ''; });
      }, function (e) { b.classList.remove('loading'); fail(e); });
    };
  }
};

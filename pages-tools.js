/**
 * pages-tools.js — ตรวจแพทย์ SMC 80/20 · รายการเงินหัก · ตรวจ WL รายฝ่าย
 */
Pages.smc = {
  st: null,
  render: function (el) {
    var P = Pages.smc, d = S.data, groups = S.boot.smcGroups || [];
    el.innerHTML = pageHead('smc', 'ตรวจแพทย์ SMC 80/20', 'วางรหัส จนท. + ยอด จากระบบ DF → ตรวจสถานะพนักงานผ่าน SmartAPI → แบ่ง 80/20 รายคน → เทียบกับยอดเอกสารใน HRMi');
    if (!S.roundId) { el.innerHTML += noRound(); return; }
    if (!d) { el.innerHTML += '<div class="card"><div class="sk" style="height:300px"></div></div>'; return; }
    if (!P.st || P.st.round !== d.round.id) P.st = { round: d.round.id, groupId: (groups[0] || {}).id, lines: [], staff: {}, docs80: null, docs20: null, title: '', workMonth: R.ymLabel(R.ymAdd(d.round.id, -1)), id: '' };
    var st = P.st, open = d.round.status === 'OPEN';
    el.innerHTML += lockedNote() + '<div class="grid g3"><div class="span2 grid" style="align-content:start"><div class="card"><div class="card-h"><h2>' + icon('steth') + 'ชุดตรวจ</h2>' + (st.id ? '<span class="pill st-PROC">กำลังแก้ชุดที่บันทึกไว้</span>' : '') + '</div>' +
      '<div class="row"><div class="field grow"><label for="smG">กลุ่มแพทย์ ' + q('ตั้งชื่อเอกสาร 80%/20% ของแต่ละกลุ่มได้ที่ ตั้งค่า › แพทย์ SMC') + '</label><select id="smG" class="inp">' + groups.map(function (g) { return '<option value="' + esc(g.id) + '"' + (g.id === st.groupId ? ' selected' : '') + '>' + esc(g.name) + '</option>'; }).join('') + '</select></div>' +
      '<div class="field" style="width:150px"><label for="smM">เดือนงาน</label><input id="smM" class="inp" value="' + esc(st.workMonth) + '"></div></div>' +
      '<div class="field mt12"><label for="smT">วางรหัส จนท. และยอดเงิน ' + q('บรรทัดละ 1 คน: รหัส 7 หลัก ตามด้วยยอด (คั่นด้วย Tab/เว้นวรรค มีชื่ออยู่ตรงกลางก็ได้) รหัสซ้ำจะรวมยอดให้') + '</label><textarea id="smT" class="inp paste" placeholder="2680395	172300&#10;2680403	48900"></textarea></div>' +
      '<div class="row end mt8"><span class="small muted flex1" id="smInfo"></span><button class="btn pri" id="smGo">' + icon('search') + 'ตรวจรายชื่อ & คำนวณ</button></div></div><div id="smRes"></div></div>' +
      '<div class="grid" style="align-content:start"><div class="card"><div class="card-h"><h3>' + icon('hist') + 'ชุดที่บันทึกในรอบนี้</h3></div><div id="smSaved"></div></div>' +
      '<div class="card"><div class="card-h"><h3>' + icon('info') + 'สถานะการเชื่อม SmartAPI</h3></div><p class="small" style="margin:0">' + (S.boot.smartapi ? '<span class="pill st-APPROVED">เชื่อมแล้ว</span> ตรวจสถานะพนักงานอัตโนมัติ (จำผลไว้ ' + (S.boot.settings.STAFF_TTL_DAYS || 7) + ' วัน)' : '<span class="pill st-WAIT">ยังไม่ได้เชื่อม</span> ผู้ดูแลต้องตั้ง SMARTAPI_USER / SMARTAPI_PASS ใน Script Properties') + '</p></div></div></div>';
    P.drawSaved();
    var ta = $('#smT');
    if (st.lines.length) ta.value = st.lines.map(function (l) { return l.empCode + '\t' + l.amount; }).join('\n');
    ta.oninput = debounce(function () { var p = R.parseCodeAmount(ta.value); $('#smInfo').textContent = p.rows.length ? p.rows.length + ' คน · รวม ' + fmt(R.sum(p.rows, 'amount')) + (p.errors.length ? ' · อ่านไม่ได้ ' + p.errors.length + ' บรรทัด' : '') : ''; }, 200);
    ta.oninput();
    $('#smG').onchange = function () { st.groupId = this.value; st.docs80 = st.docs20 = null; if (st.lines.length) P.drawRes(); };
    $('#smM').onchange = function () { st.workMonth = this.value; };
    $('#smGo').onclick = function () {
      var p = R.parseCodeAmount(ta.value);
      if (!p.rows.length) return toast('วางรหัส จนท. และยอดก่อน', 'warn');
      if (p.errors.length) toast('มี ' + p.errors.length + ' บรรทัดที่อ่านไม่ได้ (ข้ามไป)', 'warn');
      var b = this; b.classList.add('loading');
      api('smcLookup', { codes: p.rows.map(function (r) { return r.empCode; }) }).then(function (res) {
        b.classList.remove('loading'); st.lines = p.rows; st.staff = res.staff; st.groupId = $('#smG').value; st.workMonth = $('#smM').value;
        if (res.apiError) toast('SmartAPI: ' + res.apiError, 'warn');
        P.drawRes();
      }, function (e) { b.classList.remove('loading'); fail(e); });
    };
    if (st.lines.length) P.drawRes();
  },
  group: function () { var st = this.st; return (S.boot.smcGroups || []).filter(function (g) { return g.id === st.groupId; })[0] || {}; },
  calc: function () {
    var st = this.st, rate = +S.boot.settings.RATE_80 || 80, docs = Logic.liveDocs(S.data), g = this.group();
    var lines = st.lines.map(function (l) { var s = R.split(l.amount, rate), f = st.staff[l.empCode] || {}; return Object.assign({}, l, { a: s.a, b: s.b, fullName: f.fullName || '', position: f.position || '', working: f.working, status: f.status || '', source: f.source || '' }); });
    var cand = function (kw) { return kw ? docs.filter(function (x) { return x.incomeName.indexOf(kw) >= 0; }) : []; };
    var c80 = cand(g.kw80), c20 = cand(g.kw20);
    if (!st.docs80) st.docs80 = c80.map(function (x) { return x.docNo; });
    if (!st.docs20) st.docs20 = c20.map(function (x) { return x.docNo; });
    var pick = function (list) { return docs.filter(function (x) { return list.indexOf(x.docNo) >= 0; }); };
    var d80 = pick(st.docs80), d20 = pick(st.docs20);
    var r = { lines: lines, rate: rate, total: R.sum(lines, 'amount'), sum80: R.sum(lines, 'a'), sum20: R.sum(lines, 'b'), d80: d80, d20: d20, doc80Total: R.sum(d80, 'income'), doc20Total: R.sum(d20, 'income'),
      flags: lines.filter(function (l) { return l.working === false; }).length, c80: c80, c20: c20 };
    r.ok80 = Math.abs(r.sum80 - r.doc80Total) < 0.01; r.ok20 = Math.abs(r.sum20 - r.doc20Total) < 0.01; r.result = r.ok80 && r.ok20 && d80.length && d20.length ? 'MATCH' : 'MISMATCH';
    return r;
  },
  drawRes: function () {
    var P = this, st = P.st, r = P.calc(), open = isOpenRound(), box = $('#smRes'), g = P.group();
    var cmp = function (label, sum, doc, ok, docs, kind) {
      return '<div class="card kpi"><span class="ico ' + (ok ? 't-ok' : 't-bad') + '">' + icon(ok ? 'ok' : 'alert') + '</span><div class="kpi-l">' + label + '</div><div class="kpi-v num" style="font-size:1.3rem">' + fmt(sum) + '</div>' +
        '<div class="kpi-s">เอกสาร HRMi ' + fmt(doc) + (ok ? ' · <b style="color:var(--ok)">ตรงกัน</b>' : ' · <b style="color:var(--bad)">ต่าง ' + fmt(sum - doc) + '</b>') + '</div>' +
        '<div class="chips mt8">' + (docs.length ? docs.map(function (x) { return '<span class="chip mono" data-tip="' + esc(x.incomeName) + '">' + esc(x.docNo) + '</span>'; }).join('') : '<span class="chip">ยังไม่ได้เลือกเอกสาร</span>') + '<button class="btn xs" data-pick="' + kind + '">' + icon('edit') + 'เลือกเอกสาร</button></div></div>';
    };
    box.innerHTML = '<div class="grid g3 stagger">' +
      '<div class="card kpi"><span class="ico t-vio">' + icon('users') + '</span><div class="kpi-l">' + esc(g.name || '') + '</div><div class="kpi-v num" style="font-size:1.3rem">' + fmt(r.total) + '</div><div class="kpi-s">' + r.lines.length + ' คน' + (r.flags ? ' · <b style="color:var(--bad)">ติดธง ' + r.flags + '</b>' : '') + '</div></div>' +
      cmp('ส่วน ' + r.rate + '% (จ่ายแพทย์)', r.sum80, r.doc80Total, r.ok80 && r.d80.length, r.d80, '80') + cmp('ส่วน ' + (100 - r.rate) + '% (ส่วน รพ.) ' + q('อย่าลืมเลือก "จ่ายล่วงหน้า" ใน HRMi'), r.sum20, r.doc20Total, r.ok20 && r.d20.length, r.d20, '20') + '</div>' +
      '<div class="tbl-wrap mt12 tall"><table class="tbl"><thead><tr><th>#</th><th>รหัส</th><th>ชื่อ-สกุล / ตำแหน่ง</th><th>สถานะพนักงาน</th><th class="n">ยอดเต็ม</th><th class="n">' + r.rate + '%</th><th class="n">' + (100 - r.rate) + '%</th></tr></thead><tbody>' +
      r.lines.map(function (l, i) {
        var flag = l.working === false ? '<span class="pill st-RETURN">' + icon('flag') + esc(l.status || 'พ้นสภาพ') + '</span>' : l.working === true ? '<span class="pill st-APPROVED">' + esc(l.status || 'ทำงาน') + '</span>' : '<span class="pill st-NONE">' + esc(l.status || 'ตรวจไม่ได้') + '</span>';
        return '<tr' + (l.working === false ? ' style="background:var(--bad-soft)"' : '') + '><td class="muted">' + (i + 1) + '</td><td class="mono">' + esc(l.empCode) + (l.dup ? ' <span class="pill st-WAIT nodot" data-tip="รหัสซ้ำ ' + l.dup + ' บรรทัด รวมยอดแล้ว">×' + l.dup + '</span>' : '') + '</td><td><div class="t1">' + esc(l.fullName || '—') + '</div><div class="t2">' + esc(l.position || '') + '</div></td><td>' + flag + '</td>' +
          '<td class="n">' + fmt(l.amount) + '</td><td class="n">' + fmt(l.a) + '</td><td class="n">' + fmt(l.b) + '</td></tr>';
      }).join('') + '</tbody><tfoot><tr><td colspan="4">รวม ' + r.lines.length + ' คน</td><td class="n">' + fmt(r.total) + '</td><td class="n">' + fmt(r.sum80) + '</td><td class="n">' + fmt(r.sum20) + '</td></tr></tfoot></table></div>' +
      '<div class="bulk"><span class="flex1">' + (r.result === 'MATCH' ? '✅ ยอดรายคนรวมกันตรงกับเอกสาร HRMi' : '⚠️ ยอดยังไม่ตรง ตรวจรายชื่อหรือเลือกเอกสารให้ถูกใบ') + '</span><button class="btn sm" id="smX">' + icon('dl') + 'Excel</button>' + (open ? '<button class="btn pri" id="smSave">' + icon('ok') + 'บันทึกชุดตรวจ</button>' : '') + '</div>';
    $$('[data-pick]', box).forEach(function (b) { b.onclick = function () { P.pickDocs(b.getAttribute('data-pick')); }; });
    $('#smX').onclick = function () { P.exportX(r); };
    if ($('#smSave')) $('#smSave').onclick = function () {
      var b = this; b.classList.add('loading');
      api('saveSmc', { batch: { id: st.id, roundId: S.roundId, groupId: st.groupId, title: g.name, workMonth: st.workMonth, total: r.total, sum80: r.sum80, sum20: r.sum20, docs80: st.docs80, docs20: st.docs20,
        doc80Total: r.doc80Total, doc20Total: r.doc20Total, result: r.result, flags: r.flags, lines: r.lines.map(function (l) { return { empCode: l.empCode, amount: l.amount, a: l.a, b: l.b, fullName: l.fullName, working: l.working, status: l.status }; }) } })
        .then(function (res) { st.id = res.id; applyRound(res.data); toast('บันทึกชุดตรวจแล้ว', 'ok'); P.drawSaved(); b.classList.remove('loading'); }, function (e) { b.classList.remove('loading'); fail(e); });
    };
  },
  pickDocs: function (kind) {
    var P = this, st = P.st, docs = Logic.liveDocs(S.data).filter(function (x) { return /\d0%/.test(x.incomeName); }), cur = kind === '80' ? st.docs80 : st.docs20;
    modal({ title: 'เลือกเอกสาร ' + kind + '%', icon: 'docs', mid: true, body: '<p class="muted small" style="margin:0">แสดงเอกสารในรอบนี้ที่ชื่อรายได้มี "…0%"</p><div class="tbl-wrap tall"><table class="tbl"><tbody>' +
      docs.map(function (x, i) { return '<tr><td class="c"><input type="checkbox" data-i="' + i + '"' + (cur.indexOf(x.docNo) >= 0 ? ' checked' : '') + '></td><td class="mono">' + esc(x.docNo) + '</td><td><div class="t1">' + esc(x.incomeName) + '</div><div class="t2">' + esc(x.remark || '') + '</div></td><td class="n">' + fmt(x.income) + '</td></tr>'; }).join('') + '</tbody></table></div>',
      actions: [{ label: 'ยกเลิก', cls: 'ghost', value: null }, { label: 'ใช้เอกสารที่เลือก', cls: 'pri', click: function (ov) {
        var list = $$('[data-i]', ov).filter(function (c) { return c.checked; }).map(function (c) { return docs[+c.getAttribute('data-i')].docNo; });
        if (kind === '80') st.docs80 = list; else st.docs20 = list; P.drawRes();
      } }] });
  },
  drawSaved: function () {
    var P = this, box = $('#smSaved'), list = (S.data.smc || []);
    box.innerHTML = list.length ? '<div class="grid" style="gap:8px">' + list.map(function (b) {
      return '<div class="todo-i" style="padding:9px 10px"><span class="ico ' + (b.result === 'MATCH' ? 't-ok' : 't-bad') + '">' + icon(b.result === 'MATCH' ? 'ok' : 'alert') + '</span><span class="tx"><b class="small">' + esc(b.title) + ' · ' + esc(b.workMonth) + '</b><span>' + b.lines.length + ' คน · ' + fmtM(b.total) + (+b.flags ? ' · ติดธง ' + b.flags : '') + ' · ' + thDateTime(b.at) + '</span></span>' +
        '<button class="btn xs" data-load="' + esc(b.id) + '">เปิด</button>' + (isOpenRound() ? '<button class="btn xs ghost" data-delb="' + esc(b.id) + '" aria-label="ลบ">' + icon('trash') + '</button>' : '') + '</div>';
    }).join('') + '</div>' : '<p class="muted small" style="margin:0">ยังไม่มี</p>';
    $$('[data-load]', box).forEach(function (btn) {
      btn.onclick = function () {
        var b = list.filter(function (x) { return x.id === btn.getAttribute('data-load'); })[0], staff = {};
        b.lines.forEach(function (l) { staff[l.empCode] = { fullName: l.fullName, working: l.working, status: l.status }; });
        P.st = { round: S.roundId, id: b.id, groupId: b.groupId, workMonth: b.workMonth, lines: b.lines.map(function (l) { return { empCode: l.empCode, amount: l.amount }; }), staff: staff, docs80: String(b.docs80 || '').split(',').filter(Boolean), docs20: String(b.docs20 || '').split(',').filter(Boolean) };
        refreshPage();
      };
    });
    $$('[data-delb]', box).forEach(function (btn) {
      btn.onclick = function () { confirmDlg('ลบชุดตรวจ', 'ลบชุดตรวจนี้ใช่ไหม (ข้อมูลใน HRMi ไม่กระทบ)', 'ลบ', true).then(function (y) { if (!y) return; api('deleteSmc', { id: btn.getAttribute('data-delb') }).then(function (res) { applyRound(res.data); if (P.st.id === btn.getAttribute('data-delb')) P.st = null; toast('ลบแล้ว', 'ok'); refreshPage(); }, fail); }); };
    });
  },
  exportX: function (r) {
    var d = S.data, g = this.group(), rows = Logic.headRows('ตรวจแพทย์ ' + (g.name || '') + ' เดือนงาน ' + this.st.workMonth, d);
    rows.push(['ลำดับ', 'รหัสประจำตัว', 'ชื่อ-นามสกุล', 'ตำแหน่ง', 'สถานะพนักงาน', 'ยอดเต็ม', r.rate + '%', (100 - r.rate) + '%'].map(function (h) { return { v: h, s: 'head' }; }));
    r.lines.forEach(function (l, i) { rows.push([{ v: i + 1, s: 'int' }, l.empCode, l.fullName, l.position, { v: l.status || '', s: l.working === false ? 'bad' : 'text' }, l.amount, l.a, l.b]); });
    rows.push([{ v: 'รวม', s: 'totText' }, '', '', '', '', { v: r.total, s: 'totMoney' }, { v: r.sum80, s: 'totMoney' }, { v: r.sum20, s: 'totMoney' }]);
    rows.push([]); rows.push(['เอกสาร ' + r.rate + '%', r.d80.map(function (x) { return x.docNo; }).join(', '), '', '', '', '', r.doc80Total, r.ok80 ? 'ตรงกัน' : 'ต่าง ' + fmt(r.sum80 - r.doc80Total)]);
    rows.push(['เอกสาร ' + (100 - r.rate) + '%', r.d20.map(function (x) { return x.docNo; }).join(', '), '', '', '', '', '', r.doc20Total, r.ok20 ? 'ตรงกัน' : 'ต่าง ' + fmt(r.sum20 - r.doc20Total)]);
    XLSX.download(XLSX.book([{ name: 'ตรวจ 80-20', rows: rows, cols: [7, 13, 32, 28, 18, 15, 15, 15, 14], merges: ['A1:H1', 'A2:H2', 'A3:H3'], freeze: 5 }]), 'PayPop_SMC_' + (g.id || '') + '_' + nowStamp() + '.xlsx');
  }
};

Pages.deduct = {
  render: function (el) {
    var P = Pages.deduct;
    el.innerHTML = pageHead('deduct', 'รายการเงินหักประเภทต่างๆ', 'กรอกยอดตามที่บุคคลที่สามแจ้งทางอีเมล หลังบันทึกหักใน HRMi แล้ว · เรียงตามลำดับความสำคัญในการลดเงินหักกรณีรายได้ไม่พอจ่าย');
    if (!S.roundId) { el.innerHTML += noRound(); return; }
    el.innerHTML += '<div id="ddBody"><div class="card"><div class="sk" style="height:300px"></div></div></div><div id="ddBulk"></div>';
    var rid = S.roundId;
    if (P.cache && P.cache.roundId === rid && S.dirty === 'deduct') return P.draw();
    api('getDeductions', { roundId: rid }).then(function (res) { if (S.roundId !== rid) return; P.cache = { roundId: rid, res: res, rows: res.rows.map(function (r) { return Object.assign({}, r); }) }; P.draw(); }, function (e) { loadErr($('#ddBody'), e, function () { P.render(el); }); });
  },
  sums: function (rows) {
    var out = rows.map(function () { return null; });
    rows.forEach(function (r, i) { if (r.kind !== 'sum') return; var n = +r.n || 0, s = 0, j = i - 1, c = 0; while (j >= 0 && c < n) { if (rows[j].kind === 'item') { s += +rows[j].amount || 0; c++; } else if (rows[j].kind === 'sum') break; j--; } out[i] = R.r2(s); });
    return out;
  },
  draw: function () {
    var P = this, c = P.cache, rows = c.rows, open = isOpenRound(), prev = c.res.prev || [], sums = P.sums(rows), psum = prev.length ? P.sums(prev) : [];
    var pmap = {}; prev.forEach(function (r, i) { pmap[r.label + '|' + r.code] = r.kind === 'sum' ? psum[i] : r.amount; });
    var total = R.sum(rows.filter(function (r) { return r.kind === 'item'; }), 'amount');
    var cell = function (i, k, cls) { var r = rows[i]; return open ? '<input class="inp sm ' + (cls || '') + '" data-i="' + i + '" data-k="' + k + '" value="' + esc(r[k] == null ? '' : r[k]) + '"' + (cls ? ' inputmode="decimal"' : '') + '>' : esc(cls && r[k] !== '' ? fmt(r[k]) : r[k]); };
    $('#ddBody').innerHTML = (c.res.isNew ? '<div class="callout info mb12">' + icon('info') + '<span>รอบนี้ยังไม่ได้บันทึก — ใช้แบบฟอร์มจาก' + (c.res.prevId ? ' ' + esc(R.roundName(c.res.prevId)) : 'แบบฟอร์มตั้งต้น') + ' (ยอดว่าง) และแสดงยอดรอบก่อนให้เทียบ</span></div>' : '<p class="small muted">บันทึกล่าสุด ' + thDateTime(c.res.updatedAt) + ' โดย ' + esc(userName(c.res.updatedBy)) + '</p>') +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>ประเภท - รายการเงินหัก</th><th class="hide-sm">ผู้ประสานงาน</th><th>รหัส</th><th class="n">จำนวนราย</th><th class="n">จำนวนบาท</th><th class="n hide-sm">รอบก่อน</th><th class="n">สำเร็จ</th><th class="n">ไม่สำเร็จ</th><th>เลขที่เอกสาร</th><th class="hide-sm">หมายเหตุ</th>' + (open ? '<th></th>' : '') + '</tr></thead><tbody>' +
      rows.map(function (r, i) {
        var pv = pmap[r.label + '|' + r.code], cur = r.kind === 'sum' ? sums[i] : +r.amount || 0, p = pv ? pct(cur, pv) : null;
        if (r.kind === 'head') return '<tr class="grp"><td colspan="10">' + (open ? '<input class="inp sm" data-i="' + i + '" data-k="label" value="' + esc(r.label) + '" style="font-weight:600">' : esc(r.label)) + '</td>' + (open ? '<td><button class="btn xs ghost" data-menu="' + i + '">' + icon('menu') + '</button></td>' : '') + '</tr>';
        if (r.kind === 'sum') return '<tr style="background:var(--sun-soft)"><td><b>' + esc(r.label) + '</b><div class="t2">รวม ' + r.n + ' รายการด้านบน</div></td><td class="hide-sm"></td><td></td><td></td><td class="n"><b>' + fmt(sums[i]) + '</b></td><td class="n hide-sm muted">' + (pv != null ? fmt(pv) : '') + '</td><td colspan="4"></td>' + (open ? '<td><button class="btn xs ghost" data-menu="' + i + '">' + icon('menu') + '</button></td>' : '') + '</tr>';
        return '<tr><td style="min-width:200px">' + cell(i, 'label') + '</td><td class="hide-sm">' + cell(i, 'coord') + '</td><td style="min-width:150px">' + cell(i, 'code') + '</td><td class="n" style="min-width:90px">' + cell(i, 'count', 'num') + '</td><td class="n" style="min-width:130px">' + cell(i, 'amount', 'num') + '</td>' +
          '<td class="n hide-sm muted small">' + (pv != null && pv !== '' ? fmt(pv) + (p != null ? '<div class="' + (Math.abs(p) > 30 ? 'up' : '') + '">' + fmtPct(p) + '</div>' : '') : '') + '</td><td class="n" style="min-width:80px">' + cell(i, 'ok', 'num') + '</td><td class="n" style="min-width:80px">' + cell(i, 'fail', 'num') + '</td>' +
          '<td style="min-width:150px">' + cell(i, 'docNo') + '</td><td class="hide-sm">' + cell(i, 'note') + '</td>' + (open ? '<td><button class="btn xs ghost" data-menu="' + i + '">' + icon('menu') + '</button></td>' : '') + '</tr>';
      }).join('') + '</tbody><tfoot><tr><td colspan="4">รวมทุกรายการ</td><td class="n">' + fmt(total) + '</td><td colspan="' + (open ? 6 : 5) + '"></td></tr></tfoot></table></div>';
    $$('#ddBody [data-k]').forEach(function (inp) { inp.onchange = function () { var r = rows[+inp.getAttribute('data-i')], k = inp.getAttribute('data-k'); r[k] = /count|amount|ok|fail/.test(k) ? (inp.value.trim() === '' ? '' : R.money(inp.value)) : inp.value; S.dirty = 'deduct'; P.draw(); }; });
    $$('#ddBody [data-menu]').forEach(function (b) {
      b.onclick = function () {
        var i = +b.getAttribute('data-menu');
        popover(b, (rows[i].kind === 'sum' ? [{ label: 'แก้แถวรวม (จำนวนรายการ)', icon: 'edit', value: 'editsum' }, '-'] : []).concat([{ label: 'แทรกรายการด้านล่าง', icon: 'plus', value: 'item' }, { label: 'แทรกหัวข้อด้านล่าง', icon: 'tag', value: 'head' }, { label: 'แทรกแถวรวมด้านล่าง', icon: 'calc', value: 'sum' }, '-', { label: 'ลบแถวนี้', icon: 'trash', value: 'del' }]), function (v) {
          if (v === 'editsum') return P.editSum(i);
          if (v === 'del') rows.splice(i, 1);
          else if (v === 'sum') rows.splice(i + 1, 0, { kind: 'sum', label: 'รวม…', n: 2, code: '', amount: '' });
          else rows.splice(i + 1, 0, { kind: v, label: '', coord: '', code: '', count: '', amount: '', ok: '', fail: '', docNo: v === 'item' ? 'PAY' : '', note: '' });
          S.dirty = 'deduct'; P.draw();
          if (v === 'sum') P.editSum(i + 1);
        });
      };
    });
    var box = $('#ddBulk');
    box.innerHTML = '<div class="bulk"><span class="flex1">รวม <b>' + fmt(total) + '</b> บาท' + (S.dirty === 'deduct' ? ' · ยังไม่ได้บันทึก' : '') + '</span><button class="btn sm" id="ddX">' + icon('dl') + 'Excel</button>' + (open ? '<label class="check small"><input type="checkbox" id="ddTpl"> ใช้เป็นแบบฟอร์มตั้งต้น</label><button class="btn pri" id="ddSave">' + icon('ok') + 'บันทึก</button>' : '') + '</div>';
    $('#ddX').onclick = function () { P.exportX(); };
    if ($('#ddSave')) $('#ddSave').onclick = function () {
      var b = this; b.classList.add('loading');
      api('saveDeductions', { roundId: S.roundId, rows: rows, asTemplate: $('#ddTpl').checked }).then(function (res) { S.dirty = null; P.cache = { roundId: S.roundId, res: res, rows: res.rows.map(function (r) { return Object.assign({}, r); }) }; toast('บันทึกรายการเงินหักแล้ว', 'ok'); P.draw(); }, function (e) { b.classList.remove('loading'); fail(e); });
    };
  },
  editSum: function (i) {
    var P = this, r = P.cache.rows[i];
    modal({ title: 'แถวรวม', icon: 'calc', body: '<div class="field"><label for="smL">ชื่อแถวรวม</label><input id="smL" class="inp" value="' + esc(r.label) + '"></div><div class="field"><label for="smN">รวมกี่รายการด้านบน</label><input id="smN" class="inp num" inputmode="numeric" value="' + (r.n || 2) + '"></div>',
      actions: [{ label: 'ตกลง', cls: 'pri', click: function (ov) { r.label = $('#smL', ov).value; r.n = Math.max(1, +$('#smN', ov).value || 1); P.draw(); } }] });
  },
  exportX: function () {
    var P = this, rows = P.cache.rows, sums = P.sums(rows), rname = R.roundName(S.roundId), s = S.boot.settings;
    var out = [[{ v: 'รายการเงินหักประเภทต่างๆ ในระบบ HRMi ของ' + (s.ORG_LINE1 || ''), s: 'title' }], [{ v: 'ประจำ' + rname.replace('รอบจ่าย', 'เดือน'), s: 'sub' }], [{ v: 'เรียงลำดับรายการตามความสำคัญในการลดเงินหักกรณีที่มีเงินรายได้ไม่พอจ่าย', s: 'sub' }], []];
    out.push(['ประเภท - รายการเงินหัก', 'ผู้ประสานงาน', 'รหัส', 'จำนวนราย', 'จำนวนบาท', 'สำเร็จ', 'ไม่สำเร็จ', 'เลขที่เอกสาร', 'หมายเหตุ'].map(function (h) { return { v: h, s: 'head' }; }));
    rows.forEach(function (r, i) {
      if (r.kind === 'head') out.push([{ v: r.label, s: 'totText' }, { v: r.coord || '', s: 'totText' }, { v: r.code || '', s: 'totText' }, '', '', '', '', '', '']);
      else if (r.kind === 'sum') out.push([{ v: r.label, s: 'totText' }, '', '', '', { v: sums[i], s: 'totMoney' }, '', '', '', '']);
      else out.push([r.label, r.coord || '', r.code || '', r.count === '' ? '' : { v: +r.count, s: 'int' }, r.amount === '' ? '' : +r.amount, r.ok === '' ? '' : { v: +r.ok, s: 'int' }, r.fail === '' ? '' : { v: +r.fail, s: 'int' }, r.docNo || '', r.note || '']);
    });
    XLSX.download(XLSX.book([{ name: 'รายการเงินหัก', rows: out, cols: [34, 18, 22, 12, 18, 10, 10, 18, 24], merges: ['A1:I1', 'A2:I2', 'A3:I3'], freeze: 5 }]), 'PayPop_เงินหัก_' + rname.replace(/\s+/g, '_') + '_' + nowStamp() + '.xlsx');
  }
};

Pages.wl = {
  kw: 'Work Load',
  render: function (el) {
    var P = Pages.wl;
    el.innerHTML = pageHead('wl', 'ตรวจ WL รายฝ่าย', 'ตารางฝ่าย × เดือนงาน จากทุกรอบที่เคยนำเข้า · เห็นทันทีว่าเดือนไหนยังไม่เบิก หรือเบิกซ้ำ') +
      '<div class="card mb12"><div class="row"><div class="seg" id="wlKw"><button data-k="Work Load">ค่าเวรแพทย์ - Work Load</button><button data-k="ค่าเวรแพทย์">ค่าเวรแพทย์ (ทั้งหมด)</button><button data-k="">ทุกรายการในหมวด WL</button></div>' +
      '<span class="grow"></span><select id="wlN" class="inp" style="width:auto"><option value="12">12 เดือนล่าสุด</option><option value="18">18 เดือน</option><option value="24">24 เดือน</option></select><button class="btn" id="wlX">' + icon('dl') + 'Excel</button></div>' +
      '<div class="legend"><span><i style="background:var(--violet-soft)"></i>เบิกแล้ว</span><span><i style="background:var(--sun-soft)"></i>เบิกมากกว่า 1 ใบในเดือนเดียวกัน</span><span><i style="background:var(--bad-soft)"></i>เคยเบิกต่อเนื่องแต่เดือนนี้ยังไม่มา</span></div></div><div id="wlBody"><div class="card"><div class="sk" style="height:300px"></div></div></div>';
    $$('#wlKw [data-k]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-k') === P.kw); b.onclick = function () { P.kw = b.getAttribute('data-k'); $$('#wlKw [data-k]').forEach(function (z) { z.classList.toggle('on', z === b); }); P.draw(); }; });
    $('#wlN').value = String(P.n || 12); $('#wlN').onchange = function () { P.n = +this.value; P.draw(); };
    $('#wlX').onclick = function () { P.exportX(); };
    var ck = keyFor('wl'), cached = lsGet(ck);
    if (cached) { P.rows = cached; P.draw(); }
    api('getWl', {}).then(function (res) { P.rows = res.rows; lsSet(ck, res.rows); P.draw(); }, function (e) { if (cached) fail(e); else loadErr($('#wlBody'), e, function () { Pages.wl.render(el); }); });
  },
  matrix: function () {
    var P = this, rows = (P.rows || []).filter(function (r) { return !P.kw || r.name.indexOf(P.kw) >= 0; });
    var seen = {}; rows = rows.filter(function (r) { var k = r.docNo + '|' + r.ym; if (seen[k]) return false; seen[k] = 1; return true; });
    var maxYm = rows.reduce(function (m, r) { return r.ym > m ? r.ym : m; }, ''), n = P.n || 12, months = [];
    for (var i = n - 1; i >= 0; i--) months.push(R.ymAdd(maxYm, -i));
    var divs = {};
    rows.forEach(function (r) { if (months.indexOf(r.ym) < 0) return; var dv = R.divShort(r.div) || 'ไม่ระบุฝ่าย'; var c = (divs[dv] = divs[dv] || {}); (c[r.ym] = c[r.ym] || []).push(r); });
    return { months: months, divs: divs, names: Object.keys(divs).sort() };
  },
  draw: function () {
    var P = this; if (!P.rows) return;
    var m = P.matrix(), body = $('#wlBody'); if (!body) return;
    if (!m.names.length) { body.innerHTML = '<div class="card empty">' + mascot(90, 'think') + '<h3>ยังไม่มีข้อมูล WL</h3><p>ข้อมูลมาจากเอกสารหมวด Work Load & ค่าเวร ของทุกรอบ (รวมข้อมูลย้อนหลังที่นำเข้า)</p></div>'; return; }
    body.innerHTML = '<div class="tbl-wrap tall"><table class="tbl mx"><thead><tr><th style="text-align:left;position:sticky;left:0;z-index:3">ฝ่าย</th>' + m.months.map(function (ym) { return '<th>' + R.ymLabel(ym) + '</th>'; }).join('') + '<th>เดือนที่เบิก</th></tr></thead><tbody>' +
      m.names.map(function (dv) {
        var c = m.divs[dv], filled = m.months.filter(function (ym) { return c[ym]; }).length;
        return '<tr><td class="d">' + esc(dv) + '</td>' + m.months.map(function (ym, i) {
          var list = c[ym];
          if (list) { var s = R.sum(list, 'amount'); return '<td><span class="cell ' + (list.length > 1 ? 'multi' : 'has') + '" data-dv="' + esc(dv) + '" data-ym="' + ym + '" data-tip="' + esc(list.length + ' ใบ · ' + fmt(s)) + '">' + fmtM(s) + (list.length > 1 ? ' ×' + list.length : '') + '</span></td>'; }
          var before = m.months.slice(0, i).filter(function (x) { return c[x]; }).length, after = m.months.slice(i + 1).filter(function (x) { return c[x]; }).length;
          var gap = filled >= 3 && before >= 2 && i < m.months.length - 1 && after >= 1;
          return '<td><span class="cell ' + (gap ? 'gap' : 'none') + '">' + (gap ? 'ยังไม่เบิก' : '·') + '</span></td>';
        }).join('') + '<td class="small muted">' + filled + '/' + m.months.length + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    $$('[data-ym]', body).forEach(function (s) {
      s.onclick = function () {
        var list = m.divs[s.getAttribute('data-dv')][s.getAttribute('data-ym')];
        modal({ title: s.getAttribute('data-dv') + ' · เดือนงาน ' + R.ymLong(s.getAttribute('data-ym')), icon: 'grid', mid: true, body: '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>เลขที่</th><th>รอบจ่าย</th><th>รายละเอียด</th><th class="n">ยอด</th></tr></thead><tbody>' +
          list.map(function (r) { return '<tr><td class="mono">' + esc(r.docNo) + '</td><td>' + esc(R.roundName(r.roundId)) + '</td><td><div class="t1">' + esc(r.name) + '</div><div class="t2">' + esc(r.remark || '') + '</div></td><td class="n">' + fmt(r.amount) + '</td></tr>'; }).join('') + '</tbody></table></div>' });
      };
    });
  },
  exportX: function () {
    var P = this, m = P.matrix(), rows = [[{ v: 'ตรวจสอบ WL รายฝ่าย × เดือนงาน (' + (P.kw || 'หมวด WL ทั้งหมด') + ')', s: 'title' }], [{ v: 'ส่งออกเมื่อ ' + new Date().toLocaleString('th-TH'), s: 'sub' }], []];
    rows.push([{ v: 'ฝ่าย', s: 'head' }].concat(m.months.map(function (ym) { return { v: R.ymLabel(ym), s: 'head' }; })));
    m.names.forEach(function (dv) { rows.push([dv].concat(m.months.map(function (ym) { var l = m.divs[dv][ym]; return l ? { v: R.sum(l, 'amount'), s: l.length > 1 ? 'totMoney' : 'money' } : ''; }))); });
    XLSX.download(XLSX.book([{ name: 'ตรวจ WL', rows: rows, cols: [36].concat(m.months.map(function () { return 13; })), freeze: 4, landscape: true }]), 'PayPop_ตรวจWL_' + nowStamp() + '.xlsx');
  }
};

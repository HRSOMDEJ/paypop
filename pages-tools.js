/**
 * pages-tools.js — ตรวจแพทย์ SMC 80/20 · รายการเงินหัก · ตรวจ WL รายฝ่าย
 */
Pages.smc = {
  st: null,   // null = หน้ารายการเอกสาร · {…} = กำลังตรวจ 1 คู่เอกสาร
  /**
   * คู่เอกสาร 80/20 ของรอบ (1 แถว = 1 ชุดตรวจ)
   * 1) ชุดที่บันทึกแล้ว = แถวของตัวเอง แสดงเอกสารที่บันทึกจริง (เอกสารนั้นไม่ไปโผล่แถวอื่นอีก)
   * 2) เอกสารที่เหลือ จับคู่ด้วยยอด 20% = 80% × 20/80 ก่อน (ข้ามกลุ่มได้ เช่น 20% ที่รายละเอียดว่าง)
   * 3) ที่ยังเหลือ จับคู่ในกลุ่มเดียวกันด้วยเดือนงาน / ใบเดียวต่อใบเดียว · ที่เหลือแสดงเดี่ยว
   */
  pairs: function (d) {
    var groups = S.boot.smcGroups || [], rate = +S.boot.settings.RATE_80 || 80;
    var all = Logic.liveDocs(d), docs = all.filter(function (x) { return /\d\s*0\s*%/.test(x.incomeName); });
    var byNo = {}; all.forEach(function (x) { byNo[x.docNo] = x; });
    var words = function (s) { return String(s || '').split('|').map(function (w) { return w.trim(); }).filter(Boolean); };
    var hit = function (txt, list) { return list.some(function (w) { return txt.indexOf(w) >= 0; }); };
    var OTHER = { id: 'OTHER', name: 'อื่น ๆ (ยังไม่เข้ากลุ่ม)' };
    var cls = function (x) {
      for (var i = 0; i < groups.length; i++) {
        var g = groups[i], side = g.kw80 && x.incomeName.indexOf(g.kw80) >= 0 ? '80' : g.kw20 && x.incomeName.indexOf(g.kw20) >= 0 ? '20' : '';
        if (!side) continue;
        var rm = String(x.remark || ''), inc = words(g.inc), exc = words(g.exc);
        if (inc.length && !hit(rm, inc)) continue;
        if (exc.length && hit(rm, exc)) continue;
        return { g: g, side: side };
      }
      return { g: OTHER, side: /8\s*0\s*%/.test(x.incomeName) ? '80' : '20' };
    };
    var gOf = function (id) { return groups.filter(function (g) { return g.id === id; })[0] || null; };
    var ym = function (x) { return R.workYm(x.remark, x.jobName) || ''; };
    var list = function (s) { return String(s || '').split(',').filter(Boolean); };
    var obj = function (no) { return byNo[no] || { docNo: no, incomeName: 'ไม่พบเอกสารนี้ในรอบแล้ว', remark: '', income: 0, missing: true }; };
    var out = [], used = {};
    // 1) ชุดที่บันทึกแล้ว
    (d.smc || []).forEach(function (b) {
      var n80 = list(b.docs80), n20 = list(b.docs20);
      n80.concat(n20).forEach(function (n) { used[n] = 1; });
      out.push({ g: gOf(b.groupId) || { id: b.groupId, name: b.title || b.groupId }, d80: n80.map(obj), d20: n20.map(obj), ym: '', batch: b });
    });
    // 2) เอกสารที่เหลือ
    var c80 = [], c20 = [];
    docs.forEach(function (x) { if (used[x.docNo]) return; var c = cls(x); x._g = c.g; (c.side === '80' ? c80 : c20).push(x); });
    var take = {};
    c80.forEach(function (a) {
      var want = a.income * (100 - rate) / rate;
      var m = c20.filter(function (z) { return !take[z.docNo] && Math.abs(z.income - want) <= 1; });
      m.sort(function (p, q) { return (p._g.id === a._g.id ? 0 : 1) - (q._g.id === a._g.id ? 0 : 1); });
      if (m.length) { take[m[0].docNo] = 1; take[a.docNo] = 1; out.push({ g: a._g, d80: [a], d20: [m[0]], ym: ym(a) }); }
    });
    // 3) ที่ยังเหลือ: ในกลุ่มเดียวกัน
    var left80 = c80.filter(function (a) { return !take[a.docNo]; }), left20 = c20.filter(function (z) { return !take[z.docNo]; });
    left80.forEach(function (a) {
      var same = left20.filter(function (z) { return !take[z.docNo] && z._g.id === a._g.id; });
      var m = same.filter(function (z) { return ym(a) && ym(z) === ym(a); });
      if (!m.length && same.length === 1 && left80.filter(function (o) { return o._g.id === a._g.id; }).length === 1) m = same;
      if (m.length) take[m[0].docNo] = 1;
      out.push({ g: a._g, d80: [a], d20: m.slice(0, 1), ym: ym(a) });
    });
    left20.forEach(function (z) { if (!take[z.docNo]) out.push({ g: z._g, d80: [], d20: [z], ym: ym(z) }); });
    var gi = function (id) { for (var i = 0; i < groups.length; i++) if (groups[i].id === id) return i; return 999; };
    var firstNo = function (p) { var x = p.d80[0] || p.d20[0]; return x ? x.docNo : ''; };
    out.sort(function (a, b) { return gi(a.g.id) - gi(b.g.id) || (firstNo(a) < firstNo(b) ? -1 : 1); });
    return out;
  },
  render: function (el) {
    var P = Pages.smc, d = S.data;
    el.innerHTML = pageHead('smc', 'ตรวจแพทย์ SMC 80/20', 'ตรวจทีละเอกสาร: เลือกคู่เอกสาร 80%/20% → วางรหัส จนท. + ยอดเต็มจากระบบ DF → ตรวจสถานะพนักงาน (SmartAPI) → แบ่ง 80/20 → ยอดรวมต้องตรงเอกสาร');
    if (!S.roundId) { el.innerHTML += noRound(); return; }
    if (!d) { el.innerHTML += roundWait(); return; }
    if (P.st && P.st.round !== d.round.id) P.st = null;
    if (P.st) return P.work(el);
    P.list(el);
  },

  /* ---------------- หน้ารายการคู่เอกสาร */
  list: function (el) {
    var P = this, d = S.data, open = d.round.status === 'OPEN', pairs = P.pairs(d);
    var done = pairs.filter(function (p) { return p.batch; }), ok = done.filter(function (p) { return p.batch.result === 'MATCH'; });
    var people = done.reduce(function (s, p) { return s + (p.batch.lines || []).length; }, 0), flags = done.reduce(function (s, p) { return s + (+p.batch.flags || 0); }, 0);
    var chips = function (list) {
      return list.length ? list.map(function (x) { return '<div class="smdoc' + (x.missing ? ' bad' : '') + '" data-tip="' + esc(x.docNo + ' · ' + x.incomeName + (x.remark ? ' · ' + x.remark : '')) + '"><span class="mono">' + esc(x.docNo.slice(-4)) + '</span><span class="num">' + (x.missing ? 'ไม่พบ' : fmt(x.income)) + '</span></div>'; }).join('') : '<span class="muted small">—</span>';
    };
    var res = function (p) {
      var b = p.batch;
      if (!b) return '<span class="pill st-WAIT">ยังไม่ตรวจ</span>';
      var r = P.recheck(p);
      return (r.ok ? '<span class="pill st-APPROVED">' + icon('ok') + 'ตรงกัน</span>' : '<span class="pill st-RETURN">' + icon('alert') + (r.why || 'ยอดไม่ตรง') + '</span>') +
        '<div class="t2">' + (b.lines || []).length + ' คน · ' + fmt(b.total) + (+b.flags ? ' · <b style="color:var(--bad)">ติดธง ' + b.flags + '</b>' : '') + '</div>';
    };
    el.innerHTML += lockedNote() +
      '<div class="grid g4 mb12">' +
      '<div class="card kpi"><span class="ico t-vio">' + icon('docs') + '</span><div class="kpi-l">คู่เอกสาร 80/20 ในรอบ</div><div class="kpi-v num">' + pairs.length + '</div></div>' +
      '<div class="card kpi"><span class="ico t-pri">' + icon('steth') + '</span><div class="kpi-l">ตรวจแล้ว</div><div class="kpi-v num">' + done.length + '</div><div class="kpi-s">ตรงกัน ' + ok.length + '</div></div>' +
      '<div class="card kpi"><span class="ico t-ok">' + icon('users') + '</span><div class="kpi-l">แพทย์ที่ตรวจแล้ว</div><div class="kpi-v num">' + fmt0(people) + '</div><div class="kpi-s">คน (นับซ้ำได้ถ้าอยู่หลายเอกสาร)</div></div>' +
      '<div class="card kpi"><span class="ico ' + (flags ? 't-bad' : 't-ok') + '">' + icon('flag') + '</span><div class="kpi-l">ติดธงพ้นสภาพ/ไม่พบ</div><div class="kpi-v num">' + flags + '</div></div></div>' +
      '<div class="card"><div class="card-h"><h2>' + icon('docs') + 'เอกสาร 80% / 20% ของ' + esc(d.round.name) + '</h2>' + q('ระบบจับคู่จากชื่อรายได้ + รายละเอียด ตามกลุ่มที่ตั้งไว้ใน ตั้งค่า › กลุ่มแพทย์ SMC · กด "ตรวจ" ทีละแถว แต่ละแถวบันทึกแยกกัน ไม่ทับกัน') +
      '<span class="grow"></span>' + (done.length ? '<button class="btn sm" id="smXall">' + icon('dl') + 'Excel ทั้งรอบ</button>' : '') + (open ? '<button class="btn sm" id="smFree">' + icon('plus') + 'ตรวจโดยเลือกเอกสารเอง</button>' : '') + '</div>' +
      (pairs.length ? '<div class="tbl-wrap"><table class="tbl smtbl"><colgroup><col style="width:22%"><col style="width:9%"><col style="width:19%"><col style="width:19%"><col style="width:17%"><col style="width:14%"></colgroup>' +
        '<thead><tr><th>กลุ่ม</th><th>เดือนงาน</th><th>เอกสาร 80% (จ่ายแพทย์)</th><th>เอกสาร 20% (ส่วน รพ.)</th><th>ผลตรวจ</th><th></th></tr></thead><tbody>' +
        pairs.map(function (p, i) {
          var b = p.batch;
          return '<tr><td><div class="t1">' + esc(p.g.name) + '</div></td><td>' + esc(b && b.workMonth ? b.workMonth : p.ym ? R.ymLabel(p.ym) : '—') + '</td>' +
            '<td>' + chips(p.d80) + '</td><td>' + chips(p.d20) + '</td><td>' + res(p) + '</td><td class="smact">' +
            (b ? '<button class="btn xs" data-open="' + i + '">' + icon('eye') + 'ดูรายชื่อ/แก้</button>' : open ? '<button class="btn xs pri" data-open="' + i + '">' + icon('search') + 'ตรวจ</button>' : '') +
            (b && open ? '<button class="btn xs ghost" data-delb="' + esc(b.id) + '" aria-label="ลบชุดตรวจ">' + icon('trash') + '</button>' : '') + '</td></tr>';
        }).join('') + '</tbody></table></div>'
        : '<div class="empty">' + mascot(80, 'think') + '<p>ยังไม่พบเอกสาร 80%/20% ในรอบนี้ — วางข้อมูลจาก HRMi ก่อน หรือกด "ตรวจโดยเลือกเอกสารเอง"</p></div>') + '</div>' +
      '<div class="card mt12"><p class="small" style="margin:0">' + icon('info') + ' SmartAPI: ' + (S.boot.smartapi ? '<span class="pill st-APPROVED">เชื่อมแล้ว</span> ตรวจสถานะพนักงานอัตโนมัติ (จำผลไว้ ' + (S.boot.settings.STAFF_TTL_DAYS || 7) + ' วัน)' : '<span class="pill st-WAIT">ยังไม่ได้เชื่อม</span> ผู้ดูแลต้องตั้ง SMARTAPI_USER / SMARTAPI_PASS ใน Script Properties') + '</p></div>';
    $$('[data-open]', el).forEach(function (btn) { btn.onclick = function () { P.start(pairs[+btn.getAttribute('data-open')]); }; });
    $$('[data-delb]', el).forEach(function (btn) {
      btn.onclick = function () { confirmDlg('ลบชุดตรวจ', 'ลบผลตรวจของเอกสารนี้ใช่ไหม (ข้อมูลใน HRMi ไม่กระทบ)', 'ลบ', true).then(function (y) { if (!y) return; api('deleteSmc', { id: btn.getAttribute('data-delb') }).then(function (r) { applyRound(r.data); toast('ลบชุดตรวจแล้ว', 'ok'); refreshPage(); }, fail); }); };
    });
    if ($('#smFree')) $('#smFree').onclick = function () { P.start({ g: (S.boot.smcGroups || [])[0] || { id: 'OTHER', name: 'อื่น ๆ' }, d80: [], d20: [], ym: R.ymAdd(d.round.id, -1), free: true }); };
    if ($('#smXall')) $('#smXall').onclick = function () { P.exportAll(pairs.filter(function (p) { return p.batch; })); };
  },
  /** ตรวจผลที่บันทึกไว้กับเอกสารปัจจุบันอีกครั้ง (เอกสารอาจถูกวางทับยอดใหม่) */
  recheck: function (p) {
    var b = p.batch, n80 = String(b.docs80 || '').split(',').filter(Boolean), n20 = String(b.docs20 || '').split(',').filter(Boolean);
    if (p.d80.concat(p.d20).some(function (x) { return x.missing; })) return { ok: false, why: 'เอกสารบางใบไม่อยู่ในรอบแล้ว' };
    if (!n80.length || !n20.length) return { ok: false, why: 'ยังไม่ครบคู่ 80/20' };
    var t80 = R.sum(p.d80, 'income'), t20 = R.sum(p.d20, 'income');
    var ok80 = Math.abs(t80 - R.money(b.sum80)) < 0.01, ok20 = Math.abs(t20 - R.money(b.sum20)) < 0.01;
    if (!ok80 || !ok20) return { ok: false, why: 'ไม่ตรง ต่าง ' + fmt((ok80 ? 0 : R.money(b.sum80) - t80) + (ok20 ? 0 : R.money(b.sum20) - t20)) };
    return { ok: true };
  },
  start: function (p) {
    var d = S.data, b = p.batch, staff = {};
    if (b) {
      (b.lines || []).forEach(function (l) { staff[l.empCode] = { fullName: l.fullName, position: l.position || '', working: l.working, status: l.status }; });
      this.st = { round: d.round.id, id: b.id, groupId: b.groupId, title: b.title || p.g.name, workMonth: b.workMonth, lines: (b.lines || []).map(function (l) { return { empCode: l.empCode, amount: R.money(l.amount) }; }), staff: staff,
        docs80: String(b.docs80 || '').split(',').filter(Boolean), docs20: String(b.docs20 || '').split(',').filter(Boolean), checked: true, saved: true };
    } else {
      this.st = { round: d.round.id, id: '', groupId: p.g.id, title: p.g.name, workMonth: p.ym ? R.ymLabel(p.ym) : R.ymLabel(R.ymAdd(d.round.id, -1)), lines: [], staff: {},
        docs80: p.d80.map(function (x) { return x.docNo; }), docs20: p.d20.map(function (x) { return x.docNo; }), checked: false, saved: false, free: !!p.free };
    }
    refreshPage(); window.scrollTo(0, 0);
  },
  back: function () {
    var P = this;
    var go = function () { P.st = null; if (S.dirty === 'smc') S.dirty = null; refreshPage(); };
    if (S.dirty === 'smc') return confirmDlg('ยังไม่ได้บันทึก', 'ผลตรวจชุดนี้ยังไม่ได้บันทึก ต้องการกลับไปหน้ารายการโดยไม่บันทึกใช่ไหม', 'กลับโดยไม่บันทึก', true).then(function (y) { if (y) go(); });
    go();
  },

  /* ---------------- หน้าตรวจ 1 คู่เอกสาร */
  work: function (el) {
    var P = this, st = P.st, d = S.data, open = d.round.status === 'OPEN', groups = S.boot.smcGroups || [];
    var docs = Logic.liveDocs(d), pick = function (l) { return docs.filter(function (x) { return l.indexOf(x.docNo) >= 0; }); };
    var docLine = function (list, kind) {
      return (list.length ? list.map(function (x) { return '<span class="chip mono" data-tip="' + esc(x.incomeName + (x.remark ? ' · ' + x.remark : '')) + '">' + esc(x.docNo) + ' · ' + fmt(x.income) + '</span>'; }).join('') : '<span class="chip">ยังไม่ได้เลือก</span>') +
        (open ? '<button class="btn xs" data-pick="' + kind + '">' + icon('edit') + 'เปลี่ยน</button>' : '');
    };
    el.innerHTML += lockedNote() +
      '<div class="row mb12"><button class="btn sm ghost" id="smBack">' + icon('left') + 'กลับรายการเอกสาร</button><span class="grow"></span>' + (st.saved ? '<span class="pill st-APPROVED">บันทึกไว้แล้ว · แก้ไขแล้วกดบันทึกซ้ำได้</span>' : '<span class="pill st-PROC">ชุดใหม่</span>') + '</div>' +
      '<div class="card"><div class="card-h"><h2>' + icon('steth') + esc(st.title || 'ชุดตรวจ') + '</h2></div>' +
      '<div class="grid g2" style="gap:10px"><div><div class="small muted">เอกสาร 80% (จ่ายแพทย์)</div><div class="chips mt8">' + docLine(pick(st.docs80), '80') + '</div></div>' +
      '<div><div class="small muted">เอกสาร 20% (ส่วน รพ.)</div><div class="chips mt8">' + docLine(pick(st.docs20), '20') + '</div></div></div>' +
      '<div class="row mt12">' + (st.free ? '<div class="field grow"><label for="smG">กลุ่มแพทย์</label><select id="smG" class="inp">' + groups.map(function (g) { return '<option value="' + esc(g.id) + '"' + (g.id === st.groupId ? ' selected' : '') + '>' + esc(g.name) + '</option>'; }).join('') + '</select></div>' : '') +
      '<div class="field" style="width:150px"><label for="smM">เดือนงาน</label><input id="smM" class="inp" value="' + esc(st.workMonth) + '"></div></div>' +
      '<div class="field mt12"><label for="smT">วางรหัส จนท. และยอดเต็ม (100%) จากระบบ DF ' + q('บรรทัดละ 1 คน: รหัส 7 หลัก ตามด้วยยอดเต็ม (คั่นด้วย Tab/เว้นวรรค มีชื่ออยู่ตรงกลางก็ได้) รหัสซ้ำจะรวมยอดให้ · ระบบแบ่ง 80/20 ให้เอง') + '</label><textarea id="smT" class="inp paste" placeholder="2680395	172300&#10;2680403	48900"' + (open ? '' : ' readonly') + '></textarea></div>' +
      '<div class="row end mt8"><span class="small muted flex1" id="smInfo"></span>' + (open ? '<button class="btn pri" id="smGo">' + icon('search') + 'ตรวจรายชื่อ & คำนวณ</button>' : '') + '</div></div><div id="smRes"></div>';
    var ta = $('#smT');
    if (st.lines.length && !st.text) ta.value = st.lines.map(function (l) { return l.empCode + '\t' + l.amount; }).join('\n');
    if (st.text) ta.value = st.text;
    if (st.pasted == null) st.pasted = ta.value;
    ta.oninput = debounce(function () {
      st.text = ta.value;
      var p = R.parseCodeAmount(ta.value);
      $('#smInfo').textContent = p.rows.length ? p.rows.length + ' คน · รวม ' + fmt(R.sum(p.rows, 'amount')) + (p.errors.length ? ' · อ่านไม่ได้ ' + p.errors.length + ' บรรทัด' : '') : '';
      if (st.checked && open && ta.value !== st.pasted) { S.dirty = 'smc'; }
    }, 200);
    ta.oninput();
    $('#smBack').onclick = function () { P.back(); };
    if ($('#smG')) $('#smG').onchange = function () { st.groupId = this.value; st.title = (groups.filter(function (g) { return g.id === st.groupId; })[0] || {}).name || st.title; };
    $('#smM').onchange = function () { st.workMonth = this.value; if (open) S.dirty = 'smc'; };
    $$('[data-pick]', el).forEach(function (b) { b.onclick = function () { P.pickDocs(b.getAttribute('data-pick')); }; });
    if ($('#smGo')) $('#smGo').onclick = function () {
      var p = R.parseCodeAmount(ta.value);
      if (!p.rows.length) return toast('วางรหัส จนท. และยอดก่อน', 'warn');
      if (p.errors.length) toast('มี ' + p.errors.length + ' บรรทัดที่อ่านไม่ได้ (ข้ามไป)', 'warn');
      var b = this; b.classList.add('loading');
      api('smcLookup', { codes: p.rows.map(function (r) { return r.empCode; }) }).then(function (res) {
        b.classList.remove('loading'); st.lines = p.rows; st.staff = res.staff; st.checked = true; st.pasted = ta.value; S.dirty = 'smc';
        if (res.apiError) toast('SmartAPI: ' + res.apiError, 'warn');
        P.drawRes();
      }, function (e) { b.classList.remove('loading'); fail(e); });
    };
    if (st.checked && st.lines.length) P.drawRes();
  },
  calc: function () {
    var st = this.st, rate = +S.boot.settings.RATE_80 || 80, docs = Logic.liveDocs(S.data);
    var lines = st.lines.map(function (l) { var s = R.split(l.amount, rate), f = st.staff[l.empCode] || {}; return Object.assign({}, l, { a: s.a, b: s.b, fullName: f.fullName || '', position: f.position || '', working: f.working, status: f.status || '', source: f.source || '' }); });
    var pick = function (list) { return docs.filter(function (x) { return list.indexOf(x.docNo) >= 0; }); };
    var d80 = pick(st.docs80), d20 = pick(st.docs20);
    var r = { lines: lines, rate: rate, total: R.sum(lines, 'amount'), sum80: R.sum(lines, 'a'), sum20: R.sum(lines, 'b'), d80: d80, d20: d20, doc80Total: R.sum(d80, 'income'), doc20Total: R.sum(d20, 'income'),
      flags: lines.filter(function (l) { return l.working === false; }).length };
    r.ok80 = d80.length > 0 && Math.abs(r.sum80 - r.doc80Total) < 0.01; r.ok20 = d20.length > 0 && Math.abs(r.sum20 - r.doc20Total) < 0.01;
    r.result = r.ok80 && r.ok20 ? 'MATCH' : 'MISMATCH';
    return r;
  },
  drawRes: function () {
    var P = this, st = P.st, r = P.calc(), open = isOpenRound(), box = $('#smRes'); if (!box) return;
    var cmp = function (label, sum, doc, ok, has) {
      return '<div class="card kpi"><span class="ico ' + (ok ? 't-ok' : 't-bad') + '">' + icon(ok ? 'ok' : 'alert') + '</span><div class="kpi-l">' + label + '</div><div class="kpi-v num" style="font-size:1.3rem">' + fmt(sum) + '</div>' +
        '<div class="kpi-s">' + (has ? 'เอกสาร HRMi ' + fmt(doc) + (ok ? ' · <b style="color:var(--ok)">ตรงกัน</b>' : ' · <b style="color:var(--bad)">ต่าง ' + fmt(sum - doc) + '</b>') : '<b style="color:var(--bad)">ยังไม่ได้เลือกเอกสาร</b>') + '</div></div>';
    };
    box.innerHTML = '<div class="grid g3 stagger mt12">' +
      '<div class="card kpi"><span class="ico t-vio">' + icon('users') + '</span><div class="kpi-l">ยอดเต็มรวม</div><div class="kpi-v num" style="font-size:1.3rem">' + fmt(r.total) + '</div><div class="kpi-s">' + r.lines.length + ' คน' + (r.flags ? ' · <b style="color:var(--bad)">ติดธง ' + r.flags + '</b>' : '') + '</div></div>' +
      cmp('ส่วน ' + r.rate + '% (จ่ายแพทย์)', r.sum80, r.doc80Total, r.ok80, r.d80.length) + cmp('ส่วน ' + (100 - r.rate) + '% (ส่วน รพ.) ' + q('อย่าลืมเลือก "จ่ายล่วงหน้า" ใน HRMi'), r.sum20, r.doc20Total, r.ok20, r.d20.length) + '</div>' +
      '<div class="tbl-wrap mt12 tall"><table class="tbl"><thead><tr><th>#</th><th>รหัส</th><th>ชื่อ-สกุล / ตำแหน่ง</th><th>สถานะพนักงาน</th><th class="n">ยอดเต็ม</th><th class="n">' + r.rate + '%</th><th class="n">' + (100 - r.rate) + '%</th></tr></thead><tbody>' +
      r.lines.map(function (l, i) {
        var flag = l.working === false ? '<span class="pill st-RETURN">' + icon('flag') + esc(l.status || 'พ้นสภาพ') + '</span>' : l.working === true ? '<span class="pill st-APPROVED">' + esc(l.status || 'ทำงาน') + '</span>' : '<span class="pill st-NONE">' + esc(l.status || 'ตรวจไม่ได้') + '</span>';
        return '<tr' + (l.working === false ? ' style="background:var(--bad-soft)"' : '') + '><td class="muted">' + (i + 1) + '</td><td class="mono">' + esc(l.empCode) + (l.dup ? ' <span class="pill st-WAIT nodot" data-tip="รหัสซ้ำ ' + l.dup + ' บรรทัด รวมยอดแล้ว">×' + l.dup + '</span>' : '') + '</td><td><div class="t1">' + esc(l.fullName || '—') + '</div><div class="t2">' + esc(l.position || '') + '</div></td><td>' + flag + '</td>' +
          '<td class="n">' + fmt(l.amount) + '</td><td class="n">' + fmt(l.a) + '</td><td class="n">' + fmt(l.b) + '</td></tr>';
      }).join('') + '</tbody><tfoot><tr><td colspan="4">รวม ' + r.lines.length + ' คน</td><td class="n">' + fmt(r.total) + '</td><td class="n">' + fmt(r.sum80) + '</td><td class="n">' + fmt(r.sum20) + '</td></tr></tfoot></table></div>' +
      '<div class="bulk"><span class="flex1">' + (r.result === 'MATCH' ? '✅ ยอดรายคนรวมกันตรงกับเอกสาร HRMi ทั้ง 2 ใบ' : '⚠️ ยอดยังไม่ตรง ตรวจรายชื่อ/ยอด หรือเปลี่ยนเอกสารให้ถูกใบ (บันทึกได้ ระบบจะติดสถานะ "ไม่ตรง")') + '</span><button class="btn sm" id="smX">' + icon('dl') + 'Excel</button>' + (open ? '<button class="btn pri" id="smSave">' + icon('ok') + 'บันทึกชุดตรวจนี้</button>' : '') + '</div>';
    $('#smX').onclick = function () { P.exportX(r); };
    if ($('#smSave')) $('#smSave').onclick = function () {
      var b = this; b.classList.add('loading');
      if (!st.id) st.id = 's' + newRid();   // รหัสชุดสร้างฝั่งเว็บ → ส่งซ้ำ (เน็ตสะดุด) ไม่เกิดชุดซ้ำ
      api('saveSmc', { batch: { id: st.id, roundId: S.roundId, groupId: st.groupId, title: st.title, workMonth: st.workMonth, total: r.total, sum80: r.sum80, sum20: r.sum20, docs80: st.docs80, docs20: st.docs20,
        doc80Total: r.doc80Total, doc20Total: r.doc20Total, result: r.result, flags: r.flags, lines: r.lines.map(function (l) { return { empCode: l.empCode, amount: l.amount, a: l.a, b: l.b, fullName: l.fullName, position: l.position, working: l.working, status: l.status }; }) } })
        .then(function (res) {
          applyRound(res.data); S.dirty = null; P.st = null;
          toast('บันทึก ' + (st.title || 'ชุดตรวจ') + ' แล้ว (' + r.lines.length + ' คน' + (r.result === 'MATCH' ? ' · ตรงกัน' : ' · ยอดยังไม่ตรง') + ')', r.result === 'MATCH' ? 'ok' : 'warn');
          refreshPage();
        }, function (e) { b.classList.remove('loading'); fail(e); });
    };
  },
  pickDocs: function (kind) {
    var P = this, st = P.st, docs = Logic.liveDocs(S.data).filter(function (x) { return /\d\s*0\s*%/.test(x.incomeName); }), cur = kind === '80' ? st.docs80 : st.docs20;
    var usedBy = {}; (S.data.smc || []).forEach(function (b) { if (b.id === st.id) return; String(b.docs80 + ',' + b.docs20).split(',').forEach(function (n) { if (n) usedBy[n] = b.title || b.groupId; }); });
    modal({ title: 'เลือกเอกสาร ' + kind + '%', icon: 'docs', mid: true, body: '<p class="muted small" style="margin:0">เอกสารในรอบนี้ที่ชื่อรายได้มี "…0%" · เลือกได้หลายใบ</p><div class="tbl-wrap tall"><table class="tbl"><tbody>' +
      docs.map(function (x, i) { var u = usedBy[x.docNo]; return '<tr><td class="c"><input type="checkbox" data-i="' + i + '"' + (cur.indexOf(x.docNo) >= 0 ? ' checked' : '') + '></td><td class="mono">' + esc(x.docNo) + '</td><td><div class="t1">' + esc(x.incomeName) + '</div><div class="t2">' + esc(x.remark || '') + '</div>' + (u ? '<div class="t2" style="color:var(--bad)">ใช้ในชุดตรวจ "' + esc(u) + '" แล้ว</div>' : '') + '</td><td class="n">' + fmt(x.income) + '</td></tr>'; }).join('') + '</tbody></table></div>',
      actions: [{ label: 'ยกเลิก', cls: 'ghost', value: null }, { label: 'ใช้เอกสารที่เลือก', cls: 'pri', click: function (ov) {
        var list = $$('[data-i]', ov).filter(function (c) { return c.checked; }).map(function (c) { return docs[+c.getAttribute('data-i')].docNo; });
        if (kind === '80') st.docs80 = list; else st.docs20 = list;
        if (st.checked) S.dirty = 'smc';
        refreshPage();
      } }] });
  },
  exportX: function (r) {
    var d = S.data, st = this.st, rows = Logic.headRows('ตรวจแพทย์ ' + (st.title || '') + ' เดือนงาน ' + st.workMonth, d);
    rows.push(['ลำดับ', 'รหัสประจำตัว', 'ชื่อ-นามสกุล', 'ตำแหน่ง', 'สถานะพนักงาน', 'ยอดเต็ม', r.rate + '%', (100 - r.rate) + '%'].map(function (h) { return { v: h, s: 'head' }; }));
    r.lines.forEach(function (l, i) { rows.push([{ v: i + 1, s: 'int' }, l.empCode, l.fullName, l.position, { v: l.status || '', s: l.working === false ? 'bad' : 'text' }, l.amount, l.a, l.b]); });
    rows.push([{ v: 'รวม', s: 'totText' }, '', '', '', '', { v: r.total, s: 'totMoney' }, { v: r.sum80, s: 'totMoney' }, { v: r.sum20, s: 'totMoney' }]);
    rows.push([]); rows.push(['เอกสาร ' + r.rate + '%', r.d80.map(function (x) { return x.docNo; }).join(', '), '', '', '', '', r.doc80Total, r.ok80 ? 'ตรงกัน' : 'ต่าง ' + fmt(r.sum80 - r.doc80Total)]);
    rows.push(['เอกสาร ' + (100 - r.rate) + '%', r.d20.map(function (x) { return x.docNo; }).join(', '), '', '', '', '', '', r.doc20Total, r.ok20 ? 'ตรงกัน' : 'ต่าง ' + fmt(r.sum20 - r.doc20Total)]);
    XLSX.download(XLSX.book([{ name: 'ตรวจ 80-20', rows: rows, cols: [7, 13, 32, 28, 18, 15, 15, 15, 14], merges: ['A1:H1', 'A2:H2', 'A3:H3'], freeze: 5 }]), 'PayPop_SMC_' + (st.groupId || '') + '_' + nowStamp() + '.xlsx');
  },
  /** Excel ทั้งรอบ: แผ่นสรุปรายเอกสาร + แผ่นรายชื่อแพทย์ทุกชุด */
  exportAll: function (pairs) {
    var d = S.data, P = this, rate = +S.boot.settings.RATE_80 || 80, sum = Logic.headRows('สรุปตรวจแพทย์ SMC 80/20 · ' + d.round.name, d), ppl = Logic.headRows('รายชื่อแพทย์ SMC ทุกชุดตรวจ · ' + d.round.name, d);
    sum.push(['กลุ่ม', 'เดือนงาน', 'เอกสาร ' + rate + '%', 'เอกสาร ' + (100 - rate) + '%', 'จำนวนแพทย์', 'ยอดเต็ม', rate + '%', (100 - rate) + '%', 'ผลตรวจ', 'ติดธง', 'บันทึกโดย/เมื่อ'].map(function (h) { return { v: h, s: 'head' }; }));
    ppl.push(['กลุ่ม', 'เอกสาร ' + rate + '%', 'ลำดับ', 'รหัสประจำตัว', 'ชื่อ-นามสกุล', 'สถานะพนักงาน', 'ยอดเต็ม', rate + '%', (100 - rate) + '%'].map(function (h) { return { v: h, s: 'head' }; }));
    pairs.forEach(function (p) {
      var b = p.batch, ok = P.recheck(p);
      sum.push([b.title || p.g.name, b.workMonth || '', String(b.docs80 || '').replace(/,/g, ', '), String(b.docs20 || '').replace(/,/g, ', '), { v: (b.lines || []).length, s: 'int' }, R.money(b.total), R.money(b.sum80), R.money(b.sum20), { v: ok.ok ? 'ตรงกัน' : (ok.why || 'ไม่ตรง'), s: ok.ok ? 'text' : 'bad' }, { v: +b.flags || 0, s: 'int' }, (b.by || '') + ' ' + thDateTime(b.at)]);
      (b.lines || []).forEach(function (l, i) { ppl.push([b.title || p.g.name, String(b.docs80 || '').replace(/,/g, ', '), { v: i + 1, s: 'int' }, l.empCode, l.fullName || '', { v: l.status || '', s: l.working === false ? 'bad' : 'text' }, R.money(l.amount), R.money(l.a), R.money(l.b)]); });
    });
    XLSX.download(XLSX.book([{ name: 'สรุปรายเอกสาร', rows: sum, cols: [30, 12, 22, 22, 11, 16, 16, 16, 14, 8, 26], merges: ['A1:K1', 'A2:K2', 'A3:K3'], freeze: 5 },
      { name: 'รายชื่อแพทย์', rows: ppl, cols: [30, 22, 7, 13, 32, 18, 15, 15, 15], merges: ['A1:I1', 'A2:I2', 'A3:I3'], freeze: 5 }]), 'PayPop_SMC_ทั้งรอบ_' + d.round.id + '_' + nowStamp() + '.xlsx');
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
    var ck = keyFor('ded:' + rid), hit = lsGet(ck);
    if (hit) { P.cache = { roundId: rid, res: hit, rows: hit.rows.map(function (r) { return Object.assign({}, r); }) }; P.draw(); }
    api('getDeductions', { roundId: rid }).then(function (res) { if (S.roundId !== rid || S.dirty === 'deduct') return; lsSet(ck, res); P.cache = { roundId: rid, res: res, rows: res.rows.map(function (r) { return Object.assign({}, r); }) }; P.draw(); }, function (e) { loadErr($('#ddBody'), e, function () { P.render(el); }); });
  },
  sums: function (rows) {
    var out = rows.map(function () { return null; });
    rows.forEach(function (r, i) { if (r.kind !== 'sum') return; var n = +r.n || 0, s = 0, j = i - 1, c = 0; while (j >= 0 && c < n) { if (rows[j].kind === 'item') { s += +rows[j].amount || 0; c++; } else if (rows[j].kind === 'sum') break; j--; } out[i] = R.r2(s); });
    return out;
  },
  draw: function () {
    if (!$('#ddBody')) return;   // ผู้ใช้ไปหน้าอื่นแล้วระหว่างรอ Google
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
      api('saveDeductions', { roundId: S.roundId, rows: rows, asTemplate: $('#ddTpl').checked }).then(function (res) { S.dirty = null; lsSet(keyFor('ded:' + S.roundId), res); P.cache = { roundId: S.roundId, res: res, rows: res.rows.map(function (r) { return Object.assign({}, r); }) }; toast('บันทึกรายการเงินหักแล้ว', 'ok'); P.draw(); }, function (e) { b.classList.remove('loading'); fail(e); });
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

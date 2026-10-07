/**
 * pages-home.js — หน้าแรก (Dashboard) · รอบการจ่าย · กราฟ SVG
 */
var Chart = {
  spark: function (vals, color) {
    vals = vals.filter(function (v) { return v != null; });
    if (vals.length < 2) return '<svg class="spark" viewBox="0 0 120 34"></svg>';
    var mx = Math.max.apply(null, vals), mn = Math.min.apply(null, vals), rg = mx - mn || 1, w = 120, h = 30;
    var pts = vals.map(function (v, i) { return [(i / (vals.length - 1)) * w, 2 + h - ((v - mn) / rg) * (h - 4)]; });
    var d = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
    var last = pts[pts.length - 1];
    return '<svg class="spark" viewBox="0 0 120 34" preserveAspectRatio="none" aria-hidden="true"><path d="' + d + ' L120 34 L0 34 Z" fill="' + color + '" opacity=".13"/><path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/><circle cx="' + last[0] + '" cy="' + last[1] + '" r="3" fill="' + color + '"/></svg>';
  },
  donut: function (parts, size, center) {
    size = size || 150; var r = 54, c = 2 * Math.PI * r, tot = parts.reduce(function (s, p) { return s + p.v; }, 0) || 1, off = 0;
    var segs = parts.map(function (p) { var len = p.v / tot * c, s = '<circle r="' + r + '" cx="70" cy="70" fill="none" stroke="' + p.color + '" stroke-width="18" stroke-dasharray="' + len.toFixed(2) + ' ' + (c - len).toFixed(2) + '" stroke-dashoffset="' + (-off).toFixed(2) + '" transform="rotate(-90 70 70)"><title>' + esc(p.label) + ' ' + p.v + '</title></circle>'; off += len; return s; }).join('');
    return '<svg class="donut" viewBox="0 0 140 140" width="' + size + '" height="' + size + '" role="img" aria-label="สัดส่วนสถานะเอกสาร"><circle r="' + r + '" cx="70" cy="70" fill="none" stroke="var(--surface-3)" stroke-width="18"/>' + segs +
      '<text x="70" y="66" text-anchor="middle" style="font-family:var(--f-display);font-size:24px;fill:var(--ink)">' + (center ? center[0] : '') + '</text><text x="70" y="86" text-anchor="middle" style="font-size:11px;fill:var(--muted)">' + (center ? center[1] : '') + '</text></svg>';
  },
  stacked: function (data, cats) {
    if (!data.length) return '<div class="empty small">ยังไม่มีข้อมูลรอบก่อนหน้า นำเข้าข้อมูลย้อนหลังได้ที่หน้าตั้งค่า</div>';
    var W = 760, H = 250, pl = 54, pb = 26, pt = 10, bw = Math.min(40, (W - pl - 10) / data.length * .62);
    var mx = Math.max.apply(null, data.map(function (r) { return r.total + r.est; })) || 1, step = Math.pow(10, Math.floor(Math.log10(mx)));
    var top = Math.ceil(mx / step) * step; if (top / step > 6) step *= 2; top = Math.ceil(mx / step) * step;
    var y = function (v) { return pt + (H - pt - pb) * (1 - v / top); };
    var g = '';
    for (var v = 0; v <= top + 1; v += step) g += '<line x1="' + pl + '" x2="' + W + '" y1="' + y(v).toFixed(1) + '" y2="' + y(v).toFixed(1) + '"/><text x="' + (pl - 8) + '" y="' + (y(v) + 4).toFixed(1) + '" text-anchor="end">' + fmtM(v).replace(' ล้าน', 'M') + '</text>';
    var bars = data.map(function (r, i) {
      var x = pl + 10 + i * ((W - pl - 10) / data.length) + ((W - pl - 10) / data.length - bw) / 2, acc = 0, s = '';
      cats.concat([{ code: '', color: '#94a3b8', name: 'อื่น ๆ' }]).forEach(function (c) {
        var val = r.byCat[c.code] || 0; if (!val) return;
        var y1 = y(acc + val), y0 = y(acc); acc += val;
        s += '<rect class="bar" x="' + x.toFixed(1) + '" y="' + y1.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(0, y0 - y1).toFixed(1) + '" fill="' + c.color + '" style="animation-delay:' + (i * 30) + 'ms"><title>' + esc(r.name + ' · ' + c.name + ' ' + fmt(val)) + '</title></rect>';
      });
      if (r.est) { var y1 = y(acc + r.est), y0 = y(acc); s += '<rect class="bar" x="' + x.toFixed(1) + '" y="' + y1.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(0, y0 - y1).toFixed(1) + '" fill="url(#hatch)" style="animation-delay:' + (i * 30) + 'ms"><title>' + esc(r.name + ' · ประมาณการ ' + fmt(r.est)) + '</title></rect>'; }
      return s + '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle"' + (r.live ? ' style="fill:var(--pri-ink);font-weight:700"' : '') + '>' + esc(r.name) + '</text>';
    }).join('');
    return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="ยอดรายหมวดย้อนหลัง"><defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="var(--sun-soft)"/><line x1="0" y1="0" x2="0" y2="6" stroke="var(--warn)" stroke-width="2.4"/></pattern></defs><g class="grid">' + g + '</g>' + bars + '</svg>' +
      '<div class="legend">' + cats.map(function (c) { return '<span><i style="background:' + c.color + '"></i>' + esc(c.name) + '</span>'; }).join('') + '<span><i style="background:repeating-linear-gradient(45deg,var(--warn) 0 2px,var(--sun-soft) 2px 5px)"></i>ประมาณการ</span></div>';
  }
};

Pages.home = {
  render: function (el) {
    var d = S.data, me = S.boot.me, first = (me.fullName || '').replace(/^(นาย|นางสาว|นาง)\s*/, '').split(' ')[0];
    var hour = new Date().getHours(), hi = hour < 12 ? 'อรุณสวัสดิ์' : hour < 17 ? 'สวัสดีตอนบ่าย' : 'สวัสดีตอนเย็น';
    if (!roundsList().length) {
      el.innerHTML = pageHead('home', hi + ' คุณ' + first, 'เริ่มต้นใช้งาน PayPop ใน 3 ขั้นตอน') +
        '<div class="grid g2 stagger"><div class="card"><div class="card-h"><h2>' + icon('spark') + 'เริ่มต้นใช้งาน</h2></div><div class="steps">' +
        '<div><div><b>นำเข้าข้อมูลย้อนหลัง</b> (ถ้ามี) ที่ <a href="#/settings?tab=history">ตั้งค่า › ข้อมูลย้อนหลัง</a> ใช้ไฟล์ paypop_ข้อมูลตั้งต้น.json เพื่อให้มีตารางรายการรายได้ หมวด และกราฟย้อนหลัง</div></div>' +
        '<div><div><b>สร้างรอบการจ่าย</b> ที่ <a href="#/rounds">รอบการจ่าย</a> เช่น รอบจ่าย ต.ค. 69</div></div>' +
        '<div><div><b>วางข้อมูลจาก HRMi</b> ที่ <a href="#/import">นำเข้าจาก HRMi</a> แล้วดูเช็กลิสต์ความครบ</div></div></div></div>' +
        '<div class="card empty">' + mascot(130) + '<h3>สวัสดี! ฉันชื่อน้องป๊อป</h3><p>จะช่วยจัดหมวด เช็กว่าครบไหม และสรุปยอดเตรียมเงินให้ทุกเดือนนะ</p><a class="btn pri" href="#/rounds">' + icon('plus') + 'สร้างรอบแรก</a></div></div>';
      return;
    }
    if (!d || d.round.id !== S.roundId) {
      el.innerHTML = pageHead('home', hi + ' คุณ' + first, S.roundErr ? 'โหลดข้อมูลรอบไม่สำเร็จ' : 'กำลังโหลดข้อมูลรอบ…') + (S.roundErr ? roundWait() : '<div class="grid g4">' + [1, 2, 3, 4].map(function () { return '<div class="card"><div class="sk" style="height:16px;width:50%"></div><div class="sk mt8" style="height:34px"></div></div>'; }).join('') + '</div>');
      return;
    }
    var docs = Logic.liveDocs(d), gate = Logic.gate(d), cl = gate.checklist, sum = Logic.catSummary(d), st = R.roundStats(docs, d.estimates, S.items);
    var tot = { inc: 0, pend: 0, appr: 0, est: 0, ded: 0 };
    Object.keys(st).forEach(function (k) { tot.inc += st[k].income; tot.pend += st[k].pending; tot.appr += st[k].approved; tot.est += st[k].est; tot.ded += st[k].deduct; });
    var hs = {}; docs.forEach(function (x) { hs[x.hrStatus || ''] = (hs[x.hrStatus || ''] || 0) + 1; });
    var approvedPct = docs.length ? Math.round((hs.APPROVED || 0) / docs.length * 100) : 0;
    var last = (d.imports || [])[0], open = d.round.status === 'OPEN';
    var todo = gate.issues.filter(function (x) { return x.n; });
    if (cl.anomaly) todo.push({ n: cl.anomaly, tone: 'vio', icon: 'pulse', title: 'ยอดผิดปกติเทียบค่าเฉลี่ย', desc: 'ต่างจากค่าเฉลี่ยเกิน ±' + (S.boot.settings.ANOMALY_PCT || 30) + '% ลองตรวจดู', href: '#/checklist?f=ANOM' });
    var nDup = docs.filter(function (x) { return (d.dups || {})[x.docNo]; }).length;
    if (open && nDup) todo.push({ n: nDup, tone: 'vio', icon: 'flag', title: 'เอกสารเดือนงานซ้ำกับรอบก่อน', desc: 'ชื่อรายได้ ฝ่าย และเดือนงานเดียวกับที่เคยส่งมาแล้ว ตรวจรายชื่อข้างในว่าไม่ซ้ำ', href: '#/docs?st=_dup' });
    if (open && gate.notApproved) todo.push({ n: gate.notApproved, tone: 'info', icon: 'docs', title: 'เอกสารที่ยังไม่อนุมัติ (สถานะ HR)', desc: 'รอเอกสาร / กำลังดำเนินการ / ส่งคืนแก้ไข', href: '#/docs?st=_notok' });
    var toneCls = { bad: 't-bad', warn: 't-sun', vio: 't-vio', info: 't-info' };
    el.innerHTML = pageHead('home', hi + ' คุณ' + first, d.round.name + ' · ' + (open ? 'รอบที่เปิดอยู่' : 'ปิดรอบแล้ว ' + thDateTime(d.round.closedAt))) +
      '<div class="grid stagger">' +
      '<section class="hero"><div><h2>' + (open ? (todo.length ? 'วันนี้มี ' + todo.length + ' เรื่องให้ดูนะ' : 'ทุกอย่างเรียบร้อย พร้อมปิดรอบ!') : 'สรุป ' + esc(d.round.name)) + '</h2>' +
      '<p>' + (last ? 'นำเข้าล่าสุด ' + thDateTime(last.at) + ' โดย ' + esc(userName(last.by)) + ' (' + esc(last.view || last.source) + ')' : 'ยังไม่ได้วางข้อมูลจาก HRMi ในรอบนี้') + '</p>' +
      '<div class="chips"><span class="chip">' + icon('docs') + docs.length + ' เอกสาร</span><span class="chip">' + icon('ok') + 'อนุมัติแล้ว ' + approvedPct + '%</span><span class="chip">' + icon('check') + 'เช็กลิสต์ค้าง ' + cl.missing + '</span></div>' +
      (open ? '<div class="chips"><a class="btn" href="#/import" style="background:#fff;color:#c2194a;border:0">' + icon('paste') + 'วางข้อมูล HRMi</a><a class="btn" href="#/report" style="background:rgba(255,255,255,.2);color:#fff;border-color:rgba(255,255,255,.5)">' + icon('dl') + 'Export ยอดเตรียมเงิน</a></div>' : '') +
      '</div>' + mascot(118, todo.length ? 'think' : 'happy') + '</section>' +
      '<div class="grid g4 stagger kpis">' +
      kpi('ยอดรายได้ใน HRMi', tot.inc, 'รออนุมัติ ' + fmtM(tot.pend) + ' · อนุมัติ ' + fmtM(tot.appr), 'db', 't-vio', 'รวมคอลัมน์ "รวมรายได้ทั้งหมด" ของเอกสารทุกใบในรอบนี้') +
      kpi('ประมาณการยังไม่คีย์', tot.est, (d.estimates || []).length + ' รายการ', 'wallet', 't-sun', 'ยอดที่ประมาณไว้ก่อน เพราะหน่วยงานยังไม่คีย์เข้า HRMi (หักส่วนที่ตัดแล้ว)') +
      kpi('รวมเตรียมเงิน', tot.inc + tot.est, 'HRMi + ประมาณการ', 'calc', 't-pri', 'ยอดที่ใช้ส่งประมาณการเตรียมเงินกับธนาคาร = ยอด HRMi + ประมาณการ') +
      kpi('รายการหัก', tot.ded, 'รวมรายหักทั้งหมด', 'minus', 't-sec', 'รวมคอลัมน์ "รวมรายหักทั้งหมด" (เช่น เรียกคืนเงิน)') + '</div>' +
      '<div class="grid g3"><div class="card span2"><div class="card-h"><h2>' + icon('flag') + 'สิ่งที่ต้องทำ</h2><span class="grow"></span>' + (open ? '<a class="btn sm" href="#/close">' + icon('lockr') + 'ไปหน้าปิดรอบ</a>' : '') + '</div>' +
      (todo.length ? '<div class="todo">' + todo.map(function (t) { return '<a class="todo-i" href="' + t.href + '"><span class="ico ' + toneCls[t.tone] + '">' + icon(t.icon) + '</span><span class="tx"><b>' + esc(t.title) + '</b><span>' + esc(t.desc) + '</span></span><span class="n">' + t.n + '</span>' + icon('right') + '</a>'; }).join('') + '</div>'
        : '<div class="empty">' + mascot(90) + '<h3>ไม่มีเรื่องค้าง</h3><p>เยี่ยมมาก ทุกรายการครบและเรียบร้อย</p></div>') + '</div>' +
      '<div class="card"><div class="card-h"><h2>' + icon('docs') + 'สถานะเอกสาร (HR)</h2>' + q('สถานะงานของ HR: รอเอกสาร → กำลังดำเนินการ → (ส่งคืนแก้ไข) → อนุมัติ') + '</div><div class="row" style="justify-content:center">' +
      Chart.donut(R.HR_STATUS.map(function (s) { return { label: s.name, v: hs[s.code] || 0, color: { WAIT: 'var(--sun)', PROC: 'var(--info)', RETURN: 'var(--bad)', APPROVED: 'var(--ok)' }[s.code] }; }), 150, [approvedPct + '%', 'อนุมัติแล้ว']) + '</div>' +
      '<div class="grid" style="gap:6px;margin-top:8px">' + R.HR_STATUS.map(function (s) { return '<a class="row" style="text-decoration:none;color:inherit" href="#/docs?st=' + s.code + '">' + stPill(s.code) + '<span class="grow"></span><b class="num">' + (hs[s.code] || 0) + '</b></a>'; }).join('') + '</div></div></div>' +
      '<div><div class="card-h"><h2>' + icon('tag') + 'ยอดรายหมวด</h2>' + q('เทียบกับรอบก่อนหน้า · กราฟเส้นคือยอด ' + (S.boot.settings.AVG_ROUNDS || 6) + ' รอบล่าสุด') + '<span class="grow"></span><a class="btn sm ghost" href="#/checklist">' + icon('check') + 'ดูเช็กลิสต์</a></div>' +
      '<div class="grid g4 stagger">' + sum.map(function (r) {
        var p = pct(r.x.income, r.prev), g = cl.byCat[r.cat.code];
        return '<button class="cat-card" style="--c:' + esc(r.cat.color) + '" data-cat="' + esc(r.cat.code) + '"><span class="stripe"></span><span class="top"><span class="dot">' + icon(r.cat.icon || 'tag') + '</span><span class="nm">' + esc(r.cat.name) + '</span>' +
          (g && g.missing ? '<span class="badge" data-tip="รายการประจำที่ยังไม่มา">' + g.missing + '</span>' : '') + '</span><span class="amt num" data-count="' + (r.x.docs || !r.x.est ? r.x.income : r.x.est) + '" data-money>' + fmt(r.x.docs || !r.x.est ? r.x.income : r.x.est) + '</span>' +
          Chart.spark(r.spark, r.cat.color) + '<span class="meta"><span>' + r.x.docs + ' เอกสาร' + (r.x.est ? ' · +ประมาณ ' + fmtM(r.x.est) : '') + '</span><span class="' + (p > 0 ? 'up' : p < 0 ? 'down' : '') + '" data-tip="เทียบรอบก่อน ' + (r.prev != null ? fmt(r.prev) : '—') + '">' + fmtPct(p) + '</span></span></button>';
      }).join('') + '</div></div>' +
      '<div class="card"><div class="card-h"><h2>' + icon('chart') + 'แนวโน้ม 12 รอบ</h2>' + q('ยอดรายได้ใน HRMi แยกหมวด แท่งลายคือประมาณการที่ยังไม่คีย์') + '</div>' + Chart.stacked(Logic.trend(d, 12), activeCats()) + '</div>' +
      '</div>';
    countUp(el);
    $$('[data-cat]', el).forEach(function (b) { b.onclick = function () { location.hash = '#/docs?cat=' + encodeURIComponent(b.getAttribute('data-cat') || '_none'); }; });
    function kpi(label, v, sub, ic, tone, tip) {
      return '<div class="card kpi"><span class="ico ' + tone + '">' + icon(ic) + '</span><div class="kpi-l">' + esc(label) + q(tip) + '</div><div class="kpi-v num" data-count="' + v + '" data-money>' + fmt(v) + '</div><div class="kpi-s">' + esc(sub) + '</div></div>';
    }
  }
};

Pages.rounds = {
  render: function (el) {
    var list = roundsList().slice().reverse();
    el.innerHTML = pageHead('rounds', 'รอบการจ่าย', 'รอบเป็นของที่ HR กำหนดเอง · เปิดได้หลายรอบพร้อมกัน · ปิดรอบแล้วข้อมูลจะถูกล็อกและเก็บลงคลัง', '<button class="btn pri" id="newRound">' + icon('plus') + 'สร้างรอบใหม่</button>') +
      (list.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>รอบ</th><th>สถานะ</th><th class="n">เอกสาร</th><th class="n">ยอด HRMi</th><th class="n">ประมาณการ</th><th class="hide-sm">สร้าง / ปิด</th><th></th></tr></thead><tbody>' +
        list.map(function (r) {
          return '<tr><td class="nowrap"><b>' + esc(r.name) + '</b><div class="t2">' + (r.source === 'HISTORY' ? 'นำเข้าจาก Excel เดิม' : esc(r.id)) + '</div></td><td>' + (r.status === 'OPEN' ? '<span class="pill st-APPROVED">เปิดอยู่</span>' : '<span class="pill st-NONE">ปิดแล้ว</span>') + '</td>' +
            '<td class="n">' + fmt0(r.docCount) + '</td><td class="n">' + fmt(r.income) + '</td><td class="n">' + fmt(r.est) + '</td>' +
            '<td class="hide-sm t2 nowrap">' + (r.createdAt ? 'สร้าง ' + thDateTime(r.createdAt) : '') + (r.closedAt ? '<br>ปิด ' + thDateTime(r.closedAt) + ' ' + esc(userName(r.closedBy)) : '') + (r.closeNote ? '<br><span data-tip="' + esc(r.closeNote) + '">' + icon('info') + ' หมายเหตุ</span>' : '') + '</td>' +
            '<td class="n"><div class="row end" style="gap:6px;flex-wrap:nowrap"><button class="btn sm" data-view="' + r.id + '">' + icon('eye') + 'ดู</button>' +
            (r.status === 'OPEN' ? '<a class="btn sm" href="#/close" data-pick="' + r.id + '">' + icon('lockr') + 'ปิดรอบ</a>' : '<button class="btn sm" data-reopen="' + r.id + '">' + icon('unlock') + 'เปิดอีกครั้ง</button>') +
            '<button class="btn sm ghost icon" data-del="' + r.id + '" data-tip="ลบรอบนี้" aria-label="ลบ">' + icon('trash') + '</button></div></td></tr>';
        }).join('') + '</tbody></table></div>' : '<div class="card empty">' + mascot(110, 'think') + '<h3>ยังไม่มีรอบการจ่าย</h3><p>กด "สร้างรอบใหม่" เพื่อเริ่มต้น หรือนำเข้าข้อมูลย้อนหลังจาก Excel เดิมที่หน้าตั้งค่า</p></div>');
    $('#newRound').onclick = Pages.rounds.create;
    $$('[data-view]', el).forEach(function (b) { b.onclick = function () { App.selectRound(b.getAttribute('data-view')); location.hash = '#/home'; }; });
    $$('[data-pick]', el).forEach(function (b) { b.onclick = function () { if (S.roundId !== b.getAttribute('data-pick')) App.selectRound(b.getAttribute('data-pick')); }; });
    $$('[data-reopen]', el).forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute('data-reopen'), r = roundsList().filter(function (x) { return x.id === id; })[0];
        askPassword('เปิด ' + r.name + ' อีกครั้ง', 'เอกสารจะกลับมาแก้ไขได้ และสถิติของรอบนี้จะถูกคำนวณใหม่ตอนปิดรอบครั้งถัดไป ระบบจะบันทึกประวัติไว้', '<div class="field"><label for="pw-extra">เหตุผล (ไม่บังคับ)</label><input id="pw-extra" class="inp"></div>').then(function (x) {
          if (!x) return;
          api('reopenRound', { id: id, password: x.password, reason: x.extra }).then(function (res) { setRounds(res.rounds); S.boot.stats = res.stats; S.roundId = id; lsSet(keyFor('round'), id); applyRound(res.data); toast('เปิด ' + r.name + ' อีกครั้งแล้ว', 'ok'); refreshPage(); }, fail);
        });
      };
    });
    $$('[data-del]', el).forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute('data-del'), r = roundsList().filter(function (x) { return x.id === id; })[0];
        askPassword('ลบ ' + r.name, '<b style="color:var(--bad)">ลบถาวร</b> เอกสาร ' + fmt0(r.docCount) + ' ใบ ประมาณการ เช็กลิสต์ และชุดตรวจ SMC ของรอบนี้จะหายทั้งหมด (ข้อมูลใน HRMi ไม่กระทบ)').then(function (x) {
          if (!x) return;
          api('deleteRound', { id: id, password: x.password }).then(function (res) {
            setRounds(res.rounds); S.boot.stats = res.stats; lsDel(keyFor('round:' + id));
            if (S.roundId === id) { S.roundId = pickDefaultRound(); S.data = null; if (S.roundId) loadRound(S.roundId, function () { updateBadges(); }); }
            updateRoundPick(); toast('ลบ ' + r.name + ' แล้ว', 'ok'); refreshPage();
          }, fail);
        });
      };
    });
  },
  create: function () {
    var list = roundsList(), lastId = list.length ? list[list.length - 1].id : null, d = new Date();
    var def = lastId ? R.ymAdd(lastId, 1) : (d.getFullYear() + 543) + '-' + R.pad(d.getMonth() + 1);
    var yy = +def.slice(0, 4), mm = +def.slice(5, 7), years = [yy - 1, yy, yy + 1];
    modal({ title: 'สร้างรอบการจ่ายใหม่', icon: 'cal', body:
      '<p class="muted" style="margin:0">เลือกเดือนที่จ่ายเงิน (ไม่ใช่เดือนที่ปฏิบัติงาน) เช่น รอบจ่าย ต.ค. 69 มักเป็นงานของเดือน ก.ย. 69</p>' +
      '<div class="row"><div class="field grow"><label for="nr-m">เดือน</label><select id="nr-m" class="inp">' + R.MTH_L.map(function (m, i) { return '<option value="' + (i + 1) + '"' + (i + 1 === mm ? ' selected' : '') + '>' + m + '</option>'; }).join('') + '</select></div>' +
      '<div class="field" style="width:130px"><label for="nr-y">ปี พ.ศ.</label><select id="nr-y" class="inp">' + years.map(function (y) { return '<option' + (y === yy ? ' selected' : '') + '>' + y + '</option>'; }).join('') + '</select></div></div>' +
      '<label class="check"><input type="checkbox" id="nr-est" checked> ยกรายการประมาณการจากรอบก่อนมาด้วย ' + q('คัดลอกรายการ "ยังไม่คีย์ในระบบ" ของรอบล่าสุดมาเป็นร่าง ปรับยอดได้ภายหลัง') + '</label>',
      actions: [{ label: 'ยกเลิก', cls: 'ghost', value: null }, { label: 'สร้างรอบ', cls: 'pri', icon: 'plus', click: function (ov) {
        var ym = $('#nr-y', ov).value + '-' + R.pad($('#nr-m', ov).value);
        return api('createRound', { ym: ym, copyEst: $('#nr-est', ov).checked }).then(function (res) {
          setRounds(res.rounds); toast('สร้าง ' + res.round.name + ' แล้ว' + (res.copied ? ' (ยกประมาณการมา ' + res.copied + ' รายการ)' : ''), 'ok'); confetti();
          App.selectRound(res.round.id); location.hash = '#/import';
        });
      } }] });
  }
};

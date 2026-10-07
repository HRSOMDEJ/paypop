/**
 * pages-docs.js — เอกสารรอบนี้ (สถานะ HR · หมวด · ฝ่าย · ชื่อไฟล์ Scan) และ เช็กลิสต์ความครบ
 * แก้หลายรายการแล้วกด "บันทึก" ครั้งเดียว
 */
function qs(h) { var o = {}; (String(h || '').split('?')[1] || '').split('&').forEach(function (p) { if (!p) return; var kv = p.split('='); o[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || ''); }); return o; }

var DOC_COLS = [['date', 'วันที่เอกสาร'], ['detail', 'รายละเอียด / ชื่องาน'], ['div', 'ฝ่าย'], ['hrmi', 'สถานะ HRMi'], ['hr', 'สถานะ HR'], ['cat', 'หมวด'], ['scan', 'ชื่อไฟล์ Scan']];
Pages.docs = {
  pend: {}, sel: {},
  cols: function () { var c = lsGet('pp:docs:cols'); if (!c) { c = {}; DOC_COLS.forEach(function (x) { c[x[0]] = 1; }); } return c; },
  render: function (el, hash) {
    var P = Pages.docs, d = S.data, par = qs(hash);
    el.innerHTML = pageHead('docs', 'เอกสารรอบนี้', 'ติดตามสถานะรายเอกสาร ย้ายหมวด แก้ฝ่าย และคัดลอกชื่อไฟล์ Scan', '<button class="btn" id="dxExport">' + icon('dl') + 'Excel ตามตัวกรอง</button>');
    if (!S.roundId) { el.innerHTML += noRound(); return; }
    if (!d) { el.innerHTML += roundWait(); return; }
    if (P.round !== d.round.id) { P.pend = {}; P.sel = {}; P.round = d.round.id; }
    P.f = P.f || {};
    if (par.cat != null) P.f.cat = par.cat; if (par.st != null) P.f.st = par.st; if (par.q != null) P.f.q = par.q;
    if (par.cat == null && par.st == null && !P.keep) { P.f = { cat: P.f.cat || '', st: '', q: '' }; }
    var open = d.round.status === 'OPEN', all = (d.docs || []).filter(function (x) { return x.flag !== 'MOVED'; });
    var dups = d.dups || {}, nDup = all.filter(function (x) { return dups[x.docNo] && x.flag !== 'REMOVED'; }).length;
    var cnt = {}; all.forEach(function (x) { if (x.flag !== 'REMOVED') cnt[x.category || '_none'] = (cnt[x.category || '_none'] || 0) + 1; });
    el.innerHTML += lockedNote() +
      '<div class="card mb12"><div class="fbar"><div class="search">' + icon('search') + '<input id="dxQ" class="inp" placeholder="ค้นหาเลขที่ ชื่อรายได้ รายละเอียด ฝ่าย…" value="' + esc(P.f.q || '') + '"></div>' +
      '<select id="dxHm" class="inp" style="width:auto"><option value="">สถานะ HRMi ทั้งหมด</option><option>รออนุมัติ</option><option>อนุมัติ</option><option value="_other">สถานะอื่น</option></select>' +
      (cnt._none && open ? '<button class="btn sm" id="dxCat">' + icon('tag') + 'จัดหมวดรายการใหม่ <span class="badge">' + cnt._none + '</span></button>' : '') +
      '<button class="btn sm" id="dxCols" data-tip="เลือกคอลัมน์ที่จะแสดง (จำไว้ในเครื่องนี้)">' + icon('grid') + 'คอลัมน์</button></div>' +
      '<div class="chips mt12" id="dxCats"><button class="chip" data-c="">ทุกหมวด <span class="n">' + all.filter(function (x) { return x.flag !== 'REMOVED'; }).length + '</span></button>' +
      activeCats().map(function (c) { return '<button class="chip" data-c="' + esc(c.code) + '" style="--c:' + esc(c.color) + '"><span class="c"></span>' + esc(c.name) + ' <span class="n">' + (cnt[c.code] || 0) + '</span></button>'; }).join('') +
      (cnt._none ? '<button class="chip" data-c="_none" style="--c:#94a3b8"><span class="c"></span>ยังไม่จัดหมวด <span class="n">' + cnt._none + '</span></button>' : '') + '</div>' +
      '<div class="seg mt12" id="dxSt"><button data-s="">ทุกสถานะ</button>' + R.HR_STATUS.map(function (s) { return '<button data-s="' + s.code + '">' + esc(s.name) + '</button>'; }).join('') + '<button data-s="_notok">ยังไม่อนุมัติ</button>' + (nDup ? '<button data-s="_dup">⚑ เดือนงานซ้ำ ' + nDup + '</button>' : '') + '<button data-s="_removed">ถูกลบจาก HRMi</button></div></div>' +
      '<div id="dxTable"></div><div id="dxBulk"></div>';
    $('#dxHm').value = P.f.hm || '';
    var draw = function () {
      $$('#dxCats [data-c]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-c') === (P.f.cat || '')); });
      $$('#dxSt [data-s]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-s') === (P.f.st || '')); });
      var list = P.filtered(all), fn = Logic.fileNames(all.filter(function (x) { return x.flag !== 'REMOVED'; }));
      P.list = list; P.fn = fn;
      var tot = R.sum(list, 'income'), C = P.cols();
      $('#dxTable').innerHTML = list.length ? '<div class="tbl-wrap tall"><table class="tbl"><thead><tr>' + (open ? '<th class="c"><input type="checkbox" id="dxAll" aria-label="เลือกทั้งหมด"></th>' : '') +
        '<th>เลขที่เอกสาร</th><th>ชื่อรายได้' + (C.detail ? ' / รายละเอียด' : '') + '</th>' + (C.div ? '<th class="hide-sm">ฝ่าย ' + q('อ่านจากคอลัมน์ฝ่ายของ HRMi กดดินสอเพื่อแก้ (เช่น หน่วยงานกรอกผิด)') + '</th>' : '') + '<th class="n">รวมรายได้</th>' + (C.hrmi ? '<th>HRMi</th>' : '') + (C.hr ? '<th>สถานะ HR</th>' : '') + (C.cat ? '<th>หมวด</th>' : '') + (C.scan ? '<th class="c">Scan ' + q('ชื่อไฟล์ Scan อัตโนมัติ: เลข 4 ตัวท้าย + ชื่อรายได้ (ตัดอักขระที่ HRMi ไม่รับ) กดเพื่อคัดลอก') + '</th>' : '') + '<th></th></tr></thead><tbody>' +
        list.map(function (x) {
          var p = P.pend[x.docNo] || {}, hs = p.hrStatus != null ? p.hrStatus : x.hrStatus, cat = p.category != null ? p.category : x.category, div = p.div != null ? p.div : (x.divFix || x.div);
          var dirty = Object.keys(p).length > 0;
          return '<tr class="' + (P.sel[x.docNo] ? 'sel ' : '') + (dirty ? 'dirty ' : '') + (x.flag === 'REMOVED' ? 'removed' : '') + '" data-doc="' + esc(x.docNo) + '">' + (open ? '<td class="c"><input type="checkbox" data-sel="' + esc(x.docNo) + '"' + (P.sel[x.docNo] ? ' checked' : '') + ' aria-label="เลือก"></td>' : '') +
            '<td class="nowrap"><span class="mono copyable" data-copy="' + esc(x.docNo) + '" data-tip="คลิกเพื่อคัดลอก">' + esc(x.docNo) + '</span>' + (C.date ? '<div class="t2">' + esc(x.docDate || '') + '</div>' : '') + '</td>' +
            '<td style="min-width:220px"><div class="t1">' + esc(x.incomeName) + '</div>' + (C.detail ? '<div class="t2">' + esc([x.remark, x.jobName].filter(Boolean).join(' · ')) + '</div>' : '') + (x.hrNote ? '<div class="t2" style="color:var(--pri-ink)">' + icon('edit') + ' ' + esc(x.hrNote) + '</div>' : '') + (x.flag === 'REMOVED' ? '<span class="pill st-REMOVED">ถูกลบจาก HRMi</span>' : '') +
              (dups[x.docNo] ? ' <span class="pill st-DUP nodot" data-tip="' + esc('เดือนงานเดียวกันเคยส่งมาแล้ว: ' + dups[x.docNo].map(function (h) { return R.roundName(h[0]) + ' ' + h[1] + ' (' + fmt(h[2]) + ' บาท)'; }).join(' · ') + ' — ตรวจรายชื่อข้างในว่าไม่ซ้ำ') + '">⚑ เดือนงานซ้ำ</span>' : '') + '</td>' +
            (C.div ? '<td class="hide-sm small" style="min-width:140px">' + esc(R.divShort(div)) + (x.divFix || p.div != null ? ' <span class="pill st-PROC nodot">แก้แล้ว</span>' : '') + (open ? ' <button class="btn xs ghost" data-div="' + esc(x.docNo) + '" aria-label="แก้ฝ่าย">' + icon('edit') + '</button>' : '') + '</td>' : '') +
            '<td class="n num">' + fmt(x.income) + (+x.deduct ? '<div class="t2" style="color:var(--bad)">หัก ' + fmt(x.deduct) + '</div>' : '') + '</td>' + (C.hrmi ? '<td>' + hmPill(x.hrmiStatus) + '</td>' : '') +
            (C.hr ? '<td>' + (open ? '<button class="btn xs ghost" data-st="' + esc(x.docNo) + '" style="padding:0">' + stPill(hs) + '</button>' : stPill(hs)) + '</td>' : '') +
            (C.cat ? '<td>' + (open ? '<button class="btn xs ghost" data-cat="' + esc(x.docNo) + '" style="padding:0">' + catChip(cat) + '</button>' : catChip(cat)) + '</td>' : '') +
            (C.scan ? '<td class="c"><button class="btn xs" data-fn="' + esc(x.docNo) + '" data-tip="' + esc(fn[x.docNo] || '') + '">' + icon('copy') + '</button></td>' : '') +
            '<td><button class="btn xs ghost" data-open="' + esc(x.docNo) + '" aria-label="รายละเอียด" data-tip="รายละเอียด / ประวัติ">' + icon('right') + '</button></td></tr>';
        }).join('') + '</tbody><tfoot><tr><td colspan="' + ((open ? 3 : 2) + (C.div ? 1 : 0)) + '">' + fmt0(list.length) + ' เอกสาร</td><td class="n">' + fmt(tot) + '</td><td colspan="' + (1 + ['hrmi', 'hr', 'cat', 'scan'].filter(function (k) { return C[k]; }).length) + '"></td></tr></tfoot></table></div>'
        : '<div class="card empty">' + mascot(90, 'think') + '<h3>ไม่พบเอกสารตามตัวกรอง</h3><p>' + (all.length ? 'ลองเปลี่ยนหมวดหรือสถานะ' : 'ยังไม่มีเอกสารในรอบนี้ ไปที่หน้านำเข้าจาก HRMi') + '</p>' + (all.length ? '' : '<a class="btn pri" href="#/import">' + icon('paste') + 'นำเข้าจาก HRMi</a>') + '</div>';
      P.drawBulk();
      P.bind();
    };
    P.draw = draw;
    $('#dxQ').oninput = debounce(function () { P.f.q = this.value; draw(); }, 200);
    $('#dxHm').onchange = function () { P.f.hm = this.value; draw(); };
    $$('#dxCats [data-c]').forEach(function (b) { b.onclick = function () { P.f.cat = b.getAttribute('data-c'); draw(); }; });
    $$('#dxSt [data-s]').forEach(function (b) { b.onclick = function () { P.f.st = b.getAttribute('data-s'); draw(); }; });
    if ($('#dxCat')) $('#dxCat').onclick = function () { ImportFlow.categorize(); };
    $('#dxExport').onclick = function () { P.exportList(); };
    $('#dxCols').onclick = function (e) {
      var C = P.cols(), box = document.createElement('div');
      box.className = 'colpick';
      box.innerHTML = '<div class="tiny muted" style="padding:4px 8px">แสดงคอลัมน์</div>' + DOC_COLS.map(function (c) { return '<label><input type="checkbox" data-col="' + c[0] + '"' + (C[c[0]] ? ' checked' : '') + '>' + esc(c[1]) + '</label>'; }).join('');
      popover(e.currentTarget, box);
      $$('[data-col]', box).forEach(function (cb) { cb.onchange = function () { var c = P.cols(); c[cb.getAttribute('data-col')] = cb.checked ? 1 : 0; lsSet('pp:docs:cols', c); draw(); }; });
    };
    draw();
  },
  filtered: function (all) {
    var f = this.f, q = String(f.q || '').toLowerCase().trim();
    return all.filter(function (x) {
      if (f.st === '_removed') { if (x.flag !== 'REMOVED') return false; } else if (x.flag === 'REMOVED' && f.st) return false;
      if (f.cat) { if (f.cat === '_none' ? x.category : (x.category || '') !== f.cat) return false; }
      if (f.st === '_dup') { if (!((S.data && S.data.dups) || {})[x.docNo]) return false; }
      else if (f.st && f.st !== '_removed') { if (f.st === '_notok' ? x.hrStatus === 'APPROVED' : x.hrStatus !== f.st) return false; }
      if (f.hm) { if (f.hm === '_other' ? (x.hrmiStatus === 'รออนุมัติ' || x.hrmiStatus === 'อนุมัติ') : x.hrmiStatus !== f.hm) return false; }
      if (q && (x.docNo + ' ' + x.incomeName + ' ' + (x.remark || '') + ' ' + (x.div || '') + ' ' + (x.divFix || '') + ' ' + (x.jobName || '') + ' ' + (x.hrNote || '')).toLowerCase().indexOf(q) < 0) return false;
      return true;
    }).sort(function (a, b) { return a.docNo < b.docNo ? -1 : 1; });
  },
  setPend: function (docNo, k, v) {
    var P = this, x = (S.data.docs || []).filter(function (d) { return d.docNo === docNo; })[0], cur = k === 'div' ? (x.divFix || x.div) : (x[k] || '');
    var p = P.pend[docNo] || (P.pend[docNo] = {});
    if (v === cur) delete p[k]; else p[k] = v;
    if (!Object.keys(p).length) delete P.pend[docNo];
    S.dirty = Object.keys(P.pend).length ? 'docs' : null;
  },
  bind: function () {
    var P = this;
    $$('[data-sel]').forEach(function (c) { c.onchange = function () { var k = c.getAttribute('data-sel'); if (c.checked) P.sel[k] = 1; else delete P.sel[k]; c.closest('tr').classList.toggle('sel', c.checked); P.drawBulk(); }; });
    var all = $('#dxAll'); if (all) { all.checked = P.list.length && P.list.every(function (x) { return P.sel[x.docNo]; }); all.onchange = function () { P.list.forEach(function (x) { if (all.checked) P.sel[x.docNo] = 1; else delete P.sel[x.docNo]; }); P.draw(); }; }
    $$('[data-copy]').forEach(function (s) { s.onclick = function () { copyText(s.getAttribute('data-copy'), 'เลขที่เอกสาร'); }; });
    $$('[data-fn]').forEach(function (b) { b.onclick = function () { copyText(P.fn[b.getAttribute('data-fn')] || '', 'ชื่อไฟล์'); }; });
    $$('[data-st]').forEach(function (b) {
      b.onclick = function () {
        var k = b.getAttribute('data-st');
        popover(b, R.HR_STATUS.map(function (s) { return { html: stPill(s.code) + '<span class="muted small" style="margin-left:6px">' + esc(s.tip) + '</span>', value: s.code }; }), function (v) { P.setPend(k, 'hrStatus', v); P.draw(); });
      };
    });
    $$('[data-cat]').forEach(function (b) {
      b.onclick = function () {
        var k = b.getAttribute('data-cat');
        popover(b, activeCats().map(function (c) { return { html: catChip(c.code), value: c.code }; }).concat(['-', { label: 'ใช้หมวดตามตารางรายการ (ยกเลิกที่แก้เอง)', icon: 'undo', value: '' }]), function (v) { P.setPend(k, 'category', v); P.draw(); });
      };
    });
    $$('[data-div]').forEach(function (b) { b.onclick = function () { P.editDiv(b.getAttribute('data-div')); }; });
    $$('[data-open]').forEach(function (b) { b.onclick = function () { P.openDoc(b.getAttribute('data-open')); }; });
  },
  drawBulk: function () {
    var P = this, n = Object.keys(P.sel).length, np = Object.keys(P.pend).length, box = $('#dxBulk'); if (!box) return;
    if (!n && !np) { box.innerHTML = ''; return; }
    box.innerHTML = '<div class="bulk">' + (n ? '<b>เลือก ' + n + '</b><select id="bkSt" aria-label="ตั้งสถานะ"><option value="">ตั้งสถานะ HR…</option>' + R.HR_STATUS.map(function (s) { return '<option value="' + s.code + '">' + esc(s.name) + '</option>'; }).join('') + '</select>' +
      '<select id="bkCat" aria-label="ย้ายหมวด"><option value="">ย้ายหมวด…</option>' + activeCats().map(function (c) { return '<option value="' + esc(c.code) + '">' + esc(c.name) + '</option>'; }).join('') + '</select>' +
      '<button class="btn sm" id="bkFn">' + icon('copy') + 'คัดลอกชื่อไฟล์</button><button class="btn sm" id="bkNone">ยกเลิกเลือก</button>' : '') +
      '<span class="flex1"></span>' + (np ? '<span>แก้ไข <b>' + np + '</b> เอกสาร</span><button class="btn sm" id="bkUndo">' + icon('undo') + 'ยกเลิกการแก้</button><button class="btn pri" id="bkSave">' + icon('ok') + 'บันทึก (' + np + ')</button>' : '') + '</div>';
    if (n) {
      $('#bkSt').onchange = function () { var v = this.value; if (!v) return; Object.keys(P.sel).forEach(function (k) { P.setPend(k, 'hrStatus', v); }); P.draw(); };
      $('#bkCat').onchange = function () { var v = this.value; if (!v) return; Object.keys(P.sel).forEach(function (k) { P.setPend(k, 'category', v); }); P.draw(); };
      $('#bkFn').onclick = function () { copyText(P.list.filter(function (x) { return P.sel[x.docNo]; }).map(function (x) { return P.fn[x.docNo]; }).join('\n'), n + ' ชื่อไฟล์'); };
      $('#bkNone').onclick = function () { P.sel = {}; P.draw(); };
    }
    if (np) {
      $('#bkUndo').onclick = function () { P.pend = {}; S.dirty = null; P.draw(); };
      $('#bkSave').onclick = function () {
        var b = this; b.classList.add('loading');
        var changes = Object.keys(P.pend).map(function (k) { return Object.assign({ docNo: k }, P.pend[k]); });
        api('saveDocs', { roundId: S.roundId, changes: changes }).then(function (res) { P.pend = {}; P.sel = {}; S.dirty = null; applyRound(res.data); toast('บันทึก ' + res.saved + ' เอกสารแล้ว', 'ok'); P.keep = true; refreshPage(); P.keep = false; }, function (e) { b.classList.remove('loading'); fail(e); });
      };
    }
  },
  editDiv: function (docNo) {
    var P = this, x = S.data.docs.filter(function (d) { return d.docNo === docNo; })[0], divs = {};
    S.data.docs.forEach(function (d) { if (d.div) divs[d.div] = 1; if (d.divFix) divs[d.divFix] = 1; });
    modal({ title: 'แก้ฝ่ายของเอกสาร ' + docNo, icon: 'edit', body: '<p class="muted small" style="margin:0">ฝ่ายใน HRMi: <b>' + esc(x.div || '—') + '</b> · แก้กรณีหน่วยงานกรอกผิด หรือใบเดียวมีหลายฝ่ายให้ระบุฝ่ายหลัก</p>' +
      '<div class="field"><label for="dvIn">ฝ่ายที่ถูกต้อง</label><input id="dvIn" class="inp" list="dvList" value="' + esc((P.pend[docNo] && P.pend[docNo].div) || x.divFix || x.div || '') + '"><datalist id="dvList">' + Object.keys(divs).sort().map(function (v) { return '<option value="' + esc(v) + '">'; }).join('') + '</datalist></div>',
      actions: [{ label: 'ใช้ตาม HRMi', cls: 'ghost', click: function () { P.setPend(docNo, 'div', x.div); P.draw(); } }, { label: 'ตกลง', cls: 'pri', click: function (ov) { P.setPend(docNo, 'div', R.clean($('#dvIn', ov).value) || x.div); P.draw(); } }] });
  },
  openDoc: function (docNo) {
    var P = this, x = S.data.docs.filter(function (d) { return d.docNo === docNo; })[0], open = isOpenRound(), fn = (P.fn || Logic.fileNames(S.data.docs))[docNo];
    var it = R.itemOf(x, S.items);
    var dr = drawer('<div class="row"><h3 class="flex1">' + icon('doc') + '<span class="mono">' + esc(docNo) + '</span></h3><button class="btn ghost icon sm" data-close aria-label="ปิด">' + icon('x') + '</button></div>' +
      '<div><div class="t1" style="font-size:1.05rem">' + esc(x.incomeName) + '</div><div class="muted small">' + esc(x.remark || '') + '</div></div>' +
      '<div class="row">' + stPill(x.hrStatus) + hmPill(x.hrmiStatus) + catChip(x.category) + (x.flag === 'REMOVED' ? '<span class="pill st-REMOVED">ถูกลบจาก HRMi</span>' : '') + '</div>' +
      '<dl class="kv"><dt>รวมรายได้</dt><dd class="num"><b>' + fmt(x.income) + '</b> บาท</dd><dt>รวมรายหัก</dt><dd class="num">' + fmt(x.deduct) + '</dd><dt>วันที่เอกสาร</dt><dd>' + esc(x.docDate || '—') + '</dd><dt>ชื่องาน</dt><dd>' + esc(x.jobName || '—') + '</dd>' +
      '<dt>ฝ่าย</dt><dd>' + esc(x.divFix || x.div || '—') + (x.divFix ? '<div class="t2">HRMi: ' + esc(x.div) + '</div>' : '') + '</dd><dt>หน่วยงาน</dt><dd>' + esc(x.orgUnit || '—') + '</dd><dt>ประเภทการจ่าย</dt><dd>' + esc(x.payType || '—') + '</dd>' +
      '<dt>รหัสรายได้ HRMi</dt><dd>' + (codeOf(x.incomeName) ? '<span class="mono">' + esc(codeOf(x.incomeName)) + '</span>' : '<span class="muted">ไม่พบในรายการรายได้ HRMi</span>') + '</dd>' +
      '<dt>รายการในเช็กลิสต์</dt><dd>' + (it ? esc(it.freq === 'MONTHLY' ? 'ประจำทุกเดือน' : it.freq === 'RETIRED' ? 'เลิกใช้' : 'บางเดือน') + (it.note ? ' · ' + esc(it.note) : '') : 'ยังไม่มี') + '</dd>' +
      '<dt>นำเข้าครั้งแรก</dt><dd>' + thDateTime(x.firstSeen) + '</dd><dt>เห็นล่าสุด</dt><dd>' + thDateTime(x.lastSeen) + ' ' + esc(x.lastView || '') + '</dd></dl>' +
      '<div class="field"><label>ชื่อไฟล์ Scan</label><div class="row"><span class="mono flex1 wrap-any">' + esc(fn || '') + '</span><button class="btn sm" id="ddFn">' + icon('copy') + 'คัดลอก</button></div></div>' +
      (open ? '<div class="field"><label for="ddNote">หมายเหตุ HR ' + q('เช่น เหตุผลที่ส่งคืนแก้ไข หรือเรื่องที่ต้องติดตาม') + '</label><textarea id="ddNote" class="inp" style="min-height:70px">' + esc((P.pend[docNo] && P.pend[docNo].hrNote != null) ? P.pend[docNo].hrNote : (x.hrNote || '')) + '</textarea></div>' +
        '<div class="field"><label>สถานะ HR</label><div class="seg" id="ddSt">' + R.HR_STATUS.map(function (s) { var cur = (P.pend[docNo] && P.pend[docNo].hrStatus) || x.hrStatus; return '<button data-v="' + s.code + '" class="' + (cur === s.code ? 'on' : '') + '">' + esc(s.name) + '</button>'; }).join('') + '</div></div>' +
        '<button class="btn pri" id="ddApply">' + icon('ok') + 'ใช้การแก้ไขนี้ (แล้วกดบันทึกที่แถบล่าง)</button>' : '') +
      '<div><h4 style="margin:6px 0">' + icon('hist') + ' ประวัติการเปลี่ยนแปลง</h4><div id="ddHist" class="small muted">กำลังโหลด…</div></div>');
    $('#ddFn', dr.el).onclick = function () { copyText(fn || '', 'ชื่อไฟล์'); };
    if (open) {
      var st = (P.pend[docNo] && P.pend[docNo].hrStatus) || x.hrStatus;
      $$('#ddSt [data-v]', dr.el).forEach(function (b) { b.onclick = function () { st = b.getAttribute('data-v'); $$('#ddSt [data-v]', dr.el).forEach(function (z) { z.classList.toggle('on', z === b); }); }; });
      $('#ddApply', dr.el).onclick = function () { P.setPend(docNo, 'hrStatus', st); P.setPend(docNo, 'hrNote', $('#ddNote', dr.el).value); dr.close(); P.draw(); };
    }
    api('getDocHistory', { docNo: docNo }).then(function (h) {
      var box = $('#ddHist', dr.el); if (!box) return;
      var label = { income: 'รวมรายได้', deduct: 'รวมรายหัก', hrmiStatus: 'สถานะ HRMi', hrStatus: 'สถานะ HR', category: 'หมวด', divFix: 'ฝ่าย (แก้)', hrNote: 'หมายเหตุ', roundId: 'รอบ', flag: 'สถานะเอกสาร', incomeName: 'ชื่อรายได้', remark: 'รายละเอียด', div: 'ฝ่าย', jobName: 'ชื่องาน' };
      var val = function (f, v) { return f === 'hrStatus' ? stName(v) : f === 'category' ? catOf(v).name : f === 'roundId' ? R.roundName(v) : f === 'income' || f === 'deduct' ? fmt(v) : (v || '—'); };
      box.innerHTML = h.length ? h.map(function (r) { return '<div class="todo-i" style="padding:8px 10px;margin-bottom:6px"><span class="tx"><b class="small">' + esc(label[r.field] || r.field) + '</b><span><span class="diff-old">' + esc(val(r.field, r.oldVal)) + '</span> → <span class="diff-new">' + esc(val(r.field, r.newVal)) + '</span></span><span style="display:block">' + thDateTime(r.at) + ' · ' + esc(userName(r.by)) + ' · ' + esc(r.source) + '</span></span></div>'; }).join('') : 'ยังไม่มีการเปลี่ยนแปลง';
    }, function () { var box = $('#ddHist', dr.el); if (box) box.textContent = 'โหลดประวัติไม่ได้'; });
  },
  exportList: function () {
    var P = this, d = S.data, list = P.list || [], fn = P.fn || {};
    var rows = Logic.headRows('รายการเอกสาร ' + d.round.name, d, 'ตามตัวกรอง ' + list.length + ' เอกสาร');
    rows.push(['ลำดับ', 'เลขที่เอกสาร', 'วันที่เอกสาร', 'ชื่อรายได้', 'รายละเอียด', 'ฝ่าย', 'ชื่องาน', 'รวมรายได้', 'รวมรายหัก', 'สถานะ HRMi', 'สถานะ HR', 'หมวด', 'หมายเหตุ', 'ชื่อไฟล์ Scan'].map(function (h) { return { v: h, s: 'head' }; }));
    list.forEach(function (x, i) { rows.push([{ v: i + 1, s: 'int' }, x.docNo, x.docDate || '', { v: x.incomeName, s: 'wrap' }, { v: x.remark || '', s: 'wrap' }, R.divShort(x.divFix || x.div), x.jobName || '', +x.income || 0, +x.deduct || 0, x.hrmiStatus || '', stName(x.hrStatus), catOf(x.category).name, x.hrNote || '', fn[x.docNo] || '']); });
    rows.push([{ v: 'รวม', s: 'totText' }, '', '', '', '', '', '', { v: R.sum(list, 'income'), s: 'totMoney' }, { v: R.sum(list, 'deduct'), s: 'totMoney' }]);
    XLSX.download(XLSX.book([{ name: 'เอกสาร', rows: rows, cols: [7, 17, 12, 40, 40, 26, 14, 15, 12, 12, 15, 20, 24, 46], merges: ['A1:N1', 'A2:N2', 'A3:N3'], freeze: 5, landscape: true }]), 'PayPop_เอกสาร_' + d.round.name.replace(/\s+/g, '_') + '_' + nowStamp() + '.xlsx');
  }
};

Pages.checklist = {
  pend: {},
  render: function (el, hash) {
    var P = Pages.checklist, d = S.data, par = qs(hash);
    el.innerHTML = pageHead('checklist', 'เช็กลิสต์ความครบ', 'ทุกรายการรายได้ที่ควรมีในแต่ละหมวด · มาแล้ว / ยังไม่มา / ไม่มีเบิก · พร้อมเทียบค่าเฉลี่ยย้อนหลัง');
    if (!S.roundId) { el.innerHTML += noRound(); return; }
    if (!d) { el.innerHTML += roundWait(); return; }
    if (P.round !== d.round.id) { P.pend = {}; P.round = d.round.id; }
    if (par.f) P.f = par.f; P.f = P.f || 'MAIN'; P.cat = par.cat != null ? par.cat : (P.cat || '');
    var cl = Logic.checklist(d), open = d.round.status === 'OPEN', lim = S.boot.settings.ANOMALY_PCT || 30, nAvg = (d.stats && d.stats.n) || 0;
    var hasN = cl.rows.filter(function (r) { return r.status === 'HAS'; }).length;
    var tile = function (k, n, label, tone, ic, tip) { return '<button class="card kpi" data-f="' + k + '" style="text-align:left;cursor:pointer' + (P.f === k ? ';outline:2.5px solid var(--pri)' : '') + '"><span class="ico ' + tone + '">' + icon(ic) + '</span><div class="kpi-l">' + esc(label) + q(tip) + '</div><div class="kpi-v num">' + n + '</div></button>'; };
    el.innerHTML += lockedNote() + '<div class="grid stagger mb12 tiles6">' +
      tile('MAIN', cl.rows.length - cl.idle, 'รายการหลัก', 't-info', 'check', 'มาแล้ว + ยังไม่มา + ไม่มีเบิก (ไม่รวมรายการบางเดือนที่ไม่ได้เบิก)') +
      tile('MISSING', cl.missing, 'ยังไม่มา', 't-bad', 'alert', 'รายการประจำทุกเดือนที่ยังไม่มีเอกสาร ยังไม่ยืนยันไม่มีเบิก และไม่มีประมาณการ') +
      tile('HAS', hasN, 'มาแล้ว', 't-ok', 'ok', 'มีเอกสารในรอบนี้อย่างน้อย 1 ใบ') +
      tile('ANOM', cl.anomaly, 'ยอดผิดปกติ', 't-vio', 'pulse', 'ยอดต่างจากค่าเฉลี่ย ' + nAvg + ' รอบที่ปิดแล้วเกิน ±' + lim + '%') +
      tile('NONE', cl.none, 'ไม่มีเบิก', 't-sun', 'x', 'ยืนยันกับหน่วยงานแล้วว่าเดือนนี้ไม่มีการเบิก') +
      tile('IDLE', cl.idle, 'บางเดือน (ไม่มา)', 't-sec', 'cal', 'รายการที่ไม่ได้เบิกทุกเดือน ไม่นับเป็นเรื่องค้าง') + '</div>' +
      (cl.unknown && open ? '<div class="callout warn mb12">' + icon('tag') + '<div class="flex1">มีเอกสาร <b>' + cl.unknown + ' ใบ</b> ที่ชื่อรายได้ยังไม่มีหมวด</div><button class="btn sm" id="clCat">จัดหมวดเลย</button></div>' : '') +
      '<div class="tabs" id="clTabs"><button class="tab" data-c="">ทุกหมวด</button>' + activeCats().map(function (c) { var g = cl.byCat[c.code]; return '<button class="tab" data-c="' + esc(c.code) + '" style="--c:' + esc(c.color) + '"><span class="c"></span>' + esc(c.name) + (g && g.missing ? ' <span class="badge">' + g.missing + '</span>' : '') + '</button>'; }).join('') + '</div><div id="clBody"></div><div id="clBulk"></div>';
    $$('[data-f]', el).forEach(function (b) { b.onclick = function () { P.f = b.getAttribute('data-f'); P.render(el.parentNode ? el : el, ''); }; });
    $$('#clTabs [data-c]', el).forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-c') === P.cat); b.onclick = function () { P.cat = b.getAttribute('data-c'); P.drawBody(); $$('#clTabs [data-c]').forEach(function (z) { z.classList.toggle('on', z === b); }); }; });
    if ($('#clCat')) $('#clCat').onclick = function () { ImportFlow.categorize(); };
    P.el = el; P.drawBody();
  },
  drawBody: function () {
    var P = this, d = S.data, cl = Logic.checklist(d), open = d.round.status === 'OPEN', body = $('#clBody');
    var cats = activeCats().filter(function (c) { return !P.cat || c.code === P.cat; });
    if (!P.cat && cl.byCat['']) cats.push({ code: '', name: 'ยังไม่จัดหมวด', color: '#94a3b8', icon: 'help' });
    var filt = function (r) {
      var st = P.pend[r.itemKey] != null ? (P.pend[r.itemKey].state === 'NONE' ? 'NONE' : (r.item && r.item.freq === 'MONTHLY' ? 'MISSING' : 'IDLE')) : r.status;
      if (P.f === 'ALL') return true; if (P.f === 'MAIN') return st !== 'IDLE'; if (P.f === 'ANOM') return r.anomaly; if (P.f === 'MISSING') return st === 'MISSING' && !r.covered; return st === P.f;
    };
    var html = cats.map(function (c) {
      var g = cl.byCat[c.code]; if (!g) return '';
      var rows = g.rows.filter(filt); if (!rows.length) return '';
      return '<div class="card pad0 mb12"><div class="card-h" style="padding:14px 18px 0"><h3><span class="chip" style="--c:' + esc(c.color) + '"><span class="c"></span>' + esc(c.name) + '</span></h3><span class="grow"></span><span class="small muted">' + g.count + ' เอกสาร · ' + fmt(g.amount) + ' บาท</span>' +
        (g.missing ? '<span class="pill st-MISSING">ยังไม่มา ' + g.missing + '</span>' : '<span class="pill st-APPROVED">ครบ</span>') + '</div>' +
        '<div class="tbl-wrap" style="border:0;border-radius:0"><table class="tbl"><thead><tr><th>สถานะ</th><th>รายการรายได้ / ฝ่าย</th><th class="n">เอกสาร</th><th class="n">ยอดรอบนี้</th><th class="n hide-sm">ค่าเฉลี่ย ' + q('ค่าเฉลี่ยของรอบที่ปิดแล้วล่าสุด (ตั้งจำนวนรอบได้ในตั้งค่า)') + '</th><th class="n">ต่าง</th><th class="hide-sm">หมายเหตุ</th><th></th></tr></thead><tbody>' +
        rows.map(function (r) {
          var pm = P.pend[r.itemKey], st = pm ? (pm.state === 'NONE' ? 'NONE' : (r.item && r.item.freq === 'MONTHLY' ? 'MISSING' : 'IDLE')) : r.status;
          var label = { HAS: 'มาแล้ว', MISSING: r.covered ? 'มีประมาณการ' : 'ยังไม่มา', NONE: 'ไม่มีเบิก', IDLE: 'บางเดือน' }[st];
          var note = pm ? pm.note : (r.mark && r.mark.note) || '';
          return '<tr class="' + (pm ? 'dirty' : '') + '"><td><span class="pill st-' + (st === 'MISSING' && r.covered ? 'WAIT' : st) + '">' + label + '</span></td>' +
            '<td style="min-width:240px"><div class="t1">' + esc(r.name) + '</div><div class="t2">' + (codeOf(r.name) ? '<span class="mono">' + esc(codeOf(r.name)) + '</span> · ' : '') + esc(R.divShort(r.div) || 'ทุกฝ่าย') + (r.item ? ' · ' + (r.item.freq === 'MONTHLY' ? 'ประจำทุกเดือน' : 'บางเดือน') : ' · ยังไม่อยู่ในตารางรายการ') + (r.item && r.item.note ? ' · ' + esc(r.item.note) : '') + '</div></td>' +
            '<td class="n">' + (r.docs.length ? '<button class="btn xs" data-docs="' + esc(r.key) + '">' + r.docs.length + ' ใบ</button>' : '—') + '</td><td class="n num">' + (r.amount ? fmt(r.amount) : r.est ? '<span class="muted" data-tip="ยอดประมาณการ">~' + fmt(r.est) + '</span>' : '—') + '</td>' +
            '<td class="n num hide-sm muted">' + (r.avg != null ? fmt(r.avg) : '—') + '</td><td class="n">' + (r.diff != null && r.amount ? '<span class="' + (r.anomaly ? 'pill st-RETURN nodot' : r.diff > 0 ? 'up' : 'down') + '">' + fmtPct(r.diff) + '</span>' : '') + '</td>' +
            '<td class="hide-sm small muted">' + esc(note) + (r.mark && r.mark.by ? '<div class="t2">' + esc(userName(r.mark.by)) + ' ' + thDateTime(r.mark.at) + '</div>' : '') + '</td>' +
            '<td class="n nowrap">' + (open && r.status !== 'HAS' ? (st === 'NONE' ? '<button class="btn xs" data-unmark="' + esc(r.itemKey) + '">' + icon('undo') + 'ยกเลิก</button>' : '<button class="btn xs" data-mark="' + esc(r.itemKey) + '" data-tip="ยืนยันกับหน่วยงานแล้วว่าเดือนนี้ไม่มีการเบิก">' + icon('x') + 'ไม่มีเบิก</button>') +
              ' <button class="btn xs ghost" data-est="' + esc(r.key) + '" data-tip="เพิ่มเป็นประมาณการ">' + icon('wallet') + '</button>' : '') +
            (open && r.item ? ' <button class="btn xs ghost" data-item="' + esc(r.itemKey) + '" data-tip="แก้หมวด/ความถี่ของรายการนี้">' + icon('gear') + '</button>' : '') + '</td></tr>';
        }).join('') + '</tbody></table></div></div>';
    }).join('');
    body.innerHTML = html || '<div class="card empty">' + mascot(100, 'happy') + '<h3>ไม่มีรายการในตัวกรองนี้</h3><p>' + (P.f === 'MISSING' ? 'ไม่มีรายการประจำที่ยังไม่มาแล้ว เยี่ยมมาก!' : 'ลองเลือกตัวกรองอื่น') + '</p></div>';
    var find = function (k) { return cl.rows.filter(function (r) { return r.key === k; })[0]; };
    $$('[data-docs]', body).forEach(function (b) { b.onclick = function () { var r = find(b.getAttribute('data-docs')); Pages.docs.f = { cat: r.cat || '_none', q: r.name, st: '' }; Pages.docs.keep = true; location.hash = '#/docs'; setTimeout(function () { Pages.docs.keep = false; }, 50); }; });
    $$('[data-mark]', body).forEach(function (b) {
      b.onclick = function () {
        var k = b.getAttribute('data-mark');
        modal({ title: 'ยืนยัน "ไม่มีเบิก"', icon: 'x', tone: 't-sun', body: '<p style="margin:0">' + esc(S.items[k] ? S.items[k].name : k) + '</p><div class="field"><label for="mkNote">หมายเหตุ (เช่น ยืนยันกับใคร)</label><input id="mkNote" class="inp" placeholder="เช่น โทรยืนยันกับหน่วยงานแล้ว"></div>',
          actions: [{ label: 'ยกเลิก', cls: 'ghost', value: null }, { label: 'ทำเครื่องหมาย', cls: 'pri', click: function (ov) { P.pend[k] = { itemKey: k, state: 'NONE', note: $('#mkNote', ov).value }; S.dirty = 'checklist'; P.drawBody(); } }] });
      };
    });
    $$('[data-unmark]', body).forEach(function (b) { b.onclick = function () { var k = b.getAttribute('data-unmark'); P.pend[k] = { itemKey: k, state: '', note: '' }; S.dirty = 'checklist'; P.drawBody(); }; });
    $$('[data-est]', body).forEach(function (b) { b.onclick = function () { var r = find(b.getAttribute('data-est')); Pages.plan.addFrom = { name: r.name, category: r.cat, detail: R.divShort(r.div), amount: r.avg || r.prev || 0 }; location.hash = '#/plan'; }; });
    $$('[data-item]', body).forEach(function (b) { b.onclick = function () { Pages.settings.editItem(S.items[b.getAttribute('data-item')], function () { P.drawBody(); }); }; });
    var n = Object.keys(P.pend).length, bulk = $('#clBulk');
    bulk.innerHTML = n ? '<div class="bulk"><span class="flex1">แก้ไข <b>' + n + '</b> รายการ</span><button class="btn sm" id="clUndo">' + icon('undo') + 'ยกเลิก</button><button class="btn pri" id="clSave">' + icon('ok') + 'บันทึก (' + n + ')</button></div>' : '';
    if (n) {
      $('#clUndo').onclick = function () { P.pend = {}; S.dirty = null; P.drawBody(); };
      $('#clSave').onclick = function () {
        var b = this; b.classList.add('loading');
        api('saveChecklist', { roundId: S.roundId, marks: Object.keys(P.pend).map(function (k) { return P.pend[k]; }) }).then(function (res) { P.pend = {}; S.dirty = null; applyRound(res.data); toast('บันทึกเช็กลิสต์แล้ว', 'ok'); refreshPage(); }, function (e) { b.classList.remove('loading'); fail(e); });
      };
    }
  }
};

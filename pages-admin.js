/**
 * pages-admin.js — ตั้งค่า: หมวด · ตารางรายการรายได้ · ผู้ใช้ · ค่าระบบ · กลุ่มแพทย์ SMC · ข้อมูลย้อนหลัง · ประวัติการใช้งาน · เกี่ยวกับระบบ
 */
Pages.settings = {
  tab: 'items',
  render: function (el, hash) {
    var P = Pages.settings, par = qs(hash);
    if (par.tab) P.tab = par.tab;
    var tabs = [['items', 'รายการรายได้', 'tag'], ['cats', 'หมวดหมู่', 'grid'], ['users', 'ผู้ใช้', 'users'], ['sys', 'ค่าระบบ', 'gear'], ['smc', 'กลุ่มแพทย์ SMC', 'steth'], ['history', 'ข้อมูลย้อนหลัง', 'db'], ['audit', 'ประวัติการใช้งาน', 'hist'], ['about', 'เกี่ยวกับระบบ', 'info']];
    el.innerHTML = pageHead('settings', 'ตั้งค่า', 'ทุกคนในทีม HR งานเงินเดือนแก้ไขได้เท่ากัน · การเปลี่ยนแปลงทั้งหมดถูกบันทึกในประวัติการใช้งาน') +
      '<div class="tabs" id="stTabs">' + tabs.map(function (t) { return '<button class="tab' + (P.tab === t[0] ? ' on' : '') + '" data-t="' + t[0] + '">' + icon(t[2]) + esc(t[1]) + '</button>'; }).join('') + '</div><div id="stBody"></div><div id="stBulk"></div>';
    $$('#stTabs [data-t]', el).forEach(function (b) { b.onclick = function () { if (S.dirty) return toast('กรุณาบันทึกหรือยกเลิกการแก้ไขก่อนเปลี่ยนแท็บ', 'warn'); P.tab = b.getAttribute('data-t'); history.replaceState(null, '', '#/settings?tab=' + P.tab); P.render(el, ''); }; });
    P['tab_' + P.tab]($('#stBody'));
  },
  needAdmin: function (fn) {
    var P = this;
    if (P.admin && Date.now() - P.adminAt < 60000) return fn(P.admin);
    $('#stBody').innerHTML = '<div class="card"><div class="sk" style="height:200px"></div></div>';
    api('getAdmin', {}).then(function (a) { P.admin = a; P.adminAt = Date.now(); fn(a); }, fail);
  },

  /* ---------------- รายการรายได้ */
  tab_items: function (box) {
    var P = this; P.ip = P.ip || {}; P.iq = P.iq || { q: '', cat: '', freq: 'ACTIVE' };
    var catOpts = function (v) { return '<option value="">— ไม่มีหมวด —</option>' + activeCats().map(function (c) { return '<option value="' + esc(c.code) + '"' + (c.code === v ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join(''); };
    var freqOpts = function (v) { return [['MONTHLY', 'ประจำทุกเดือน'], ['SOMETIMES', 'บางเดือน'], ['RETIRED', 'เลิกใช้']].map(function (f) { return '<option value="' + f[0] + '"' + (f[0] === v ? ' selected' : '') + '>' + f[1] + '</option>'; }).join(''); };
    box.innerHTML = '<div class="card mb12"><div class="row"><div class="search grow">' + icon('search') + '<input id="itQ" class="inp" placeholder="ค้นหาชื่อรายได้ ฝ่าย หมายเหตุ…" value="' + esc(P.iq.q) + '"></div>' +
      '<select id="itC" class="inp" style="width:auto"><option value="">ทุกหมวด</option>' + activeCats().map(function (c) { return '<option value="' + esc(c.code) + '">' + esc(c.name) + '</option>'; }).join('') + '<option value="_none">ยังไม่มีหมวด</option></select>' +
      '<select id="itF" class="inp" style="width:auto"><option value="ACTIVE">ใช้งานอยู่</option><option value="MONTHLY">ประจำทุกเดือน</option><option value="SOMETIMES">บางเดือน</option><option value="RETIRED">เลิกใช้</option><option value="">ทั้งหมด</option></select>' +
      '<button class="btn pri" id="itAdd">' + icon('plus') + 'เพิ่มรายการ</button></div>' +
      '<p class="small muted" style="margin:10px 0 0">ตารางนี้คือ "สมอง" ของการจัดหมวดอัตโนมัติและเช็กลิสต์ · ชื่อรายได้ × ฝ่าย = 1 รายการ (ฝ่ายว่าง = ใช้กับทุกฝ่าย) ' + q('แก้หมวดที่นี่ ระบบจะปรับหมวดของเอกสารในรอบที่เปิดอยู่ให้ด้วย (ยกเว้นเอกสารที่แก้หมวดเองไว้)') + '</p></div><div id="itTable"></div>';
    $('#itC').value = P.iq.cat; $('#itF').value = P.iq.freq;
    var draw = function () {
      var q2 = P.iq.q.toLowerCase(), list = S.itemsList.filter(function (it) {
        if (P.iq.cat && (P.iq.cat === '_none' ? it.category : it.category !== P.iq.cat)) return false;
        if (P.iq.freq === 'ACTIVE' ? it.freq === 'RETIRED' : P.iq.freq && it.freq !== P.iq.freq) return false;
        return !q2 || (it.name + ' ' + it.div + ' ' + it.note).toLowerCase().indexOf(q2) >= 0;
      }).sort(function (a, b) { return (a.category || 'zz') < (b.category || 'zz') ? -1 : (a.category || 'zz') > (b.category || 'zz') ? 1 : a.name < b.name ? -1 : 1; });
      var shown = list.slice(0, 400);
      $('#itTable').innerHTML = '<div class="tbl-wrap tall"><table class="tbl"><thead><tr><th>ชื่อรายได้</th><th>ฝ่าย</th><th>หมวด</th><th>ความถี่</th><th>หมายเหตุ</th><th class="n hide-sm">พบ (รอบ)</th><th class="hide-sm">ล่าสุด</th></tr></thead><tbody>' +
        shown.map(function (it) {
          var p = P.ip[it.key] || {}, v = function (k) { return p[k] != null ? p[k] : it[k]; };
          return '<tr class="' + (P.ip[it.key] ? 'dirty' : '') + '"><td style="min-width:240px"><div class="t1">' + esc(it.name) + '</div></td><td class="small" style="min-width:140px">' + esc(R.divShort(it.div) || 'ทุกฝ่าย') + '</td>' +
            '<td><select class="inp sm" data-key="' + esc(it.key) + '" data-k="category">' + catOpts(v('category')) + '</select></td><td><select class="inp sm" data-key="' + esc(it.key) + '" data-k="freq">' + freqOpts(v('freq')) + '</select></td>' +
            '<td style="min-width:160px"><input class="inp sm" data-key="' + esc(it.key) + '" data-k="note" value="' + esc(v('note')) + '"></td><td class="n hide-sm">' + (it.seen || 0) + '</td><td class="hide-sm small muted">' + esc(it.lastRound ? R.ymLabel(it.lastRound) : '') + '</td></tr>';
        }).join('') + '</tbody></table></div><p class="small muted">' + list.length + ' รายการ' + (list.length > 400 ? ' (แสดง 400 แรก ใช้ช่องค้นหาเพื่อกรอง)' : '') + '</p>';
      $$('#itTable [data-key]').forEach(function (inp) {
        inp.onchange = function () { var k = inp.getAttribute('data-key'), f = inp.getAttribute('data-k'); var p = P.ip[k] || (P.ip[k] = {}); p[f] = inp.value; if (p[f] === S.items[k][f]) delete p[f]; if (!Object.keys(p).length) delete P.ip[k]; S.dirty = Object.keys(P.ip).length ? 'items' : null; inp.closest('tr').classList.toggle('dirty', !!P.ip[k]); P.itemBulk(); };
      });
    };
    $('#itQ').oninput = debounce(function () { P.iq.q = this.value; draw(); }, 200);
    $('#itC').onchange = function () { P.iq.cat = this.value; draw(); };
    $('#itF').onchange = function () { P.iq.freq = this.value; draw(); };
    $('#itAdd').onclick = function () { P.editItem(null, function () { draw(); }); };
    draw(); P.itemBulk();
  },
  itemBulk: function () {
    var P = this, n = Object.keys(P.ip || {}).length, box = $('#stBulk');
    box.innerHTML = n ? '<div class="bulk"><span class="flex1">แก้ไข <b>' + n + '</b> รายการ</span><button class="btn sm" id="ibUndo">' + icon('undo') + 'ยกเลิก</button><button class="btn pri" id="ibSave">' + icon('ok') + 'บันทึก (' + n + ')</button></div>' : '';
    if (!n) return;
    $('#ibUndo').onclick = function () { P.ip = {}; S.dirty = null; P.tab_items($('#stBody')); };
    $('#ibSave').onclick = function () {
      var b = this; b.classList.add('loading');
      var items = Object.keys(P.ip).map(function (k) { var it = S.items[k]; return Object.assign({ key: k, name: it.name, div: it.div, category: it.category, freq: it.freq, note: it.note }, P.ip[k]); });
      api('saveItems', { items: items }).then(function (res) {
        P.ip = {}; S.dirty = null; setItems(res.items); toast('บันทึก ' + items.length + ' รายการ · ปรับหมวดเอกสาร ' + res.recategorized + ' ใบ', 'ok');
        if (res.recategorized && S.roundId) loadRound(S.roundId, null, true);
        P.tab_items($('#stBody'));
      }, function (e) { b.classList.remove('loading'); fail(e); });
    };
  },
  editItem: function (it, cb) {
    var isNew = !it; it = it || { name: '', div: '', category: '', freq: 'SOMETIMES', note: '' };
    modal({ title: isNew ? 'เพิ่มรายการรายได้' : 'แก้รายการรายได้', icon: 'tag', body:
      '<div class="field"><label for="eiN">ชื่อรายได้ (ตรงกับ HRMi, ไม่เกิน 50 ตัวอักษร)</label><input id="eiN" class="inp" maxlength="60" value="' + esc(it.name) + '"' + (isNew ? '' : ' disabled') + '></div>' +
      '<div class="field"><label for="eiD">ฝ่าย ' + q('เว้นว่าง = ใช้กับทุกฝ่าย · ใส่ฝ่ายเมื่อชื่อรายได้เดียวกันต้องเช็กแยกรายฝ่าย เช่น ค่าเวรแพทย์') + '</label><input id="eiD" class="inp" value="' + esc(it.div) + '"' + (isNew ? '' : ' disabled') + '></div>' +
      '<div class="row"><div class="field grow"><label for="eiC">หมวด</label><select id="eiC" class="inp"><option value="">— ไม่มีหมวด —</option>' + activeCats().map(function (c) { return '<option value="' + esc(c.code) + '"' + (c.code === it.category ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select></div>' +
      '<div class="field grow"><label for="eiF">ความถี่</label><select id="eiF" class="inp">' + [['MONTHLY', 'ประจำทุกเดือน'], ['SOMETIMES', 'บางเดือน'], ['RETIRED', 'เลิกใช้']].map(function (f) { return '<option value="' + f[0] + '"' + (f[0] === it.freq ? ' selected' : '') + '>' + f[1] + '</option>'; }).join('') + '</select></div></div>' +
      '<div class="field"><label for="eiNo">หมายเหตุ</label><input id="eiNo" class="inp" value="' + esc(it.note) + '"></div>',
      actions: [{ label: 'ยกเลิก', cls: 'ghost', value: null }, { label: 'บันทึก', cls: 'pri', click: function (ov) {
        var x = { key: it.key, name: $('#eiN', ov).value, div: $('#eiD', ov).value, category: $('#eiC', ov).value, freq: $('#eiF', ov).value, note: $('#eiNo', ov).value };
        if (!R.clean(x.name)) { toast('กรุณากรอกชื่อรายได้', 'warn'); return false; }
        return api('saveItems', { items: [x] }).then(function (res) { setItems(res.items); toast('บันทึกแล้ว', 'ok'); if (res.recategorized && S.roundId) loadRound(S.roundId, null, true).then(function () { cb && cb(); }); else cb && cb(); });
      } }] });
  },

  /* ---------------- หมวดหมู่ */
  tab_cats: function (box) {
    var P = this, list = (S.boot.categories || []).map(function (c) { return Object.assign({}, c); }), ICON_SET = ['gem', 'doc', 'pulse', 'pin', 'undo', 'tag', 'steth', 'wallet', 'star', 'grid', 'users', 'flag'];
    var draw = function () {
      box.innerHTML = '<div class="card"><div class="card-h"><h2>' + icon('grid') + 'หมวดหมู่</h2>' + q('เรียงลำดับ เปลี่ยนชื่อ สี ไอคอน หรือปิดใช้งาน · ลบได้เฉพาะหมวดที่ไม่มีรายการรายได้ใช้อยู่') + '<span class="grow"></span><button class="btn sm" id="ctAdd">' + icon('plus') + 'เพิ่มหมวด</button></div>' +
        '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>ลำดับ</th><th>รหัส</th><th>ชื่อหมวด</th><th>สี</th><th>ไอคอน</th><th class="c">ใช้งาน</th><th></th></tr></thead><tbody>' +
        list.map(function (c, i) {
          return '<tr><td class="nowrap"><button class="btn xs ghost" data-up="' + i + '" aria-label="ขึ้น">▲</button><button class="btn xs ghost" data-dn="' + i + '" aria-label="ลง">▼</button></td><td><input class="inp sm" style="width:90px" data-i="' + i + '" data-k="code" value="' + esc(c.code) + '"' + (c._new ? '' : ' disabled') + '></td>' +
            '<td><input class="inp sm" data-i="' + i + '" data-k="name" value="' + esc(c.name) + '"></td><td><input type="color" data-i="' + i + '" data-k="color" value="' + esc(c.color || '#64748b') + '" style="width:44px;height:32px;border:0;background:none"></td>' +
            '<td><select class="inp sm" data-i="' + i + '" data-k="icon">' + ICON_SET.map(function (n) { return '<option' + (n === c.icon ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select> ' + icon(c.icon) + '</td>' +
            '<td class="c"><input type="checkbox" data-i="' + i + '" data-k="active"' + (c.active !== false ? ' checked' : '') + '></td><td><button class="btn xs ghost" data-del="' + i + '" aria-label="ลบ">' + icon('trash') + '</button></td></tr>';
        }).join('') + '</tbody></table></div><div class="row end mt12"><button class="btn pri" id="ctSave">' + icon('ok') + 'บันทึกหมวดหมู่</button></div></div>';
      $$('[data-k]', box).forEach(function (inp) { inp.onchange = function () { var c = list[+inp.getAttribute('data-i')], k = inp.getAttribute('data-k'); c[k] = k === 'active' ? inp.checked : inp.value; if (k === 'icon') draw(); }; });
      $$('[data-up]', box).forEach(function (b) { b.onclick = function () { var i = +b.getAttribute('data-up'); if (i > 0) { var t = list[i]; list[i] = list[i - 1]; list[i - 1] = t; draw(); } }; });
      $$('[data-dn]', box).forEach(function (b) { b.onclick = function () { var i = +b.getAttribute('data-dn'); if (i < list.length - 1) { var t = list[i]; list[i] = list[i + 1]; list[i + 1] = t; draw(); } }; });
      $$('[data-del]', box).forEach(function (b) { b.onclick = function () { list.splice(+b.getAttribute('data-del'), 1); draw(); }; });
      $('#ctAdd').onclick = function () { list.push({ code: '', name: '', color: '#64748b', icon: 'tag', active: true, _new: true }); draw(); };
      $('#ctSave').onclick = function () { var b = this; b.classList.add('loading'); api('saveCategories', { list: list }).then(function (res) { S.boot.categories = res.categories; setBoot(S.boot); toast('บันทึกหมวดหมู่แล้ว', 'ok'); P.tab_cats(box); }, function (e) { b.classList.remove('loading'); fail(e); }); };
    };
    draw();
  },

  /* ---------------- ผู้ใช้ */
  tab_users: function (box) {
    var P = this;
    P.needAdmin(function (a) {
      box.innerHTML = '<div class="card"><div class="card-h"><h2>' + icon('users') + 'ผู้ใช้งาน</h2>' + q('ทุกคนสิทธิ์เท่ากัน · ผู้ใช้ใหม่เข้าครั้งแรกด้วยรหัสพนักงานเป็นรหัสผ่าน แล้วระบบบังคับตั้งรหัสใหม่') + '<span class="grow"></span><button class="btn sm pri" id="usAdd">' + icon('plus') + 'เพิ่มผู้ใช้</button></div>' +
        '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>รหัส</th><th>ชื่อ-สกุล</th><th>สถานะ</th><th class="hide-sm">เข้าใช้ล่าสุด</th><th></th></tr></thead><tbody>' +
        a.users.map(function (u) {
          return '<tr><td class="mono">' + esc(u.empCode) + '</td><td>' + esc(u.fullName) + (u.empCode === S.boot.me.empCode ? ' <span class="pill st-PROC nodot">คุณ</span>' : '') + '</td><td>' + (u.active ? (u.hasPassword ? (u.mustChange ? '<span class="pill st-WAIT">รอเปลี่ยนรหัส</span>' : '<span class="pill st-APPROVED">ใช้งาน</span>') : '<span class="pill st-WAIT">ยังไม่เคยเข้า</span>') : '<span class="pill st-NONE">ปิดบัญชี</span>') + '</td>' +
            '<td class="hide-sm small muted">' + thDateTime(u.lastLogin) + '</td><td class="n nowrap"><button class="btn xs" data-ed="' + esc(u.empCode) + '">' + icon('edit') + 'แก้</button> <button class="btn xs ghost" data-rs="' + esc(u.empCode) + '">' + icon('key') + 'รีเซ็ตรหัส</button></td></tr>';
        }).join('') + '</tbody></table></div></div>';
      var edit = function (u) {
        modal({ title: u ? 'แก้ผู้ใช้' : 'เพิ่มผู้ใช้', icon: 'user', body: '<div class="field"><label for="uC">รหัสพนักงาน (7 หลัก)</label><input id="uC" class="inp" inputmode="numeric" maxlength="7" value="' + esc(u ? u.empCode : '') + '"' + (u ? ' disabled' : '') + '></div>' +
          '<div class="field"><label for="uN">ชื่อ-สกุล</label><input id="uN" class="inp" value="' + esc(u ? u.fullName : '') + '"></div><label class="check"><input type="checkbox" id="uA"' + (!u || u.active ? ' checked' : '') + '> เปิดใช้งาน</label>',
          actions: [{ label: 'ยกเลิก', cls: 'ghost', value: null }, { label: 'บันทึก', cls: 'pri', click: function (ov) {
            return api('saveUser', { empCode: $('#uC', ov).value, fullName: $('#uN', ov).value, active: $('#uA', ov).checked }).then(function (users) { P.admin.users = users; S.boot.users = users.map(function (x) { return { empCode: x.empCode, fullName: x.fullName }; }); toast('บันทึกผู้ใช้แล้ว', 'ok'); P.tab_users(box); });
          } }] });
      };
      $('#usAdd').onclick = function () { edit(null); };
      $$('[data-ed]', box).forEach(function (b) { b.onclick = function () { edit(a.users.filter(function (x) { return x.empCode === b.getAttribute('data-ed'); })[0]); }; });
      $$('[data-rs]', box).forEach(function (b) {
        b.onclick = function () {
          var code = b.getAttribute('data-rs');
          askPassword('รีเซ็ตรหัสผ่าน ' + code, 'ผู้ใช้จะเข้าครั้งถัดไปด้วยรหัสพนักงาน แล้วต้องตั้งรหัสใหม่').then(function (x) { if (!x) return; api('resetPassword', { empCode: code, password: x.password }).then(function (users) { P.admin.users = users; toast('รีเซ็ตรหัสผ่านแล้ว', 'ok'); P.tab_users(box); }, fail); });
        };
      });
    });
  },

  /* ---------------- ค่าระบบ */
  tab_sys: function (box) {
    var P = this, s = S.boot.settings;
    var f = function (k, label, tip, type, extra) { return '<div class="field"><label for="sy-' + k + '">' + esc(label) + (tip ? q(tip) : '') + '</label>' + (type === 'area' ? '<textarea id="sy-' + k + '" class="inp" data-k="' + k + '" style="min-height:96px">' + esc(s[k]) + '</textarea>' : type === 'bool' ? '<label class="check"><input type="checkbox" id="sy-' + k + '" data-k="' + k + '"' + (s[k] !== false ? ' checked' : '') + '> ' + esc(extra || 'เปิด') + '</label>' : '<input id="sy-' + k + '" class="inp' + (type === 'num' ? ' num' : '') + '" data-k="' + k + '" value="' + esc(s[k]) + '"' + (type === 'num' ? ' inputmode="decimal"' : '') + '>') + '</div>'; };
    box.innerHTML = '<div class="grid g2"><div class="card grid"><h3>' + icon('flag') + 'การเตือนและการคำนวณ</h3>' +
      f('ANOMALY_PCT', 'เตือนยอดผิดปกติเมื่อต่างจากค่าเฉลี่ยเกิน (%)', 'ใช้ในเช็กลิสต์และหน้าแรก', 'num') + f('AVG_ROUNDS', 'จำนวนรอบที่ใช้หาค่าเฉลี่ย', 'นับเฉพาะรอบที่ปิดแล้ว', 'num') +
      f('RETURN_DAYS', 'เตือนเอกสารส่งคืนแก้ไขค้างเกิน (วัน)', '', 'num') + f('RATE_80', 'สัดส่วนจ่ายแพทย์ SMC (%)', 'ส่วนที่เหลือเป็นส่วนของ รพ.', 'num') +
      f('CLOSE_REQUIRE_REASON', 'ปิดรอบขณะยังมีเรื่องค้าง', '', 'bool', 'ต้องกรอกเหตุผลก่อนปิดรอบ') + f('TK_DIV', 'ฝ่ายที่ถือเป็น "ตกเบิก" (สำหรับชื่อรายได้ใหม่)', 'เอกสารที่หน่วยงานส่งให้ HR คีย์เอง · รายการที่มีอยู่แล้วใช้หมวดตามตารางรายการ') +
      f('PAY_PREFIXES', 'คำนำหน้าเลขที่เอกสารที่นับในรอบ', 'คั่นด้วยเครื่องหมายจุลภาค เช่น PAY · เอกสารอื่น (PWF) จะถูกแจ้งเตือนและตัดออก') + '</div>' +
      '<div class="card grid"><h3>' + icon('file') + 'ชื่อไฟล์ Scan</h3>' + f('FILE_SEP', 'ตัวคั่นหลังเลข 4 หลัก', 'ค่าเริ่มต้น ". " (จุด + เว้นวรรค) เช่น 0083. ชื่อรายได้') +
      f('FILE_REPLACE', 'แทนอักขระ (บรรทัดละ 1 คู่: เดิม => ใหม่)', 'เช่น & => และ', 'area') + f('FILE_REMOVE', 'ลบอักขระเหล่านี้ออก', 'อักขระที่ HRMi ไม่รับ') +
      '<div class="callout info small">' + icon('eye') + '<span id="fnDemo"></span></div><h3 class="mt8">' + icon('paste') + 'View ของ HRMi</h3>' + f('VIEWS', 'รายการ View (บรรทัดละ 1)', 'ใช้เป็นตัวเลือกตอนวางข้อมูล', 'area') +
      f('ORG_LINE1', 'ชื่อหน่วยงาน (หัวรายงาน บรรทัด 1)') + f('ORG_LINE2', 'หัวรายงาน บรรทัด 2') + f('SMARTAPI_ENABLED', 'SmartAPI (ตรวจสถานะพนักงาน)', '', 'bool', 'เปิดใช้') + f('STAFF_TTL_DAYS', 'จำผลตรวจสถานะพนักงานไว้ (วัน)', '', 'num') + '</div></div>' +
      '<div class="row end mt12"><button class="btn pri" id="sySave">' + icon('ok') + 'บันทึกค่าระบบ</button></div>';
    var demo = function () { var r = R.fileRules({ FILE_SEP: $('#sy-FILE_SEP').value, FILE_REPLACE: $('#sy-FILE_REPLACE').value, FILE_REMOVE: $('#sy-FILE_REMOVE').value }); $('#fnDemo').textContent = 'ตัวอย่าง: ' + R.fileNames([{ docNo: 'PAY256909-0083', incomeName: 'นัก/จ.รังสีการแพทย์ CT (ตกเบิก) & MRI', div: '' }], r)['PAY256909-0083']; };
    ['FILE_SEP', 'FILE_REPLACE', 'FILE_REMOVE'].forEach(function (k) { $('#sy-' + k).oninput = demo; }); demo();
    $('#sySave').onclick = function () {
      var b = this, v = {};
      $$('[data-k]', box).forEach(function (inp) { var k = inp.getAttribute('data-k'); v[k] = inp.type === 'checkbox' ? inp.checked : inp.value; });
      b.classList.add('loading');
      api('saveSettings', { values: v }).then(function (res) { S.boot.settings = res.settings; S.boot.smcGroups = res.smcGroups; setBoot(S.boot); toast('บันทึกค่าระบบแล้ว', 'ok'); b.classList.remove('loading'); }, function (e) { b.classList.remove('loading'); fail(e); });
    };
  },

  /* ---------------- กลุ่มแพทย์ SMC */
  tab_smc: function (box) {
    var list = (S.boot.smcGroups || []).map(function (g) { return Object.assign({}, g); });
    var draw = function () {
      box.innerHTML = '<div class="card"><div class="card-h"><h2>' + icon('steth') + 'กลุ่มแพทย์ SMC</h2>' + q('ระบบเลือกเอกสาร 80%/20% ให้อัตโนมัติจาก "คำในชื่อรายได้" (ชื่อรายได้มีคำนี้อยู่ = ใช่)') + '<span class="grow"></span><button class="btn sm" id="sgAdd">' + icon('plus') + 'เพิ่มกลุ่ม</button></div>' +
        '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>รหัส</th><th>ชื่อกลุ่ม</th><th>คำในชื่อรายได้ ส่วน 80%</th><th>คำในชื่อรายได้ ส่วน 20%</th><th></th></tr></thead><tbody>' +
        list.map(function (g, i) { return '<tr><td><input class="inp sm" style="width:80px" data-i="' + i + '" data-k="id" value="' + esc(g.id) + '"></td><td><input class="inp sm" data-i="' + i + '" data-k="name" value="' + esc(g.name) + '"></td><td style="min-width:260px"><input class="inp sm" data-i="' + i + '" data-k="kw80" value="' + esc(g.kw80) + '"></td><td style="min-width:260px"><input class="inp sm" data-i="' + i + '" data-k="kw20" value="' + esc(g.kw20) + '"></td><td><button class="btn xs ghost" data-del="' + i + '">' + icon('trash') + '</button></td></tr>'; }).join('') +
        '</tbody></table></div><div class="row end mt12"><button class="btn pri" id="sgSave">' + icon('ok') + 'บันทึก</button></div></div>';
      $$('[data-k]', box).forEach(function (inp) { inp.onchange = function () { list[+inp.getAttribute('data-i')][inp.getAttribute('data-k')] = inp.value; }; });
      $$('[data-del]', box).forEach(function (b) { b.onclick = function () { list.splice(+b.getAttribute('data-del'), 1); draw(); }; });
      $('#sgAdd').onclick = function () { list.push({ id: 'G' + (list.length + 1), name: '', kw80: '', kw20: '' }); draw(); };
      $('#sgSave').onclick = function () { var b = this; b.classList.add('loading'); api('saveSettings', { values: { SMC_GROUPS: JSON.stringify(list) } }).then(function (res) { S.boot.settings = res.settings; S.boot.smcGroups = res.smcGroups; setBoot(S.boot); toast('บันทึกกลุ่มแพทย์แล้ว', 'ok'); b.classList.remove('loading'); }, function (e) { b.classList.remove('loading'); fail(e); }); };
    };
    draw();
  },

  /* ---------------- ข้อมูลย้อนหลัง */
  tab_history: function (box) {
    var have = {}; roundsList().forEach(function (r) { have[r.id] = r; });
    box.innerHTML = '<div class="grid g2"><div class="card"><div class="card-h"><h2>' + icon('db') + 'นำเข้าข้อมูลย้อนหลังจาก Excel เดิม</h2></div>' +
      '<p class="small">ใช้ไฟล์ <span class="mono">paypop_ข้อมูลตั้งต้น_2568-2569.json</span> (สร้างจากไฟล์สรุปบันทึกการจ่ายเดิม) ระบบจะ</p><ul class="small" style="margin-top:0"><li>ตั้งตารางรายการรายได้ หมวด และความถี่ (ไม่ทับรายการที่แก้เองแล้ว)</li><li>สร้างรอบย้อนหลังแบบปิดแล้ว ใช้ทำกราฟแนวโน้ม ค่าเฉลี่ย และตรวจ WL</li><li>ข้ามรอบที่มีอยู่แล้วในระบบ</li></ul>' +
      '<div class="drop" id="hsDrop" tabindex="0" role="button">' + icon('up', 'big') + '<b>เลือกไฟล์ .json</b><input type="file" id="hsFile" accept=".json" hidden></div><div id="hsInfo" class="mt12"></div></div>' +
      '<div class="card"><div class="card-h"><h3>' + icon('cal') + 'รอบที่มีในระบบ</h3></div><p class="small muted" style="margin:0">' + roundsList().length + ' รอบ · ย้อนหลัง ' + roundsList().filter(function (r) { return r.source === 'HISTORY'; }).length + ' รอบ</p></div></div>';
    $('#hsDrop').onclick = function () { $('#hsFile').click(); };
    $('#hsFile').onchange = function () {
      var f = this.files[0]; if (!f) return;
      var fr = new FileReader();
      fr.onload = function () {
        var pack; try { pack = JSON.parse(fr.result); } catch (e) { return toast('ไฟล์ไม่ใช่ JSON', 'bad'); }
        if (pack.kind !== 'PAYPOP_HISTORY') return toast('ไฟล์นี้ไม่ใช่ข้อมูลตั้งต้นของ PayPop', 'bad');
        var todo = pack.rounds.filter(function (r) { return !have[r.roundId] || have[r.roundId].source === 'HISTORY'; });
        $('#hsInfo').innerHTML = '<div class="callout info">' + icon('info') + '<div>พบ <b>' + pack.rounds.length + ' รอบ</b> (' + esc(R.roundName(pack.rounds[0].roundId)) + ' – ' + esc(R.roundName(pack.rounds[pack.rounds.length - 1].roundId)) + ') · ' + fmt0(pack.rounds.reduce(function (s, r) { return s + r.docs.length; }, 0)) + ' เอกสาร · รายการรายได้ ' + pack.items.length + ' รายการ<br>จะนำเข้า ' + todo.length + ' รอบ (ข้ามรอบที่เป็นรอบใช้งานจริง)</div></div>' +
          '<div class="meter mt12" style="height:12px"><span id="hsBar" style="width:0;background:linear-gradient(90deg,var(--pri),var(--pri-2))"></span></div><p class="small muted" id="hsTxt"></p><button class="btn pri" id="hsGo">' + icon('db') + 'เริ่มนำเข้า</button>';
        $('#hsGo').onclick = function () {
          var b = this;
          askPassword('นำเข้าข้อมูลย้อนหลัง', 'ใช้เวลาประมาณ 1–3 นาที กรุณาอย่าปิดหน้านี้').then(function (x) {
            if (!x) return; b.disabled = true;
            var i = 0, bar = $('#hsBar'), txt = $('#hsTxt');
            txt.textContent = 'ตั้งตารางรายการรายได้…';
            api('historyInit', { password: x.password, categories: pack.categories, items: pack.items, deductTemplate: pack.deductTemplate }).then(function () {
              var next = function () {
                if (i >= todo.length) { txt.textContent = 'เสร็จแล้ว 🎉 กำลังโหลดข้อมูลใหม่…'; bar.style.width = '100%'; confetti(); return api('bootstrap', {}).then(function (bt) { setBoot(bt); updateRoundPick(); toast('นำเข้าข้อมูลย้อนหลัง ' + todo.length + ' รอบเรียบร้อย', 'ok'); if (!S.roundId) S.roundId = pickDefaultRound(); refreshPage(); }); }
                var r = todo[i]; txt.textContent = 'กำลังนำเข้า ' + r.name + ' (' + (i + 1) + '/' + todo.length + ')';
                return api('historyRound', { round: r, docCols: pack.docCols }).then(function () { i++; bar.style.width = Math.round(i / todo.length * 100) + '%'; return next(); });
              };
              return next();
            }).catch(function (e) { b.disabled = false; fail(e); });
          });
        };
      };
      fr.readAsText(f, 'UTF-8');
    };
  },

  /* ---------------- ประวัติการใช้งาน */
  tab_audit: function (box) {
    box.innerHTML = '<div class="card"><div class="row mb12"><div class="search grow">' + icon('search') + '<input id="auQ" class="inp" placeholder="ค้นหา รหัส การกระทำ รอบ…"></div></div><div id="auT"><div class="sk" style="height:200px"></div></div></div>';
    var load = function (q2) {
      api('getAudit', { q: q2 || '' }).then(function (rows) {
        var A = { LOGIN: 'เข้าสู่ระบบ', LOGOUT: 'ออกจากระบบ', IMPORT: 'นำเข้า', UPDATE: 'แก้ไข', CREATE: 'สร้าง', DELETE: 'ลบ', CLOSE: 'ปิดรอบ', REOPEN: 'เปิดรอบอีกครั้ง', SAVE: 'บันทึก' };
        $('#auT').innerHTML = '<div class="tbl-wrap tall"><table class="tbl"><thead><tr><th>เวลา</th><th>ผู้ใช้</th><th>การกระทำ</th><th>ส่วน</th><th>เป้าหมาย</th><th class="hide-sm">รายละเอียด</th></tr></thead><tbody>' +
          rows.map(function (r) { return '<tr><td class="nowrap small">' + thDateTime(r.at) + '</td><td class="small">' + esc(userName(r.empCode)) + '</td><td>' + (r.result !== 'SUCCESS' ? '<span class="pill st-RETURN">' + esc(A[r.action] || r.action) + '</span>' : esc(A[r.action] || r.action)) + '</td><td class="small">' + esc(r.module) + '</td><td class="small">' + esc(r.target) + '</td><td class="hide-sm t2 wrap-any" style="max-width:320px">' + esc(r.detail) + '</td></tr>'; }).join('') + '</tbody></table></div>';
      }, fail);
    };
    $('#auQ').oninput = debounce(function () { load(this.value); }, 400);
    load();
  },

  /* ---------------- เกี่ยวกับระบบ */
  tab_about: function (box) {
    this.needAdmin(function (a) {
      var i = a.info;
      box.innerHTML = '<div class="grid g2"><div class="card"><div class="row">' + mascot(96) + '<div class="flex1"><h2>PayPop <span class="muted small">v' + esc(i.version) + '</span></h2><p class="muted" style="margin:4px 0">ระบบสรุปบันทึกการจ่าย งานเงินเดือน ฝ่ายทรัพยากรบุคคล</p></div></div>' +
        '<dl class="kv mt12"><dt>หน้าเว็บ build</dt><dd>' + esc(APP_BUILD) + '</dd><dt>หลังบ้าน build</dt><dd>' + esc(i.build) + (i.build === APP_BUILD ? ' <span class="pill st-APPROVED">ตรงกัน</span>' : ' <span class="pill st-RETURN">ไม่ตรง</span>') + '</dd><dt>SmartAPI</dt><dd>' + (i.smartapi ? 'เชื่อมแล้ว' : 'ยังไม่ได้ตั้งค่า') + '</dd><dt>ฐานข้อมูล</dt><dd><a href="' + esc(i.dbUrl) + '" target="_blank" rel="noopener">เปิด Google Sheet</a></dd></dl></div>' +
        '<div class="card"><h3>' + icon('db') + 'ขนาดข้อมูล</h3><dl class="kv mt12"><dt>เอกสารในรอบที่เปิด</dt><dd>' + fmt0(i.counts.docsOpen) + '</dd><dt>ดัชนีเอกสารทั้งหมด</dt><dd>' + fmt0(i.counts.docIndex) + '</dd><dt>รายการรายได้</dt><dd>' + fmt0(i.counts.items) + '</dd><dt>รอบ</dt><dd>' + fmt0(i.counts.rounds) + '</dd><dt>ประวัติการเปลี่ยนแปลง</dt><dd>' + fmt0(i.counts.history) + '</dd></dl>' +
        '<button class="btn mt12" onclick="App.resync()">' + icon('refresh') + 'ล้างข้อมูลที่จำในเครื่องแล้วซิงก์ใหม่</button></div></div>';
    });
  }
};

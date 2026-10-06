/**
 * xlsx.js — เขียนไฟล์ Excel (.xlsx) มีรูปแบบ (หัวตาราง สีพื้น ตัวเลขเงิน ผสานเซลล์ ตรึงแถว) และอ่านไฟล์ Export ของ HRMi
 * ไม่พึ่ง CDN · อ่าน .xls (XML Spreadsheet 2003) · .xlsx (ใช้ DecompressionStream ของเบราว์เซอร์) · .csv/.txt
 */
var XLSX = (function () {
  /* ---------------------------------------------------- ZIP (store, no compression) */
  var CRC = (function () { var t = [], c, n, k; for (n = 0; n < 256; n++) { c = n; for (k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(u8) { var c = 0xFFFFFFFF; for (var i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  var enc = new TextEncoder();
  function zip(files) {
    var parts = [], central = [], offset = 0;
    files.forEach(function (f) {
      var name = enc.encode(f.name), data = typeof f.data === 'string' ? enc.encode(f.data) : f.data, crc = crc32(data);
      var h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
      h.setUint16(10, 0, true); h.setUint16(12, 0x21, true); h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true);
      h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
      parts.push(new Uint8Array(h.buffer), name, data);
      var c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
      c.setUint16(12, 0, true); c.setUint16(14, 0x21, true); c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true);
      c.setUint16(28, name.length, true); c.setUint32(42, offset, true);
      central.push(new Uint8Array(c.buffer), name);
      offset += 30 + name.length + data.length;
    });
    var csize = central.reduce(function (s, a) { return s + a.length; }, 0);
    var e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, csize, true); e.setUint32(16, offset, true);
    return new Blob(parts.concat(central, [new Uint8Array(e.buffer)]), { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  /* ---------------------------------------------------- styles */
  var STY = { def: 0, head: 1, money: 2, text: 3, title: 4, totMoney: 5, totText: 6, sub: 7, int: 8, wrap: 9, link: 10, ok: 11, bad: 12, warn: 13, date: 3 };
  var STYLES = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00;[Red]-#,##0.00"/></numFmts>' +
    '<fonts count="6"><font><sz val="11"/><name val="Tahoma"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Tahoma"/></font>' +
    '<font><b/><sz val="15"/><color rgb="FF1B2236"/><name val="Tahoma"/></font><font><b/><sz val="11"/><name val="Tahoma"/></font><font><sz val="10"/><color rgb="FF6B7490"/><name val="Tahoma"/></font>' +
    '<font><b/><sz val="11"/><color rgb="FF15803D"/><name val="Tahoma"/></font></fonts>' +
    '<fills count="7"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FFFF4F7B"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFF1D6"/></patternFill></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FFDCFCE7"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFE4E9"/></patternFill></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FFFEF3C7"/></patternFill></fill></fills>' +
    '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFD2D8E6"/></left><right style="thin"><color rgb="FFD2D8E6"/></right><top style="thin"><color rgb="FFD2D8E6"/></top><bottom style="thin"><color rgb="FFD2D8E6"/></bottom><diagonal/></border></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="14">' +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
    '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' +
    '<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>' +
    '<xf numFmtId="49" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment vertical="top"/></xf>' +
    '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
    '<xf numFmtId="164" fontId="3" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>' +
    '<xf numFmtId="49" fontId="3" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>' +
    '<xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
    '<xf numFmtId="3" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf>' +
    '<xf numFmtId="49" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>' +
    '<xf numFmtId="49" fontId="5" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1"/>' +
    '<xf numFmtId="49" fontId="0" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1"/>' +
    '<xf numFmtId="49" fontId="0" fillId="5" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1"/>' +
    '<xf numFmtId="49" fontId="0" fillId="6" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1"/>' +
    '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';

  function xe(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ''); }
  function colName(i) { var s = ''; i++; while (i > 0) { var m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; }
  function sheetXml(sh) {
    var rows = sh.rows || [], out = [];
    out.push('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>');
    if (sh.freeze) out.push('<sheetViews><sheetView workbookViewId="0"><pane ySplit="' + sh.freeze + '" topLeftCell="A' + (sh.freeze + 1) + '" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>');
    if (sh.cols) out.push('<cols>' + sh.cols.map(function (w, i) { return '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>'; }).join('') + '</cols>');
    out.push('<sheetData>');
    rows.forEach(function (row, r) {
      if (!row) return;
      var cells = [];
      row.forEach(function (cell, c) {
        if (cell === null || cell === undefined || cell === '') { if (cell === '' && row.__style) cells.push('<c r="' + colName(c) + (r + 1) + '" s="' + STY[row.__style] + '"/>'); return; }
        var v = cell, s = null;
        if (typeof cell === 'object' && !(cell instanceof Date)) { v = cell.v; s = cell.s; }
        var sid = STY[s || (typeof v === 'number' ? 'money' : 'text')];
        if (sid == null) sid = 0;
        var ref = colName(c) + (r + 1);
        if (v === null || v === undefined || v === '') { cells.push('<c r="' + ref + '" s="' + sid + '"/>'); return; }
        if (typeof v === 'number' && isFinite(v)) cells.push('<c r="' + ref + '" s="' + sid + '"><v>' + v + '</v></c>');
        else cells.push('<c r="' + ref + '" s="' + sid + '" t="inlineStr"><is><t xml:space="preserve">' + xe(v) + '</t></is></c>');
      });
      out.push('<row r="' + (r + 1) + '"' + (sh.heights && sh.heights[r] ? ' ht="' + sh.heights[r] + '" customHeight="1"' : '') + '>' + cells.join('') + '</row>');
    });
    out.push('</sheetData>');
    if (sh.merges && sh.merges.length) out.push('<mergeCells count="' + sh.merges.length + '">' + sh.merges.map(function (m) { return '<mergeCell ref="' + m + '"/>'; }).join('') + '</mergeCells>');
    out.push('<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/>');
    out.push('<pageSetup paperSize="9" orientation="' + (sh.landscape ? 'landscape' : 'portrait') + '" fitToWidth="1" fitToHeight="0"/>');
    out.push('</worksheet>');
    return out.join('');
  }
  function safeSheetName(n, used) {
    var s = String(n || 'Sheet').replace(/[\\\/\?\*\[\]:]/g, ' ').slice(0, 31).trim() || 'Sheet', base = s, i = 2;
    while (used[s]) { s = base.slice(0, 28) + ' ' + i++; }
    used[s] = 1; return s;
  }
  /** sheets: [{name, rows:[[cell]], cols:[width], merges:['A1:D1'], freeze:n, landscape}] → Blob */
  function book(sheets) {
    var used = {}, names = sheets.map(function (s) { return safeSheetName(s.name, used); });
    var files = [
      { name: '[Content_Types].xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        sheets.map(function (s, i) { return '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'; }).join('') + '</Types>' },
      { name: '_rels/.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
      { name: 'xl/workbook.xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
        names.map(function (n, i) { return '<sheet name="' + xe(n) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>'; }).join('') + '</sheets></workbook>' },
      { name: 'xl/_rels/workbook.xml.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        sheets.map(function (s, i) { return '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>'; }).join('') +
        '<Relationship Id="rId' + (sheets.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' },
      { name: 'xl/styles.xml', data: STYLES }
    ];
    sheets.forEach(function (s, i) { files.push({ name: 'xl/worksheets/sheet' + (i + 1) + '.xml', data: sheetXml(s) }); });
    return zip(files);
  }
  function download(blob, filename) {
    var a = document.createElement('a'), url = URL.createObjectURL(blob);
    a.href = url; a.download = filename; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1500);
  }

  /* ---------------------------------------------------- readers */
  function readXml2003(text) {
    var doc = new DOMParser().parseFromString(text, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) throw new Error('อ่านไฟล์ไม่ได้ (ไฟล์เสียหรือไม่ใช่ไฟล์ Export ของ HRMi)');
    var ws = doc.getElementsByTagNameNS('*', 'Worksheet')[0];
    if (!ws) throw new Error('ไม่พบแผ่นงานในไฟล์');
    var rows = ws.getElementsByTagNameNS('*', 'Row'), grid = [];
    for (var i = 0; i < rows.length; i++) {
      var cells = rows[i].getElementsByTagNameNS('*', 'Cell'), row = [], col = 0;
      for (var j = 0; j < cells.length; j++) {
        var ix = cells[j].getAttribute('ss:Index') || cells[j].getAttributeNS('urn:schemas-microsoft-com:office:spreadsheet', 'Index');
        col = ix ? +ix - 1 : col;
        var d = cells[j].getElementsByTagNameNS('*', 'Data')[0];
        row[col] = d ? d.textContent : '';
        col++;
      }
      for (var k = 0; k < row.length; k++) if (row[k] === undefined) row[k] = '';
      grid.push(row);
    }
    return grid;
  }
  function u16(b, o) { return b[o] | (b[o + 1] << 8); }
  function u32(b, o) { return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0; }
  function inflate(data) {
    if (typeof DecompressionStream === 'undefined') return Promise.reject(new Error('เบราว์เซอร์นี้อ่าน .xlsx ไม่ได้ กรุณาใช้ Chrome/Edge รุ่นใหม่ หรือคัดลอกข้อมูลมาวางแทน'));
    var ds = new DecompressionStream('deflate-raw');
    var w = new Blob([data]).stream().pipeThrough(ds);
    return new Response(w).arrayBuffer().then(function (ab) { return new Uint8Array(ab); });
  }
  function unzip(buf) {
    var b = new Uint8Array(buf), eocd = -1;
    for (var i = b.length - 22; i >= 0; i--) if (u32(b, i) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) return Promise.reject(new Error('ไฟล์ .xlsx เสียหาย'));
    var n = u16(b, eocd + 10), off = u32(b, eocd + 16), files = {}, jobs = [], dec = new TextDecoder();
    for (var k = 0; k < n; k++) {
      var method = u16(b, off + 10), csize = u32(b, off + 20), nlen = u16(b, off + 28), elen = u16(b, off + 30), clen = u16(b, off + 32), lho = u32(b, off + 42);
      var name = dec.decode(b.subarray(off + 46, off + 46 + nlen));
      var start = lho + 30 + u16(b, lho + 26) + u16(b, lho + 28), raw = b.subarray(start, start + csize);
      (function (name, method, raw) {
        jobs.push((method === 0 ? Promise.resolve(raw) : inflate(raw)).then(function (u) { files[name] = dec.decode(u); }));
      })(name, method, raw);
      off += 46 + nlen + elen + clen;
    }
    return Promise.all(jobs).then(function () { return files; });
  }
  function readXlsx(buf) {
    return unzip(buf).then(function (f) {
      var ss = [], P = new DOMParser();
      if (f['xl/sharedStrings.xml']) {
        var sd = P.parseFromString(f['xl/sharedStrings.xml'], 'application/xml'), si = sd.getElementsByTagNameNS('*', 'si');
        for (var i = 0; i < si.length; i++) { var ts = si[i].getElementsByTagNameNS('*', 't'), s = ''; for (var j = 0; j < ts.length; j++) s += ts[j].textContent; ss.push(s); }
      }
      var sheet = f['xl/worksheets/sheet1.xml'];
      if (!sheet) throw new Error('ไม่พบแผ่นงานแรกในไฟล์');
      var d = P.parseFromString(sheet, 'application/xml'), rows = d.getElementsByTagNameNS('*', 'row'), grid = [];
      for (var r = 0; r < rows.length; r++) {
        var cs = rows[r].getElementsByTagNameNS('*', 'c'), row = [];
        for (var c = 0; c < cs.length; c++) {
          var ref = cs[c].getAttribute('r') || '', col = 0, m = ref.match(/^[A-Z]+/);
          if (m) for (var q = 0; q < m[0].length; q++) col = col * 26 + (m[0].charCodeAt(q) - 64);
          col = col ? col - 1 : row.length;
          var t = cs[c].getAttribute('t'), v = cs[c].getElementsByTagNameNS('*', 'v')[0], val = v ? v.textContent : '';
          if (t === 's') val = ss[+val] || '';
          else if (t === 'inlineStr') { var it = cs[c].getElementsByTagNameNS('*', 't')[0]; val = it ? it.textContent : ''; }
          row[col] = val;
        }
        for (var z = 0; z < row.length; z++) if (row[z] === undefined) row[z] = '';
        grid.push(row);
      }
      return grid;
    });
  }
  /** ไฟล์ใด ๆ → Promise<{grid}|{text}> */
  function readFile(file) {
    var name = String(file.name || '').toLowerCase();
    return new Promise(function (res, rej) {
      var fr = new FileReader();
      fr.onerror = function () { rej(new Error('อ่านไฟล์ไม่สำเร็จ')); };
      if (/\.xlsx$/.test(name)) { fr.onload = function () { readXlsx(fr.result).then(function (g) { res({ grid: g }); }, rej); }; fr.readAsArrayBuffer(file); return; }
      fr.onload = function () {
        var t = String(fr.result || '');
        if (/^\s*<\?xml|<Workbook/i.test(t.slice(0, 400))) { try { res({ grid: readXml2003(t) }); } catch (e) { rej(e); } return; }
        if (/<table/i.test(t.slice(0, 2000))) {
          var d = new DOMParser().parseFromString(t, 'text/html'), g = [];
          d.querySelectorAll('tr').forEach(function (tr) { g.push(Array.prototype.map.call(tr.querySelectorAll('td,th'), function (x) { return x.textContent; })); });
          res({ grid: g }); return;
        }
        res({ text: t });
      };
      fr.readAsText(file, 'UTF-8');
    });
  }
  return { book: book, download: download, readFile: readFile, readXml2003: readXml2003, readXlsx: readXlsx, colName: colName, zip: zip };
})();

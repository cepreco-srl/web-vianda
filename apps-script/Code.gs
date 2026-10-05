/**
 * Viands Sur — Backend de pedidos semanales
 * ------------------------------------------------------------
 * Se pega en: Google Sheet → Extensiones → Apps Script.
 * Hojas que usa (se crean solas con "Viands Sur → Preparar planilla"):
 *   Config    → semana actual, fecha de cierre, email para resúmenes
 *   Menu      → una fila por día, una columna por opción (A/B/C)
 *   Empresas  → código (va en el link) y nombre de cada empresa
 *   Pedidos   → una fila por persona por semana (se completa sola)
 *   Resumen   → totales por empresa / día / opción (se recalcula solo)
 */

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const NO_PIDE = '—';

// ─────────────── MENÚ EN LA PLANILLA ───────────────

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Viands Sur')
    .addItem('Preparar planilla (primera vez)', 'setup')
    .addItem('Recalcular resumen', 'armarResumen')
    .addItem('Enviarme el resumen por email', 'enviarResumen')
    .addToUi();
}

function setup() {
  const ss = SpreadsheetApp.getActive();

  hoja_(ss, 'Config', [
    ['Semana', 'Semana del 12 al 16 de octubre'],
    ['Cierre', new Date(2026, 9, 9, 12, 0)],
    ['Email resumen', Session.getActiveUser().getEmail()],
  ]);

  hoja_(ss, 'Menu', [
    ['Día', 'A · Clásico', 'B · Ensalada', 'C · Liviano'],
    ['Lunes', 'Milanesa de ternera con puré', 'César con pollo grillado', 'Merluza al vapor con vegetales'],
    ['Martes', 'Ñoquis con bolognesa', 'Caprese con rúcula', 'Pechuga grillada con calabaza'],
    ['Miércoles', 'Pollo al horno con papas', 'Quinoa, garbanzos y palta', 'Tortilla de espinaca'],
    ['Jueves', 'Guiso de lentejas', 'Atún, huevo y hojas verdes', 'Wok de vegetales y pollo'],
    ['Viernes', 'Tarta de jamón y queso', 'Mediterránea con queso feta', 'Hamburguesa de lentejas'],
  ]);

  hoja_(ss, 'Empresas', [
    ['Código', 'Nombre'],
    ['demo', 'Empresa Demo'],
  ]);

  hoja_(ss, 'Pedidos', [
    ['Fecha', 'Semana', 'Código', 'Empresa', 'Nombre'].concat(DIAS, ['Observaciones']),
  ]);

  hoja_(ss, 'Resumen', [['Todavía no hay pedidos']]);
}

function hoja_(ss, nombre, filas) {
  if (ss.getSheetByName(nombre)) return;
  const sh = ss.insertSheet(nombre);
  sh.getRange(1, 1, filas.length, filas[0].length).setValues(filas);
  sh.getRange(1, 1, 1, filas[0].length).setFontWeight('bold');
  sh.setFrozenRows(1);
  sh.autoResizeColumns(1, filas[0].length);
}

// ─────────────── LECTURA DE CONFIG ───────────────

function config_() {
  const vals = SpreadsheetApp.getActive().getSheetByName('Config').getDataRange().getValues();
  const c = {};
  vals.forEach(r => { c[String(r[0]).trim().toLowerCase()] = r[1]; });
  return {
    semana: String(c['semana'] || '').trim(),
    cierre: c['cierre'] instanceof Date ? c['cierre'] : null,
    email: String(c['email resumen'] || '').trim(),
  };
}

function menu_() {
  const vals = SpreadsheetApp.getActive().getSheetByName('Menu').getDataRange().getDisplayValues();
  const opciones = vals[0].slice(1).map((h, i) => {
    const m = String(h).match(/^\s*([A-Z])\s*[·\-:]\s*(.+)$/);
    return { key: m ? m[1] : String.fromCharCode(65 + i), label: m ? m[2].trim() : String(h).trim() };
  });
  const dias = DIAS.map(dia => {
    const fila = vals.find(r => String(r[0]).trim().toLowerCase() === dia.toLowerCase()) || [];
    const platos = {};
    opciones.forEach((o, i) => {
      const p = String(fila[i + 1] || '').trim();
      if (p) platos[o.key] = p;
    });
    return { dia, platos };
  });
  return { opciones, dias };
}

function empresa_(codigo) {
  codigo = String(codigo || '').trim().toLowerCase();
  if (!codigo) return null;
  const vals = SpreadsheetApp.getActive().getSheetByName('Empresas').getDataRange().getValues();
  const fila = vals.slice(1).find(r => String(r[0]).trim().toLowerCase() === codigo);
  return fila ? { codigo, nombre: String(fila[1]).trim() } : null;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ─────────────── API ───────────────

/** GET ?e=codigo → menú de la semana para esa empresa */
function doGet(e) {
  const emp = empresa_(e.parameter.e);
  if (!emp) return json_({ ok: false, error: 'Link inválido. Pedile el link correcto a Viands Sur.' });
  const cfg = config_();
  const abierto = !cfg.cierre || new Date() < cfg.cierre;
  return json_(Object.assign({
    ok: true,
    empresa: emp.nombre,
    semana: cfg.semana,
    cierre: cfg.cierre ? cfg.cierre.toISOString() : null,
    abierto,
  }, menu_()));
}

/** POST {e, nombre, elecciones:{Lunes:'A',...}, obs} → guarda/actualiza el pedido */
function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'Datos inválidos.' }); }

  const emp = empresa_(body.e);
  if (!emp) return json_({ ok: false, error: 'Link inválido.' });

  const cfg = config_();
  if (cfg.cierre && new Date() >= cfg.cierre) {
    return json_({ ok: false, error: 'Los pedidos de esta semana ya cerraron.' });
  }

  const nombre = String(body.nombre || '').replace(/\s+/g, ' ').trim().slice(0, 80);
  if (nombre.length < 3) return json_({ ok: false, error: 'Escribí tu nombre y apellido.' });

  const { opciones, dias } = menu_();
  const elecciones = body.elecciones || {};
  const fila = DIAS.map((dia, i) => {
    const k = String(elecciones[dia] || '');
    const plato = dias[i].platos[k];
    if (!plato) return NO_PIDE;
    const op = opciones.find(o => o.key === k);
    return k + ' · ' + (op ? op.label + ' — ' : '') + plato;
  });
  if (fila.every(v => v === NO_PIDE)) return json_({ ok: false, error: 'Elegí al menos un día.' });

  const obs = String(body.obs || '').trim().slice(0, 300);

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = SpreadsheetApp.getActive().getSheetByName('Pedidos');
    const datos = [new Date(), cfg.semana, emp.codigo, emp.nombre, nombre].concat(fila, [obs]);

    // Si la misma persona ya pidió esta semana, se pisa su pedido (no se duplica)
    const vals = sh.getDataRange().getValues();
    const clave = nombre.toLowerCase();
    let filaExistente = -1;
    for (let r = 1; r < vals.length; r++) {
      if (vals[r][1] === cfg.semana && vals[r][2] === emp.codigo && String(vals[r][4]).toLowerCase() === clave) {
        filaExistente = r + 1;
        break;
      }
    }
    if (filaExistente > 0) sh.getRange(filaExistente, 1, 1, datos.length).setValues([datos]);
    else sh.appendRow(datos);

    armarResumen();
    return json_({ ok: true, actualizado: filaExistente > 0 });
  } finally {
    lock.releaseLock();
  }
}

// ─────────────── RESUMEN ───────────────

/** Tabla por empresa: cuántas A/B/C por día + total, para la semana actual */
function armarResumen() {
  const ss = SpreadsheetApp.getActive();
  const cfg = config_();
  const { opciones } = menu_();
  const pedidos = ss.getSheetByName('Pedidos').getDataRange().getValues().slice(1)
    .filter(r => r[1] === cfg.semana);

  const porEmpresa = {};
  pedidos.forEach(r => { (porEmpresa[r[3]] = porEmpresa[r[3]] || []).push(r); });

  const ancho = 2 + opciones.length;
  const out = [];
  const negritas = [];
  out.push(pad_([cfg.semana + ' — actualizado ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM HH:mm')], ancho));
  negritas.push(1);

  Object.keys(porEmpresa).sort().forEach(nombreEmp => {
    const filas = porEmpresa[nombreEmp];
    out.push(pad_([], ancho));
    out.push(pad_([nombreEmp + ' (' + filas.length + ' personas)'], ancho));
    negritas.push(out.length);
    out.push(['Día'].concat(opciones.map(o => o.key + ' · ' + o.label), ['Total']));
    negritas.push(out.length);
    DIAS.forEach((dia, d) => {
      const cuenta = opciones.map(o => filas.filter(r => String(r[5 + d]).charAt(0) === o.key).length);
      out.push([dia].concat(cuenta, [cuenta.reduce((a, b) => a + b, 0)]));
    });
    const obs = filas.filter(r => r[10]).map(r => r[4] + ': ' + r[10]);
    if (obs.length) {
      out.push(pad_(['Observaciones'], ancho));
      negritas.push(out.length);
      obs.forEach(o => out.push(pad_([o], ancho)));
    }
  });

  if (!pedidos.length) out.push(pad_(['Todavía no hay pedidos para esta semana.'], ancho));

  const sh = ss.getSheetByName('Resumen');
  sh.clear();
  sh.getRange(1, 1, out.length, ancho).setValues(out);
  negritas.forEach(n => sh.getRange(n, 1, 1, ancho).setFontWeight('bold'));
  return out;
}

function pad_(arr, n) {
  while (arr.length < n) arr.push('');
  return arr;
}

/** Manda el resumen por email (se puede programar con un activador al cierre) */
function enviarResumen() {
  const cfg = config_();
  if (!cfg.email) throw new Error('Completá "Email resumen" en la hoja Config.');
  const filas = armarResumen();
  const texto = filas.map(r => r.filter(c => c !== '').join('   ')).join('\n');
  MailApp.sendEmail(cfg.email, 'Pedidos Viands Sur — ' + cfg.semana, texto + '\n\nDetalle por persona: ' + SpreadsheetApp.getActive().getUrl());
}

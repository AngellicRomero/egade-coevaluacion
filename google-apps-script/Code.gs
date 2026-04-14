// ═══════════════════════════════════════════════════════
//  CoEval — Google Apps Script
//  Recibe datos desde la app y los guarda en Google Sheets
// ═══════════════════════════════════════════════════════

// ► PEGA AQUÍ el ID de tu Google Sheet (la parte larga de la URL)
//   Ejemplo: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms'
var SPREADSHEET_ID  = '1E9ZTSQCQQBWazTitEEEBwE6dYXXK2fG-sWK7luwM3XA';

var SHEET_FORMS     = 'Formularios';
var SHEET_RESPONSES = 'Respuestas';

// ── Punto de entrada: recibe POST desde la app ──────────
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss   = SpreadsheetApp.openById(SPREADSHEET_ID);

    if (data.type === 'form_created') {
      handleFormCreated(ss, data);
    } else if (data.type === 'response') {
      handleResponse(ss, data);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── Guarda un formulario nuevo en la hoja "Formularios" ─
function handleFormCreated(ss, data) {
  var sheet = getOrCreateSheet(ss, SHEET_FORMS, [
    'Fecha Creación', 'Código', 'Título', 'Curso',
    'Profesor', 'Email Profesor', 'Criterios', 'Link Alumnos'
  ]);

  var criteriaStr = (data.criteria || [])
    .map(function(c) { return c.label; })
    .join(' | ');

  sheet.appendRow([
    new Date(data.createdAt),
    data.code,
    data.title,
    data.courseName,
    data.profName,
    data.profEmail,
    criteriaStr,
    data.studentUrl
  ]);
}

// ── Guarda cada evaluación enviada por un alumno ────────
function handleResponse(ss, data) {
  var sheet = getOrCreateSheet(ss, SHEET_RESPONSES, [
    'Fecha', 'Hora', 'Código', 'Curso', 'Profesor',
    'Evaluador', 'Equipo', 'Evaluado', 'Puntajes por criterio', 'Promedio', 'Comentario'
  ]);

  var d          = new Date(data.timestamp);
  var criteria   = data.criteria   || [];
  var evals      = data.evaluations || [];

  evals.forEach(function(ev) {
    // "Criterio A: 4 | Criterio B: 5 | …"
    var scoresStr = criteria.map(function(c) {
      return c.label + ': ' + (ev.scores[c.id] || '-');
    }).join(' | ');

    // Promedio numérico
    var nums = criteria
      .map(function(c) { return ev.scores[c.id]; })
      .filter(function(s) { return typeof s === 'number'; });
    var avg = nums.length
      ? (nums.reduce(function(a, b) { return a + b; }, 0) / nums.length).toFixed(2)
      : '';

    sheet.appendRow([
      Utilities.formatDate(d, Session.getScriptTimeZone(), 'dd/MM/yyyy'),
      Utilities.formatDate(d, Session.getScriptTimeZone(), 'HH:mm:ss'),
      data.code,
      data.courseName,
      data.profName,
      data.evaluatorName,
      data.groupName,
      ev.peerName,
      scoresStr,
      avg,
      ev.comment || ''
    ]);
  });
}

// ── Crea la hoja con encabezados si no existe ───────────
function getOrCreateSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);

    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);
    headerRange.setBackground('#1a1a1a');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    headerRange.setFontSize(11);

    sheet.setFrozenRows(1);
    sheet.setColumnWidths(1, headers.length, 170);
  }
  return sheet;
}

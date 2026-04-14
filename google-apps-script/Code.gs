var SPREADSHEET_ID  = '1E9ZTSQCQQBWazTitEEEBwE6dYXXK2fG-sWK7luwM3XA';
var SHEET_FORMS     = 'Formularios';
var SHEET_RESPONSES = 'Respuestas';

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss   = SpreadsheetApp.openById(SPREADSHEET_ID);
    if (data.type === 'form_created') { handleFormCreated(ss, data); }
    else if (data.type === 'response') { handleResponse(ss, data); }
    return ContentService.createTextOutput(JSON.stringify({ok:true})).setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ok:false,error:err.message})).setMimeType(ContentService.MimeType.JSON);
  }
}

function handleFormCreated(ss, data) {
  var sheet = getOrCreateSheet(ss, SHEET_FORMS, ['Fecha Creación','Código','Título','Curso','Profesor','Email Profesor','Criterios','Link Alumnos']);
  var criteriaStr = (data.criteria||[]).map(function(c){return c.label}).join(' | ');
  sheet.appendRow([new Date(data.createdAt), data.code, data.title, data.courseName, data.profName, data.profEmail, criteriaStr, data.studentUrl]);
}

function handleResponse(ss, data) {
  var sheet = getOrCreateSheet(ss, SHEET_RESPONSES, ['Fecha','Hora','Código','Curso','Profesor','Evaluador','Equipo','Evaluado','Puntajes por criterio','Promedio','Comentario']);
  var d = new Date(data.timestamp);
  var criteria = data.criteria||[], evals = data.evaluations||[];
  evals.forEach(function(ev) {
    var scoresStr = criteria.map(function(c){return c.label+': '+(ev.scores[c.id]||'-')}).join(' | ');
    var nums = criteria.map(function(c){return ev.scores[c.id]}).filter(function(s){return typeof s==='number'});
    var avg = nums.length ? (nums.reduce(function(a,b){return a+b},0)/nums.length).toFixed(2) : '';
    sheet.appendRow([Utilities.formatDate(d,Session.getScriptTimeZone(),'dd/MM/yyyy'), Utilities.formatDate(d,Session.getScriptTimeZone(),'HH:mm:ss'), data.code, data.courseName, data.profName, data.evaluatorName, data.groupName, ev.peerName, scoresStr, avg, ev.comment||'']);
  });
}

function getOrCreateSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    var r = sheet.getRange(1,1,1,headers.length);
    r.setValues([headers]); r.setBackground('#1a1a1a'); r.setFontColor('#ffffff'); r.setFontWeight('bold');
    sheet.setFrozenRows(1); sheet.setColumnWidths(1,headers.length,170);
  }
  return sheet;
}

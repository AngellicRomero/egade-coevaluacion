var SPREADSHEET_ID  = '1E9ZTSQCQQBWazTitEEEBwE6dYXXK2fG-sWK7luwM3XA';
var SHEET_FORMS     = 'Formularios';
var SHEET_RESPONSES = 'Respuestas';

// ── GET: guarda datos + envía correo (llega desde el navegador vía URL params) ──
function doGet(e) {
  var action = e && e.parameter ? e.parameter.action : '';

  if (action === 'form_created') {
    try {
      var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      var p  = e.parameter;

      // 1. Guardar en hoja
      var sheet = getOrCreateSheet(ss, SHEET_FORMS,
        ['Fecha Creación','Código','Profesor','Título','Curso','Email Profesor','Criterios','Link Alumnos']);
      var criteriaStr = p.criteria || '';
      sheet.appendRow([
        new Date(Number(p.ts || p.createdAt)), p.code, p.profName, p.title,
        p.courseName, p.profEmail, criteriaStr, p.studentUrl
      ]);

      // 2. Enviar correo bilingüe (idioma principal según p.lang, traducción al final)
      var isEN    = p.lang === 'en';
      var sep     = '────────────────────────────';
      var divider = '════════════════════════════';
      var ts      = new Date(Number(p.ts || p.createdAt));

      var blockEN = [
        'Hi ' + p.profName + ',',
        '',
        'Below are the access credentials for your co-evaluation form.',
        'Save this email as a backup.',
        '',
        sep,
        '  FORM DETAILS',
        sep,
        '  Professor : ' + p.profName,
        '  Course    : ' + p.courseName,
        '  Code      : ' + p.code,
        '  Password  : ' + p.password,
        '  Created   : ' + Utilities.formatDate(ts, Session.getScriptTimeZone(), 'MM/dd/yyyy HH:mm'),
        sep,
        '',
        'Student access link:',
        p.studentUrl,
        '',
        'Log in to the results panel with your code and password.',
        '',
        '— EGADE Loop | Peer evaluation platform',
        '  Tecnológico de Monterrey – EGADE'
      ].join('\n');

      var blockES = [
        'Hola ' + p.profName + ',',
        '',
        'Tu formulario de coevaluación fue creado exitosamente.',
        'Guarda este correo como respaldo de tus credenciales de acceso.',
        '',
        sep,
        '  DATOS DEL FORMULARIO',
        sep,
        '  Profesor  : ' + p.profName,
        '  Curso     : ' + p.courseName,
        '  Código    : ' + p.code,
        '  Contraseña: ' + p.password,
        '  Creado    : ' + Utilities.formatDate(ts, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm'),
        sep,
        '',
        'Link de acceso para alumnos:',
        p.studentUrl,
        '',
        'Ingresa al panel de resultados con tu código y contraseña.',
        '',
        '— EGADE Loop | Plataforma de evaluación entre pares',
        '  Tecnológico de Monterrey – EGADE'
      ].join('\n');

      var subj = isEN
        ? '[EGADE Loop] Your form credentials – ' + p.courseName
        : '[EGADE Loop] Credenciales de tu formulario – ' + p.courseName;
      var body = isEN
        ? blockEN + '\n\n' + divider + '\n\n' + blockES
        : blockES + '\n\n' + divider + '\n\n' + blockEN;

      MailApp.sendEmail({ to: p.profEmail, subject: subj, body: body });

      return ContentService.createTextOutput('ok').setMimeType(ContentService.MimeType.TEXT);
    } catch(err) {
      return ContentService.createTextOutput('error:' + err.message).setMimeType(ContentService.MimeType.TEXT);
    }
  }

  if (action === 'response') {
    try {
      var ss2   = SpreadsheetApp.openById(SPREADSHEET_ID);
      var data2 = JSON.parse(decodeURIComponent(e.parameter.data));
      handleResponse(ss2, data2);
      return ContentService.createTextOutput('ok').setMimeType(ContentService.MimeType.TEXT);
    } catch(err2) {
      return ContentService.createTextOutput('error:' + err2.message).setMimeType(ContentService.MimeType.TEXT);
    }
  }

  // ── GET: devuelve la URL del alumno guardada para un código ──────────────────
  if (action === 'getStudentUrl') {
    try {
      var ss3    = SpreadsheetApp.openById(SPREADSHEET_ID);
      var sheet3 = ss3.getSheetByName(SHEET_FORMS);
      if (!sheet3) return ContentService.createTextOutput('notfound').setMimeType(ContentService.MimeType.TEXT);
      var rows   = sheet3.getDataRange().getValues();
      var code3  = (e.parameter.code || '').toUpperCase().trim();
      for (var i = rows.length - 1; i >= 1; i--) {
        if (String(rows[i][1]).toUpperCase().trim() === code3) {
          var surl3 = rows[i][7];
          return ContentService.createTextOutput(surl3 || 'notfound').setMimeType(ContentService.MimeType.TEXT);
        }
      }
      return ContentService.createTextOutput('notfound').setMimeType(ContentService.MimeType.TEXT);
    } catch(err3) {
      return ContentService.createTextOutput('error:' + err3.message).setMimeType(ContentService.MimeType.TEXT);
    }
  }

  // Health check
  return ContentService.createTextOutput('CoEval OK — ' + new Date().toISOString())
    .setMimeType(ContentService.MimeType.TEXT);
}

// ── POST: fallback (por si acaso llega algún POST) ──────────────────────────
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

// ── Guarda formulario (usado por doPost fallback) ───────────────────────────
function handleFormCreated(ss, data) {
  var sheet = getOrCreateSheet(ss, SHEET_FORMS,
    ['Fecha Creación','Código','Profesor','Título','Curso','Email Profesor','Criterios','Link Alumnos']);
  var criteriaStr = (data.criteria||[]).map(function(c){return c.label}).join(' | ');
  sheet.appendRow([new Date(data.createdAt), data.code, data.profName, data.title,
    data.courseName, data.profEmail, criteriaStr, data.studentUrl]);
  if (data.profEmail && data.password) { sendCredentialMail(data); }
}

function sendCredentialMail(d) {
  var sep  = '────────────────────────────';
  var body = [
    'Hola ' + d.profName + ',',
    '',
    'Tu formulario de coevaluación fue creado exitosamente.',
    'Guarda este correo como respaldo de tus credenciales de acceso.',
    '',
    sep, '  DATOS DEL FORMULARIO', sep,
    '  Profesor  : ' + d.profName,
    '  Curso     : ' + d.courseName,
    '  Código    : ' + d.code,
    '  Contraseña: ' + d.password,
    '  Creado    : ' + Utilities.formatDate(new Date(d.createdAt||d.ts), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm'),
    sep, '',
    'Link de acceso para alumnos:', d.studentUrl, '',
    'Ingresa al panel de resultados con tu código y contraseña.', '',
    '— CoEval | Plataforma de coevaluación entre pares',
    '  Tecnológico de Monterrey – EGADE'
  ].join('\n');
  MailApp.sendEmail({
    to: d.profEmail,
    subject: '[CoEval] Credenciales de tu formulario – ' + d.courseName,
    body: body
  });
}

// ── Guarda respuestas de alumnos ────────────────────────────────────────────
function handleResponse(ss, data) {
  var sheet = getOrCreateSheet(ss, SHEET_RESPONSES,
    ['Fecha','Hora','Código','Curso','Profesor','Evaluador','Equipo','Evaluado','Puntajes por criterio','Promedio','Comentario']);
  var d        = new Date(data.timestamp);
  var criteria = data.criteria   || [];
  var evals    = data.evaluations || [];
  evals.forEach(function(ev) {
    var scoresStr = criteria.map(function(c){return c.label+': '+(ev.scores[c.id]||'-')}).join(' | ');
    var nums = criteria.map(function(c){return ev.scores[c.id]}).filter(function(s){return typeof s==='number'});
    var avg  = nums.length ? (nums.reduce(function(a,b){return a+b},0)/nums.length).toFixed(2) : '';
    sheet.appendRow([
      Utilities.formatDate(d,Session.getScriptTimeZone(),'dd/MM/yyyy'),
      Utilities.formatDate(d,Session.getScriptTimeZone(),'HH:mm:ss'),
      data.code, data.courseName, data.profName,
      data.evaluatorName, data.groupName, ev.peerName,
      scoresStr, avg, ev.comment||''
    ]);
  });
}

// ── Crea hoja con encabezados si no existe ──────────────────────────────────
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

// ── Prueba manual ───────────────────────────────────────────────────────────
function testConexion() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var data = {
    code: 'TEST01', title: 'Prueba', courseName: 'Curso Test',
    profName: 'Profesor Test', profEmail: Session.getActiveUser().getEmail(),
    password: 'ClaveTest42', criteria: [{id:'c1',label:'Participación'}],
    studentUrl: 'https://angellicromero.github.io/egade-coevaluacion/?code=TEST01',
    createdAt: Date.now()
  };
  handleFormCreated(ss, data);
  Logger.log('✅ Test completado — revisa el Sheet y tu correo (' + data.profEmail + ')');
}

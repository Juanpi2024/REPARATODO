/**
 * PROYECTO: Plataforma Micro-sitios IA
 * MOTOR: Gemini 2.5 Flash | FECHA: 18-DIC-2025
 */
const SS_ID = "1JG9ZGTrsjfCgNizX7vPvK4RMrFca3-JQ8hzdcuNb2pk"; // NUEVO ID ACTUALIZADO
const MODELO = "gemini-2.5-flash"; 

function doGet(e) {
  const ss = SpreadsheetApp.openById(SS_ID);
  const sheet = ss.getSheets()[0];
  const config = {
    nombre: sheet.getRange("F2").getValue().toString(),
    whatsapp: sheet.getRange("F3").getValue().toString(),
    logo: sheet.getRange("F4").getValue().toString(),
    fondo: sheet.getRange("F5").getValue().toString(),
    slogan: sheet.getRange("F6").getValue().toString(),
    descripcion: sheet.getRange("F7").getValue().toString(),
    descripcion: sheet.getRange("F7").getValue().toString(),
    testimonios: sheet.getRange("H2:H6").getValues().flat().filter(String),
    scriptURL: ScriptApp.getService().getUrl()
  };

  if (e && e.parameter.datos) {
    const data = sheet.getDataRange().getValues().slice(1)
      .filter(f => f[3] === "Publicar")
      .map(f => ({ imagen: f[1], textoProfesional: f[2] }));
    return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
  }

  const tmp = HtmlService.createTemplateFromFile(e && e.parameter.p === 'chat' ? 'chat' : 'index');
  Object.assign(tmp, config); 
  return tmp.evaluate().setTitle(config.nombre).addMetaTag('viewport', 'width=device-width, initial-scale=1').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  const ss = SpreadsheetApp.openById(SS_ID);
  const sheet = ss.getSheets()[0];
  try {
    const data = JSON.parse(e.postData.contents);
    
    if (data.accion === "generar") {
      const opciones = llamarGemini(data.idea);
      return ContentService.createTextOutput(JSON.stringify({ status: "success", opciones: opciones })).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (data.accion === "publicar") {
      sheet.appendRow([data.ideaOriginal, "", data.textoElegido, "Publicar"]);
      SpreadsheetApp.flush();
      return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
    }

    if (data.accion === "leer") {
      const lista = sheet.getDataRange().getValues().slice(1).map((f, i) => ({ index: i + 2, texto: f[2], estado: f[3] }));
      return ContentService.createTextOutput(JSON.stringify({ status: "success", datos: lista })).setMimeType(ContentService.MimeType.JSON);
    }

    if (data.accion === "eliminar") {
      sheet.deleteRow(data.index);
      return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (err) { 
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() })).setMimeType(ContentService.MimeType.JSON); 
  }
}

function llamarGemini(idea) {
  const API_KEY = PropertiesService.getScriptProperties().getProperty('GEMINI_KEY');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent?key=${API_KEY}`;
  const prompt = `Actúa como experto en Copywriting. Usa el framework AIDA para vender la siguiente idea: "${idea}". Genera 3 opciones distintas. Cada opción debe seguir estrictamente: 1. Atención (Beneficio emocional/Gancho). 2. Interés (Dato/Autoridad). 3. Deseo (Resultado final). 4. Acción (CTA a WhatsApp). Responde ÚNICAMENTE un JSON válido: {"opciones": ["Texto AIDA 1", "Texto AIDA 2", "Texto AIDA 3"]}`;
  const payload = { "contents": [{ "parts": [{ "text": prompt }] }], "generationConfig": { "response_mime_type": "application/json" } };
  const res = UrlFetchApp.fetch(url, { "method": "post", "contentType": "application/json", "payload": JSON.stringify(payload), "muteHttpExceptions": true });
  const json = JSON.parse(res.getContentText());
  if (json.error) throw new Error(json.error.message);
  return json.candidates[0].content.parts[0].text.replace(/```json/g, "").replace(/```/g, "").trim();
}
/**
 * Party Split - Google Sheet Database Backend
 * ใช้ Google Apps Script เป็นตัวกลาง และใช้ Google Sheet เป็นฐานข้อมูลกลาง
 */

const PARTY_SPLIT_CONFIG = {
  DB_FILE_NAME: 'Party Split Database',
  DB_SHEET_NAME: 'PartySplitDB',
  LOG_SHEET_NAME: 'ActivityLog',
  DATA_KEY: 'party-split-webapp-v1',
  ADMIN_PASSWORD: 'Admin1234'
};

function doGet(e) {
  if (e && e.parameter && e.parameter.action) {
    return handleApiRequest_(e);
  }

  setupDatabase();

  return createJsonpResponse_(
    e && e.parameter ? e.parameter.callback : '',
    {
      ok: true,
      service: 'Party Split API',
      message: 'Backend is ready. Open the GitHub Pages URL to use the app.'
    }
  );
}

function handleApiRequest_(e) {
  const params = e.parameter || {};
  const action = String(params.action || '');
  let result;

  try {
    if (action === 'getData') {
      result = getData();
    } else if (action === 'saveData') {
      result = saveData(JSON.parse(params.payload || '{}'));
    } else if (action === 'clearData') {
      result = clearData(params.password || '');
    } else if (action === 'validateAdminPassword') {
      result = validateAdminPassword(params.password || '');
    } else {
      result = {
        ok: false,
        error: 'ไม่รู้จักคำสั่ง API'
      };
    }
  } catch (error) {
    result = {
      ok: false,
      error: error && error.message ? error.message : 'API ทำงานไม่สำเร็จ'
    };
  }

  return createJsonpResponse_(params.callback, result);
}

function createJsonpResponse_(callback, payload) {
  const callbackName = String(callback || 'callback').replace(/[^\w.$]/g, '');
  const body = `${callbackName}(${JSON.stringify(payload)});`;

  return ContentService
    .createTextOutput(body)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

/**
 * ใช้ครั้งแรกเพื่อสร้าง/เตรียม Google Sheet Database
 * หลังรันแล้วให้ดู Log เพื่อเปิด URL ของ Google Sheet ได้
 */
function setupDatabase() {
  const ss = getSpreadsheet_();
  ensureDatabase_(ss);

  const result = {
    ok: true,
    spreadsheetId: ss.getId(),
    spreadsheetUrl: ss.getUrl(),
    sheetName: PARTY_SPLIT_CONFIG.DB_SHEET_NAME
  };

  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

/**
 * ใช้เมื่ออยากผูกกับ Google Sheet ที่สร้างเองอยู่แล้ว
 * วิธีใช้: ใส่ Spreadsheet ID แล้วกด Run
 */
function setSpreadsheetId(spreadsheetId) {
  if (!spreadsheetId) {
    throw new Error('กรุณาระบุ Spreadsheet ID');
  }

  const ss = SpreadsheetApp.openById(spreadsheetId);
  PropertiesService.getScriptProperties().setProperty('PARTY_SPLIT_SPREADSHEET_ID', ss.getId());
  ensureDatabase_(ss);

  return {
    ok: true,
    spreadsheetId: ss.getId(),
    spreadsheetUrl: ss.getUrl(),
    sheetName: PARTY_SPLIT_CONFIG.DB_SHEET_NAME
  };
}

function getSpreadsheetInfo() {
  const ss = getSpreadsheet_();
  ensureDatabase_(ss);

  return {
    ok: true,
    spreadsheetId: ss.getId(),
    spreadsheetUrl: ss.getUrl(),
    sheetName: PARTY_SPLIT_CONFIG.DB_SHEET_NAME
  };
}

function getData() {
  const ss = getSpreadsheet_();
  const sheet = ensureDatabase_(ss);

  const raw = sheet.getRange(2, 2).getValue();
  const updatedAt = sheet.getRange(2, 3).getValue();

  let data = getEmptyData_();

  if (raw) {
    try {
      data = normalizeData_(JSON.parse(raw));
    } catch (error) {
      data = getEmptyData_();
    }
  }

  return {
    ok: true,
    data,
    updatedAt: updatedAt ? new Date(updatedAt).toISOString() : ''
  };
}

function saveData(payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const ss = getSpreadsheet_();
    const sheet = ensureDatabase_(ss);
    const data = normalizeData_(payload);
    const now = new Date();

    sheet.getRange(2, 1, 1, 4).setValues([[
      PARTY_SPLIT_CONFIG.DATA_KEY,
      JSON.stringify(data),
      now,
      getUser_()
    ]]);

    appendLog_(ss, 'save', data);

    return {
      ok: true,
      data,
      updatedAt: now.toISOString()
    };
  } catch (error) {
    return {
      ok: false,
      error: error && error.message ? error.message : 'บันทึกข้อมูลไม่สำเร็จ'
    };
  } finally {
    lock.releaseLock();
  }
}

function clearData(password) {
  if (String(password || '') !== PARTY_SPLIT_CONFIG.ADMIN_PASSWORD) {
    return {
      ok: false,
      error: 'รหัสไม่ถูกต้อง ไม่สามารถล้างข้อมูลได้'
    };
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const ss = getSpreadsheet_();
    const sheet = ensureDatabase_(ss);
    const data = getEmptyData_();
    const now = new Date();

    sheet.getRange(2, 1, 1, 4).setValues([[
      PARTY_SPLIT_CONFIG.DATA_KEY,
      JSON.stringify(data),
      now,
      getUser_()
    ]]);

    appendLog_(ss, 'clear', data);

    return {
      ok: true,
      data,
      updatedAt: now.toISOString()
    };
  } catch (error) {
    return {
      ok: false,
      error: error && error.message ? error.message : 'ล้างข้อมูลไม่สำเร็จ'
    };
  } finally {
    lock.releaseLock();
  }
}

function validateAdminPassword(password) {
  const isValid = String(password || '') === PARTY_SPLIT_CONFIG.ADMIN_PASSWORD;

  return {
    ok: isValid,
    error: isValid ? '' : 'รหัสไม่ถูกต้อง ไม่สามารถล้างข้อมูลได้'
  };
}

function getSpreadsheet_() {
  const props = PropertiesService.getScriptProperties();
  let spreadsheetId = props.getProperty('PARTY_SPLIT_SPREADSHEET_ID');

  if (spreadsheetId) {
    return SpreadsheetApp.openById(spreadsheetId);
  }

  const ss = SpreadsheetApp.create(PARTY_SPLIT_CONFIG.DB_FILE_NAME);
  props.setProperty('PARTY_SPLIT_SPREADSHEET_ID', ss.getId());
  return ss;
}

function ensureDatabase_(ss) {
  let sheet = ss.getSheetByName(PARTY_SPLIT_CONFIG.DB_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(PARTY_SPLIT_CONFIG.DB_SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, 4).setValues([[
      'key',
      'json',
      'updatedAt',
      'updatedBy'
    ]]);
  }

  if (!sheet.getRange(2, 1).getValue()) {
    sheet.getRange(2, 1, 1, 4).setValues([[
      PARTY_SPLIT_CONFIG.DATA_KEY,
      JSON.stringify(getEmptyData_()),
      new Date(),
      'setup'
    ]]);
  }

  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, 4);

  let logSheet = ss.getSheetByName(PARTY_SPLIT_CONFIG.LOG_SHEET_NAME);

  if (!logSheet) {
    logSheet = ss.insertSheet(PARTY_SPLIT_CONFIG.LOG_SHEET_NAME);
  }

  if (logSheet.getLastRow() === 0) {
    logSheet.getRange(1, 1, 1, 5).setValues([[
      'timestamp',
      'action',
      'peopleCount',
      'expensesCount',
      'updatedBy'
    ]]);
    logSheet.setFrozenRows(1);
  }

  return sheet;
}

function appendLog_(ss, action, data) {
  const logSheet = ss.getSheetByName(PARTY_SPLIT_CONFIG.LOG_SHEET_NAME);
  if (!logSheet) return;

  logSheet.appendRow([
    new Date(),
    action,
    data.people.length,
    data.expenses.length,
    getUser_()
  ]);
}

function normalizeData_(payload) {
  const source = payload && typeof payload === 'object' ? payload : {};
  const rawPeople = Array.isArray(source.people) ? source.people : [];
  const rawExpenses = Array.isArray(source.expenses) ? source.expenses : [];
  const rawNonDrinkers = Array.isArray(source.nonDrinkers) ? source.nonDrinkers : [];

  const people = [];
  rawPeople.forEach((name) => {
    const cleanName = String(name || '').trim();
    if (cleanName && people.indexOf(cleanName) === -1) {
      people.push(cleanName);
    }
  });

  const nonDrinkers = [];
  rawNonDrinkers.forEach((name) => {
    const cleanName = String(name || '').trim();
    if (cleanName && people.indexOf(cleanName) !== -1 && nonDrinkers.indexOf(cleanName) === -1) {
      nonDrinkers.push(cleanName);
    }
  });

  const expenses = rawExpenses
    .map((item) => {
      const isAlcohol = Boolean(item && item.isAlcohol);
      const fallbackParticipants = isAlcohol
        ? people.filter((name) => nonDrinkers.indexOf(name) === -1)
        : people;
      const rawParticipants = Array.isArray(item && item.participants) ? item.participants : fallbackParticipants;
      const participants = [];

      rawParticipants.forEach((name) => {
        const cleanName = String(name || '').trim();
        if (cleanName && people.indexOf(cleanName) !== -1 && participants.indexOf(cleanName) === -1) {
          participants.push(cleanName);
        }
      });

      return {
        title: String(item && item.title ? item.title : '').trim(),
        payer: String(item && item.payer ? item.payer : '').trim(),
        amount: round2_(Number(item && item.amount ? item.amount : 0)),
        isAlcohol,
        participants: participants.length ? participants : fallbackParticipants.slice()
      };
    })
    .filter((item) => item.title && item.payer && item.amount > 0 && item.participants.length > 0);

  return {
    people,
    nonDrinkers,
    expenses
  };
}

function getEmptyData_() {
  return {
    people: [],
    nonDrinkers: [],
    expenses: []
  };
}

function round2_(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function getUser_() {
  try {
    return Session.getActiveUser().getEmail() || 'webapp';
  } catch (error) {
    return 'webapp';
  }
}


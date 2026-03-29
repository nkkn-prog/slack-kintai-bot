/**
 * スプレッドシートCRUD操作
 */

/**
 * マスタスプレッドシートを取得
 */
function getMasterSpreadsheet_() {
  var id = getMasterSpreadsheetId_();
  return SpreadsheetApp.openById(id);
}

/**
 * ユーザーのスプレッドシートを取得（なければ新規作成）
 */
function getOrCreateUserSpreadsheet_(userId, displayName) {
  var master = getMasterSpreadsheet_();
  var masterSheet = master.getSheets()[0];
  var data = masterSheet.getDataRange().getValues();

  // マスタからユーザーを検索
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === userId) {
      return SpreadsheetApp.openById(data[i][2]);
    }
  }

  // 新規作成
  var ssName = '勤怠記録_' + displayName;
  var newSs = SpreadsheetApp.create(ssName);

  // フォルダに移動
  var folderId = getFolderId_();
  if (folderId) {
    var file = DriveApp.getFileById(newSs.getId());
    var folder = DriveApp.getFolderById(folderId);
    folder.addFile(file);
    DriveApp.getRootFolder().removeFile(file);
  }

  // デフォルトの「シート1」を削除するため、先に月次シートを作成
  var now = getNowJST_();
  var monthName = formatYearMonthJST_(now);
  var monthSheet = newSs.getSheets()[0];
  monthSheet.setName(monthName);
  monthSheet.appendRow(HEADER_ROW);

  // マスタに登録
  masterSheet.appendRow([userId, displayName, newSs.getId(), '']);

  return newSs;
}

/**
 * 月次シートを取得（なければ作成）
 */
function getOrCreateMonthlySheet_(spreadsheet, dateJST) {
  var monthName = formatYearMonthJST_(dateJST);
  var sheet = spreadsheet.getSheetByName(monthName);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(monthName);
    sheet.appendRow(HEADER_ROW);
  }

  return sheet;
}

/**
 * 未終了セッション（C列が空の行）を検索
 * @return {number|null} 行番号（1-indexed）、見つからなければnull
 */
function findOpenSession_(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return null; // ヘッダーのみ
  }

  // 最終行から逆順に検索
  for (var row = lastRow; row >= 2; row--) {
    var startVal = sheet.getRange(row, 2).getValue();
    var endVal = sheet.getRange(row, 3).getValue();
    if (startVal !== '' && (endVal === '' || endVal === null)) {
      return row;
    }
  }
  return null;
}

/**
 * 稼働開始を記録
 */
function recordStart_(sheet, dateStr, timeStr) {
  sheet.appendRow([dateStr, timeStr, '', '', '']);
}

/**
 * 稼働終了を記録し、稼働時間を計算
 * @return {string} 稼働時間の文字列（例: "8時間30分"）
 */
function recordEnd_(sheet, rowNumber, endTimeStr, startDateStr, startTimeStr, endDateJST) {
  // 終了時刻を記入
  sheet.getRange(rowNumber, 3).setValue(endTimeStr);

  // 稼働時間を計算（Date差分で日跨ぎ対応）
  var startDateTime = new Date(startDateStr + 'T' + startTimeStr + '+09:00');
  var endDateStr = formatDateJST_(endDateJST);
  var endDateTime = new Date(endDateStr + 'T' + endTimeStr + '+09:00');

  var durationMillis = endDateTime.getTime() - startDateTime.getTime();
  var durationSheet = formatDurationForSheet_(durationMillis);
  var durationDisplay = formatDuration_(durationMillis);

  // 稼働時間を記入
  sheet.getRange(rowNumber, 4).setValue(durationSheet);

  return durationDisplay;
}

/**
 * マスタSSのalertChannelIdを更新
 */
function updateAlertChannel_(userId, channelId) {
  var master = getMasterSpreadsheet_();
  var masterSheet = master.getSheets()[0];
  var data = masterSheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === userId) {
      masterSheet.getRange(i + 1, 4).setValue(channelId);
      return;
    }
  }
}

/**
 * 全ユーザーの未終了セッションを取得（12時間アラート用）
 * @return {Array} [{userId, displayName, spreadsheetId, channelId, sheetName, rowNumber, startDateStr, startTimeStr}, ...]
 */
function getAllOpenSessions_() {
  var master = getMasterSpreadsheet_();
  var masterSheet = master.getSheets()[0];
  var data = masterSheet.getDataRange().getValues();
  var results = [];

  for (var i = 1; i < data.length; i++) {
    var userId = data[i][0];
    var displayName = data[i][1];
    var spreadsheetId = data[i][2];
    var channelId = data[i][3];

    if (!spreadsheetId) continue;

    try {
      var ss = SpreadsheetApp.openById(spreadsheetId);
      var now = getNowJST_();
      var sheets = [
        formatYearMonthJST_(now),
        formatYearMonthJST_(getPreviousMonth_(now))
      ];

      for (var s = 0; s < sheets.length; s++) {
        var sheet = ss.getSheetByName(sheets[s]);
        if (!sheet) continue;

        var openRow = findOpenSession_(sheet);
        if (openRow) {
          var startDateStr = sheet.getRange(openRow, 1).getValue();
          var startTimeStr = sheet.getRange(openRow, 2).getValue();
          var noteVal = sheet.getRange(openRow, 5).getValue();

          results.push({
            userId: userId,
            displayName: displayName,
            spreadsheetId: spreadsheetId,
            channelId: channelId,
            sheetName: sheets[s],
            rowNumber: openRow,
            startDateStr: String(startDateStr),
            startTimeStr: String(startTimeStr),
            noteVal: String(noteVal)
          });
          break; // 1ユーザーにつき1つの未終了セッション
        }
      }
    } catch (e) {
      console.error('Error checking user ' + userId + ': ' + e.message);
    }
  }

  return results;
}

/**
 * 前月のDateオブジェクトを取得
 */
function getPreviousMonth_(date) {
  var prev = new Date(date);
  prev.setMonth(prev.getMonth() - 1);
  return prev;
}

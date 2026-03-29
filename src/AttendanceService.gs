/**
 * 勤怠打刻ビジネスロジック
 */

/**
 * 稼働開始処理
 */
function handleWorkStart_(userId, channelId, threadTs) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    console.error('Lock timeout: ' + e.message);
    postSlackMessage_(channelId, ':warning: 処理が混み合っています。少し待ってからもう一度お試しください。', threadTs);
    return;
  }

  try {
    var displayName = getDisplayName_(userId);
    var ss = getOrCreateUserSpreadsheet_(userId, displayName);
    var now = getNowJST_();
    var sheet = getOrCreateMonthlySheet_(ss, now);

    // 未終了セッションチェック
    var openRow = findOpenSession_(sheet);
    if (openRow) {
      postSlackMessage_(channelId, ':warning: 前回の稼働が未終了です。先に「稼働終了」を入力してください。', threadTs);
      return;
    }

    // 前月にも未終了があるかチェック
    var prevMonth = getPreviousMonth_(now);
    var prevSheet = ss.getSheetByName(formatYearMonthJST_(prevMonth));
    if (prevSheet) {
      var prevOpenRow = findOpenSession_(prevSheet);
      if (prevOpenRow) {
        postSlackMessage_(channelId, ':warning: 前回の稼働が未終了です。先に「稼働終了」を入力してください。', threadTs);
        return;
      }
    }

    // 記録
    var dateStr = formatDateJST_(now);
    var timeStr = formatTimeJST_(now);
    recordStart_(sheet, dateStr, timeStr);

    // マスタのalertChannelIdを更新
    updateAlertChannel_(userId, channelId);

    // 応答
    var timeShort = formatTimeShortJST_(now);
    postSlackMessage_(channelId, ':clock9: 稼働開始を記録しました（' + timeShort + '）', threadTs);

  } finally {
    lock.releaseLock();
  }
}

/**
 * 稼働終了処理
 */
function handleWorkEnd_(userId, channelId, threadTs) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    console.error('Lock timeout: ' + e.message);
    postSlackMessage_(channelId, ':warning: 処理が混み合っています。少し待ってからもう一度お試しください。', threadTs);
    return;
  }

  try {
    var displayName = getDisplayName_(userId);
    var ss;
    try {
      ss = getOrCreateUserSpreadsheet_(userId, displayName);
    } catch (e) {
      postSlackMessage_(channelId, ':warning: 稼働開始の記録がありません。先に「稼働開始」を入力してください。', threadTs);
      return;
    }

    var now = getNowJST_();

    // 当月シートで未終了セッション検索
    var sheet = getOrCreateMonthlySheet_(ss, now);
    var openRow = findOpenSession_(sheet);
    var targetSheet = sheet;

    // 当月になければ前月シートも検索（日跨ぎ対応）
    if (!openRow) {
      var prevMonth = getPreviousMonth_(now);
      var prevSheetName = formatYearMonthJST_(prevMonth);
      var prevSheet = ss.getSheetByName(prevSheetName);
      if (prevSheet) {
        openRow = findOpenSession_(prevSheet);
        if (openRow) {
          targetSheet = prevSheet;
        }
      }
    }

    if (!openRow) {
      postSlackMessage_(channelId, ':warning: 稼働開始の記録がありません。先に「稼働開始」を入力してください。', threadTs);
      return;
    }

    // 開始日時を取得
    var startDateVal = targetSheet.getRange(openRow, 1).getValue();
    var startTimeVal = targetSheet.getRange(openRow, 2).getValue();

    // スプレッドシートのDate型・文字列型を安全に変換
    var startDateStr;
    if (startDateVal instanceof Date) {
      startDateStr = formatDateJST_(startDateVal);
    } else {
      startDateStr = String(startDateVal);
    }

    var startTimeStr;
    if (startTimeVal instanceof Date) {
      startTimeStr = formatTimeJST_(startTimeVal);
    } else {
      startTimeStr = String(startTimeVal);
    }

    // 終了記録
    var endTimeStr = formatTimeJST_(now);
    var durationDisplay = recordEnd_(targetSheet, openRow, endTimeStr, startDateStr, startTimeStr, now);

    // 応答
    var timeShort = formatTimeShortJST_(now);
    postSlackMessage_(channelId, ':clock5: 稼働終了を記録しました（' + timeShort + '）稼働時間：' + durationDisplay, threadTs);

  } finally {
    lock.releaseLock();
  }
}

/**
 * 12時間未終了アラート
 */

/**
 * 未終了セッションをチェックし、12時間超過のものに通知を送る
 * 時間駆動型トリガーから呼び出される
 */
function checkUnclosedSessions() {
  var openSessions = getAllOpenSessions_();
  var now = getNowJST_();

  for (var i = 0; i < openSessions.length; i++) {
    var session = openSessions[i];

    // 既にアラート済みならスキップ
    if (session.noteVal.indexOf(ALERT_FLAG) >= 0) {
      continue;
    }

    // 開始日時からの経過時間を計算
    var startDateTime = new Date(session.startDateStr + 'T' + session.startTimeStr + '+09:00');
    var elapsedMillis = now.getTime() - startDateTime.getTime();
    var elapsedHours = elapsedMillis / (1000 * 60 * 60);

    if (elapsedHours >= ALERT_HOURS) {
      // アラート送信
      var message = ':rotating_light: 稼働開始から12時間が経過しました。稼働終了の入力を忘れていませんか？';

      if (session.channelId) {
        postSlackMessage_(session.channelId, '<@' + session.userId + '> ' + message);
      } else {
        postSlackDM_(session.userId, message);
      }

      // アラート済みフラグを書き込み
      try {
        var ss = SpreadsheetApp.openById(session.spreadsheetId);
        var sheet = ss.getSheetByName(session.sheetName);
        if (sheet) {
          var currentNote = sheet.getRange(session.rowNumber, 6).getValue();
          var newNote = currentNote ? currentNote + ' ' + ALERT_FLAG : ALERT_FLAG;
          sheet.getRange(session.rowNumber, 6).setValue(newNote);
        }
      } catch (e) {
        console.error('Error marking alert for user ' + session.userId + ': ' + e.message);
      }
    }
  }
}

/**
 * 時間駆動型トリガーを設定（初回1回だけ実行）
 */
function setupTimeDrivenTrigger() {
  // 既存トリガーの重複防止
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'checkUnclosedSessions') {
      console.log('Trigger already exists. Skipping.');
      return;
    }
  }

  ScriptApp.newTrigger('checkUnclosedSessions')
    .timeBased()
    .everyHours(1)
    .create();

  console.log('Hourly trigger for checkUnclosedSessions created.');
}

/**
 * Slack Events API エントリポイント
 */

/**
 * POSTリクエストのハンドラ
 */
function doPost(e) {
  var body = JSON.parse(e.postData.contents);

  // URL verification challenge
  if (body.type === 'url_verification') {
    return ContentService.createTextOutput(body.challenge);
  }

  // イベントコールバック以外は無視
  if (body.type !== 'event_callback') {
    return ContentService.createTextOutput('');
  }

  var event = body.event;

  // botメッセージを無視
  if (event.bot_id || event.subtype) {
    return ContentService.createTextOutput('');
  }

  // イベント重複排除（Slackリトライ対策）
  var eventId = body.event_id;
  var cache = CacheService.getScriptCache();
  if (cache.get(eventId)) {
    return ContentService.createTextOutput('');
  }
  cache.put(eventId, 'processed', 60);

  // メッセージテキストの完全一致判定
  var text = event.text;
  var userId = event.user;
  var channelId = event.channel;

  if (text === '稼働開始') {
    handleWorkStart_(userId, channelId);
  } else if (text === '稼働終了') {
    handleWorkEnd_(userId, channelId);
  }

  return ContentService.createTextOutput('');
}

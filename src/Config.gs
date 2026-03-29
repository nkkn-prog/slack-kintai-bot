/**
 * 定数・設定値
 */

var TIMEZONE = 'Asia/Tokyo';
var HEADER_ROW = ['日付', '稼働開始', '稼働終了', '稼働時間', '稼働合計', '備考'];
var ALERT_FLAG = '12h_alerted';
var ALERT_HOURS = 12;

// ScriptProperties キー
var PROP_SLACK_BOT_TOKEN = 'SLACK_BOT_TOKEN';
var PROP_MASTER_SPREADSHEET_ID = 'MASTER_SPREADSHEET_ID';
var PROP_FOLDER_ID = 'FOLDER_ID';

/**
 * ScriptPropertiesからSlack Bot Tokenを取得
 */
function getSlackBotToken_() {
  return PropertiesService.getScriptProperties().getProperty(PROP_SLACK_BOT_TOKEN);
}

/**
 * ScriptPropertiesからマスタスプレッドシートIDを取得
 */
function getMasterSpreadsheetId_() {
  return PropertiesService.getScriptProperties().getProperty(PROP_MASTER_SPREADSHEET_ID);
}

/**
 * ScriptPropertiesからフォルダIDを取得
 */
function getFolderId_() {
  return PropertiesService.getScriptProperties().getProperty(PROP_FOLDER_ID);
}

/**
 * 現在のJST日時を取得
 */
function getNowJST_() {
  return new Date();
}

/**
 * DateオブジェクトからJSTの日付文字列を取得 (yyyy-MM-dd)
 */
function formatDateJST_(date) {
  return Utilities.formatDate(date, TIMEZONE, 'yyyy-MM-dd');
}

/**
 * DateオブジェクトからJSTの時刻文字列を取得 (HH:mm:ss)
 */
function formatTimeJST_(date) {
  return Utilities.formatDate(date, TIMEZONE, 'HH:mm:ss');
}

/**
 * DateオブジェクトからJSTの短い時刻文字列を取得 (HH:mm)
 */
function formatTimeShortJST_(date) {
  return Utilities.formatDate(date, TIMEZONE, 'HH:mm');
}

/**
 * DateオブジェクトからJSTの年月文字列を取得 (yyyy-MM)
 */
function formatYearMonthJST_(date) {
  return Utilities.formatDate(date, TIMEZONE, 'yyyy-MM');
}

/**
 * ミリ秒の差分を「X時間YY分」形式に変換
 */
function formatDuration_(millis) {
  var totalMinutes = Math.floor(millis / (1000 * 60));
  var hours = Math.floor(totalMinutes / 60);
  var minutes = totalMinutes % 60;
  return hours + '時間' + ('00' + minutes).slice(-2) + '分';
}

/**
 * ミリ秒の差分を小数時間に変換（スプレッドシート用）
 * 例: 1時間30分 → 1.50, 1時間45分 → 1.75
 * 小数点第3位を四捨五入し、小数点第2位まで表示
 */
function formatDurationForSheet_(millis) {
  var hours = millis / (1000 * 60 * 60);
  return Math.round(hours * 100) / 100;
}

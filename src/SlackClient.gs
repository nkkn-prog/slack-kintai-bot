/**
 * Slack API通信
 */

/**
 * 指定チャンネルにメッセージを送信
 */
function postSlackMessage_(channel, text, threadTs) {
  var token = getSlackBotToken_();
  var url = 'https://slack.com/api/chat.postMessage';
  var payload = {
    channel: channel,
    text: text
  };
  if (threadTs) {
    payload.thread_ts = threadTs;
  }
  var options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': 'Bearer ' + token
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  var response = UrlFetchApp.fetch(url, options);
  var result = JSON.parse(response.getContentText());
  if (!result.ok) {
    console.error('Slack postMessage error: ' + result.error);
  }
  return result;
}

/**
 * 指定ユーザーにDMを送信
 */
function postSlackDM_(userId, text) {
  var token = getSlackBotToken_();

  // DMチャンネルを開く
  var openUrl = 'https://slack.com/api/conversations.open';
  var openPayload = {
    users: userId
  };
  var openOptions = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': 'Bearer ' + token
    },
    payload: JSON.stringify(openPayload),
    muteHttpExceptions: true
  };
  var openResponse = UrlFetchApp.fetch(openUrl, openOptions);
  var openResult = JSON.parse(openResponse.getContentText());
  if (!openResult.ok) {
    console.error('Slack conversations.open error: ' + openResult.error);
    return openResult;
  }

  var dmChannel = openResult.channel.id;
  return postSlackMessage_(dmChannel, text);
}

/**
 * Slackユーザー情報を取得（表示名取得用）
 */
function getSlackUserInfo_(userId) {
  var token = getSlackBotToken_();
  var url = 'https://slack.com/api/users.info?user=' + userId;
  var options = {
    method: 'get',
    headers: {
      'Authorization': 'Bearer ' + token
    },
    muteHttpExceptions: true
  };
  var response = UrlFetchApp.fetch(url, options);
  var result = JSON.parse(response.getContentText());
  if (!result.ok) {
    console.error('Slack users.info error: ' + result.error);
    return null;
  }
  return result.user;
}

/**
 * ユーザーの表示名を取得
 */
function getDisplayName_(userId) {
  var user = getSlackUserInfo_(userId);
  if (!user) {
    return userId;
  }
  return user.profile.display_name || user.real_name || user.name || userId;
}

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Slack勤怠管理アプリ。Slackメッセージ（「稼働開始」「稼働終了」を含む投稿）をトリガーに、Google Spreadsheetへ自動打刻するGoogle Apps Script (GAS) アプリケーション。

## Build & Deploy

```bash
# コードをGASにプッシュ
clasp push --force

# 新バージョンをデプロイ（デプロイごとにURLが変わるため、Slack Event SubscriptionsのRequest URLも更新が必要）
clasp deploy --description "vX.X.X"
```

GASプロジェクトはclasp CLIで管理。`.clasp.json`の`rootDir`は`src/`。npm依存なし。

## Architecture

```
Main.doPost(e)                          ← Slack Events API webhook
  ├→ AttendanceService                  ← ビジネスロジック (handleWorkStart_, handleWorkEnd_)
  │    ├→ SpreadsheetService            ← スプレッドシートCRUD
  │    ├→ SlackClient                   ← Slack API通信
  │    └→ Config                        ← 定数・ユーティリティ
  │
AlertService.checkUnclosedSessions()    ← 時間駆動型トリガー（1時間ごと）
  ├→ SpreadsheetService
  └→ SlackClient
```

GASはグローバルフラットネームスペース。ファイル分割は論理的な整理のみ。

## Key Conventions

- **Private関数**: 末尾アンダースコア `_()` (e.g., `postSlackMessage_()`)
- **時刻関数**: `_JST` サフィックス (e.g., `formatDateJST_()`)
- **タイムゾーン**: すべて `Asia/Tokyo` 固定
- **排他制御**: `LockService.getScriptLock()` で打刻処理をロック
- **イベント重複排除**: `CacheService` で `event_id` を60秒TTL管理

## Data Schema

**マスタSS**: `A:userId | B:displayName | C:spreadsheetId | D:alertChannelId`

**ユーザーSS** (月ごとにシート `YYYY-MM`):
`A:日付 | B:稼働開始 | C:稼働終了 | D:稼働時間(小数) | E:稼働合計(月累計) | F:備考`

- D列: 小数時間 (1h30m → `1.50`)、小数点第3位四捨五入
- E列: 月内D列の累計値
- F列: 12hアラート済みフラグ (`12h_alerted`) にも使用

## Configuration (Script Properties)

GASエディタの「プロジェクトの設定 → スクリプトプロパティ」で設定:
- `SLACK_BOT_TOKEN` - Slack Bot Token (`xoxb-...`)
- `MASTER_SPREADSHEET_ID` - マスタスプレッドシートのID
- `FOLDER_ID` - ユーザーSS保存先のGoogle DriveフォルダID

## Cross-month Handling

稼働終了時、当月シートに未終了セッションがなければ前月シートも検索する（月跨ぎ対応）。稼働時間はDate差分で計算するため日跨ぎでも正確。

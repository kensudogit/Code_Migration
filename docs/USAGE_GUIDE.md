# Code Migration 利用手順

本ドキュメントは Web UI の操作手順と、画面右下の **浮動パネル（モーダル風ダイアログ）** の使い方を説明します。

---

## 浮動パネルの操作（▼ ▲・ドラッグ・閉じる）

画面右下の **「利用手順」** ボタンからパネルを開きます。

| 操作 | ボタン / 領域 | 動作 |
|------|----------------|------|
| パネルを開く | 右下「利用手順」 | 手順パネルが表示される |
| 内容を折りたたむ | **▲**（上向き） | ヘッダーだけ残し、本文を隠す |
| 内容を展開する | **▼**（下向き） | 詳細手順を再表示 |
| パネルを閉じる | **×** | パネルを消し、右下ボタンに戻る |
| 位置を移動 | ヘッダー（グリップ付きバー）をドラッグ | 画面上の任意の位置へ移動 |

### 補足

- 開閉状態・折りたたみ状態・位置は **ブラウザの localStorage** に保存されます（キー: `code-migration-guide-panel-v1`）。
- ウィンドウサイズを変えたときは、画面外にはみ出さないよう位置が自動調整されます。
- パネルはメイン画面の上に重なります。変換エディタの操作をしながら手順を参照できます。

---

## 基本操作（コード変換）

### 1. 変換方向を選ぶ（リモコンモーダル）

画面上部の **変換方向エリア** をタップすると **CONVERT REMOTE**（リモコン風モーダル）が開きます。次の 6 ボタンから選びます（`→` は変換の向き）。

| ボタン | 意味 |
|--------|------|
| Java → Python | Java を Python に変換 |
| Python → Java | Python を Java に変換 |
| Java → TypeScript | Java を TypeScript に変換 |
| TypeScript → Java | TypeScript を Java に変換 |
| COBOL → Java | COBOL を Java に変換 |
| Java → COBOL | Java を COBOL に変換 |

方向を変えると、サンプルソースが自動で読み込まれます。

### 2b. ソース / 変換結果ウィンドウ（自由配置）

- **移動**: 各ウィンドウのヘッダー（グリップ・タイトルバー）をドラッグ
- **リサイズ**: 右下の角、右端、下端をドラッグ
- **重なり**: ウィンドウをクリックすると前面に表示
- **初期配置に戻す**: 「初期配置に戻す」ボタン
- 位置とサイズはブラウザに自動保存されます

### 2. ソースコードを入力する

左の **「ソース」** エディタにコードを貼り付けます。

### 3. AI 変換を実行する

**「AI 変換を実行」** をクリックします。

- ヘッダーの **AI Ready** … OpenAI API キーが有効
- **Mock AI** … キー未設定などでデモ出力のみ

### 4. 結果をコピーする

右の **「変換結果」** に出力されます。**「結果をコピー」** でクリップボードへコピーできます。

### 5. 変換履歴を確認する（PostgreSQL 連携時）

右カラムの **「変換履歴」** に過去ジョブが表示されます。PostgreSQL が未接続の場合は空のままです。

---

## ステータス表示の見方

| 表示 | 意味 |
|------|------|
| PostgreSQL（緑） | DB 接続 OK、履歴保存可能 |
| PostgreSQL（灰） | DB 未設定または未接続 |
| AI Ready | `OPENAI_API_KEY` 有効 |
| Mock AI | キーなし等でモック変換 |

本番の状態確認 URL:

```
https://<your-app>.up.railway.app/api/v1/setup
```

- `postgres: true` … DB 接続成功
- `database_url: "set"` … `DATABASE_URL` が渡っている

---

## Railway 本番環境

1. Postgres プラグインを追加（Online になること）
2. **Code_Migration** サービスの Variables で、Postgres の **`DATABASE_URL` を Variable Reference** で追加（手入力の `https://...` は不可）
3. `OPENAI_API_KEY` に OpenAI の `sk-proj-...` または `sk-...` を設定
4. **Deploy** して反映
5. `/api/v1/setup` で `postgres: true` を確認

公開例: [https://codemigration-production.up.railway.app/](https://codemigration-production.up.railway.app/)

詳細は [RAILWAY.md](./RAILWAY.md) を参照してください。

---

## ローカル Docker

```powershell
cd C:\devlop\Code_Migration
docker compose up --build -d
```

| サービス | URL |
|----------|-----|
| Web UI | http://localhost:3001 |
| API | http://localhost:8090 |
| PostgreSQL | `localhost:5434`（user/pass: `codemig` / `codemig`） |

`.env` に `OPENAI_API_KEY` を設定すると本番同等の AI 変換が使えます。

---

## よくある問題

| 症状 | 対処 |
|------|------|
| 変換履歴が出ない | Railway で `DATABASE_URL` を Postgres Reference にし Deploy |
| Mock AI のまま | Variables の `OPENAI_API_KEY` を設定して Redeploy |
| 変換エラー | キー・クォータ・ソースコード長を確認 |
| パネルが動かない | ヘッダー（タイトルバー）をドラッグ（ボタン上ではなくバー本体） |

---

## 関連ファイル

| ファイル | 内容 |
|----------|------|
| `frontend/src/components/FloatingGuidePanel.tsx` | 浮動パネル UI |
| `frontend/src/lib/guide.ts` | パネル内の手順テキスト |
| `docs/RAILWAY.md` | Railway デプロイ手順 |

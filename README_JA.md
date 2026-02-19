<p align="center">
  <a href="README.md">English</a> |
  <a href="README_KO.md">한국어</a> |
  <a href="README_JA.md">日本語</a> |
  <a href="README_ZH.md">中文</a> |
  <a href="README_FR.md">Français</a>
</p>

# Human-to-Human CAPTCHA (H2H-CAPTCHA)

> **「人による、人のためのリアルタイム検証」**

H2H-CAPTCHAは、従来の自動化されたチューリングテスト（信号機の識別など）をリアルタイムの人間同士の相互作用に置き換える革新的なセキュリティソリューションです。ユーザー（「クライアント」）は実際の人間である検証者（「バリデータ」）とペアになり、対話形式のタスクを実行します。

---

## 🏗 アーキテクチャ

専用バックエンドサーバー不要。**React + Supabase**のみで動作します。

### フロントエンド (React + TypeScript + Vite)
- **Supabase Realtime Broadcast**: マウストラッキングデータをDBへの書き込みなしで最大毎秒40回送信。
- **Supabase Presence**: パートナーの切断をリアルタイムで検知。
- **Postgres Changes**: マッチが作成された瞬間に待機中のユーザーへ即時通知。

### データベース & リアルタイム (Supabase + PostgreSQL)
- **`queued_participants`** テーブル: クライアントとバリデータの待機列を管理。
- **`matches`** テーブル: 進行中および完了したマッチの記録。
- **`client_states`** テーブル: クライアントごとの失敗回数とブラックリストを管理。
- **`try_match()`** RPC: `FOR UPDATE SKIP LOCKED`を用いたアトミックな1:1マッチング。
- **`record_decision()`** RPC: 承認/却下の判定処理と失敗回数の更新。
- **`handle_disconnect()`** RPC: 切断時の待機列とアクティブマッチのクリーンアップ。

### チャネル戦略
```
queued_participants  → Postgres Changes  (マッチ待機)
session:{match_id}   → Broadcast         (マウス / ゲーム / 結果イベント)
session:{match_id}   → Presence          (切断検知)
```

---

## 🎮 インタラクティブ・ミッション

バリデータが制御する4つの検証モードをサポートしています：

1. **🖱️ マウストラッキング（受動的検証）**
   - バリデータはクライアントの自然なマウスの動きを観察します。
   - 目的: ボット特有の直線的な動きや瞬間移動を検出。
   - 技術: Realtime Broadcast 30fps（DBへの書き込みなし）。

2. **✏️ お絵かき（能動的検証）**
   - バリデータがお題（例：「リンゴ」）を指定し、クライアントがキャンバスに描きます。
   - 目的: 人間の創造性と運動制御能力を確認。
   - 技術: グローバル座標とキャンバス座標の二重送信。

3. **👊 じゃんけん（反応速度検証）**
   - バリデータが手（例：「グー」）を出し、クライアントはそれに勝つ手を出します。
   - 目的: ルールの理解と認知的反応をテスト。

4. **💬 チャット（チューリングテスト）**
   - リアルタイムの「入力中...」表示付きの自由形式テキスト会話。
   - 目的: 高度な言語相互作用による最終検証。

---

## 🚀 はじめに

### 前提条件
- **Node.js** 18+
- **Supabase** プロジェクト ([supabase.com](https://supabase.com))

### 1. データベースのセットアップ

Supabase SQL エディターでマイグレーションを実行します：

```bash
# ファイル: supabase/migrations/001_h2h_captcha.sql
```

その後、Supabase ダッシュボード → Database → Replication で `matches` テーブルのリアルタイムを有効にします。

### 2. 環境変数の設定

```env
# .env.local
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

URLとanon keyはSupabase ダッシュボード → Project Settings → API で確認できます。

### 3. インストールと起動

```bash
npm install
npm run dev
```

`http://localhost:5173` を開きます。

### 使い方
1. **タブ 1**: 「ユーザーとして参加（Client）」を選択します。
2. **タブ 2**: 「検証者として参加（Validator）」を選択します。
3. システムが即座にマッチングを行います。
4. バリデータコンソールを使用してタスクを切り替え、クライアントを検証します。

---

## 🛡️ セキュリティ機能
- **UUIDベースのルーティング**: `localStorage`に保存されたUUIDにより、再読み込み後も同一性を維持。
- **隔離**: クライアント同士が通信することはできません。
- **バリデータブラックリスト**: 同一バリデータとの再マッチングを防止（`client_states`で管理）。
- **失敗回数追跡**: 3回連続で拒否されると永久ブロック。
- **Row Level Security**: 全テーブルにRLSを適用、機密操作は`SECURITY DEFINER`関数内でのみ実行。

---

## 🗂 プロジェクト構成

```
├── src/
│   ├── hooks/
│   │   └── useSupabase.ts     # メインフック（マッチング + broadcast + presence）
│   ├── lib/
│   │   └── supabase.ts        # Supabase クライアントシングルトン
│   ├── pages/
│   │   ├── ClientPage.tsx
│   │   └── ValidatorPage.tsx
│   ├── types/
│   │   └── index.ts           # MatchRow、SessionBroadcast など
│   └── i18n/
│       └── translations.ts    # 5言語対応
├── supabase/
│   └── migrations/
│       └── 001_h2h_captcha.sql
├── .env.local                 # Supabase認証情報（gitignore対象）
└── vite.config.ts
```

---

© 2025 H2H Captcha Project.

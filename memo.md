# Directus SurveyJS Creator Extension - 設計と作業メモ

## プロジェクト概要

DirectusのInterface Extensionとして、SurveyJS Creatorを統合し、ビジュアルエディタでsurveyを作成・編集できるようにする。作成したsurvey定義（JSON）をDirectusのコレクションフィールドに保存する。

## 技術スタック

- **フレームワーク**: Vue 3 + TypeScript
- **Directus SDK**: @directus/extensions-sdk 17.0.2
- **SurveyJS**: survey-creator-vue ^2.3.15
- **対象Directus**: ^11.0.0

## アーキテクチャ設計

### 1. Extension構成

```
src/
├── index.ts           # Extension定義（defineInterface）
├── interface.vue      # SurveyJS Creatorコンポーネント統合
└── shims.d.ts        # TypeScript型定義
```

### 2. データフロー

1. **Directus Field Type**: `json` または `text`
   - Survey定義をJSON形式で保存
   - 既存データがあれば読み込んでエディタに表示

2. **SurveyJS Creator**
   - `SurveyCreatorComponent` をVueコンポーネントとして使用
   - `saveSurveyFunc` でsurvey定義の変更を検知
   - JSON形式でsurvey定義を取得・保存

3. **Directus Interface**
   - Props: `value` (現在のフィールド値 - JSON文字列またはオブジェクト)
   - Emit: `input` (新しいフィールド値を親に通知)

### 3. インターフェース仕様

```typescript
defineInterface({
  id: 'surveyjs-creator',
  name: 'SurveyJS Creator',
  icon: 'poll',  // または 'ballot', 'quiz'
  description: 'Create and edit surveys using SurveyJS Creator',
  component: InterfaceComponent,
  types: ['json', 'text'],  // JSONまたはテキストフィールドに対応
  options: null,  // 将来的に設定オプションを追加可能
})
```

## 実装タスク

### Phase 1: 基本統合 ✅ 完了

- [x] プロジェクトスキャフォールド作成
- [x] survey-creator-vue依存関係追加
- [x] `src/index.ts` の更新
  - Interface IDを `surveyjs-creator` に変更
  - 名前、アイコン、説明を適切に設定
  - サポートフィールドタイプを `['json', 'text']` に変更
- [x] `src/interface.vue` の実装
  - SurveyJS Creatorコンポーネントのインポート
  - 必要なCSSのインポート
  - Creatorインスタンスの初期化
  - JSON値のparse/stringify処理
  - エラーハンドリング
- [x] TDD開発環境の構築
  - Vitest + Vue Test Utilsのセットアップ
  - テストケースの作成（14個）
  - すべてのテストがパス ✅

### Phase 2: UI/UX改善

- [ ] エディタの高さ/幅の調整
- [ ] ローディング状態の表示
- [ ] バリデーションエラーの表示
- [ ] 空の状態のハンドリング

### Phase 3: 設定オプション（将来的に）

- [ ] エディタのテーマ選択
- [ ] 利用可能な質問タイプの制限
- [ ] デフォルトテンプレート
- [ ] プレビューモードの追加

## SurveyJS Creator統合の詳細

### 必要なインポート

```typescript
import { SurveyCreatorComponent, SurveyCreator } from 'survey-creator-vue';
import 'survey-core/survey-core.min.css';
import 'survey-creator-core/survey-creator-core.min.css';
```

### Creatorオプション

```typescript
const creatorOptions = {
  showLogicTab: true,
  showJSONEditorTab: true,
  showThemeTab: true,
  isAutoSave: true,
};
```

### イベントハンドリング

- `saveSurveyFunc`: survey定義が変更されたときに呼ばれる
- JSON文字列として `emit('input', jsonString)` でDirectusに保存

## データ形式

### 保存形式
```json
{
  "title": "My Survey",
  "pages": [
    {
      "name": "page1",
      "elements": [
        {
          "type": "text",
          "name": "question1",
          "title": "What is your name?"
        }
      ]
    }
  ]
}
```

### フィールド設定（Directus側）

1. コレクションにフィールドを追加
2. Type: `JSON` または `Text`
3. Interface: `SurveyJS Creator`
4. 保存後、エディタでsurveyを作成・編集可能

## 注意点とベストプラクティス

### 1. データの永続化
- JSONのparse/stringifyを適切に処理
- 無効なJSONの場合のエラーハンドリング
- 空の場合はデフォルトのsurvey定義を提供

### 2. パフォーマンス
- Creatorインスタンスの適切な初期化とクリーンアップ
- 大きなsurvey定義でもスムーズに動作するように

### 3. 互換性
- Directus 11.0.0以降に対応
- SurveyJS Creatorのバージョンアップに対応

## ビルドとデプロイ

```bash
# 開発モード（watch + no minify）
npm run dev

# プロダクションビルド
npm run build

# Directusインスタンスにリンク
npm run link

# バリデーション
npm run validate
```

## テスト手順

1. Directusで新しいコレクションを作成
2. JSONフィールドを追加し、Interface に "SurveyJS Creator" を選択
3. アイテムを作成し、surveyエディタが表示されることを確認
4. surveyを作成・編集し、保存
5. 保存されたJSONを確認
6. 再度開いて、保存されたsurveyが正しく読み込まれることを確認

## 参考リンク

- [SurveyJS Creator Documentation](https://surveyjs.io/survey-creator/documentation/overview)
- [Directus Extensions SDK](https://docs.directus.io/extensions/introduction.html)
- [SurveyJS Creator Vue Integration](https://surveyjs.io/survey-creator/documentation/get-started-vue)

## 今後の拡張案

- Survey Viewerインターフェースの追加（読み取り専用表示）
- Survey回答収集システムの統合
- テンプレートライブラリの追加
- 多言語対応
- カスタム質問タイプの追加

---

## 作業履歴・現在地

### 2025-11-13: Phase 1完了（TDD方式で実装）

#### 完了した作業
1. **テスト環境構築**
   - Vitest + Vue Test Utils + happy-dom をインストール
   - `vitest.config.ts` の作成
   - CSSインポートのモック設定
   - テストスクリプトの追加（test, test:watch, test:ui, test:coverage）

2. **TDDサイクル実施**
   - **Red**: テストケース作成（14個）→ 失敗を確認
   - **Green**: 実装 → テスト全件パス ✅
   - テスト対象：
     - `src/index.ts`: Interface定義（6テスト）
     - `src/interface.vue`: Vueコンポーネント（8テスト）

3. **実装内容**
   - `src/index.ts`: ID、名前、アイコン、対応フィールドタイプ
   - `src/interface.vue`:
     - SurveyCreatorコンポーネントの統合
     - JSON/String両方の値に対応
     - エラーハンドリング（無効なJSONの処理）
     - デフォルトsurvey定義の提供
     - 自動保存機能（saveSurveyFunc）

4. **依存関係**
   - `survey-core` ^2.3.15
   - `survey-creator-core` ^2.3.15
   - `survey-creator-vue` ^2.3.15

#### 次のステップ
- [x] ビルド動作確認（`npm run build`）✅ 成功（3.2MB）
- [x] バリデーションチェック（`npm run validate`）✅ パス
- [ ] Directusへのリンクとローカルテスト
- [ ] Phase 2: UI/UX改善の着手

#### ビルド完了（2025-11-13 23:17）

**ビルド結果:**
- `dist/index.js`: 3.2MB
- バリデーション: ✅ パス
- テスト: 14/14 ✅ パス

**実装で使用したクラス名:**
- `SurveyCreatorModel` (survey-creator-core)
- `SurveyCreatorComponent` (survey-creator-vue)

**CSS:**
- `survey-core/survey-core.min.css`
- `survey-creator-core/survey-creator-core.min.css`

#### Directus ローカル起動完了（2025-11-13 23:21）

**アクセス情報:**
- URL: http://localhost:8055
- Email: admin@example.com
- Password: admin

**Docker Compose 構成:**
- Directus 11 (最新版)
- SQLite データベース
- Extension マウント: `./` → `/directus/extensions/directus-surveyjs-creator`
- 自動リロード有効: `EXTENSIONS_AUTO_RELOAD: true`

**重要:** Directus 11では、extensionsディレクトリの直下に配置する必要があります（`/directus/extensions/<extension-name>`）。`interfaces/`サブディレクトリは不要です。

**テスト手順:**
1. http://localhost:8055 にアクセス
2. 上記の認証情報でログイン
3. Settings → Data Model → 新しいコレクションを作成
4. コレクションに **JSON** または **Code** タイプのフィールドを追加
5. Interface タブで **"SurveyJS Creator"** を選択
6. アイテムを作成し、SurveyJS Creator でサーベイを作成
7. 保存して、JSON データが正しく格納されることを確認

**対応フィールドタイプ:**
- JSON (推奨)
- Code

**Docker Compose コマンド:**
```bash
# 起動
docker-compose up -d

# ログ確認
docker-compose logs -f

# 停止
docker-compose down

# 再起動（extension更新後）
docker-compose restart directus
```

**トラブルシューティング:**
- Extension が表示されない場合：
  1. `docker-compose restart directus` で再起動
  2. ブラウザのキャッシュをクリア
  3. コンテナ内で `ls /directus/extensions/directus-surveyjs-creator/` を確認

### 2025-11-14: Bundle Extensionへの移行とライセンスキー対応完了 ✅

#### 実装内容

**1. Bundle Extension への変更:**
- 単一の interface extension から bundle extension に移行
- interface + endpoint の2つの extension を含む構成に変更

**2. ライセンスキー管理機能の追加:**
- `src/endpoint.ts`: `/surveyjs-license` API endpoint を作成
  - 環境変数 `SURVEY_JS_LICENSE_KEY` を読み取ってJSONで返却
- `src/interface.vue`: `setLicenseKey()` を実装
  - `onMounted` 時に `/surveyjs-license` からライセンスキーを取得
  - `SurveyCreatorModel` 初期化前に `setLicenseKey()` を呼び出し
- `docker-compose.yml`: `SURVEY_JS_LICENSE_KEY` 環境変数を追加
  - `${SURVEY_JS_LICENSE_KEY:-}` でホストの環境変数から読み込み
- `.env.example`: ライセンスキー設定のサンプルファイルを作成

**3. package.json の更新:**
```json
{
  "directus:extension": {
    "type": "bundle",
    "partial": true,
    "path": {
      "app": "dist/app.js",
      "api": "dist/api.js"
    },
    "entries": [
      {
        "type": "interface",
        "name": "surveyjs-creator-interface",
        "source": "src/index.ts"
      },
      {
        "type": "endpoint",
        "name": "surveyjs-license",
        "source": "src/endpoint.ts"
      }
    ],
    "host": "^11.0.0"
  }
}
```

**4. ビルド出力の変更:**
- `dist/app.js`: フロントエンド（interface）- 3.2MB
- `dist/api.js`: バックエンド（endpoint）- 48KB
- 古い `dist/index.js` は削除

**5. テストの更新:**
- `global.fetch` のモック追加
- `setLicenseKey` のモック追加
- 全テスト (14/14) パス ✅

#### ライセンスキーの設定方法

**方法1: 環境変数ファイル (.env)**
```bash
# .env ファイルを作成
echo "SURVEY_JS_LICENSE_KEY=your-license-key-here" > .env

# Docker Compose 起動
docker-compose up -d
```

**方法2: 直接指定**
```bash
# docker-compose 起動時に指定
SURVEY_JS_LICENSE_KEY=your-license-key-here docker-compose up -d
```

**方法3: システム環境変数**
```bash
# シェルの設定ファイルに追加 (~/.bashrc, ~/.zshrc など)
export SURVEY_JS_LICENSE_KEY=your-license-key-here
```

#### 動作確認

1. **Endpoint テスト:**
```bash
curl http://localhost:8055/surveyjs-license
# => {"licenseKey":"your-license-key-here"}
```

2. **Interface 表示:**
- Directus Admin にログイン
- surveyJSON フィールドを開く
- SurveyJS Creator が表示される
- ライセンスキーが設定されていれば、アラートバナーは表示されない

#### 技術詳細

**データフロー:**
```
環境変数 SURVEY_JS_LICENSE_KEY
    ↓
endpoint.ts (process.env.SURVEY_JS_LICENSE_KEY)
    ↓
GET /surveyjs-license
    ↓
interface.vue (fetchLicenseKey())
    ↓
setLicenseKey(licenseKey)
    ↓
new SurveyCreatorModel()
```

**セキュリティ考慮事項:**
- ライセンスキーはサーバーサイド（endpoint）で管理
- フロントエンドは起動時にAPIから取得
- 環境変数として外部化され、コードにハードコードされない
- 注意: SurveyJS のライセンスキーはクライアント側で可視化されるため、完全な秘匿化は不可能

#### 今後の改善案

- [ ] Interface Options でライセンスキーを設定できるようにする（フィールドごと）
- [ ] ライセンスキーのバリデーション（形式チェック）
- [ ] エラーハンドリングの改善（ライセンスキー取得失敗時の UI フィードバック）

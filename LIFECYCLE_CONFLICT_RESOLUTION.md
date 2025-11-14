# Directus × SurveyJS Creator ライフサイクル衝突問題と解決策

## 問題の本質

DirectusのInterface Extensionのライフサイクル管理と、SurveyJS Creatorの大規模なメモリフットプリントが衝突し、以下の問題が発生しました：

1. **保存したJSONがdesigner画面に反映されない**
2. **新規作成時に初期化されず編集できない**
3. **watchを使うとブラウザがメモリクラッシュする**

## 根本原因：2つのライフサイクルのミスマッチ

### Directusのライフサイクル

```
1. コンポーネントマウント
   ├─ props.value = null（初期状態）
   ├─ onMounted()実行
   └─ DOMレンダリング完了

2. 非同期データロード（パフォーマンス最適化のため）
   ├─ バックグラウンドでAPIからデータ取得
   ├─ 100-200ms後にprops.valueを更新
   └─ コンポーネントは再マウントされない（propsのみ変更）
```

### SurveyJS Creatorの特性

```
特性1: 重量級コンポーネント（3.2MB）
  └─ 大量のメモリを消費

特性2: 初期化時にJSONを設定
  └─ new SurveyCreatorModel(options)
  └─ creator.JSON = surveyJson
  └─ 一度設定したら、再初期化が必要

特性3: リアクティブ更新に弱い
  └─ props変更を検知するwatchを使うと
  └─ 再レンダリングの度に大量のメモリを消費
  └─ ブラウザクラッシュ（Chrome error code 5）
```

## 試行錯誤の過程

### 試行1: 単純なwatch（失敗）

```typescript
watch(() => props.value, () => {
  initializeCreator();
});
```

**結果**: ❌ ブラウザがメモリクラッシュ
- 無限ループでCreatorが再作成される
- SurveyJS Creatorの大きなメモリフットプリントが問題に

### 試行2: watchでcreator.JSONのみ更新（失敗）

```typescript
watch(() => props.value, (newValue) => {
  const newSurveyJson = parseSurveyValue(newValue);
  creator.value.JSON = newSurveyJson;
});
```

**結果**: ❌ やはりメモリクラッシュ
- `creator.JSON`の更新も内部で大量の処理をトリガー
- 継続的なwatchには耐えられない

### 試行3: 手動リフレッシュボタン（部分的成功）

```typescript
const needsRefresh = computed(() => {
  const currentValueStr = typeof props.value === 'string' ? props.value : JSON.stringify(props.value || '');
  return currentValueStr !== lastLoadedValue.value;
});

// ボタンクリックで手動更新
function refreshCreator() {
  creator.value.JSON = parseSurveyValue(props.value);
}
```

**結果**: ⚠️ 動作するが、UXが悪い
- ユーザーが手動でボタンをクリックする必要がある
- 自動反映がない

### 試行4: props.value=nullで初期化をスキップ（失敗）

```typescript
function initializeCreator() {
  if (!props.value) {
    return; // nullの場合は何もしない
  }
  // ...
}
```

**結果**: ❌ 新規作成時に初期化されない
- 既存アイテムは動作するが、新規作成時に「Loading...」のまま
- defaultSurveyが設定されない

## 最終的な解決策

### アプローチ：「一度だけ動作するwatch + タイムアウトフォールバック」

```typescript
// 1. 初期化完了フラグ
const initialLoadComplete = ref(false);

// 2. 初期化関数（forceパラメータで再初期化を許可）
function initializeCreator(force: boolean = false) {
  if (!isMounted.value || !licenseKeyFetched.value) {
    return;
  }

  // 既に初期化済みの場合、forceされない限りスキップ
  if (initialLoadComplete.value && !force) {
    return;
  }

  // 強制再初期化の場合、古いインスタンスを破棄
  if (creator.value && force) {
    creator.value = null;
  }

  const surveyJson = parseSurveyValue(props.value);
  const newCreator = new SurveyCreatorModel(creatorOptions);
  newCreator.JSON = surveyJson;

  // ...

  creator.value = newCreator;
  initialLoadComplete.value = true;
}

// 3. 一度だけ動作するwatch
const stopWatch = watch(() => props.value, (newValue) => {
  // 実際のデータ（非null）が来たら、強制再初期化して停止
  if (newValue && licenseKeyFetched.value && isMounted.value) {
    initializeCreator(true); // 強制再初期化
    stopWatch(); // watchを停止（これ以降は動作しない）
  }
});

// 4. マウント時の処理 + タイムアウトフォールバック
onMounted(async () => {
  isMounted.value = true;
  await fetchLicenseKey();
  initializeCreator(); // 即座に初期化を試みる

  // 100ms待ってもまだ初期化されてない場合（新規作成時）、
  // defaultSurveyで初期化
  setTimeout(() => {
    if (!initialLoadComplete.value) {
      initializeCreator();
    }
  }, 100);
});
```

### なぜこの解決策が機能するのか

#### ケース1: 新規作成（props.value = null）

```
1. onMounted()実行
   ├─ initializeCreator()呼ばれる
   ├─ props.value = null
   └─ defaultSurveyで初期化 ✅

2. 100ms後もprops.valueはnull
   └─ タイムアウトは何もしない（既に初期化済み）

3. watchは動作しない
   └─ props.value = nullのまま（非nullにならない）
```

**結果**: ✅ defaultSurveyで即座に初期化され、編集可能

#### ケース2: 既存アイテム（props.valueが遅延読み込み）

```
1. onMounted()実行
   ├─ initializeCreator()呼ばれる
   ├─ props.value = null
   └─ defaultSurveyで初期化（一時的）

2. 50ms後、Directusがprops.valueを設定
   ├─ watchがトリガー
   ├─ props.value = {実際のデータ}
   └─ initializeCreator(true) で強制再初期化 ✅
   └─ 古いCreatorを破棄、新しいCreatorを作成
   └─ stopWatch()でwatchを停止

3. タイムアウトが実行される（100ms後）
   └─ 既に initialLoadComplete = true
   └─ 何もしない
```

**結果**: ✅ 保存されたsurveyが正しく反映される

#### ケース3: 既存アイテム（props.valueが即座に利用可能）

```
1. onMounted()実行
   ├─ initializeCreator()呼ばれる
   ├─ props.value = {実際のデータ}（既に設定済み）
   └─ 実際のデータで初期化 ✅
   └─ initialLoadComplete = true

2. watchがトリガー（props.valueの初期値として）
   ├─ initialLoadComplete = true
   └─ 何もしない（既に正しく初期化済み）
```

**結果**: ✅ 保存されたsurveyが即座に反映される

## キーポイント

### 1. watchは「一度だけ」動作させる

```typescript
const stopWatch = watch(() => props.value, (newValue) => {
  if (条件) {
    // 処理
    stopWatch(); // ⭐️ 必ず停止する
  }
});
```

**理由**:
- SurveyJS Creatorのような重量級コンポーネントでは、継続的なwatchはメモリクラッシュを引き起こす
- 初期ロード時のみ必要なので、一度動作したら停止する

### 2. フォールバック戦略

```typescript
setTimeout(() => {
  if (!initialLoadComplete.value) {
    initializeCreator(); // フォールバック
  }
}, 100);
```

**理由**:
- Directusの非同期読み込みのタイミングは保証されない
- 新規作成時（props.value=null）でも確実に初期化する必要がある
- タイムアウトで「最悪の場合」をカバー

### 3. 強制再初期化の仕組み

```typescript
function initializeCreator(force: boolean = false) {
  if (initialLoadComplete.value && !force) {
    return; // 通常は二重初期化を防ぐ
  }

  if (creator.value && force) {
    creator.value = null; // 古いインスタンスを破棄
  }

  // 新しいインスタンスを作成
  const newCreator = new SurveyCreatorModel(creatorOptions);
  // ...
}
```

**理由**:
- 遅延読み込みの場合、一度defaultSurveyで初期化した後、正しいデータで再初期化する必要がある
- `force`パラメータで明示的に再初期化を許可
- 古いインスタンスは必ず破棄してメモリリークを防ぐ

## 得られた教訓

### Directus Extension開発

1. **props.valueは常に非同期と考える**
   - `onMounted`時点ではnullの可能性がある
   - watchで初回の値を検知する必要がある

2. **パフォーマンス最適化の影響**
   - Directusは多数のフィールドを効率的にレンダリングするため、propsを非同期で設定する
   - これはDirectusの設計上の選択であり、Extension側で対応する必要がある

### Vue 3 リアクティビティ

1. **watchは停止できる**
   ```typescript
   const stop = watch(source, callback);
   stop(); // これでwatchが停止する
   ```

2. **一度だけ実行したいwatchのパターン**
   ```typescript
   const stop = watch(source, (value) => {
     if (条件を満たしたら) {
       // 処理
       stop(); // 即座に停止
     }
   });
   ```

### 大規模コンポーネントの統合

1. **メモリフットプリントを意識する**
   - SurveyJS Creatorのような大規模コンポーネント（3.2MB）では、継続的なwatchは避ける
   - 初期化は最小限に抑える

2. **ライフサイクルの違いを理解する**
   - ホストフレームワーク（Directus）のライフサイクル
   - 統合するライブラリ（SurveyJS）のライフサイクル
   - この2つの「タイミングのズレ」を適切に処理する

3. **フォールバック戦略は必須**
   - 理想的なケースだけでなく、最悪のケースも考慮する
   - タイムアウトやデフォルト値で安全性を確保する

## まとめ

この問題は、**2つの異なるライフサイクルを持つシステムを統合する際の典型的な課題**でした。

- **Directus**: パフォーマンス最適化のため、propsを非同期で設定
- **SurveyJS Creator**: 大規模で、初期化にコストがかかり、継続的な更新に弱い

解決策は、以下の3つの戦略の組み合わせ：

1. **一度だけ動作するwatch**: 初期ロード時のみwatchし、その後は停止
2. **タイムアウトフォールバック**: 最悪のケース（新規作成）をカバー
3. **強制再初期化の仕組み**: 遅延読み込みの場合に正しいデータで再初期化

この解決策により、以下を実現：

✅ 新規作成時に即座に編集可能
✅ 既存アイテムで保存されたJSONが正しく反映
✅ メモリクラッシュなし
✅ リロード不要
✅ 良好なユーザー体験

## コード全体

最終的な実装は [src/interface.vue](./src/interface.vue) を参照してください。

重要な部分：
- `initialLoadComplete`フラグ
- `initializeCreator(force)`関数
- 一度だけ動作する`stopWatch`
- `onMounted`内のタイムアウトフォールバック

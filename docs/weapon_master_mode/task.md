# エクストラエネミー機能 実装タスク

- `[/]` task.md の更新
- `[ ]` `App.jsx` の修正
  - `[ ]` `extraWeapons` ステートの追加と localStorage での永続化
  - `[ ]` `data.txt` の `weapons` と `extraWeapons` を結合した `allWeapons` の導出
  - `[ ]` 各種プルダウンで `weapons` の代わりに `allWeapons` を参照するように修正
  - `[ ]` エクストラエネミー作成用UIフォームの追加
  - `[ ]` Worker に `UPDATE_EXTRA_WEAPONS` を送信する useEffect フックの追加
- `[ ]` `simulationWorker.js` の修正
  - `[ ]` `UPDATE_EXTRA_WEAPONS` メッセージの処理ブロック追加
  - `[ ]` `generateValidConfigs` と `resolveConfig` を使用した計算キャッシュの更新処理
- `[ ]` 動作確認
- `[ ]` walkthrough.md の更新

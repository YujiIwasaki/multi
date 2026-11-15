# かけ算ひっ算トレーナー

2けた・3けたのかけ算のひっ算を、1マスずつ手順どおりに練習する Web アプリです。
まちがえたマスごとに誤りの種類（位どりのズレ、かける数字のとりちがえ、0 の扱いなど）を判定して解説します。

ビルド不要です。このフォルダのファイルをそのまま GitHub に上げれば動きます。

## 公開（GitHub Pages）と iPad での使い方

1. GitHub で公開リポジトリ（例：`hissan-trainer`）を作る
2. このフォルダの中身を、リポジトリの一番上（ルート）にアップロードする
3. リポジトリの **Settings → Pages → Build and deployment** で「Deploy from a branch」、ブランチ `main`、フォルダ `/ (root)` を選んで Save
4. 数分後に表示される URL（`https://<ユーザー名>.github.io/hissan-trainer/`）を iPad の Safari で開く
5. 共有ボタン →「ホーム画面に追加」。以降はアイコンから起動（通信なしでも動きます）

> コマンドで上げる場合（このフォルダで実行）：
> ```
> git init
> git add .
> git commit -m "first version"
> git branch -M main
> git remote add origin https://github.com/<ユーザー名>/hissan-trainer.git
> git push -u origin main
> ```

## アプリを更新するとき

1. ファイルを直す
2. **`service-worker.js` の `CACHE = 'hissan-v1'` の数字を1つ上げる**（上げ忘れると iPad で古い版のままになります）
3. ファイルを足したときは、`service-worker.js` の `ASSETS` にも追加する
4. GitHub に上げる → iPad でアプリを開くと「あたらしい バージョンが あります」と出るのでタップ

## PC での動作確認

`index.html` をダブルクリックで開くと ES モジュールが読み込めないため、簡易サーバーで開きます。

```
python -m http.server 8000
```

ブラウザで `http://localhost:8000/` を開きます。

## テスト

ロジック（マス目の計算・問題生成・誤り診断・解説文）のテストがあります。

- Node.js で：`node tests/run-node.mjs`
- ブラウザで：簡易サーバーを起動して `http://localhost:8000/tests/` を開く

## せってい画面

ホームの「⚙ せってい（おとなの人）」から開きます。かけ算の問題に答えるとロックが外れます。
問題数、0 の問題をまぜる数、「かける数字は どれ？」「どこから 書きはじめる？」の出し方、データのバックアップ（書き出し・読み込み）などを変えられます。
レベルは最初からすべて選べます。くり上がりは暗算する前提なので、くり上がり用のマスはありません。

## フォルダ構成

```
index.html / manifest.json / service-worker.js
css/style.css
js/app.js               起動・画面の切り替え
js/core/                ロジック（DOM に触れない）
  layout.js             ひっ算のマス目と入力手順
  generator.js          問題生成・レベル定義・類題
  diagnosis.js          誤り診断（E1〜E6, Z1〜Z4）
  explain.js            ヒント・解説の文
  judge.js / places.js
js/data/                IndexedDB・設定・進捗
js/ui/                  画面と部品
icons/                  アイコン
tests/                  テスト
```

## 設計書との違い（MVP で割り切ったところ）

- 採点は「すぐチェック」のみ。「さいごにチェック」は第2版で追加する
- すぐチェックでは1マスごとに確定するため、キーパッドの「けす」「もどる」は置いていない
- 「かける数字は どれ？」は掛ける数が2けた以上のときだけ、「どこから 書きはじめる？」は2段目以降だけ聞く（1段目は答えが一の位に決まっているため）
- 解説の「線で結ぶ・矢印」は、結ぶ両端を色で強調する表現にしている
- 保護者画面（履歴・苦手分析）は第2版。設定とバックアップだけを「せってい」画面として先に入れている

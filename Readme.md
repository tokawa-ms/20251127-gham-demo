# 👾 スペースインベーダー

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)](https://developer.mozilla.org/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)](https://developer.mozilla.org/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)](https://developer.mozilla.org/docs/Web/JavaScript)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

> 80年代のアーケードゲームを意識したレトロなデザインのスペースインベーダー クローンゲーム

## 📋 概要

このリポジトリは、HTML5 Canvas と Web Audio API を使用して実装されたスペースインベーダーのクローンゲームです。ブラウザで HTML ファイルを開くだけで、懐かしいアーケードゲームを楽しむことができます。

### ✨ 主な特徴

- 🎮 **クラシックなゲームプレイ** - オリジナルに忠実なゲームメカニクス
- 📺 **レトロなビジュアル** - CRTスキャンライン効果付きのレトロデザイン
- 🔊 **効果音** - Web Audio API によるオリジナル風サウンド
- 💾 **ハイスコア保存** - ローカルストレージによるスコア記録
- ⚡ **ゼロ設定** - ブラウザで直接実行可能

## 🎮 ゲームの遊び方

### 操作方法

| キー | 動作 |
|------|------|
| ← → | 自機を左右に移動 |
| SPACE | 弾を発射 |
| S | ゲーム開始 |
| P | 一時停止/再開 |
| R | リセット |

### ゲームルール

1. 自機を操作してインベーダーを撃ち落とす
2. インベーダーが画面下部に到達するとゲームオーバー
3. バリアは敵の弾や自機の弾で徐々に破壊される
4. UFOを撃ち落とすとボーナス得点（300点）
5. インベーダーを全て撃ち落とすと次のステージに進む
6. 残機がなくなるとゲームオーバー

### スコアリング

| インベーダー（上から） | 色 | スコア |
|----------------------|-----|--------|
| 1段目 | 赤 | 50点 |
| 2段目 | オレンジ | 40点 |
| 3段目 | 黄 | 30点 |
| 4段目 | 緑 | 20点 |
| 5段目 | シアン | 10点 |
| UFO | - | 300点 |

## 🛠️ 技術スタック

| 技術 | 用途 |
|------|------|
| HTML5 Canvas | ゲーム描画 |
| CSS3 | スタイリング（CRT効果など） |
| [Tailwind CSS](https://tailwindcss.com/) (CDN) | UIデザイン |
| JavaScript (ES6+) | ゲームロジック |
| Web Audio API | サウンド生成 |
| LocalStorage | ハイスコア保存 |

## 📁 プロジェクト構造

```
📦 20251127-gham-demo/
├── 📄 Readme.md              # このファイル
├── 📄 LICENSE                # MITライセンス
├── 📁 docs/                  # ドキュメント
│   └── 📄 SpaceInvaders.md   # 詳細なゲーム仕様書
└── 📁 src/                   # ソースコード
    ├── 📄 index.html         # メインHTML
    ├── 📁 css/
    │   └── 📄 styles.css     # スタイルシート
    └── 📁 js/
        └── 📄 script.js      # ゲームロジック
```

## 🚀 クイックスタート

### 前提条件

- モダンな Web ブラウザ (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)

### 実行方法

1. リポジトリをクローンまたはダウンロード

   ```bash
   git clone https://github.com/tokawa-ms/20251127-gham-demo.git
   ```

2. `src/index.html` をブラウザで開く

3. **S** キーまたは **START** ボタンでゲーム開始！

## 📖 詳細ドキュメント

ゲームの詳細な仕様については、[docs/SpaceInvaders.md](docs/SpaceInvaders.md) を参照してください。

## 🤝 コントリビューション

プロジェクトへの貢献を歓迎します！

1. このリポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. Pull Request を作成

## 📄 ライセンス

このプロジェクトは [MIT License](LICENSE) の下で公開されています。

---

<div align="center">
  <strong>👾 GAME OVER? TRY AGAIN! 👾</strong><br>
  Made with ❤️ and GitHub Copilot
</div>

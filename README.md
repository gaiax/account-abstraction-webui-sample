# Account Abscraction デモ

ERC-4337 に準拠した Account Abstraction (AA) のデモンストレーション用 Web インターフェースです．
必要なコントラクトをデプロイするためのスクリプトも含まれています．

Bundler には [Rundler](https://github.com/alchemyplatform/rundler) を使用しています．

## 動作確認環境

- macOS Sonoma v14.2 (23C64)
  - arch darwin/arm64
- Node.js v18.18.0
  - npm v9.8.1
- Docker v24.0.7
- Docker Compose v2.23.3

## 起動方法

### 1. リポジトリをクローン

```bash
$ git clone https://github.com/alchemyplatform/rundler.git
$ git clone https://github.com/gaiax/account-abstraction-webui-sample.git
```

### 2. バックグラウンドサービスを起動

```bash
$ cd rundler && docker buildx build . -t rundler && cd ..
$ cd account-abstraction-webui-sample && docker compose up -d
```

### 3. EntryPoint など必要なコントラクトを準備

以下のコマンドを入力すると，CLI プロンプトが開始されるので，適宜状況に応じて進める．

```bash
$ npx hardhat run src/scripts/setup.ts --network localhost
```

デプロイが完了すると，コントラクトアドレスが表示されるので，それらを `.env` に記述しておく．

```bash
$ cp example.env .env
```

### 4. フロントエンドを起動

```bash
$ npm i && npm run dev
```

http://localhost:3000 でアクセスできる．

### その他

#### 任意のアドレスにトークンを送る

```bash
$ npx hardhat run src/scripts/sendToken.ts --network localhost
```

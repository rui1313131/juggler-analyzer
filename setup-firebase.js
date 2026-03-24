const { execSync } = require('child_process');
const fs = require('fs');

console.log("=========================================");
console.log("🔥 雀蛙 Firebase自動セットアップスクリプト 🔥");
console.log("=========================================\n");

function runCommand(command, ignoreError = false) {
    try {
        return execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    } catch (e) {
        if (!ignoreError) {
            console.error(`エラー発生: ${command}`);
            console.error(e.stderr || e.stdout);
            process.exit(1);
        }
        return e.stderr || e.stdout;
    }
}

async function main() {
    // 1. Firebase Login
    console.log("1. Firebaseへのログインを確認しています...");
    const loginStatus = runCommand('firebase login:ci', true);
    if (loginStatus.includes('Authentication Error') || loginStatus.includes('Not logged in')) {
        console.log("⚠️ ログインされていません。ブラウザを開いてGoogleアカウントでログインしてください。");
        execSync('firebase login --interactive', { stdio: 'inherit' });
    } else {
        console.log("✅ ログイン済みです。");
    }

    // ランダムなIDの生成
    const uniqueId = Math.random().toString(36).substring(2, 8);
    const projectId = `juggler-analyzer-${uniqueId}`;
    console.log(`\n2. 新規Firebaseプロジェクトを作成します (ID: ${projectId}) ...`);
    
    // 2. プロジェクトの作成
    console.log("※少し時間がかかります...");
    runCommand(`firebase projects:create ${projectId} --display-name "JugglerAnalyzer"`);
    console.log("✅ プロジェクトを作成しました。");

    // 3. Webアプリの登録
    console.log("\n3. Webアプリをプロジェクトに登録します...");
    runCommand(`firebase apps:create web "JugglerWeb" --project ${projectId}`);
    console.log("✅ Webアプリを登録しました。");

    // 4. SDK Configの取得
    console.log("\n4. 接続用の設定(Config)を取得しています...");
    const configOutput = runCommand(`firebase apps:sdkconfig web --project ${projectId}`);
    
    // 取得した文字列から不要なログを削り、JSON部分だけを抜き出す簡易パース
    const jsonMatch = configOutput.match(/{\s+"projectId":[\s\S]*?}/);
    if (!jsonMatch) {
        console.error("❌ Configの取得に失敗しました。以下の出力を確認してください:", configOutput);
        process.exit(1);
    }

    const firebaseConfigStr = jsonMatch[0];
    
    // 5. js/firebase-config.js に書き込み
    console.log("\n5. アプリケーションに設定を適用します...");
    const configJsPath = './js/firebase-config.js';
    
    const newConfigJs = `/**
 * Firebase連携モジュール
 * (CUI自動セットアップにより自動生成されました)
 */

const firebaseConfig = ${firebaseConfigStr};

let db = null;

try {
  if (firebaseConfig.apiKey) {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    console.log("🔥 Firebase initialized automatically.");
  }
} catch (error) {
  console.error("Firebase initialization error:", error);
}

const CloudSync = {
  get isActive() {
    return db !== null;
  },

  async uploadRecord(record) {
    if (!this.isActive) return false;
    try {
      const publicData = {
        machineName: record.machineName,
        totalGames: record.totalGames,
        bestSetting: record.result.bestSetting,
        confidenceLevel: record.result.confidence.level,
        highSettingProb: record.result.highSettingProb,
        expectedValue: record.result.expectedValue,
        storeName: record.storeName || "不明",
        machineNumber: record.machineNumber || "不明",
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      };
      await db.collection("public_records").add(publicData);
      return true;
    } catch (e) {
      console.error("Cloud upload failed:", e);
      return false;
    }
  },

  async getPublicRecords() {
    if (!this.isActive) return [];
    try {
      const snapshot = await db.collection("public_records")
        .orderBy("timestamp", "desc")
        .limit(100)
        .get();
      const records = [];
      snapshot.forEach(doc => {
        records.push(doc.data());
      });
      return records;
    } catch (e) {
      console.error("Failed to fetch public records:", e);
      return [];
    }
  }
};
`;

    fs.writeFileSync(configJsPath, newConfigJs, 'utf8');
    console.log(`✅ [ ${configJsPath} ] に設定を上書きしました。`);

    // 終了案内
    console.log("\n=========================================");
    console.log("🎉 自動セットアップがほぼ完了しました！");
    console.log("ただし、「データベース(Firestore)の有効化」だけは手動で行う必要があります。");
    console.log(`1. ブラウザでアクセス: https://console.firebase.google.com/project/${projectId}/firestore`);
    console.log("2. 「データベースの作成」をクリック");
    console.log("3. 「テストモードで開始する」を選択して完了してください");
    console.log("=========================================");
}

main().catch(e => console.error(e));

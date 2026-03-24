/**
 * ジャグラー設定判別・期待値計算エンジン
 * ベイズ推定 + 二項分布による統計分析
 */

const AnalysisEngine = {
  /**
   * ベイズ推定で各設定の事後確率を計算
   * @param {string} machineName - 機種名
   * @param {number} totalGames - 総ゲーム数
   * @param {number} bigCount - BIG回数
   * @param {number} regCount - REG回数
   * @param {number|null} grapeCount - ぶどう回数（null=未計測）
   * @param {number[]} priors - 各設定の事前確率 [設定1,...,設定6]
   * @param {object|null} graphFeatures - スランプグラフ解析結果特徴量
   * @returns {object} 各設定の事後確率と推定設定
   */
  estimateSettings(machineName, totalGames, bigCount, regCount, grapeCount = null, priors = null, graphFeatures = null) {
    const spec = getMachineSpec(machineName);
    if (!spec || totalGames <= 0) return null;

    // デフォルト事前確率（均等）
    if (!priors) priors = [1/6, 1/6, 1/6, 1/6, 1/6, 1/6];

    const posteriors = [];
    let totalLikelihood = 0;

    for (let s = 1; s <= 6; s++) {
      const setting = spec.settings[s];
      
      // BIG尤度（二項分布の対数）
      const bigLikelihood = this._binomialLogLikelihood(totalGames, bigCount, setting.bigProb);
      // REG尤度
      const regLikelihood = this._binomialLogLikelihood(totalGames, regCount, setting.regProb);
      
      let logLikelihood = bigLikelihood + regLikelihood;

      // ぶどうデータがある場合
      if (grapeCount !== null && grapeCount > 0) {
        const grapeLikelihood = this._binomialLogLikelihood(totalGames, grapeCount, setting.grapeProb);
        logLikelihood += grapeLikelihood;
      }

      // グラフ波形特徴による補正（安定上昇型なら高設定の尤度を微増、など）
      if (graphFeatures) {
        const graphBonus = this._calcGraphBonus(s, graphFeatures); // sは設定(1〜6)
        logLikelihood += graphBonus;
      }

      // 対数事前確率を加算
      const logPosterior = logLikelihood + Math.log(priors[s - 1]);
      posteriors.push(logPosterior);
    }

    // ログサムエクスポネント正規化
    const maxLog = Math.max(...posteriors);
    const expPosteriors = posteriors.map(p => Math.exp(p - maxLog));
    const sumExp = expPosteriors.reduce((a, b) => a + b, 0);
    const normalized = expPosteriors.map(p => p / sumExp);

    // 最も確率の高い設定
    let bestSetting = 1;
    let bestProb = 0;
    normalized.forEach((prob, i) => {
      if (prob > bestProb) {
        bestProb = prob;
        bestSetting = i + 1;
      }
    });

    // 設定信頼度（上位設定の合計確率）
    const highSettingProb = normalized[3] + normalized[4] + normalized[5]; // 設定4,5,6

    return {
      probabilities: normalized.map((p, i) => ({
        setting: i + 1,
        probability: p,
        percentage: (p * 100).toFixed(1)
      })),
      bestSetting,
      bestProbability: bestProb,
      highSettingProb: (highSettingProb * 100).toFixed(1),
      confidence: this._calcConfidence(totalGames, graphFeatures)
    };
  },

  /**
   * グラフ波形情報に基づく尤度ボーナス係数 (対数としての加算値)
   */
  _calcGraphBonus(setting, features) {
    if (!features || !features.type) return 0;
    
    // 安定上昇型（設定6特有のミミズ状の右肩上がり）
    if (features.type.label.includes("安定")) {
      if (setting >= 4) return Math.log(1.3); // 設定4,5,6の確率を底上げ
      if (setting <= 2) return Math.log(0.8); // 低設定の確率を下げる
    }
    
    // 波乱・一撃（低・中間設定に見られる荒い波）
    if (features.type.label.includes("一撃")) {
      if (setting === 6) return Math.log(0.6); // 設定6っぽさを下げる
      if (setting === 3 || setting === 4) return Math.log(1.2); // 中間設定の可能性を上げる
    }

    // 右肩下がり（低設定特有の吸い込み）
    if (features.type.label.includes("吸い込み")) {
      if (setting <= 2) return Math.log(1.4); // 設定1, 2の尤度を上げる
      if (setting >= 5) return Math.log(0.5); // 高設定の確率を下げる
    }

    return 0; // 補正なし
  },

  /**
   * 二項分布の対数尤度
   */
  _binomialLogLikelihood(n, k, p) {
    if (p <= 0 || p >= 1) return -Infinity;
    if (k === 0 && n === 0) return 0;
    // log(C(n,k)) + k*log(p) + (n-k)*log(1-p)
    // C(n,k)は全設定で共通なので省略可
    return k * Math.log(p) + (n - k) * Math.log(1 - p);
  },

  /**
   * 回転数・付加情報に基づく信頼度
   */
  _calcConfidence(totalGames, graphFeatures = null) {
    let score = 0;
    let level = "";
    let desc = "";

    if (totalGames < 500) { level = "低"; desc = "データ不足"; score = 20; }
    else if (totalGames < 1500) { level = "中低"; desc = "参考程度"; score = 40; }
    else if (totalGames < 3000) { level = "中"; desc = "ある程度信頼可"; score = 60; }
    else if (totalGames < 5000) { level = "中高"; desc = "信頼性あり"; score = 75; }
    else if (totalGames < 8000) { level = "高"; desc = "かなり信頼できる"; score = 88; }
    else { level = "非常に高"; desc = "ほぼ確実"; score = 95; }

    // グラフ波形情報があれば信頼度を底上げ (+5〜10%)
    if (graphFeatures) {
      score = Math.min(99, score + 10);
      desc += "（波形解析済）";
    }

    return { level, description: desc, score };
  },

  /**
   * 期待値（期待収支）を計算
   * @returns {object} 期待収支情報
   */
  calcExpectedValue(machineName, settingProbs, remainingGames = 1000) {
    const spec = getMachineSpec(machineName);
    if (!spec) return null;

    let weightedMechRate = 0;
    settingProbs.forEach(sp => {
      const mechRate = spec.settings[sp.setting].mechRate;
      weightedMechRate += mechRate * sp.probability;
    });

    // 機械割から期待収支を算出
    const totalCoinIn = remainingGames * COINS_PER_GAME;
    const expectedCoinOut = totalCoinIn * (weightedMechRate / 100);
    const expectedProfit = (expectedCoinOut - totalCoinIn) * COIN_VALUE;
    
    // 時間あたり期待収支
    const hoursRemaining = remainingGames / GAMES_PER_HOUR;
    const profitPerHour = hoursRemaining > 0 ? expectedProfit / hoursRemaining : 0;

    return {
      weightedMechRate: weightedMechRate.toFixed(1),
      expectedProfit: Math.round(expectedProfit),
      profitPerHour: Math.round(profitPerHour),
      remainingGames,
      riskLevel: this._assessRisk(weightedMechRate)
    };
  },

  /**
   * リスク評価
   */
  _assessRisk(mechRate) {
    if (mechRate >= 105) return { level: "狙い目", color: "#e63946", icon: "🔥" };
    if (mechRate >= 102) return { level: "期待可", color: "#f4a261", icon: "✨" };
    if (mechRate >= 100) return { level: "ボーダー", color: "#e9c46a", icon: "⚖️" };
    if (mechRate >= 98) return { level: "微マイナス", color: "#2a9d8f", icon: "📉" };
    return { level: "回避推奨", color: "#264653", icon: "🚫" };
  },

  /**
   * ボーナス確率の偏差を計算
   */
  calcDeviation(machineName, setting, totalGames, bigCount, regCount) {
    const spec = getMachineSpec(machineName);
    if (!spec) return null;

    const s = spec.settings[setting];
    const expectedBig = totalGames * s.bigProb;
    const expectedReg = totalGames * s.regProb;

    return {
      bigDeviation: bigCount - expectedBig,
      regDeviation: regCount - expectedReg,
      bigRatio: totalGames > 0 ? (totalGames / bigCount).toFixed(1) : "---",
      regRatio: totalGames > 0 ? (totalGames / regCount).toFixed(1) : "---",
      combinedRatio: totalGames > 0 ? (totalGames / (bigCount + regCount)).toFixed(1) : "---"
    };
  },

  /**
   * 次のボーナスまでの予測ゲーム数を計算
   */
  predictNextBonus(machineName, estimatedSetting) {
    const spec = getMachineSpec(machineName);
    if (!spec) return null;
    
    const s = spec.settings[estimatedSetting];
    const combinedProb = s.bigProb + s.regProb;

    // 幾何分布に基づく予測
    const expectedGames = 1 / combinedProb;
    const median = Math.ceil(Math.log(0.5) / Math.log(1 - combinedProb));
    
    // 確率分布テーブル
    const probTable = [];
    for (let g = 50; g <= 500; g += 50) {
      const prob = 1 - Math.pow(1 - combinedProb, g);
      probTable.push({ games: g, probability: (prob * 100).toFixed(1) });
    }

    return {
      expectedGames: Math.round(expectedGames),
      medianGames: median,
      probTable
    };
  }
};

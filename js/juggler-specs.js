/**
 * ジャグラーシリーズ 機種別スペックデータベース
 * 設定1〜6の各種確率・機械割を定義
 */
const JUGGLER_SPECS = {
  "アイムジャグラーEX": {
    type: "6号機",
    settings: {
      1: { bigProb: 1/273.1, regProb: 1/439.8, combinedProb: 1/168.5, grapeProb: 1/6.49, mechRate: 97.0 },
      2: { bigProb: 1/269.7, regProb: 1/399.6, combinedProb: 1/161.0, grapeProb: 1/6.49, mechRate: 98.0 },
      3: { bigProb: 1/266.4, regProb: 1/331.0, combinedProb: 1/147.6, grapeProb: 1/6.49, mechRate: 99.5 },
      4: { bigProb: 1/254.0, regProb: 1/290.0, combinedProb: 1/135.4, grapeProb: 1/6.49, mechRate: 101.0 },
      5: { bigProb: 1/240.9, regProb: 1/255.0, combinedProb: 1/123.8, grapeProb: 1/6.49, mechRate: 103.0 },
      6: { bigProb: 1/229.1, regProb: 1/229.1, combinedProb: 1/114.6, grapeProb: 1/5.78, mechRate: 105.5 }
    },
    coinIn: 3, coinOut: { big: 325, reg: 110 }
  },
  "マイジャグラーV": {
    type: "6号機",
    settings: {
      1: { bigProb: 1/270.8, regProb: 1/431.2, combinedProb: 1/166.3, grapeProb: 1/6.50, mechRate: 97.4 },
      2: { bigProb: 1/267.5, regProb: 1/364.1, combinedProb: 1/154.3, grapeProb: 1/6.40, mechRate: 98.7 },
      3: { bigProb: 1/263.2, regProb: 1/318.1, combinedProb: 1/144.0, grapeProb: 1/6.35, mechRate: 100.7 },
      4: { bigProb: 1/252.1, regProb: 1/286.2, combinedProb: 1/134.0, grapeProb: 1/6.25, mechRate: 102.8 },
      5: { bigProb: 1/240.9, regProb: 1/255.0, combinedProb: 1/123.8, grapeProb: 1/6.23, mechRate: 105.3 },
      6: { bigProb: 1/229.1, regProb: 1/220.7, combinedProb: 1/112.4, grapeProb: 1/6.07, mechRate: 109.4 }
    },
    coinIn: 3, coinOut: { big: 325, reg: 110 }
  },
  "ファンキージャグラー2": {
    type: "6号機",
    settings: {
      1: { bigProb: 1/265.7, regProb: 1/452.0, combinedProb: 1/167.4, grapeProb: 1/6.49, mechRate: 97.7 },
      2: { bigProb: 1/262.5, regProb: 1/407.1, combinedProb: 1/159.7, grapeProb: 1/6.40, mechRate: 99.0 },
      3: { bigProb: 1/256.0, regProb: 1/341.3, combinedProb: 1/146.3, grapeProb: 1/6.35, mechRate: 100.8 },
      4: { bigProb: 1/245.1, regProb: 1/304.8, combinedProb: 1/135.8, grapeProb: 1/6.25, mechRate: 103.0 },
      5: { bigProb: 1/237.4, regProb: 1/268.6, combinedProb: 1/126.0, grapeProb: 1/6.23, mechRate: 105.0 },
      6: { bigProb: 1/226.0, regProb: 1/233.1, combinedProb: 1/114.8, grapeProb: 1/6.07, mechRate: 109.0 }
    },
    coinIn: 3, coinOut: { big: 325, reg: 110 }
  },
  "ハッピージャグラーVⅢ": {
    type: "6号機",
    settings: {
      1: { bigProb: 1/275.4, regProb: 1/409.6, combinedProb: 1/164.7, grapeProb: 1/6.49, mechRate: 97.0 },
      2: { bigProb: 1/271.9, regProb: 1/385.5, combinedProb: 1/159.3, grapeProb: 1/6.42, mechRate: 98.5 },
      3: { bigProb: 1/264.3, regProb: 1/341.3, combinedProb: 1/148.9, grapeProb: 1/6.35, mechRate: 100.5 },
      4: { bigProb: 1/252.1, regProb: 1/304.8, combinedProb: 1/137.9, grapeProb: 1/6.25, mechRate: 102.0 },
      5: { bigProb: 1/243.7, regProb: 1/273.1, combinedProb: 1/128.8, grapeProb: 1/6.23, mechRate: 104.0 },
      6: { bigProb: 1/229.1, regProb: 1/264.3, combinedProb: 1/122.7, grapeProb: 1/6.07, mechRate: 106.5 }
    },
    coinIn: 3, coinOut: { big: 325, reg: 110 }
  },
  "ゴーゴージャグラー3": {
    type: "6号機",
    settings: {
      1: { bigProb: 1/269.7, regProb: 1/364.1, combinedProb: 1/155.0, grapeProb: 1/6.49, mechRate: 97.8 },
      2: { bigProb: 1/268.6, regProb: 1/336.1, combinedProb: 1/149.3, grapeProb: 1/6.42, mechRate: 99.0 },
      3: { bigProb: 1/266.4, regProb: 1/318.1, combinedProb: 1/145.0, grapeProb: 1/6.35, mechRate: 100.5 },
      4: { bigProb: 1/254.0, regProb: 1/283.7, combinedProb: 1/134.0, grapeProb: 1/6.25, mechRate: 102.5 },
      5: { bigProb: 1/240.9, regProb: 1/255.0, combinedProb: 1/123.8, grapeProb: 1/6.23, mechRate: 104.5 },
      6: { bigProb: 1/229.1, regProb: 1/229.1, combinedProb: 1/114.6, grapeProb: 1/6.07, mechRate: 107.0 }
    },
    coinIn: 3, coinOut: { big: 325, reg: 110 }
  },
  "ネオアイムジャグラーEX": {
    type: "6号機",
    settings: {
      1: { bigProb: 1/273.1, regProb: 1/439.8, combinedProb: 1/168.5, grapeProb: 1/6.49, mechRate: 97.0 },
      2: { bigProb: 1/269.7, regProb: 1/399.6, combinedProb: 1/161.0, grapeProb: 1/6.49, mechRate: 98.0 },
      3: { bigProb: 1/269.7, regProb: 1/331.0, combinedProb: 1/148.6, grapeProb: 1/6.49, mechRate: 99.5 },
      4: { bigProb: 1/259.0, regProb: 1/315.1, combinedProb: 1/142.2, grapeProb: 1/6.49, mechRate: 101.1 },
      5: { bigProb: 1/259.0, regProb: 1/255.0, combinedProb: 1/128.5, grapeProb: 1/6.49, mechRate: 103.3 },
      6: { bigProb: 1/255.0, regProb: 1/255.0, combinedProb: 1/127.5, grapeProb: 1/5.83, mechRate: 105.5 }
    },
    coinIn: 3, coinOut: { big: 252, reg: 96 }
  },
  "ミスタージャグラー": {
    type: "6号機",
    settings: {
      1: { bigProb: 1/268.6, regProb: 1/374.5, combinedProb: 1/156.4, grapeProb: 1/6.29, mechRate: 97.0 },
      2: { bigProb: 1/267.5, regProb: 1/354.2, combinedProb: 1/152.4, grapeProb: 1/6.22, mechRate: 98.0 },
      3: { bigProb: 1/260.1, regProb: 1/331.0, combinedProb: 1/145.6, grapeProb: 1/6.15, mechRate: 99.8 },
      4: { bigProb: 1/249.2, regProb: 1/291.3, combinedProb: 1/134.3, grapeProb: 1/6.09, mechRate: 102.7 },
      5: { bigProb: 1/240.9, regProb: 1/257.0, combinedProb: 1/124.4, grapeProb: 1/6.02, mechRate: 105.5 },
      6: { bigProb: 1/237.4, regProb: 1/237.4, combinedProb: 1/118.7, grapeProb: 1/5.96, mechRate: 107.3 }
    },
    coinIn: 3, coinOut: { big: 240, reg: 96 }
  },
  "ジャグラーガールズSS": {
    type: "6号機",
    settings: {
      1: { bigProb: 1/273.1, regProb: 1/381.0, combinedProb: 1/159.1, grapeProb: 1/6.01, mechRate: 97.0 },
      2: { bigProb: 1/270.8, regProb: 1/350.5, combinedProb: 1/152.8, grapeProb: 1/6.01, mechRate: 97.9 },
      3: { bigProb: 1/260.1, regProb: 1/316.6, combinedProb: 1/142.8, grapeProb: 1/6.01, mechRate: 99.9 },
      4: { bigProb: 1/250.1, regProb: 1/281.3, combinedProb: 1/132.4, grapeProb: 1/6.01, mechRate: 102.1 },
      5: { bigProb: 1/243.6, regProb: 1/270.8, combinedProb: 1/128.3, grapeProb: 1/5.92, mechRate: 104.0 },
      6: { bigProb: 1/226.0, regProb: 1/252.1, combinedProb: 1/119.2, grapeProb: 1/5.89, mechRate: 107.5 }
    },
    coinIn: 3, coinOut: { big: 240, reg: 96 }
  }
};

/** 20円スロットの1枚あたりの価値 */
const COIN_VALUE = 20;
/** 1ゲームあたりの投入枚数 */
const COINS_PER_GAME = 3;
/** 1時間あたりの平均回転数 */
const GAMES_PER_HOUR = 700;

/**
 * 機種名一覧を取得
 */
function getMachineNames() {
  return Object.keys(JUGGLER_SPECS);
}

/**
 * 指定機種のスペックを取得
 */
function getMachineSpec(name) {
  return JUGGLER_SPECS[name] || null;
}

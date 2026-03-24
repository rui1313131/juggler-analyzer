/**
 * 店舗パターン分析エンジン
 * 店舗の設定投入傾向を学習・分析
 */

const StoreAnalyzer = {
  /**
   * 店舗データから設定投入パターンを分析
   * @param {Array} records - 店舗の履歴データ
   * @returns {object} パターン分析結果
   */
  analyzeStorePattern(records) {
    if (!records || records.length === 0) return null;

    const analysis = {
      totalRecords: records.length,
      byDayOfWeek: this._analyzeDayOfWeek(records),
      byMachineNumber: this._analyzeMachineNumber(records),
      byMachineType: this._analyzeMachineType(records),
      overallTrend: this._analyzeOverallTrend(records),
      recommendations: []
    };

    analysis.recommendations = this._generateRecommendations(analysis);
    return analysis;
  },

  /**
   * 曜日別パターン分析
   */
  _analyzeDayOfWeek(records) {
    const days = ["日", "月", "火", "水", "木", "金", "土"];
    const dayStats = {};
    days.forEach(d => { dayStats[d] = { count: 0, highSettingCount: 0, avgEstSetting: 0, totalSetting: 0 }; });

    records.forEach(r => {
      const day = days[new Date(r.date).getDay()];
      dayStats[day].count++;
      dayStats[day].totalSetting += r.estimatedSetting || 0;
      if (r.estimatedSetting >= 4) dayStats[day].highSettingCount++;
    });

    const result = {};
    days.forEach(d => {
      const s = dayStats[d];
      result[d] = {
        count: s.count,
        highSettingRate: s.count > 0 ? ((s.highSettingCount / s.count) * 100).toFixed(1) : "0.0",
        avgSetting: s.count > 0 ? (s.totalSetting / s.count).toFixed(1) : "---"
      };
    });
    return result;
  },

  /**
   * 台番号別パターン分析
   */
  _analyzeMachineNumber(records) {
    const machineStats = {};
    records.forEach(r => {
      if (!r.machineNumber) return;
      const num = r.machineNumber;
      if (!machineStats[num]) {
        machineStats[num] = { count: 0, highSettingCount: 0, totalSetting: 0 };
      }
      machineStats[num].count++;
      machineStats[num].totalSetting += r.estimatedSetting || 0;
      if (r.estimatedSetting >= 4) machineStats[num].highSettingCount++;
    });

    return Object.entries(machineStats)
      .map(([num, stats]) => ({
        machineNumber: num,
        count: stats.count,
        highSettingRate: ((stats.highSettingCount / stats.count) * 100).toFixed(1),
        avgSetting: (stats.totalSetting / stats.count).toFixed(1)
      }))
      .sort((a, b) => parseFloat(b.highSettingRate) - parseFloat(a.highSettingRate));
  },

  /**
   * 機種別パターン分析
   */
  _analyzeMachineType(records) {
    const typeStats = {};
    records.forEach(r => {
      if (!r.machineName) return;
      if (!typeStats[r.machineName]) {
        typeStats[r.machineName] = { count: 0, highSettingCount: 0, totalSetting: 0 };
      }
      typeStats[r.machineName].count++;
      typeStats[r.machineName].totalSetting += r.estimatedSetting || 0;
      if (r.estimatedSetting >= 4) typeStats[r.machineName].highSettingCount++;
    });

    return Object.entries(typeStats).map(([name, stats]) => ({
      machineName: name,
      count: stats.count,
      highSettingRate: ((stats.highSettingCount / stats.count) * 100).toFixed(1),
      avgSetting: (stats.totalSetting / stats.count).toFixed(1)
    }));
  },

  /**
   * 全体傾向分析
   */
  _analyzeOverallTrend(records) {
    const sorted = [...records].sort((a, b) => new Date(a.date) - new Date(b.date));
    const recentN = Math.min(20, sorted.length);
    const recent = sorted.slice(-recentN);
    
    const recentHighRate = recent.filter(r => r.estimatedSetting >= 4).length / recentN;
    const overallHighRate = records.filter(r => r.estimatedSetting >= 4).length / records.length;

    let trend = "横ばい";
    if (recentHighRate > overallHighRate + 0.1) trend = "上昇傾向";
    else if (recentHighRate < overallHighRate - 0.1) trend = "下降傾向";

    return {
      trend,
      recentHighRate: (recentHighRate * 100).toFixed(1),
      overallHighRate: (overallHighRate * 100).toFixed(1),
      totalRecords: records.length
    };
  },

  /**
   * おすすめ生成
   */
  _generateRecommendations(analysis) {
    const recs = [];
    
    // 曜日おすすめ
    const bestDay = Object.entries(analysis.byDayOfWeek)
      .filter(([, v]) => v.count >= 3)
      .sort((a, b) => parseFloat(b[1].highSettingRate) - parseFloat(a[1].highSettingRate))[0];
    
    if (bestDay && parseFloat(bestDay[1].highSettingRate) > 30) {
      recs.push({
        type: "day",
        icon: "📅",
        text: `${bestDay[0]}曜日が狙い目（高設定率 ${bestDay[1].highSettingRate}%）`
      });
    }

    // 台番号おすすめ
    const topMachines = analysis.byMachineNumber
      .filter(m => m.count >= 3 && parseFloat(m.highSettingRate) > 40);
    
    topMachines.slice(0, 3).forEach(m => {
      recs.push({
        type: "machine",
        icon: "🎰",
        text: `台番号 ${m.machineNumber} は高設定率 ${m.highSettingRate}%（${m.count}回分析）`
      });
    });

    // 傾向おすすめ
    if (analysis.overallTrend.trend === "上昇傾向") {
      recs.push({
        type: "trend",
        icon: "📈",
        text: "最近の高設定投入率が上昇中！チャンスかもしれません"
      });
    }

    return recs;
  },

  /**
   * 店舗の設定投入傾向から事前確率を生成
   * ベイズ推定の事前確率に使用
   */
  generatePriors(storeData, dayOfWeek, machineNumber) {
    const defaultPriors = [1/6, 1/6, 1/6, 1/6, 1/6, 1/6];
    if (!storeData || storeData.length < 10) return defaultPriors;

    // 該当条件のデータを抽出
    let filtered = storeData;
    const days = ["日", "月", "火", "水", "木", "金", "土"];
    
    if (dayOfWeek !== undefined) {
      const targetDay = days[dayOfWeek];
      const dayFiltered = storeData.filter(r => days[new Date(r.date).getDay()] === targetDay);
      if (dayFiltered.length >= 5) filtered = dayFiltered;
    }

    if (machineNumber) {
      const machineFiltered = filtered.filter(r => r.machineNumber === machineNumber);
      if (machineFiltered.length >= 3) filtered = machineFiltered;
    }

    // 設定分布を集計
    const settingCounts = [0, 0, 0, 0, 0, 0];
    filtered.forEach(r => {
      if (r.estimatedSetting >= 1 && r.estimatedSetting <= 6) {
        settingCounts[r.estimatedSetting - 1]++;
      }
    });

    const total = settingCounts.reduce((a, b) => a + b, 0);
    if (total === 0) return defaultPriors;

    // ラプラス平滑化
    return settingCounts.map(c => (c + 1) / (total + 6));
  }
};

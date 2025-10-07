const USER_DATA = require('../../utils/user-health-data');

Page({
  data: {
    // 仅展示 user-health-data.js 数据生成的折线图块
    chartBlocks: []
  },

  onLoad() {
    this.buildChartsFromUserData();
  },

  onShow() {
    this.buildChartsFromUserData();
  },

  // 日期标签格式化：YYYY-MM
  formatDateLabel(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  },

  // 构建折线图数据：仅使用 user-health-data.js
  buildChartsFromUserData() {
    try {
      const chartBlocks = [];
      const datasets = USER_DATA || {};

      Object.keys(datasets).forEach((name) => {
        const raw = Array.isArray(datasets[name]) ? datasets[name] : [];
        if (!raw.length) return;

        // 按日期升序
        const sorted = raw.slice().sort((a, b) => new Date(a['日期']) - new Date(b['日期']));
        const categories = sorted.map(r => this.formatDateLabel(r['日期']));

        // 找出所有候选数值字段（排除“日期”）
        const candidateKeys = Array.from(sorted.reduce((set, rec) => {
          Object.keys(rec).forEach(k => { if (k !== '日期') set.add(k); });
          return set;
        }, new Set()));

        // 仅保留“所有记录都为数值”的字段（支持科学计数法与前缀符号）
        const numericKeys = candidateKeys.filter(k => sorted.every(rec => {
          const v = rec[k];
          const n = this.toNumeric(v);
          return Number.isFinite(n);
        }));

        if (!numericKeys.length) return; // 无法绘制折线图则跳过

        const series = numericKeys.map(k => ({
          name: k,
          data: sorted.map(rec => this.toNumeric(rec[k])),
          // 保留原始字符串用于 tooltip 显示，如 "<3.0E+1"
          displayData: sorted.map(rec => rec[k])
        }));

        // 若为 HBV-DNA 定量，仅显示在 3.0E+1（数值 30）水平线和 1.5E+1（数值 15）的 1/3 处。
        // 其中数据值若小于 30（例如 "<3.0E+1" 被解析为 30），则将显示位置压到 30 的 1/6（约 5）。
        if (name === 'HBV-DNA定量') {
          const threshold = 30; // 3.0E+1
          const oneThird = 15; // 1.5E+1
          const oneSixth = 5;  // 30 的 1/6
          // 仅调整显示用的 data 值（不改变原始数据结构）
          const adjSeries = series.map(s => ({
            name: s.name,
            data: s.data.map(v => {
              if (!Number.isFinite(v)) return v;
              // 数据低于阈值时，绘制在 1/6 处
              if (v < threshold) return oneSixth;
              return v;
            }),
            displayData: s.displayData
          }));
          chartBlocks.push({ 
            title: name, 
            categories, 
            series: adjSeries,
            // 仅 HBV-DNA 定量启用科学记数法与固定 yMax=60
            scientific: true,
            yMax: threshold * 2,
            guideLines: [
              { y: threshold, color: '#DC2626', width: 1, dash: [4,4] },
              { y: oneThird, color: '#A3A3A3', width: 1 }
            ]
          });
        } else {
          chartBlocks.push({ title: name, categories, series });
        }
      });

      this.setData({ chartBlocks });
    } catch (e) {
      console.error('构建折线图失败:', e);
    }
  }
  ,
  // 通用数值解析：支持数字、前缀符号（<、≤、>、≥）以及科学计数法与单位
  toNumeric(value) {
    if (typeof value === 'number') return value;
    if (typeof value !== 'string') return NaN;
    let s = value.trim();
    // 去掉可能的前缀符号
    s = s.replace(/^[<≥>≤\s]+/, '');
    // 直接尝试 parseFloat（可解析科学计数法）
    let n = parseFloat(s);
    if (Number.isFinite(n)) return n;
    // 从字符串中提取第一个数字片段（含科学计数法）
    const m = s.match(/[0-9]+(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/);
    if (m) {
      n = parseFloat(m[0]);
      if (Number.isFinite(n)) return n;
    }
    return NaN;
  }
});
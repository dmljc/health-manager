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
          data: sorted.map(rec => this.toNumeric(rec[k]))
        }));

        chartBlocks.push({ title: name, categories, series });
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
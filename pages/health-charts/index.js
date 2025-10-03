const { 
  getLiverFunctionData, 
  getThyroidFunctionData, 
  getBloodRoutineData,
  generateSampleIndicatorData,
  INDICATOR_TYPES 
} = require('../../utils/health-indicators');
// 新增：引入用户体检数据
const USER_DATA = require('../../utils/user-health-data');

Page({
  data: {
    currentTab: 0,
    // 更新：根据用户数据调整标签页
    tabs: [
      { id: 'hbsag', name: '乙肝指标', icon: '🦠' },
      { id: 'liver', name: '肝功能', icon: '🫀' },
      { id: 'thyroid', name: '甲状腺', icon: '🦋' },
      { id: 'biochem', name: '生化', icon: '🧪' }
    ],
    
    // 图表数据
    chartCategories: [],
    chartSeries: [],
    
    // 当前显示的指标信息
    currentIndicators: [],
    
    // 更新时间范围选项，增加“全部”
    timeRanges: [
      { value: 'all', label: '全部' },
      { value: 90, label: '90天' },
      { value: 30, label: '30天' },
      { value: 7, label: '7天' }
    ],
    currentTimeRange: 'all'
  },

  onLoad() {
    this.loadChartData();
  },

  /**
   * 切换标签页
   */
  switchTab(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({ currentTab: index });
    this.loadChartData();
  },

  /**
   * 切换时间范围
   */
  switchTimeRange(e) {
    const range = e.currentTarget.dataset.range;
    this.setData({ currentTimeRange: range });
    this.loadChartData();
  },

  /**
   * 加载图表数据（使用用户真实数据）
   */
  loadChartData() {
    const { currentTab, currentTimeRange } = this.data;
    const tab = this.data.tabs[currentTab];
    
    let chartData = { categories: [], series: [] };
    let indicators = [];

    if (tab.id === 'hbsag') {
      // 乙肝表面抗原定量（中文字段：日期、数值；兼容英文：date、value）
      const raw = USER_DATA['乙肝表面抗原定量'] || [];
      const records = this.sortByDate(this.filterRecordsByRange(raw, currentTimeRange));
      const categories = records.map(r => this.formatDateLabel(this.getDateValue(r)));
      const series = [
        {
          name: '乙肝表面抗原定量',
          data: records.map(r => Number(this.getField(r, ['数值', 'value']))),
          color: '#2563EB'
        }
      ];
      chartData = { categories, series };
      indicators = this.buildIndicatorsFromLatest(records, [
        { keys: ['数值', 'value'], name: '乙肝表面抗原定量' }
      ]);
    } else if (tab.id === 'liver') {
      // 肝功能常规：ALT(丙氨酸氨基转移酶)、AST(天冬氨酸氨基转移酶)、总胆红素
      const raw = USER_DATA['肝功能常规'] || [];
      const records = this.sortByDate(this.filterRecordsByRange(raw, currentTimeRange));
      const categories = records.map(r => this.formatDateLabel(this.getDateValue(r)));
      const series = [
        { name: 'ALT', data: records.map(r => Number(this.getField(r, ['丙氨酸氨基转移酶', 'ALT']))), color: '#EF4444' },
        { name: 'AST', data: records.map(r => Number(this.getField(r, ['天冬氨酸氨基转移酶', 'AST']))), color: '#F59E0B' },
        { name: '总胆红素', data: records.map(r => Number(this.getField(r, ['总胆红素', 'total_bilirubin']))), color: '#10B981' }
      ];
      chartData = { categories, series };
      indicators = this.buildIndicatorsFromLatest(records, [
        { keys: ['丙氨酸氨基转移酶', 'ALT'], name: 'ALT' },
        { keys: ['天冬氨酸氨基转移酶', 'AST'], name: 'AST' },
        { keys: ['总胆红素', 'total_bilirubin'], name: '总胆红素' }
      ]);
    } else if (tab.id === 'thyroid') {
      // 甲状腺激素全套
      const raw = USER_DATA['甲状腺激素全套'] || [];
      const records = this.sortByDate(this.filterRecordsByRange(raw, currentTimeRange));
      const categories = records.map(r => this.formatDateLabel(this.getDateValue(r)));
      const series = [
        { name: 'TT3', data: records.map(r => Number(this.getField(r, ['TT3']))), color: '#2563EB' },
        { name: 'FT3', data: records.map(r => Number(this.getField(r, ['FT3']))), color: '#7C3AED' },
        { name: 'TT4', data: records.map(r => Number(this.getField(r, ['TT4']))), color: '#059669' },
        { name: 'FT4', data: records.map(r => Number(this.getField(r, ['FT4']))), color: '#F59E0B' }
      ];
      chartData = { categories, series };
      indicators = this.buildIndicatorsFromLatest(records, [
        { keys: ['TT3'], name: 'TT3' },
        { keys: ['FT3'], name: 'FT3' },
        { keys: ['TT4'], name: 'TT4' },
        { keys: ['FT4'], name: 'FT4' }
      ]);
    } else if (tab.id === 'biochem') {
      // 生化：葡萄糖、总胆固醇、甘油三酯、HDL（中文字段兼容英文别名）
      const raw = USER_DATA['肝功能常规'] || [];
      const records = this.sortByDate(this.filterRecordsByRange(raw, currentTimeRange));
      const categories = records.map(r => this.formatDateLabel(this.getDateValue(r)));
      const series = [
        { name: '葡萄糖', data: records.map(r => Number(this.getField(r, ['葡萄糖', 'glucose']))), color: '#7C3AED' },
        { name: '总胆固醇', data: records.map(r => Number(this.getField(r, ['总胆固醇', 'total_cholesterol']))), color: '#059669' },
        { name: '甘油三酯', data: records.map(r => Number(this.getField(r, ['甘油三酯', 'triglycerides']))), color: '#10B981' },
        { name: '高密度脂蛋白胆固醇', data: records.map(r => Number(this.getField(r, ['高密度脂蛋白胆固醇', 'HDL_cholesterol']))), color: '#2563EB' }
      ];
      chartData = { categories, series };
      indicators = this.buildIndicatorsFromLatest(records, [
        { keys: ['葡萄糖', 'glucose'], name: '葡萄糖' },
        { keys: ['总胆固醇', 'total_cholesterol'], name: '总胆固醇' },
        { keys: ['甘油三酯', 'triglycerides'], name: '甘油三酯' },
        { keys: ['高密度脂蛋白胆固醇', 'HDL_cholesterol'], name: '高密度脂蛋白胆固醇' }
      ]);
    }
    
    this.setData({
      chartCategories: chartData.categories,
      chartSeries: chartData.series,
      currentIndicators: indicators
    });
  },

  // 辅助：根据范围过滤记录（兼容中文日期字段）
  filterRecordsByRange(records, range) {
    if (!records || records.length === 0) return [];
    if (range === 'all') return records;
    const now = new Date();
    const days = Number(range);
    const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return records.filter(r => new Date(this.getDateValue(r)) >= start);
  },

  // 辅助：按日期升序排序（兼容中文日期字段）
  sortByDate(records) {
    return (records || []).slice().sort((a, b) => new Date(this.getDateValue(a)) - new Date(this.getDateValue(b)));
  },

  // 辅助：格式化日期标签（兼容中文日期字段）
  formatDateLabel(dateStrOrRecord) {
    const dateStr = typeof dateStrOrRecord === 'string' ? dateStrOrRecord : this.getDateValue(dateStrOrRecord);
    const d = new Date(dateStr);
    const y = d.getFullYear();
    const m = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${y}-${m}-${day}`;
  },

  // 新增：通用读取日期（中文/英文兼容）
  getDateValue(record) {
    return record && (record.date || record['日期']);
  },

  // 新增：通用读取字段值（支持多个备选键）
  getField(record, keysOrKey) {
    if (!record) return undefined;
    const keys = Array.isArray(keysOrKey) ? keysOrKey : [keysOrKey];
    for (const k of keys) {
      if (record[k] != null) return record[k];
    }
    return undefined;
  },

  // 辅助：从最新记录构建指标卡片（兼容中文/英文字段名）
  buildIndicatorsFromLatest(records, fields) {
    if (!records || records.length === 0) return [];
    const latest = records[records.length - 1];
    const prev = records.length >= 2 ? records[records.length - 2] : null;
    return fields.map(f => {
      const valRaw = this.getField(latest, f.keys || f.key);
      const val = typeof valRaw === 'number' ? valRaw : Number(valRaw);
      const prevRaw = prev ? this.getField(prev, f.keys || f.key) : null;
      const prevVal = prevRaw == null ? null : (typeof prevRaw === 'number' ? prevRaw : Number(prevRaw));
      let trend = 'stable';
      if (prevVal != null && !isNaN(prevVal) && !isNaN(val)) {
        const diff = val - prevVal;
        trend = Math.abs(diff) < 0.01 ? 'stable' : (diff > 0 ? 'up' : 'down');
      }
      return {
        name: f.name,
        value: isNaN(val) ? String(valRaw) : `${val}`,
        status: 'normal',
        trend
      };
    });
  },

  /**
   * 生成日期分类（旧示例保留，当前不使用）
   */
  generateDateCategories(days) {
    const categories = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const month = date.getMonth() + 1;
      const day = date.getDate();
      categories.push(`${month}/${day}`);
    }
    return categories;
  },

  /**
   * 生成示例数据（旧示例保留，当前不使用）
   */
  generateSampleData(min, max, days) {
    const data = [];
    const range = max - min;
    
    for (let i = 0; i < days; i++) {
      const baseValue = min + range * 0.5;
      const variation = range * 0.3 * (Math.random() - 0.5);
      const value = Math.max(min, Math.min(max, baseValue + variation));
      data.push(Number(value.toFixed(2)));
    }
    
    return data;
  },

  /**
   * 查看指标详情
   */
  viewIndicatorDetail(e) {
    const indicator = e.currentTarget.dataset.indicator;
    wx.showModal({
      title: indicator.name + ' 详情',
      content: `当前值: ${indicator.value}\n状态: ${this.getStatusText(indicator.status)}\n趋势: ${this.getTrendText(indicator.trend)}`,
      showCancel: false
    });
  },

  /**
   * 获取状态文本
   */
  getStatusText(status) {
    const statusMap = {
      normal: '正常',
      high: '偏高',
      low: '偏低'
    };
    return statusMap[status] || '未知';
  },

  /**
   * 获取趋势文本
   */
  getTrendText(trend) {
    const trendMap = {
      up: '上升',
      down: '下降',
      stable: '稳定'
    };
    return trendMap[trend] || '稳定';
  },

  /**
   * 导出报告
   */
  exportReport() {
    wx.showToast({
      title: '报告导出功能开发中',
      icon: 'none'
    });
  },

  /**
   * 添加新数据
   */
  addNewData() {
    wx.showToast({
      title: '数据录入功能开发中',
      icon: 'none'
    });
  }
});
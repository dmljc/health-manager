const { isAuthed, authorizeAndSave } = require('../../utils/auth');

Page({
  data: {
    chartBlocks: []
  },

  onLoad() {
    // 初始化时仅触发一次构建，避免重复请求
    this.initChartsOnce();
  },

  onShow() {
    // 页面显示时再次尝试，但有守卫避免重复请求
    this.initChartsOnce();
  },

  // 仅触发一次云端数据初始化，防止多次请求
  initChartsOnce() {
    if (this._examinationInitialized || this._examinationRequestInFlight) return;
    this._examinationRequestInFlight = true;
    this.buildChartsFromExamination()
      .finally(() => {
        this._examinationRequestInFlight = false;
        this._examinationInitialized = true;
      });
  },

  // 底部 Tab 点击切换到首页时触发轻震动反馈
  onTabItemTap(item) {
    // 震动反馈已移除
  },

  // 云环境初始化（按需，仅初始化一次）
  ensureCloudInit() {
    try {
      if (wx.cloud && !this._cloudInited) {
        wx.cloud.init({ env: wx.cloud.DYNAMIC_CURRENT_ENV });
        this._cloudInited = true;
      }
      return !!wx.cloud;
    } catch (_) {
      return false;
    }
  },

  // 标题标准化：支持代码值映射为中文标题；兼容旧的中文名称
  normalizeTitle(typeName) {
    const t = String(typeName || '').trim();
    const code = t.toLowerCase();
    if (code === 'ua' || /尿酸/i.test(t)) return '尿酸';
    if (code === 'tg' || /甘油三酯/i.test(t)) return '甘油三酯';
    if (code === 'dna' || /DNA/i.test(t)) return 'HBV-DNA定量';
    if (code === 'alt' || /谷丙|ALT/i.test(t)) return '谷丙转氨酶（ALT）';
    if (code === 'hbeag' || /HBeAg/i.test(t)) return '乙肝表面抗原（HBeAg）';
    if (code === 'hbeab' || /HBeAb/i.test(t)) return '乙型肝炎e抗体（HBeAb）';
    return t;
  },

  // 日期标签格式化：YYYY-MM
  formatDateLabel(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  },

  // 从云端 examination 集合构建折线图
  buildChartsFromExamination() {
    try {
      const ok = this.ensureCloudInit();
      if (!ok) {
        console.warn('wx.cloud 未就绪，暂不显示数据');
        this.setData({ chartBlocks: [] });
        return Promise.resolve();
      }
      wx.showLoading({ title: '加载数据', mask: true });
      return wx.cloud.callFunction({ name: 'examination' })
        .then((res) => {
          wx.hideLoading();
          const list = (res && res.result && res.result.list) || [];
          const groups = {};
          list.forEach(rec => {
            const key = String(rec.type || '未知类型').trim();
            if (!groups[key]) groups[key] = [];
            groups[key].push({
              _id: rec._id,
              date: rec.date,
              timestamp: rec.timestamp,
              value: rec.value,
              valueType: rec.valueType,
              typeLabel: rec.typeLabel || ''
            });
          });

          const chartBlocks = [];
          Object.keys(groups).forEach((typeKey) => {
            const records = Array.isArray(groups[typeKey]) ? groups[typeKey] : [];
            if (!records.length) return;

            // 仅保留可解析为数值的记录，避免出现“有数据但不显示”的情况
            const sorted = records.slice().sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
            const numericRecords = sorted.filter(rec => Number.isFinite(this.toNumeric(rec.value)));
            if (!numericRecords.length) return; // 该类型没有可绘制的数据，跳过

            const categories = numericRecords.map(rec => this.formatDateLabel(rec.date));
            let displayTitle = this.normalizeTitle(typeKey);
            // 若规范化后仍为代码值，且存在中文标签，优先使用标签显示
            if (/^[a-z]+$/.test(displayTitle) && numericRecords[0] && numericRecords[0].typeLabel) {
              displayTitle = this.normalizeTitle(numericRecords[0].typeLabel);
            }
            const isDNA = /DNA/i.test(displayTitle);
            const series = [{
              name: isDNA ? 'HBV-DNA定量' : '值',
              data: numericRecords.map(rec => this.toNumeric(rec.value)),
              displayData: numericRecords.map(rec => String(rec.value))
            }];

            if (displayTitle === 'HBV-DNA定量') {
              const threshold = 30; // 3.0E+1
              const oneThird = 15; // 1.5E+1
              const oneSixth = 5;  // 30 的 1/6
              const adjSeries = series.map(s => ({
                name: s.name,
                data: s.data.map(v => {
                  if (!Number.isFinite(v)) return v;
                  if (v < threshold) return oneSixth;
                  return v;
                }),
                displayData: s.displayData
              }));
              chartBlocks.push({
                title: displayTitle,
                categories,
                series: adjSeries,
                scientific: true,
                yMax: threshold + oneThird,
                yAxisTicks: [0, oneThird, threshold, threshold + oneThird],
                guideLines: [
                  { y: threshold, color: '#DC2626', width: 1, dash: [4,4] },
                  { y: oneThird, color: '#A3A3A3', width: 1 },
                  { y: threshold + oneThird, color: '#E5E7EB', width: 1 }
                ]
              });
            } else if (displayTitle === '尿酸') {
              chartBlocks.push({
                title: displayTitle,
                categories,
                series,
                minimal: true,
                scientific: false,
                showBackground: false,
                yAxisMin: 0,
                yAxisTicks: [0, 208, 428],
                safeRegion: {},
                backgroundRegions: [
                  { min: 0, max: 208, color: '#FEF3C7' },
                  { min: 428, max: 600, color: '#FEF3C7' }
                ],
                guideLines: [
                  { y: 208, color: '#DC2626', width: 1, dash: [4,4] },
                  { y: 428, color: '#DC2626', width: 1, dash: [4,4] }
                ]
              });
            } else if (displayTitle === '甘油三酯') {
              chartBlocks.push({
                title: displayTitle,
                categories,
                series,
                minimal: true,
                scientific: false,
                showBackground: false,
                yAxisMin: 0,
                yAxisMax: 2.75,
                yAxisTicks: [0, 1.7],
                safeRegion: {},
                backgroundRegions: [
                  { min: 1.7, max: 2.75, color: '#FEF3C7' }
                ],
                guideLines: [
                  { y: 1.7, color: '#DC2626', width: 1, dash: [4,4] }
                ]
              });
            } else {
              chartBlocks.push({
                title: displayTitle,
                categories,
                series,
                minimal: true,
                scientific: false,
                showBackground: false,
                yAxisMin: 0,
                yAxisTicks: [],
                safeRegion: {},
                backgroundRegions: [],
                guideLines: [],
                yAxisMax: undefined
              });
            }
          });

          if (chartBlocks.length === 0) {
            this.setData({ chartBlocks: [] });
          } else {
            this.setData({ chartBlocks });
          }
        })
        .catch((e) => {
          wx.hideLoading();
          console.error('从云端读取 examination 失败:', e);
          this.setData({ chartBlocks: [] });
        });
    } catch (e) {
      console.error('构建云端折线图失败:', e);
      this.setData({ chartBlocks: [] });
      return Promise.resolve();
    }
  },

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
  },


  // 打开指标新增/修改页面（授权作为首动作，避免“过于频繁”与不弹窗）
  async openIndicatorForm() {
    let authed = false;
    try { authed = isAuthed(); } catch (_) { authed = false; }
    if (!authed) {
      if (this._authInFlight) return;
      this._authInFlight = true;
      const { ok } = await this.ensureAuthorized();
      this._authInFlight = false;
      if (!ok) return;
    }
    wx.navigateTo({ url: '/pages/index-form/index' });
  },

  // 就地授权：允许用户快速重复操作，仅保留并发守卫（通用工具实现）
  async ensureAuthorized() {
    if (this._ensureAuthBusy) return { ok: false };
    this._ensureAuthBusy = true;
    try {
      const res = await authorizeAndSave({ desc: '用于同步头像昵称并保存到云端' });
      return res;
    } finally {
      this._ensureAuthBusy = false;
    }
  }
});
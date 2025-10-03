const UCharts = require('../../utils/u-charts');

Component({
  properties: {
    categories: { type: Array, value: [] },
    series: { type: Array, value: [] },
    // 若未传入，自动显示全部数据
    itemCount: { type: Number, value: null },
    // 默认不滚动，直接展示全量
    enableScroll: { type: Boolean, value: false },
    canvasId: { type: String, value: 'lineChartCanvas' },
    minimal: { type: Boolean, value: false }
  },
  data: {
    cWidth: 0,
    cHeight: 0,
    pixelRatio: 1
  },
  lifetimes: {
    attached() {
      // 微信小程序环境初始化
      const sys = wx.getSystemInfoSync();
      const pixelRatio = Math.max(1, Math.min(sys.pixelRatio || 1, 3));
      const windowWidth = sys.windowWidth;
      const pagePadding = 24 * windowWidth / 750;
      const cardPadding = 16 * windowWidth / 750;
      const cWidth = Math.floor(windowWidth - pagePadding * 2 - cardPadding * 2);
      const cHeight = Math.floor(520 * windowWidth / 750);
      this.setData({ pixelRatio, cWidth, cHeight }, () => {
        this.renderChart();
      });
    }
  },
  methods: {
    renderChart() {
      const { categories, series, cWidth, cHeight, pixelRatio, itemCount, enableScroll, canvasId, minimal } = this.data;
      if (!categories || !series || !cWidth || !cHeight) return;
      // 自动设置 itemCount 为分类总数，实现全量显示
      const finalItemCount = (itemCount == null || itemCount <= 0) ? categories.length : itemCount;
      this._chart = new UCharts({
        $this: this,
        canvasId: canvasId,
        type: 'line',
        categories,
        series,
        width: cWidth,
        height: cHeight,
        pixelRatio,
        legend: { show: false },
        dataLabel: false,
        dataPointShape: !minimal,
        enableScroll,
        xAxis: { disableGrid: true, itemCount: finalItemCount, scrollShow: enableScroll },
        yAxis: { gridType: minimal ? 'none' : 'dash', splitNumber: 4 },
        extra: { line: { type: 'curve' } },
        tooltip: {
          show: true,
          bgColor: '#fff',
          borderRadius: 8,
          fontColor: '#222',
          fontSize: 14,
          padding: 12,
          borderColor: '#E5E7EB',
          borderWidth: 1,
          // 不设置 width，保持自适应
          onShow: (item, category, index, opts) => {
            wx.vibrateShort && wx.vibrateShort({ type: 'light' });
          }
        }
      });
    },
    onChartTouchStart(e) { 
      if (this._chart && this._chart.scrollStart) this._chart.scrollStart(e);
      if (this._chart && this._chart.showTooltip) this._chart.showTooltip(e);
    },
    onChartTouchMove(e) { 
      if (this._chart && this._chart.scroll) this._chart.scroll(e);
      if (this._chart && this._chart.showTooltip) this._chart.showTooltip(e);
    },
    onChartTouchEnd(e) { 
      if (this._chart && this._chart.scrollEnd) this._chart.scrollEnd(e);
      if (this._chart && this._chart.hideTooltip) this._chart.hideTooltip();
    }
  },
  observers: {
    'categories, series'(cats, ser) {
      if (!cats || !ser) return;
      if (this._chart && this._chart.updateData) {
        const newItemCount = cats.length || 0;
        this._chart.updateData({ 
          categories: cats, 
          series: ser,
          xAxis: { itemCount: newItemCount, scrollShow: false },
          enableScroll: false
        });
      } else {
        this.renderChart();
      }
    }
   }
 });
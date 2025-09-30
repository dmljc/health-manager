const UCharts = require('../../utils/u-charts');

Component({
  properties: {
    categories: { type: Array, value: [] },
    series: { type: Array, value: [] },
    itemCount: { type: Number, value: 4 },
    enableScroll: { type: Boolean, value: true }
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
      const { categories, series, cWidth, cHeight, pixelRatio, itemCount, enableScroll } = this.data;
      if (!categories || !series || !cWidth || !cHeight) return;
      this._chart = new UCharts({
        $this: this,
        canvasId: 'lineChartCanvas',
        type: 'line',
        categories,
        series,
        width: cWidth,
        height: cHeight,
        pixelRatio,
        legend: { show: true },
        dataLabel: false,
        dataPointShape: true,
        enableScroll,
        xAxis: { disableGrid: true, itemCount, scrollShow: enableScroll },
        yAxis: { gridType: 'dash', splitNumber: 4 },
        extra: { line: { type: 'curve' } }
      });
    },
    onChartTouchStart(e) { if (this._chart && this._chart.scrollStart) this._chart.scrollStart(e); },
    onChartTouchMove(e) { if (this._chart && this._chart.scroll) this._chart.scroll(e); },
    onChartTouchEnd(e) { if (this._chart && this._chart.scrollEnd) this._chart.scrollEnd(e); }
  },
  observers: {
    'categories, series'(cats, ser) {
      if (!cats || !ser) return;
      if (this._chart && this._chart.updateData) {
        this._chart.updateData({ categories: cats, series: ser });
      } else {
        this.renderChart();
      }
    }
   }
 });
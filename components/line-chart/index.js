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
    minimal: { type: Boolean, value: false },
    // 是否显示背景区域（安全区/异常区），默认开启，可在页面按需关闭
    showBackground: { type: Boolean, value: true },
    // 仅当为 HBV-DNA 定量时启用科学记数法与 y 轴固定范围
    scientific: { type: Boolean, value: false },
    // 可选：外部传入 y 轴最大值（仅科学模式下使用）
    yMax: { type: Number, value: null },
    // 可选：参考横线配置，传递给图表库 extra.guideLines
    guideLines: { type: Array, value: [] },
    backgroundRegions: { type: Array, value: [] },
    safeRegion: { type: Object, value: null },
    yAxisTicks: { type: Array, value: null },
    yAxisMax: { type: Number, value: null },
    // 新增：非科学模式下可配置 y 轴最小值，确保参考线在显示范围内
    yAxisMin: { type: Number, value: null }
  },
  data: {
    cWidth: 0,
    cHeight: 0,
    pixelRatio: 1,
    _canvasNode: null,
    _ctx2d: null
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
        // 获取 Canvas 2D 节点与上下文
        wx.createSelectorQuery()
          .in(this)
          .select(`#${this.data.canvasId}`)
          .node()
          .exec((res) => {
            try {
              const node = res && res[0] && res[0].node;
              if (node) {
                const ctx = node.getContext('2d');
                // 设置像素比与尺寸，避免模糊
                node.width = cWidth * pixelRatio;
                node.height = cHeight * pixelRatio;
                ctx.scale(pixelRatio, pixelRatio);
                this.setData({ _canvasNode: node, _ctx2d: ctx }, () => this.renderChart());
              } else {
                // 回退：仍然渲染（图表库会使用旧接口）
                this.renderChart();
              }
            } catch (_) {
              this.renderChart();
            }
          });
      });
    }
  },
  methods: {
    computeEffectiveTicks(yAxisTicks, series, safeRegion) {
      if (Array.isArray(yAxisTicks) && yAxisTicks.length > 0) return yAxisTicks;
      try {
        const hasTriglycerides = (series || []).some(s => {
          const name = String(s && s.name || '').toLowerCase();
          return name.includes('甘油三酯') || name.includes('triglyceride');
        });
        if (hasTriglycerides) {
          return [0, 1.7];
        }
        // 新增：HBV-DNA定量在科学计数法下使用自定义刻度，去掉顶部最大值刻度
        const hasHBVDNA = (series || []).some(s => {
          const name = String(s && s.name || '').toLowerCase();
          // 仅针对 HBV-DNA 定量系列匹配，避免误中“乙肝表面抗原定量”
          return name.includes('hbv-dna') || name.includes('dna');
        });
        if (hasHBVDNA) {
          // 仅显示 0E0 / 1.5E+1 / 3.0E+1 / 4.5E+1，对应数值 [0, 15, 30, 45]
          return [0, 15, 30, 45];
        }
      } catch (_) {}
      return null;
    },
    renderChart() {
      const { categories, series, cWidth, cHeight, pixelRatio, itemCount, enableScroll, canvasId, minimal, scientific, yMax, guideLines, safeRegion, backgroundRegions, yAxisTicks, yAxisMin, yAxisMax, showBackground, _ctx2d, _canvasNode } = this.data;
      if (!categories || !series || !cWidth || !cHeight) return;
      // 自动设置 itemCount 为分类总数，实现全量显示
      const finalItemCount = (itemCount == null || itemCount <= 0) ? categories.length : itemCount;
      const useScientific = !!scientific;
      let finalYMax = yMax;
      if (useScientific) {
        // 计算 y 轴最大值为数据最大值的两倍，保持居中显示
        let maxVal = 0;
        try {
          series.forEach(s => {
            (s.data || []).forEach(v => {
              if (typeof v === 'number' && Number.isFinite(v)) {
                if (v > maxVal) maxVal = v;
              }
            });
          });
        } catch (_) {}
        if (finalYMax == null) {
          finalYMax = maxVal > 0 ? maxVal * 2 : undefined;
        }
      }
      const valueFormatter = useScientific ? ((v) => {
        if (v == null || !isFinite(v)) return '';
        if (v === 0) return '0E0';
        const exp = Math.floor(Math.log10(Math.abs(v)));
        const mantissa = v / Math.pow(10, exp);
        const mStr = mantissa.toFixed(1);
        const sign = exp >= 0 ? '+' : '';
        return `${mStr}E${sign}${exp}`;
      }) : null;
      // 推断有效刻度：若未提供且为甘油三酯，则使用 [0, 1.7]
      const effectiveTicks = this.computeEffectiveTicks(yAxisTicks, series, safeRegion);
      const hasTicks = Array.isArray(effectiveTicks) && effectiveTicks.length > 0;
      const gridType = hasTicks ? 'dash' : (minimal ? 'none' : 'dash');
      const yAxis = scientific
        ? (hasTicks
            ? { gridType, min: 0, max: finalYMax, ticks: effectiveTicks }
            : { gridType, splitNumber: 4, min: 0, max: finalYMax, ticks: null })
        : (hasTicks
            ? { gridType, ticks: effectiveTicks, min: (yAxisMin != null ? yAxisMin : undefined), max: (yAxisMax != null ? yAxisMax : undefined) }
            : { gridType, splitNumber: 4, ticks: null, min: (yAxisMin != null ? yAxisMin : undefined), max: (yAxisMax != null ? yAxisMax : undefined) });
      this._chart = new UCharts({
        $this: this,
        canvasId: canvasId,
        ctx: _ctx2d || null,
        canvas: _canvasNode ? { width: cWidth, height: cHeight } : null,
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
        xAxis: { disableGrid: false, itemCount: finalItemCount, scrollShow: enableScroll },
        yAxis,
        valueFormatter,
        extra: { 
          line: { type: 'curve' }, 
          guideLines, 
          backgroundRegions: showBackground ? backgroundRegions : [], 
          safeRegion: showBackground ? safeRegion : null 
        },
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
    'categories, series, scientific, yMax, guideLines, yAxisTicks, yAxisMin, yAxisMax, safeRegion, backgroundRegions, showBackground'(cats, ser, scientific, yMax, guideLines, yAxisTicks, yAxisMin, yAxisMax, safeRegion, backgroundRegions, showBackground) {
      if (!cats || !ser) return;
      if (this._chart && this._chart.updateData) {
        const newItemCount = cats.length || 0;
        const useScientific = !!scientific;
        let finalYMax = yMax;
        if (useScientific) {
          let maxVal = 0;
          try {
            ser.forEach(s => {
              (s.data || []).forEach(v => {
                if (typeof v === 'number' && Number.isFinite(v)) {
                  if (v > maxVal) maxVal = v;
                }
              });
            });
          } catch (_) {}
          if (finalYMax == null) {
            finalYMax = maxVal > 0 ? maxVal * 2 : undefined;
          }
        }
        const valueFormatter = useScientific ? ((v) => {
          if (v == null || !isFinite(v)) return '';
          if (v === 0) return '0E0';
          const exp = Math.floor(Math.log10(Math.abs(v)));
          const mantissa = v / Math.pow(10, exp);
          const mStr = mantissa.toFixed(1);
          const sign = exp >= 0 ? '+' : '';
          return `${mStr}E${sign}${exp}`;
        }) : null;
        const effectiveTicks = this.computeEffectiveTicks(yAxisTicks, ser, safeRegion);
        const wantDashedGrid = Array.isArray(effectiveTicks) && effectiveTicks.length > 0;
        const gridType = wantDashedGrid ? 'dash' : 'dash';
        const yAxis = useScientific 
          ? { gridType, min: 0, max: finalYMax, ticks: effectiveTicks || null }
          : { gridType, ticks: effectiveTicks || null, min: yAxisMin != null ? yAxisMin : undefined, max: yAxisMax != null ? yAxisMax : undefined };
        this._chart.updateData({ 
          categories: cats, 
          series: ser,
          xAxis: { disableGrid: false, itemCount: newItemCount, scrollShow: false },
          yAxis,
          valueFormatter,
          enableScroll: false,
          extra: { 
            guideLines, 
            backgroundRegions: showBackground ? backgroundRegions : [], 
            safeRegion: showBackground ? safeRegion : null 
          }
        });
      } else {
        this.renderChart();
      }
    }
   }
 });
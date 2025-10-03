/**
 * 图表库 - 兼容浏览器和微信小程序
 * 专门用于绘制折线图
 */

class UCharts {
  constructor(options) {
    this.$this = options.$this;
    this.canvasId = options.canvasId;
    this.type = options.type || 'line';
    this.width = options.width || 300;
    this.height = options.height || 200;
    this.pixelRatio = options.pixelRatio || 1;
    this.categories = options.categories || [];
    this.series = options.series || [];
    this.legend = options.legend || { show: false };
    this.dataLabel = options.dataLabel !== false;
    this.dataPointShape = options.dataPointShape !== false;
    this.enableScroll = options.enableScroll !== false;
    this.xAxis = options.xAxis || {};
    this.yAxis = options.yAxis || {};
    this.extra = options.extra || {};
    this.tooltip = options.tooltip || { show: true };
    // 记录上一次触发震动的索引，避免过度触发
    this._lastTooltipIndex = null;
    
    // 内部属性
    this.padding = { top: 40, right: 30, bottom: 60, left: 50 };
    this.colors = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
    this.scrollX = 0;
    this.maxScrollX = 0;
    this.tooltipActive = false;
    this.tooltipIndex = null;
    
    this.init();
  }
  
  init() {
    // 微信小程序环境
    this.initWechat();
  }
  
  initWechat() {
    // 使用传统的 Canvas API，兼容性更好
    this.ctx = wx.createCanvasContext(this.canvasId, this.$this);
    
    // 设置画布尺寸
    this.canvas = {
      width: this.width,
      height: this.height
    };
    
    this.draw();
  }
  

  
  draw() {
    if (!this.ctx || !this.categories.length || !this.series.length) return;
    
    this.ctx.clearRect(0, 0, this.width, this.height);
    
    // 计算绘图区域
    this.chartArea = {
      x: this.padding.left,
      y: this.padding.top,
      width: this.width - this.padding.left - this.padding.right,
      height: this.height - this.padding.top - this.padding.bottom
    };
    
    // 计算数据范围
    this.calculateDataRange();
    
    // 绘制网格和坐标轴
    this.drawGrid();
    this.drawAxes();
    
    // 绘制数据
    this.drawData();

    // 绘制滚动悬浮提示（竖线 + 信息框）
    if (this.tooltip && this.tooltip.show) {
      this.drawTooltip();
    }
    
    // 绘制图例
    if (this.legend.show) {
      this.drawLegend();
    }
    
    // 微信小程序需要调用 draw() 方法来实际绘制
    this.ctx.draw();
  }
  
  calculateDataRange() {
    let allData = [];
    this.series.forEach(s => allData = allData.concat(s.data));
    
    this.minY = Math.min(...allData);
    this.maxY = Math.max(...allData);
    
    // 添加一些边距
    const range = this.maxY - this.minY;
    this.minY = Math.max(0, this.minY - range * 0.1);
    this.maxY = this.maxY + range * 0.1;
    
    // 计算 X 轴显示范围
    const itemCount = this.xAxis.itemCount || this.categories.length;
    this.visibleItemCount = Math.min(itemCount, this.categories.length);
    this.itemWidth = this.chartArea.width / this.visibleItemCount;
    
    // 计算最大滚动距离
    if (this.categories.length > this.visibleItemCount) {
      this.maxScrollX = (this.categories.length - this.visibleItemCount) * this.itemWidth;
    } else {
      this.maxScrollX = 0;
    }
  }
  
  drawGrid() {
    this.ctx.strokeStyle = '#E5E7EB';
    this.ctx.lineWidth = 1;
    
    // Y 轴网格线
    const splitNumber = this.yAxis.splitNumber || 4;
    for (let i = 0; i <= splitNumber; i++) {
      const y = this.chartArea.y + (this.chartArea.height / splitNumber) * i;
      
      if (this.yAxis.gridType === 'dash') {
        this.ctx.setLineDash([5, 5]);
      } else {
        this.ctx.setLineDash([]);
      }
      
      this.ctx.beginPath();
      this.ctx.moveTo(this.chartArea.x, y);
      this.ctx.lineTo(this.chartArea.x + this.chartArea.width, y);
      this.ctx.stroke();
    }
    
    this.ctx.setLineDash([]);
  }
  
  drawAxes() {
    this.ctx.strokeStyle = '#374151';
    this.ctx.lineWidth = 1;
    this.ctx.fillStyle = '#374151';
    this.ctx.font = '12px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';
    
    // X 轴
    if (!this.xAxis.disableGrid) {
      this.ctx.beginPath();
      this.ctx.moveTo(this.chartArea.x, this.chartArea.y + this.chartArea.height);
      this.ctx.lineTo(this.chartArea.x + this.chartArea.width, this.chartArea.y + this.chartArea.height);
      this.ctx.stroke();
    }
    
    // X 轴标签
    const startIndex = Math.floor(this.scrollX / this.itemWidth);
    for (let i = 0; i < this.visibleItemCount && startIndex + i < this.categories.length; i++) {
      const x = this.chartArea.x + i * this.itemWidth + this.itemWidth / 2;
      const label = this.categories[startIndex + i];
      this.ctx.fillText(label, x, this.chartArea.y + this.chartArea.height + 10);
    }
    
    // Y 轴
    this.ctx.beginPath();
    this.ctx.moveTo(this.chartArea.x, this.chartArea.y);
    this.ctx.lineTo(this.chartArea.x, this.chartArea.y + this.chartArea.height);
    this.ctx.stroke();
    
    // Y 轴标签
    this.ctx.textAlign = 'right';
    this.ctx.textBaseline = 'middle';
    const splitNumber = this.yAxis.splitNumber || 4;
    for (let i = 0; i <= splitNumber; i++) {
      const y = this.chartArea.y + this.chartArea.height - (this.chartArea.height / splitNumber) * i;
      const value = this.minY + (this.maxY - this.minY) * (i / splitNumber);
      this.ctx.fillText(Math.round(value), this.chartArea.x - 10, y);
    }
  }
  
  drawData() {
    this.series.forEach((serie, serieIndex) => {
      const color = this.colors[serieIndex % this.colors.length];
      
      // 绘制线条
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      
      const startIndex = Math.floor(this.scrollX / this.itemWidth);
      let firstPoint = true;
      
      for (let i = 0; i < this.visibleItemCount && startIndex + i < serie.data.length; i++) {
        const dataIndex = startIndex + i;
        const x = this.chartArea.x + i * this.itemWidth + this.itemWidth / 2;
        const y = this.chartArea.y + this.chartArea.height - 
                  ((serie.data[dataIndex] - this.minY) / (this.maxY - this.minY)) * this.chartArea.height;
        
        if (firstPoint) {
          this.ctx.moveTo(x, y);
          firstPoint = false;
        } else {
          if (this.extra.line && this.extra.line.type === 'curve') {
            // 简单的曲线效果
            const prevX = this.chartArea.x + (i - 1) * this.itemWidth + this.itemWidth / 2;
            const prevY = this.chartArea.y + this.chartArea.height - 
                          ((serie.data[dataIndex - 1] - this.minY) / (this.maxY - this.minY)) * this.chartArea.height;
            const cpX = (prevX + x) / 2;
            this.ctx.quadraticCurveTo(cpX, prevY, x, y);
          } else {
            this.ctx.lineTo(x, y);
          }
        }
      }
      
      this.ctx.stroke();
      
      // 绘制数据点
      if (this.dataPointShape) {
        this.ctx.fillStyle = color;
        for (let i = 0; i < this.visibleItemCount && startIndex + i < serie.data.length; i++) {
          const dataIndex = startIndex + i;
          const x = this.chartArea.x + i * this.itemWidth + this.itemWidth / 2;
          const y = this.chartArea.y + this.chartArea.height - 
                    ((serie.data[dataIndex] - this.minY) / (this.maxY - this.minY)) * this.chartArea.height;
          
          this.ctx.beginPath();
          this.ctx.arc(x, y, 3, 0, 2 * Math.PI);
          this.ctx.fill();
        }
      }
    });
  }

  // 计算触点所在的数据索引
  calcTooltipIndexByX(x) {
    if (!this.chartArea) return null;
    const startIndex = Math.floor(this.scrollX / this.itemWidth);
    const relX = x - this.chartArea.x - this.itemWidth / 2;
    let i = Math.round(relX / this.itemWidth);
    if (i < 0) i = 0;
    if (i > this.visibleItemCount - 1) i = this.visibleItemCount - 1;
    const index = startIndex + i;
    if (index < 0 || index >= this.categories.length) return null;
    return index;
  }

  // 文本测量与截断工具（供 tooltip 计算宽度与文本截断）
  measureTextWidth(text) {
    try {
      const m = this.ctx.measureText(String(text || ''));
      return (m && m.width) ? m.width : String(text || '').length * 8; // 兜底估算
    } catch (_) {
      return String(text || '').length * 8;
    }
  }

  truncateText(text, maxWidth) {
    const str = String(text || '');
    if (this.measureTextWidth(str) <= maxWidth) return str;
    let result = '';
    for (let i = 0; i < str.length; i++) {
      const next = result + str[i];
      if (this.measureTextWidth(next + '…') > maxWidth) break;
      result = next;
    }
    return result + '…';
  }

  // 绘制 tooltip（竖虚线 + 信息框）
  drawTooltip() {
    if (!this.tooltipActive || this.tooltipIndex == null) return;
    const tOpt = this.tooltip || {};
    const startIndex = Math.floor(this.scrollX / this.itemWidth);
    const i = this.tooltipIndex - startIndex;
    if (i < 0 || i >= this.visibleItemCount) return;

    const x = this.chartArea.x + i * this.itemWidth + this.itemWidth / 2;

    // 竖向虚线
    this.ctx.save();
    this.ctx.setLineDash([4, 4]);
    this.ctx.strokeStyle = '#D1D5DB';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(x, this.chartArea.y);
    this.ctx.lineTo(x, this.chartArea.y + this.chartArea.height);
    this.ctx.stroke();
    this.ctx.restore();

    // 信息框尺寸与位置（宽度自适应）
    const padding = tOpt.padding != null ? tOpt.padding : 8;
    const fontSize = tOpt.fontSize != null ? tOpt.fontSize : 12;
    const lineHeight = Math.max(fontSize + 6, 18);
    const headerHeight = Math.max(fontSize + 6, 20);
    const rows = this.series.length;

    // 先设置字体以便测量
    this.ctx.save();
    this.ctx.font = `${fontSize}px sans-serif`;
    const headerText = this.categories[this.tooltipIndex] || '';
    const headerWidth = this.measureTextWidth(headerText);

    let maxRowWidth = 0;
    for (let r = 0; r < rows; r++) {
      const name = this.series[r].name || '';
      const value = this.series[r].data[this.tooltipIndex];
      const nameW = this.measureTextWidth(name);
      const valueW = this.measureTextWidth(String(value));
      // 左侧有色点和间距约 16px，文本间距约 12px
      const rowW = 16 + nameW + 12 + valueW;
      if (rowW > maxRowWidth) maxRowWidth = rowW;
    }
    const contentWidth = Math.max(headerWidth, maxRowWidth);
    const minWidth = 120;
    const maxWidth = this.width - 20; // 留出边距
    let boxWidth = Math.min(Math.max(contentWidth + padding * 2, minWidth), maxWidth);
    const boxHeight = headerHeight + rows * lineHeight + padding * 2;
    this.ctx.restore();
    let boxX = x + 12;
    if (boxX + boxWidth > this.width - 10) {
      boxX = x - 12 - boxWidth;
    }
    let boxY = this.chartArea.y + 10;
    if (boxY + boxHeight > this.chartArea.y + this.chartArea.height) {
      boxY = this.chartArea.y + this.chartArea.height - boxHeight - 10;
    }

    // 信息框背景
    this.ctx.save();
    this.ctx.fillStyle = tOpt.bgColor || '#FFFFFF';
    this.ctx.strokeStyle = tOpt.borderColor || '#E5E7EB';
    this.ctx.lineWidth = tOpt.borderWidth != null ? tOpt.borderWidth : 1;
    this.drawRoundRect(boxX, boxY, boxWidth, boxHeight, tOpt.borderRadius != null ? tOpt.borderRadius : 6);
    this.ctx.fill();
    this.ctx.stroke();
    this.ctx.restore();

    // 文本与彩色点
    this.ctx.save();
    this.ctx.font = `${fontSize}px sans-serif`;
    this.ctx.fillStyle = tOpt.fontColor || '#374151';
    this.ctx.textBaseline = 'middle';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(headerText, boxX + padding, boxY + padding + headerHeight / 2);

    for (let r = 0; r < rows; r++) {
      const color = this.colors[r % this.colors.length];
      const name = this.series[r].name || '';
      const value = this.series[r].data[this.tooltipIndex];
      const rowY = boxY + padding + headerHeight + r * lineHeight + lineHeight / 2;

      this.ctx.beginPath();
      this.ctx.fillStyle = color;
      this.ctx.arc(boxX + padding + 6, rowY, 4, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = tOpt.fontColor || '#374151';
      this.ctx.textAlign = 'left';
      // 名称截断以防溢出
      const valueW = this.measureTextWidth(String(value));
      const availableNameW = boxWidth - padding * 2 - 16 - 12 - valueW;
      const nameText = this.truncateText(name, Math.max(availableNameW, 30));
      this.ctx.fillText(nameText, boxX + padding + 16, rowY);

      this.ctx.textAlign = 'right';
      this.ctx.font = `bold ${fontSize}px sans-serif`;
      this.ctx.fillText(String(value), boxX + boxWidth - padding, rowY);
    }
    this.ctx.restore();
  }

  // 画圆角矩形工具
  drawRoundRect(x, y, w, h, r) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
  
  drawLegend() {
    const legendY = 20;
    let legendX = this.chartArea.x;
    
    this.ctx.font = '12px sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';
    
    this.series.forEach((serie, index) => {
      const color = this.colors[index % this.colors.length];
      
      // 绘制颜色块
      this.ctx.fillStyle = color;
      this.ctx.fillRect(legendX, legendY - 4, 12, 8);
      
      // 绘制文字
      this.ctx.fillStyle = '#374151';
      this.ctx.fillText(serie.name, legendX + 16, legendY);
      
      legendX += this.ctx.measureText(serie.name).width + 40;
    });
  }
  
  // 滚动相关方法
  scrollStart(e) {
    if (!this.enableScroll) return;
    this.touchStartX = e.touches[0].x;
    this.startScrollX = this.scrollX;
    const idx = this.calcTooltipIndexByX(this.touchStartX);
    if (idx != null) {
      this.tooltipIndex = idx;
      this.tooltipActive = true;
      if (this.tooltip && typeof this.tooltip.onShow === 'function' && this._lastTooltipIndex !== idx) {
        const category = this.categories[idx];
        this.tooltip.onShow(null, category, idx, { x: this.touchStartX });
        this._lastTooltipIndex = idx;
      }
      this.draw();
    }
  }
  
  scroll(e) {
    if (!this.enableScroll || !this.touchStartX) return;
    
    const deltaX = e.touches[0].x - this.touchStartX;
    this.scrollX = Math.max(0, Math.min(this.maxScrollX, this.startScrollX - deltaX));
    const idx = this.calcTooltipIndexByX(e.touches[0].x);
    if (idx != null) {
      this.tooltipIndex = idx;
      this.tooltipActive = true;
      if (this.tooltip && typeof this.tooltip.onShow === 'function' && this._lastTooltipIndex !== idx) {
        const category = this.categories[idx];
        this.tooltip.onShow(null, category, idx, { x: e.touches[0].x });
        this._lastTooltipIndex = idx;
      }
    }
    this.draw();
  }
  
  scrollEnd(e) {
    if (!this.enableScroll) return;
    this.touchStartX = null;
    this.tooltipActive = false;
    this.tooltipIndex = null;
    this.draw();
  }

  // 外部控制 tooltip 显隐
  showTooltip(e) {
    const x = (e.touches && e.touches[0]) ? e.touches[0].x : e.x;
    const idx = this.calcTooltipIndexByX(x);
    if (idx != null) {
      this.tooltipIndex = idx;
      this.tooltipActive = true;
      if (this.tooltip && typeof this.tooltip.onShow === 'function' && this._lastTooltipIndex !== idx) {
        const category = this.categories[idx];
        this.tooltip.onShow(null, category, idx, { x });
        this._lastTooltipIndex = idx;
      }
      this.draw();
    }
  }
  hideTooltip() {
    this.tooltipActive = false;
    this.tooltipIndex = null;
    this.draw();
  }
  
  // 更新数据
  updateData(data) {
    if (data.categories) this.categories = data.categories;
    if (data.series) this.series = data.series;
    this.calculateDataRange();
    this.draw();
  }
}

// 微信小程序环境导出
module.exports = UCharts;
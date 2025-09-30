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
    
    // 内部属性
    this.padding = { top: 40, right: 30, bottom: 60, left: 50 };
    this.colors = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
    this.scrollX = 0;
    this.maxScrollX = 0;
    
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
  }
  
  scroll(e) {
    if (!this.enableScroll || !this.touchStartX) return;
    
    const deltaX = e.touches[0].x - this.touchStartX;
    this.scrollX = Math.max(0, Math.min(this.maxScrollX, this.startScrollX - deltaX));
    this.draw();
  }
  
  scrollEnd(e) {
    if (!this.enableScroll) return;
    this.touchStartX = null;
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
function drawLine(ctx: WechatMiniprogram.CanvasRenderingContext.CanvasRenderingContext2D, points: {x:number;y:number}[]) {
  if (points.length < 2) return;
  ctx.beginPath();
  ctx.setStrokeStyle('#2563EB');
  ctx.setLineWidth(2);
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();
}

Page({
  async onReady() {
    const recs: Array<{date:string;alt:number}> = (wx.getStorageSync('checkup_records') || [])
      .map((r:any) => ({ date: r.date, alt: r.alt }))
      .reverse();
    const query = wx.createSelectorQuery();
    query.select('#altChart').fields({ node: true, size: true } as any);
    query.exec((res: any) => {
      const canvas = res[0].node as WechatMiniprogram.Canvas;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const width = res[0].width;
      const height = res[0].height;
      const padding = 16;
      ctx.clearRect(0,0,width,height);
      // 计算坐标
      const values = recs.map(r => r.alt);
      const min = Math.min(...values, 0);
      const max = Math.max(...values, 100);
      const stepX = recs.length > 1 ? (width - padding*2) / (recs.length - 1) : 0;
      const points = recs.map((r, i) => {
        const ratio = max === min ? 0.5 : (r.alt - min) / (max - min);
        const y = height - padding - ratio * (height - padding*2);
        const x = padding + i * stepX;
        return { x, y };
      });
      drawLine(ctx as any, points);
    });
  }
});


Page({
  data: {
    lastCheckupText: '暂无数据'
  },
  onShow() {
    try {
      const last = wx.getStorageSync('last_checkup_date');
      this.setData({ lastCheckupText: last ? `上次：${last}` : '暂无数据' });
    } catch (e) {}
  },
  goMeds() {
    wx.navigateTo({ url: '/pages/meds/index' });
  },
  goCheckups() {
    wx.navigateTo({ url: '/pages/checkups/index' });
  },
  goStats() {
    wx.navigateTo({ url: '/pages/stats/index' });
  }
});


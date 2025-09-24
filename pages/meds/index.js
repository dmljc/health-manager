/**
 * 导入震动反馈工具
 */
const { vibrateForAction } = require('../../utils/vibrate');

/**
 * 工具函数
 */
function formatCurrentDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const weekday = weekdays[now.getDay()];
  
  return `${year}年${month}月${day}日 ${weekday}`;
}

Page({
  data: {
    currentTheme: 'light',
    todayDate: '',
    todayWeekday: '',
    hasTakenToday: false,
    isToggling: false,
  },

  /**
   * 页面显示时的初始化
   */
  onShow() {
    // 底部导航切换震动反馈
    vibrateForAction('tap');
    this.initPageData();
    this.loadMedicineStatus();
  },

  /**
   * 初始化页面基础数据
   */
  initPageData() {
    const app = getApp();
    const dateStr = formatCurrentDate();
    const dateParts = dateStr.split(' ');
    
    this.setData({
      currentTheme: app.getCurrentTheme(),
      todayDate: dateParts[0],
      todayWeekday: dateParts[1]
    });
  },

  /**
   * 加载服药状态
   */
  loadMedicineStatus() {
    try {
      const keyToday = this._getTodayKey();
      const medRecords = wx.getStorageSync('med_records') || [];
      const todayRecord = medRecords.find(r => r.date === keyToday);
      const hasTakenToday = todayRecord ? !!todayRecord.taken : (wx.getStorageSync('has_taken_today') || false);
      this.setData({ hasTakenToday });
    } catch (e) {
      console.error('加载服药状态失败:', e);
    }
  },

  /**
   * 切换服药状态
   */
  toggleMedicineStatus() {
    if (this.data.isToggling) return;
    this.setData({ isToggling: true });

    const { hasTakenToday } = this.data;
    const newStatus = !hasTakenToday;
    const keyToday = this._getTodayKey();

    try {
      wx.setStorageSync('has_taken_today', newStatus);

      const medRecords = wx.getStorageSync('med_records') || [];
      const idx = medRecords.findIndex(r => r.date === keyToday);
      const time = this._getTimeString();
      if (idx >= 0) {
        medRecords[idx] = { ...medRecords[idx], taken: newStatus, time };
      } else {
        medRecords.unshift({ id: `med_${Date.now()}`, date: keyToday, taken: newStatus, time });
      }
      wx.setStorageSync('med_records', medRecords);

      vibrateForAction('success');
      this.setData({ hasTakenToday: newStatus });

    //   wx.showToast({ title: newStatus ? '已服药' : '未服药', icon: 'success', duration: 800 });
    } catch (e) {
      console.error('切换服药状态失败:', e);
      wx.showToast({ title: '操作失败', icon: 'error', duration: 1000 });
    } finally {
      setTimeout(() => this.setData({ isToggling: false }), 250);
    }
  },

  _getTodayKey() {
    const d = new Date();
    const y = d.getFullYear();
    const m = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${y}-${m}-${day}`;
  },

  _getTimeString() {
    const d = new Date();
    const h = `${d.getHours()}`.padStart(2, '0');
    const m = `${d.getMinutes()}`.padStart(2, '0');
    return `${h}:${m}`;
  }
});
Page({
  data: {
    userInfo: null,
    loading: false,
    userId: '',
    maskedUserId: '',
  },

  onLoad() {
    const storedProfile = wx.getStorageSync('user_profile');
    this.setData({
      userInfo: storedProfile || null,
    });
    this.fetchUserId();
  },

  onShow() {
    const storedProfile = wx.getStorageSync('user_profile');
    this.setData({
      userInfo: storedProfile || null,
    });
    this.fetchUserId();
  },

  async onAuthorizeTouch() {
    if (this._authBusy) return;
    this._authBusy = true;
    try {
      const { authorizeAndSave } = require('../../utils/auth');
      const result = await authorizeAndSave();
      if (result && result.ok && result.userInfo) {
        this.setData({ userInfo: result.userInfo });
        this.fetchUserId();
        wx.showToast({ title: '已授权并登录', icon: 'success' });
      }
    } catch (err) {
      const msg = /privacy permission not set/.test((err && err.errMsg) || '')
        ? '需在开发者工具配置"隐私接口使用说明"后重新编译'
        : `授权取消或失败: ${err && err.errMsg ? err.errMsg : '未知错误'}`;
      wx.showToast({ title: msg, icon: 'none', duration: 3000 });
    } finally {
      this._authBusy = false;
    }
  },

  onLogout() {
    try {
      wx.removeStorageSync('user_profile');
      this.setData({ userInfo: null });
      wx.showToast({ title: '已退出登录', icon: 'none' });
    } catch (err) {
      wx.showToast({ title: '退出失败', icon: 'none' });
    }
  },

  onLogoutAndClear() {
    try {
      wx.clearStorageSync();
    } catch (_) {}
    this.setData({ userInfo: null });
    wx.showToast({ title: '已清缓存并退出', icon: 'none' });
  },

  ensureCloudReady() {
    try {
      if (wx.cloud && !wx.cloud._inited) {
        wx.cloud.init({ env: wx.cloud.DYNAMIC_CURRENT_ENV, traceUser: true });
      }
      return !!wx.cloud;
    } catch (_) {
      return false;
    }
  },

  maskOpenId(id) {
    if (!id) return '';
    const s = String(id);
    if (s.length <= 10) return s;
    return `${s.slice(0, 6)}...${s.slice(-4)}`;
  },

  async fetchUserId() {
    try {
      const ok = this.ensureCloudReady();
      if (!ok) return;
      const res = await wx.cloud.callFunction({ name: 'userProfile', data: { action: 'get' } });
      const doc = res && res.result && res.result.data ? res.result.data : null;
      const id = doc && doc.userId ? doc.userId : '';
      if (id) {
        this.setData({ userId: id, maskedUserId: this.maskOpenId(id) });
      }
    } catch (_) {}
  },
});
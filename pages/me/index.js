Page({
  data: {
    userInfo: null,
    loading: false,
    userId: '',
    maskedUserId: '',
    pendingAvatarUrl: '',
    pendingNickName: '',
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

  onChooseAvatar(e) {
    const url = (e && e.detail && e.detail.avatarUrl) ? e.detail.avatarUrl : '';
    this.setData({ pendingAvatarUrl: url });
  },

  onNicknameInput(e) {
    const v = (e && e.detail && e.detail.value) ? e.detail.value : '';
    this.setData({ pendingNickName: v });
  },

  async onSubmitProfile() {
    if (this._authBusy) return;
    this._authBusy = true;
    try {
      const { authorizeAndSave } = require('../../utils/auth');
      const { pendingNickName, pendingAvatarUrl } = this.data;
      const result = await authorizeAndSave({ profile: { nickName: pendingNickName, avatarUrl: pendingAvatarUrl } });
      if (result && result.ok && result.userInfo) {
        this.setData({ userInfo: result.userInfo });
        this.fetchUserId();
        wx.showToast({ title: '已保存并登录', icon: 'success' });
      }
    } catch (err) {
      wx.showToast({ title: '资料保存失败', icon: 'none', duration: 3000 });
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
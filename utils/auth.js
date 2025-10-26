// 通用授权工具：集中处理授权弹窗、云端保存与本地缓存

function ensureCloudInited() {
  try {
    if (wx.cloud && !wx.cloud._inited) {
      wx.cloud.init({ env: wx.cloud.DYNAMIC_CURRENT_ENV, traceUser: true });
    }
    return !!wx.cloud;
  } catch (_) {
    return false;
  }
}

function isAuthed() {
  try { return !!wx.getStorageSync('user_profile'); } catch (_) { return false; }
}

async function authorizeAndSave() {
  try {
    const profile = await wx.getUserProfile({
      desc: '用于完善个人资料与同步健康数据',
      lang: 'zh_CN',
    });
    const userInfo = profile && profile.userInfo;
    if (!userInfo) return { ok: false };

    ensureCloudInited();

    const res = await wx.cloud.callFunction({
      name: 'userProfile',
      data: { action: 'save', profile: userInfo },
    });
    if (!res || !res.result || !res.result.success) return { ok: false };

    try { wx.setStorageSync('user_profile', userInfo); } catch (_) {}
    return { ok: true, userInfo };
  } catch (err) {
    const msg = /privacy permission not set/.test((err && err.errMsg) || '')
      ? '需在开发者工具配置“隐私接口使用说明”后重新编译'
      : '授权取消或失败';
    wx.showToast({ title: msg, icon: 'none' });
    return { ok: false, error: err };
  }
}

module.exports = { ensureCloudInited, isAuthed, authorizeAndSave };
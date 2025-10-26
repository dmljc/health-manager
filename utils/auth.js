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

function normalizeDesc(desc) {
  const d = String(desc || '用于同步头像昵称并保存到云端');
  return d.length > 30 ? d.slice(0, 30) : d;
}

async function authorizeAndSave(options = {}) {
  const { profile = null, silent = false } = options;
  try {
    const p = profile || {};
    const nickName = String(p.nickName || '').trim();
    const avatarUrl = String(p.avatarUrl || '').trim();
    if (!nickName || !avatarUrl) {
      if (!silent) wx.showToast({ title: '请先选择头像并填写昵称', icon: 'none' });
      return { ok: false, reason: 'missing_profile_fields' };
    }

    ensureCloudInited();

    const res = await wx.cloud.callFunction({
      name: 'userProfile',
      data: { action: 'save', profile: { nickName, avatarUrl } },
    });
    if (!res || !res.result || !res.result.success) {
      if (!silent) wx.showToast({ title: '资料保存失败', icon: 'none' });
      return { ok: false };
    }

    const userInfo = { nickName, avatarUrl };
    try { wx.setStorageSync('user_profile', userInfo); } catch (_) {}
    return { ok: true, userInfo };
  } catch (err) {
    if (!silent) wx.showToast({ title: '资料保存失败', icon: 'none' });
    return { ok: false, error: err };
  }
}

module.exports = { ensureCloudInited, isAuthed, authorizeAndSave };
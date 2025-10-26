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
  const { desc = '用于同步头像昵称并保存到云端', lang = 'zh_CN', silent = false } = options;
  try {
    const profile = await wx.getUserProfile({
      desc: normalizeDesc(desc),
      lang,
    });
    const userInfo = profile && profile.userInfo;
    if (!userInfo) return { ok: false };

    ensureCloudInited();

    const res = await wx.cloud.callFunction({
      name: 'userProfile',
      data: { action: 'save', profile: userInfo },
    });
    if (!res || !res.result || !res.result.success) {
      if (!silent) wx.showToast({ title: '登录保存失败', icon: 'none' });
      return { ok: false };
    }

    try { wx.setStorageSync('user_profile', userInfo); } catch (_) {}
    return { ok: true, userInfo };
  } catch (err) {
    const msg = (err && err.errMsg) ? String(err.errMsg) : '';
    let tip = '授权取消或失败';
    if (/privacy permission not set/.test(msg)) {
      tip = '需在开发者工具配置“隐私接口使用说明”后重新编译';
    } else if (/can only be invoked by user tap gesture/.test(msg)) {
      tip = '需在用户点击后调用授权';
    } else if (/desc length does not meet the requirements/.test(msg)) {
      tip = '用途说明超长，请缩短到30字以内';
    } else if (/auth deny/.test(msg)) {
      tip = '已取消授权';
    }
    if (!silent) wx.showToast({ title: tip, icon: 'none' });
    return { ok: false, error: err, reason: tip };
  }
}

module.exports = { ensureCloudInited, isAuthed, authorizeAndSave };
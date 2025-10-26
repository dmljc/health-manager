// 云函数：保存/获取用户资料（users 集合）
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const USERS = 'users';

// 新增：确保集合存在（SDK 低版本可能不支持 createCollection，失败时忽略）
async function ensureUsersCollection() {
  try {
    if (typeof db.createCollection === 'function') {
      await db.createCollection(USERS);
    }
  } catch (_) {
    // 已存在或不支持时忽略
  }
}

exports.main = async (event, context) => {
  try {
    const wxContext = cloud.getWXContext();
    const userId = wxContext && wxContext.OPENID ? wxContext.OPENID : null;
    const e = event || {};
    const action = e.action || (e.profile ? 'save' : 'get');

    if (!userId) return { success: false, error: 'userId is required' };

    const col = db.collection(USERS);

    if (action === 'get') {
      try {
        const res = await col.where({ userId }).limit(1).get();
        const doc = res && res.data && res.data.length ? res.data[0] : null;
        // 若无文档，返回 OPENID 供前端展示“微信号”
        return { success: true, data: doc || { userId, exists: false } };
      } catch (err) {
        const msg = (err && err.message) || '';
        // 集合不存在等情况：返回 OPENID，避免前端一直显示“同步中”
        if (/not exists|ResourceNotFound|collection\.get:fail/.test(msg)) {
          return { success: true, data: { userId, exists: false } };
        }
        return { success: false, error: msg || 'unknown error' };
      }
    }

    if (action === 'save') {
      // 先尝试创建集合（不存在时）
      await ensureUsersCollection();

      const p = e.profile || {};
      const base = {
        userId,
        updatedAt: new Date(),
        source: 'miniapp',
      };
      const allowed = ['nickName', 'avatarUrl', 'gender', 'country', 'province', 'city', 'language'];
      const updates = { ...base };
      allowed.forEach((k) => {
        if (typeof p[k] !== 'undefined' && p[k] !== null) updates[k] = p[k];
      });

      const existed = await col.where({ userId }).limit(1).get();
      if (existed && existed.data && existed.data.length > 0) {
        const docId = existed.data[0]._id;
        await col.doc(docId).update({ data: updates });
        return { success: true, action: 'update', _id: docId };
      } else {
        const data = { ...updates, createdAt: new Date() };
        const addRes = await col.add({ data });
        return { success: true, action: 'create', _id: addRes && addRes._id };
      }
    }

    return { success: false, error: 'Invalid action' };
  } catch (err) {
    return { success: false, error: err && err.message ? err.message : 'unknown error' };
  }
};
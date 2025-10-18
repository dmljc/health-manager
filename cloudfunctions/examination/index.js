// 云函数：提交检查记录到 examination 集合（支持更新同日同类型记录）
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  try {
    const wxContext = cloud.getWXContext();
    const userId = wxContext && wxContext.OPENID ? wxContext.OPENID : null;

    const { type, value, date, timestamp } = event || {};

    const t = String(type || '').trim();
    const d = String(date || '').trim();
    if (!t) return { success: false, error: 'type is required' };
    if (!d) return { success: false, error: 'date is required' };

    const isDNA = /DNA/i.test(t);

    let finalValue;
    if (isDNA) {
      finalValue = String(value || '').trim();
      if (!finalValue) return { success: false, error: 'value is required' };
    } else {
      const num = Number(String(value || '').trim());
      if (Number.isNaN(num)) {
        return { success: false, error: 'value must be a number' };
      }
      finalValue = num;
    }

    const ts = typeof timestamp === 'number' ? timestamp : (new Date(d).getTime());
    const now = new Date();

    const col = db.collection('examination');
    const where = { userId, type: t, date: d };

    const existsRes = await col.where(where).get();
    if (existsRes && existsRes.data && existsRes.data.length) {
      const docId = existsRes.data[0]._id;
      await col.doc(docId).update({
        data: {
          value: finalValue,
          valueType: isDNA ? 'string' : 'number',
          timestamp: ts,
          updatedAt: now,
        },
      });
      return { success: true, action: 'update', _id: docId };
    } else {
      const record = {
        userId,
        type: t,
        value: finalValue,
        valueType: isDNA ? 'string' : 'number',
        date: d,
        timestamp: ts,
        createdAt: now,
        updatedAt: now,
        source: 'miniapp',
      };
      const addRes = await col.add({ data: record });
      return { success: true, action: 'create', _id: addRes && addRes._id, record };
    }
  } catch (e) {
    return { success: false, error: e && e.message ? e.message : 'unknown error' };
  }
};
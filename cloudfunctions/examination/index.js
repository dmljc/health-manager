// 云函数：提交/读取检查记录（examination 集合）
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  try {
    const wxContext = cloud.getWXContext();
    const userId = wxContext && wxContext.OPENID ? wxContext.OPENID : null;

    // 兼容：默认不传业务参数时直接按当前用户读取列表
    const e = event || {};
    const { action, types = [], startDate = null, endDate = null, limit = 500 } = e;
    const wantsList = (!e || Object.keys(e).length === 0) || action === 'list' || action === 'get' || (!e.type && !e.value && !e.date);

    if (wantsList) {
      const col = db.collection('examination');
      const where = { userId };
      if (Array.isArray(types) && types.length > 0) {
        where.type = _.in(types.map(t => String(t || '').trim()).filter(Boolean));
      }
      if (startDate || endDate) {
        const startTs = startDate ? new Date(startDate).getTime() : null;
        const endTs = endDate ? new Date(endDate).getTime() : null;
        if (startTs && endTs) {
          where.timestamp = _.gte(startTs).and(_.lte(endTs));
        } else if (startTs) {
          where.timestamp = _.gte(startTs);
        } else if (endTs) {
          where.timestamp = _.lte(endTs);
        }
      }

      const res = await col.where(where).orderBy('timestamp', 'asc').limit(limit).get();
      const list = Array.isArray(res && res.data) ? res.data : [];
      return { success: true, list };
    }

    // 保存/更新：同用户+同类型+同日期的记录进行覆盖更新
    const { type, typeLabel, value, valueType, date, timestamp } = e;
    const t = String(type || '').trim();
    const tl = String(typeLabel || '').trim();
    const d = String(date || '').trim();
    if (!t) return { success: false, error: 'type is required' };
    if (!d) return { success: false, error: 'date is required' };

    const isDNA = String(t).toLowerCase() === 'dna' || /DNA/i.test(t) || /DNA/i.test(tl);
    const raw = String(value || '').trim();
    if (!raw) return { success: false, error: 'value is required' };

    let finalValue;
    let vType;
    if (isDNA || valueType === 'string') {
      finalValue = raw;
      vType = 'string';
    } else {
      const num = Number(raw);
      if (!Number.isNaN(num)) {
        finalValue = num;
        vType = 'number';
      } else {
        finalValue = raw;
        vType = 'string';
      }
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
          valueType: vType,
          timestamp: ts,
          typeLabel: tl || existsRes.data[0].typeLabel || '',
          updatedAt: now,
        },
      });
      return { success: true, action: 'update', _id: docId };
    } else {
      const record = {
        userId,
        type: t,
        typeLabel: tl,
        value: finalValue,
        valueType: vType,
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
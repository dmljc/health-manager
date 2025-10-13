const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 输入: {
//   status?: 0 | 1,
//   date?: 'YYYY-MM-DD',
//   time?: 'HH:mm',
//   medicineRemaining?: number,
//   action?: 'inventoryUpdate' | undefined
// }
exports.main = async (event, context) => {
  const { status, date, time, medicineRemaining, action } = event || {};
  const wxContext = cloud.getWXContext();
  const userId = wxContext && wxContext.OPENID ? wxContext.OPENID : null;

  const now = new Date();
  const y = now.getFullYear();
  const m = `${now.getMonth() + 1}`.padStart(2, '0');
  const d = `${now.getDate()}`.padStart(2, '0');
  const hh = `${now.getHours()}`.padStart(2, '0');
  const mm = `${now.getMinutes()}`.padStart(2, '0');

  const targetDate = date || `${y}-${m}-${d}`;
  const targetTime = time || `${hh}:${mm}`;

  try {
    // 仅更新库存，不改动日记录
    if (action === 'inventoryUpdate') {
      if (!userId) return { ok: false, error: 'unauthorized: OPENID required' };
      const invCol = db.collection('medicineInventory');
      const updateData = { updatedAt: new Date() };
      if (typeof medicineRemaining !== 'undefined') updateData.medicineRemaining = medicineRemaining;
      const existedInv = await invCol.where({ userId }).orderBy('updatedAt', 'desc').limit(1).get();
      if (existedInv && existedInv.data && existedInv.data.length > 0) {
        await invCol.doc(existedInv.data[0]._id).update({ data: updateData });
      } else {
        await invCol.add({ data: { userId, ...updateData } });
      }
      return { ok: true, inventoryUpdated: true };
    }

    // 更新或新增当日服药记录
    if (typeof status !== 'number' || !(status === 0 || status === 1)) {
      return { ok: false, error: 'Invalid status, expect 0 or 1' };
    }

    const collection = db.collection('medicine');
    const existed = await collection.where({ date: targetDate }).get();
    if (existed && existed.data && existed.data.length > 0) {
      const docId = existed.data[0]._id;
      const updateData = { taken: status === 1, status, time: targetTime };
      if (typeof medicineRemaining !== 'undefined') updateData.medicineRemaining = medicineRemaining;
      await collection.doc(docId).update({ data: updateData });
    } else {
      const addData = {
        id: `med_${Date.now()}`,
        date: targetDate,
        taken: status === 1,
        status,
        time: targetTime,
      };
      if (typeof medicineRemaining !== 'undefined') addData.medicineRemaining = medicineRemaining;
      await collection.add({ data: addData });
    }

    // 同步更新库存（使用 OPENID 识别用户）
    if (userId && (typeof medicineRemaining !== 'undefined')) {
      const invCol = db.collection('medicineInventory');
      const updateData = { updatedAt: new Date() };
      if (typeof medicineRemaining !== 'undefined') updateData.medicineRemaining = medicineRemaining;
      const existedInv = await invCol.where({ userId }).orderBy('updatedAt', 'desc').limit(1).get();
      if (existedInv && existedInv.data && existedInv.data.length > 0) {
        await invCol.doc(existedInv.data[0]._id).update({ data: updateData });
      } else {
        await invCol.add({ data: { userId, ...updateData } });
      }
    }

    const latest = await collection.where({ date: targetDate }).get();
    const countRes = await collection.count();

    return {
      ok: true,
      date: targetDate,
      record: latest && latest.data ? latest.data[0] : null,
      count: countRes && countRes.total ? countRes.total : 0
    };
  } catch (err) {
    return { ok: false, error: err && err.message ? err.message : String(err) };
  }
};
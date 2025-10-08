const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 输入: { status: 0 | 1, date?: 'YYYY-MM-DD', time?: 'HH:mm' }
// 行为: 记录或更新当天/指定日期的服药状态，并返回最新记录
exports.main = async (event, context) => {
  const { status, date, time } = event || {};
  if (typeof status !== 'number' || !(status === 0 || status === 1)) {
    return { ok: false, error: 'Invalid status, expect 0 or 1' };
  }

  const now = new Date();
  const y = now.getFullYear();
  const m = `${now.getMonth() + 1}`.padStart(2, '0');
  const d = `${now.getDate()}`.padStart(2, '0');
  const hh = `${now.getHours()}`.padStart(2, '0');
  const mm = `${now.getMinutes()}`.padStart(2, '0');

  const targetDate = date || `${y}-${m}-${d}`;
  const targetTime = time || `${hh}:${mm}`;

  try {
    const collection = db.collection('medicine');
    // 尝试找到该日期的记录
    const existed = await collection.where({ date: targetDate }).get();

    if (existed && existed.data && existed.data.length > 0) {
      const docId = existed.data[0]._id;
      await collection.doc(docId).update({
        data: { taken: status === 1, status, time: targetTime }
      });
    } else {
      await collection.add({
        data: {
          id: `med_${Date.now()}`,
          date: targetDate,
          taken: status === 1,
          status,
          time: targetTime
        }
      });
    }

    // 返回该日期最新记录以及总数
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
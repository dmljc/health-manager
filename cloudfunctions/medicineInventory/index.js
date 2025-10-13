// 云函数入口文件
const cloud = require('wx-server-sdk');

// 使用动态当前环境，避免与其他云函数环境不一致
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// 云函数入口函数
exports.main = async (event, context) => {
  const { action, userId, medicineId, medicineName, medicineTotal, medicineRemaining } = event || {};

  if (action === 'update') {
    // 更新药物数据（支持可选字段，避免写入 undefined）
    try {
      if (!userId) {
        return { success: false, error: 'userId is required' };
      }

      const collection = db.collection('medicineInventory');

      // 组装更新数据：仅写入提供的字段
      const updateData = { updatedAt: new Date() };
      if (typeof medicineName !== 'undefined') updateData.medicineName = medicineName;
      if (typeof medicineTotal !== 'undefined') updateData.medicineTotal = medicineTotal;
      if (typeof medicineRemaining !== 'undefined') updateData.medicineRemaining = medicineRemaining;

      // 若提供了 medicineId，按 userId+medicineId 更新；否则仅按 userId 更新单条（最新）
      if (typeof medicineId !== 'undefined' && medicineId !== null && medicineId !== '') {
        const res = await collection.where({ userId, medicineId }).update({ data: updateData });
        if (!res || res.stats.updated === 0) {
          const addData = { userId, medicineId, updatedAt: new Date() };
          if (typeof medicineName !== 'undefined') addData.medicineName = medicineName;
          if (typeof medicineTotal !== 'undefined') addData.medicineTotal = medicineTotal;
          if (typeof medicineRemaining !== 'undefined') addData.medicineRemaining = medicineRemaining;
          await collection.add({ data: addData });
        }
      } else {
        // 未提供 medicineId：查找该用户最新一条记录并更新，否则插入新记录
        const existed = await collection.where({ userId }).orderBy('updatedAt', 'desc').limit(1).get();
        if (existed && existed.data && existed.data.length > 0) {
          const docId = existed.data[0]._id;
          await collection.doc(docId).update({ data: updateData });
        } else {
          const addData = { userId, updatedAt: new Date() };
          if (typeof medicineName !== 'undefined') addData.medicineName = medicineName;
          if (typeof medicineTotal !== 'undefined') addData.medicineTotal = medicineTotal;
          if (typeof medicineRemaining !== 'undefined') addData.medicineRemaining = medicineRemaining;
          await collection.add({ data: addData });
        }
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: err && err.message ? err.message : 'update failed' };
    }
  } else if (action === 'get') {
    // 获取药物数据（支持按 medicineId 可选过滤）
    try {
      if (!userId) {
        return { success: false, error: 'userId is required' };
      }

      const whereQuery = { userId };
      if (typeof medicineId !== 'undefined' && medicineId !== null && medicineId !== '') {
        whereQuery.medicineId = medicineId;
      }

      const res = await db.collection('medicineInventory').where(whereQuery).get();

      return { success: true, data: res.data };
    } catch (err) {
      return { success: false, error: err && err.message ? err.message : 'query failed' };
    }
  } else {
    return { success: false, error: 'Invalid action' };
  }
};
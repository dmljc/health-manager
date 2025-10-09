// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init();
const db = cloud.database();
const _ = db.command;

// 云函数入口函数
exports.main = async (event, context) => {
  const { action, userId, medicineId, medicineName, medicineTotal, medicineRemaining } = event;

  if (action === 'update') {
    // 更新药物数据
    try {
      const res = await db.collection('medicineInventory').where({
        userId,
        medicineId
      }).update({
        data: {
          medicineName,
          medicineTotal,
          medicineRemaining,
          updatedAt: new Date()
        }
      });

      // 如果没有找到记录，则插入新记录
      if (res.stats.updated === 0) {
        await db.collection('medicineInventory').add({
          data: {
            userId,
            medicineId,
            medicineName,
            medicineTotal,
            medicineRemaining,
            updatedAt: new Date()
          }
        });
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  } else if (action === 'get') {
    // 获取药物数据
    try {
      const res = await db.collection('medicineInventory').where({
        userId
      }).get();

      return { success: true, data: res.data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  } else {
    return { success: false, error: 'Invalid action' };
  }
};
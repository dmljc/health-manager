// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init();
const db = cloud.database();
const _ = db.command;

// 云函数入口函数
exports.main = async (event, context) => {
  const { action, userId, medicineTotal, medicineRemaining } = event;

  console.log('medicineInventory 云函数调用:', { action, userId, medicineTotal, medicineRemaining });

  if (action === 'update') {
    // 更新药物数据 - 简化为每个用户只有一个默认药物记录
    try {
      // 先查询是否存在记录
      const existingData = await db.collection('medicineInventory').where({
        userId
      }).get();

      let result;
      if (existingData.data.length > 0) {
        // 更新现有记录
        result = await db.collection('medicineInventory').where({
          userId
        }).update({
          data: {
            medicineTotal,
            medicineRemaining,
            updatedAt: new Date()
          }
        });
        console.log('更新记录结果:', result);
      } else {
        // 插入新记录
        result = await db.collection('medicineInventory').add({
          data: {
            userId,
            medicineTotal,
            medicineRemaining,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
        console.log('插入记录结果:', result);
      }

      // 返回更新后的数据
      const updatedData = await db.collection('medicineInventory').where({
        userId
      }).get();

      const responseData = updatedData.data.length > 0 ? updatedData.data[0] : {
        userId,
        medicineTotal,
        medicineRemaining
      };

      console.log('返回数据:', responseData);

      return { 
        success: true, 
        data: responseData
      };
    } catch (err) {
      console.error('更新药物数据失败:', err);
      return { success: false, error: err.message };
    }
  } else if (action === 'get') {
    // 获取药物数据
    try {
      const res = await db.collection('medicineInventory').where({
        userId
      }).get();

      console.log('获取数据结果:', res.data);
      return { success: true, data: res.data };
    } catch (err) {
      console.error('获取药物数据失败:', err);
      return { success: false, error: err.message };
    }
  } else {
    return { success: false, error: 'Invalid action' };
  }
};
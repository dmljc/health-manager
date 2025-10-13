const cloud = require('wx-server-sdk');
// 使用当前环境，避免环境不一致导致数据库不可访问
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const userId = wxContext && wxContext.OPENID ? wxContext.OPENID : null;
  try {
    // 服药记录列表（不区分用户，沿用原有行为）
    const listRes = await db.collection('medicine').get();

    // 若提供 userId，则查询该用户最新的库存信息
    let inventory = null;
    if (userId) {
      const invRes = await db
        .collection('medicineInventory')
        .where({ userId })
        .orderBy('updatedAt', 'desc')
        .limit(1)
        .get();
      if (invRes && invRes.data && invRes.data.length > 0) {
        const inv = invRes.data[0];
        inventory = {
          _id: inv._id,
          userId: inv.userId,
          medicineTotal: inv.medicineTotal,
          medicineRemaining: inv.medicineRemaining,
          updatedAt: inv.updatedAt,
        };
      } else {
        // 若该用户无库存记录，按产品既定总量进行一次性初始化，避免前端出现 null
        const initData = {
          userId,
          medicineTotal: 28,
          medicineRemaining: 0,
          updatedAt: new Date(),
        };
        const addRes = await db.collection('medicineInventory').add({ data: initData });
        inventory = {
          _id: addRes && addRes._id ? addRes._id : undefined,
          userId,
          medicineTotal: 28,
          medicineRemaining: 0,
          updatedAt: initData.updatedAt,
        };
      }
    }

    return {
      list: listRes.data,
      count: listRes.data.length,
      inventory,
    };
  } catch (e) {
    return {
      errCode: -1,
      errMsg: e && e.message ? e.message : 'query failed',
      list: [],
      count: 0,
      inventory: null,
    };
  }
};
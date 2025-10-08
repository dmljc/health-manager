const cloud = require('wx-server-sdk');
// 使用当前环境，避免环境不一致导致数据库不可访问
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  try {
    const res = await db.collection('medicine').get();
    return {
      list: res.data,
      count: res.data.length,
    };
  } catch (e) {
    return {
      errCode: -1,
      errMsg: e && e.message ? e.message : 'query failed',
      list: [],
      count: 0,
    };
  }
};
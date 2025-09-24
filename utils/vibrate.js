/**
 * 全局震动反馈工具函数
 * 为项目中的所有可点击交互提供统一的触觉反馈
 */

/**
 * 轻震动反馈 - 用于一般点击操作
 * @param {Object} options 可选配置
 * @param {string} options.type 震动类型: 'heavy', 'medium', 'light' (默认 'light')
 * @param {boolean} options.silent 是否静默失败 (默认 true)
 */
function vibrateLight(options = {}) {
  const { type = 'light', silent = true } = options;
  
  try {
    wx.vibrateShort({
      type,
      success: () => {
        if (!silent) {
          console.log(`震动反馈成功 (${type})`);
        }
      },
      fail: (err) => {
        if (!silent) {
          console.warn('震动反馈失败:', err);
        }
      }
    });
  } catch (e) {
    if (!silent) {
      console.error('震动反馈异常:', e);
    }
  }
}

/**
 * 重震动反馈 - 用于重要操作（如确认、删除等）
 */
function vibrateHeavy() {
  vibrateLight({ type: 'heavy' });
}

/**
 * 中等震动反馈 - 用于中等重要性操作
 */
function vibrateMedium() {
  vibrateLight({ type: 'medium' });
}

/**
 * 长震动反馈 - 用于特殊场景（如警告、错误等）
 * @param {number} duration 震动时长，单位毫秒 (默认 400ms)
 */
function vibrateLong(duration = 400) {
  try {
    wx.vibrateLong({
      success: () => console.log(`长震动反馈成功 (${duration}ms)`),
      fail: (err) => console.warn('长震动反馈失败:', err)
    });
  } catch (e) {
    console.error('长震动反馈异常:', e);
  }
}

/**
 * 通用震动反馈函数 - 根据操作类型自动选择合适的震动强度
 * @param {string} actionType 操作类型: 'tap', 'confirm', 'delete', 'error', 'success'
 */
function vibrateForAction(actionType) {
  switch (actionType) {
    case 'tap':
    case 'click':
      vibrateLight();
      break;
    case 'confirm':
    case 'success':
      vibrateMedium();
      break;
    case 'delete':
    case 'important':
      vibrateHeavy();
      break;
    case 'error':
    case 'warning':
      vibrateLong();
      break;
    default:
      vibrateLight();
  }
}

module.exports = {
  vibrateLight,
  vibrateHeavy,
  vibrateMedium,
  vibrateLong,
  vibrateForAction
};

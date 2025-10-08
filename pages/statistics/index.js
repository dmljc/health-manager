const { vibrateForAction } = require('../../utils/vibrate');

Page({
  data: {},
  onShow() {
    // 底部导航切换震动反馈
    vibrateForAction('tap');
  },
  
  /**
   * 页面点击反馈
   */
  onPageTap() {
    vibrateForAction('tap');
  }
});
App({
  onLaunch() {
    // 应用启动埋点或初始化逻辑
    try {
      const systemInfo = wx.getSystemInfoSync();
      console.log('System info:', systemInfo.model);
    } catch (e) {
      console.warn('getSystemInfo failed', e);
    }
  }
});


/**
 * 应用全局配置和状态管理
 */

App({
  globalData: {
    theme: 'light'
  },

  /**
   * 应用启动时的初始化逻辑
   */
  onLaunch() {
    console.log('健康管理小程序启动');
    
    this.initSystemInfo();
    this.initTheme();
    this.initStorage();
  },

  /**
   * 初始化系统信息
   */
  initSystemInfo() {
    try {
      // 使用新推荐的API代替已弃用的wx.getSystemInfoSync
      if (wx.getSystemSetting) {
        const systemSetting = wx.getSystemSetting();
        console.log('系统设置:', systemSetting);
      }
      
      if (wx.getAppBaseInfo) {
        const appBaseInfo = wx.getAppBaseInfo();
        console.log('应用基础信息:', appBaseInfo);
      }
      
      if (wx.getDeviceInfo) {
        const deviceInfo = wx.getDeviceInfo();
        this.globalData.systemInfo = deviceInfo;
        console.log('设备信息:', deviceInfo);
      }
      
      if (wx.getWindowInfo) {
        const windowInfo = wx.getWindowInfo();
        console.log('窗口信息:', windowInfo);
      }
    } catch (e) {
      console.warn('获取系统信息失败，使用兼容方案', e);
      // 兼容旧版本
      try {
        const systemInfo = wx.getSystemInfoSync();
        this.globalData.systemInfo = systemInfo;
        console.log('系统信息（兼容模式）:', systemInfo);
      } catch (compatError) {
        console.error('获取系统信息完全失败', compatError);
      }
    }
  },

  /**
   * 初始化主题设置
   */
  initTheme() {
    try {
      const savedTheme = wx.getStorageSync('app_theme');
      if (savedTheme) {
        this.globalData.theme = savedTheme;
        this.applyTheme(savedTheme);
      }
    } catch (e) {
      console.warn('获取主题设置失败', e);
    }
  },

  /**
   * 初始化本地存储
   */
  initStorage() {
    try {
      // 初始化默认设置
      const defaultSettings = {
        medicineReminder: true,
        checkupReminder: true,
        reminderTime: '09:00',
        medicineCount: 30
      };

      const settings = wx.getStorageSync('app_settings');
      if (!settings) {
        wx.setStorageSync('app_settings', defaultSettings);
      }
    } catch (e) {
      console.warn('初始化存储失败', e);
    }
  },

  /**
   * 切换主题
   * @param {string} theme 主题类型
   */
  switchTheme(theme) {
    this.globalData.theme = theme;
    this.applyTheme(theme);
    
    try {
      wx.setStorageSync('app_theme', theme);
    } catch (e) {
      console.warn('保存主题设置失败', e);
    }
  },

  /**
   * 应用主题样式
   * @param {string} theme 主题类型
   */
  applyTheme(theme) {
    // 这里可以根据主题更新页面样式
    // 由于微信小程序的限制，主要通过CSS变量实现
    const pages = getCurrentPages();
    pages.forEach(page => {
      if (page.setData) {
        page.setData({
          currentTheme: theme
        });
      }
    });
  },

  /**
   * 获取当前主题
   */
  getCurrentTheme() {
    return this.globalData.theme;
  }
});
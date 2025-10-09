/**
 * 应用全局配置和状态管理
 */

// 兼容性保护：统一覆盖 wx.getSystemInfoSync，内部使用现代 API 组合返回，避免内核警告
try {
  if (wx && typeof wx === 'object') {
    wx.getSystemInfoSync = function () {
      const winInfo = (wx.getWindowInfo && typeof wx.getWindowInfo === 'function') ? wx.getWindowInfo() : null;
      const appBase = (wx.getAppBaseInfo && typeof wx.getAppBaseInfo === 'function') ? wx.getAppBaseInfo() : null;
      const setting = (wx.getSystemSetting && typeof wx.getSystemSetting === 'function') ? wx.getSystemSetting() : null;
      const auth = (wx.getAppAuthorizeSetting && typeof wx.getAppAuthorizeSetting === 'function') ? wx.getAppAuthorizeSetting() : null;
      return {
        pixelRatio: (winInfo && winInfo.pixelRatio) || 2,
        windowWidth: (winInfo && winInfo.windowWidth) || 375,
        windowHeight: (winInfo && winInfo.windowHeight) || 667,
        screenWidth: (winInfo && winInfo.screenWidth) || ((winInfo && winInfo.windowWidth) || 375),
        screenHeight: (winInfo && winInfo.screenHeight) || ((winInfo && winInfo.windowHeight) || 667),
        SDKVersion: (appBase && appBase.SDKVersion) || '',
        version: (appBase && appBase.version) || '',
        // 附带新接口信息，便于第三方兼容
        systemSetting: setting || {},
        appAuthorizeSetting: auth || {}
      };
    };
  }
} catch (_) {}

// 过滤控制台弃用警告：不影响其他正常告警
try {
  const _origWarn = console.warn && console.warn.bind(console);
  if (_origWarn) {
    console.warn = function (...args) {
      try {
        const msg = args && args[0];
        const str = typeof msg === 'string' ? msg : '';
        if (str.includes('wx.getSystemInfoSync is deprecated')) return;
      } catch (_) {}
      return _origWarn(...args);
    };
  }
} catch (_) {}

App({
    globalData: {
        theme: "light",
        isDevTools: false,
    },

    /**
     * 应用启动时的初始化逻辑
     */
    onLaunch() {
        console.log("健康管理小程序启动");
        // 使用现代 API 获取系统信息，避免触碰已弃用的 wx.getSystemInfoSync

        // 移除应用启动阶段的云开发初始化，改为按需在使用处初始化

        this.initSystemInfo();
        this.initTheme();
        this.initStorage();
    },

    /**
     * 初始化系统信息
     */
    initSystemInfo() {
        try {
            const winInfo = (wx.getWindowInfo && typeof wx.getWindowInfo === 'function') ? wx.getWindowInfo() : null;
            const appBase = (wx.getAppBaseInfo && typeof wx.getAppBaseInfo === 'function') ? wx.getAppBaseInfo() : null;
            const systemInfo = {
                pixelRatio: (winInfo && winInfo.pixelRatio) || 2,
                windowWidth: (winInfo && winInfo.windowWidth) || 375,
                windowHeight: (winInfo && winInfo.windowHeight) || 667,
                screenWidth: (winInfo && winInfo.screenWidth) || ((winInfo && winInfo.windowWidth) || 375),
                screenHeight: (winInfo && winInfo.screenHeight) || ((winInfo && winInfo.windowHeight) || 667),
                SDKVersion: (appBase && appBase.SDKVersion) || '',
                version: (appBase && appBase.version) || '',
                platform: (appBase && appBase.platform) || ''
            };
            this.globalData.systemInfo = systemInfo;
            this.globalData.isDevTools = (systemInfo.platform === 'devtools');
        } catch (e) {
            console.warn("获取系统信息失败", e);
        }
    },

    /**
     * 初始化主题设置
     */
    initTheme() {
        try {
            const savedTheme = wx.getStorageSync("app_theme");
            if (savedTheme) {
                this.globalData.theme = savedTheme;
                this.applyTheme(savedTheme);
            }
        } catch (e) {
            console.warn("获取主题设置失败", e);
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
                reminderTime: "09:00",
                medicineCount: 30,
            };

            const settings = wx.getStorageSync("app_settings");
            if (!settings) {
                wx.setStorageSync("app_settings", defaultSettings);
            }
        } catch (e) {
            console.warn("初始化存储失败", e);
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
            wx.setStorageSync("app_theme", theme);
        } catch (e) {
            console.warn("保存主题设置失败", e);
        }
    },

    /**
     * 应用主题样式
     * @param {string} theme 主题类型
     */
    applyTheme(theme) {
        // 目前只支持light主题，后续可扩展
        if (theme === "light") {
            this.globalData.theme = theme;
        }
    },

    /**
     * 获取当前主题
     */
    getCurrentTheme() {
        return this.globalData.theme;
    },
});

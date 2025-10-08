/**
 * 应用全局配置和状态管理
 */

App({
    globalData: {
        theme: "light",
    },

    /**
     * 应用启动时的初始化逻辑
     */
    onLaunch() {
        console.log("健康管理小程序启动");

        // 初始化云开发能力
        if (wx.cloud && typeof wx.cloud.init === 'function') {
            try {
                wx.cloud.init({
                    // 如需指定环境，请在此填写 envId；不填则默认当前环境
                    env: 'cloud1-3grp4xen3b5be11c',
                    traceUser: true,
                });
            } catch (e) {
                console.warn('初始化云开发失败', e);
            }
        }

        this.initSystemInfo();
        this.initTheme();
        this.initStorage();
    },

    /**
     * 初始化系统信息
     */
    initSystemInfo() {
        try {
            // 只获取必要的设备信息
            if (wx.getDeviceInfo) {
                this.globalData.systemInfo = wx.getDeviceInfo();
            }
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

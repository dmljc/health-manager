/**
 * 应用全局配置和状态管理
 */

App({
    onLaunch() {
        try {
            if (wx.cloud && !wx.cloud._inited) {
                wx.cloud.init({
                    env: wx.cloud.DYNAMIC_CURRENT_ENV,
                    traceUser: true,
                });
            }
        } catch (_) {}
    }
});

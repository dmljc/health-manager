/**
 * 导入工具函数
 */
const { vibrateForAction } = require("../../utils/vibrate");
const { formatCurrentDate } = require("../../utils/date");

/**
 * 服药页面
 * - 展示日历与今日服药切换
 */
Page({
    data: {
        currentTheme: "light",
        todayDate: "",
        todayWeekday: "",
        hasTakenToday: false,
        isToggling: false,
        datePickerRefreshKey: 0,
    },

    /**
     * 页面显示时的初始化
     * @returns {void}
     */
    onShow() {
        // 底部导航切换震动反馈
        vibrateForAction("tap");
        this.initPageData();
        this.loadMedicineStatus();
    },

    /**
     * 初始化页面基础数据
     * @returns {void}
     */
    initPageData() {
        const app = getApp();
        const dateStr = formatCurrentDate();
        const dateParts = dateStr.split(" ");

        this.setData({
            currentTheme: app.getCurrentTheme(),
            todayDate: dateParts[0],
            todayWeekday: dateParts[1],
        });
    },

    // 组件事件（如需联动，可在此接收）
    /**
     * 组件回调：日期变化
     * @param {{ detail: { value: string } }} e
     * @returns {void}
     */
    onDateChange(e) {
        // const { value } = e.detail;
    },
    /**
     * 组件回调：月份变化
     * @param {{ detail: { year: number, month: number } }} e
     * @returns {void}
     */
    onMonthChange(e) {
        // const { year, month } = e.detail;
    },

    /**
     * 加载服药状态
     * @returns {void}
     */
    loadMedicineStatus() {
        try {
            const keyToday = this._getTodayKey();
            const medRecords = wx.getStorageSync("med_records") || [];
            const todayRecord = medRecords.find((r) => r.date === keyToday);
            const hasTakenToday = todayRecord
                ? !!todayRecord.taken
                : wx.getStorageSync("has_taken_today") || false;
            this.setData({ hasTakenToday });
        } catch (e) {
            console.error("加载服药状态失败:", e);
        }
    },

    /**
     * 切换今日服药状态并持久化，同时刷新日历点
     * @returns {void}
     */
    toggleMedicineStatus() {
        if (this.data.isToggling) return;
        this.setData({ isToggling: true });

        const { hasTakenToday } = this.data;
        const newStatus = !hasTakenToday;
        const keyToday = this._getTodayKey();

        try {
            wx.setStorageSync("has_taken_today", newStatus);

            const medRecords = wx.getStorageSync("med_records") || [];
            const idx = medRecords.findIndex((r) => r.date === keyToday);
            const time = this._getTimeString();
            if (idx >= 0) {
                medRecords[idx] = { ...medRecords[idx], taken: newStatus, time };
            } else {
                medRecords.unshift({
                    id: `med_${Date.now()}`,
                    date: keyToday,
                    taken: newStatus,
                    time,
                });
            }
            wx.setStorageSync("med_records", medRecords);

            vibrateForAction("success");
            this.setData({
                hasTakenToday: newStatus,
                datePickerRefreshKey: this.data.datePickerRefreshKey + 1,
            });
        } catch (e) {
            console.error("切换服药状态失败:", e);
            wx.showToast({ title: "操作失败", icon: "error", duration: 1000 });
        } finally {
            setTimeout(() => this.setData({ isToggling: false }), 250);
        }
    },

    /**
     * 获取今天的 YYYY-MM-DD 字符串
     * @returns {string}
     */
    _getTodayKey() {
        const d = new Date();
        const y = d.getFullYear();
        const m = `${d.getMonth() + 1}`.padStart(2, "0");
        const day = `${d.getDate()}`.padStart(2, "0");
        return `${y}-${m}-${day}`;
    },

    /**
     * 获取当前时间的 HH:mm 字符串
     * @returns {string}
     */
    _getTimeString() {
        const d = new Date();
        const h = `${d.getHours()}`.padStart(2, "0");
        const m = `${d.getMinutes()}`.padStart(2, "0");
        return `${h}:${m}`;
    },
});

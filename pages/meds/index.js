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
        // 药物管理
        medicineTotal: 28,
        medicineRemaining: 4,
        medicineColorClass: 'normal', // 动态颜色类名
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
        this.loadMedicineData();
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

            // 如果是从未服药切换到已服药，更新药物消耗
            if (!hasTakenToday && newStatus) {
                this.updateMedicineConsumption();
            }

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

    /**
     * 加载药物数据
     */
    loadMedicineData() {
        try {
            const medicineData = wx.getStorageSync('medicine_data');
            
            // 只有当本地存储有数据时才覆盖页面data，否则保持页面data的默认值
            if (medicineData) {
                const colorClass = this.getMedicineColorClass(medicineData.remaining);
                this.setData({
                    medicineTotal: medicineData.total,
                    medicineRemaining: medicineData.remaining,
                    medicineColorClass: colorClass
                });
            } else {
                // 如果没有本地存储数据，使用页面data中的默认值并更新颜色
                const colorClass = this.getMedicineColorClass(this.data.medicineRemaining);
                this.setData({
                    medicineColorClass: colorClass
                });
            }
        } catch (e) {
            console.error('加载药物数据失败:', e);
        }
    },

    /**
     * 根据剩余数量获取颜色类名
     * @param {number} remaining 剩余数量
     * @returns {string} 颜色类名
     */
    getMedicineColorClass(remaining) {
        console.log('getMedicineColorClass called with remaining:', remaining);
        if (remaining >= 20) {
            return 'normal';    // 黑色
        } else if (remaining >= 10) {
            return 'warning';   // 黄色
        } else {
            return 'danger';    // 红色
        }
    },

    /**
     * 手动更新药物数据（用于调试和测试）
     * @param {number} total 总数量
     * @param {number} remaining 剩余数量
     */
    updateMedicineData(total, remaining) {
        const colorClass = this.getMedicineColorClass(remaining);
        this.setData({
            medicineTotal: total,
            medicineRemaining: remaining,
            medicineColorClass: colorClass
        });
        
        // 保存到本地存储
        const medicineData = { total, remaining };
        wx.setStorageSync('medicine_data', medicineData);
    },

    /**
     * 更新药物消耗（当用户服药时调用）
     */
    updateMedicineConsumption() {
        const newRemaining = Math.max(0, this.data.medicineRemaining - 1);
        const colorClass = this.getMedicineColorClass(newRemaining);
        
        this.setData({
            medicineRemaining: newRemaining,
            medicineColorClass: colorClass
        });

        // 保存到本地存储
        const medicineData = {
            total: this.data.medicineTotal,
            remaining: newRemaining
        };
        wx.setStorageSync('medicine_data', medicineData);

        // 如果药物不足，显示提醒
        if (newRemaining <= 5 && newRemaining > 0) {
            wx.showToast({
                title: `药物余量不足，仅剩${newRemaining}颗`,
                icon: 'none',
                duration: 3000
            });
        } else if (newRemaining === 0) {
            wx.showToast({
                title: '药物已用完，请及时补充',
                icon: 'none',
                duration: 3000
            });
        }
    },
});

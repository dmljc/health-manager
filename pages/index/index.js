/**
 * 导入工具函数
 */
const { vibrateForAction } = require('../../utils/vibrate');
const { getGreeting, formatCurrentDate, getToday } = require('../../utils/date');
const { calculateHealthScore } = require('../../utils/health');
const { getTodayMedicineStatus, getMedicineAdherence, getCheckupStatus } = require('../../utils/storage');
const { generateTodayTasks, generateHealthReminders } = require('../../utils/tasks');
const { generateRecentRecords } = require('../../utils/records');

/**
 * 页面数据
 */

Page({
    data: {
        currentTheme: 'light',
        greetingText: '',
        currentDate: '',

        // 健康概览
        medicineStatus: 'warning',
        medicineStatusText: '未服药',
        checkupStatus: 'warning',
        checkupStatusText: '待检查',
        healthScore: 75,

        // 任务和记录
        todayTasks: [],
        recentRecords: [],
        healthReminders: [],

        // 设置相关
        showSettings: false,
        medicineReminder: true,
        checkupReminder: true,

        // 折线图数据
        chartCategories: [],
        chartSeries: []
    },

    /**
     * 页面显示时的初始化
     */
    onShow() {
        // 底部导航切换震动反馈
        vibrateForAction('tap');
        this.initPageData();
        this.loadHealthOverview();
        this.loadTodayTasks();
        this.loadRecentRecords();
        this.loadHealthReminders();
    },

    onLoad() {
        // 准备首页折线图数据（示例：健康评分趋势）
        const categories = ['周一','周二','周三','周四','周五','周六','周日'];
        const series = [{ name: '健康分', data: [72, 74, 76, 75, 78, 80, 79] }];
        this.setData({ chartCategories: categories, chartSeries: series });
    },

    /**
     * 初始化页面基础数据
     */
    initPageData() {
        const app = getApp();

        this.setData({
            currentTheme: app.getCurrentTheme(),
            greetingText: getGreeting(),
            currentDate: formatCurrentDate()
        });
    },

    /**
     * 加载健康概览数据
     */
    loadHealthOverview() {
        try {
            const today = getToday();
            const hasMedicineToday = getTodayMedicineStatus(today);
            const { status: checkupStatus, statusText: checkupStatusText } = getCheckupStatus();
            const medicineAdherence = getMedicineAdherence();

            // 计算健康评分
            const healthScore = calculateHealthScore(
                medicineAdherence,
                checkupStatus === 'success',
                hasMedicineToday
            );

            this.setData({
                medicineStatus: hasMedicineToday ? 'success' : 'danger',
                medicineStatusText: hasMedicineToday ? '已服药' : '未服药',
                checkupStatus,
                checkupStatusText,
                healthScore
            });
        } catch (e) {
            console.error('加载健康概览失败:', e);
        }
    },

    /**
     * 加载今日任务
     */
    loadTodayTasks() {
        try {
            const tasks = generateTodayTasks();
            this.setData({ todayTasks: tasks });
        } catch (e) {
            console.error('加载今日任务失败:', e);
        }
    },

    /**
     * 加载最近记录
     */
    loadRecentRecords() {
        try {
            const records = generateRecentRecords();
            this.setData({ recentRecords: records });
        } catch (e) {
            console.error('加载最近记录失败:', e);
        }
    },

    /**
     * 加载健康提醒
     */
    loadHealthReminders() {
        try {
            const { medicineStatus, checkupStatus, healthScore } = this.data;
            const reminders = generateHealthReminders(medicineStatus, checkupStatus, healthScore);
            this.setData({ healthReminders: reminders });
        } catch (e) {
            console.error('加载健康提醒失败:', e);
        }
    },

    /**
     * 处理任务点击
     */
    handleTask(e) {
        vibrateForAction('tap');
        const task = e.currentTarget.dataset.task;
        if (task.action) {
            this[task.action]();
        }
    },

    /**
     * 查看记录详情
     */
    viewRecord(e) {
        vibrateForAction('tap');
        const record = e.currentTarget.dataset.record;

        switch (record.type) {
            case 'medicine':
                this.goMeds();
                break;
            case 'checkup':
                this.goCheckups();
                break;
            case 'expense':
                this.goExpense();
                break;
        }
    },

    /**
     * 处理健康提醒
     */
    handleReminder(e) {
        vibrateForAction('tap');
        const reminder = e.currentTarget.dataset.reminder;
        if (reminder.action) {
            this[reminder.action]();
        }
    },

    /**
     * 导航到服药页面
     */
    goMeds() {
        wx.switchTab({ url: '/pages/meds/index' });
    },

    /**
     * 导航到体检页面
     */
    goCheckups() {
        wx.switchTab({ url: '/pages/checkups/index' });
    },

    /**
     * 导航到费用页面
     */
    goExpense() {
        wx.switchTab({ url: '/pages/expense/index' });
    },

    /**
     * 导航到统计页面
     */
    goStats() {
        wx.switchTab({ url: '/pages/stats/index' });
    },

    /**
     * 打开设置弹窗
     */
    openSettings() {
        vibrateForAction('tap');
        // 加载当前设置
        try {
            const settings = wx.getStorageSync('app_settings') || {};
            this.setData({
                showSettings: true,
                medicineReminder: settings.medicineReminder !== false,
                checkupReminder: settings.checkupReminder !== false
            });
        } catch (e) {
            console.error('加载设置失败:', e);
            this.setData({
                showSettings: true
            });
        }
    },

    /**
     * 关闭设置弹窗
     */
    closeSettings() {
        this.setData({
            showSettings: false
        });
    },

    /**
     * 防止弹窗内容区域点击穿透
     */
    preventClose() {
        // 空方法，阻止事件冒泡
    },

    /**
     * 切换主题
     */
    switchTheme(e) {
        vibrateForAction('tap');
        const theme = e.currentTarget.dataset.theme;
        const app = getApp();

        app.switchTheme(theme);
        this.setData({
            currentTheme: theme
        });

        wx.showToast({
            title: `已切换到${theme === 'light' ? '浅色' : '深色'}主题`,
            icon: 'success'
        });
    },

    /**
     * 服药提醒开关
     */
    onMedicineReminderChange(e) {
        const value = e.detail.value;
        this.setData({
            medicineReminder: value
        });

        this.saveSettings();
    },

    /**
     * 体检提醒开关
     */
    onCheckupReminderChange(e) {
        const value = e.detail.value;
        this.setData({
            checkupReminder: value
        });

        this.saveSettings();
    },

    /**
     * 保存设置到本地存储
     */
    saveSettings() {
        const { medicineReminder, checkupReminder } = this.data;

        try {
            const settings = {
                medicineReminder,
                checkupReminder,
                reminderTime: '09:00',
                medicineCount: 30
            };

            wx.setStorageSync('app_settings', settings);
        } catch (e) {
            console.error('保存设置失败:', e);
        }
    },

    /**
     * 清除所有数据
     */
    clearAllData() {
        vibrateForAction('important');
        wx.showModal({
            title: '确认清除',
            content: '此操作将清除所有本地数据，包括服药记录、体检记录、费用记录等，操作不可逆！',
            confirmColor: '#EF4444',
            success: (res) => {
                if (res.confirm) {
                    try {
                        // 清除所有数据
                        wx.clearStorageSync();

                        wx.showToast({
                            title: '数据已清除',
                            icon: 'success'
                        });

                        // 关闭设置弹窗并刷新页面
                        this.setData({
                            showSettings: false
                        });

                        // 延迟刷新页面数据
                        setTimeout(() => {
                            this.onShow();
                        }, 1000);

                    } catch (e) {
                        console.error('清除数据失败:', e);
                        wx.showToast({
                            title: '清除失败',
                            icon: 'error'
                        });
                    }
                }
            }
        });
    }
});
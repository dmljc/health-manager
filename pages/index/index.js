/**
 * 导入工具函数
 */
const { vibrateForAction } = require('../../utils/vibrate');
const { getGreeting, formatCurrentDate, getToday } = require('../../utils/date');
const { calculateHealthScore } = require('../../utils/health');
const { getTodayMedicineStatus, getMedicineAdherence, getCheckupStatus } = require('../../utils/storage');
const { generateTodayTasks, generateHealthReminders } = require('../../utils/tasks');
const { generateRecentRecords } = require('../../utils/records');
const USER_DATA = require('../../utils/user-health-data');

/**
 * 页面数据
 */

Page({
    data: {
        currentTheme: 'light',
        userName: '张先生',
        greetingText: '',
        currentDate: '',

        // 健康概览
        medicineStatus: 'normal',
        medicineStatusText: '按时服药',
        checkupStatus: 'warning',
        checkupStatusText: '下次体检：2024-03-15',
        lastCheckupDate: '2024-01-15',
        healthScore: 85,

        // 任务和记录
        todayTasks: [
            {
                id: 1,
                icon: '💊',
                title: '服用降压药',
                time: '08:00',
                status: 'completed'
            },
            {
                id: 2,
                icon: '🩺',
                title: '测量血压',
                time: '09:00',
                status: 'pending'
            },
            {
                id: 3,
                icon: '🏃',
                title: '晨练30分钟',
                time: '06:30',
                status: 'completed'
            },
            {
                id: 4,
                icon: '📝',
                title: '记录血糖',
                time: '21:00',
                status: 'pending'
            }
        ],
        recentRecords: [],
        healthReminders: [],

        // 设置相关
        showSettings: false,
        medicineReminder: true,
        checkupReminder: true,

        // 折线图数据
        chartCategories: [],
        chartSeries: [],
        // 首页四组趋势数据（乙肝、肝功能、甲状腺、生化）
        hbsagCategories: [],
        hbsagSeries: [],
        hbsagIndicators: [],
        liverCategories: [],
        liverSeries: [],
        liverIndicators: [],
        thyroidCategories: [],
        thyroidSeries: [],
        thyroidIndicators: [],
        biochemCategories: [],
        biochemSeries: [],
        biochemIndicators: [],
    },

    /**
     * 页面显示时的初始化
     */
    onShow() {
        // 底部导航切换震动反馈
        vibrateForAction('tap');
        this.initPageData();
        // 加载首页趋势数据
        this.loadHomeTrends();
    },

    onLoad() {
        // 初始化首页折线图数据（改为加载真实体检趋势）
        this.loadHomeTrends();
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
     * 导航到健康指标页面
     */
    goHealthCharts() {
        wx.navigateTo({ url: '/pages/health-charts/index' });
    },

    // 新增：加载首页指标趋势与摘要（基于中文字段数据）
    loadHomeTrends() {
        try {
            // 乙肝表面抗原定量
            const hbsag = USER_DATA['乙肝表面抗原定量'] || [];
            const hbsagSorted = this.sortByDate(hbsag);
            const hbsagCategories = hbsagSorted.map(r => this.formatDateLabel(r['日期']));
            const hbsagSeries = [{ name: 'HBsAg', data: hbsagSorted.map(r => Number(r['数值']) || 0) }];
            const hbsagIndicators = [];
            if (hbsagSorted.length) {
                const latest = hbsagSorted[hbsagSorted.length - 1];
                const prev = hbsagSorted[hbsagSorted.length - 2];
                hbsagIndicators.push({
                    name: 'HBsAg',
                    value: latest['数值'],
                    trendText: this.calcTrendText(latest['数值'], prev ? prev['数值'] : undefined)
                });
            }

            // 肝功能常规（ALT/AST/总胆红素）
            const liver = USER_DATA['肝功能常规'] || [];
            const liverSorted = this.sortByDate(liver);
            const liverCategories = liverSorted.map(r => this.formatDateLabel(r['日期']));
            const liverKeys = [
                { key: '丙氨酸氨基转移酶', name: 'ALT' },
                { key: '天冬氨酸氨基转移酶', name: 'AST' },
                { key: '总胆红素', name: '总胆红素' }
            ];
            const liverSeries = liverKeys.map(k => ({ name: k.name, data: liverSorted.map(r => Number(r[k.key]) || 0) }));
            const liverIndicators = [];
            if (liverSorted.length) {
                const latest = liverSorted[liverSorted.length - 1];
                const prev = liverSorted[liverSorted.length - 2];
                liverKeys.forEach(k => {
                    const curr = latest[k.key];
                    const pre = prev ? prev[k.key] : undefined;
                    liverIndicators.push({ name: k.name, value: curr, trendText: this.calcTrendText(curr, pre) });
                });
            }

            // 甲状腺激素（TT3/FT3/TT4/FT4）
            const thyroid = USER_DATA['甲状腺激素全套'] || [];
            const thyroidSorted = this.sortByDate(thyroid);
            const thyroidCategories = thyroidSorted.map(r => this.formatDateLabel(r['日期']));
            const thyroidKeys = [
                { key: 'TT3', name: 'TT3' },
                { key: 'FT3', name: 'FT3' },
                { key: 'TT4', name: 'TT4' },
                { key: 'FT4', name: 'FT4' }
            ];
            const thyroidSeries = thyroidKeys.map(k => ({ name: k.name, data: thyroidSorted.map(r => Number(r[k.key]) || 0) }));
            const thyroidIndicators = [];
            if (thyroidSorted.length) {
                const latest = thyroidSorted[thyroidSorted.length - 1];
                const prev = thyroidSorted[thyroidSorted.length - 2];
                thyroidKeys.forEach(k => {
                    const curr = latest[k.key];
                    const pre = prev ? prev[k.key] : undefined;
                    thyroidIndicators.push({ name: k.name, value: curr, trendText: this.calcTrendText(curr, pre) });
                });
            }

            // 生化（葡萄糖/总胆固醇/甘油三酯/高密度脂蛋白胆固醇）
            const biochemCategories = liverCategories; // 生化数据在肝功能常规同一批次内
            const biochemKeys = [
                { key: '葡萄糖', name: '葡萄糖' },
                { key: '总胆固醇', name: '总胆固醇' },
                { key: '甘油三酯', name: '甘油三酯' },
                { key: '高密度脂蛋白胆固醇', name: '高密度脂蛋白胆固醇' }
            ];
            const biochemSeries = biochemKeys.map(k => ({ name: k.name, data: liverSorted.map(r => Number(r[k.key]) || 0) }));
            const biochemIndicators = [];
            if (liverSorted.length) {
                const latest = liverSorted[liverSorted.length - 1];
                const prev = liverSorted[liverSorted.length - 2];
                biochemKeys.forEach(k => {
                    const curr = latest[k.key];
                    const pre = prev ? prev[k.key] : undefined;
                    biochemIndicators.push({ name: k.name, value: curr, trendText: this.calcTrendText(curr, pre) });
                });
            }

            this.setData({
                hbsagCategories,
                hbsagSeries,
                hbsagIndicators,
                liverCategories,
                liverSeries,
                liverIndicators,
                thyroidCategories,
                thyroidSeries,
                thyroidIndicators,
                biochemCategories,
                biochemSeries,
                biochemIndicators
            });
        } catch (e) {
            console.error('首页趋势加载失败:', e);
        }
    },

    // 日期排序（按“日期”字段）
    sortByDate(records) {
        return (records || []).slice().sort((a, b) => {
            const ta = new Date(a['日期']).getTime();
            const tb = new Date(b['日期']).getTime();
            return ta - tb;
        });
    },

    // 日期标签格式化：YYYY-MM
    formatDateLabel(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        return `${y}-${m}`;
    },

    // 趋势文本：上升/下降/持平
    calcTrendText(curr, prev) {
        if (prev === undefined || prev === null) return '持平';
        if (curr > prev) return '上升';
        if (curr < prev) return '下降';
        return '持平';
    },

    /**
     * 添加健康记录
     */
    addRecord() {
        wx.showActionSheet({
            itemList: ['血压记录', '血糖记录', '体重记录', '用药记录'],
            success: (res) => {
                const recordTypes = [
                    '/pages/blood-pressure/add',
                    '/pages/blood-sugar/add', 
                    '/pages/weight/add',
                    '/pages/medicine/add'
                ];
                
                if (res.tapIndex < recordTypes.length) {
                    wx.navigateTo({
                        url: recordTypes[res.tapIndex]
                    });
                }
            }
        });
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
/**
 * 导入震动反馈工具
 */
const { vibrateForAction } = require('../../utils/vibrate');

/**
 * 工具函数
 */
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 6) return '深夜好';
  if (hour < 12) return '早上好';
  if (hour < 14) return '中午好';
  if (hour < 18) return '下午好';
  return '晚上好';
}

function formatCurrentDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const weekday = weekdays[now.getDay()];
  
  return `${year}年${month}月${day}日 ${weekday}`;
}

function getToday() {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}月${day}日`;
}

function calculateHealthScore(medicineAdherence, hasRecentCheckup, hasMedicineToday) {
  let score = 60; // 基础分
  
  // 服药依从性占40%
  score += (medicineAdherence / 100) * 40;
  
  // 定期体检占20%
  if (hasRecentCheckup) {
    score += 20;
  }
  
  // 今日服药占20%
  if (hasMedicineToday) {
    score += 20;
  }
  
  return Math.min(100, Math.round(score));
}

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
    checkupReminder: true
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
      
      // 检查今日服药状态
      const medRecords = wx.getStorageSync('med_records') || [];
      const todayMedRecord = medRecords.find((record) => record.date === today);
      const hasMedicineToday = todayMedRecord?.taken || false;
      
      // 检查体检状态
      const checkupRecords = wx.getStorageSync('checkup_records') || [];
      const lastCheckupDate = checkupRecords.length > 0 ? 
        checkupRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date : 
        null;
      
      let checkupStatus = 'warning';
      let checkupStatusText = '待检查';
      
      if (lastCheckupDate) {
        const daysSinceLastCheckup = Math.floor(
          (new Date().getTime() - new Date(lastCheckupDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if (daysSinceLastCheckup <= 180) { // 6个月内
          checkupStatus = 'success';
          checkupStatusText = '正常';
        } else if (daysSinceLastCheckup <= 210) { // 7个月内
          checkupStatus = 'warning';
          checkupStatusText = '即将到期';
        } else {
          checkupStatus = 'danger';
          checkupStatusText = '已过期';
        }
      }
      
      // 计算服药依从性
      const last30DaysRecords = medRecords.filter((record) => {
        const recordDate = new Date(record.date);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return recordDate >= thirtyDaysAgo;
      });
      
      const medicineAdherence = last30DaysRecords.length > 0 ? 
        Math.round((last30DaysRecords.filter((r) => r.taken).length / last30DaysRecords.length) * 100) : 
        0;
      
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
      const today = getToday();
      const tasks = [];
      
      // 检查服药任务
      const medRecords = wx.getStorageSync('med_records') || [];
      const todayMedRecord = medRecords.find((record) => record.date === today);
      const hasMedicineToday = todayMedRecord?.taken || false;
      
      if (!hasMedicineToday) {
        const currentMedicine = wx.getStorageSync('current_medicine') || {};
        const reminderTime = currentMedicine.reminderTime || '09:00';
        
        tasks.push({
          id: 'medicine_today',
          title: '服药提醒',
          description: `请在${reminderTime}按时服药`,
          icon: '💊',
          status: 'pending',
          statusText: '待完成',
          action: 'goMeds'
        });
      }
      
      // 检查体检任务
      const checkupRecords = wx.getStorageSync('checkup_records') || [];
      if (checkupRecords.length > 0) {
        const lastCheckupDate = checkupRecords.sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        )[0].date;
        
        const daysSinceLastCheckup = Math.floor(
          (new Date().getTime() - new Date(lastCheckupDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if (daysSinceLastCheckup >= 180) { // 6个月以上
          tasks.push({
            id: 'checkup_reminder',
            title: '体检提醒',
            description: '距离上次体检已超过6个月，建议复查',
            icon: '🩺',
            status: 'pending',
            statusText: '待预约',
            action: 'goCheckups'
          });
        }
      } else {
        tasks.push({
          id: 'first_checkup',
          title: '首次体检',
          description: '建议进行首次健康体检',
          icon: '🩺',
          status: 'pending',
          statusText: '待完成',
          action: 'goCheckups'
        });
      }
      
      // 检查药物余量
      const currentMedicine = wx.getStorageSync('current_medicine') || {};
      if (currentMedicine.remainingCount <= 5 && currentMedicine.remainingCount > 0) {
        tasks.push({
          id: 'medicine_low',
          title: '药物余量不足',
          description: `当前药物剩余${currentMedicine.remainingCount}颗`,
          icon: '⚠️',
          status: 'pending',
          statusText: '需购买',
          action: 'goMeds'
        });
      }
      
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
      const records = [];
      
      // 最近的服药记录
      const medRecords = wx.getStorageSync('med_records') || [];
      const recentMedRecords = medRecords
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 3);
      
      recentMedRecords.forEach((record) => {
        records.push({
          id: `med_${record.id}`,
          title: '服药记录',
          subtitle: record.taken ? `已服药 ${record.time}` : '未服药',
          icon: '💊',
          date: formatDate(record.date),
          type: 'medicine'
        });
      });
      
      // 最近的体检记录
      const checkupRecords = wx.getStorageSync('checkup_records') || [];
      const recentCheckupRecords = checkupRecords
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 2);
      
      recentCheckupRecords.forEach((record) => {
        records.push({
          id: `checkup_${record.id}`,
          title: '体检记录',
          subtitle: `费用: ¥${record.totalCost}`,
          icon: '🩺',
          date: formatDate(record.date),
          type: 'checkup'
        });
      });
      
      // 最近的费用记录
      const expenseRecords = wx.getStorageSync('expense_records') || [];
      const recentExpenseRecords = expenseRecords
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 2);
      
      recentExpenseRecords.forEach((record) => {
        records.push({
          id: `expense_${record.id}`,
          title: record.typeName,
          subtitle: `¥${record.amount}`,
          icon: '💰',
          date: formatDate(record.date),
          type: 'expense'
        });
      });
      
      // 按日期排序并限制数量
      const sortedRecords = records
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);
      
      this.setData({ recentRecords: sortedRecords });
    } catch (e) {
      console.error('加载最近记录失败:', e);
    }
  },

  /**
   * 加载健康提醒
   */
  loadHealthReminders() {
    try {
      const reminders = [];
      
      // 根据健康状态生成提醒
      const { medicineStatus, checkupStatus, healthScore } = this.data;
      
      if (medicineStatus === 'danger') {
        reminders.push({
          id: 'medicine_reminder',
          title: '服药提醒',
          description: '今日还未服药，请及时服用',
          icon: '💊',
          priority: 'high',
          action: 'goMeds'
        });
      }
      
      if (checkupStatus === 'danger') {
        reminders.push({
          id: 'checkup_overdue',
          title: '体检逾期',
          description: '距离上次体检已超过7个月，请尽快预约体检',
          icon: '🩺',
          priority: 'high',
          action: 'goCheckups'
        });
      } else if (checkupStatus === 'warning') {
        reminders.push({
          id: 'checkup_due',
          title: '体检提醒',
          description: '即将到达体检时间，建议提前预约',
          icon: '🩺',
          priority: 'medium',
          action: 'goCheckups'
        });
      }
      
      if (healthScore < 70) {
        reminders.push({
          id: 'health_low',
          title: '健康评分偏低',
          description: '请注意按时服药和定期体检，保持健康生活习惯',
          icon: '💚',
          priority: 'medium',
          action: 'goStats'
        });
      }
      
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
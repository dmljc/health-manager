Page({
  data: {
    array: [
      "乙肝表面抗原（HBeAg）",
      "乙型肝炎e抗体（HBeAb）",
      "HBV-DNA定量",
      "谷丙转氨酶（ALT）",
      "尿酸（UA）",
      "甘油三酯（TG）",
    ],
    index: 0,
    date: '',
    time: '',
  },

  // 获取当前日期时间
  getCurrentDateTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    
    return {
      date: `${year}-${month}-${day}`,
      time: `${hour}:${minute}`
    };
  },

  bindPickerChange(e) {
    const idx = e && e.detail ? Number(e.detail.value) : 0;
    this.setData({ index: idx });
  },



  bindDateChange(e) {
    console.log('Date changed:', e);
    const d = e && e.detail ? e.detail.value : this.data.date;
    console.log('New date:', d);
    
    // 验证日期格式
    if (this.isValidDate(d)) {
      this.setData({ date: d });
    } else {
      console.error('Invalid date format:', d);
      wx.showToast({
        title: '日期格式错误',
        icon: 'none'
      });
    }
  },

  bindTimeChange(e) {
    console.log('Time changed:', e);
    const t = e && e.detail ? e.detail.value : this.data.time;
    console.log('New time:', t);
    
    // 验证时间格式
    if (this.isValidTime(t)) {
      this.setData({ time: t });
    } else {
      console.error('Invalid time format:', t);
      wx.showToast({
        title: '时间格式错误',
        icon: 'none'
      });
    }
  },

  // 验证日期格式 (YYYY-MM-DD)
  isValidDate(dateString) {
    if (!dateString) return false;
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) return false;
    
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date) && dateString === date.toISOString().split('T')[0];
  },

  // 验证时间格式 (HH:MM)
  isValidTime(timeString) {
    if (!timeString) return false;
    const regex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return regex.test(timeString);
  },

  // 保存检测记录
  onSave() {
    const { array, index, date, time } = this.data;
    
    // 验证数据完整性
    if (!array[index]) {
      wx.showToast({
        title: '请选择检查类型',
        icon: 'none'
      });
      return;
    }
    
    if (!date) {
      wx.showToast({
        title: '请选择检测日期',
        icon: 'none'
      });
      return;
    }
    
    if (!time) {
      wx.showToast({
        title: '请选择检测时间',
        icon: 'none'
      });
      return;
    }
    
    // 构建保存数据
    const recordData = {
      type: array[index],
      date: date,
      time: time,
      datetime: `${date} ${time}`,
      timestamp: new Date(`${date} ${time}`).getTime(),
      createTime: new Date().toISOString()
    };
    
    console.log('Saving record:', recordData);
    
    // 这里可以调用云函数或本地存储
    try {
      // 示例：保存到本地存储
      const existingRecords = wx.getStorageSync('health_records') || [];
      existingRecords.push(recordData);
      wx.setStorageSync('health_records', existingRecords);
      
      // 显示成功提示
      wx.showToast({
        title: '保存成功',
        icon: 'success',
        duration: 2000
      });
      
      // 延迟返回上一页
      setTimeout(() => {
        wx.navigateBack({
          delta: 1
        });
      }, 2000);
      
    } catch (error) {
      console.error('Save failed:', error);
      wx.showToast({
        title: '保存失败',
        icon: 'error'
      });
    }
  },

  // 页面加载时初始化
  onLoad() {
    console.log('Page loaded with data:', this.data);
    
    // 设置当前日期时间为默认值
    const currentDateTime = this.getCurrentDateTime();
    this.setData({
      date: currentDateTime.date,
      time: currentDateTime.time
    });
    
    console.log('Initialized with current date time:', currentDateTime);
  }
});
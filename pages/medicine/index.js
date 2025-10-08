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
      selectedDate: "", // 当前选中的日期
      // 药物管理
      medicineTotal: 28,
      medicineRemaining: 4,
      medicineColorClass: "normal", // 动态颜色类名

      // 弹框相关
      showModal: false,
      modalTotalInput: "",
      modalInputFocus: false,

      // 双击检测
      lastTapTime: 0,

      // 药物列表
      medicineList: [],

       // 药物记录详情
      medicineRecord: null,

      // 查询相关
      queryId: "", // 通过路由或调用传入的 id
      medicineDetail: null, // 按 id 查询得到的记录详情
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

    // 确保弹框状态重置
    this.setData({
      showModal: false,
      modalInputFocus: false,
      modalTotalInput: "",
    });
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

    this.getMedicineList();
  },

  // 组件事件（如需联动，可在此接收）
  /**
   * 组件回调：日期变化
   * @param {{ detail: { value: string } }} e
   * @returns {void}
   */
  onDateChange(e) {
    const { value } = e.detail;
    this.loadMedicineStatusForDate(value);
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
   * 根据选中日期加载服药状态
   * @param {string} selectedDate 选中的日期 YYYY-MM-DD
   * @returns {void}
   */
  loadMedicineStatusForDate(selectedDate) {
    try {
      const medRecords = wx.getStorageSync("med_records") || [];
      const selectedRecord = medRecords.find((r) => r.date === selectedDate);

      // 如果找到该日期的记录，使用记录中的状态
      // 如果没有记录，默认为未服药状态
      const hasTakenOnSelectedDate = selectedRecord
        ? !!selectedRecord.taken
        : false;

      this.setData({
        hasTakenToday: hasTakenOnSelectedDate,
        selectedDate: selectedDate, // 保存当前选中的日期
      });
    } catch (e) {
      console.error("加载选中日期服药状态失败:", e);
    }
  },

  /**
   * 获取药物列表
   * @returns {void}
   */
  getMedicineList() {
    wx.cloud.callFunction({
      name: "medicineList", // 云函数名称（对应接口逻辑）
      success: (res) => {
        this.setData({ medicineList: res.result.list || [] });
      },
      fail: (err) => {
        console.error("调用失败：", err);
      },
    });
  },

  /**
   * 获取药物数据
   * @returns {void}
   */
  getMedicineData(id) {
    try {
      // 优先从页面路由参数读取 id（基础库 >=2.4.1 支持 this.options）
    //   const idFromRoute = this.options && this.options.id;
    //   const idFromData = this.data.queryId;
    //   const id = idFromRoute || idFromData;

      if (!id) {
        console.warn("getMedicineData: 未提供 id，已跳过查询");
        return;
      }

      if (!wx.cloud || !wx.cloud.database) {
        console.error("getMedicineData: 云开发未初始化或不可用");
        return;
      }

      const db = wx.cloud.database();
      const collection = db.collection("medicine");

      // 先按 _id 查询（doc 查询）
      collection
        .doc(id)
        .get()
        .then((res) => {
          // 查到数据
          if (res && res.data) {
            this.setData({ medicineDetail: res.data });
            return;
          }
          // 未查到数据则尝试按自定义 id 字段查询
          return collection.where({ id }).get();
        })
        .then((res) => {
          // 如果第二段是 where 查询的结果
          if (res && Array.isArray(res.data)) {
            const detail = res.data[0] || null;
            this.setData({ medicineDetail: detail });
          }
        })
        .catch((err) => {
          // doc 查询失败，尝试 where 按自定义字段 id 查询
          collection
            .where({ id })
            .get()
            .then((res2) => {
              const detail = (res2 && res2.data && res2.data[0]) || null;
              this.setData({ medicineDetail: detail });
            })
            .catch((err2) => {
              console.error("getMedicineData: 按 id 查询失败", err, err2);
              wx.showToast({ title: "查询失败", icon: "error", duration: 1200 });
            });
        });
    } catch (e) {
      console.error("getMedicineData: 查询异常", e);
    }
  },

  /**
   * 切换服药状态并持久化，同时刷新日历点
   * @returns {void}
   */
  toggleMedicineStatus() {
    if (this.data.isToggling) return;
    this.setData({ isToggling: true });

    const { hasTakenToday, selectedDate } = this.data;
    const newStatus = !hasTakenToday;

    // 使用选中的日期，如果没有选中日期则使用今天
    const targetDate = selectedDate || this._getTodayKey();
    const isToday = targetDate === this._getTodayKey();

    try {
      // 如果是今天，更新今天的状态
      if (isToday) {
        wx.setStorageSync("has_taken_today", newStatus);
      }

      const medRecords = wx.getStorageSync("med_records") || [];
      const idx = medRecords.findIndex((r) => r.date === targetDate);
      const time = this._getTimeString();

      if (idx >= 0) {
        medRecords[idx] = { ...medRecords[idx], taken: newStatus, time };
      } else {
        medRecords.unshift({
          id: `med_${Date.now()}`,
          date: targetDate,
          taken: newStatus,
          time,
        });
      }
      wx.setStorageSync("med_records", medRecords);

      // 只有今天是未服药切换到已服药时，才更新药物消耗
      if (isToday && !hasTakenToday && newStatus) {
        this.updateMedicineConsumption();
      }

      vibrateForAction("success");
      this.setData({
        hasTakenToday: newStatus,
        datePickerRefreshKey: this.data.datePickerRefreshKey + 1,
      });

      // 调用云函数 medicineStatus，上传服药状态：已服药=1，未服药=0
      if (wx.cloud && wx.cloud.callFunction) {
        const status = newStatus ? 1 : 0;
        const dateStr = targetDate; // 使用选择的日期或今天
        const timeStr = time; // 当前时间字符串
        try {
          wx.cloud
            .callFunction({
              name: "medicineStatus",
              data: { status, date: dateStr, time: timeStr },
            })
            .then((res) => {
                this.setData({ medicineRecord: res?.result?.record || null });  
            })
            .catch((err) => {
              console.error("调用云函数 medicineStatus 失败：", err);
            });
        } catch (e) {
          console.error("调用云函数 medicineStatus 异常：", e);
        }
      }
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
      const medicineData = wx.getStorageSync("medicine_data");

      // 只有当本地存储有数据时才覆盖页面data，否则保持页面data的默认值
      if (medicineData) {
        const colorClass = this.getMedicineColorClass(medicineData.remaining);
        this.setData({
          medicineTotal: medicineData.total,
          medicineRemaining: medicineData.remaining,
          medicineColorClass: colorClass,
        });
      } else {
        // 如果没有本地存储数据，使用页面data中的默认值并更新颜色
        const colorClass = this.getMedicineColorClass(
          this.data.medicineRemaining
        );
        this.setData({
          medicineColorClass: colorClass,
        });
      }
    } catch (e) {
      console.error("加载药物数据失败:", e);
    }
  },

  /**
   * 根据剩余数量获取颜色类名
   * @param {number} remaining 剩余数量
   * @returns {string} 颜色类名
   */
  getMedicineColorClass(remaining) {
    if (remaining >= 20) {
      return "normal"; // 黑色
    } else if (remaining >= 10) {
      return "warning"; // 黄色
    } else {
      return "danger"; // 红色
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
      medicineColorClass: colorClass,
    });

    // 保存到本地存储
    const medicineData = { total, remaining };
    wx.setStorageSync("medicine_data", medicineData);
  },

  /**
   * 更新药物消耗（当用户服药时调用）
   */
  updateMedicineConsumption() {
    const newRemaining = Math.max(0, this.data.medicineRemaining - 1);
    const colorClass = this.getMedicineColorClass(newRemaining);

    this.setData({
      medicineRemaining: newRemaining,
      medicineColorClass: colorClass,
    });

    // 保存到本地存储
    const medicineData = {
      total: this.data.medicineTotal,
      remaining: newRemaining,
    };
    wx.setStorageSync("medicine_data", medicineData);

    // 如果药物不足，显示提醒
    if (newRemaining <= 5 && newRemaining > 0) {
      wx.showToast({
        title: `药物余量不足，仅剩${newRemaining}颗`,
        icon: "none",
        duration: 3000,
      });
    } else if (newRemaining === 0) {
      wx.showToast({
        title: "药物已用完，请及时补充",
        icon: "none",
        duration: 3000,
      });
    }
  },

  /**
   * 药物数量点击事件（双击检测）
   */
  onMedicineCountTap() {
    const currentTime = Date.now();
    const timeDiff = currentTime - this.data.lastTapTime;

    if (timeDiff < 300) {
      // 300ms内认为是双击
      vibrateForAction("tap");
      this.setData({
        showModal: true,
        modalTotalInput: this.data.medicineTotal.toString(),
        modalInputFocus: true,
      });
      this.setData({
        lastTapTime: 0, // 重置时间，避免连续触发
      });
    } else {
      this.setData({
        lastTapTime: currentTime,
      });
    }
  },

  /**
   * 弹框输入事件
   */
  onModalTotalInput(e) {
    this.setData({
      modalTotalInput: e.detail.value,
    });
  },

  /**
   * 关闭弹框
   */
  closeModal() {
    this.setData({
      showModal: false,
      modalInputFocus: false,
      modalTotalInput: "", // 清空输入框内容
    });
  },

  /**
   * 阻止弹框内容区域点击关闭
   */
  preventClose() {
    // 阻止事件冒泡
  },

  /**
   * 确认修改总数量
   */
  confirmTotalChange() {
    const newTotal = parseInt(this.data.modalTotalInput);

    // 验证输入
    if (isNaN(newTotal) || newTotal <= 0) {
      wx.showToast({
        title: "请输入有效的数量",
        icon: "none",
        duration: 2000,
      });
      return;
    }

    // 更新数据
    const colorClass = this.getMedicineColorClass(this.data.medicineRemaining);
    this.setData({
      medicineTotal: newTotal,
      medicineColorClass: colorClass,
      showModal: false,
      modalInputFocus: false,
      modalTotalInput: "", // 清空输入框内容
    });

    // 保存到本地存储
    const medicineData = {
      total: newTotal,
      remaining: this.data.medicineRemaining,
    };
    wx.setStorageSync("medicine_data", medicineData);

    wx.showToast({
      title: "药物总量已更新",
      icon: "success",
      duration: 1500,
    });
  },
});

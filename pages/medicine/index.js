// 云函数入口文件
const { vibrateForAction, vibrateLight } = require("../../utils/vibrate");
const { formatCurrentDate, getToday, getCurrentTimeHHmm } = require("../../utils/date");

Page({
  data: {
    currentTheme: "light",
    todayDate: "",
    todayWeekday: "",
    hasTakenToday: false,
    isToggling: false,
    datePickerRefreshKey: 0,
    selectedDate: "",
    medicineTotal: 28,
    medicineRemaining: 0,
    medicineColorClass: "normal",
    showModal: false,
    modalTotalInput: "",
    modalInputFocus: false,
    lastTapTime: 0,
    medicineList: [],
    medicineRecord: null,
    queryId: "",
    medicineDetail: null,
  },

  getUserId() {
    // 假设从全局数据中获取用户 ID
    const app = getApp();
    return app.globalData.userId || "defaultUserId";
  },

  async fetchMedicineData() {
    const userId = this.getUserId();
    try {
      if (!wx.cloud || !wx.cloud._inited) {
        wx.cloud.init({
          env: "cloud1-3grp4xen3b5be11c",
          traceUser: true,
        });
      }

      // 获取服药记录列表
      const res = await wx.cloud.callFunction({
        name: "medicineList",
        data: {},
      });

      const list = res.result && res.result.list ? res.result.list : [];
      const todayRecord = list.find((record) => record.date === this.data.todayDate);

      if (todayRecord) {
        const takenByStatus = typeof todayRecord.status !== "undefined" ? Number(todayRecord.status) === 1 : !!todayRecord.taken;
        this.setData({
          queryId: todayRecord._id || todayRecord.id || "",
          hasTakenToday: takenByStatus,
          medicineRecord: todayRecord,
        });
      } else {
        console.warn("未找到当天记录，请检查数据或日期格式。");
        this.setData({
          queryId: "",
          hasTakenToday: false,
          medicineRecord: null,
        });
      }

      // 获取药物库存信息
      try {
        const inventoryRes = await wx.cloud.callFunction({
          name: "medicineInventory",
          data: {
            action: "get",
            userId: userId,
          },
        });

        if (inventoryRes.result && inventoryRes.result.success && inventoryRes.result.data) {
          const inventoryDataArray = inventoryRes.result.data;
          // get操作返回的是数组，取第一个元素
          const inventoryData = Array.isArray(inventoryDataArray) && inventoryDataArray.length > 0 
            ? inventoryDataArray[0] 
            : inventoryDataArray;
          
          if (inventoryData && typeof inventoryData === 'object') {
            const medicineTotal = inventoryData.medicineTotal || 28;
            const medicineRemaining = inventoryData.medicineRemaining || 0;
            const medicineColorClass = this.computeRemainingColorClass(medicineTotal, medicineRemaining);

            console.log('fetchMedicineData 获取到库存数据:', { medicineTotal, medicineRemaining });

            this.setData({
              medicineTotal: medicineTotal,
              medicineRemaining: medicineRemaining,
              medicineColorClass: medicineColorClass,
            });
          } else {
            console.warn('库存数据格式不正确:', inventoryData);
          }
        } else {
          // 如果云端没有数据，尝试从本地存储读取
          try {
            const localTotal = wx.getStorageSync('medicine_total') || 28;
            const localRemaining = wx.getStorageSync('medicine_remaining') || 4;
            const medicineColorClass = this.computeRemainingColorClass(localTotal, localRemaining);
            
            this.setData({
              medicineTotal: localTotal,
              medicineRemaining: localRemaining,
              medicineColorClass: medicineColorClass,
            });
          } catch (e) {
            console.warn("读取本地存储失败:", e);
          }
        }
      } catch (inventoryErr) {
        console.warn("获取药物库存失败:", inventoryErr);
        // 使用默认值或本地存储
        try {
          const localTotal = wx.getStorageSync('medicine_total') || 28;
          const localRemaining = wx.getStorageSync('medicine_remaining') || 4;
          const medicineColorClass = this.computeRemainingColorClass(localTotal, localRemaining);
          
          this.setData({
            medicineTotal: localTotal,
            medicineRemaining: localRemaining,
            medicineColorClass: medicineColorClass,
          });
        } catch (e) {
          console.warn("读取本地存储失败:", e);
        }
      }

      // 将云端列表缓存到本地供日期组件显示点位，并刷新网格
      try {
        wx.setStorageSync("med_records", list);
      } catch (e) {
        console.warn("写入本地缓存失败 med_records:", e);
      }
      this.setData({
        medicineList: list,
        datePickerRefreshKey: this.data.datePickerRefreshKey + 1,
      });
    } catch (err) {
      console.error("云函数调用失败:", err);
    }
  },

  async fetchTodayRecord() {
    try {
      if (!wx.cloud || !wx.cloud._inited) {
        wx.cloud.init({
          env: "cloud1-3grp4xen3b5be11c",
          traceUser: true,
        });
      }
      const res = await wx.cloud.callFunction({
        name: "medicineList",
        data: {},
      });

      const list = res.result && res.result.list ? res.result.list : [];

      const todayRecord = list.find((record) => record.date === this.data.todayDate);
      if (todayRecord) {
        const takenByStatus = typeof todayRecord.status !== "undefined" ? Number(todayRecord.status) === 1 : !!todayRecord.taken;
        this.setData({
          queryId: todayRecord._id || todayRecord.id || "",
          hasTakenToday: takenByStatus,
          medicineRecord: todayRecord,
        });
        return todayRecord;
      }

      wx.showToast({ title: "未找到当天记录", icon: "none" });
      console.warn("未找到当天记录，todayDate:", this.data.todayDate);
      return null;
    } catch (err) {
      wx.showToast({ title: "云函数调用失败", icon: "none" });
      console.error("云函数调用失败:", err);
      return null;
    }
  },

  async handleMedicineStatusToggle() {

    // 触发轻震动反馈（点击操作）
    try {
      vibrateForAction && vibrateForAction('click');
    } catch (_) {}

    // 防重复点击：正在切换时直接返回
    if (this.data.isToggling) {
      return;
    }

    const newStatus = this.data.hasTakenToday ? 0 : 1; // 直接基于本地状态切换 0/1
    
    // 计算新的药物余量
    let newRemaining = this.data.medicineRemaining;
    if (newStatus === 1) {
      // 从"未服用"到"已服用"：减少1粒（但不能小于0）
      newRemaining = Math.max(0, newRemaining - 1);
    } else {
      // 从"已服用"到"未服用"：增加1粒（但不能超过总量）
      newRemaining = Math.min(this.data.medicineTotal, newRemaining + 1);
    }

    this.setData({ isToggling: true }); // 显示加载状态

    try {
      // 1. 更新服药状态
      await this.updateMedicineData(newStatus);
      
      // 2. 更新药物库存
      await this.updateMedicineInventory(newRemaining);
      
      // 3. 获取最新的服药记录列表（确保数据同步）
      await this.fetchLatestMedicineList();
      
      // 重新计算颜色级别
      const newColorClass = this.computeRemainingColorClass(this.data.medicineTotal, newRemaining);
      
      this.setData({
        medicineRemaining: newRemaining,
        medicineColorClass: newColorClass,
        isToggling: false,
      });
    } catch (err) {
      this.setData({ isToggling: false });
      wx.showToast({
        title: "状态更新失败",
        icon: "none",
      });
      console.error("药物状态更新失败:", err);
    }
  },

  // 底部 Tab 点击切换到“服药”时触发震动反馈
  onTabItemTap(item) {
    try {
      vibrateLight && vibrateLight({ type: 'light', silent: true });
    } catch (_) {}
  },

  async updateMedicineData(medicineStatus) {
    try {
      if (!wx.cloud || !wx.cloud._inited) {
        wx.cloud.init({
          env: "cloud1-3grp4xen3b5be11c",
          traceUser: true,
        });
      }

      const res = await wx.cloud.callFunction({
        name: "medicineStatus",
        data: {
          status: medicineStatus,
          date: this.data.todayDate,
          time: getCurrentTimeHHmm(),
        },
      });

      if (!(res.result && res.result.ok)) {
        console.error("更新药物状态失败:", res.result && res.result.error);
        throw new Error(res.result && res.result.error || "update failed");
      }
    } catch (err) {
      console.error("云函数调用失败:", err);
      throw err;
    }
  },

  async fetchLatestMedicineList() {
    try {
      if (!wx.cloud || !wx.cloud._inited) {
        wx.cloud.init({
          env: "cloud1-3grp4xen3b5be11c",
          traceUser: true,
        });
      }

      const resList = await wx.cloud.callFunction({
        name: "medicineList",
        data: {},
      });

      const list = resList.result && resList.result.list ? resList.result.list : [];
      const todayRecord = list.find((record) => record.date === this.data.todayDate);
      const takenByStatus = todayRecord
        ? (typeof todayRecord.status !== "undefined" ? Number(todayRecord.status) === 1 : !!todayRecord.taken)
        : false;

      // 写入缓存并刷新日期组件
      try {
        wx.setStorageSync("med_records", list);
      } catch (e) {
        console.warn("写入本地缓存失败 med_records:", e);
      }

      this.setData({
        hasTakenToday: takenByStatus,
        medicineRecord: todayRecord || null,
        medicineList: list,
        datePickerRefreshKey: this.data.datePickerRefreshKey + 1,
      });
    } catch (err) {
      console.error("获取服药记录列表失败:", err);
      throw err;
    }
  },

  // 更新药物库存到云端
  async updateMedicineInventory(newRemaining) {
    try {
      if (!wx.cloud || !wx.cloud._inited) {
        wx.cloud.init({
          env: "cloud1-3grp4xen3b5be11c",
          traceUser: true,
        });
      }

      const userId = this.getUserId();
      const res = await wx.cloud.callFunction({
        name: "medicineInventory",
        data: {
          action: "update",
          userId: userId,
          medicineTotal: this.data.medicineTotal,
          medicineRemaining: newRemaining,
        },
      });

      if (!(res.result && res.result.success)) {
        console.error("更新药物库存失败:", res.result && res.result.error);
        throw new Error(res.result && res.result.error || "库存更新失败");
      }

      // 使用云函数返回的最新数据更新页面状态
      if (res.result.data) {
        const updatedData = res.result.data;
        const updatedTotal = updatedData.medicineTotal;
        const updatedRemaining = updatedData.medicineRemaining;
        const nextColor = this.computeRemainingColorClass(updatedTotal, updatedRemaining);
        
        this.setData({
          medicineTotal: updatedTotal,
          medicineRemaining: updatedRemaining,
          medicineColorClass: nextColor,
        });

        // 同时保存到本地作为备份
        try { 
          wx.setStorageSync('medicine_total', updatedTotal); 
          wx.setStorageSync('medicine_remaining', updatedRemaining);
        } catch (_) {}
      }
    } catch (err) {
      console.error("更新药物库存失败:", err);
      throw err;
    }
  },

  // 日期组件事件：选中日期变化
  onDateChange(e) {
    const date = e && e.detail && e.detail.value ? e.detail.value : "";
    if (!date) return;
    this.setData({ selectedDate: date });
  },

  // 日期组件事件：月份变化（可用于按需懒加载或统计）
  onMonthChange(e) {
    // 这里只记录变化，必要时可触发数据拉取或统计
  },

  // 双击药物余量打开“设置药物总量”弹框
  onMedicineCountTap(e) {
    const now = (e && (e.timeStamp || e.detail && e.detail.timeStamp)) ? (e.timeStamp || e.detail.timeStamp) : Date.now();
    const last = this.data.lastTapTime || 0;
    // 350ms 内视为双击
    if (now - last < 350) {
      this.openModal();
      // 重置，避免三连击误触
      this.setData({ lastTapTime: 0 });
      return;
    }
    this.setData({ lastTapTime: now });
  },

  // 打开设置总量弹框
  openModal() {
    try { vibrateForAction && vibrateForAction('click'); } catch (_) {}
    const initValue = String(this.data.medicineTotal || '').trim();
    this.setData({
      showModal: true,
      modalInputFocus: true,
      modalTotalInput: initValue,
    });
  },

  // 关闭弹框
  closeModal() {
    this.setData({
      showModal: false,
      modalInputFocus: false,
    });
  },

  // 阻止弹框容器点击冒泡关闭
  preventClose() {
    // no-op
    return null;
  },

  // 输入框变更
  onModalTotalInput(e) {
    const raw = e && e.detail ? e.detail.value : '';
    const onlyDigits = String(raw).replace(/[^\d]/g, '');
    this.setData({ modalTotalInput: onlyDigits });
  },

  // 根据总量与剩余量计算颜色级别
  computeRemainingColorClass(total, remaining) {
    const t = Number(total) || 0;
    const r = Number(remaining) || 0;
    if (t <= 0) return 'normal';
    const dangerThreshold = Math.max(1, Math.floor(t * 0.1));
    const warnThreshold = Math.max(3, Math.floor(t * 0.25));
    if (r <= dangerThreshold) return 'danger';
    if (r <= warnThreshold) return 'warning';
    return 'normal';
  },

  // 确认更新总量
  async confirmTotalChange() {
    const v = String(this.data.modalTotalInput || '').trim();
    const nextTotal = Number(v);
    if (!Number.isFinite(nextTotal) || nextTotal <= 0) {
      wx.showToast({ title: '请输入有效的总量', icon: 'none' });
      return;
    }

    try {
      // 保存到云端
      if (!wx.cloud || !wx.cloud._inited) {
        wx.cloud.init({
          env: "cloud1-3grp4xen3b5be11c",
          traceUser: true,
        });
      }

      const userId = this.getUserId();
      const res = await wx.cloud.callFunction({
        name: "medicineInventory",
        data: {
          action: "update",
          userId: userId,
          medicineTotal: nextTotal,
          medicineRemaining: nextTotal, // 设置新总量时，剩余量应该等于总量
        },
      });

      if (!(res.result && res.result.success)) {
        throw new Error(res.result && res.result.error || "保存失败");
      }

      // 使用云函数返回的最新数据更新页面
      if (res.result.data) {
        const updatedData = res.result.data;
        const updatedTotal = updatedData.medicineTotal || nextTotal;
        const updatedRemaining = updatedData.medicineRemaining || this.data.medicineRemaining;
        const nextColor = this.computeRemainingColorClass(updatedTotal, updatedRemaining);
        
        console.log('confirmTotalChange 更新数据:', { updatedTotal, updatedRemaining, nextColor });
        
        this.setData({
          medicineTotal: updatedTotal,
          medicineRemaining: updatedRemaining,
          medicineColorClass: nextColor,
          showModal: false,
          modalInputFocus: false,
          modalTotalInput: '',
        });

        // 同时保存到本地作为备份
        try { 
          wx.setStorageSync('medicine_total', updatedTotal); 
          wx.setStorageSync('medicine_remaining', updatedRemaining);
        } catch (_) {}
      } else {
        console.error('云函数返回数据为空');
        // 如果云函数没有返回数据，使用本地数据更新
        const nextColor = this.computeRemainingColorClass(nextTotal, this.data.medicineRemaining);
        this.setData({
          medicineTotal: nextTotal,
          medicineColorClass: nextColor,
          showModal: false,
          modalInputFocus: false,
          modalTotalInput: '',
        });
      }

      wx.showToast({ title: '总量设置成功', icon: 'success' });
    } catch (err) {
      console.error("保存药物总量失败:", err);
      wx.showToast({ title: '保存失败，请重试', icon: 'none' });
    }
  },

  onLoad(options) {
    const todayDate = getToday(); // 使用 YYYY-MM-DD
    this.setData({
      todayDate, // 初始化 todayDate
      selectedDate: todayDate, // 设置默认选中日期
    });

    this.fetchMedicineData(); // 确保页面加载时调用 fetchMedicineData
  },
});

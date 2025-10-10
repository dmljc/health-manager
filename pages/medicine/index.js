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
    medicineRemaining: 4,
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
      console.log("云函数返回的数据:", list);

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
    console.log("handleMedicineStatusToggle method triggered");

    // 触发轻震动反馈（点击操作）
    try {
      vibrateForAction && vibrateForAction('click');
    } catch (_) {}

    // 防重复点击：正在切换时直接返回
    if (this.data.isToggling) {
      return;
    }

    const newStatus = this.data.hasTakenToday ? 0 : 1; // 直接基于本地状态切换 0/1

    this.setData({ isToggling: true }); // 显示加载状态

      this.updateMedicineData(newStatus)
        .then(() => {
          this.setData({
          hasTakenToday: newStatus === 1, // 更新本地状态
          isToggling: false, // 关闭加载状态
          });
          console.log("药物状态更新成功");
        })
      .catch((err) => {
        this.setData({ isToggling: false }); // 关闭加载状态
        wx.showToast({
          title: "状态更新失败",
          icon: "none",
        });
        console.error("药物状态更新失败:", err);
      });
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

      // 更新成功后拉取最新列表以刷新本地缓存与 UI
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
      console.error("云函数调用失败:", err);
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
    // const { year, month } = e.detail || {}; console.log('monthchange', year, month);
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
  confirmTotalChange() {
    const v = String(this.data.modalTotalInput || '').trim();
    const nextTotal = Number(v);
    if (!Number.isFinite(nextTotal) || nextTotal <= 0) {
      wx.showToast({ title: '请输入有效的总量', icon: 'none' });
      return;
    }

    // 更新总量并刷新颜色标识
    const nextColor = this.computeRemainingColorClass(nextTotal, this.data.medicineRemaining);
    this.setData({
      medicineTotal: nextTotal,
      medicineColorClass: nextColor,
      showModal: false,
      modalInputFocus: false,
      modalTotalInput: '',
    });

    // 可选：持久化到本地，后续可接入云函数
    try { wx.setStorageSync('medicine_total', nextTotal); } catch (_) {}
  },

  onLoad(options) {
    const todayDate = getToday(); // 使用 YYYY-MM-DD
    console.log("初始化 todayDate:", todayDate); // 打印 todayDate
    this.setData({
      todayDate, // 初始化 todayDate
      selectedDate: todayDate, // 设置默认选中日期
    });

    this.fetchMedicineData(); // 确保页面加载时调用 fetchMedicineData
  },
});

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

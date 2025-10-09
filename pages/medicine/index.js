// 云函数入口文件
const { vibrateForAction } = require("../../utils/vibrate");
const { formatCurrentDate, getToday } = require("../../utils/date");

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
      const todayRecord = list.find(record => record.date === this.data.todayDate);

      if (todayRecord) {
        this.setData({
          queryId: todayRecord._id || todayRecord.id || "",
          hasTakenToday: !!todayRecord.taken,
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

      this.setData({ medicineList: list });
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
        this.setData({
          queryId: todayRecord._id || todayRecord.id || "",
          hasTakenToday: !!todayRecord.taken,
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

    const todayRecord = await this.fetchTodayRecord();
    if (!todayRecord) {
      console.error("无法获取当天记录，操作终止");
      return;
    }

    const currentDayId = todayRecord._id || todayRecord.id || "";
    const newStatus = todayRecord.taken ? 0 : 1; // 使用 taken 布尔切换

    this.setData({ isToggling: true }); // 显示加载状态

    this.updateMedicineData(currentDayId, newStatus)
      .then(() => {
        this.setData({
          hasTakenToday: newStatus === 1, // 更新本地状态
          isToggling: false, // 关闭加载状态
        });
        wx.showToast({
          title: "状态更新成功",
          icon: "success",
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

  async updateMedicineData(currentDayId, medicineStatus) {
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
        },
      });

      if (!(res.result && res.result.ok)) {
        console.error("更新药物状态失败:", res.result && res.result.error);
        throw new Error(res.result && res.result.error || "update failed");
      }

      const record = res.result.record;
      this.setData({
        hasTakenToday: !!(record && record.taken),
        medicineRecord: record || null,
      });
    } catch (err) {
      console.error("云函数调用失败:", err);
      throw err;
    }
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

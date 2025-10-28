// 云函数入口文件
// 震动反馈已移除：不再导入 vibrateLight/vibrateForAction
const { formatCurrentDate, getToday, getCurrentTimeHHmm } = require("../../utils/date");
const { isAuthed, authorizeAndSave } = require("../../utils/auth");

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

  // 移除用户 ID 获取逻辑；云函数使用 OPENID 识别用户

  async fetchMedicineData() {
    try {
      if (!wx.cloud || !wx.cloud._inited) {
        wx.cloud.init({
          env: wx.cloud.DYNAMIC_CURRENT_ENV,
          traceUser: true,
        });
      }

      const res = await wx.cloud.callFunction({
        name: "medicineList",
        data: {},
      });

      const list = res.result && res.result.list ? res.result.list : [];
      const inventory = res.result && res.result.inventory ? res.result.inventory : null;
      const todayRecord = list.find((record) => record.date === this.data.todayDate);

      if (todayRecord) {
        const takenByStatus = typeof todayRecord.status !== "undefined" ? Number(todayRecord.status) === 1 : !!todayRecord.taken;
        const fixedTotal = 28;
        const invRemaining = inventory && typeof inventory.medicineRemaining !== 'undefined' ? Number(inventory.medicineRemaining) : this.data.medicineRemaining;
        const nextColor = this.computeRemainingColorClass(fixedTotal, invRemaining);
        this.setData({
          queryId: todayRecord._id || todayRecord.id || "",
          hasTakenToday: takenByStatus,
          medicineRecord: todayRecord,
          medicineTotal: fixedTotal,
          medicineRemaining: invRemaining,
          medicineColorClass: nextColor,
        });
      } else {
        // 当天无记录：静默处理并更新 UI，不再输出控制台告警
        const fixedTotal = 28;
        const invRemaining = inventory && typeof inventory.medicineRemaining !== 'undefined' ? Number(inventory.medicineRemaining) : this.data.medicineRemaining;
        const nextColor = this.computeRemainingColorClass(fixedTotal, invRemaining);
        this.setData({
          queryId: "",
          hasTakenToday: false,
          medicineRecord: null,
          medicineTotal: fixedTotal,
          medicineRemaining: invRemaining,
          medicineColorClass: nextColor,
        });
      }

      // 将云端列表缓存到本地供日期组件显示点位，并刷新网格
      try {
        wx.setStorageSync("med_records", list);
      } catch (e) {
        // 写入本地缓存失败不阻塞流程，减少控制台噪音
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
      return null;
    } catch (err) {
      wx.showToast({ title: "云函数调用失败", icon: "none" });
      console.error("云函数调用失败:", err);
      return null;
    }
  },

  async handleMedicineStatusToggle() {
    // 用户点击圆形按钮，开始切换状态

    // 若未授权，首动作就地授权，避免先振动打断事件链
    let authed = false;
    try { authed = isAuthed(); } catch (_) { authed = false; }
    if (!authed) {
      if (this._authInFlight) return;
      this._authInFlight = true;
      const { ok } = await this.ensureAuthorized();
      this._authInFlight = false;
      if (!ok) return;
    }

    // 震动反馈已移除

    // 防重复点击：正在切换时直接返回
    if (this.data.isToggling) {
      return;
    }

    const newStatus = this.data.hasTakenToday ? 0 : 1; // 直接基于本地状态切换 0/1

    this.setData({ isToggling: true }); // 显示加载状态
    this.updateMedicineData(newStatus)
      .then(() => {
        this.setData({
          hasTakenToday: newStatus === 1,
          isToggling: false,
        });
        // 药物状态更新成功
      })
      .catch((err) => {
        this.setData({ isToggling: false });
        wx.showToast({ title: "状态更新失败", icon: "none" });
        console.error("药物状态更新失败:", err);
      });
  },

  // 就地授权：允许用户快速重复操作，仅保留并发守卫（通用工具实现）
  async ensureAuthorized() {
    if (this._ensureAuthBusy) return { ok: false };
    this._ensureAuthBusy = true;
    try {
      const res = await authorizeAndSave({ desc: '用于同步头像昵称并保存到云端' });
      return res;
    } finally {
      this._ensureAuthBusy = false;
    }
  },

  // 底部 Tab 点击切换到“服药”时触发震动反馈
  onTabItemTap(item) {
    // 震动反馈已移除
  },

  async updateMedicineData(medicineStatus) {
    try {
      if (!wx.cloud || !wx.cloud._inited) {
        wx.cloud.init({
          env: wx.cloud.DYNAMIC_CURRENT_ENV,
          traceUser: true,
        });
      }

      // 计算新的药物余量（点击服药则-1，撤销则+1），并限制范围
      const currentRemaining = Number(this.data.medicineRemaining || 0);
      const total = Number(this.data.medicineTotal || 0);
      let nextRemaining = currentRemaining;
      if (medicineStatus === 1 && !this.data.hasTakenToday) {
        nextRemaining = Math.max(0, currentRemaining - 1);
      } else if (medicineStatus === 0 && this.data.hasTakenToday) {
        nextRemaining = Math.min(total > 0 ? total : Number.MAX_SAFE_INTEGER, currentRemaining + 1);
      }
      const nextColor = this.computeRemainingColorClass(total, nextRemaining);

      // 不再在点击后立即更新余量；改为在列表刷新后更新 UI

      const res = await wx.cloud.callFunction({
        name: "medicineStatus",
        data: {
          status: medicineStatus,
          date: this.data.todayDate,
          time: getCurrentTimeHHmm(),
          medicineRemaining: nextRemaining,
        },
      });

      if (!(res.result && res.result.ok)) {
        console.error("更新药物状态失败:", res.result && res.result.error);
        throw new Error(res.result && res.result.error || "update failed");
      }

      // 库存同步由 medicineStatus 内部处理，无需单独调用 medicineInventory

      // 更新成功后拉取最新列表以刷新本地缓存与 UI
      const resList = await wx.cloud.callFunction({
        name: "medicineList",
        data: {},
      });

      const list = resList.result && resList.result.list ? resList.result.list : [];
      const inventory = resList.result && resList.result.inventory ? resList.result.inventory : null;
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

      const fixedTotal = 28;
      const invRemaining = (inventory && typeof inventory.medicineRemaining !== 'undefined')
        ? Number(inventory.medicineRemaining)
        : Number(this.data.medicineRemaining || 0);
      const invColor = this.computeRemainingColorClass(fixedTotal, invRemaining);
      this.setData({
        hasTakenToday: takenByStatus,
        medicineRecord: todayRecord || null,
        medicineList: list,
        datePickerRefreshKey: this.data.datePickerRefreshKey + 1,
        medicineTotal: fixedTotal,
        medicineRemaining: invRemaining,
        medicineColorClass: invColor,
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
    // 震动反馈已移除
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
    const inputNumber = Number(v);
    if (!Number.isFinite(inputNumber) || inputNumber <= 0) {
      wx.showToast({ title: '请输入有效的数量', icon: 'none' });
      return;
    }

    // 固定总量为 28，弹框设置值用作余量
    const fixedTotal = 28;
    const nextRemaining = inputNumber;
    // 先关闭弹框，不立即更新 UI 的余量；等待列表刷新后统一更新
    this.setData({
      showModal: false,
      modalInputFocus: false,
      modalTotalInput: '',
    });

    // 持久化到本地（保持与现有逻辑一致）
    try { wx.setStorageSync('medicine_total', fixedTotal); } catch (_) {}

    // 调用云函数保存到库存
    try {
      if (!wx.cloud || !wx.cloud._inited) {
        wx.cloud.init({
          env: wx.cloud.DYNAMIC_CURRENT_ENV,
          traceUser: true,
        });
      }

      const res = await wx.cloud.callFunction({
        name: "medicineStatus",
        data: {
          action: 'inventoryUpdate',
          medicineRemaining: nextRemaining,
        }
      });

      if (res.result && res.result.ok) {
        console.log("库存已保存: total=28, remaining=", nextRemaining);
      } else {
        console.error("库存保存失败:", res.result && res.result.error);
        wx.showToast({ title: '保存失败', icon: 'none' });
      }
    } catch (err) {
      console.error("调用库存云函数失败:", err);
      wx.showToast({ title: '网络错误', icon: 'none' });
    }

    // 保存后刷新列表并合并库存
    try {
      const resList = await wx.cloud.callFunction({
        name: "medicineList",
        data: {},
      });
      const list = resList.result && resList.result.list ? resList.result.list : [];
      const inventory = resList.result && resList.result.inventory ? resList.result.inventory : null;
      try { wx.setStorageSync('med_records', list); } catch (_) {}
      const invRemaining = (inventory && typeof inventory.medicineRemaining !== 'undefined')
        ? Number(inventory.medicineRemaining)
        : Number(this.data.medicineRemaining || 0);
      const invColor = this.computeRemainingColorClass(28, invRemaining);
      this.setData({
        medicineList: list,
        datePickerRefreshKey: this.data.datePickerRefreshKey + 1,
        medicineTotal: 28,
        medicineRemaining: invRemaining,
        medicineColorClass: invColor,
      });
      } catch (e) {
        // 刷新列表失败（不影响库存保存）
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

  onShow() {
    // 移除 pending_action 续操作逻辑（当前未设置该键，避免冗余流程）
  },
});

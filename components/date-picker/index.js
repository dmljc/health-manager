/**
 * 日期选择组件（内联日历）
 *
 * 属性:
 * - value: 初始选中日期，格式 YYYY-MM-DD
 * - startOnMonday: 是否周一为一周起始
 * - refreshKey: 外部触发刷新用的计数器
 *
 * 事件:
 * - change: 选中日期变化 { value: string }
 * - monthchange: 月份变化 { year: number, month: number }
 */
Component({
    properties: {
        value: { type: String, value: "" },
        startOnMonday: { type: Boolean, value: false },
        refreshKey: {
            type: Number,
            value: 0,
            observer() {
                this._rebuildCurrentGrid();
            },
        },
    },
    data: {
        selectedDate: "",
        calendar: { year: 0, month: 0, grid: [] },
    },
    lifetimes: {
        /**
         * 组件挂载时初始化网格
         */
        attached() {
            const init = this.data.value ? new Date(this.data.value) : new Date();
            const year = init.getFullYear();
            const month = init.getMonth() + 1;
            const selectedDate = this._formatYMD(init);
            const grid = this._buildMonthGrid(year, month, selectedDate);
            this.setData({ selectedDate, calendar: { year, month, grid } });
        },
    },
    methods: {
        /**
         * 依据当前年月重建日历网格
         * @private
         */
        _rebuildCurrentGrid() {
            const { year, month } = this.data.calendar;
            if (!year || !month) return;
            const grid = this._buildMonthGrid(year, month, this.data.selectedDate);
            this.setData({ calendar: { year, month, grid } });
        },
        /** 切换至上一个月 */
        onPrevMonth() {
            const { year, month } = this.data.calendar;
            let y = year,
                m = month - 1;
            if (m < 1) {
                m = 12;
                y -= 1;
            }
            const grid = this._buildMonthGrid(y, m, this.data.selectedDate);
            this.setData({ calendar: { year: y, month: m, grid } });
            this.triggerEvent("monthchange", { year: y, month: m });
        },
        /** 切换至下一个月 */
        onNextMonth() {
            const { year, month } = this.data.calendar;
            let y = year,
                m = month + 1;
            if (m > 12) {
                m = 1;
                y += 1;
            }
            const grid = this._buildMonthGrid(y, m, this.data.selectedDate);
            this.setData({ calendar: { year: y, month: m, grid } });
            this.triggerEvent("monthchange", { year: y, month: m });
        },
        /**
         * 选择日期
         * @param {{ currentTarget: { dataset: { date: string } } }} e
         */
        onSelectDate(e) {
            const date = e.currentTarget.dataset.date;
            if (!date) return;
            const { year, month } = this.data.calendar;
            const grid = this._buildMonthGrid(year, month, date);
            this.setData({ selectedDate: date, calendar: { year, month, grid } });
            this.triggerEvent("change", { value: date });
        },
        /**
         * 格式化日期为 YYYY-MM-DD
         * @param {Date} d
         * @returns {string}
         * @private
         */
        _formatYMD(d) {
            const y = d.getFullYear();
            const m = `${d.getMonth() + 1}`.padStart(2, "0");
            const day = `${d.getDate()}`.padStart(2, "0");
            return `${y}-${m}-${day}`;
        },
        /**
         * 获取今天的 YYYY-MM-DD 字符串
         * @returns {string}
         * @private
         */
        _getTodayKey() {
            const d = new Date();
            const y = d.getFullYear();
            const m = `${d.getMonth() + 1}`.padStart(2, "0");
            const day = `${d.getDate()}`.padStart(2, "0");
            return `${y}-${m}-${day}`;
        },
        /**
         * 构建当月服药标记映射（date => 'success' | 'fail'）
         * @param {number} year
         * @param {number} month
         * @returns {Record<string, 'success'|'fail'>}
         * @private
         */
        _getMedDotMap(year, month) {
            const medRecords = wx.getStorageSync("med_records") || [];
            const monthKey = `${year}-${String(month).padStart(2, "0")}`;
            const map = {};
            for (const r of medRecords) {
                if (typeof r.date === "string" && r.date.startsWith(monthKey)) {
                    const taken =
                        typeof r.status !== "undefined"
                            ? Number(r.status) === 1
                            : !!r.taken;
                    map[r.date] = taken ? "success" : "fail";
                }
            }
            return map;
        },
        /**
         * 构建月份网格（仅显示当月，前后补位为占位）
         * @param {number} year
         * @param {number} month
         * @param {string} selectedDate YYYY-MM-DD
         * @returns {Array<Array<{day:number|string,date:string,inMonth:boolean,isToday:boolean,isSelected:boolean,medDot?:'success'|'fail'}>>}
         * @private
         */
        _buildMonthGrid(year, month, selectedDate) {
            const firstDay = new Date(year, month - 1, 1);
            let startWeekday = firstDay.getDay();
            if (this.data.startOnMonday) startWeekday = (startWeekday + 6) % 7;
            const daysInMonth = new Date(year, month, 0).getDate();
            const todayStr = this._getTodayKey();
            const medDotMap = this._getMedDotMap(year, month);
            const cells = [];
            for (let i = startWeekday - 1; i >= 0; i -= 1) {
                cells.push({
                    day: "",
                    date: "",
                    inMonth: false,
                    isToday: false,
                    isSelected: false,
                });
            }
            for (let d = 1; d <= daysInMonth; d += 1) {
                const date = `${year}-${String(month).padStart(2, "0")}-${String(
                    d
                ).padStart(2, "0")}`;
                cells.push({
                    day: d,
                    date,
                    inMonth: true,
                    isToday: date === todayStr,
                    isSelected: date === selectedDate,
                    medDot: medDotMap[date] || "",
                });
            }
            while (cells.length % 7 !== 0) {
                cells.push({
                    day: "",
                    date: "",
                    inMonth: false,
                    isToday: false,
                    isSelected: false,
                });
            }
            const rows = [];
            for (let i = 0; i < cells.length; i += 7)
                rows.push(cells.slice(i, i + 7));
            return rows;
        },
    },
});

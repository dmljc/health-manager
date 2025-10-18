Page({
    data: {
        // 检查类型对象数组：label 为展示文本，value 为唯一代码
        checkTypes: [
            { label: "乙肝表面抗原（HBeAg）", value: "hbeag" },
            { label: "乙型肝炎e抗体（HBeAb）", value: "hbeab" },
            { label: "HBV-DNA定量", value: "dna" },
            { label: "谷丙转氨酶（ALT）", value: "alt" },
            { label: "尿酸（UA）", value: "ua" },
            { label: "甘油三酯（TG）", value: "tg" },
        ],
        index: 0,
        date: '',
        // 新增：数值输入与类型控制
        value: '',
        inputType: 'text', // 统一使用文本键盘，便于输入任意格式
        valueError: ''
    },

    // 获取当前日期
    getCurrentDateTime() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return {
            date: `${year}-${month}-${day}`
        };
    },

    // 根据选择的检查类型，更新输入框类型与占位提示
    updateInputControl() {
        const current = this.data.checkTypes[this.data.index] || {};
        const isDNA = current.value === 'dna' || /DNA/i.test(String(current.label || ''));
        this.setData({
            inputType: 'text',
            placeholder: '请输入检查数值或表达式（如 <=1.2e6）'
        });
        // 不在类型切换时触发校验
    },

    bindPickerChange(e) {
        const idx = e && e.detail ? Number(e.detail.value) : 0;
        this.setData({ index: idx });
        // 更新输入控制
        this.updateInputControl();
        // 清空检测数值与错误文案
        this.setData({ value: '', valueError: '' });
    },

    // 数值输入
    onValueInput(e) {
        const val = e && e.detail ? e.detail.value : '';
        this.setData({ value: val });
        this.validateCurrentValue();
    },

    // 不再在失焦时触发数值必填校验

    validateCurrentValue() {
        const { checkTypes, index, value } = this.data;
        const current = checkTypes[index] || {};
        const isDNA = current.value === 'dna';
        const trimmed = String(value).trim();

        if (!trimmed) {
            this.setData({ valueError: '请输入检测数值' });
            return false;
        }

        if (isDNA) {
            const ok = this.isValidScientific(trimmed);
            this.setData({ valueError: ok ? '' : '请输入科学计数法数值（如 1.2e6）' });
            return ok;
        } else {
            // 非 DNA 类型仅校验非空，允许任意文本与数值格式
            this.setData({ valueError: '' });
            return true;
        }
    },

    bindDateChange(e) {
        const d = e && e.detail ? e.detail.value : this.data.date;
        if (this.isValidDate(d)) {
            this.setData({ date: d });
        } else {
            wx.showToast({
                title: '日期格式错误',
                icon: 'none'
            });
        }
    },

    isValidDate(dateString) {
        if (!dateString) return false;
        const regex = /^\d{4}-\d{2}-\d{2}$/;
        if (!regex.test(dateString)) return false;
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date.getTime());
    },

    isValidNumber(val) {
        if (val === '' || val === null || val === undefined) return false;
        return /^-?\d+(\.\d+)?$/.test(String(val));
    },

    isValidScientific(val) {
        if (!val) return false;
        return /^-?\d+(\.\d+)?[eE][-+]?\d+$/.test(String(val));
    },

    async onSave() {
        const { checkTypes, index, date, value } = this.data;

        // 其它字段的完整性校验（保留原有 toast 提示）
        const current = checkTypes[index];
        if (!current) {
            wx.showToast({ title: '请选择检查类型', icon: 'none' });
            return;
        }
        if (!date) {
            wx.showToast({ title: '请选择检测日期', icon: 'none' });
            return;
        }

        // 触发必填与格式校验：仅在输入框下方显示红色文案，不使用 toast
        const ok = this.validateCurrentValue();
        if (!ok) return;

        const trimmed = String(value).trim();
        const finalValue = String(trimmed);

        // 构建保存数据（兼容现有后端：type 用 label；额外附加 typeCode）
        const recordData = {
            type: current.value,        // 传代码值给后端，便于统一处理
            typeLabel: current.label,   // 保留标签便于展示或兼容
            value: finalValue,
            date: date,
            timestamp: new Date(date).getTime(),
            valueType: 'string',
            createTime: new Date().toISOString()
        };

        // 调用云函数保存记录
        try {
            if (!wx.cloud || !wx.cloud._inited) {
                wx.cloud.init({
                    env: wx.cloud.DYNAMIC_CURRENT_ENV,
                    traceUser: true,
                });
            }

            const res = await wx.cloud.callFunction({
                name: 'examination',
                data: recordData,
            });

            if (res && res.result && res.result.success) {
                wx.showToast({ title: '保存成功', icon: 'success', duration: 2000 });
                // setTimeout(() => { wx.navigateBack({ delta: 1 }); }, 2000);
            } else {
                const errMsg = (res && res.result && res.result.error) ? res.result.error : '保存失败';
                wx.showToast({ title: errMsg, icon: 'none' });
            }
        } catch (error) {
            console.error('Save failed:', error);
            wx.showToast({ title: '保存失败', icon: 'none' });
        }
    },

    // 页面加载时初始化
    onLoad() {
        // 设置当前日期为默认值
        const currentDateTime = this.getCurrentDateTime();
        this.setData({
            date: currentDateTime.date
        });

        // 初始化输入控制
        this.updateInputControl();
    }
});
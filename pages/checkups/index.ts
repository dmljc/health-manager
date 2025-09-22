interface CheckupRecord {
  id: string;
  date: string; // YYYY-MM-DD
  alt: number;
  ast: number;
}

Page({
  data: {
    date: '',
    alt: '',
    ast: '',
    list: [] as CheckupRecord[]
  },
  onShow() {
    const list: CheckupRecord[] = wx.getStorageSync('checkup_records') || [];
    this.setData({ list });
  },
  onDate(e: WechatMiniprogram.PickerChange) {
    this.setData({ date: e.detail.value });
  },
  onAlt(e: WechatMiniprogram.Input) {
    this.setData({ alt: e.detail.value });
  },
  onAst(e: WechatMiniprogram.Input) {
    this.setData({ ast: e.detail.value });
  },
  save() {
    const { date, alt, ast } = this.data as any;
    if (!date || alt === '' || ast === '') {
      wx.showToast({ title: '请填写完整', icon: 'none' });
      return;
    }
    const rec: CheckupRecord = {
      id: `${Date.now()}`,
      date,
      alt: Number(alt),
      ast: Number(ast)
    };
    const list: CheckupRecord[] = wx.getStorageSync('checkup_records') || [];
    list.unshift(rec);
    wx.setStorageSync('checkup_records', list);
    wx.setStorageSync('last_checkup_date', date);
    this.setData({ date: '', alt: '', ast: '' });
    wx.showToast({ title: '已保存' });
    this.onShow();
  }
});


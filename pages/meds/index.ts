interface MedRecord {
  id: string;
  name: string;
  time: string; // HH:mm
  date: string; // YYYY-MM-DD
}

function getToday(): string {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

Page({
  data: {
    name: '',
    time: '',
    list: [] as MedRecord[]
  },
  onShow() {
    const today = getToday();
    const all: MedRecord[] = wx.getStorageSync('med_records') || [];
    const list = all.filter(i => i.date === today);
    this.setData({ list });
  },
  onName(e: WechatMiniprogram.Input) {
    this.setData({ name: e.detail.value });
  },
  onTime(e: WechatMiniprogram.PickerChange) {
    this.setData({ time: e.detail.value });
  },
  addMed() {
    const { name, time } = this.data as any;
    if (!name || !time) {
      wx.showToast({ title: '请填写完整', icon: 'none' });
      return;
    }
    const rec: MedRecord = {
      id: `${Date.now()}`,
      name,
      time,
      date: getToday()
    };
    const all: MedRecord[] = wx.getStorageSync('med_records') || [];
    all.unshift(rec);
    wx.setStorageSync('med_records', all);
    this.setData({ name: '', time: '' });
    wx.showToast({ title: '已保存' });
    this.onShow();
  }
});


/**
 * 获取服药记录
 */
function getMedicineRecords() {
    return wx.getStorageSync('med_records') || [];
}

/**
 * 获取体检记录
 */
function getCheckupRecords() {
    return wx.getStorageSync('checkup_records') || [];
}

/**
 * 获取费用记录
 */
function getExpenseRecords() {
    return wx.getStorageSync('expense_records') || [];
}

/**
 * 获取当前药物信息
 */
function getCurrentMedicine() {
    return wx.getStorageSync('current_medicine') || {};
}

/**
 * 获取应用设置
 */
function getAppSettings() {
    return wx.getStorageSync('app_settings') || {};
}

/**
 * 获取今日服药状态
 * @param {string} today 今日日期
 */
function getTodayMedicineStatus(today) {
    const medRecords = getMedicineRecords();
    const todayMedRecord = medRecords.find((record) => record.date === today);
    return todayMedRecord?.taken || false;
}

/**
 * 获取最近30天的服药依从性
 */
function getMedicineAdherence() {
    const medRecords = getMedicineRecords();
    const last30DaysRecords = medRecords.filter((record) => {
        const recordDate = new Date(record.date);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return recordDate >= thirtyDaysAgo;
    });

    return last30DaysRecords.length > 0 ?
        Math.round((last30DaysRecords.filter((r) => r.taken).length / last30DaysRecords.length) * 100) :
        0;
}

/**
 * 获取体检状态
 */
function getCheckupStatus() {
    const checkupRecords = getCheckupRecords();
    let status = 'warning';
    let statusText = '待检查';

    if (checkupRecords.length > 0) {
        const lastCheckupDate = checkupRecords.sort((a, b) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
        )[0].date;

        const daysSinceLastCheckup = Math.floor(
            (new Date().getTime() - new Date(lastCheckupDate).getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceLastCheckup <= 180) { // 6个月内
            status = 'success';
            statusText = '正常';
        } else if (daysSinceLastCheckup <= 210) { // 7个月内
            status = 'warning';
            statusText = '即将到期';
        } else {
            status = 'danger';
            statusText = '已过期';
        }
    }

    return { status, statusText };
}

module.exports = {
    getMedicineRecords,
    getCheckupRecords,
    getExpenseRecords,
    getCurrentMedicine,
    getAppSettings,
    getTodayMedicineStatus,
    getMedicineAdherence,
    getCheckupStatus,
};


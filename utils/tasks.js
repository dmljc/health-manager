/**
 * 任务管理工具函数
 */

const { getToday } = require('./date');
const { getMedicineRecords, getCheckupRecords, getCurrentMedicine } = require('./storage');

/**
 * 生成今日任务列表
 */
function generateTodayTasks() {
    const today = getToday();
    const tasks = [];

    // 检查服药任务
    const medRecords = getMedicineRecords();
    const todayMedRecord = medRecords.find((record) => record.date === today);
    const hasMedicineToday = todayMedRecord?.taken || false;

    if (!hasMedicineToday) {
        const currentMedicine = getCurrentMedicine();
        const reminderTime = currentMedicine.reminderTime || '09:00';

        tasks.push({
            id: 'medicine_today',
            title: '服药提醒',
            description: `请在${reminderTime}按时服药`,
            icon: '💊',
            status: 'pending',
            statusText: '待完成',
            action: 'goMedicine'
        });
    }

    // 检查体检任务
    const checkupRecords = getCheckupRecords();
    if (checkupRecords.length > 0) {
        const lastCheckupDate = checkupRecords.sort((a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        )[0].date;

        const daysSinceLastCheckup = Math.floor(
            (new Date().getTime() - new Date(lastCheckupDate).getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceLastCheckup >= 180) { // 6个月以上
            tasks.push({
                id: 'checkup_reminder',
                title: '体检提醒',
                description: '距离上次体检已超过6个月，建议复查',
                icon: '🩺',
                status: 'pending',
                statusText: '待预约',
                action: 'goCheckups'
            });
        }
    } else {
        tasks.push({
            id: 'first_checkup',
            title: '首次体检',
            description: '建议进行首次健康体检',
            icon: '🩺',
            status: 'pending',
            statusText: '待完成',
            action: 'goCheckups'
        });
    }

    // 检查药物余量
    const currentMedicine = getCurrentMedicine();
    if (currentMedicine.remainingCount <= 5 && currentMedicine.remainingCount > 0) {
        tasks.push({
            id: 'medicine_low',
            title: '药物余量不足',
            description: `当前药物剩余${currentMedicine.remainingCount}颗`,
            icon: '⚠️',
            status: 'pending',
            statusText: '需购买',
            action: 'goMeds'
        });
    }

    return tasks;
}

/**
 * 生成健康提醒列表
 * @param {string} medicineStatus 服药状态
 * @param {string} checkupStatus 体检状态
 * @param {number} healthScore 健康评分
 */
function generateHealthReminders(medicineStatus, checkupStatus, healthScore) {
    const reminders = [];

    if (medicineStatus === 'danger') {
        reminders.push({
            id: 'medicine_reminder',
            title: '服药提醒',
            description: '今日还未服药，请及时服用',
            icon: '💊',
            priority: 'high',
            action: 'goMeds'
        });
    }

    if (checkupStatus === 'danger') {
        reminders.push({
            id: 'checkup_overdue',
            title: '体检逾期',
            description: '距离上次体检已超过7个月，请尽快预约体检',
            icon: '🩺',
            priority: 'high',
            action: 'goCheckups'
        });
    } else if (checkupStatus === 'warning') {
        reminders.push({
            id: 'checkup_due',
            title: '体检提醒',
            description: '即将到达体检时间，建议提前预约',
            icon: '🩺',
            priority: 'medium',
            action: 'goCheckups'
        });
    }

    if (healthScore < 70) {
        reminders.push({
            id: 'health_low',
            title: '健康评分偏低',
            description: '请注意按时服药和定期体检，保持健康生活习惯',
            icon: '💚',
            priority: 'medium',
            action: 'goStatistics'
        });
    }

    return reminders;
}

module.exports = {
    generateTodayTasks,
    generateHealthReminders,
};


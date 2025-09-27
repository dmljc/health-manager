/**
 * 记录管理工具函数
 */

const { formatDate } = require('./date');
const { getMedicineRecords, getCheckupRecords, getExpenseRecords } = require('./storage');

/**
 * 生成最近记录列表
 */
function generateRecentRecords() {
    const records = [];

    // 最近的服药记录
    const medRecords = getMedicineRecords();
    const recentMedRecords = medRecords
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 3);

    recentMedRecords.forEach((record) => {
        records.push({
            id: `med_${record.id}`,
            title: '服药记录',
            subtitle: record.taken ? `已服药 ${record.time}` : '未服药',
            icon: '💊',
            date: formatDate(record.date),
            type: 'medicine'
        });
    });

    // 最近的体检记录
    const checkupRecords = getCheckupRecords();
    const recentCheckupRecords = checkupRecords
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 2);

    recentCheckupRecords.forEach((record) => {
        records.push({
            id: `checkup_${record.id}`,
            title: '体检记录',
            subtitle: `费用: ¥${record.totalCost}`,
            icon: '🩺',
            date: formatDate(record.date),
            type: 'checkup'
        });
    });

    // 最近的费用记录
    const expenseRecords = getExpenseRecords();
    const recentExpenseRecords = expenseRecords
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 2);

    recentExpenseRecords.forEach((record) => {
        records.push({
            id: `expense_${record.id}`,
            title: record.typeName,
            subtitle: `¥${record.amount}`,
            icon: '💰',
            date: formatDate(record.date),
            type: 'expense'
        });
    });

    // 按日期排序并限制数量
    return records
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);
}

module.exports = {
    generateRecentRecords,
};


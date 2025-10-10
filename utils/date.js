/**
 * 日期工具函数
 */

/**
 * 获取问候语
 */
function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 6) return '深夜好';
    if (hour < 12) return '早上好';
    if (hour < 14) return '中午好';
    if (hour < 18) return '下午好';
    return '晚上好';
}

/**
 * 格式化当前日期
 */
function formatCurrentDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekday = weekdays[now.getDay()];

    return `${year}年${month}月${day}日 ${weekday}`;
}

/**
 * 获取今天的日期字符串
 */
function getToday() {
    const d = new Date();
    const m = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
}

/**
 * 格式化日期为月日格式
 */
function formatDate(dateStr) {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日`;
}

/**
 * 获取当前时间字符串（HH:mm）
 */
function getCurrentTimeHHmm() {
    const now = new Date();
    const hh = `${now.getHours()}`.padStart(2, '0');
    const mm = `${now.getMinutes()}`.padStart(2, '0');
    return `${hh}:${mm}`;
}

module.exports = {
    getGreeting,
    formatCurrentDate,
    getToday,
    formatDate,
    getCurrentTimeHHmm,
};

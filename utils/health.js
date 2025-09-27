/**
 * 计算健康评分
 * @param {number} medicineAdherence 服药依从性百分比
 * @param {boolean} hasRecentCheckup 是否有近期体检
 * @param {boolean} hasMedicineToday 今天是否服药
 */
function calculateHealthScore(medicineAdherence, hasRecentCheckup, hasMedicineToday) {
    let score = 60; // 基础分

    // 服药依从性占40%
    score += (medicineAdherence / 100) * 40;

    // 定期体检占20%
    if (hasRecentCheckup) {
        score += 20;
    }

    // 今日服药状态占10%
    if (hasMedicineToday) {
        score += 10;
    }

    return Math.min(Math.round(score), 100);
}

/**
 * 获取健康评分等级
 * @param {number} score 健康评分
 */
function getHealthScoreLevel(score) {
    if (score >= 90) return { level: '优秀', color: '#10B981' };
    if (score >= 80) return { level: '良好', color: '#3B82F6' };
    if (score >= 70) return { level: '一般', color: '#F59E0B' };
    return { level: '需改善', color: '#EF4444' };
}

module.exports = {
    calculateHealthScore,
    getHealthScoreLevel,
};

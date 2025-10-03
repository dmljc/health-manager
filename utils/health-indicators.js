/**
 * 健康指标数据管理模块
 * 支持各种检验指标的数据存储和折线图显示
 */

// 健康指标类型定义
const INDICATOR_TYPES = {
  // 肝功能指标
  LIVER_FUNCTION: {
    HBV_DNA: 'hbv_dna',           // 乙肝病毒DNA定量
    HBS_AG: 'hbs_ag',             // 乙肝表面抗原
    HBS_AB: 'hbs_ab',             // 乙肝表面抗体
    HBE_AG: 'hbe_ag',             // 乙肝e抗原
    HBE_AB: 'hbe_ab',             // 乙肝e抗体
    HBC_AB: 'hbc_ab',             // 乙肝核心抗体
    ALT: 'alt',                   // 丙氨酸氨基转移酶
    AST: 'ast',                   // 天门冬氨酸氨基转移酶
    AFP: 'afp'                    // 甲胎蛋白
  },
  
  // 甲状腺功能
  THYROID: {
    TSH: 'tsh',                   // 促甲状腺激素
    T3: 't3',                     // 三碘甲状腺原氨酸
    T4: 't4',                     // 甲状腺素
    FT3: 'ft3',                   // 游离三碘甲状腺原氨酸
    FT4: 'ft4'                    // 游离甲状腺素
  },
  
  // 血液常规
  BLOOD_ROUTINE: {
    WBC: 'wbc',                   // 白细胞计数
    RBC: 'rbc',                   // 红细胞计数
    HGB: 'hgb',                   // 血红蛋白
    PLT: 'plt',                   // 血小板计数
    HCT: 'hct'                    // 红细胞压积
  },
  
  // 生化指标
  BIOCHEMISTRY: {
    GLU: 'glucose',               // 血糖
    CHOL: 'cholesterol',          // 总胆固醇
    TG: 'triglycerides',          // 甘油三酯
    HDL: 'hdl',                   // 高密度脂蛋白
    LDL: 'ldl',                   // 低密度脂蛋白
    CREA: 'creatinine',           // 肌酐
    BUN: 'bun'                    // 尿素氮
  }
};

// 指标配置信息
const INDICATOR_CONFIG = {
  [INDICATOR_TYPES.LIVER_FUNCTION.HBV_DNA]: {
    name: '乙肝病毒DNA',
    unit: 'IU/mL',
    normalRange: { min: 0, max: 20 },
    chartColor: '#EF4444'
  },
  [INDICATOR_TYPES.LIVER_FUNCTION.ALT]: {
    name: 'ALT',
    unit: 'U/L',
    normalRange: { min: 7, max: 40 },
    chartColor: '#F59E0B'
  },
  [INDICATOR_TYPES.LIVER_FUNCTION.AST]: {
    name: 'AST',
    unit: 'U/L',
    normalRange: { min: 13, max: 35 },
    chartColor: '#10B981'
  },
  [INDICATOR_TYPES.LIVER_FUNCTION.AFP]: {
    name: 'AFP',
    unit: 'ng/mL',
    normalRange: { min: 0, max: 8.1 },
    chartColor: '#8B5CF6'
  },
  [INDICATOR_TYPES.THYROID.TSH]: {
    name: 'TSH',
    unit: 'mIU/L',
    normalRange: { min: 0.27, max: 4.2 },
    chartColor: '#3B82F6'
  },
  [INDICATOR_TYPES.THYROID.T3]: {
    name: 'T3',
    unit: 'nmol/L',
    normalRange: { min: 1.3, max: 3.1 },
    chartColor: '#06B6D4'
  },
  [INDICATOR_TYPES.THYROID.T4]: {
    name: 'T4',
    unit: 'nmol/L',
    normalRange: { min: 66, max: 181 },
    chartColor: '#84CC16'
  },
  [INDICATOR_TYPES.BLOOD_ROUTINE.WBC]: {
    name: '白细胞',
    unit: '×10⁹/L',
    normalRange: { min: 3.5, max: 9.5 },
    chartColor: '#F97316'
  },
  [INDICATOR_TYPES.BLOOD_ROUTINE.RBC]: {
    name: '红细胞',
    unit: '×10¹²/L',
    normalRange: { min: 4.3, max: 5.8 },
    chartColor: '#DC2626'
  },
  [INDICATOR_TYPES.BLOOD_ROUTINE.HGB]: {
    name: '血红蛋白',
    unit: 'g/L',
    normalRange: { min: 130, max: 175 },
    chartColor: '#BE185D'
  },
  [INDICATOR_TYPES.BIOCHEMISTRY.GLU]: {
    name: '血糖',
    unit: 'mmol/L',
    normalRange: { min: 3.9, max: 6.1 },
    chartColor: '#7C3AED'
  },
  [INDICATOR_TYPES.BIOCHEMISTRY.CHOL]: {
    name: '总胆固醇',
    unit: 'mmol/L',
    normalRange: { min: 0, max: 5.18 },
    chartColor: '#059669'
  }
};

/**
 * 生成示例健康指标数据
 * @param {string} indicatorType 指标类型
 * @param {number} days 天数
 */
function generateSampleIndicatorData(indicatorType, days = 30) {
  const config = INDICATOR_CONFIG[indicatorType];
  if (!config) return null;
  
  const data = [];
  const categories = [];
  const { min, max } = config.normalRange;
  const range = max - min;
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    categories.push(formatDate(date));
    
    // 生成在正常范围内波动的数据
    const baseValue = min + range * 0.5;
    const variation = range * 0.3 * (Math.random() - 0.5);
    const value = Math.max(min, Math.min(max, baseValue + variation));
    data.push(Number(value.toFixed(2)));
  }
  
  return {
    categories,
    series: [{
      name: config.name,
      data,
      color: config.chartColor
    }],
    config
  };
}

/**
 * 获取多个指标的组合数据
 * @param {Array} indicatorTypes 指标类型数组
 * @param {number} days 天数
 */
function getMultiIndicatorData(indicatorTypes, days = 30) {
  const categories = [];
  const series = [];
  
  // 生成日期分类
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    categories.push(formatDate(date));
  }
  
  // 为每个指标生成数据
  indicatorTypes.forEach(type => {
    const config = INDICATOR_CONFIG[type];
    if (!config) return;
    
    const data = [];
    const { min, max } = config.normalRange;
    const range = max - min;
    
    for (let i = 0; i < days; i++) {
      const baseValue = min + range * 0.5;
      const variation = range * 0.3 * (Math.random() - 0.5);
      const value = Math.max(min, Math.min(max, baseValue + variation));
      data.push(Number(value.toFixed(2)));
    }
    
    series.push({
      name: config.name,
      data,
      color: config.chartColor
    });
  });
  
  return { categories, series };
}

/**
 * 获取肝功能指标组合
 */
function getLiverFunctionData(days = 30) {
  return getMultiIndicatorData([
    INDICATOR_TYPES.LIVER_FUNCTION.ALT,
    INDICATOR_TYPES.LIVER_FUNCTION.AST,
    INDICATOR_TYPES.LIVER_FUNCTION.AFP
  ], days);
}

/**
 * 获取甲状腺功能指标组合
 */
function getThyroidFunctionData(days = 30) {
  return getMultiIndicatorData([
    INDICATOR_TYPES.THYROID.TSH,
    INDICATOR_TYPES.THYROID.T3,
    INDICATOR_TYPES.THYROID.T4
  ], days);
}

/**
 * 获取血常规指标组合
 */
function getBloodRoutineData(days = 30) {
  return getMultiIndicatorData([
    INDICATOR_TYPES.BLOOD_ROUTINE.WBC,
    INDICATOR_TYPES.BLOOD_ROUTINE.RBC,
    INDICATOR_TYPES.BLOOD_ROUTINE.HGB
  ], days);
}

/**
 * 格式化日期
 */
function formatDate(date) {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}/${day}`;
}

/**
 * 判断指标值是否正常
 */
function isIndicatorNormal(indicatorType, value) {
  const config = INDICATOR_CONFIG[indicatorType];
  if (!config) return true;
  
  const { min, max } = config.normalRange;
  return value >= min && value <= max;
}

/**
 * 获取指标状态
 */
function getIndicatorStatus(indicatorType, value) {
  const config = INDICATOR_CONFIG[indicatorType];
  if (!config) return { status: 'unknown', text: '未知' };
  
  const { min, max } = config.normalRange;
  
  if (value < min) {
    return { status: 'low', text: '偏低', color: '#3B82F6' };
  } else if (value > max) {
    return { status: 'high', text: '偏高', color: '#EF4444' };
  } else {
    return { status: 'normal', text: '正常', color: '#10B981' };
  }
}

module.exports = {
  INDICATOR_TYPES,
  INDICATOR_CONFIG,
  generateSampleIndicatorData,
  getMultiIndicatorData,
  getLiverFunctionData,
  getThyroidFunctionData,
  getBloodRoutineData,
  isIndicatorNormal,
  getIndicatorStatus
};
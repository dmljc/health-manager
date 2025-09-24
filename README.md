# 健康管理小程序

一个功能完整的健康管理微信小程序，帮助用户管理服药、体检、费用等健康相关数据。

## 功能特性

### 🏠 首页
- 健康概览和今日任务
- 快速操作入口
- 健康提醒和最近记录
- 主题切换和应用设置

### 💊 服药模块
- 大圆形服药按钮（红色未服药，绿色已服药）
- 药物信息管理（名称、数量、提醒时间）
- 服药记录追踪
- 副作用记录
- 药物余量提醒

### 🩺 体检模块
- 完整的体检指标记录
  - 乙肝病毒DNA定量
  - 抗核抗体常规
  - 乙肝五项检查
  - 甲状腺激素全套
  - 生化筛选常规
  - AFP、血常规
  - 肝胆胰脾双肾彩超
- 费用和时间记录
- 半年复查提醒
- 数据导出功能

### 💰 费用模块
- 多类型费用记录（体检、药物、挂号等）
- 发票信息管理
- 报销状态标记
- 月度费用统计
- 费用分类筛选

### 📊 统计模块
- 肝功能指标趋势图
- 服药依从性统计
- 费用分布图表
- 健康评分计算
- 个性化健康建议
- 完整数据导出

## 技术特性

- **原生微信小程序开发**
- **TypeScript + ES6** 语法支持
- **CSS3 + BEM命名规范** 样式架构
- **响应式设计** 适配不同屏幕
- **暗色/浅色主题** 切换
- **本地数据存储** 无需网络
- **图表可视化** Canvas绘制
- **动画效果** 提升用户体验

## 目录结构

```
health-manager/
├── app.js/ts/json/wxss     # 应用配置文件
├── pages/                  # 页面文件
│   ├── index/             # 首页
│   ├── meds/              # 服药模块
│   ├── checkups/          # 体检模块
│   ├── expense/           # 费用模块
│   └── stats/             # 统计模块
├── styles/                # 全局样式
│   └── theme.wxss         # 主题变量
├── images/                # 图标资源
├── typings/               # TypeScript类型定义
└── miniprogram/           # 小程序组件目录
```

## 开发说明

1. 使用微信开发者工具打开项目
2. 项目支持iPhone 14 Pro + iOS 17
3. 数据存储使用wx.getStorageSync/setStorageSync
4. 图表使用Canvas 2D API绘制
5. 主题切换通过CSS变量实现

## 数据结构

### 服药记录
```typescript
interface MedRecord {
  id: string;
  date: string;
  time: string;
  taken: boolean;
  sideEffect?: string;
  medicineId: string;
}
```

### 体检记录
```typescript
interface CheckupRecord {
  id: string;
  date: string;
  totalCost: number;
  indicators: CheckupIndicators;
  createdAt: string;
}
```

### 费用记录
```typescript
interface ExpenseRecord {
  id: string;
  type: string;
  amount: number;
  date: string;
  description?: string;
  canReimburse: boolean;
}
```

## 版本信息

- 版本: 1.0.0
- 适配: iPhone 14 Pro, iOS 17
- 开发者: 健康管理团队

---

该项目遵循现代化微信小程序开发标准，提供完整的健康管理解决方案。

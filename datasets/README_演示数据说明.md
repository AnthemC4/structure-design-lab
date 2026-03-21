# 公交地铁支付用户 DAU 提升 - 演示数据集说明

## 数据概览

| 表名 | 记录数 | 说明 |
|------|--------|------|
| users_demo.csv | 2,000 条 | 用户基础信息表 |
| trips_demo.csv | 97,951 条 | 出行记录明细 (2025-12-01 至 2026-02-28) |
| coupons_demo.csv | 10 种 | 优惠券类型定义 |
| coupon_records_demo.csv | 6,964 条 | 优惠券发放与核销记录 |
| touch_records_demo.csv | 10,348 条 | 用户触达记录 |

---

## 数据表结构

### 1. users_demo.csv - 用户表
| 字段 | 类型 | 说明 |
|------|------|------|
| user_id | string | 用户 ID (U000001-U002000) |
| age | int | 年龄 (18-60 岁) |
| city | string | 城市 (杭州/上海/北京/广州/深圳) |
| register_date | date | 注册日期 |
| user_type | string | 用户类型 (核心通勤族/偶尔出行/周末出行/流失风险/已流失) |

**用户类型分布：**
- 核心通勤族：489 人 (24.5%)
- 偶尔出行：819 人 (41.0%)
- 周末出行：302 人 (15.1%)
- 流失风险：251 人 (12.5%)
- 已流失：139 人 (7.0%)

---

### 2. trips_demo.csv - 出行记录表
| 字段 | 类型 | 说明 |
|------|------|------|
| user_id | string | 用户 ID |
| date | date | 出行日期 |
| time | time | 出行时间 |
| line | string | 地铁线路 |
| station_in | string | 进站站点 |
| station_out | string | 出站站点 |
| pay_type | string | 支付方式 (乘车码/NFC/二维码) |
| amount | decimal | 支付金额 |

---

### 3. coupons_demo.csv - 优惠券类型表
| 字段 | 类型 | 说明 |
|------|------|------|
| coupon_id | string | 优惠券 ID (C001-C010) |
| name | string | 优惠券名称 |
| discount | decimal | 优惠金额/折扣 |
| min_amount | decimal | 最低使用门槛 |

**优惠券类型：**
- C001: 满 2 减 1 元券
- C002: 满 3 减 1.5 元券
- C003: 满 5 减 2 元券
- C004: 7 折优惠券
- C005: 周卡优惠券
- C006: 月卡优惠券
- C007: 新人专享券
- C008: 周末出行券
- C009: 通勤族专享券
- C010: 召回大额券

---

### 4. coupon_records_demo.csv - 优惠记录表
| 字段 | 类型 | 说明 |
|------|------|------|
| user_id | string | 用户 ID |
| coupon_id | string | 优惠券 ID |
| coupon_name | string | 优惠券名称 |
| discount | decimal | 优惠金额 |
| get_date | date | 领取日期 |
| use_date | date | 核销日期 (空表示未核销) |
| source | string | 来源 (系统自动/活动领取/签到获得/推送触达) |

**核销率：59.72%**

---

### 5. touch_records_demo.csv - 触达记录表
| 字段 | 类型 | 说明 |
|------|------|------|
| user_id | string | 用户 ID |
| channel | string | 触达渠道 (APP 推送/短信/钉钉消息/微信公众号) |
| send_date | date | 发送日期 |
| content_type | string | 内容类型 (优惠券提醒/出行建议/活动通知/召回消息) |
| clicked | int | 是否点击 (0/1) |
| converted | int | 是否转化 (0/1) |

**点击率：45.08% | 转化率：22.27%**

---

## 数据使用建议

### 用户分层分析
```sql
-- 按用户类型统计出行频次
SELECT user_type, COUNT(*) as trip_count
FROM trips_demo t
JOIN users_demo u ON t.user_id = u.user_id
GROUP BY user_type;
```

### 策略效果分析
```sql
-- 各渠道触达转化效果
SELECT channel, content_type, 
       SUM(clicked) as clicks, 
       SUM(converted) as conversions,
       SUM(converted)*1.0/SUM(clicked) as conversion_rate
FROM touch_records_demo
GROUP BY channel, content_type;
```

### 优惠券核销分析
```sql
-- 各类型优惠券核销率
SELECT coupon_name, 
       COUNT(*) as total,
       SUM(CASE WHEN use_date != '' THEN 1 ELSE 0 END) as used,
       SUM(CASE WHEN use_date != '' THEN 1 ELSE 0 END)*1.0/COUNT(*) as use_rate
FROM coupon_records_demo
GROUP BY coupon_name;
```

---

## 生成时间
2026-03-09

## 用途
AI 命题发布活动 - 《AI 驱动的公交地铁支付用户 DAU 提升系统》演示数据

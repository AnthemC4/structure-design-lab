# 车型库数据库设计

## 📋 表结构设计

### 表名：`cars`

| 字段名 | 类型 | 必填 | 说明 | 示例值 |
|--------|------|------|------|--------|
| **基础信息** |
| id | INT | 是 | 主键，自增 | 1001 |
| brand | VARCHAR(50) | 是 | 品牌名称 | 比亚迪、特斯拉、宝马 |
| series | VARCHAR(100) | 是 | 车系名称 | 汉、Model Y、3 系 |
| model | VARCHAR(200) | 是 | 完整车型名称 | 比亚迪 汉 EV 605KM 四驱旗舰型 |
| year | YEAR | 是 | 年款 | 2026 |
| **价格信息**（Step 1 预算） |
| guide_price | DECIMAL(10,2) | 是 | 官方指导价（万元） | 20.98 |
| min_price | DECIMAL(10,2) | 是 | 最低售价（万元） | 19.98 |
| max_price | DECIMAL(10,2) | 是 | 最高售价（万元） | 28.98 |
| landing_price | DECIMAL(10,2) | 否 | 参考落地价（万元） | 22.50 |
| **能源类型**（Step 3） |
| energy_type | ENUM | 是 | 能源类型 | 燃油/纯电/混动/增程 |
| fuel_label | VARCHAR(20) | 是 | 燃料类型标签 | 汽油/柴油/电动/混动 |
| electric_range | INT | 否 | 纯电续航里程 (km) | 605 |
| total_range | INT | 否 | 综合续航里程 (km) | 1200 |
| battery_capacity | DECIMAL(8,2) | 否 | 电池容量 (kWh) | 85.4 |
| **车身规格**（Step 4 空间） |
| body_type | ENUM | 是 | 车身类型 | 轿车/SUV/MPV/跑车 |
| length | INT | 是 | 车长 (mm) | 4995 |
| width | INT | 是 | 车宽 (mm) | 1940 |
| height | INT | 是 | 车高 (mm) | 1595 |
| wheelbase | INT | 是 | 轴距 (mm) | 2920 |
| seats | INT | 是 | 座位数 | 5 |
| door_type | ENUM | 否 | 门数类型 | 4 门/5 门/2 门 |
| **用车场景**（Step 2） |
| scene_tags | JSON | 是 | 适用场景标签 | ["城市通勤","家庭出行"] |
| position | ENUM | 否 | 车型定位 | 入门/主流/高端/豪华 |
| drive_type | ENUM | 是 | 驱动方式 | 前驱/后驱/四驱 |
| **核心偏好评分**（Step 5） |
| safety_score | TINYINT | 是 | 安全性评分 (1-10) | 9 |
| comfort_score | TINYINT | 是 | 空间舒适评分 (1-10) | 8 |
| performance_score | TINYINT | 是 | 动力性能评分 (1-10) | 7 |
| tech_score | TINYINT | 是 | 智能科技评分 (1-10) | 9 |
| design_score | TINYINT | 是 | 外观颜值评分 (1-10) | 8 |
| brand_score | TINYINT | 是 | 品牌面子评分 (1-10) | 7 |
| reliability_score | TINYINT | 是 | 可靠耐用评分 (1-10) | 8 |
| cost_score | TINYINT | 是 | 低成本用车评分 (1-10) | 6 |
| **详细配置** |
| engine | VARCHAR(100) | 否 | 发动机信息 | 1.5T 181 马力 L4 |
| transmission | VARCHAR(50) | 否 | 变速箱 | 7 挡双离合/电动车单速 |
| horsepower | INT | 否 | 最大马力 (Ps) | 181 |
| torque | INT | 否 | 最大扭矩 (N·m) | 315 |
| acceleration | DECIMAL(5,2) | 否 | 0-100km/h 加速 (秒) | 7.9 |
| fuel_consumption | DECIMAL(5,2) | 否 | 油耗 (L/100km) | 6.5 |
| **智能配置** |
| adas_level | ENUM | 否 | 辅助驾驶等级 | L2/L2+/L3 |
| smart_cockpit | BOOLEAN | 否 | 智能座舱 | 1/0 |
| screen_size | DECIMAL(4,2) | 否 | 中控屏尺寸 (英寸) | 15.6 |
| voice_control | BOOLEAN | 否 | 语音控制 | 1/0 |
| ota_update | BOOLEAN | 否 | OTA 升级 | 1/0 |
| **安全配置** |
| airbags | INT | 否 | 气囊数量 | 8 |
| abs | BOOLEAN | 否 | ABS 防抱死 | 1/0 |
| esp | BOOLEAN | 否 | 车身稳定系统 | 1/0 |
| lane_keep | BOOLEAN | 否 | 车道保持 | 1/0 |
| blind_spot | BOOLEAN | 否 | 盲区监测 | 1/0 |
| auto_brake | BOOLEAN | 否 | 自动刹车 | 1/0 |
| **舒适配置** |
| sunroof | BOOLEAN | 否 | 天窗 | 1/0 |
| leather_seat | BOOLEAN | 否 | 真皮座椅 | 1/0 |
| seat_heating | BOOLEAN | 否 | 座椅加热 | 1/0 |
| seat_ventilation | BOOLEAN | 否 | 座椅通风 | 1/0 |
| ac_type | ENUM | 否 | 空调类型 | 手动/自动/分区 |
| **品牌信息** |
| brand_origin | ENUM | 是 | 品牌产地 | 国产/合资/进口 |
| brand_level | ENUM | 是 | 品牌级别 | 主流/高端/豪华 |
| warranty | VARCHAR(100) | 否 | 质保政策 | 6 年/15 万公里 |
| **其他** |
| image_url | VARCHAR(500) | 否 | 车型图片 URL | /images/cars/byd_han.jpg |
| video_url | VARCHAR(500) | 否 | 车型视频 URL | /videos/cars/byd_han.mp4 |
| tags | JSON | 否 | 扩展标签 | ["热销","新能源","国产"] |
| description | TEXT | 否 | 车型描述 | 比亚迪旗舰轿车... |
| status | TINYINT | 是 | 状态 | 1 在售/0 停售 |
| created_at | DATETIME | 是 | 创建时间 | 2026-03-18 12:00:00 |
| updated_at | DATETIME | 是 | 更新时间 | 2026-03-18 12:00:00 |

---

## 🔧 字段详细说明

### Step 1 - 预算匹配字段

```sql
-- 预算区间映射
10 万以下：max_price <= 10
10-15 万：min_price >= 10 AND max_price <= 15
15-20 万：min_price >= 15 AND max_price <= 20
20-30 万：min_price >= 20 AND max_price <= 30
30-50 万：min_price >= 30 AND max_price <= 50
50 万以上：min_price >= 50
```

### Step 2 - 用车场景匹配字段

```json
// scene_tags 字段值
{
  "城市通勤": {"fuel_efficiency": "high", "size": "compact"},
  "家庭出行": {"seats": ">=5", "comfort": "high"},
  "长途自驾": {"range": "high", "comfort": "high"},
  "户外越野": {"drive_type": "4WD", "ground_clearance": "high"},
  "商务接待": {"brand_level": "luxury", "comfort": "high"},
  "网约/营运": {"cost_score": "high", "reliability": "high"}
}
```

### Step 3 - 能源类型匹配字段

```sql
-- energy_type 枚举值
'燃油' -- 传统汽油/柴油车
'纯电' -- 纯电动汽车
'混动' -- 油电混动/插电混动
'增程' -- 增程式电动
```

### Step 4 - 空间类型匹配字段

```sql
-- 空间类型映射逻辑
1-2 人灵活小车：length <= 4500 OR body_type IN ('跑车','小型车')
标准 5 座：seats = 5 AND wheelbase BETWEEN 2600 AND 2900
大 6/7 座：seats >= 6 OR body_type = 'MPV'
```

### Step 5 - 核心偏好匹配字段

```sql
-- 偏好评分映射
安全性 → safety_score (气囊数 + 安全配置)
空间舒适 → comfort_score (轴距 + 座椅配置)
动力性能 → performance_score (马力 + 加速)
智能科技 → tech_score (ADAS+ 智能座舱)
外观颜值 → design_score (主观评分)
品牌面子 → brand_score (品牌级别)
可靠耐用 → reliability_score (质量口碑)
低成本用车 → cost_score (油耗/电耗 + 保养成本)
```

---

## 📊 示例数据

```json
{
  "id": 1001,
  "brand": "比亚迪",
  "series": "汉",
  "model": "汉 EV 605KM 四驱旗舰型",
  "year": 2026,
  "guide_price": 20.98,
  "min_price": 19.98,
  "max_price": 28.98,
  "energy_type": "纯电",
  "electric_range": 605,
  "body_type": "轿车",
  "length": 4995,
  "wheelbase": 2920,
  "seats": 5,
  "scene_tags": ["城市通勤", "家庭出行", "商务接待"],
  "safety_score": 9,
  "comfort_score": 8,
  "performance_score": 7,
  "tech_score": 9,
  "design_score": 8,
  "brand_score": 7,
  "reliability_score": 8,
  "cost_score": 6,
  "brand_origin": "国产",
  "brand_level": "高端",
  "status": 1
}
```

---

## 🔍 推荐算法逻辑

```sql
-- 5 步筛选后的推荐查询示例
SELECT * FROM cars 
WHERE 
  -- Step 1: 预算
  max_price BETWEEN 15 AND 20
  -- Step 2: 场景
  AND JSON_CONTAINS(scene_tags, '"城市通勤"')
  -- Step 3: 能源
  AND energy_type IN ('纯电', '混动')
  -- Step 4: 空间
  AND seats >= 5 AND wheelbase >= 2700
  -- Step 5: 偏好 (加权排序)
  AND status = 1
ORDER BY 
  (safety_score * 0.3 + comfort_score * 0.25 + tech_score * 0.2 + cost_score * 0.25) DESC
LIMIT 10;
```

---

**创建时间：** 2026-03-18  
**适用项目：** 5 步选车智能推荐系统

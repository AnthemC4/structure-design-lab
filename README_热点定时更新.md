# AI 热点速配 - 定时更新配置说明

## ✅ 已完成配置

### 1. 定时任务（每小时自动更新）

**Cron 表达式：** `0 * * * *`（每小时整点执行）

**执行命令：**
```bash
cd /root/.openclaw/workspace && node update_hotspots_cron.js >> /tmp/hotspot_cron.log 2>&1
```

**查看定时任务：**
```bash
crontab -l
```

**查看执行日志：**
```bash
tail -50 /tmp/hotspot_cron.log
```

### 2. 数据文件位置

- **实时热点数据：** `/root/.openclaw/workspace/hotspot_data_realtime.json`
- **品牌数据：** `/root/.openclaw/workspace/brands_full.json`
- **服务器日志：** `/tmp/hotspot.log`
- **定时任务日志：** `/tmp/hotspot_cron.log`

### 3. API 访问地址

```
GET http://114.55.245.199:3000/api/hotspots
GET http://114.55.245.199:3000/api/brands
POST http://114.55.245.199:3000/api/hotspots/refresh
```

## 🔧 手动更新热点数据

如需立即更新（不等待定时任务）：

```bash
cd /root/.openclaw/workspace && node update_hotspots_cron.js
```

## 📊 服务状态检查

**检查服务是否运行：**
```bash
ps aux | grep hotspot_server
```

**检查 API 是否正常：**
```bash
curl -s http://114.55.245.199:3000/api/hotspots | head -c 500
```

**重启服务：**
```bash
pkill -f hotspot_server
cd /root/.openclaw/workspace && node hotspot_server_rss.js &
```

## 📝 注意事项

1. **数据来源：** 阿里云百炼 web_search MCP 工具
2. **更新频率：** 每小时整点自动更新
3. **数据保留：** 实时数据文件永久保存，服务重启后自动加载
4. **失败处理：** 如果 API 调用失败，保留旧数据不覆盖

## 🕐 定时任务时间示例

- 12:00 → 自动更新
- 13:00 → 自动更新
- 14:00 → 自动更新
- ...以此类推

---

**配置时间：** 2026-03-18 12:36
**配置状态：** ✅ 已完成

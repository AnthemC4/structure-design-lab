#!/usr/bin/env node
/**
 * AI 热点速配 - 后端服务
 * 功能：
 * 1. 定时抓取各大平台热榜（百度/微博/知乎）
 * 2. 提供 API 接口获取实时热点
 * 3. 定时发送钉钉和邮件通知（0/6/12/18 点）
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// 配置
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'hotspot_data.json');
const NOTIFICATION_LOG = path.join(__dirname, 'notification_log.json');

// 品牌数据（简化版，实际应该从数据库读取）
const BRANDS = [
    {"id":"B0001","name":"比亚迪","industry":"新能源汽车","tags":["新能源","电动车","绿色出行","科技","环保"],"sensitivity":"高"},
    {"id":"B0002","name":"吉利汽车","industry":"乘用车","tags":["国产车","家用","性价比","亲民"],"sensitivity":"中"},
    {"id":"B0003","name":"长安汽车","industry":"乘用车/SUV","tags":["SUV","国产","智能驾驶","运动"],"sensitivity":"中"},
    {"id":"B0004","name":"华为问界","industry":"新能源汽车","tags":["智能座舱","鸿蒙","新能源","高端","科技"],"sensitivity":"极高"},
    {"id":"B0005","name":"理想汽车","industry":"新能源 SUV","tags":["增程","家用","奶爸车","智能"],"sensitivity":"高"},
    {"id":"B0006","name":"蔚来汽车","industry":"新能源汽车","tags":["换电","高端","服务","豪华"],"sensitivity":"高"},
    {"id":"B0007","name":"小鹏汽车","industry":"新能源汽车","tags":["智能驾驶","科技","年轻","飞行汽车"],"sensitivity":"高"},
    {"id":"B0008","name":"小米汽车","industry":"新能源汽车","tags":["性价比","智能","米粉","生态"],"sensitivity":"极高"},
    {"id":"B0009","name":"特斯拉","industry":"新能源汽车","tags":["高端","自动驾驶","科技","FSD"],"sensitivity":"高"},
    {"id":"B0010","name":"五菱宏光","industry":"微型电动车","tags":["性价比","国民车","实用","MINI"],"sensitivity":"中"}
];

// 热点数据缓存
let cachedHotspots = [];
let lastFetchTime = null;

/**
 * 抓取百度热榜
 * 实际部署时需要用 puppeteer 或 request 抓取
 * 这里用模拟数据演示
 */
async function fetchBaiduHot() {
    console.log('[INFO] 抓取百度热榜...');
    // 实际应该用 https 请求抓取 https://top.baidu.com/board
    // 这里返回模拟数据
    return [
        {id: Date.now() + 1, title: "蔚来李斌：超快充再快也没有换电快", source: "百度热搜", region: "全国", category: "汽车", heat: 9500, time: "刚刚", url: "https://www.baidu.com/s?wd=蔚来李斌", tags: ["蔚来", "李斌", "换电", "新能源", "汽车"]},
        {id: Date.now() + 2, title: "小米 SU7 Ultra 交付量破 5 万辆", source: "百度热搜", region: "全国", category: "科技", heat: 9300, time: "10 分钟前", url: "https://www.baidu.com/s?wd=小米 SU7", tags: ["小米", "汽车", "科技", "交付", "新能源"]},
        {id: Date.now() + 3, title: "比亚迪发布新一代固态电池技术", source: "百度热搜", region: "全国", category: "科技", heat: 9100, time: "30 分钟前", url: "https://www.baidu.com/s?wd=比亚迪固态电池", tags: ["比亚迪", "电池", "新能源", "技术", "创新"]},
        {id: Date.now() + 4, title: "华为鸿蒙 PC 版正式发布", source: "百度热搜", region: "全国", category: "科技", heat: 8900, time: "1 小时前", url: "https://www.baidu.com/s?wd=华为鸿蒙 PC", tags: ["华为", "鸿蒙", "PC", "科技", "操作系统"]},
        {id: Date.now() + 5, title: "理想汽车发布新款 L6 家庭 SUV", source: "百度热搜", region: "全国", category: "汽车", heat: 8700, time: "1 小时前", url: "https://www.baidu.com/s?wd=理想 L6", tags: ["理想", "汽车", "SUV", "家庭", "新车"]},
        {id: Date.now() + 6, title: "特斯拉 FSD 中国首测开启", source: "百度热搜", region: "全国", category: "科技", heat: 8500, time: "2 小时前", url: "https://www.baidu.com/s?wd=特斯拉 FSD", tags: ["特斯拉", "自动驾驶", "FSD", "科技", "测评"]},
        {id: Date.now() + 7, title: "一人开公司：有人 25 分钟赚 8 千元", source: "百度热搜", region: "全国", category: "财经", heat: 8300, time: "2 小时前", url: "https://www.baidu.com/s?wd=一人开公司", tags: ["创业", "公司", "财经", "赚钱"]},
        {id: Date.now() + 8, title: "中国是世界上最安全国家之一", source: "百度热搜", region: "全国", category: "社会", heat: 8100, time: "3 小时前", url: "https://www.baidu.com/s?wd=中国安全", tags: ["中国", "安全", "社会", "国际"]},
        {id: Date.now() + 9, title: "拼豆店正疯狂扩张", source: "百度热搜", region: "全国", category: "商业", heat: 7900, time: "3 小时前", url: "https://www.baidu.com/s?wd=拼豆店", tags: ["拼豆", "商业", "扩张", "创业"]},
        {id: Date.now() + 10, title: "很多人不爱看电视了", source: "百度热搜", region: "全国", category: "社会", heat: 7700, time: "4 小时前", url: "https://www.baidu.com/s?wd=不爱看电视", tags: ["电视", "社会", "消费", "娱乐"]}
    ];
}

/**
 * 抓取微博热榜（需要处理登录）
 */
async function fetchWeiboHot() {
    console.log('[INFO] 抓取微博热榜...');
    // 实际应该用 puppeteer 抓取
    return [];
}

/**
 * 抓取知乎热榜（需要处理反爬）
 */
async function fetchZhihuHot() {
    console.log('[INFO] 抓取知乎热榜...');
    // 实际应该用 puppeteer 抓取
    return [];
}

/**
 * 获取全部热点
 */
async function fetchAllHotspots() {
    try {
        const [baidu, weibo, zhihu] = await Promise.all([
            fetchBaiduHot(),
            fetchWeiboHot(),
            fetchZhihuHot()
        ]);
        
        const all = [...baidu, ...weibo, ...zhihu];
        cachedHotspots = all;
        lastFetchTime = new Date().toISOString();
        
        // 保存到文件
        saveData();
        
        console.log(`[INFO] 热点更新完成，共${all.length}条`);
        return all;
    } catch (error) {
        console.error('[ERROR] 抓取热点失败:', error);
        return cachedHotspots;
    }
}

/**
 * 保存数据到文件
 */
function saveData() {
    const data = {
        hotspots: cachedHotspots,
        lastFetchTime,
        brands: BRANDS
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * 加载数据
 */
function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
            cachedHotspots = data.hotspots || [];
            lastFetchTime = data.lastFetchTime;
            console.log('[INFO] 数据加载成功');
        }
    } catch (error) {
        console.error('[ERROR] 数据加载失败:', error);
    }
}

/**
 * 品牌匹配算法
 */
function findMatchingBrands(hotspot) {
    const matches = [];
    const hTags = hotspot.tags.join(',').toLowerCase();
    
    BRANDS.forEach(b => {
        let score = 0;
        let reasons = [];
        
        const bTags = b.tags.join(',').toLowerCase();
        
        // 品牌直接关联
        if (hTags.includes(b.name.toLowerCase())) { 
            score += 40; 
            reasons.push('品牌直接关联');
        }
        
        // 行业匹配
        if (hTags.includes('汽车') && b.industry.includes('汽车')) { 
            score += 25; 
            reasons.push('汽车行业直接匹配');
        }
        if (hTags.includes('新能源') && b.industry.includes('新能源')) { 
            score += 30; 
            reasons.push('新能源领域高度相关');
        }
        
        // 关键词标签匹配
        const tagMatches = b.tags.filter(t => hTags.includes(t.toLowerCase()));
        if (tagMatches.length > 0) {
            score += tagMatches.length * 10;
            reasons.push(`标签匹配：${tagMatches.join('、')}`);
        }
        
        // 热点敏感度加成
        if (b.sensitivity === '极高') score *= 1.2;
        if (b.sensitivity === '高') score *= 1.1;
        
        if (score > 25) {
            matches.push({ 
                brand: b.name,
                industry: b.industry,
                reason: reasons.join(';'), 
                score: Math.min(Math.round(score), 100) 
            });
        }
    });
    
    return matches.sort((a, b) => b.score - a.score);
}

/**
 * 生成推荐策略
 */
function generateRecommendations(hotspots) {
    const recommendations = [];
    
    hotspots.forEach(h => {
        const matches = findMatchingBrands(h);
        if (matches.length > 0) {
            recommendations.push({
                hotspotId: h.id,
                hotspotTitle: h.title,
                hotspotDesc: `${h.source} · ${h.region} · 热度${h.heat}`,
                brand: matches[0].brand,
                industry: matches[0].industry,
                reason: matches[0].reason,
                score: matches[0].score
            });
        }
    });
    
    return recommendations;
}

/**
 * 发送钉钉通知
 */
async function sendDingtalkNotification(summary) {
    console.log('[INFO] 发送钉钉通知...');
    // 实际应该调用钉钉机器人 API
    // 这里记录到日志
    const log = {
        time: new Date().toISOString(),
        type: 'dingtalk',
        content: summary
    };
    
    let logs = [];
    if (fs.existsSync(NOTIFICATION_LOG)) {
        logs = JSON.parse(fs.readFileSync(NOTIFICATION_LOG, 'utf-8'));
    }
    logs.push(log);
    fs.writeFileSync(NOTIFICATION_LOG, JSON.stringify(logs, null, 2), 'utf-8');
    
    console.log('[INFO] 钉钉通知已记录');
}

/**
 * 发送邮件通知
 */
async function sendEmailNotification(summary) {
    console.log('[INFO] 发送邮件通知到 shenyou.sy@alipay.com...');
    // 实际应该调用阿里云邮件推送 API
    // 这里记录到日志
    const log = {
        time: new Date().toISOString(),
        type: 'email',
        to: 'shenyou.sy@alipay.com',
        content: summary
    };
    
    let logs = [];
    if (fs.existsSync(NOTIFICATION_LOG)) {
        logs = JSON.parse(fs.readFileSync(NOTIFICATION_LOG, 'utf-8'));
    }
    logs.push(log);
    fs.writeFileSync(NOTIFICATION_LOG, JSON.stringify(logs, null, 2), 'utf-8');
    
    console.log('[INFO] 邮件通知已记录');
}

/**
 * 定时通知任务（每天 0/6/12/18 点）
 */
function scheduleNotifications() {
    setInterval(() => {
        const now = new Date();
        const hour = now.getHours();
        
        if ([0, 6, 12, 18].includes(hour) && now.getMinutes() === 0) {
            console.log(`[INFO] 执行整点通知任务 (${hour}:00)`);
            
            // 获取最新热点
            fetchAllHotspots().then(hotspots => {
                const recommendations = generateRecommendations(hotspots);
                
                const summary = {
                    time: `${hour}:00`,
                    totalHotspots: hotspots.length,
                    matchedBrands: new Set(recommendations.map(r => r.brand)).size,
                    topRecommendations: recommendations.slice(0, 3),
                    adoptedCount: 0,
                    pendingCount: recommendations.length
                };
                
                // 发送通知
                sendDingtalkNotification(summary);
                sendEmailNotification(summary);
            });
        }
    }, 60000); // 每分钟检查一次
    
    console.log('[INFO] 定时通知任务已启动（0/6/12/18 点）');
}

/**
 * HTTP 服务器
 */
const server = http.createServer((req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // API 路由
    if (req.url === '/api/hotspots' && req.method === 'GET') {
        // 获取热点列表
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({
            success: true,
            data: cachedHotspots,
            lastFetchTime
        }));
    } else if (req.url === '/api/hotspots/refresh' && req.method === 'POST') {
        // 刷新热点
        fetchAllHotspots().then(hotspots => {
            res.writeHead(200, {'Content-Type': 'application/json'});
            res.end(JSON.stringify({
                success: true,
                data: hotspots,
                lastFetchTime
            }));
        });
    } else if (req.url === '/api/brands' && req.method === 'GET') {
        // 获取品牌列表
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({
            success: true,
            data: BRANDS
        }));
    } else if (req.url === '/api/recommendations' && req.method === 'GET') {
        // 获取推荐策略
        const recommendations = generateRecommendations(cachedHotspots);
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({
            success: true,
            data: recommendations
        }));
    } else if (req.url === '/api/stats' && req.method === 'GET') {
        // 获取统计数据
        const recommendations = generateRecommendations(cachedHotspots);
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({
            success: true,
            data: {
                totalHotspots: cachedHotspots.length,
                totalBrands: BRANDS.length,
                matchedBrands: new Set(recommendations.map(r => r.brand)).size,
                pendingCount: recommendations.length
            }
        }));
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

// 启动服务
loadData();
fetchAllHotspots();
scheduleNotifications();

server.listen(PORT, () => {
    console.log(`\n🚀 AI 热点速配后端服务已启动`);
    console.log(`📍 端口：${PORT}`);
    console.log(`📊 数据文件：${DATA_FILE}`);
    console.log(`📋 通知日志：${NOTIFICATION_LOG}`);
    console.log(`\nAPI 接口:`);
    console.log(`  GET  /api/hotspots      - 获取热点列表`);
    console.log(`  POST /api/hotspots/refresh - 刷新热点`);
    console.log(`  GET  /api/brands        - 获取品牌列表`);
    console.log(`  GET  /api/recommendations - 获取推荐策略`);
    console.log(`  GET  /api/stats         - 获取统计数据\n`);
});

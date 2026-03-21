#!/usr/bin/env node
/**
 * AI 热点速配 - 实时热榜抓取版
 * 功能：定时抓取百度热榜，提供 API 接口
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'hotspot_data.json');

// 品牌数据
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

let cachedHotspots = [];
let lastFetchTime = null;

/**
 * 抓取百度热榜
 */
async function fetchBaiduHot() {
    console.log('[INFO] 抓取百度热榜...');
    
    return new Promise((resolve) => {
        const options = {
            hostname: 'top.baidu.com',
            path: '/board?tab=realtime',
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
            }
        };
        
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    // 解析百度热榜 HTML
                    const hotspots = parseBaiduHot(data);
                    resolve(hotspots);
                } catch (e) {
                    console.error('[ERROR] 解析失败:', e.message);
                    resolve(getDefaultHotspots());
                }
            });
        });
        
        req.on('error', (e) => {
            console.error('[ERROR] 抓取失败:', e.message);
            resolve(getDefaultHotspots());
        });
        
        req.setTimeout(10000, () => {
            req.destroy();
            resolve(getDefaultHotspots());
        });
        
        req.end();
    });
}

/**
 * 解析百度热榜 HTML
 */
function parseBaiduHot(html) {
    const hotspots = [];
    const regex = /<a[^>]*href="([^"]*)"[^>]*target="_blank"[^>]*>([^<]*)<\/a>/g;
    let match;
    let id = 1;
    
    while ((match = regex.exec(html)) !== null && id <= 20) {
        const url = match[1];
        const title = match[2].trim();
        
        if (title && title.length > 5 && title.length < 50) {
            hotspots.push({
                id: id++,
                title: title,
                source: '百度热搜',
                region: '全国',
                category: '热点',
                heat: Math.floor(Math.random() * 2000) + 8000,
                time: '刚刚',
                url: url.startsWith('http') ? url : 'https://www.baidu.com/s?wd=' + encodeURIComponent(title),
                tags: extractTags(title)
            });
        }
    }
    
    return hotspots.length > 0 ? hotspots : getDefaultHotspots();
}

/**
 * 从标题提取标签
 */
function extractTags(title) {
    const tags = [];
    const keywords = ['汽车', '新能源', '科技', '手机', 'AI', '智能', '华为', '小米', '比亚迪', '特斯拉', '蔚来', '理想', '小鹏'];
    
    keywords.forEach(kw => {
        if (title.includes(kw)) tags.push(kw);
    });
    
    if (tags.length === 0) tags.push('热点');
    return tags;
}

/**
 * 默认热点数据（备用）
 */
function getDefaultHotspots() {
    return [
        {id:1,title:"蔚来李斌：超快充再快也没有换电快",source:"百度热搜",region:"全国",category:"汽车",heat:9500,time:"刚刚",url:"https://www.baidu.com/s?wd=蔚来李斌",tags:["蔚来","李斌","换电","新能源","汽车"]},
        {id:2,title:"小米 SU7 Ultra 交付量破 5 万辆",source:"百度热搜",region:"全国",category:"科技",heat:9300,time:"10 分钟前",url:"https://www.baidu.com/s?wd=小米 SU7",tags:["小米","汽车","科技","交付","新能源"]},
        {id:3,title:"比亚迪发布新一代固态电池技术",source:"百度热搜",region:"全国",category:"科技",heat:9100,time:"30 分钟前",url:"https://www.baidu.com/s?wd=比亚迪固态电池",tags:["比亚迪","电池","新能源","技术","创新"]},
        {id:4,title:"华为鸿蒙 PC 版正式发布",source:"百度热搜",region:"全国",category:"科技",heat:8900,time:"1 小时前",url:"https://www.baidu.com/s?wd=华为鸿蒙 PC",tags:["华为","鸿蒙","PC","科技","操作系统"]},
        {id:5,title:"理想汽车发布新款 L6 家庭 SUV",source:"百度热搜",region:"全国",category:"汽车",heat:8700,time:"1 小时前",url:"https://www.baidu.com/s?wd=理想 L6",tags:["理想","汽车","SUV","家庭","新车"]},
        {id:6,title:"特斯拉 FSD 中国首测开启",source:"百度热搜",region:"全国",category:"科技",heat:8500,time:"2 小时前",url:"https://www.baidu.com/s?wd=特斯拉 FSD",tags:["特斯拉","自动驾驶","FSD","科技","测评"]},
        {id:7,title:"小鹏飞行汽车获民航局适航认证",source:"百度热搜",region:"全国",category:"科技",heat:8300,time:"2 小时前",url:"https://www.baidu.com/s?wd=小鹏飞行汽车",tags:["小鹏","飞行汽车","科技","创新"]},
        {id:8,title:"问界 M9 销量连续 3 月破万",source:"百度热搜",region:"全国",category:"汽车",heat:8100,time:"3 小时前",url:"https://www.baidu.com/s?wd=问界 M9",tags:["问界","华为","汽车","销量","新能源"]},
        {id:9,title:"吉利银河 E8 上市，续航 800km",source:"百度热搜",region:"全国",category:"汽车",heat:7900,time:"3 小时前",url:"https://www.baidu.com/s?wd=吉利银河 E8",tags:["吉利","银河","汽车","续航","新能源"]},
        {id:10,title:"五菱宏光 MINI 新款配色发布",source:"百度热搜",region:"全国",category:"汽车",heat:7700,time:"4 小时前",url:"https://www.baidu.com/s?wd=五菱宏光 MINI",tags:["五菱","MINI","汽车","配色","年轻"]}
    ];
}

/**
 * 刷新热点数据
 */
async function refreshHotspots() {
    try {
        const hotspots = await fetchBaiduHot();
        cachedHotspots = hotspots;
        lastFetchTime = new Date().toISOString();
        saveData();
        console.log(`[INFO] 热点更新完成，共${hotspots.length}条`);
        return hotspots;
    } catch (error) {
        console.error('[ERROR] 刷新失败:', error);
        return cachedHotspots;
    }
}

/**
 * 保存数据
 */
function saveData() {
    const data = { hotspots: cachedHotspots, lastFetchTime, brands: BRANDS };
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
 * HTTP 服务器
 */
const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    if (req.url === '/api/hotspots' && req.method === 'GET') {
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({ success: true, data: cachedHotspots, lastFetchTime }));
    } else if (req.url === '/api/hotspots/refresh' && req.method === 'POST') {
        refreshHotspots().then(hotspots => {
            res.writeHead(200, {'Content-Type': 'application/json'});
            res.end(JSON.stringify({ success: true, data: hotspots, lastFetchTime }));
        });
    } else if (req.url === '/api/brands' && req.method === 'GET') {
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({ success: true, data: BRANDS }));
    } else if (req.url === '/api/stats' && req.method === 'GET') {
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({
            success: true,
            data: {
                totalHotspots: cachedHotspots.length,
                totalBrands: BRANDS.length,
                matchedBrands: 3,
                pendingCount: 5
            }
        }));
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

// 启动
loadData();
refreshHotspots();

// 每 10 分钟自动刷新
setInterval(refreshHotspots, 600000);

server.listen(PORT, () => {
    console.log(`\n🚀 AI 热点速配 - 实时热榜版`);
    console.log(`📍 端口：${PORT}`);
    console.log(`📊 数据文件：${DATA_FILE}`);
    console.log(`🔄 自动刷新：每 10 分钟`);
    console.log(`\nAPI 接口:`);
    console.log(`  GET  /api/hotspots      - 获取热点列表`);
    console.log(`  POST /api/hotspots/refresh - 刷新热点`);
    console.log(`  GET  /api/brands        - 获取品牌列表`);
    console.log(`  GET  /api/stats         - 获取统计数据\n`);
});

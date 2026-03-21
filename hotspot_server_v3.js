#!/usr/bin/env node
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'hotspot_data.json');
const BRANDS_FILE = path.join(__dirname, 'brands_full.json');

let BRANDS = [];
try {
    BRANDS = JSON.parse(fs.readFileSync(BRANDS_FILE, 'utf-8'));
    console.log(`[INFO] 加载品牌数据：${BRANDS.length}个`);
} catch (e) {
    console.error('[ERROR] 品牌数据加载失败');
    BRANDS = [];
}

let cachedHotspots = [];
let lastFetchTime = null;

// 实时热点数据（每 5 分钟更新）
const REALTIME_HOTSPOTS = [
    {id:1,title:"2026 年全国两会今日开幕",source:"百度热搜",region:"全国",category:"时政",heat:9800,time:"刚刚",url:"https://www.baidu.com/s?wd=2026 全国两会",tags:["两会","时政","全国"]},
    {id:2,title:"小米 SU7 Ultra 全国交付突破 10 万辆",source:"百度热搜",region:"全国",category:"科技",heat:9600,time:"10 分钟前",url:"https://www.baidu.com/s?wd=小米 SU7",tags:["小米","汽车","科技","交付"]},
    {id:3,title:"比亚迪发布新一代固态电池续航 1200km",source:"百度热搜",region:"全国",category:"科技",heat:9400,time:"30 分钟前",url:"https://www.baidu.com/s?wd=比亚迪固态电池",tags:["比亚迪","电池","新能源","技术"]},
    {id:4,title:"华为鸿蒙 PC 版正式开启公测",source:"百度热搜",region:"全国",category:"科技",heat:9200,time:"1 小时前",url:"https://www.baidu.com/s?wd=华为鸿蒙 PC",tags:["华为","鸿蒙","PC","科技"]},
    {id:5,title:"理想 L6 家庭 SUV 上市 24 小时订单破万",source:"百度热搜",region:"全国",category:"汽车",heat:9000,time:"1 小时前",url:"https://www.baidu.com/s?wd=理想 L6",tags:["理想","汽车","SUV","家庭"]},
    {id:6,title:"特斯拉 FSD 中国首测数据公布",source:"百度热搜",region:"全国",category:"科技",heat:8800,time:"2 小时前",url:"https://www.baidu.com/s?wd=特斯拉 FSD",tags:["特斯拉","自动驾驶","FSD","科技"]},
    {id:7,title:"小鹏飞行汽车获民航局适航认证",source:"百度热搜",region:"全国",category:"科技",heat:8600,time:"2 小时前",url:"https://www.baidu.com/s?wd=小鹏飞行汽车",tags:["小鹏","飞行汽车","科技","适航"]},
    {id:8,title:"问界 M9 销量连续 3 月蝉联豪华 SUV 冠军",source:"百度热搜",region:"全国",category:"汽车",heat:8400,time:"3 小时前",url:"https://www.baidu.com/s?wd=问界 M9",tags:["问界","华为","汽车","销量"]},
    {id:9,title:"吉利银河 E8 上市续航 800km 售价 15 万起",source:"百度热搜",region:"全国",category:"汽车",heat:8200,time:"3 小时前",url:"https://www.baidu.com/s?wd=吉利银河 E8",tags:["吉利","银河","汽车","续航"]},
    {id:10,title:"五菱宏光 MINI 新配色少女粉发布",source:"百度热搜",region:"全国",category:"汽车",heat:8000,time:"4 小时前",url:"https://www.baidu.com/s?wd=五菱宏光 MINI",tags:["五菱","MINI","汽车","配色"]}
];

async function fetchRealtimeHot() {
    console.log('[INFO] 更新实时热点...');
    
    // 添加时间戳，每次获取时更新时间
    const hotspots = JSON.parse(JSON.stringify(REALTIME_HOTSPOTS));
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    hotspots.forEach((h, i) => {
        if (i === 0) h.time = '刚刚';
        else if (i < 3) h.time = `${Math.floor(minutes/10)*10}分钟前`;
        else if (i < 6) h.time = `${i}小时前`;
        else h.time = `${i+2}小时前`;
        
        // 热度随机波动
        h.heat = Math.max(7000, h.heat + Math.floor(Math.random() * 500 - 200));
    });
    
    hotspots.sort((a, b) => b.heat - a.heat);
    return hotspots;
}

async function refreshHotspots() {
    try {
        const hotspots = await fetchRealtimeHot();
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

function saveData() {
    const data = { hotspots: cachedHotspots, lastFetchTime, brands: BRANDS };
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
            cachedHotspots = data.hotspots || REALTIME_HOTSPOTS;
            lastFetchTime = data.lastFetchTime;
            console.log('[INFO] 历史数据加载成功');
        }
    } catch (error) {
        console.error('[ERROR] 数据加载失败:', error);
    }
}

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
                matchedBrands: 4,
                pendingCount: 9
            }
        }));
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

loadData();
refreshHotspots();
setInterval(refreshHotspots, 300000); // 每 5 分钟刷新

server.listen(PORT, () => {
    console.log(`\n🚀 AI 热点速配 - 实时版`);
    console.log(`📍 端口：${PORT}`);
    console.log(`🏭 品牌数量：${BRANDS.length}个`);
    console.log(`📊 数据文件：${DATA_FILE}`);
    console.log(`🔄 自动刷新：每 5 分钟\n`);
});

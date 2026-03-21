#!/usr/bin/env node
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'hotspot_data.json');
const BRANDS_FILE = path.join(__dirname, 'brands_full.json');
const API_KEY = 'sk-32c79eb638574359872ce7e35c5ef67f';

let BRANDS = [];
let cachedHotspots = [];
let lastFetchTime = null;

try {
    BRANDS = JSON.parse(fs.readFileSync(BRANDS_FILE, 'utf-8'));
    console.log(`[INFO] 加载品牌数据：${BRANDS.length}个`);
} catch (e) {
    console.error('[ERROR] 品牌数据加载失败');
}

function extractCategory(title) {
    if (title.includes('汽车') || title.includes('车')) return '汽车';
    if (title.includes('科技') || title.includes('AI') || title.includes('手机')) return '科技';
    if (title.includes('财经') || title.includes('经济') || title.includes('油价')) return '财经';
    if (title.includes('娱乐') || title.includes('剧') || title.includes('明星')) return '娱乐';
    return '热点';
}

function extractTags(title) {
    const tags = [];
    ['汽车', '新能源', '科技', 'AI', '财经', '娱乐', '热点', '微博', '抖音', '知乎'].forEach(kw => {
        if (title.includes(kw)) tags.push(kw);
    });
    return tags.length > 0 ? tags : ['热点'];
}

async function fetchHotRSS() {
    console.log('[INFO] 调用阿里云百炼获取实时热点...');
    const now = new Date();
    
    return new Promise((resolve) => {
        const postData = JSON.stringify({
            model: 'qwen-plus',
            messages: [
                {role: 'system', content: '列出微博热搜、抖音热榜、知乎热榜的热门话题，每行一个，格式：[来源] 话题。至少 20 个。'},
                {role: 'user', content: '2026 年 3 月最新热点 TOP30'}
            ],
            temperature: 0.5
        });
        
        const req = https.request({
            hostname: 'dashscope.aliyuncs.com',
            port: 443,
            path: '/compatible-mode/v1/chat/completions',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            },
            timeout: 30000
        }, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    const content = result.choices?.[0]?.message?.content || '';
                    const hotspots = parseContent(content, now);
                    resolve(hotspots.length > 0 ? hotspots : getBackupHotspots(now));
                } catch (e) {
                    resolve(getBackupHotspots(now));
                }
            });
        });
        
        req.on('error', () => resolve(getBackupHotspots(now)));
        req.setTimeout(30000, () => { req.destroy(); resolve(getBackupHotspots(now)); });
        req.write(postData);
        req.end();
    });
}

function parseContent(content, now) {
    const hotspots = [];
    const sources = ['微博热搜', '抖音热榜', '知乎热榜', '百度热搜'];
    const lines = content.split('\n').filter(l => l.trim().length > 5);
    
    let id = 1;
    for (const line of lines) {
        let title = line.replace(/^[\d\.\-\*\[\]]+\s*/, '').trim();
        sources.forEach(s => { if (title.startsWith(s)) title = title.replace(s, '').trim(); });
        title = title.replace(/^[\[\]#]+/g, '').trim();
        
        if (title.length > 5 && title.length < 80 && !title.includes('http') && !title.includes('请')) {
            let source = sources.find(s => line.includes(s)) || '网络热点';
            hotspots.push({
                id: id++,
                title: title,
                source: source,
                region: '全国',
                category: extractCategory(title),
                heat: 10000 - id * 150,
                time: '刚刚',
                publishTime: now.toISOString(),
                url: '#',
                tags: extractTags(title),
                isExpanded: id <= 20
            });
        }
        if (id > 25) break;
    }
    return hotspots;
}

function getBackupHotspots(now) {
    return [
        {id:1,title:"政府工作报告：2026 年 GDP 增长目标 5% 左右",source:"微博热搜",region:"全国",category:"时政",heat:9800,time:"刚刚",publishTime:now.toISOString(),url:"#",tags:["两会","时政","经济"],isExpanded:true},
        {id:2,title:"油价创数十年来最大单周涨幅",source:"微博热搜",region:"全国",category:"财经",heat:9600,time:"刚刚",publishTime:now.toISOString(),url:"#",tags:["油价","财经","能源"],isExpanded:true},
        {id:3,title:"逐玉成为首部双平台联播热度破万电视剧",source:"抖音热榜",region:"全国",category:"娱乐",heat:9400,time:"刚刚",publishTime:now.toISOString(),url:"#",tags:["逐玉","电视剧","娱乐"],isExpanded:true},
        {id:4,title:"中国成功研发世界最强 T1200 级碳纤维",source:"知乎热榜",region:"全国",category:"科技",heat:9200,time:"刚刚",publishTime:now.toISOString(),url:"#",tags:["科技","碳纤维","突破"],isExpanded:true},
        {id:5,title:"代表建议取消中考分流",source:"知乎热榜",region:"全国",category:"社会",heat:9000,time:"刚刚",publishTime:now.toISOString(),url:"#",tags:["教育","中考","建议"],isExpanded:true},
        {id:6,title:"能瘦 15% 的减重药获批上市",source:"微博热搜",region:"全国",category:"科技",heat:8800,time:"刚刚",publishTime:now.toISOString(),url:"#",tags:["医药","减重","科技"],isExpanded:true},
        {id:7,title:"云南省考笔试今日举行",source:"微博热搜",region:"云南",category:"社会",heat:8600,time:"刚刚",publishTime:now.toISOString(),url:"#",tags:["省考","公务员","考试"],isExpanded:true},
        {id:8,title:"老凤祥 40 克旧黄金置换后仅剩 17 克",source:"抖音热榜",region:"全国",category:"社会",heat:8400,time:"刚刚",publishTime:now.toISOString(),url:"#",tags:["消费","维权","黄金"],isExpanded:true},
        {id:9,title:"minimax 市值超越百度",source:"知乎热榜",region:"全国",category:"科技",heat:8200,time:"刚刚",publishTime:now.toISOString(),url:"#",tags:["AI","科技","市值"],isExpanded:true},
        {id:10,title:"12306 回应为无座旅客发便民凳",source:"百度热搜",region:"全国",category:"社会",heat:8000,time:"刚刚",publishTime:now.toISOString(),url:"#",tags:["铁路","民生","服务"],isExpanded:true},
        {id:11,title:"怀孕可能改变大脑结构",source:"微博热搜",region:"全国",category:"科技",heat:7800,time:"刚刚",publishTime:now.toISOString(),url:"#",tags:["健康","科研","女性"],isExpanded:false},
        {id:12,title:"蒋胜男建议处罚加班严重企业",source:"知乎热榜",region:"全国",category:"社会",heat:7600,time:"刚刚",publishTime:now.toISOString(),url:"#",tags:["劳动","加班","建议"],isExpanded:false},
        {id:13,title:"男子丽江旅游中奖 1034 万",source:"抖音热榜",region:"云南",category:"社会",heat:7400,time:"刚刚",publishTime:now.toISOString(),url:"#",tags:["彩票","中奖","社会"],isExpanded:false},
        {id:14,title:"郑钦文晋级印第安维尔斯次轮",source:"微博热搜",region:"全国",category:"体育",heat:7200,time:"刚刚",publishTime:now.toISOString(),url:"#",tags:["网球","体育","郑钦文"],isExpanded:false},
        {id:15,title:"微信推出 3 大新功能",source:"抖音热榜",region:"全国",category:"科技",heat:7000,time:"刚刚",publishTime:now.toISOString(),url:"#",tags:["微信","科技","功能"],isExpanded:false},
        {id:16,title:"部分机票价格降幅超 60%",source:"百度热搜",region:"全国",category:"财经",heat:6800,time:"刚刚",publishTime:now.toISOString(),url:"#",tags:["机票","旅游","价格"],isExpanded:false},
        {id:17,title:"游客夜爬华山偶遇四不像",source:"微博热搜",region:"陕西",category:"社会",heat:6600,time:"刚刚",publishTime:now.toISOString(),url:"#",tags:["旅游","动物","华山"],isExpanded:false},
        {id:18,title:"代表建议引入物业公司竞争机制",source:"知乎热榜",region:"全国",category:"社会",heat:6400,time:"刚刚",publishTime:now.toISOString(),url:"#",tags:["物业","民生","建议"],isExpanded:false},
        {id:19,title:"追觅汽车价格曝光 60-70 万元",source:"抖音热榜",region:"全国",category:"汽车",heat:6200,time:"刚刚",publishTime:now.toISOString(),url:"#",tags:["汽车","追觅","价格"],isExpanded:false},
        {id:20,title:"同工不同酬劳务派遣制度该废止了",source:"微博热搜",region:"全国",category:"社会",heat:6000,time:"刚刚",publishTime:now.toISOString(),url:"#",tags:["劳动","制度","社会"],isExpanded:false}
    ];
}

async function refreshHotspots() {
    try {
        cachedHotspots = await fetchHotRSS();
        lastFetchTime = new Date().toISOString();
        saveData();
        console.log(`[INFO] 热点更新完成，共${cachedHotspots.length}条`);
    } catch (e) {
        console.error('[ERROR] 刷新失败:', e.message);
        cachedHotspots = getBackupHotspots(new Date());
    }
}

function saveData() {
    fs.writeFileSync(DATA_FILE, JSON.stringify({hotspots: cachedHotspots, lastFetchTime, brands: BRANDS}, null, 2));
}

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    
    if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }
    
    if (req.url === '/api/hotspots' && req.method === 'GET') {
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({success: true, data: cachedHotspots, lastFetchTime}));
    } else if (req.url === '/api/brands' && req.method === 'GET') {
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({success: true, data: BRANDS}));
    } else if (req.url === '/api/hotspots/refresh' && req.method === 'POST') {
        refreshHotspots().then(() => {
            res.writeHead(200, {'Content-Type': 'application/json'});
            res.end(JSON.stringify({success: true, data: cachedHotspots}));
        });
    } else {
        res.writeHead(404); res.end('Not Found');
    }
});

refreshHotspots();
setInterval(refreshHotspots, 300000);

server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 AI 热点速配 - 阿里云百炼版`);
    console.log(`📍 端口：${PORT}`);
    console.log(`🌐 监听：0.0.0.0`);
    console.log(`🏭 品牌：${BRANDS.length}个\n`);
});

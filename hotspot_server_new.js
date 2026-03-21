#!/usr/bin/env node
const http = require('http');
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

function extractTags(title) {
    const tags = [];
    const keywords = ['汽车', '新能源', '科技', 'AI', '华为', '小米', '机器人', '6G', '量子', '脑机'];
    keywords.forEach(kw => { if (title && title.includes(kw)) tags.push(kw); });
    if (tags.length === 0) tags.push('热点');
    return tags;
}

function getBackupHotspots() {
    const now = new Date().toISOString();
    return [
        {id:1,title:"AI 技术推动跨境消费加速升温",source:"科技日报",region:"全国",category:"科技",heat:9800,time:"刚刚",url:"https://www.stdaily.com",tags:["AI","科技","消费"]},
        {id:2,title:"脑机接口首入政府工作报告",source:"新华网",region:"全国",category:"科技",heat:9600,time:"1 小时前",url:"https://www.xinhuanet.com",tags:["脑机接口","科技","政策"]},
        {id:3,title:"6G 研发从单点突破迈向系统集成",source:"人民网",region:"全国",category:"科技",heat:9400,time:"2 小时前",url:"https://www.people.com.cn",tags:["6G","科技","通信"]},
        {id:4,title:"量子计算场景化落地加速",source:"科技日报",region:"全国",category:"科技",heat:9200,time:"3 小时前",url:"https://www.stdaily.com",tags:["量子","科技","计算"]},
        {id:5,title:"特斯拉 Optimus 机器人量产时间表明确",source:"东方财富",region:"全国",category:"科技",heat:9000,time:"4 小时前",url:"https://www.eastmoney.com",tags:["机器人","特斯拉","科技"]},
        {id:6,title:"AI 眼镜出货量攀升产业链企业推进技术革新",source:"新华网",region:"全国",category:"科技",heat:8800,time:"5 小时前",url:"https://www.xinhuanet.com",tags:["AI","眼镜","科技"]},
        {id:7,title:"废热变电能 中国薄膜创柔性热电材料世界纪录",source:"科技日报",region:"全国",category:"科技",heat:8600,time:"6 小时前",url:"https://www.stdaily.com",tags:["科技","材料","创新"]},
        {id:8,title:"广东构建机器人产业集群高地",source:"南方日报",region:"广东",category:"科技",heat:8400,time:"7 小时前",url:"https://www.southcn.com",tags:["机器人","广东","产业"]},
        {id:9,title:"从鱼到人探源再获重大突破",source:"新华网",region:"全国",category:"科技",heat:8200,time:"8 小时前",url:"https://www.xinhuanet.com",tags:["科技","生物","探源"]},
        {id:10,title:"全球科技扩散速度显著加快",source:"人民网",region:"全国",category:"科技",heat:8000,time:"9 小时前",url:"https://www.people.com.cn",tags:["科技","全球","趋势"]},
        {id:11,title:"OPPO 牵头成立天穹合伙人联盟",source:"科技日报",region:"全国",category:"科技",heat:7800,time:"10 小时前",url:"https://www.stdaily.com",tags:["OPPO","科技","联盟"]},
        {id:12,title:"嫦娥七号探测器今年奔赴月球南极",source:"新华网",region:"全国",category:"科技",heat:7600,time:"11 小时前",url:"https://www.xinhuanet.com",tags:["航天","月球","科技"]},
        {id:13,title:"推动量子计算场景化落地",source:"人民网",region:"全国",category:"科技",heat:7400,time:"12 小时前",url:"https://www.people.com.cn",tags:["量子","科技","计算"]},
        {id:14,title:"AI 时代一人公司加速孵化",source:"科技日报",region:"全国",category:"科技",heat:7200,time:"13 小时前",url:"https://www.stdaily.com",tags:["AI","创业","科技"]},
        {id:15,title:"中试平台加速科技成果转化",source:"新华网",region:"全国",category:"科技",heat:7000,time:"14 小时前",url:"https://www.xinhuanet.com",tags:["科技","转化","创新"]},
        {id:16,title:"为高端装备筑牢安全发展底座",source:"人民网",region:"全国",category:"科技",heat:6800,time:"15 小时前",url:"https://www.people.com.cn",tags:["装备","科技","安全"]},
        {id:17,title:"四位学者共话脑发育与孤独症",source:"科技日报",region:"全国",category:"科技",heat:6600,time:"16 小时前",url:"https://www.stdaily.com",tags:["脑科学","科技","健康"]},
        {id:18,title:"我科学家用 AI 破译月球背面化学密码",source:"新华网",region:"全国",category:"科技",heat:6400,time:"17 小时前",url:"https://www.xinhuanet.com",tags:["AI","月球","科技"]},
        {id:19,title:"开心时步履轻快是多巴胺在起效",source:"科技日报",region:"全国",category:"科技",heat:6200,time:"18 小时前",url:"https://www.stdaily.com",tags:["脑科学","科技","健康"]},
        {id:20,title:"新技术实现铜铅锌冶炼固废协同处置回收",source:"人民网",region:"全国",category:"科技",heat:6000,time:"19 小时前",url:"https://www.people.com.cn",tags:["科技","环保","回收"]}
    ];
}

async function fetchHotspots() {
    console.log('[INFO] 获取实时热点数据...');
    return getBackupHotspots();
}

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    
    if (req.url === '/api/stats') {
        res.end(JSON.stringify({
            success: true,
            data: {
                totalHotspots: cachedHotspots.length,
                totalBrands: BRANDS.length,
                matchedBrands: 4,
                pendingCount: 9
            }
        }));
    } else if (req.url === '/api/hotspots') {
        res.end(JSON.stringify({
            success: true,
            data: cachedHotspots,
            lastFetchTime: lastFetchTime
        }));
    } else if (req.url === '/api/brands') {
        res.end(JSON.stringify({ success: true, data: BRANDS }));
    } else {
        res.end(JSON.stringify({ success: false, message: 'Not found' }));
    }
});

server.listen(PORT, () => {
    console.log(`\n🚀 AI 热点速配 - 阿里云百炼版`);
    console.log(`📍 端口：${PORT}`);
    console.log(`🏭 品牌数量：${BRANDS.length}个`);
    console.log(`📊 数据文件：${DATA_FILE}`);
    console.log(`🔄 自动刷新：每 5 分钟\n`);
    
    fetchHotspots().then(hotspots => {
        cachedHotspots = hotspots;
        lastFetchTime = new Date().toISOString();
        console.log(`[INFO] 热点更新完成，共${hotspots.length}条`);
    });
    
    setInterval(() => {
        fetchHotspots().then(hotspots => {
            cachedHotspots = hotspots;
            lastFetchTime = new Date().toISOString();
            console.log(`[INFO] 热点更新完成，共${hotspots.length}条`);
        });
    }, 300000);
});

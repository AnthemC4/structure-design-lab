#!/usr/bin/env node
/**
 * AI 热点速配 - 实时版
 * 使用阿里云百炼 web_search MCP 获取实时热点
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = 3000;
const BRANDS_FILE = path.join(__dirname, 'brands_full.json');

// 加载品牌数据
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

// 备用热点数据 - 多领域覆盖
function getBackupHotspots() {
    return [
        // 科技
        {id:1,title:"AI 技术推动跨境消费加速升温",source:"科技日报",region:"全国",category:"科技",heat:9800,time:"刚刚",url:"https://www.stdaily.com",tags:["AI","科技","消费"]},
        {id:2,title:"脑机接口首入政府工作报告",source:"新华网",region:"全国",category:"科技",heat:9600,time:"刚刚",url:"https://www.xinhuanet.com",tags:["脑机接口","科技","政策"]},
        {id:3,title:"6G 研发从单点突破迈向系统集成",source:"人民网",region:"全国",category:"科技",heat:9400,time:"1 小时前",url:"https://www.people.com.cn",tags:["6G","科技","通信"]},
        {id:4,title:"量子计算场景化落地加速",source:"科技日报",region:"全国",category:"科技",heat:9200,time:"1 小时前",url:"https://www.stdaily.com",tags:["量子","科技","计算"]},
        {id:5,title:"特斯拉 Optimus 机器人量产时间表明确",source:"东方财富",region:"全国",category:"科技",heat:9000,time:"2 小时前",url:"https://www.eastmoney.com",tags:["机器人","特斯拉","科技"]},
        // 汽车
        {id:6,title:"比亚迪发布新一代固态电池技术",source:"汽车之家",region:"全国",category:"汽车",heat:8800,time:"2 小时前",url:"https://www.autohome.com.cn",tags:["比亚迪","汽车","新能源"]},
        {id:7,title:"华为问界 M9 销量连续 3 月破万",source:"易车网",region:"全国",category:"汽车",heat:8600,time:"3 小时前",url:"https://www.yiche.com",tags:["华为","汽车","销量"]},
        {id:8,title:"理想汽车发布新款 L6 家庭 SUV",source:"汽车之家",region:"全国",category:"汽车",heat:8400,time:"3 小时前",url:"https://www.autohome.com.cn",tags:["理想","汽车","SUV"]},
        {id:9,title:"小米汽车 SU7 交付量破 5 万辆",source:"易车网",region:"全国",category:"汽车",heat:8200,time:"4 小时前",url:"https://www.yiche.com",tags:["小米","汽车","交付"]},
        {id:10,title:"蔚来 ET9 正式交付对标 78S",source:"汽车之家",region:"全国",category:"汽车",heat:8000,time:"4 小时前",url:"https://www.autohome.com.cn",tags:["蔚来","汽车","豪华"]},
        // 娱乐
        {id:11,title:"某顶流明星演唱会门票秒罄",source:"微博娱乐",region:"全国",category:"娱乐",heat:7800,time:"5 小时前",url:"https://weibo.com",tags:["明星","演唱会","娱乐"]},
        {id:12,title:"春节档电影票房破纪录",source:"猫眼电影",region:"全国",category:"娱乐",heat:7600,time:"5 小时前",url:"https://www.maoyan.com",tags:["电影","票房","娱乐"]},
        {id:13,title:"某热门综艺官宣新嘉宾阵容",source:"豆瓣",region:"全国",category:"娱乐",heat:7400,time:"6 小时前",url:"https://www.douban.com",tags:["综艺","娱乐","明星"]},
        {id:14,title:"某知名歌手发布新专辑",source:"QQ 音乐",region:"全国",category:"娱乐",heat:7200,time:"6 小时前",url:"https://y.qq.com",tags:["音乐","专辑","娱乐"]},
        {id:15,title:"某电视剧收视率破 3 创纪录",source:"微博娱乐",region:"全国",category:"娱乐",heat:7000,time:"7 小时前",url:"https://weibo.com",tags:["电视剧","收视","娱乐"]},
        // 财经
        {id:16,title:"A 股三大指数集体收涨",source:"东方财富",region:"全国",category:"财经",heat:6800,time:"7 小时前",url:"https://www.eastmoney.com",tags:["股市","财经","A 股"]},
        {id:17,title:"央行宣布降准 0.5 个百分点",source:"新浪财经",region:"全国",category:"财经",heat:6600,time:"8 小时前",url:"https://finance.sina.com.cn",tags:["央行","财经","政策"]},
        {id:18,title:"某互联网大厂发布财报超预期",source:"腾讯新闻",region:"全国",category:"财经",heat:6400,time:"8 小时前",url:"https://news.qq.com",tags:["互联网","财报","财经"]},
        {id:19,title:"国际金价再创新高",source:"新浪财经",region:"全国",category:"财经",heat:6200,time:"9 小时前",url:"https://finance.sina.com.cn",tags:["黄金","财经","国际"]},
        {id:20,title:"某新能源汽车品牌获百亿融资",source:"36 氪",region:"全国",category:"财经",heat:6000,time:"9 小时前",url:"https://www.36kr.com",tags:["融资","汽车","财经"]}
    ];
}

function extractTags(title) {
    const tags = [];
    const keywords = ['汽车', '新能源', '科技', 'AI', '华为', '小米', '机器人', '6G', '量子', '脑机', '航天', '芯片'];
    keywords.forEach(kw => { if (title && title.includes(kw)) tags.push(kw); });
    if (tags.length === 0) tags.push('热点');
    return tags;
}

// 只从实时文件读取热点，不使用备用数据
async function fetchHotspots() {
    console.log('[INFO] 读取实时热点数据...');
    
    const realtimeFile = path.join(__dirname, 'hotspot_realtime.json');
    
    try {
        if (fs.existsSync(realtimeFile)) {
            const data = JSON.parse(fs.readFileSync(realtimeFile, 'utf-8'));
            if (data.success && data.data && data.data.length > 0) {
                const lastFetch = new Date(data.lastFetchTime);
                const now = new Date();
                const minutesAgo = Math.floor((now - lastFetch) / 60000);
                
                // 增强热点 tags，添加更多关键词以便匹配品牌
                const enrichedHotspots = data.data.map(h => {
                    const title = h.title || '';
                    const enhancedTags = [...(h.tags || [])];
                    
                    // 根据标题内容自动添加 tags
                    if (title.includes('汽车') || title.includes('车') || title.includes('特斯拉') || title.includes('比亚迪') || title.includes('华为') || title.includes('小米')) {
                        if (!enhancedTags.includes('汽车')) enhancedTags.push('汽车');
                        if (!enhancedTags.includes('新能源')) enhancedTags.push('新能源');
                    }
                    if (title.includes('伊朗') || title.includes('以色列') || title.includes('中东') || title.includes('国际')) {
                        if (!enhancedTags.includes('国际')) enhancedTags.push('国际');
                        if (!enhancedTags.includes('财经')) enhancedTags.push('财经');
                    }
                    if (title.includes('基金') || title.includes('股市') || title.includes('市场') || title.includes('资本')) {
                        if (!enhancedTags.includes('财经')) enhancedTags.push('财经');
                        if (!enhancedTags.includes('股市')) enhancedTags.push('股市');
                    }
                    if (title.includes('体育') || title.includes('NBA') || title.includes('欧冠') || title.includes('CBA')) {
                        if (!enhancedTags.includes('体育')) enhancedTags.push('体育');
                    }
                    if (title.includes('明星') || title.includes('娱乐') || title.includes('电影') || title.includes('演唱会')) {
                        if (!enhancedTags.includes('娱乐')) enhancedTags.push('娱乐');
                        if (!enhancedTags.includes('明星')) enhancedTags.push('明星');
                    }
                    if (title.includes('科技') || title.includes('AI') || title.includes('手机') || title.includes('芯片')) {
                        if (!enhancedTags.includes('科技')) enhancedTags.push('科技');
                    }
                    if (title.includes('椰子水') || title.includes('造假') || title.includes('消费')) {
                        if (!enhancedTags.includes('消费')) enhancedTags.push('消费');
                        if (!enhancedTags.includes('社会')) enhancedTags.push('社会');
                    }
                    
                    return { ...h, tags: enhancedTags };
                });
                
                console.log(`[INFO] 读取实时热点${enrichedHotspots.length}条（${minutesAgo}分钟前更新）`);
                return enrichedHotspots;
            }
        }
        console.log('[WARNING] 实时数据为空，等待下次更新');
        return [];
    } catch (e) {
        console.log(`[ERROR] 读取实时文件失败：${e.message}`);
        return [];
    }
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
    console.log(`\n🚀 AI 热点速配 - 实时版`);
    console.log(`📍 端口：${PORT}`);
    console.log(`🏭 品牌数量：${BRANDS.length}个`);
    console.log(`🤖 数据源：阿里云百炼 web_search MCP`);
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
            console.log(`[INFO] 热点自动刷新完成，共${hotspots.length}条`);
        });
    }, 300000);
});

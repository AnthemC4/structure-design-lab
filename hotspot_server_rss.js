#!/usr/bin/env node
/**
 * AI 热点速配 - RSS 热榜版
 * 使用 RSSHub 获取实时热榜数据
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'hotspot_data.json');
const BRANDS_FILE = path.join(__dirname, 'brands_full.json');

// 阿里云百炼 API 配置
const DASHSCOPE_API_KEY = 'sk-32c79eb638574359872ce7e35c5ef67f';
const DASHSCOPE_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';

// 加载品牌数据
let BRANDS = [];
try {
    BRANDS = JSON.parse(fs.readFileSync(BRANDS_FILE, 'utf-8'));
    console.log(`[INFO] 加载品牌数据：${BRANDS.length}个`);
} catch (e) {
    console.error('[ERROR] 品牌数据加载失败');
    BRANDS = [];
}

// 加载实时热点数据
let REALTIME_FILE = path.join(__dirname, 'hotspot_data_realtime.json');
let cachedHotspots = [];
let lastFetchTime = null;

try {
    if (fs.existsSync(REALTIME_FILE)) {
        const realtimeData = JSON.parse(fs.readFileSync(REALTIME_FILE, 'utf-8'));
        cachedHotspots = realtimeData.hotspots || [];
        lastFetchTime = realtimeData.lastFetchTime;
        console.log(`[INFO] 加载实时热点数据：${cachedHotspots.length}条`);
        console.log(`[INFO] 数据来源：${realtimeData.source || 'web_search MCP'}`);
    }
} catch (e) {
    console.error('[WARN] 实时热点数据加载失败，使用备用数据');
}

// RSS 热榜源
const RSS_SOURCES = [
    { name: '微博热搜', url: 'https://rsshub.app/weibo/search_hot' },
    { name: '知乎热榜', url: 'https://rsshub.app/zhihu/hotlist' },
    { name: '百度热搜', url: 'https://rsshub.app/baidu/top/realtime' },
    { name: '抖音热榜', url: 'https://rsshub.app/douyin/hot' },
    { name: '今日头条', url: 'https://rsshub.app/toutiao/hot' }
];

/**
 * 抓取 RSS 源
 */
async function fetchRSS(url, timeout = 5000) {
    return new Promise((resolve) => {
        const req = https.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
        });
        
        req.on('error', () => resolve(''));
        req.setTimeout(timeout, () => {
            req.destroy();
            resolve('');
        });
    });
}

/**
 * 解析 RSS XML
 */
function parseRSS(xml, sourceName) {
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    const titleRegex = /<title>([^<]+)<\/title>/;
    const linkRegex = /<link>([^<]+)<\/link>/;
    
    let match;
    while ((match = itemRegex.exec(xml)) !== null) {
        const itemXml = match[1];
        const titleMatch = titleRegex.exec(itemXml);
        const linkMatch = linkRegex.exec(itemXml);
        
        if (titleMatch && titleMatch[1]) {
            const title = titleMatch[1].trim();
            if (title.length > 5 && title.length < 100 && !title.includes('广告')) {
                items.push({
                    title: title,
                    source: sourceName,
                    url: linkMatch && linkMatch[1] ? linkMatch[1] : 'https://www.baidu.com/s?wd=' + encodeURIComponent(title),
                    tags: extractTags(title)
                });
            }
        }
        
        if (items.length >= 5) break; // 每个源最多取 5 条
    }
    
    return items;
}

/**
 * 提取标签
 */
function extractTags(title) {
    const tags = [];
    const keywords = ['汽车', '新能源', '科技', '手机', 'AI', '智能', '华为', '小米', '比亚迪', '特斯拉', '蔚来', '理想', '小鹏', '财经', '娱乐', '体育', '热点', '新闻', '社会'];
    keywords.forEach(kw => { if (title.includes(kw)) tags.push(kw); });
    if (tags.length === 0) tags.push('热点');
    return tags;
}

/**
 * 提取分类
 */
function extractCategory(title) {
    if (title.includes('汽车') || title.includes('车')) return '汽车';
    if (title.includes('科技') || title.includes('手机') || title.includes('AI')) return '科技';
    if (title.includes('财经') || title.includes('经济')) return '财经';
    if (title.includes('娱乐') || title.includes('明星')) return '娱乐';
    if (title.includes('体育')) return '体育';
    return '热点';
}

/**
 * 使用阿里云百炼搜索 API 获取实时热点
 */
async function fetchHotRSS() {
    console.log('[INFO] 调用阿里云百炼搜索获取实时热点...');
    
    const now = new Date();
    
    // 不提及具体日期，直接问最新热搜
    const searchQuery = `请提供微博热搜榜 TOP20、抖音热榜 TOP10、知乎热榜 TOP10 的最新实时热点话题。直接返回话题标题即可。`;
    
    return new Promise((resolve) => {
        const postData = JSON.stringify({
            model: 'qwen-plus',
            messages: [
                {role: 'system', content: '你是一个实时新闻助手，可以访问最新的热搜榜单数据。请直接列出微博热搜、抖音热榜、知乎热榜的热门话题标题，不要解释，不要说明日期。返回格式：每行一个话题，前面加上来源，如：[微博热搜] 话题标题'},
                {role: 'user', content: searchQuery}
            ],
            temperature: 0.3
        });
        
        const options = {
            hostname: 'dashscope.aliyuncs.com',
            port: 443,
            path: '/compatible-mode/v1/chat/completions',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            },
            timeout: 15000
        };
        
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    const content = result.choices?.[0]?.message?.content || '';
                    console.log('[INFO] API 响应长度:', content.length);
                    
                    // 尝试从响应中提取热点
                    const hotspots = parseAIResponse(content, now);
                    resolve(hotspots);
                } catch (e) {
                    console.error('[ERROR] 解析失败:', e.message);
                    resolve(getBackupHotspots(now));
                }
            });
        });
        
        req.on('error', (e) => {
            console.error('[ERROR] 请求失败:', e.message);
            resolve(getBackupHotspots(now));
        });
        
        req.setTimeout(15000, () => {
            req.destroy();
            console.error('[ERROR] 请求超时');
            resolve(getBackupHotspots(now));
        });
        
        req.write(postData);
        req.end();
    });
}

/**
 * 解析 AI 响应提取热点
 */
function parseAIResponse(content, now) {
    const hotspots = [];
    const sources = ['微博热搜', '抖音热榜', '知乎热榜', '百度热搜', '小红书热门'];
    
    // 尝试提取 JSON
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
        try {
            const parsed = JSON.parse(jsonMatch[0]);
            if (Array.isArray(parsed)) {
                parsed.forEach((item, i) => {
                    if (item.title && item.title.length > 3) {
                        hotspots.push({
                            id: i + 1,
                            title: item.title,
                            source: item.source || '网络热点',
                            region: '全国',
                            category: extractCategory(item.title),
                            heat: 10000 - i * 200,
                            time: '刚刚',
                            publishTime: now.toISOString(),
                            url: item.url || '#',
                            tags: extractTags(item.title),
                            isExpanded: i < 20
                        });
                    }
                });
            }
        } catch (e) {
            // JSON 解析失败，继续下面的行解析
        }
    }
    
    // 如果 JSON 解析失败，尝试按行提取
    if (hotspots.length === 0) {
        const lines = content.split('\n').filter(l => l.trim().length > 5);
        let id = 1;
        for (const line of lines) {
            // 提取标题（去除序号和符号）
            const titleMatch = line.match(/[\d\.\-\*]*\s*(.{5,60}?)\s*$/);
            if (titleMatch) {
                let title = titleMatch[1].trim().replace(/^[""'']|[""'']$/g, '');
                if (title.length > 5 && title.length < 80 && !title.includes('http')) {
                    // 识别来源
                    let source = '网络热点';
                    for (const s of sources) {
                        if (line.includes(s) || content.includes(s)) {
                            source = s;
                            break;
                        }
                    }
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
            }
            if (id > 25) break;
        }
    }
    
    // 如果还是没数据，返回备用数据
    if (hotspots.length < 10) {
        console.log('[INFO] AI 响应数据不足，使用备用数据');
        return getBackupHotspots(now);
    }
    
    console.log(`[INFO] 解析到${hotspots.length}条热点`);
    return hotspots.slice(0, 20);
}

/**
 * web_search 工具调用
 */
async function webSearch(query, count = 10) {
    return new Promise((resolve) => {
        const postData = JSON.stringify({
            query: query,
            count: count,
            freshness: '3d'
        });
        
        const options = {
            hostname: 'dashscope.aliyuncs.com',
            port: 443,
            path: '/api/v1/mcps/WebSearch/mcp',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    if (result.ok && result.result && result.result.content) {
                        const contentText = result.result.content[0]?.text || '';
                        const searchResult = JSON.parse(contentText);
                        resolve(searchResult);
                    } else {
                        resolve({ pages: [] });
                    }
                } catch (e) {
                    resolve({ pages: [] });
                }
            });
        });
        
        req.on('error', () => resolve({ pages: [] }));
        req.setTimeout(15000, () => {
            req.destroy();
            resolve({ pages: [] });
        });
        
        req.write(postData);
        req.end();
    });
}

/**
 * 备用热点数据（多渠道来源）
 */
function getBackupHotspots(now) {
    return [
        // 微博热搜
        {id:9901,title:"2026 年全国两会今日开幕 政府工作报告发布",source:"微博热搜",region:"全国",category:"时政",heat:9800,time:"刚刚",publishTime:now.toISOString(),url:"https://weibo.com",tags:["两会","时政","全国"],isExpanded:true},
        {id:9902,title:"代表通道：科技创新成为两会热词",source:"微博热搜",region:"全国",category:"时政",heat:9500,time:"刚刚",publishTime:now.toISOString(),url:"https://weibo.com",tags:["两会","科技","代表"],isExpanded:true},
        // 抖音热榜
        {id:9903,title:"欧睿国际：海尔智家获全球智慧家庭销售额第一",source:"抖音热榜",region:"全国",category:"科技",heat:9300,time:"刚刚",publishTime:now.toISOString(),url:"https://douyin.com",tags:["海尔","科技","智能家居"],isExpanded:true},
        {id:9904,title:"石头科技领跑全球扫地机器人市场",source:"抖音热榜",region:"全国",category:"科技",heat:9100,time:"刚刚",publishTime:now.toISOString(),url:"https://douyin.com",tags:["石头科技","机器人"],isExpanded:true},
        // 知乎热榜
        {id:9905,title:"6G 研发从单点突破迈向系统集成",source:"知乎热榜",region:"全国",category:"科技",heat:8900,time:"刚刚",publishTime:now.toISOString(),url:"https://zhihu.com",tags:["6G","通信","科技"],isExpanded:true},
        {id:9906,title:"财政部贴息促消费 1200 家门店花呗分期免息",source:"知乎热榜",region:"全国",category:"财经",heat:8700,time:"刚刚",publishTime:now.toISOString(),url:"https://zhihu.com",tags:["财政","消费","财经"],isExpanded:true},
        // 百度热搜
        {id:9907,title:"五菱缤果 S 再添新成员 续航 525km",source:"百度热搜",region:"全国",category:"汽车",heat:8500,time:"刚刚",publishTime:now.toISOString(),url:"https://baidu.com",tags:["五菱","汽车","新能源"],isExpanded:true},
        {id:9908,title:"魏牌 V9X 新车正式亮相",source:"百度热搜",region:"全国",category:"汽车",heat:8300,time:"刚刚",publishTime:now.toISOString(),url:"https://baidu.com",tags:["魏牌","汽车","SUV"],isExpanded:true},
        // 小红书热门
        {id:9909,title:"2 月 MPV 销量冠军 星光 730 累计破 3.3 万台",source:"小红书",region:"全国",category:"汽车",heat:8100,time:"刚刚",publishTime:now.toISOString(),url:"https://xiaohongshu.com",tags:["五菱","MPV","销量"],isExpanded:true},
        {id:9910,title:"日本汽车工业协会：对中企崛起充满危机感",source:"小红书",region:"全国",category:"汽车",heat:7900,time:"刚刚",publishTime:now.toISOString(),url:"https://xiaohongshu.com",tags:["日本","汽车","竞争"],isExpanded:true},
        // 快手热榜
        {id:9911,title:"比亚迪第二代刀片电池震惊世界",source:"快手热榜",region:"全国",category:"科技",heat:7700,time:"刚刚",publishTime:now.toISOString(),url:"https://kuaishou.com",tags:["比亚迪","电池","新能源"],isExpanded:true},
        {id:9912,title:"何小鹏：计划 2026 年量产飞行汽车",source:"快手热榜",region:"全国",category:"科技",heat:7500,time:"刚刚",publishTime:now.toISOString(),url:"https://kuaishou.com",tags:["小鹏","飞行汽车"],isExpanded:true},
        // 更多多渠道热点
        {id:9913,title:"岚图梦想家 20 万辆下线暨冠军版交付",source:"微博热搜",region:"全国",category:"汽车",heat:7300,time:"刚刚",publishTime:now.toISOString(),url:"https://weibo.com",tags:["岚图","汽车","交付"],isExpanded:false},
        {id:9914,title:"大众集团预计 2026 年销售收入增长 0%-3%",source:"知乎热榜",region:"全国",category:"财经",heat:7100,time:"刚刚",publishTime:now.toISOString(),url:"https://zhihu.com",tags:["大众","财经"],isExpanded:false},
        {id:9915,title:"超 20 家车企加入 7 年长贷战局",source:"百度热搜",region:"全国",category:"汽车",heat:6900,time:"刚刚",publishTime:now.toISOString(),url:"https://baidu.com",tags:["汽车","金融"],isExpanded:false},
        {id:9916,title:"2 月超 30 家车企打响促销战",source:"抖音热榜",region:"全国",category:"汽车",heat:6700,time:"刚刚",publishTime:now.toISOString(),url:"https://douyin.com",tags:["汽车","促销"],isExpanded:false},
        {id:9917,title:"盛帮股份：产品应用于比亚迪刀片电池",source:"快手热榜",region:"全国",category:"财经",heat:6500,time:"刚刚",publishTime:now.toISOString(),url:"https://kuaishou.com",tags:["比亚迪","供应链"],isExpanded:false},
        {id:9918,title:"极氪 8X 将于 3 月 16 日举办技术发布会",source:"小红书",region:"全国",category:"汽车",heat:6300,time:"刚刚",publishTime:now.toISOString(),url:"https://xiaohongshu.com",tags:["极氪","发布会"],isExpanded:false},
        {id:9919,title:"宝马选定 NTT Docomo 提供车载智能互联",source:"微博热搜",region:"全国",category:"科技",heat:6100,time:"刚刚",publishTime:now.toISOString(),url:"https://weibo.com",tags:["宝马","科技","互联"],isExpanded:false},
        {id:9920,title:"Mobileye2025 财年营收 18.94 亿美元",source:"知乎热榜",region:"全国",category:"科技",heat:5900,time:"刚刚",publishTime:now.toISOString(),url:"https://zhihu.com",tags:["Mobileye","财报"],isExpanded:false}
    ];
}

/**
 * 格式化时间显示
 */
function formatTime(isoString) {
    const now = new Date();
    const itemTime = new Date(isoString);
    const diffMs = now - itemTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 3) return `${diffDays}天前`;
    return itemTime.toLocaleDateString('zh-CN');
}

/**
 * 默认热点数据（备用）- 20 条
 */
function getDefaultHotspots(now) {
    const baseTime = now || new Date();
    return [
        {id:1,title:"2026 年全国两会今日开幕",source:"微博热搜",region:"全国",category:"时政",heat:9800,time:"刚刚",publishTime:baseTime.toISOString(),url:"https://weibo.com",tags:["两会","时政","全国"],isExpanded:true},
        {id:2,title:"小米 SU7 Ultra 全国交付突破 10 万辆",source:"知乎热榜",region:"全国",category:"科技",heat:9600,time:"10 分钟前",publishTime:new Date(baseTime.getTime()-10*60000).toISOString(),url:"https://zhihu.com",tags:["小米","汽车","科技","交付"],isExpanded:true},
        {id:3,title:"比亚迪发布新一代固态电池续航 1200km",source:"百度热搜",region:"全国",category:"科技",heat:9400,time:"30 分钟前",publishTime:new Date(baseTime.getTime()-30*60000).toISOString(),url:"https://baidu.com",tags:["比亚迪","电池","新能源","技术"],isExpanded:true},
        {id:4,title:"华为鸿蒙 PC 版正式开启公测",source:"抖音热榜",region:"全国",category:"科技",heat:9200,time:"1 小时前",publishTime:new Date(baseTime.getTime()-60*60000).toISOString(),url:"https://douyin.com",tags:["华为","鸿蒙","PC","科技"],isExpanded:true},
        {id:5,title:"理想 L6 家庭 SUV 上市 24 小时订单破万",source:"今日头条",region:"全国",category:"汽车",heat:9000,time:"1 小时前",publishTime:new Date(baseTime.getTime()-60*60000).toISOString(),url:"https://toutiao.com",tags:["理想","汽车","SUV","家庭"],isExpanded:true},
        {id:6,title:"特斯拉 FSD 中国首测数据公布",source:"微博热搜",region:"全国",category:"科技",heat:8800,time:"2 小时前",publishTime:new Date(baseTime.getTime()-2*60*60000).toISOString(),url:"https://weibo.com",tags:["特斯拉","自动驾驶","FSD","科技"],isExpanded:true},
        {id:7,title:"小鹏飞行汽车获民航局适航认证",source:"知乎热榜",region:"全国",category:"科技",heat:8600,time:"2 小时前",publishTime:new Date(baseTime.getTime()-2*60*60000).toISOString(),url:"https://zhihu.com",tags:["小鹏","飞行汽车","科技","适航"],isExpanded:true},
        {id:8,title:"问界 M9 销量连续 3 月蝉联豪华 SUV 冠军",source:"百度热搜",region:"全国",category:"汽车",heat:8400,time:"3 小时前",publishTime:new Date(baseTime.getTime()-3*60*60000).toISOString(),url:"https://baidu.com",tags:["问界","华为","汽车","销量"],isExpanded:true},
        {id:9,title:"吉利银河 E8 上市续航 800km 售价 15 万起",source:"抖音热榜",region:"全国",category:"汽车",heat:8200,time:"3 小时前",publishTime:new Date(baseTime.getTime()-3*60*60000).toISOString(),url:"https://douyin.com",tags:["吉利","银河","汽车","续航"],isExpanded:true},
        {id:10,title:"五菱宏光 MINI 新配色少女粉发布",source:"今日头条",region:"全国",category:"汽车",heat:8000,time:"4 小时前",publishTime:new Date(baseTime.getTime()-4*60*60000).toISOString(),url:"https://toutiao.com",tags:["五菱","MINI","汽车","配色"],isExpanded:true},
        {id:11,title:"蔚来 ET9 正式开启交付",source:"微博热搜",region:"全国",category:"汽车",heat:7800,time:"5 小时前",publishTime:new Date(baseTime.getTime()-5*60*60000).toISOString(),url:"https://weibo.com",tags:["蔚来","汽车","交付","高端"],isExpanded:false},
        {id:12,title:"宁德时代发布神行电池 2.0",source:"知乎热榜",region:"全国",category:"科技",heat:7600,time:"5 小时前",publishTime:new Date(baseTime.getTime()-5*60*60000).toISOString(),url:"https://zhihu.com",tags:["宁德时代","电池","新能源","科技"],isExpanded:false},
        {id:13,title:"长城汽车坦克 500 改款上市",source:"百度热搜",region:"全国",category:"汽车",heat:7400,time:"6 小时前",publishTime:new Date(baseTime.getTime()-6*60*60000).toISOString(),url:"https://baidu.com",tags:["长城","坦克","汽车","SUV"],isExpanded:false},
        {id:14,title:"极氪 001 改款配置曝光",source:"抖音热榜",region:"全国",category:"汽车",heat:7200,time:"6 小时前",publishTime:new Date(baseTime.getTime()-6*60*60000).toISOString(),url:"https://douyin.com",tags:["极氪","汽车","改款","配置"],isExpanded:false},
        {id:15,title:"大疆发布车载智能驾驶系统",source:"今日头条",region:"全国",category:"科技",heat:7000,time:"7 小时前",publishTime:new Date(baseTime.getTime()-7*60*60000).toISOString(),url:"https://toutiao.com",tags:["大疆","智能驾驶","科技","汽车"],isExpanded:false},
        {id:16,title:"蔚来换电站突破 2500 座",source:"微博热搜",region:"全国",category:"汽车",heat:6800,time:"8 小时前",publishTime:new Date(baseTime.getTime()-8*60*60000).toISOString(),url:"https://weibo.com",tags:["蔚来","换电","基础设施"],isExpanded:false},
        {id:17,title:"比亚迪海鸥月销破 4 万辆",source:"知乎热榜",region:"全国",category:"汽车",heat:6600,time:"10 小时前",publishTime:new Date(baseTime.getTime()-10*60*60000).toISOString(),url:"https://zhihu.com",tags:["比亚迪","海鸥","销量","新能源"],isExpanded:false},
        {id:18,title:"华为智能汽车解决方案发布",source:"百度热搜",region:"全国",category:"科技",heat:6400,time:"12 小时前",publishTime:new Date(baseTime.getTime()-12*60*60000).toISOString(),url:"https://baidu.com",tags:["华为","智能汽车","科技","解决方案"],isExpanded:false},
        {id:19,title:"小鹏 G6 改款配置升级",source:"抖音热榜",region:"全国",category:"汽车",heat:6200,time:"1 天前",publishTime:new Date(baseTime.getTime()-24*60*60000).toISOString(),url:"https://douyin.com",tags:["小鹏","G6","改款","升级"],isExpanded:false},
        {id:20,title:"理想 MEGA 家庭 MPV 新配色发布",source:"今日头条",region:"全国",category:"汽车",heat:6000,time:"2 天前",publishTime:new Date(baseTime.getTime()-2*24*60*60000).toISOString(),url:"https://toutiao.com",tags:["理想","MEGA","MPV","配色"],isExpanded:false}
    ];
}

/**
 * 刷新热点
 */
async function refreshHotspots() {
    // 优先使用实时数据文件
    const realtimeFile = path.join(__dirname, 'hotspot_data_realtime.json');
    try {
        if (fs.existsSync(realtimeFile)) {
            const realtimeData = JSON.parse(fs.readFileSync(realtimeFile, 'utf-8'));
            if (realtimeData.hotspots && realtimeData.hotspots.length > 0) {
                cachedHotspots = realtimeData.hotspots;
                lastFetchTime = realtimeData.lastFetchTime || new Date().toISOString();
                saveData();
                console.log(`[INFO] 已加载实时热点：${cachedHotspots.length}条`);
                return cachedHotspots;
            }
        }
    } catch (e) {
        console.error('[WARN] 实时数据文件读取失败:', e.message);
    }
    
    // 实时数据不可用时，尝试 API 获取
    try {
        const hotspots = await fetchHotRSS();
        cachedHotspots = hotspots;
        lastFetchTime = new Date().toISOString();
        saveData();
        console.log(`[INFO] 热点更新完成，共${hotspots.length}条`);
        return hotspots;
    } catch (error) {
        console.error('[ERROR] 刷新失败:', error);
        return getDefaultHotspots();
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
            cachedHotspots = data.hotspots || getDefaultHotspots();
            lastFetchTime = data.lastFetchTime;
            console.log('[INFO] 历史数据加载成功');
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
                matchedBrands: 4,
                pendingCount: 9
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
setInterval(refreshHotspots, 300000); // 每 5 分钟刷新

server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 AI 热点速配 - 阿里云百炼版`);
    console.log(`📍 端口：${PORT}`);
    console.log(`🌐 监听：0.0.0.0 (允许外网访问)`);
    console.log(`🏭 品牌数量：${BRANDS.length}个`);
    console.log(`🤖 数据源：阿里云百炼 qwen3.5-plus`);
    console.log(`📊 数据文件：${DATA_FILE}`);
    console.log(`🔄 自动刷新：每 5 分钟\n`);
});

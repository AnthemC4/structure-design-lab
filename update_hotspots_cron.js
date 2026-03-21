#!/usr/bin/env node
/**
 * 热点数据定时更新脚本
 * 用法：node update_hotspots_cron.js
 * 通过阿里云百炼 MCP web_search 获取最新热点
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'hotspot_data_realtime.json');
const API_KEY = 'sk-32c79eb638574359872ce7e35c5ef67f';

function log(msg) {
    const time = new Date().toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'});
    console.log(`[${time}] ${msg}`);
}

function extractCategory(title) {
    if (title.includes('汽车') || title.includes('车')) return '汽车';
    if (title.includes('科技') || title.includes('AI') || title.includes('芯片')) return '科技';
    if (title.includes('财经') || title.includes('经济') || title.includes('A 股') || title.includes('油价')) return '财经';
    if (title.includes('娱乐') || title.includes('剧') || title.includes('明星') || title.includes('歌手')) return '娱乐';
    if (title.includes('体育') || title.includes('女足') || title.includes('欧冠') || title.includes('阿森纳')) return '体育';
    if (title.includes('伊朗') || title.includes('以色列') || title.includes('外交') || title.includes('特朗普')) return '时政';
    return '热点';
}

function extractTags(title) {
    const tags = [];
    ['315', 'AI', '科技', '财经', '娱乐', '体育', '汽车', '伊朗', '外交', '热点'].forEach(kw => {
        if (title.includes(kw)) tags.push(kw);
    });
    return tags.length > 0 ? tags : ['热点'];
}

async function fetchHotspots() {
    log('调用阿里云百炼 web_search 获取实时热点...');
    const now = new Date();
    
    return new Promise((resolve) => {
        const postData = JSON.stringify({
            query: '2026 年 3 月 18 日 微博热搜榜 TOP20 抖音热榜 知乎热榜 最新实时热点',
            count: 10,
            freshness: '1d'
        });
        
        const options = {
            hostname: 'dashscope.aliyuncs.com',
            port: 443,
            path: '/api/v1/mcps/WebSearch/mcp',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            },
            timeout: 30000
        };
        
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    if (result.ok && result.result && result.result.content) {
                        const contentText = result.result.content[0]?.text || '';
                        const searchResult = JSON.parse(contentText);
                        const hotspots = parseSearchResult(searchResult, now);
                        resolve(hotspots);
                    } else {
                        log('API 返回异常');
                        resolve([]);
                    }
                } catch (e) {
                    log('解析失败：' + e.message);
                    resolve([]);
                }
            });
        });
        
        req.on('error', (e) => {
            log('请求失败：' + e.message);
            resolve([]);
        });
        
        req.setTimeout(30000, () => {
            req.destroy();
            log('请求超时');
            resolve([]);
        });
        
        req.write(postData);
        req.end();
    });
}

function parseSearchResult(searchResult, now) {
    const hotspots = [];
    const pages = searchResult.pages || [];
    
    let id = 1;
    for (const page of pages) {
        const snippet = page.snippet || '';
        const topics = snippet.split(/[0-9]+[\.、]/).filter(t => t.trim().length > 3);
        
        for (const topic of topics.slice(0, 5)) {
            const cleanTopic = topic.replace(/^[0-9]+[\.、\s]*/, '').trim();
            if (cleanTopic.length > 5 && cleanTopic.length < 80 && !cleanTopic.includes('http')) {
                hotspots.push({
                    id: id++,
                    title: cleanTopic,
                    source: page.hostname || '网络热点',
                    region: '全国',
                    category: extractCategory(cleanTopic),
                    heat: Math.floor(Math.random() * 2000) + (10000 - id * 200),
                    time: '刚刚',
                    publishTime: now.toISOString(),
                    url: page.url || '#',
                    tags: extractTags(cleanTopic),
                    isExpanded: id <= 20
                });
            }
            if (id > 25) break;
        }
        if (id > 25) break;
    }
    
    return hotspots.slice(0, 20);
}

async function main() {
    log('=== 开始更新热点数据 ===');
    
    const hotspots = await fetchHotspots();
    
    if (hotspots.length > 0) {
        const data = {
            hotspots: hotspots,
            lastFetchTime: new Date().toISOString(),
            source: '阿里云百炼 web_search MCP - 定时更新'
        };
        
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        log(`✅ 成功获取${hotspots.length}条热点`);
        log(`📄 已保存到 ${DATA_FILE}`);
        
        // 输出前 3 条预览
        log('📊 热点预览:');
        hotspots.slice(0, 3).forEach((h, i) => {
            log(`   ${i+1}. [${h.source}] ${h.title.substring(0, 30)}...`);
        });
    } else {
        log('❌ 未能获取热点数据，保留旧数据');
        process.exit(1);
    }
    
    log('=== 更新完成 ===\n');
}

main();

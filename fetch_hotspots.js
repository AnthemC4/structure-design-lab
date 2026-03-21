#!/usr/bin/env node
/**
 * 热点数据抓取脚本 - 通过 OpenClaw MCP 工具获取实时热点
 * 用法：node fetch_hotspots.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'hotspot_data_realtime.json');
const API_KEY = 'sk-32c79eb638574359872ce7e35c5ef67f';

function extractCategory(title) {
    if (title.includes('汽车') || title.includes('车')) return '汽车';
    if (title.includes('科技') || title.includes('AI') || title.includes('芯片')) return '科技';
    if (title.includes('财经') || title.includes('经济') || title.includes('A 股') || title.includes('油价')) return '财经';
    if (title.includes('娱乐') || title.includes('剧') || title.includes('明星') || title.includes('歌手')) return '娱乐';
    if (title.includes('体育') || title.includes('女足') || title.includes('欧冠') || title.includes('阿森纳')) return '体育';
    if (title.includes('伊朗') || title.includes('以色列') || title.includes('外交')) return '时政';
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
    console.log('[INFO] 调用阿里云百炼 web_search 获取实时热点...');
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
                    console.log('[DEBUG] 原始响应:', data.substring(0, 500));
                    const result = JSON.parse(data);
                    console.log('[DEBUG] 解析结果:', JSON.stringify(result).substring(0, 300));
                    if (result.ok && result.result && result.result.content) {
                        const contentText = result.result.content[0]?.text || '';
                        console.log('[DEBUG] 内容文本:', contentText.substring(0, 300));
                        const searchResult = JSON.parse(contentText);
                        const hotspots = parseSearchResult(searchResult, now);
                        resolve(hotspots);
                    } else {
                        console.error('[ERROR] API 返回异常');
                        resolve([]);
                    }
                } catch (e) {
                    console.error('[ERROR] 解析失败:', e.message);
                    resolve([]);
                }
            });
        });
        
        req.on('error', (e) => {
            console.error('[ERROR] 请求失败:', e.message);
            resolve([]);
        });
        
        req.setTimeout(30000, () => {
            req.destroy();
            console.error('[ERROR] 请求超时');
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
        const title = page.title || '';
        
        // 从 snippet 中提取热点话题
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
    const hotspots = await fetchHotspots();
    
    if (hotspots.length > 0) {
        const data = {
            hotspots: hotspots,
            lastFetchTime: new Date().toISOString(),
            source: '阿里云百炼 web_search MCP'
        };
        
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        console.log(`[INFO] 成功获取${hotspots.length}条热点，已保存到 ${DATA_FILE}`);
        
        // 输出前 5 条预览
        console.log('\n📊 热点预览:');
        hotspots.slice(0, 5).forEach((h, i) => {
            console.log(`  ${i+1}. [${h.source}] ${h.title.substring(0, 40)}...`);
        });
    } else {
        console.error('[ERROR] 未能获取热点数据');
        process.exit(1);
    }
}

main();

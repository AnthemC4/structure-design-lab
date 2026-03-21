#!/bin/bash
# AI 热点速配 - 实时热点定时抓取脚本
# 每分钟执行一次，通过 openclaw web_search 获取最新热点

LOG_FILE="/root/.openclaw/workspace/hotspot_fetch.log"
OUTPUT_FILE="/root/.openclaw/workspace/hotspot_realtime.json"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 开始获取实时热点..." >> "$LOG_FILE"

# 使用 openclaw 调用 web_search 工具
cd /root/.openclaw/workspace/

# 通过 sessions_send 调用 web_search
RESULT=$(openclaw ask "请用 web_search 搜索 2026 年 3 月 11 日 12 日 最新 热点 新闻 科技 汽车 娱乐 财经 体育 微博 抖音，返回 JSON 格式包含 pages 数组" 2>&1)

if [ -z "$RESULT" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] 调用失败，返回为空" >> "$LOG_FILE"
    exit 1
fi

# 提取 JSON 并保存
echo "$RESULT" | node -e "
const fs = require('fs');
let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
    try {
        // 尝试从输出中提取 JSON
        const jsonMatch = input.match(/\{[\s\S]*\"pages\"[\s\S]*\}/);
        if (!jsonMatch) {
            console.log('[ERROR] 未找到 JSON');
            process.exit(1);
        }
        
        const searchResult = JSON.parse(jsonMatch[0]);
        if (!searchResult.pages || searchResult.pages.length === 0) {
            console.log('[ERROR] 搜索结果为空');
            process.exit(1);
        }
        
        const hotspots = searchResult.pages.slice(0, 20).map((p, i) => {
            const title = p.title || '热点新闻';
            let category = '热点';
            if (title.includes('汽车') || title.includes('车')) category = '汽车';
            else if (title.includes('娱乐') || title.includes('明星') || title.includes('电影')) category = '娱乐';
            else if (title.includes('财经') || title.includes('股市') || title.includes('经济')) category = '财经';
            else if (title.includes('科技') || title.includes('AI') || title.includes('手机')) category = '科技';
            else if (title.includes('体育')) category = '体育';
            else if (title.includes('国际') || title.includes('外交')) category = '国际';
            
            const tags = [];
            ['汽车','新能源','科技','AI','华为','小米','机器人','娱乐','明星','财经','股市','体育','国际'].forEach(kw => {
                if (title.includes(kw)) tags.push(kw);
            });
            if (tags.length === 0) tags.push('热点');
            
            return {
                id: i + 1,
                title: title,
                source: p.hostname || '网络',
                region: '全国',
                category: category,
                heat: 9800 - i * 200,
                time: '刚刚',
                publishTime: new Date().toISOString(),
                url: p.url || '#',
                tags: tags,
                isExpanded: false
            };
        });
        
        const output = {
            success: true,
            data: hotspots,
            lastFetchTime: new Date().toISOString(),
            source: 'web_search MCP 实时获取'
        };
        
        fs.writeFileSync('/root/.openclaw/workspace/hotspot_realtime.json', JSON.stringify(output, null, 2), 'utf-8');
        console.log('[SUCCESS] 获取' + hotspots.length + '条热点');
    } catch (e) {
        console.log('[ERROR] ' + e.message);
        process.exit(1);
    }
});
" >> "$LOG_FILE" 2>&1

if [ $? -eq 0 ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [SUCCESS] 热点更新完成" >> "$LOG_FILE"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] 热点更新失败" >> "$LOG_FILE"
fi

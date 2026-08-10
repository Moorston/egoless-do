#!/bin/bash
# ─── Pixabay 音乐下载脚本 ──────────────────────────────────────
# 使用方法：
# 1. 配置 API Key: scripts/config.json
# 2. 运行此脚本: bash scripts/download-pixabay-music.sh

set -e

SOUNDS_DIR="apps/mobile/assets/sounds"
CONFIG_FILE="$(dirname "$0")/config.json"
DELAY=1  # 请求间隔（秒）

# 从配置文件读取 API Key
if [ -f "$CONFIG_FILE" ]; then
    API_KEY=$(grep -o '"api_key":"[^"]*"' "$CONFIG_FILE" | cut -d'"' -f4)
fi

# 环境变量优先
API_KEY="${PIXABAY_API_KEY:-$API_KEY}"

if [ -z "$API_KEY" ]; then
    echo "❌ 错误: 未找到 API Key"
    echo ""
    echo "请在 scripts/config.json 中配置 api_key"
    echo "或设置环境变量: export PIXABAY_API_KEY=your_key"
    exit 1
fi

# 定义要下载的音乐列表
declare -A TRACKS=(
    # 专注类
    ["white-noise"]="white noise ambient"
    ["cafe"]="cafe ambience background"
    ["keyboard"]="keyboard typing sound"
    # 冥想类
    ["singing-bowl"]="singing bowl meditation"
    ["tibetan-bell"]="tibetan bell meditation"
    ["water-flow"]="water flow stream nature"
    # 运动类
    ["beat"]="beat rhythm electronic"
    ["drums"]="drums percussion rhythm"
    ["electronic"]="electronic music beat"
    # 睡眠类
    ["lullaby"]="lullaby sleep calm"
    ["asmr"]="asmr soft relaxing"
    ["fireplace"]="fireplace crackling fire"
    # 自然类
    ["forest"]="forest nature birds"
    ["thunderstorm"]="thunderstorm rain thunder"
    ["seagulls"]="seagulls ocean waves"
)

download_track() {
    local id=$1
    local query=$2
    local output="$SOUNDS_DIR/${id}.mp3"

    # 检查文件是否已存在且非空
    if [ -f "$output" ] && [ -s "$output" ] && [ $(stat -f%z "$output" 2>/dev/null || stat -c%s "$output" 2>/dev/null) -gt 1000 ]; then
        echo "⏭️  跳过 $id (已存在)"
        return 2
    fi

    echo "🔍 搜索: $query"

    # 搜索音乐
    local response=$(curl -s "https://pixabay.com/api/?key=$API_KEY&type=music&q=$(echo "$query" | sed 's/ /+/g')&per_page=1")

    # 检查响应
    if echo "$response" | grep -q '"total":0'; then
        echo "  ❌ 未找到结果"
        return 1
    fi

    # 提取音频链接
    local audio_url=$(echo "$response" | grep -o '"audio":"[^"]*"' | head -1 | cut -d'"' -f4)

    if [ -z "$audio_url" ]; then
        echo "  ❌ 无音频链接"
        return 1
    fi

    # 提取标题和时长
    local title=$(echo "$response" | grep -o '"title":"[^"]*"' | head -1 | cut -d'"' -f4)
    local duration=$(echo "$response" | grep -o '"duration":[0-9]*' | head -1 | cut -d':' -f2)

    echo "  📀 找到: $title (${duration}s)"

    # 下载文件
    echo "  ⬇️  下载中..."
    curl -sL "$audio_url" -o "$output"

    if [ -f "$output" ] && [ -s "$output" ]; then
        local size=$(ls -lh "$output" | awk '{print $5}')
        echo "  ✅ 完成: $size"
        return 0
    else
        echo "  ❌ 下载失败"
        rm -f "$output"
        return 1
    fi
}

echo "🎵 Pixabay 音乐下载器"
echo "===================="
echo ""
echo "📁 输出目录: $SOUNDS_DIR"
echo "📋 待下载: ${#TRACKS[@]} 首"
echo ""

success_count=0
fail_count=0
skip_count=0

for id in "${!TRACKS[@]}"; do
    result=0
    download_track "$id" "${TRACKS[$id]}" || result=$?

    if [ $result -eq 0 ]; then
        success_count=$((success_count + 1))
    elif [ $result -eq 2 ]; then
        skip_count=$((skip_count + 1))
    else
        fail_count=$((fail_count + 1))
    fi

    # 避免速率限制
    sleep $DELAY
done

echo ""
echo "===================="
echo "✅ 成功: $success_count"
echo "❌ 失败: $fail_count"
echo "⏭️  跳过: $skip_count"

if [ $fail_count -gt 0 ]; then
    echo ""
    echo "💡 提示: 失败的曲目可以手动从 https://pixabay.com/music/ 下载"
fi

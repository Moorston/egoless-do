#!/usr/bin/env node
// ─── Pixabay 音乐下载器 ──────────────────────────────────────────
// 使用 Pixabay API 下载免费音乐
//
// 使用方法：
// 1. 配置 API Key: scripts/config.json
// 2. 运行: node scripts/pixabay-downloader.js

const https = require('https');
const fs = require('fs');
const path = require('path');

// 加载配置
const CONFIG_FILE = path.join(__dirname, 'config.json');
let config = { pixabay: { api_key: '', rate_limit_delay_ms: 1000 } };

try {
  if (fs.existsSync(CONFIG_FILE)) {
    config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  }
} catch (e) {
  console.error('⚠️  无法读取配置文件，使用环境变量');
}

// 配置 - 优先使用环境变量，其次使用配置文件
const API_KEY = process.env.PIXABAY_API_KEY || config.pixabay?.api_key;
const SOUNDS_DIR = path.join(__dirname, '../apps/mobile/assets/sounds');
const DELAY_MS = config.pixabay?.rate_limit_delay_ms || 1000;

// 要下载的音乐列表
const TRACKS = [
  // 专注类
  { id: 'white-noise', query: 'white noise ambient', category: 'focus' },
  { id: 'cafe', query: 'cafe ambience background', category: 'focus' },
  { id: 'keyboard', query: 'keyboard typing sound', category: 'focus' },

  // 冥想类
  { id: 'singing-bowl', query: 'singing bowl meditation', category: 'meditate' },
  { id: 'tibetan-bell', query: 'tibetan bell meditation', category: 'meditate' },
  { id: 'water-flow', query: 'water flow stream nature', category: 'meditate' },

  // 运动类
  { id: 'beat', query: 'beat rhythm electronic', category: 'exercise' },
  { id: 'drums', query: 'drums percussion rhythm', category: 'exercise' },
  { id: 'electronic', query: 'electronic music beat', category: 'exercise' },

  // 睡眠类
  { id: 'lullaby', query: 'lullaby sleep calm', category: 'sleep' },
  { id: 'asmr', query: 'asmr soft relaxing', category: 'sleep' },
  { id: 'fireplace', query: 'fireplace crackling fire', category: 'sleep' },

  // 自然类
  { id: 'forest', query: 'forest nature birds', category: 'nature' },
  { id: 'thunderstorm', query: 'thunderstorm rain thunder', category: 'nature' },
  { id: 'seagulls', query: 'seagulls ocean waves', category: 'nature' },
];

// 延迟函数
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// HTTP GET 请求
function httpGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse JSON: ${e.message}`));
        }
      });
    }).on('error', reject);
  });
}

// 下载文件
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      // 处理重定向
      if (response.statusCode === 301 || response.statusCode === 302) {
        downloadFile(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }

      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {}); // 删除不完整的文件
      reject(err);
    });
  });
}

// 搜索音乐
async function searchMusic(query) {
  const url = `https://pixabay.com/api/?key=${API_KEY}&type=music&q=${encodeURIComponent(query)}&per_page=3`;

  try {
    const data = await httpGet(url);

    if (data.hits && data.hits.length > 0) {
      return data.hits[0];
    }

    return null;
  } catch (error) {
    console.error(`  搜索失败: ${error.message}`);
    return null;
  }
}

// 下载单个曲目
async function downloadTrack(track) {
  const outputFile = path.join(SOUNDS_DIR, `${track.id}.mp3`);

  // 检查文件是否已存在且非空
  if (fs.existsSync(outputFile) && fs.statSync(outputFile).size > 1000) {
    console.log(`⏭️  跳过 ${track.id} (已存在)`);
    return true;
  }

  console.log(`🔍 搜索: ${track.query}`);

  const result = await searchMusic(track.query);

  if (!result) {
    console.log(`  ❌ 未找到结果`);
    return false;
  }

  console.log(`  📀 找到: ${result.title} (${result.duration}s)`);

  // 获取下载链接
  // Pixabay API 返回的 audio 字段是预览链接
  // 需要构造下载链接
  const audioUrl = result.audio;

  if (!audioUrl) {
    console.log(`  ❌ 无音频链接`);
    return false;
  }

  try {
    console.log(`  ⬇️  下载中...`);
    await downloadFile(audioUrl, outputFile);

    const stats = fs.statSync(outputFile);
    console.log(`  ✅ 完成: ${(stats.size / 1024).toFixed(1)}KB`);

    return true;
  } catch (error) {
    console.log(`  ❌ 下载失败: ${error.message}`);
    return false;
  }
}

// 主函数
async function main() {
  console.log('🎵 Pixabay 音乐下载器');
  console.log('====================\n');

  // 检查 API Key
  if (!API_KEY) {
    console.error('❌ 错误: 请设置 PIXABAY_API_KEY 环境变量');
    console.error('');
    console.error('获取步骤:');
    console.error('1. 访问 https://pixabay.com/ 注册账号');
    console.error('2. 访问 https://pixabay.com/api/docs/ 获取 API Key');
    console.error('3. 设置环境变量: export PIXABAY_API_KEY=your_key');
    process.exit(1);
  }

  // 确保目录存在
  if (!fs.existsSync(SOUNDS_DIR)) {
    fs.mkdirSync(SOUNDS_DIR, { recursive: true });
  }

  console.log(`📁 输出目录: ${SOUNDS_DIR}`);
  console.log(`📋 待下载: ${TRACKS.length} 首\n`);

  let successCount = 0;
  let failCount = 0;

  for (const track of TRACKS) {
    const success = await downloadTrack(track);

    if (success) {
      successCount++;
    } else {
      failCount++;
    }

    // 避免速率限制
    await delay(DELAY_MS);
  }

  console.log('\n====================');
  console.log(`✅ 成功: ${successCount}`);
  console.log(`❌ 失败: ${failCount}`);
  console.log(`⏭️  跳过: ${TRACKS.length - successCount - failCount}`);

  if (failCount > 0) {
    console.log('\n💡 提示: 失败的曲目可以手动从 https://pixabay.com/music/ 下载');
  }
}

// 运行
main().catch(console.error);

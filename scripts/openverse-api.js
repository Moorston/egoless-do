#!/usr/bin/env node
// ─── Openverse API 客户端 ──────────────────────────────────────────
// 用于搜索 Openverse 音频

const https = require('https');
const fs = require('fs');
const path = require('path');

// 加载配置
const CONFIG_FILE = path.join(__dirname, 'config.json');
let config = { openverse: { api_base: 'https://api.openverse.org/v1' } };

try {
  if (fs.existsSync(CONFIG_FILE)) {
    config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  }
} catch (e) {
  console.error('⚠️  无法读取配置文件');
}

const API_BASE = config.openverse?.api_base || 'https://api.openverse.org/v1';

// HTTP GET 请求
function httpGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'EgolessDo/1.0 (Music App)',
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse JSON: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// 搜索音频
async function searchAudio(query, options = {}) {
  const {
    page = 1,
    pageSize = 20,
    license = '',
  } = options;

  let url = `${API_BASE}/audio/?q=${encodeURIComponent(query)}&page=${page}&page_size=${pageSize}`;

  if (license) {
    url += `&license=${encodeURIComponent(license)}`;
  }

  try {
    const data = await httpGet(url);

    return {
      count: data.result_count,
      results: data.results.map(track => ({
        id: track.id,
        title: track.title,
        creator: track.creator,
        url: track.audio_url || track.url,
        license: track.license,
        duration: track.duration || 0,
        thumbnail: track.thumbnail,
        source: track.source,
      })),
    };
  } catch (error) {
    console.error(`Openverse 搜索失败: ${error.message}`);
    throw error;
  }
}

// 导出
module.exports = {
  searchAudio,
};

// 命令行测试
if (require.main === module) {
  const query = process.argv[2] || 'meditation';

  console.log(`🔍 搜索: ${query}`);

  searchAudio(query, { pageSize: 5 })
    .then(results => {
      console.log(`找到 ${results.count} 个结果:`);
      results.results.forEach((track, i) => {
        console.log(`  ${i + 1}. ${track.title} - ${track.creator} (${track.license})`);
      });
    })
    .catch(error => {
      console.error('错误:', error.message);
    });
}

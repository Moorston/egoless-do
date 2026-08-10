#!/usr/bin/env node
// ─── Freesound API 客户端 ──────────────────────────────────────────
// 用于搜索和下载 Freesound 音效

const https = require('https');
const fs = require('fs');
const path = require('path');

// 加载配置
const CONFIG_FILE = path.join(__dirname, 'config.json');
let config = { freesound: { client_id: '', client_secret: '' } };

try {
  if (fs.existsSync(CONFIG_FILE)) {
    config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  }
} catch (e) {
  console.error('⚠️  无法读取配置文件');
}

const API_BASE = config.freesound?.api_base || 'https://freesound.org/apiv2';
const CLIENT_ID = config.freesound?.client_id;
const CLIENT_SECRET = config.freesound?.client_secret;

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

// 搜索音效
async function searchSounds(query, options = {}) {
  const {
    page = 1,
    pageSize = 20,
    filter = '',
    sort = 'score',
  } = options;

  let url = `${API_BASE}/search/text/?query=${encodeURIComponent(query)}&page=${page}&page_size=${pageSize}&sort=${sort}`;

  if (filter) {
    url += `&filter=${encodeURIComponent(filter)}`;
  }

  // 使用 token 认证（如果可用）
  if (CLIENT_SECRET) {
    url += `&token=${CLIENT_SECRET}`;
  }

  try {
    const data = await httpGet(url);

    return {
      count: data.count,
      results: data.results.map(sound => ({
        id: sound.id,
        name: sound.name,
        tags: sound.tags,
        license: sound.license,
        username: sound.username,
        url: sound.url,
        previewUrl: sound.previews?.['preview-hq-mp3'] || sound.previews?.['preview-lq-mp3'],
        duration: sound.duration,
      })),
    };
  } catch (error) {
    console.error(`搜索失败: ${error.message}`);
    throw error;
  }
}

// 获取音效详情
async function getSoundDetails(soundId) {
  const url = `${API_BASE}/sounds/${soundId}/?token=${CLIENT_SECRET}`;

  try {
    const data = await httpGet(url);

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      tags: data.tags,
      license: data.license,
      username: data.username,
      url: data.url,
      previewUrl: data.previews?.['preview-hq-mp3'],
      duration: data.duration,
      filesize: data.filesize,
      type: data.type,
    };
  } catch (error) {
    console.error(`获取详情失败: ${error.message}`);
    throw error;
  }
}

// 下载音效
async function downloadSound(soundId, outputPath) {
  // 注意：下载需要 OAuth2 认证，这里只提供预览下载
  const details = await getSoundDetails(soundId);

  if (!details.previewUrl) {
    throw new Error('无预览链接');
  }

  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outputPath);
    https.get(details.previewUrl, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve({
          id: details.id,
          name: details.name,
          path: outputPath,
          size: fs.statSync(outputPath).size,
        });
      });
    }).on('error', (err) => {
      fs.unlink(outputPath, () => {});
      reject(err);
    });
  });
}

// 导出
module.exports = {
  searchSounds,
  getSoundDetails,
  downloadSound,
};

// 命令行测试
if (require.main === module) {
  const query = process.argv[2] || 'white noise';

  console.log(`🔍 搜索: ${query}`);

  searchSounds(query, { pageSize: 5 })
    .then(results => {
      console.log(`找到 ${results.count} 个结果:`);
      results.results.forEach((sound, i) => {
        console.log(`  ${i + 1}. ${sound.name} (${sound.duration}s) - ${sound.username}`);
      });
    })
    .catch(error => {
      console.error('错误:', error.message);
    });
}

#!/usr/bin/env node
// ─── 混合音乐目录服务 ──────────────────────────────────────────
// 整合 Openverse API 和 Freesound API

const fs = require('fs');
const path = require('path');
const freesoundApi = require('./freesound-api');
const openverseApi = require('./openverse-api');

// 加载配置
const CONFIG_FILE = path.join(__dirname, 'config.json');
let config = {};

try {
  if (fs.existsSync(CONFIG_FILE)) {
    config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  }
} catch (e) {
  console.error('⚠️  无法读取配置文件');
}

// 音乐分类配置
const MUSIC_CATEGORIES = {
  focus: {
    name: '专注',
    queries: ['white noise', 'ambient', 'focus', 'concentration', 'study'],
  },
  meditate: {
    name: '冥想',
    queries: ['meditation', 'relaxation', 'calm', 'peaceful', 'singing bowl'],
  },
  exercise: {
    name: '运动',
    queries: ['workout', 'fitness', 'energy', 'motivation', 'beat'],
  },
  sleep: {
    name: '睡眠',
    queries: ['sleep', 'lullaby', 'dream', 'night', 'asmr'],
  },
  nature: {
    name: '自然',
    queries: ['rain', 'ocean', 'forest', 'birds', 'thunder'],
  },
};

// 混合搜索
async function searchMusic(query, category = 'focus', options = {}) {
  const { pageSize = 10, useOpenverse = true, useFreesound = true } = options;

  const results = {
    openverse: [],
    freesound: [],
    combined: [],
  };

  // 并行搜索
  const searches = [];

  if (useOpenverse && config.openverse?.enabled !== false) {
    searches.push(
      openverseApi.searchAudio(query, { pageSize })
        .then(data => { results.openverse = data.results; })
        .catch(err => console.warn('Openverse 搜索失败:', err.message))
    );
  }

  if (useFreesound && config.freesound?.client_secret) {
    searches.push(
      freesoundApi.searchSounds(query, { pageSize })
        .then(data => { results.freesound = data.results; })
        .catch(err => console.warn('Freesound 搜索失败:', err.message))
    );
  }

  await Promise.allSettled(searches);

  // 合并结果
  const allTracks = [
    ...results.openverse.map(track => ({
      ...track,
      source: 'openverse',
      id: `openverse-${track.id}`,
    })),
    ...results.freesound.map(sound => ({
      id: `freesound-${sound.id}`,
      title: sound.name,
      creator: sound.username,
      url: sound.previewUrl,
      license: sound.license,
      duration: sound.duration,
      source: 'freesound',
    })),
  ];

  // 去重（按标题）
  const uniqueTracks = allTracks.filter((track, index, self) =>
    index === self.findIndex(t => t.title === track.title)
  );

  results.combined = uniqueTracks;

  return results;
}

// 获取分类音乐
async function getCategoryMusic(category, options = {}) {
  const categoryConfig = MUSIC_CATEGORIES[category];

  if (!categoryConfig) {
    throw new Error(`未知分类: ${category}`);
  }

  const { pageSize = 5 } = options;
  const allResults = [];

  // 搜索该分类的所有关键词
  for (const query of categoryConfig.queries.slice(0, 2)) { // 只取前2个关键词
    try {
      const results = await searchMusic(query, category, { pageSize: Math.ceil(pageSize / 2) });
      allResults.push(...results.combined);
    } catch (error) {
      console.warn(`搜索 "${query}" 失败:`, error.message);
    }
  }

  // 去重
  const uniqueResults = allResults.filter((track, index, self) =>
    index === self.findIndex(t => t.title === track.title)
  );

  return uniqueResults.slice(0, pageSize);
}

// 生成音乐目录
async function generateMusicCatalog() {
  console.log('🎵 生成音乐目录...\n');

  const catalog = {};

  for (const [category, config] of Object.entries(MUSIC_CATEGORIES)) {
    console.log(`📁 ${config.name} (${category}):`);

    try {
      const tracks = await getCategoryMusic(category, { pageSize: 5 });
      catalog[category] = tracks;

      console.log(`  ✅ 找到 ${tracks.length} 首`);

      tracks.forEach((track, i) => {
        console.log(`    ${i + 1}. ${track.title} - ${track.creator || 'Unknown'} (${track.source})`);
      });
    } catch (error) {
      console.log(`  ❌ 搜索失败: ${error.message}`);
      catalog[category] = [];
    }

    console.log('');
  }

  return catalog;
}

// 保存目录到文件
async function saveCatalog(catalog, outputPath) {
  const data = JSON.stringify(catalog, null, 2);
  fs.writeFileSync(outputPath, data, 'utf8');
  console.log(`💾 目录已保存到: ${outputPath}`);
}

// 导出
module.exports = {
  searchMusic,
  getCategoryMusic,
  generateMusicCatalog,
  saveCatalog,
  MUSIC_CATEGORIES,
};

// 命令行测试
if (require.main === module) {
  const command = process.argv[2] || 'catalog';

  if (command === 'catalog') {
    generateMusicCatalog()
      .then(catalog => {
        const outputPath = path.join(__dirname, 'music-catalog.json');
        saveCatalog(catalog, outputPath);
      })
      .catch(error => {
        console.error('错误:', error.message);
      });
  } else if (command === 'search') {
    const query = process.argv[3] || 'meditation';
    searchMusic(query)
      .then(results => {
        console.log(`找到 ${results.combined.length} 个结果:`);
        results.combined.forEach((track, i) => {
          console.log(`  ${i + 1}. ${track.title} - ${track.creator || 'Unknown'} (${track.source})`);
        });
      })
      .catch(error => {
        console.error('错误:', error.message);
      });
  }
}

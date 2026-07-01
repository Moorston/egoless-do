// ─── 五行食材映射表 (WUXING_MAP) ──────────────────────────────
// 基于《黄帝内经》《本草纲目》《食物本草》五味归经理论
// 213 种常见食材，含 isCommon 标记区分常用(约80种)

import type { FoodWuxingItem, FoodCategory, EatingMotivation } from '../types';

// ── 食材分类元数据 ──

export const WUXING_CATEGORIES: { key: FoodCategory; label: string; labelEn: string }[] = [
  { key: 'grain',     label: '谷物主食', labelEn: 'Grains' },
  { key: 'bean',      label: '豆类制品', labelEn: 'Beans' },
  { key: 'vegetable', label: '蔬菜',    labelEn: 'Vegetables' },
  { key: 'fruit',     label: '水果',    labelEn: 'Fruits' },
  { key: 'meat',      label: '肉类蛋奶', labelEn: 'Meat & Dairy' },
  { key: 'seafood',   label: '水产海鲜', labelEn: 'Seafood' },
  { key: 'seasoning', label: '调味品',  labelEn: 'Seasonings' },
  { key: 'other',     label: '饮品零食', labelEn: 'Drinks & Snacks' },
];

// ── 进食动机列表 ──

export const EATING_MOTIVATIONS: { key: EatingMotivation; label: string; labelEn: string; emoji: string }[] = [
  { key: 'hunger',  label: '生理饥饿', labelEn: 'Physical Hunger', emoji: '🟢' },
  { key: 'stress',  label: '压力',     labelEn: 'Stress',          emoji: '😰' },
  { key: 'boredom', label: '无聊',     labelEn: 'Boredom',         emoji: '😐' },
  { key: 'habit',   label: '习惯',     labelEn: 'Habit',           emoji: '🔄' },
  { key: 'reward',  label: '奖励',     labelEn: 'Reward',          emoji: '🎁' },
  { key: 'social',  label: '社交',     labelEn: 'Social',          emoji: '👥' },
  { key: 'craving', label: '嘴馋',     labelEn: 'Craving',         emoji: '😋' },
  { key: 'comfort', label: '安慰',     labelEn: 'Comfort',         emoji: '💝' },
];

// ── 五行元素显示配置 ──

export const WUXING_ELEMENT_CONFIG: Record<string, { label: string; labelEn: string; emoji: string; color: string }> = {
  wood:  { label: '木', labelEn: 'Wood',  emoji: '🟢', color: '#10B981' },
  fire:  { label: '火', labelEn: 'Fire',  emoji: '🔴', color: '#EF4444' },
  earth: { label: '土', labelEn: 'Earth', emoji: '🟡', color: '#F59E0B' },
  metal: { label: '金', labelEn: 'Metal', emoji: '⚪', color: '#9CA3AF' },
  water: { label: '水', labelEn: 'Water', emoji: '🔵', color: '#3B82F6' },
};

export const FLAVOR_CONFIG: Record<string, { label: string; labelEn: string; element: string }> = {
  sour:    { label: '酸', labelEn: 'Sour',    element: 'wood' },
  bitter:  { label: '苦', labelEn: 'Bitter',  element: 'fire' },
  sweet:   { label: '甘', labelEn: 'Sweet',   element: 'earth' },
  pungent: { label: '辛', labelEn: 'Pungent', element: 'metal' },
  salty:   { label: '咸', labelEn: 'Salty',   element: 'water' },
};

// ── 主映射表 ──

export const WUXING_MAP: FoodWuxingItem[] = [
  // ═══════════════════════════════════════════════════════════
  // 谷物主食 (grain) — 18 种
  // ═══════════════════════════════════════════════════════════
  { foodKey: 'rice', name: '大米', nameEn: 'Rice', category: 'grain', isCommon: true, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'neutral', organs: ['spleen'], effect: '补中益气，健脾和胃', effectEn: 'Tonifies qi, strengthens spleen', aliases: ['粳米', '白米饭', '米饭'] },
  { foodKey: 'glutinous_rice', name: '糯米', nameEn: 'Glutinous Rice', category: 'grain', isCommon: true, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'warm', organs: ['spleen', 'lung'], effect: '补中益气，健脾暖胃', effectEn: 'Tonifies qi, warms spleen' },
  { foodKey: 'millet', name: '小米', nameEn: 'Millet', category: 'grain', isCommon: true, primaryFlavor: 'sweet', primaryElement: 'earth', secondaryFlavor: 'salty', nature: 'cool', organs: ['spleen', 'kidney'], effect: '健脾和胃，补益虚损', effectEn: 'Strengthens spleen, nourishes deficiency' },
  { foodKey: 'wheat', name: '小麦', nameEn: 'Wheat', category: 'grain', isCommon: true, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'cool', organs: ['heart', 'spleen', 'kidney'], effect: '养心安神，除烦止渴', effectEn: 'Calms heart, relieves irritability', aliases: ['面粉'] },
  { foodKey: 'corn', name: '玉米', nameEn: 'Corn', category: 'grain', isCommon: true, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'neutral', organs: ['spleen'], effect: '健脾开胃，利水通淋', effectEn: 'Strengthens spleen, promotes urination' },
  { foodKey: 'oat', name: '燕麦', nameEn: 'Oat', category: 'grain', isCommon: true, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'neutral', organs: ['spleen', 'liver'], effect: '益肝和胃，润肠通便', effectEn: 'Nourishes liver, moistens intestines' },
  { foodKey: 'barley_pearl', name: '薏米', nameEn: 'Barley', category: 'grain', isCommon: true, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'cool', organs: ['spleen', 'lung'], effect: '健脾渗湿，清热排脓', effectEn: 'Drains dampness, clears heat' },
  { foodKey: 'sweet_potato', name: '红薯', nameEn: 'Sweet Potato', category: 'grain', isCommon: true, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'neutral', organs: ['spleen', 'kidney'], effect: '补中和血，益气生津', effectEn: 'Tonifies center, generates fluids', aliases: ['地瓜'] },
  { foodKey: 'potato', name: '土豆', nameEn: 'Potato', category: 'grain', isCommon: true, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'neutral', organs: ['spleen'], effect: '健脾益气，和胃调中', effectEn: 'Strengthens spleen, harmonizes stomach' },
  { foodKey: 'buckwheat', name: '荞麦', nameEn: 'Buckwheat', category: 'grain', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'cool', organs: ['spleen'], effect: '开胃宽肠，下气消积', effectEn: 'Opens appetite, moves stagnation' },
  { foodKey: 'sorghum', name: '高粱', nameEn: 'Sorghum', category: 'grain', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'warm', organs: ['spleen'], effect: '健脾益中，温中止泻', effectEn: 'Warms center, stops diarrhea' },
  { foodKey: 'barley', name: '大麦', nameEn: 'Barley Grain', category: 'grain', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'cool', organs: ['spleen'], effect: '健脾消食，除热止渴', effectEn: 'Aids digestion, clears heat' },
  { foodKey: 'fox_nut', name: '芡实', nameEn: 'Fox Nut', category: 'grain', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'neutral', organs: ['spleen', 'kidney'], effect: '益肾固精，补脾止泻', effectEn: 'Tonifies kidney, stops diarrhea' },
  { foodKey: 'noodle', name: '面条', nameEn: 'Noodle', category: 'grain', isCommon: true, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'cool', organs: ['heart', 'spleen'], effect: '养心安神，易消化', effectEn: 'Calms heart, easy to digest' },
  { foodKey: 'rice_noodle', name: '米粉', nameEn: 'Rice Noodle', category: 'grain', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'neutral', organs: ['spleen'], effect: '补中益气', effectEn: 'Tonifies center qi', aliases: ['河粉'] },
  { foodKey: 'mantou', name: '馒头', nameEn: 'Steamed Bun', category: 'grain', isCommon: true, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'neutral', organs: ['spleen'], effect: '补气养胃', effectEn: 'Tonifies qi, nourishes stomach' },
  { foodKey: 'bread', name: '面包', nameEn: 'Bread', category: 'grain', isCommon: true, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'neutral', organs: ['spleen'], effect: '补气养胃', effectEn: 'Tonifies qi, nourishes stomach' },
  { foodKey: 'zongzi', name: '粽子', nameEn: 'Zongzi', category: 'grain', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'warm', organs: ['spleen'], effect: '补中益气', effectEn: 'Tonifies center qi' },

  // ═══════════════════════════════════════════════════════════
  // 豆类及制品 (bean) — 16 种
  // ═══════════════════════════════════════════════════════════
  { foodKey: 'soybean', name: '黄豆', nameEn: 'Soybean', category: 'bean', isCommon: true, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'neutral', organs: ['spleen'], effect: '健脾宽中，润燥消水', effectEn: 'Strengthens spleen, moistens dryness' },
  { foodKey: 'black_bean', name: '黑豆', nameEn: 'Black Bean', category: 'bean', isCommon: true, primaryFlavor: 'sweet', primaryElement: 'water', nature: 'neutral', organs: ['spleen', 'kidney'], effect: '补肾益阴，健脾利湿', effectEn: 'Tonifies kidney yin, drains dampness' },
  { foodKey: 'mung_bean', name: '绿豆', nameEn: 'Mung Bean', category: 'bean', isCommon: true, primaryFlavor: 'sweet', primaryElement: 'fire', nature: 'cold', organs: ['heart'], effect: '清热解毒，消暑利水', effectEn: 'Clears heat, resolves toxins' },
  { foodKey: 'red_bean', name: '红豆', nameEn: 'Red Bean', category: 'bean', isCommon: true, primaryFlavor: 'sweet', primaryElement: 'fire', secondaryFlavor: 'sour', nature: 'neutral', organs: ['heart'], effect: '利水消肿，解毒排脓', effectEn: 'Promotes urination, reduces swelling', aliases: ['赤小豆'] },
  { foodKey: 'tofu', name: '豆腐', nameEn: 'Tofu', category: 'bean', isCommon: true, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'cool', organs: ['spleen'], effect: '益气和中，清热解毒', effectEn: 'Tonifies qi, clears heat' },
  { foodKey: 'soy_milk', name: '豆浆', nameEn: 'Soy Milk', category: 'bean', isCommon: true, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'neutral', organs: ['spleen'], effect: '补虚润燥，清肺化痰', effectEn: 'Nourishes deficiency, moistens dryness' },
  { foodKey: 'dried_tofu', name: '豆腐干', nameEn: 'Dried Tofu', category: 'bean', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'neutral', organs: ['spleen'], effect: '益气和中', effectEn: 'Tonifies qi, harmonizes' },
  { foodKey: 'yuba', name: '腐竹', nameEn: 'Yuba', category: 'bean', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'neutral', organs: ['spleen'], effect: '清热润肺', effectEn: 'Clears heat, moistens lung' },
  { foodKey: 'bean_sprout', name: '豆芽', nameEn: 'Bean Sprout', category: 'bean', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'cool', organs: ['spleen'], effect: '清热利湿，消肿除痹', effectEn: 'Clears heat, drains dampness' },
  { foodKey: 'white_bean', name: '白扁豆', nameEn: 'White Bean', category: 'bean', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'neutral', organs: ['spleen'], effect: '健脾化湿，和中消暑', effectEn: 'Strengthens spleen, resolves dampness' },
  { foodKey: 'broad_bean', name: '蚕豆', nameEn: 'Broad Bean', category: 'bean', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'neutral', organs: ['spleen'], effect: '健脾利湿', effectEn: 'Strengthens spleen' },
  { foodKey: 'pea', name: '豌豆', nameEn: 'Pea', category: 'bean', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'neutral', organs: ['spleen'], effect: '益中气，止泻痢', effectEn: 'Tonifies center qi' },
  { foodKey: 'edamame', name: '毛豆', nameEn: 'Edamame', category: 'bean', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'neutral', organs: ['spleen'], effect: '健脾宽中', effectEn: 'Strengthens spleen' },
  { foodKey: 'natto', name: '纳豆', nameEn: 'Natto', category: 'bean', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'neutral', organs: ['spleen'], effect: '消食化积', effectEn: 'Aids digestion' },
  { foodKey: 'tofu_skin', name: '豆皮', nameEn: 'Tofu Skin', category: 'bean', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'neutral', organs: ['spleen'], effect: '清肺养胃', effectEn: 'Clears lung, nourishes stomach' },
  { foodKey: 'stinky_tofu', name: '臭豆腐', nameEn: 'Stinky Tofu', category: 'bean', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'cool', organs: ['spleen'], effect: '益气和中', effectEn: 'Tonifies qi' },

  // ═══════════════════════════════════════════════════════════
  // 蔬菜类 (vegetable) — 48 种
  // ═══════════════════════════════════════════════════════════
  { foodKey: 'chinese_yam', name: '山药', nameEn: 'Chinese Yam', category: 'vegetable', isCommon: true, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'neutral', organs: ['spleen', 'lung', 'kidney'], effect: '补脾养胃，生津益肺', effectEn: 'Tonifies spleen, nourishes lung' },
  { foodKey: 'pumpkin', name: '南瓜', nameEn: 'Pumpkin', category: 'vegetable', isCommon: true, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'warm', organs: ['spleen'], effect: '补中益气，消炎止痛', effectEn: 'Tonifies center qi' },
  { foodKey: 'carrot', name: '胡萝卜', nameEn: 'Carrot', category: 'vegetable', isCommon: true, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'neutral', organs: ['spleen', 'liver'], effect: '健脾消食，补肝明目', effectEn: 'Strengthens spleen, brightens eyes' },
  { foodKey: 'daikon', name: '白萝卜', nameEn: 'Daikon', category: 'vegetable', isCommon: true, primaryFlavor: 'pungent', primaryElement: 'metal', secondaryFlavor: 'sweet', nature: 'cool', organs: ['lung'], effect: '消食化痰，下气宽中', effectEn: 'Aids digestion, resolves phlegm' },
  { foodKey: 'lotus_root', name: '莲藕', nameEn: 'Lotus Root', category: 'vegetable', isCommon: true, primaryFlavor: 'sweet', primaryElement: 'fire', nature: 'neutral', organs: ['heart', 'spleen'], effect: '清热生津，补益脾胃', effectEn: 'Clears heat, tonifies spleen' },
  { foodKey: 'lily_bulb', name: '百合', nameEn: 'Lily Bulb', category: 'vegetable', isCommon: true, primaryFlavor: 'sweet', primaryElement: 'metal', nature: 'cool', organs: ['heart', 'lung'], effect: '养阴润肺，清心安神', effectEn: 'Nourishes yin, calms spirit' },
  { foodKey: 'wood_ear', name: '木耳', nameEn: 'Wood Ear', category: 'vegetable', isCommon: true, primaryFlavor: 'sweet', primaryElement: 'metal', nature: 'neutral', organs: ['lung'], effect: '润肺养阴，凉血止血', effectEn: 'Moistens lung, cools blood' },
  { foodKey: 'shiitake', name: '香菇', nameEn: 'Shiitake', category: 'vegetable', isCommon: true, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'neutral', organs: ['spleen'], effect: '补气益胃，扶正化痰', effectEn: 'Tonifies qi, strengthens stomach' },
  { foodKey: 'napa_cabbage', name: '白菜', nameEn: 'Napa Cabbage', category: 'vegetable', isCommon: true, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'neutral', organs: ['stomach'], effect: '清热除烦，通利肠胃', effectEn: 'Clears heat, promotes digestion' },
  { foodKey: 'spinach', name: '菠菜', nameEn: 'Spinach', category: 'vegetable', isCommon: true, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'cool', organs: ['stomach'], effect: '养血止血，滋阴润燥', effectEn: 'Nourishes blood, moistens dryness' },
  { foodKey: 'celery', name: '芹菜', nameEn: 'Celery', category: 'vegetable', isCommon: true, primaryFlavor: 'sweet', primaryElement: 'wood', secondaryFlavor: 'bitter', nature: 'cool', organs: ['liver'], effect: '平肝清热，祛风利湿', effectEn: 'Calms liver, clears heat' },
  { foodKey: 'bitter_melon', name: '苦瓜', nameEn: 'Bitter Melon', category: 'vegetable', isCommon: true, primaryFlavor: 'bitter', primaryElement: 'fire', nature: 'cold', organs: ['heart'], effect: '清热解毒，明目解暑', effectEn: 'Clears heat, brightens eyes' },
  { foodKey: 'tomato', name: '番茄', nameEn: 'Tomato', category: 'vegetable', isCommon: true, primaryFlavor: 'sweet', primaryElement: 'wood', secondaryFlavor: 'sour', nature: 'cool', organs: ['liver'], effect: '生津止渴，健胃消食', effectEn: 'Generates fluids, aids digestion', aliases: ['西红柿'] },
  { foodKey: 'winter_melon', name: '冬瓜', nameEn: 'Winter Melon', category: 'vegetable', isCommon: true, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'cool', organs: ['lung'], effect: '利水消痰，清热解毒', effectEn: 'Promotes urination, clears heat' },
  { foodKey: 'cucumber', name: '黄瓜', nameEn: 'Cucumber', category: 'vegetable', isCommon: true, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'cool', organs: ['spleen'], effect: '清热利水，解毒消肿', effectEn: 'Clears heat, promotes urination' },
  { foodKey: 'chives', name: '韭菜', nameEn: 'Chives', category: 'vegetable', isCommon: true, primaryFlavor: 'pungent', primaryElement: 'metal', nature: 'warm', organs: ['liver', 'kidney'], effect: '温中行气，散瘀解毒', effectEn: 'Warms center, moves qi' },
  { foodKey: 'eggplant', name: '茄子', nameEn: 'Eggplant', category: 'vegetable', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'cool', organs: ['spleen'], effect: '清热活血，消肿止痛', effectEn: 'Clears heat, invigorates blood' },
  { foodKey: 'loofah', name: '丝瓜', nameEn: 'Loofah', category: 'vegetable', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'metal', nature: 'cool', organs: ['lung'], effect: '清热化痰，凉血解毒', effectEn: 'Clears heat, resolves phlegm' },
  { foodKey: 'bamboo_shoot', name: '竹笋', nameEn: 'Bamboo Shoot', category: 'vegetable', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'cold', organs: ['stomach'], effect: '清热化痰，除烦解渴', effectEn: 'Clears heat, resolves phlegm' },
  { foodKey: 'lettuce', name: '莴笋', nameEn: 'Lettuce', category: 'vegetable', isCommon: false, primaryFlavor: 'bitter', primaryElement: 'fire', secondaryFlavor: 'sweet', nature: 'cool', organs: ['stomach'], effect: '清热利尿，通乳明目', effectEn: 'Clears heat, promotes urination', aliases: ['生菜'] },
  { foodKey: 'water_spinach', name: '空心菜', nameEn: 'Water Spinach', category: 'vegetable', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'cold', organs: ['stomach'], effect: '清热解毒，利尿止血', effectEn: 'Clears heat, detoxifies' },
  { foodKey: 'broccoli', name: '西兰花', nameEn: 'Broccoli', category: 'vegetable', isCommon: true, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'neutral', organs: ['spleen'], effect: '补肾壮骨，健脑益智', effectEn: 'Tonifies kidney, strengthens bones' },
  { foodKey: 'cauliflower', name: '花菜', nameEn: 'Cauliflower', category: 'vegetable', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'neutral', organs: ['spleen'], effect: '补肾壮骨', effectEn: 'Tonifies kidney' },
  { foodKey: 'green_bean', name: '豆角', nameEn: 'Green Bean', category: 'vegetable', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'neutral', organs: ['spleen'], effect: '健脾和胃，补肾涩精', effectEn: 'Strengthens spleen' },
  { foodKey: 'onion', name: '洋葱', nameEn: 'Onion', category: 'vegetable', isCommon: true, primaryFlavor: 'pungent', primaryElement: 'metal', nature: 'warm', organs: ['lung'], effect: '理气和胃，发散风寒', effectEn: 'Moves qi, disperses cold' },
  { foodKey: 'water_chestnut', name: '荸荠', nameEn: 'Water Chestnut', category: 'vegetable', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'cold', organs: ['lung'], effect: '清热生津，化痰消积', effectEn: 'Clears heat, generates fluids' },
  { foodKey: 'sweet_corn_veg', name: '甜玉米', nameEn: 'Sweet Corn', category: 'vegetable', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'neutral', organs: ['spleen'], effect: '健脾开胃', effectEn: 'Strengthens spleen' },
  { foodKey: 'garlic_sprout', name: '蒜苗', nameEn: 'Garlic Sprout', category: 'vegetable', isCommon: false, primaryFlavor: 'pungent', primaryElement: 'metal', nature: 'warm', organs: ['spleen', 'lung'], effect: '温中消食，解毒', effectEn: 'Warms center, aids digestion' },
  { foodKey: 'purple_yam', name: '紫薯', nameEn: 'Purple Yam', category: 'vegetable', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'neutral', organs: ['spleen'], effect: '补中益气，抗氧化', effectEn: 'Tonifies center qi' },
  { foodKey: 'taro', name: '芋头', nameEn: 'Taro', category: 'vegetable', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', secondaryFlavor: 'pungent', nature: 'neutral', organs: ['spleen'], effect: '补中益气，宽肠通便', effectEn: 'Tonifies center, moistens intestines' },
  { foodKey: 'okra', name: '秋葵', nameEn: 'Okra', category: 'vegetable', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'cool', organs: ['spleen'], effect: '润肠通便，补肾', effectEn: 'Moistens intestines' },
  { foodKey: 'toon_sprout', name: '香椿', nameEn: 'Toon Sprout', category: 'vegetable', isCommon: false, primaryFlavor: 'pungent', primaryElement: 'metal', secondaryFlavor: 'bitter', nature: 'warm', organs: ['liver'], effect: '清热解毒，健胃理气', effectEn: 'Clears heat, aids digestion' },
  { foodKey: 'asparagus', name: '芦笋', nameEn: 'Asparagus', category: 'vegetable', isCommon: false, primaryFlavor: 'bitter', primaryElement: 'fire', secondaryFlavor: 'sweet', nature: 'cool', organs: ['lung'], effect: '清热生津，利水通淋', effectEn: 'Clears heat, promotes urination' },
  { foodKey: 'enoki', name: '金针菇', nameEn: 'Enoki', category: 'vegetable', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'neutral', organs: ['spleen'], effect: '补肝益肠', effectEn: 'Nourishes liver' },
  { foodKey: 'oyster_mushroom', name: '平菇', nameEn: 'Oyster Mushroom', category: 'vegetable', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'neutral', organs: ['spleen'], effect: '追风散寒', effectEn: 'Disperses cold' },
  { foodKey: 'kelp_veg', name: '海带', nameEn: 'Kelp', category: 'vegetable', isCommon: true, primaryFlavor: 'salty', primaryElement: 'water', nature: 'cold', organs: ['liver', 'kidney'], effect: '软坚散结，消痰利水', effectEn: 'Softens hardness, resolves phlegm' },
  { foodKey: 'nori_veg', name: '紫菜', nameEn: 'Nori', category: 'vegetable', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'water', secondaryFlavor: 'salty', nature: 'cold', organs: ['lung'], effect: '化痰软坚，清热利尿', effectEn: 'Resolves phlegm, clears heat' },
  { foodKey: 'wakame', name: '裙带菜', nameEn: 'Wakame', category: 'vegetable', isCommon: false, primaryFlavor: 'salty', primaryElement: 'water', nature: 'cool', organs: ['liver', 'kidney'], effect: '消痰软坚，利水', effectEn: 'Resolves phlegm' },
  { foodKey: 'tong_ho', name: '茼蒿', nameEn: 'Tong Ho', category: 'vegetable', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', secondaryFlavor: 'pungent', nature: 'neutral', organs: ['spleen'], effect: '和脾胃，利二便', effectEn: 'Harmonizes spleen' },
  { foodKey: 'amaranth', name: '苋菜', nameEn: 'Amaranth', category: 'vegetable', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'cool', organs: ['stomach'], effect: '清热利湿，凉血止血', effectEn: 'Clears heat, cools blood' },
  { foodKey: 'corn_lettuce', name: '油麦菜', nameEn: 'Corn Lettuce', category: 'vegetable', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'cool', organs: ['stomach'], effect: '清热利湿', effectEn: 'Clears heat' },
  { foodKey: 'watercress', name: '西洋菜', nameEn: 'Watercress', category: 'vegetable', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'cool', organs: ['lung'], effect: '清肺热，利尿', effectEn: 'Clears lung heat' },
  { foodKey: 'lotus_seed_veg', name: '莲子', nameEn: 'Lotus Seed', category: 'vegetable', isCommon: true, primaryFlavor: 'sweet', primaryElement: 'earth', secondaryFlavor: 'sour', nature: 'neutral', organs: ['spleen', 'kidney', 'heart'], effect: '补脾止泻，养心安神', effectEn: 'Tonifies spleen, calms spirit' },

  // ═══════════════════════════════════════════════════════════
  // 水果类 (fruit) — 30 种
  // ═══════════════════════════════════════════════════════════
  { foodKey: 'apple', name: '苹果', nameEn: 'Apple', category: 'fruit', isCommon: true, primaryFlavor: 'sweet', primaryElement: 'wood', secondaryFlavor: 'sour', nature: 'cool', organs: ['spleen'], effect: '生津润肺，除烦解暑', effectEn: 'Generates fluids, moistens lung' },
  { foodKey: 'pear', name: '梨', nameEn: 'Pear', category: 'fruit', isCommon: true, primaryFlavor: 'sweet', primaryElement: 'metal', secondaryFlavor: 'sour', nature: 'cool', organs: ['lung'], effect: '清热生津，润燥化痰', effectEn: 'Clears heat, moistens dryness' },
  { foodKey: 'banana', name: '香蕉', nameEn: 'Banana', category: 'fruit', isCommon: true, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'cold', organs: ['spleen'], effect: '清热润肠，解毒滋阴', effectEn: 'Clears heat, moistens intestines' },
  { foodKey: 'tangerine', name: '橘子', nameEn: 'Tangerine', category: 'fruit', isCommon: true, primaryFlavor: 'sweet', primaryElement: 'wood', secondaryFlavor: 'sour', nature: 'warm', organs: ['lung'], effect: '开胃理气，止渴润肺', effectEn: 'Opens appetite, moves qi' },
  { foodKey: 'grape', name: '葡萄', nameEn: 'Grape', category: 'fruit', isCommon: true, primaryFlavor: 'sweet', primaryElement: 'wood', secondaryFlavor: 'sour', nature: 'neutral', organs: ['lung', 'spleen', 'kidney'], effect: '补气血，强筋骨', effectEn: 'Tonifies qi and blood' },
  { foodKey: 'watermelon', name: '西瓜', nameEn: 'Watermelon', category: 'fruit', isCommon: true, primaryFlavor: 'sweet', primaryElement: 'fire', nature: 'cold', organs: ['heart'], effect: '清热解暑，除烦止渴', effectEn: 'Clears heat, relieves thirst' },
  { foodKey: 'peach', name: '桃', nameEn: 'Peach', category: 'fruit', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'wood', secondaryFlavor: 'sour', nature: 'warm', organs: ['stomach'], effect: '生津润肠，活血消积', effectEn: 'Generates fluids, invigorates blood' },
  { foodKey: 'longan', name: '桂圆', nameEn: 'Longan', category: 'fruit', isCommon: true, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'warm', organs: ['heart', 'spleen'], effect: '补益心脾，养血安神', effectEn: 'Tonifies heart and spleen', aliases: ['龙眼'] },
  { foodKey: 'lychee', name: '荔枝', nameEn: 'Lychee', category: 'fruit', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'wood', secondaryFlavor: 'sour', nature: 'warm', organs: ['liver', 'spleen'], effect: '补脾益肝，理气补血', effectEn: 'Tonifies spleen and liver' },
  { foodKey: 'hawthorn', name: '山楂', nameEn: 'Hawthorn', category: 'fruit', isCommon: true, primaryFlavor: 'sour', primaryElement: 'wood', secondaryFlavor: 'sweet', nature: 'warm', organs: ['spleen', 'liver'], effect: '消食化积，活血散瘀', effectEn: 'Aids digestion, invigorates blood' },
  { foodKey: 'jujube', name: '红枣', nameEn: 'Jujube', category: 'fruit', isCommon: true, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'warm', organs: ['spleen'], effect: '补中益气，养血安神', effectEn: 'Tonifies center, nourishes blood' },
  { foodKey: 'lemon', name: '柠檬', nameEn: 'Lemon', category: 'fruit', isCommon: true, primaryFlavor: 'sour', primaryElement: 'wood', nature: 'cool', organs: ['liver'], effect: '生津止渴，祛暑安胎', effectEn: 'Generates fluids, relieves thirst' },
  { foodKey: 'persimmon', name: '柿子', nameEn: 'Persimmon', category: 'fruit', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'metal', secondaryFlavor: 'sour', nature: 'cold', organs: ['lung'], effect: '清热润肺，生津止渴', effectEn: 'Clears heat, moistens lung' },
  { foodKey: 'kiwi', name: '猕猴桃', nameEn: 'Kiwi', category: 'fruit', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'wood', secondaryFlavor: 'sour', nature: 'cold', organs: ['stomach'], effect: '清热生津，健脾止泻', effectEn: 'Clears heat, generates fluids' },
  { foodKey: 'cherry', name: '樱桃', nameEn: 'Cherry', category: 'fruit', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'warm', organs: ['spleen', 'liver'], effect: '补中益气，祛风湿', effectEn: 'Tonifies center qi' },
  { foodKey: 'strawberry', name: '草莓', nameEn: 'Strawberry', category: 'fruit', isCommon: true, primaryFlavor: 'sweet', primaryElement: 'wood', secondaryFlavor: 'sour', nature: 'cool', organs: ['spleen', 'lung'], effect: '润肺生津，健脾和胃', effectEn: 'Moistens lung, generates fluids' },
  { foodKey: 'pomelo', name: '柚子', nameEn: 'Pomelo', category: 'fruit', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'wood', secondaryFlavor: 'sour', nature: 'cold', organs: ['lung'], effect: '理气化痰，润肺清肠', effectEn: 'Moves qi, resolves phlegm' },
  { foodKey: 'mango', name: '芒果', nameEn: 'Mango', category: 'fruit', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'wood', secondaryFlavor: 'sour', nature: 'cool', organs: ['lung'], effect: '益胃止呕，生津利尿', effectEn: 'Benefits stomach, stops vomiting' },
  { foodKey: 'pomegranate', name: '石榴', nameEn: 'Pomegranate', category: 'fruit', isCommon: false, primaryFlavor: 'sour', primaryElement: 'wood', secondaryFlavor: 'sweet', nature: 'warm', organs: ['liver', 'lung'], effect: '生津止渴，收敛固涩', effectEn: 'Generates fluids, astringent' },
  { foodKey: 'loquat', name: '枇杷', nameEn: 'Loquat', category: 'fruit', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'metal', secondaryFlavor: 'sour', nature: 'cool', organs: ['lung'], effect: '润肺止咳，生津止渴', effectEn: 'Moistens lung, stops cough' },
  { foodKey: 'coconut', name: '椰子', nameEn: 'Coconut', category: 'fruit', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'warm', organs: ['spleen'], effect: '补脾益肾，利尿消肿', effectEn: 'Tonifies spleen and kidney' },
  { foodKey: 'papaya', name: '木瓜', nameEn: 'Papaya', category: 'fruit', isCommon: false, primaryFlavor: 'sour', primaryElement: 'wood', nature: 'warm', organs: ['liver', 'spleen'], effect: '舒筋活络，和胃化湿', effectEn: 'Relaxes sinews, harmonizes stomach' },
  { foodKey: 'dragon_fruit', name: '火龙果', nameEn: 'Dragon Fruit', category: 'fruit', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'cool', organs: ['stomach'], effect: '清热润肠，养颜', effectEn: 'Clears heat, moistens intestines' },
  { foodKey: 'passion_fruit', name: '百香果', nameEn: 'Passion Fruit', category: 'fruit', isCommon: false, primaryFlavor: 'sour', primaryElement: 'wood', secondaryFlavor: 'sweet', nature: 'neutral', organs: ['stomach'], effect: '生津润肠，安神', effectEn: 'Generates fluids' },
  { foodKey: 'blueberry', name: '蓝莓', nameEn: 'Blueberry', category: 'fruit', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'wood', secondaryFlavor: 'sour', nature: 'neutral', organs: ['liver', 'kidney'], effect: '护眼明目，滋阴', effectEn: 'Brightens eyes, nourishes yin' },
  { foodKey: 'cantaloupe', name: '哈密瓜', nameEn: 'Cantaloupe', category: 'fruit', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'cool', organs: ['heart'], effect: '消暑除烦，生津止渴', effectEn: 'Clears summer heat' },
  { foodKey: 'durian', name: '榴莲', nameEn: 'Durian', category: 'fruit', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'hot', organs: ['liver', 'kidney'], effect: '滋阴壮阳，温通经脉', effectEn: 'Nourishes yin, warms channels' },
  { foodKey: 'mangosteen', name: '山竹', nameEn: 'Mangosteen', category: 'fruit', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', secondaryFlavor: 'sour', nature: 'cool', organs: ['spleen'], effect: '清热降火', effectEn: 'Clears heat' },
  { foodKey: 'plum', name: '李子', nameEn: 'Plum', category: 'fruit', isCommon: false, primaryFlavor: 'sour', primaryElement: 'wood', nature: 'neutral', organs: ['liver', 'spleen'], effect: '清肝涤热，生津利水', effectEn: 'Clears liver heat' },
  { foodKey: 'mulberry', name: '桑葚', nameEn: 'Mulberry', category: 'fruit', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'water', secondaryFlavor: 'sour', nature: 'cold', organs: ['liver', 'kidney'], effect: '滋阴补血，生津润燥', effectEn: 'Nourishes yin and blood' },

  // ═══════════════════════════════════════════════════════════
  // 肉类蛋奶 (meat) — 20 种
  // ═══════════════════════════════════════════════════════════
  { foodKey: 'pork', name: '猪肉', nameEn: 'Pork', category: 'meat', isCommon: true, primaryFlavor: 'sweet', primaryElement: 'water', secondaryFlavor: 'salty', nature: 'neutral', organs: ['spleen', 'kidney'], effect: '滋阴润燥，补肾养血', effectEn: 'Nourishes yin, moistens dryness' },
  { foodKey: 'beef', name: '牛肉', nameEn: 'Beef', category: 'meat', isCommon: true, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'neutral', organs: ['spleen'], effect: '补脾胃，益气血，强筋骨', effectEn: 'Tonifies spleen, strengthens sinews' },
  { foodKey: 'lamb', name: '羊肉', nameEn: 'Lamb', category: 'meat', isCommon: true, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'warm', organs: ['spleen', 'kidney'], effect: '温中暖肾，补气养血', effectEn: 'Warms center, tonifies kidney' },
  { foodKey: 'chicken', name: '鸡肉', nameEn: 'Chicken', category: 'meat', isCommon: true, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'warm', organs: ['spleen'], effect: '温中补脾，益气养血', effectEn: 'Warms center, tonifies spleen' },
  { foodKey: 'duck', name: '鸭肉', nameEn: 'Duck', category: 'meat', isCommon: true, primaryFlavor: 'sweet', primaryElement: 'water', secondaryFlavor: 'salty', nature: 'cool', organs: ['lung', 'kidney'], effect: '滋阴养胃，利水消肿', effectEn: 'Nourishes yin, promotes urination' },
  { foodKey: 'rabbit', name: '兔肉', nameEn: 'Rabbit', category: 'meat', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'cool', organs: ['liver'], effect: '补中益气，凉血解毒', effectEn: 'Tonifies center, cools blood' },
  { foodKey: 'goose', name: '鹅肉', nameEn: 'Goose', category: 'meat', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'neutral', organs: ['spleen', 'lung'], effect: '益气补虚，和胃止渴', effectEn: 'Tonifies qi, harmonizes stomach' },
  { foodKey: 'pigeon', name: '鸽肉', nameEn: 'Pigeon', category: 'meat', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'neutral', organs: ['liver', 'kidney'], effect: '滋肾益气，祛风解毒', effectEn: 'Nourishes kidney, tonifies qi' },
  { foodKey: 'quail', name: '鹌鹑', nameEn: 'Quail', category: 'meat', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'neutral', organs: ['spleen', 'lung'], effect: '补中益气，清利湿热', effectEn: 'Tonifies center qi' },
  { foodKey: 'pork_liver', name: '猪肝', nameEn: 'Pork Liver', category: 'meat', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'wood', secondaryFlavor: 'bitter', nature: 'warm', organs: ['liver'], effect: '养肝明目，补气养血', effectEn: 'Nourishes liver, brightens eyes' },
  { foodKey: 'pork_tripe', name: '猪肚', nameEn: 'Pork Tripe', category: 'meat', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'warm', organs: ['spleen'], effect: '补虚损，健脾胃', effectEn: 'Tonifies deficiency, strengthens spleen' },
  { foodKey: 'pork_rib', name: '排骨', nameEn: 'Pork Rib', category: 'meat', isCommon: true, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'neutral', organs: ['spleen'], effect: '补髓益气', effectEn: 'Tonifies marrow and qi' },
  { foodKey: 'egg', name: '鸡蛋', nameEn: 'Egg', category: 'meat', isCommon: true, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'neutral', organs: ['spleen'], effect: '养心安神，滋阴润燥', effectEn: 'Calms spirit, nourishes yin' },
  { foodKey: 'milk', name: '牛奶', nameEn: 'Milk', category: 'meat', isCommon: true, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'neutral', organs: ['heart', 'lung'], effect: '补虚损，益肺胃', effectEn: 'Tonifies deficiency' },
  { foodKey: 'yogurt', name: '酸奶', nameEn: 'Yogurt', category: 'meat', isCommon: true, primaryFlavor: 'sweet', primaryElement: 'wood', secondaryFlavor: 'sour', nature: 'cool', organs: ['spleen'], effect: '生津止渴，润肠通便', effectEn: 'Generates fluids, moistens intestines' },
  { foodKey: 'cheese', name: '奶酪', nameEn: 'Cheese', category: 'meat', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'neutral', organs: ['spleen'], effect: '补益气血', effectEn: 'Tonifies qi and blood' },
  { foodKey: 'bacon', name: '培根', nameEn: 'Bacon', category: 'meat', isCommon: false, primaryFlavor: 'salty', primaryElement: 'water', nature: 'warm', organs: ['spleen'], effect: '开胃消食', effectEn: 'Opens appetite' },
  { foodKey: 'sausage', name: '香肠', nameEn: 'Sausage', category: 'meat', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', secondaryFlavor: 'salty', nature: 'warm', organs: ['spleen'], effect: '开胃助食', effectEn: 'Opens appetite' },
  { foodKey: 'ham', name: '火腿', nameEn: 'Ham', category: 'meat', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', secondaryFlavor: 'salty', nature: 'warm', organs: ['spleen', 'kidney'], effect: '健脾开胃，益肾补虚', effectEn: 'Strengthens spleen, tonifies kidney' },
  { foodKey: 'duck_egg', name: '鸭蛋', nameEn: 'Duck Egg', category: 'meat', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'water', secondaryFlavor: 'salty', nature: 'cool', organs: ['lung'], effect: '滋阴清肺', effectEn: 'Nourishes yin, clears lung' },

  // ═══════════════════════════════════════════════════════════
  // 水产海鲜 (seafood) — 24 种
  // ═══════════════════════════════════════════════════════════
  { foodKey: 'carp', name: '鲤鱼', nameEn: 'Carp', category: 'seafood', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'neutral', organs: ['spleen', 'kidney'], effect: '利水消肿，下气通乳', effectEn: 'Promotes urination' },
  { foodKey: 'crucian_carp', name: '鲫鱼', nameEn: 'Crucian Carp', category: 'seafood', isCommon: true, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'neutral', organs: ['spleen'], effect: '健脾利湿，和中开胃', effectEn: 'Strengthens spleen, drains dampness' },
  { foodKey: 'grass_carp', name: '草鱼', nameEn: 'Grass Carp', category: 'seafood', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'warm', organs: ['spleen'], effect: '暖胃和中，平肝祛风', effectEn: 'Warms stomach' },
  { foodKey: 'sea_bass', name: '鲈鱼', nameEn: 'Sea Bass', category: 'seafood', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'neutral', organs: ['spleen', 'liver', 'kidney'], effect: '补肝肾，益脾胃', effectEn: 'Tonifies liver and kidney' },
  { foodKey: 'hairtail', name: '带鱼', nameEn: 'Hairtail', category: 'seafood', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'warm', organs: ['spleen'], effect: '补虚暖胃，润肤', effectEn: 'Tonifies deficiency, warms stomach' },
  { foodKey: 'salmon', name: '三文鱼', nameEn: 'Salmon', category: 'seafood', isCommon: true, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'neutral', organs: ['spleen'], effect: '补虚健脾，暖胃', effectEn: 'Tonifies deficiency' },
  { foodKey: 'cod', name: '鳕鱼', nameEn: 'Cod', category: 'seafood', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'neutral', organs: ['spleen'], effect: '活血祛瘀，补血', effectEn: 'Invigorates blood' },
  { foodKey: 'shrimp', name: '虾', nameEn: 'Shrimp', category: 'seafood', isCommon: true, primaryFlavor: 'sweet', primaryElement: 'water', nature: 'warm', organs: ['liver', 'kidney'], effect: '补肾壮阳，通乳托毒', effectEn: 'Tonifies kidney yang' },
  { foodKey: 'crab', name: '螃蟹', nameEn: 'Crab', category: 'seafood', isCommon: true, primaryFlavor: 'salty', primaryElement: 'water', nature: 'cold', organs: ['liver'], effect: '清热散瘀，滋阴养筋', effectEn: 'Clears heat, nourishes yin' },
  { foodKey: 'sea_cucumber', name: '海参', nameEn: 'Sea Cucumber', category: 'seafood', isCommon: true, primaryFlavor: 'salty', primaryElement: 'water', nature: 'neutral', organs: ['liver', 'kidney'], effect: '补肾益精，养血润燥', effectEn: 'Tonifies kidney, nourishes essence' },
  { foodKey: 'squid', name: '墨鱼', nameEn: 'Squid', category: 'seafood', isCommon: false, primaryFlavor: 'salty', primaryElement: 'water', nature: 'neutral', organs: ['liver', 'kidney'], effect: '养血滋阴，通经补脾', effectEn: 'Nourishes blood, nourishes yin', aliases: ['乌贼'] },
  { foodKey: 'clam', name: '蛤蜊', nameEn: 'Clam', category: 'seafood', isCommon: false, primaryFlavor: 'salty', primaryElement: 'water', nature: 'cold', organs: ['stomach'], effect: '滋阴明目，软坚散结', effectEn: 'Nourishes yin, softens hardness' },
  { foodKey: 'scallop', name: '扇贝', nameEn: 'Scallop', category: 'seafood', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', secondaryFlavor: 'salty', nature: 'neutral', organs: ['spleen'], effect: '滋阴补肾，调中', effectEn: 'Nourishes kidney yin' },
  { foodKey: 'abalone', name: '鲍鱼', nameEn: 'Abalone', category: 'seafood', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'water', secondaryFlavor: 'salty', nature: 'neutral', organs: ['liver', 'kidney'], effect: '滋阴清热，益精明目', effectEn: 'Nourishes yin, brightens eyes' },
  { foodKey: 'oyster', name: '生蚝', nameEn: 'Oyster', category: 'seafood', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'water', secondaryFlavor: 'salty', nature: 'neutral', organs: ['liver', 'kidney'], effect: '滋阴养血，宁心安神', effectEn: 'Nourishes yin, calms spirit', aliases: ['牡蛎'] },
  { foodKey: 'eel', name: '黄鳝', nameEn: 'Eel', category: 'seafood', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'warm', organs: ['liver', 'spleen', 'kidney'], effect: '补气养血，温阳益脾', effectEn: 'Tonifies qi, warms yang' },
  { foodKey: 'loach', name: '泥鳅', nameEn: 'Loach', category: 'seafood', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'neutral', organs: ['spleen', 'liver', 'kidney'], effect: '补中益气，除湿退黄', effectEn: 'Tonifies center qi' },
  { foodKey: 'snail', name: '田螺', nameEn: 'Snail', category: 'seafood', isCommon: false, primaryFlavor: 'salty', primaryElement: 'water', nature: 'cold', organs: ['kidney'], effect: '清热利水，解毒消痈', effectEn: 'Clears heat, promotes urination' },
  { foodKey: 'jellyfish', name: '海蜇', nameEn: 'Jellyfish', category: 'seafood', isCommon: false, primaryFlavor: 'salty', primaryElement: 'water', nature: 'neutral', organs: ['liver', 'kidney'], effect: '清热化痰，消积润肠', effectEn: 'Clears heat, resolves phlegm' },
  { foodKey: 'lobster', name: '龙虾', nameEn: 'Lobster', category: 'seafood', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'water', nature: 'warm', organs: ['liver', 'kidney'], effect: '补肾壮阳', effectEn: 'Tonifies kidney yang' },
  { foodKey: 'dried_shrimp', name: '虾皮', nameEn: 'Dried Shrimp', category: 'seafood', isCommon: false, primaryFlavor: 'salty', primaryElement: 'water', secondaryFlavor: 'sweet', nature: 'warm', organs: ['kidney'], effect: '补肾壮阳，理气开胃', effectEn: 'Tonifies kidney' },
  { foodKey: 'mussel', name: '淡菜', nameEn: 'Mussel', category: 'seafood', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'water', secondaryFlavor: 'salty', nature: 'warm', organs: ['liver', 'kidney'], effect: '补肝肾，益精血', effectEn: 'Tonifies liver and kidney' },
  { foodKey: 'seaweed_food', name: '海藻', nameEn: 'Seaweed', category: 'seafood', isCommon: false, primaryFlavor: 'salty', primaryElement: 'water', nature: 'cold', organs: ['liver', 'kidney'], effect: '软坚散结，消痰利水', effectEn: 'Softens hardness, resolves phlegm' },

  // ═══════════════════════════════════════════════════════════
  // 调味品 (seasoning) — 28 种
  // ═══════════════════════════════════════════════════════════
  { foodKey: 'ginger', name: '生姜', nameEn: 'Ginger', category: 'seasoning', isCommon: true, primaryFlavor: 'pungent', primaryElement: 'metal', nature: 'warm', organs: ['lung', 'spleen'], effect: '解表散寒，温中止呕', effectEn: 'Disperses cold, warms center' },
  { foodKey: 'scallion', name: '大葱', nameEn: 'Scallion', category: 'seasoning', isCommon: true, primaryFlavor: 'pungent', primaryElement: 'metal', nature: 'warm', organs: ['lung'], effect: '发表通阳，解毒调味', effectEn: 'Releases exterior, opens yang' },
  { foodKey: 'garlic', name: '大蒜', nameEn: 'Garlic', category: 'seasoning', isCommon: true, primaryFlavor: 'pungent', primaryElement: 'metal', nature: 'warm', organs: ['spleen', 'lung'], effect: '温中消食，解毒杀虫', effectEn: 'Warms center, detoxifies' },
  { foodKey: 'chili', name: '辣椒', nameEn: 'Chili', category: 'seasoning', isCommon: true, primaryFlavor: 'pungent', primaryElement: 'metal', nature: 'hot', organs: ['spleen'], effect: '温中散寒，开胃消食', effectEn: 'Warms center, opens appetite' },
  { foodKey: 'sichuan_pepper', name: '花椒', nameEn: 'Sichuan Pepper', category: 'seasoning', isCommon: true, primaryFlavor: 'pungent', primaryElement: 'metal', nature: 'warm', organs: ['spleen', 'kidney'], effect: '温中散寒，除湿止痛', effectEn: 'Warms center, dispels dampness' },
  { foodKey: 'white_pepper', name: '胡椒', nameEn: 'White Pepper', category: 'seasoning', isCommon: false, primaryFlavor: 'pungent', primaryElement: 'metal', nature: 'hot', organs: ['stomach'], effect: '温中散寒，下气消痰', effectEn: 'Warms center, dispels cold' },
  { foodKey: 'cinnamon', name: '肉桂', nameEn: 'Cinnamon', category: 'seasoning', isCommon: false, primaryFlavor: 'pungent', primaryElement: 'metal', secondaryFlavor: 'sweet', nature: 'hot', organs: ['kidney', 'spleen'], effect: '补火助阳，散寒止痛', effectEn: 'Warms kidney yang', aliases: ['桂皮'] },
  { foodKey: 'dried_tangerine', name: '陈皮', nameEn: 'Dried Tangerine Peel', category: 'seasoning', isCommon: false, primaryFlavor: 'pungent', primaryElement: 'metal', secondaryFlavor: 'bitter', nature: 'warm', organs: ['spleen', 'lung'], effect: '理气健脾，燥湿化痰', effectEn: 'Moves qi, strengthens spleen' },
  { foodKey: 'mustard', name: '芥末', nameEn: 'Mustard', category: 'seasoning', isCommon: false, primaryFlavor: 'pungent', primaryElement: 'metal', nature: 'warm', organs: ['lung'], effect: '温中散寒，利气豁痰', effectEn: 'Warms center, resolves phlegm' },
  { foodKey: 'mint', name: '薄荷', nameEn: 'Mint', category: 'seasoning', isCommon: false, primaryFlavor: 'pungent', primaryElement: 'metal', nature: 'cool', organs: ['lung', 'liver'], effect: '疏散风热，清利头目', effectEn: 'Disperses wind-heat' },
  { foodKey: 'cilantro', name: '香菜', nameEn: 'Cilantro', category: 'seasoning', isCommon: true, primaryFlavor: 'pungent', primaryElement: 'metal', nature: 'warm', organs: ['lung', 'spleen'], effect: '发表透疹，消食开胃', effectEn: 'Releases exterior, opens appetite', aliases: ['芫荽'] },
  { foodKey: 'perilla', name: '紫苏', nameEn: 'Perilla', category: 'seasoning', isCommon: false, primaryFlavor: 'pungent', primaryElement: 'metal', nature: 'warm', organs: ['lung', 'spleen'], effect: '解表散寒，理气安胎', effectEn: 'Releases exterior, moves qi' },
  { foodKey: 'vinegar', name: '食醋', nameEn: 'Vinegar', category: 'seasoning', isCommon: true, primaryFlavor: 'sour', primaryElement: 'wood', secondaryFlavor: 'bitter', nature: 'warm', organs: ['liver'], effect: '散瘀止血，解毒杀虫', effectEn: 'Invigorates blood, detoxifies' },
  { foodKey: 'salt', name: '食盐', nameEn: 'Salt', category: 'seasoning', isCommon: true, primaryFlavor: 'salty', primaryElement: 'water', nature: 'cold', organs: ['kidney'], effect: '清火解毒，凉血润燥', effectEn: 'Clears heat, detoxifies' },
  { foodKey: 'soy_sauce', name: '酱油', nameEn: 'Soy Sauce', category: 'seasoning', isCommon: true, primaryFlavor: 'salty', primaryElement: 'water', nature: 'cold', organs: ['kidney'], effect: '除热解毒', effectEn: 'Clears heat' },
  { foodKey: 'doubanjiang', name: '豆瓣酱', nameEn: 'Doubanjiang', category: 'seasoning', isCommon: false, primaryFlavor: 'salty', primaryElement: 'water', nature: 'neutral', organs: ['spleen'], effect: '开胃消食', effectEn: 'Opens appetite' },
  { foodKey: 'white_sugar', name: '白糖', nameEn: 'White Sugar', category: 'seasoning', isCommon: true, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'neutral', organs: ['spleen', 'lung'], effect: '润肺生津，补中益气', effectEn: 'Moistens lung, generates fluids', aliases: ['冰糖'] },
  { foodKey: 'brown_sugar', name: '红糖', nameEn: 'Brown Sugar', category: 'seasoning', isCommon: true, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'warm', organs: ['spleen', 'liver'], effect: '补中缓急，活血化瘀', effectEn: 'Tonifies center, invigorates blood' },
  { foodKey: 'honey', name: '蜂蜜', nameEn: 'Honey', category: 'seasoning', isCommon: true, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'neutral', organs: ['lung', 'spleen'], effect: '补中润燥，止痛解毒', effectEn: 'Tonifies center, moistens dryness' },
  { foodKey: 'green_tea', name: '绿茶', nameEn: 'Green Tea', category: 'seasoning', isCommon: true, primaryFlavor: 'bitter', primaryElement: 'fire', secondaryFlavor: 'sweet', nature: 'cool', organs: ['heart', 'lung'], effect: '清头目，除烦渴', effectEn: 'Clears head, relieves thirst', aliases: ['茶叶'] },
  { foodKey: 'goji', name: '枸杞', nameEn: 'Goji Berry', category: 'seasoning', isCommon: true, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'neutral', organs: ['liver', 'kidney'], effect: '滋补肝肾，益精明目', effectEn: 'Nourishes liver and kidney' },
  { foodKey: 'sesame', name: '芝麻', nameEn: 'Sesame', category: 'seasoning', isCommon: true, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'neutral', organs: ['liver', 'kidney'], effect: '补肝肾，润肠燥', effectEn: 'Nourishes liver, moistens intestines' },
  { foodKey: 'star_anise', name: '八角', nameEn: 'Star Anise', category: 'seasoning', isCommon: false, primaryFlavor: 'pungent', primaryElement: 'metal', nature: 'warm', organs: ['spleen', 'kidney'], effect: '温阳散寒，理气止痛', effectEn: 'Warms yang, moves qi', aliases: ['大料'] },
  { foodKey: 'clove', name: '丁香', nameEn: 'Clove', category: 'seasoning', isCommon: false, primaryFlavor: 'pungent', primaryElement: 'metal', nature: 'warm', organs: ['spleen', 'kidney'], effect: '温中降逆，补肾助阳', effectEn: 'Warms center, tonifies kidney' },
  { foodKey: 'fennel', name: '小茴香', nameEn: 'Fennel', category: 'seasoning', isCommon: false, primaryFlavor: 'pungent', primaryElement: 'metal', nature: 'warm', organs: ['liver', 'kidney', 'spleen'], effect: '散寒止痛，理气和胃', effectEn: 'Disperses cold, stops pain' },
  { foodKey: 'tsao_ko', name: '草果', nameEn: 'Tsao Ko', category: 'seasoning', isCommon: false, primaryFlavor: 'pungent', primaryElement: 'metal', nature: 'warm', organs: ['spleen'], effect: '燥湿除寒，消食化积', effectEn: 'Dries dampness, aids digestion' },
  { foodKey: 'basil', name: '罗勒', nameEn: 'Basil', category: 'seasoning', isCommon: false, primaryFlavor: 'pungent', primaryElement: 'metal', nature: 'warm', organs: ['lung', 'spleen'], effect: '疏风解毒，理气化湿', effectEn: 'Disperses wind, moves qi', aliases: ['九层塔'] },
  { foodKey: 'msg', name: '味精', nameEn: 'MSG', category: 'seasoning', isCommon: true, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'neutral', organs: ['spleen'], effect: '增鲜开胃', effectEn: 'Enhances flavor' },

  // ═══════════════════════════════════════════════════════════
  // 饮品零食 (other) — 29 种
  // ═══════════════════════════════════════════════════════════
  { foodKey: 'coffee', name: '咖啡', nameEn: 'Coffee', category: 'other', isCommon: true, primaryFlavor: 'bitter', primaryElement: 'fire', nature: 'warm', organs: ['heart', 'lung'], effect: '提神醒脑，利尿消肿', effectEn: 'Stimulates, promotes urination' },
  { foodKey: 'dark_chocolate', name: '黑巧克力', nameEn: 'Dark Chocolate', category: 'other', isCommon: false, primaryFlavor: 'bitter', primaryElement: 'fire', nature: 'cool', organs: ['heart'], effect: '清心利咽，提神醒脑', effectEn: 'Clears heart, stimulates' },
  { foodKey: 'walnut', name: '核桃', nameEn: 'Walnut', category: 'other', isCommon: true, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'warm', organs: ['lung', 'kidney'], effect: '补肾固精，温肺定喘', effectEn: 'Tonifies kidney, warms lung' },
  { foodKey: 'chestnut', name: '栗子', nameEn: 'Chestnut', category: 'other', isCommon: true, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'warm', organs: ['spleen', 'kidney'], effect: '养胃健脾，补肾强筋', effectEn: 'Nourishes stomach, tonifies kidney' },
  { foodKey: 'peanut', name: '花生', nameEn: 'Peanut', category: 'other', isCommon: true, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'neutral', organs: ['spleen', 'lung'], effect: '润肺化痰，和胃补脾', effectEn: 'Moistens lung, harmonizes stomach' },
  { foodKey: 'sunflower_seed', name: '瓜子', nameEn: 'Sunflower Seed', category: 'other', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'neutral', organs: ['spleen'], effect: '润肠通便', effectEn: 'Moistens intestines' },
  { foodKey: 'almond', name: '杏仁', nameEn: 'Almond', category: 'other', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', secondaryFlavor: 'bitter', nature: 'neutral', organs: ['lung'], effect: '润肺止咳，润肠通便', effectEn: 'Moistens lung, stops cough' },
  { foodKey: 'cashew', name: '腰果', nameEn: 'Cashew', category: 'other', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'neutral', organs: ['spleen'], effect: '补脑养血，润肠通便', effectEn: 'Nourishes brain and blood' },
  { foodKey: 'hazelnut', name: '榛子', nameEn: 'Hazelnut', category: 'other', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'neutral', organs: ['spleen'], effect: '健脾和胃，明目', effectEn: 'Strengthens spleen' },
  { foodKey: 'pine_nut', name: '松子', nameEn: 'Pine Nut', category: 'other', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'warm', organs: ['lung', 'liver'], effect: '润肺止咳，润肠通便', effectEn: 'Moistens lung, moistens intestines' },
  { foodKey: 'pistachio', name: '开心果', nameEn: 'Pistachio', category: 'other', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'warm', organs: ['spleen', 'kidney'], effect: '补肾健脾', effectEn: 'Tonifies kidney and spleen' },
  { foodKey: 'black_tea', name: '红茶', nameEn: 'Black Tea', category: 'other', isCommon: true, primaryFlavor: 'bitter', primaryElement: 'fire', secondaryFlavor: 'sweet', nature: 'warm', organs: ['heart', 'stomach'], effect: '温中散寒，提神消疲', effectEn: 'Warms center, stimulates' },
  { foodKey: 'puerh_tea', name: '普洱茶', nameEn: 'Pu-erh Tea', category: 'other', isCommon: false, primaryFlavor: 'bitter', primaryElement: 'fire', secondaryFlavor: 'sweet', nature: 'warm', organs: ['stomach', 'liver'], effect: '消食化痰，清胃生津', effectEn: 'Aids digestion, clears stomach' },
  { foodKey: 'chrysanthemum_tea', name: '菊花茶', nameEn: 'Chrysanthemum Tea', category: 'other', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'metal', secondaryFlavor: 'bitter', nature: 'cool', organs: ['lung', 'liver'], effect: '散风清热，平肝明目', effectEn: 'Disperses wind-heat, brightens eyes' },
  { foodKey: 'cola', name: '可乐', nameEn: 'Cola', category: 'other', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', secondaryFlavor: 'pungent', nature: 'warm', organs: ['stomach'], effect: '暖胃消食', effectEn: 'Warms stomach' },
  { foodKey: 'beer', name: '啤酒', nameEn: 'Beer', category: 'other', isCommon: false, primaryFlavor: 'bitter', primaryElement: 'fire', secondaryFlavor: 'pungent', nature: 'cool', organs: ['stomach'], effect: '消食开胃，利尿', effectEn: 'Aids digestion, promotes urination' },
  { foodKey: 'baijiu', name: '白酒', nameEn: 'Baijiu', category: 'other', isCommon: false, primaryFlavor: 'pungent', primaryElement: 'metal', secondaryFlavor: 'bitter', nature: 'warm', organs: ['heart', 'liver', 'lung'], effect: '通血脉，御寒气', effectEn: 'Opens blood vessels, warms' },
  { foodKey: 'red_bean_paste', name: '豆沙', nameEn: 'Red Bean Paste', category: 'other', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'neutral', organs: ['spleen'], effect: '健脾利水', effectEn: 'Strengthens spleen' },
  { foodKey: 'dried_sweet_potato', name: '红薯干', nameEn: 'Dried Sweet Potato', category: 'other', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'neutral', organs: ['spleen', 'kidney'], effect: '补中和血', effectEn: 'Tonifies center' },
  { foodKey: 'tangyuan', name: '汤圆', nameEn: 'Tangyuan', category: 'other', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'warm', organs: ['spleen'], effect: '补中益气', effectEn: 'Tonifies center qi' },
  { foodKey: 'jiaozi', name: '饺子', nameEn: 'Dumpling', category: 'other', isCommon: true, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'neutral', organs: ['spleen'], effect: '补气养胃', effectEn: 'Tonifies qi, nourishes stomach' },
  { foodKey: 'youtiao', name: '油条', nameEn: 'Youtiao', category: 'other', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'warm', organs: ['spleen'], effect: '养胃暖脾', effectEn: 'Nourishes stomach' },
  { foodKey: 'baozi', name: '包子', nameEn: 'Baozi', category: 'other', isCommon: true, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'neutral', organs: ['spleen'], effect: '补气养胃', effectEn: 'Tonifies qi' },
  { foodKey: 'wonton', name: '馄饨', nameEn: 'Wonton', category: 'other', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'neutral', organs: ['spleen'], effect: '补中益气', effectEn: 'Tonifies center qi' },
  { foodKey: 'congee', name: '粥', nameEn: 'Congee', category: 'other', isCommon: true, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'neutral', organs: ['spleen'], effect: '补中益气，健脾和胃', effectEn: 'Tonifies center, strengthens spleen' },
  { foodKey: 'instant_noodle', name: '方便面', nameEn: 'Instant Noodle', category: 'other', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', secondaryFlavor: 'salty', nature: 'warm', organs: ['spleen'], effect: '开胃充饥', effectEn: 'Fills hunger' },
  { foodKey: 'chips', name: '薯片', nameEn: 'Chips', category: 'other', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', secondaryFlavor: 'salty', nature: 'neutral', organs: ['spleen'], effect: '充饥', effectEn: 'Fills hunger' },
  { foodKey: 'biscuit', name: '饼干', nameEn: 'Biscuit', category: 'other', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'neutral', organs: ['spleen'], effect: '充饥养胃', effectEn: 'Fills hunger' },
  { foodKey: 'ice_cream', name: '冰淇淋', nameEn: 'Ice Cream', category: 'other', isCommon: false, primaryFlavor: 'sweet', primaryElement: 'earth', nature: 'cold', organs: ['spleen'], effect: '清热消暑', effectEn: 'Clears heat' },
];

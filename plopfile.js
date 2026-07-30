/**
 * Plop.js 代码生成器
 *
 * 使用方法：
 *   npx plop slice <name>    → 创建新 Zustand slice
 *   npx plop screen <name>   → 创建新页面
 *   npx plop test <name>     → 创建测试文件
 */

module.exports = function (plop) {
  // ── Helper ──
  plop.setHelper('kebabCase', (text) => text.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/\s+/g, '-').toLowerCase());
  plop.setHelper('snakeCase', (text) => text.replace(/([a-z])([A-Z])/g, '$1_$2').replace(/\s+/g, '_').toLowerCase());

  // ── Slice 生成器 ──
  plop.setGenerator('slice', {
    description: 'Create a new Zustand slice',
    prompts: [
      { type: 'input', name: 'name', message: 'Slice name (e.g. habit):' },
      { type: 'input', name: 'description', message:'Slice description:' },
    ],
    actions: [
      {
        type: 'add',
        path: 'packages/core/src/store/create{{properCase name}}Slice.ts',
        templateFile: 'templates/slice.hbs',
      },
      {
        type: 'add',
        path: 'packages/core/src/store/create{{properCase name}}Slice.test.ts',
        templateFile: 'templates/slice.test.hbs',
      },
      {
        type: 'modify',
        path: 'packages/core/src/store/index.js',
        pattern: /(\nexport \* from '\.\/createHabitSlice';)/,
        template: "\nexport * from './create{{properCase name}}Slice';$1",
      },
    ],
  });

  // ── Screen 生成器 ──
  plop.setGenerator('screen', {
    description: 'Create a new screen',
    prompts: [
      { type: 'input', name: 'name', message: 'Screen name (e.g. HabitDetail):' },
      { type: 'input', name: 'feature', message: 'Feature folder (e.g. habits):' },
    ],
    actions: [
      {
        type: 'add',
        path: 'apps/mobile/src/features/{{kebabCase feature}}/{{properCase name}}Screen.tsx',
        templateFile: 'templates/screen.hbs',
      },
    ],
  });

  // ── Test 生成器 ──
  plop.setGenerator('test', {
    description: 'Create a test file',
    prompts: [
      { type: 'input', name: 'name', message: 'Module name (e.g. habit):' },
      { type: 'list', name: 'type', message: 'Test type:', choices: ['unit', 'integration'] },
    ],
    actions: [
      {
        type: 'add',
        path: '{{#if (eq type "unit")}}packages/core/src/business/{{kebabCase name}}.test.ts{{else}}apps/mobile/src/__tests__/{{kebabCase name}}.integration.test.ts{{/if}}',
        templateFile: 'templates/test.hbs',
      },
    ],
  });
};

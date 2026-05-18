export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/fasting/index',
    'pages/meditate/index',
    'pages/reflections/index',
    'pages/exercise/index',
    'pages/habits/index',
    'pages/stats/index',
    'pages/settings/index',
  ],
  window: {
    navigationBarTitleText: '心流纪',
    navigationBarBackgroundColor: '#0F0A1E',
    navigationBarTextStyle: 'white',
    backgroundColor: '#0F0A1E',
    backgroundTextStyle: 'dark',
  },
  tabBar: {
    color: '#666',
    selectedColor: '#7C3AED',
    backgroundColor: '#0F0A1E',
    borderStyle: 'black',
    list: [
      { pagePath: 'pages/index/index', text: '首页', iconPath: 'assets/tab/home.png', selectedIconPath: 'assets/tab/home-active.png' },
      { pagePath: 'pages/fasting/index', text: '禁食', iconPath: 'assets/tab/fasting.png', selectedIconPath: 'assets/tab/fasting-active.png' },
      { pagePath: 'pages/meditate/index', text: '冥想', iconPath: 'assets/tab/meditate.png', selectedIconPath: 'assets/tab/meditate-active.png' },
      { pagePath: 'pages/reflections/index', text: '感念', iconPath: 'assets/tab/reflections.png', selectedIconPath: 'assets/tab/reflections-active.png' },
      { pagePath: 'pages/exercise/index', text: '锻炼', iconPath: 'assets/tab/exercise.png', selectedIconPath: 'assets/tab/exercise-active.png' },
      { pagePath: 'pages/settings/index', text: '设置', iconPath: 'assets/tab/settings.png', selectedIconPath: 'assets/tab/settings-active.png' },
    ],
  },
});

/**
 * 레벨 설정 파일
 * grid: 그리드 크기 (grid x grid)
 * timePerLevel: 레벨당 추가 시간(초)
 */
window.LEVEL_CONFIG = {
  maxLevel: 200,
  animalSeed: 98765,

  defaults: {
    baseTime: 30,
    barriers: 8,
    types: 5,
    timePerMatch: 2
  },

  tiers: [
    { from: 1,   to: 30,  grid: 8,  timePerLevel: 5 },
    { from: 31,  to: 100, grid: 10, timePerLevel: 3 },
    { from: 101, to: 200, grid: 10, timePerLevel: 2 }
  ]
};

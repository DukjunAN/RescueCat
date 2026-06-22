/**
 * 특수 아이템 / 스킬 설정 파일
 *
 * triggerCount : 몇 개 매치 시 아이템 생성
 * effect       : 효과 ID (게임 로직에서 처리)
 *   - areaRemove  : 주변 radius칸 제거
 *   - rowRemove   : 같은 행 전체 제거
 *   - colRemove   : 같은 열 전체 제거
 *   - colorRemove : 보드에서 같은 색 전체 제거
 */
window.ITEMS_CONFIG = {
  items: [
    {
      id: "bomb",
      name: "폭탄",
      emoji: "💣",
      triggerCount: 5,
      effect: "areaRemove",
      radius: 1,
      description: "5개 이상 매치 시 생성 · 탭하면 주변 8칸 제거"
    },
    {
      id: "lightning",
      name: "번개",
      emoji: "⚡",
      triggerCount: 4,
      effect: "rowRemove",
      description: "4개 매치 시 생성 · 탭하면 가로줄 전체 제거"
    },
    {
      id: "rainbow",
      name: "무지개",
      emoji: "🌈",
      triggerCount: 6,
      effect: "colorRemove",
      description: "6개 이상 매치 시 생성 · 탭하면 같은 색 전체 제거"
    }
  ]
};

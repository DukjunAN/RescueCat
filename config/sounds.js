/**
 * 사운드 설정 파일
 * 경로는 config/assets.js 의 sounds.basePath 를 우선 사용
 */
window.SOUNDS_CONFIG = {
  get basePath() { return (window.ASSETS_CONFIG?.sounds?.basePath) || 'assets/sounds/'; },

  sounds: [
    {
      id: 'titleSong',
      file: '845899__cat-fox_alex__cat-hero-save-the-world-83bpm-cmaj(TitileSong).flac',
      volume: 0.5,
      loop: true,
      trigger: 'bgm',
      description: '타이틀 화면 배경음악'
    },
    {
      id: 'puzzleMove',
      file: '467951__benzix2__ui-button-click(puzzle_move).ogg',
      volume: 0.6,
      loop: false,
      trigger: 'move',
      description: '퍼즐 조각 이동 시'
    },
    {
      id: 'matching',
      file: '337049__shinephoenixstormcrow__320655__rhodesmas__level-up-01(matching).mp3',
      volume: 0.7,
      loop: false,
      trigger: 'match',
      description: '퍼즐 매칭 성공 시'
    },
    {
      id: 'comboMatching',
      file: '173858__jivatma07__j1bonus_mono(combo_matching).wav',
      volume: 0.8,
      loop: false,
      trigger: 'combo',
      description: '연속 콤보 매칭 시'
    },
    {
      id: 'hurryUp',
      file: '146976__zabuhailo__cathowls1(hurryUp).wav',
      volume: 0.85,
      loop: false,
      trigger: 'hurryUp',
      description: '제한시간 10초 이하 — 용 긴박 사운드'
    },
    {
      id: 'escapeSound',
      file: '385892__spacether__262312__steffcaffrey__cat-meow1(EscapeSound).mp3',
      volume: 0.9,
      loop: false,
      trigger: 'levelClear',
      description: '레벨 클리어 — 고양이 탈출 사운드'
    }
  ]
};

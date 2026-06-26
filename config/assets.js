/**
 * 에셋 경로 설정 파일
 * 파일 이동 시 이 파일만 수정하면 됩니다.
 */
window.ASSETS_CONFIG = {

  models: {
    basePath: 'assets/models/',
    // scale: PNG 표시 크기 비율 (1.0 = 100%). 캐릭터별로 개별 조정 가능.
    // minLevel: 이 레벨 이상에서만 등장. 비슷하게 생긴 캐릭터는 고레벨로 분리.
    list: [
      { name: 'animal-beaver',     scale: 1.10, minLevel: 51 },
      { name: 'animal-bee',        scale: 1.35, minLevel:  1 },
      { name: 'animal-bunny',      scale: 1.40, minLevel: 31 },
      { name: 'animal-cat',        scale: 1.20, minLevel:  1 },
      { name: 'animal-caterpillar',scale: 1.35, minLevel:  1 },
      { name: 'animal-chick',      scale: 1.70, minLevel: 36 },
      { name: 'animal-cow',        scale: 1.40, minLevel:  1 },
      { name: 'animal-crab',       scale: 1.80, minLevel: 46 },
      { name: 'animal-deer',       scale: 1.40, minLevel: 31 },
      { name: 'animal-dog',        scale: 1.30, minLevel: 56 },
      { name: 'animal-elephant',   scale: 1.60, minLevel:  1 },
      { name: 'animal-fish',       scale: 1.50, minLevel:  1 },
      { name: 'animal-fox',        scale: 1.25, minLevel: 61 },
      { name: 'animal-giraffe',    scale: 1.35, minLevel:  1 },
      { name: 'animal-hog',        scale: 1.25, minLevel:  1 },
      { name: 'animal-koala',      scale: 1.70, minLevel: 41 },
      { name: 'animal-lion',       scale: 1.25, minLevel:  1 },
      { name: 'animal-monkey',     scale: 1.50, minLevel:  1 },
      { name: 'animal-panda',      scale: 1.15, minLevel:  1 },
      { name: 'animal-parrot',     scale: 1.60, minLevel: 41 },
      { name: 'animal-penguin',    scale: 1.80, minLevel:  1 },
      { name: 'animal-pig',        scale: 1.20, minLevel:  1 },
      { name: 'animal-polar',      scale: 1.15, minLevel: 31 },
      { name: 'animal-tiger',      scale: 1.20, minLevel:  1 }
    ],
    ext: '.glb'
  },

  previews: {
    basePath: 'animals/',
    ext: '.png'
  },

  sounds: {
    basePath: 'assets/sounds/'
  },

  sprites: {
    cat: 'assets/image/Cat_Sprite_Sheet.png'
  },

  icons: {
    basePath: 'assets/image/',
    icon192: 'assets/image/icon-192.png',
    icon512: 'assets/image/icon-512.png'
  }

};

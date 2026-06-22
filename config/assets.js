/**
 * 에셋 경로 설정 파일
 * 파일 이동 시 이 파일만 수정하면 됩니다.
 */
window.ASSETS_CONFIG = {

  models: {
    basePath: 'assets/models/',
    list: [
      'animal-beaver', 'animal-bee',       'animal-bunny',  'animal-cat',
      'animal-caterpillar', 'animal-chick', 'animal-cow',    'animal-crab',
      'animal-deer',   'animal-dog',       'animal-elephant','animal-fish',
      'animal-fox',    'animal-giraffe',   'animal-hog',     'animal-koala',
      'animal-lion',   'animal-monkey',    'animal-panda',   'animal-parrot',
      'animal-penguin','animal-pig',       'animal-polar',   'animal-tiger'
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

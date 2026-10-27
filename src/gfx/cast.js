// Внешность всех именных персонажей — одно описание и для спрайта, и для портрета.
// Рост h — в пикселях арта (36 px = 1 м): Марк 1,75 м ≈ 63 px.

export const CAST_SPECS = {
  // Марк «Тень»: чёрное худи с капюшоном, тёмные джинсы, белые кроссовки
  mark: { h: 63, hair: 'short', hairColor: '#1a1410', skin: '#e3b48c', garment: 'hoodie', hood: true, topColor: '#2a2834', strings: '#d8d8e8', pants: '#2d3550', shoes: '#eeeeee' },
  // Мама: каштановый пучок, лиловый свитер, фартук
  mom: { h: 58, female: true, hair: 'bun', hairColor: '#6b3e26', skin: '#e8bc98', garment: 'sweater', topColor: '#7a5a8c', apron: '#e8e0d0', pants: '#3a3448', shoes: '#5a3a2a', shoeType: 'boots' },
  // Дэн: высокий, красное худи, белая кепка, наушники на шее, жёлтые кроссовки
  dan: { h: 66, hair: 'short', cap: true, capColor: '#e8e8e8', hairColor: '#1a1410', skin: '#9a6a48', garment: 'hoodie', topColor: '#c0303a', headphones: true, pants: '#1e1e26', shoes: '#f0c040' },
  // Баба Валя: платок, пальто, сутулится
  granny: { h: 54, female: true, build: 'slim', stoop: true, hair: 'scarf', capColor: '#8a4a7a', hairColor: '#b8b8b8', skin: '#e0b898', garment: 'coat', topColor: '#4a5a4a', pants: '#3a3a3a', shoes: '#2a2a2a', shoeType: 'boots' },
  kid: { h: 46, kid: true, build: 'kid', hair: 'short', hairColor: '#c8a040', skin: '#f0c8a0', garment: 'tee', topColor: '#3a8a5a', pants: '#2a3a6a', shoes: '#e8e8e8' },
  // Рей: блондин, розовые очки, леопардовая куртка, тату на кисти
  ray: { h: 62, hair: 'swept', hairColor: '#e0c890', glasses: 'pink', skin: '#ecc6a6', garment: 'leopard', topColor: '#cfc6ae', accent: '#2a2a34', tattoo: true, chain: '#e8d070', pants: '#2a2a34', shoes: '#e8e8e8' },
  // Аркаша: лохматый брюнет, белая футболка, джинсы
  arkasha: { h: 63, build: 'slim', hair: 'shaggy', hairColor: '#2a1e18', skin: '#e6bc9a', garment: 'tee', topColor: '#f2f2f2', pants: '#5a7aa8', shoes: '#e8e8e8' },
  // Стас (QuadroXZ): современный рэпер-звукарь — платиновые волосы, узкие тёмные очки,
  // чёрный спортивный костюм с белым лампасом, серебряная цепь, серьга, белые кроссовки
  stas: { h: 64, hair: 'bleach', hairColor: '#d8dce6', glasses: 'dark', skin: '#e8bea0', earring: true, garment: 'tracksuit', topColor: '#18181e', chain: '#d8d8e0', pants: '#18181e', shoes: '#f0f0f0', dark: true },
  // Адам: чёрные дреды, серый свитшот с принтом
  adam: { h: 64, hair: 'dreads', hairColor: '#141010', skin: '#d8a888', garment: 'sweater', topColor: '#cfcfd4', print: '#5a5a62', pants: '#22242c', shoes: '#2a2a2a' },
  // Рома (3g0th2002): рыжие кудри на глаза, пирсинг, усики, чёрное худи
  roma: { h: 61, build: 'slim', hair: 'curlsEyes', hairColor: '#d0742a', skin: '#e8c0a0', piercing: true, mustache: true, garment: 'hoodie', topColor: '#1e1e26', pants: '#1a1a22', shoes: '#1a1a1a', dark: true },
  // Палыч: бригадир, кепка, оранжевый жилет, пузо
  palych: { h: 64, smoker: true, build: 'heavy', hair: 'short', cap: true, capColor: '#2a3a6a', hairColor: '#5a4a3a', skin: '#d8a080', mustache: true, garment: 'vest', topColor: '#ff8a20', sleeveColor: '#4a4a52', pants: '#2a3040', shoes: '#1a1a1a', shoeType: 'boots' },
  // Ахмед: грузчик, борода, синий комбинезон
  akhmed: { h: 66, build: 'heavy', hair: 'short', hairColor: '#141010', beard: true, skin: '#c8946c', garment: 'overalls', topColor: '#2a4a8a', accent: '#1e3a7a', sleeveColor: '#9a9aa2', pants: '#2a4a8a', shoes: '#3a2a1a', shoeType: 'boots' },
  // Гоша с барахолки: шапка, провода на шее
  gosha: { h: 60, smoker: true, hair: 'short', beanie: true, capColor: '#6a2a8a', hairColor: '#3a2a1a', skin: '#e0b898', garment: 'jacket', topColor: '#4a6a4a', accent: '#2a2a2a', headphones: true, pants: '#3a3a3a', shoes: '#5a3a2a', shoeType: 'boots' },
  // Лёва из ломбарда: лысина, очки, кардиган, золотая цепь
  leva: { h: 60, build: 'heavy', hair: 'buzz', hairColor: '#b8b8b8', glasses: 'round', skin: '#e0b090', garment: 'cardigan', topColor: '#6a5a4a', accent: '#e8e0d0', chain: '#d8b040', pants: '#3a3448', shoes: '#2a1a1a', shoeType: 'boots' },
  // Тётя Люба (соседка, Эп.1)
  lyuba: { h: 57, female: true, build: 'heavy', hair: 'bob', hairColor: '#8a3a2a', skin: '#e8bc98', garment: 'coat', topColor: '#5a3a5a', pants: '#2a2a3a', shoes: '#2a1a1a', shoeType: 'boots' },
};

// Имя в диалоге → ключ персонажа (портрет)
export const SPEAKERS = {
  'Марк': 'mark',
  'Мама': 'mom',
  'Дэн': 'dan',
  'Баба Валя': 'granny',
  'Пацан': 'kid',
  'Рей': 'ray',
  'Аркаша': 'arkasha',
  'Стас': 'stas',
  'Адам': 'adam',
  'Рома': 'roma',
  'Палыч': 'palych',
  'Ахмед': 'akhmed',
  'Гоша': 'gosha',
  'Лёва': 'leva',
  'Тётя Люба': 'lyuba',
  'Мира': 'cast_mira',
  'Лола': 'cast_lola',
  'Кира': 'cast_kira',
  'Вика': 'cast_vika',
  'Тимур': 'cast_timur',
  'Бульдог': 'cast_bulldog',
  'Хачик': 'cast_barber',
  'Карина': 'cast_tattoo',
  'Фотограф': 'cast_photolab',
  'Виталик': 'cast_plumber',
  'Следователь': 'cast_cop',
  'Ника': 'cast_olymp',
};

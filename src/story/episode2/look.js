// Образ Марка: одежда из «Второй кожи», стрижка из «Опасной бритвы», пирсинг и тату из «Чернил».
// Меняет описание внешности — лист кадров Марка перерисовывается, спрайты обновляются сами.
import { state } from '../../state.js';
import { ensureActor } from '../../gfx/actors.js';
import { CAST_SPECS } from '../../gfx/cast.js';

// Одежда из «Второй кожи»: id, название, цена, что меняется во внешности
export const OUTFITS = [
  ['hoodie_grey', 'Серое худи', 2500, { garment: 'hoodie', topColor: '#6a6a7a' }],
  ['hoodie_red', 'Красное худи', 3000, { garment: 'hoodie', topColor: '#a02a34' }],
  ['leather', 'Кожанка', 6000, { garment: 'leather', topColor: '#1e1e24', accent: '#c0c0c8' }],
  ['white_tee', 'Белая футболка и цепь', 2000, { garment: 'tee', topColor: '#e8e8e8', chain: '#e8d070' }],
  ['leopard', 'Леопардовая куртка (как у Рея)', 4500, { garment: 'leopard', topColor: '#c8a040', accent: '#2a2a34' }],
];

// Стрижки: что видно без капюшона
const HAIR = {
  default: { hair: 'short' },
  buzz: { hair: 'buzz' },
  undercut: { hair: 'undercut' },
  curls: { hair: 'curly' },
  bleach: { hair: 'bleach', hairColor: '#e8d8a0' },
};

export function markSpec() {
  const F = state.flags;
  const outfit = OUTFITS.find((o) => o[0] === F.lookOutfit);
  const spec = { ...CAST_SPECS.mark, ...(outfit ? outfit[3] : {}) };
  // В худи — капюшон (пока не подстригся: после барбера капюшон снят); в кожанке и футболке видна стрижка
  spec.hood = (!outfit || outfit[0].startsWith('hoodie')) && !F.lookHair;
  Object.assign(spec, HAIR[F.lookHair] || HAIR.default);
  if (F.lookHair === 'bleach') spec.hairColor = '#e8d8a0';
  spec.piercing = !!F.lookPiercing;
  spec.tattoo = !!F.lookTattoo;
  // Капюшон снят (сцена у зеркала / в помещении по желанию)
  if (F.hoodDown) spec.hood = false;
  return spec;
}

export function repaintMark(scene) {
  ensureActor(scene, 'mark', markSpec(), 'full');
}

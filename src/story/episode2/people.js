// Генератор людей: внешность собирается из частей (причёска, кожа, одежда, очки, пирсинг).
// Рисует их gfx/chars.js — тем же способом, что и главных героев.
import { ensureActor } from '../../gfx/actors.js';
// Работники кафе и магазинов, прохожие, фанаты, покупатели и полицейские в штатском.

const SKIN = ['#f0d0b0', '#e8bc98', '#e3b48c', '#c89070', '#9a6a48', '#7a5038'];
const HAIR = ['#1a1410', '#3a2416', '#6b3e26', '#c8a040', '#e8d8a0', '#b03030', '#2a2a2a', '#8a8a8a', '#ff7ad8', '#3df0ff', '#7a3ac8'];
const TOPS = ['#c0303a', '#2a3a6a', '#3a8a5a', '#e8e8e8', '#1a1a1e', '#d8a040', '#7a5a8c', '#4a4a58', '#ff7ab8', '#3a6a8a', '#8a3a2a', '#e8d8b0'];
const PANTS = ['#2d3550', '#1e1e26', '#3a3448', '#4a5a7a', '#5a4a3a', '#2a2a2a', '#6a6a7a'];
const SHOES = ['#eeeeee', '#1a1a1a', '#5a3a2a', '#c03a3a', '#2a2a3a'];
export const HAIRSTYLES = ['short', 'bald', 'long', 'bun', 'mohawk', 'cap', 'curly', 'dreads', 'ponytail', 'hood', 'beanie', 'bob'];

function rng(seed) {
  let s = (Math.abs(seed) % 2147483646) + 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function hashStr(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619) >>> 0;
  return h;
}

const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

// Случайная внешность по сиду; opts переопределяют любые части
export function randomSpec(seed, opts = {}) {
  const r = rng(typeof seed === 'string' ? hashStr(seed) : seed);
  const female = opts.female ?? r() < 0.5;
  const hair = female ? pick(r, ['long', 'bun', 'ponytail', 'bob', 'curly', 'beanie', 'short']) : pick(r, ['short', 'bald', 'mohawk', 'cap', 'curly', 'dreads', 'hood', 'beanie', 'short']);
  const garments = female ? ['tee', 'jacket', 'sweater', 'coat', 'hoodie', 'cardigan'] : ['hoodie', 'tee', 'jacket', 'sweater', 'tracksuit', 'leather', 'coat', 'shirt'];
  const build = r() < 0.2 ? 'heavy' : r() < 0.3 ? 'slim' : 'normal';
  return {
    female,
    h: Math.round((female ? 55 : 60) + r() * 7),
    build,
    garment: pick(r, garments),
    hair,
    hairColor: pick(r, HAIR),
    skin: pick(r, SKIN),
    top: pick(r, TOPS),
    accent: pick(r, TOPS),
    pants: pick(r, PANTS),
    shoes: pick(r, SHOES),
    glasses: r() < 0.18,
    piercing: r() < 0.15,
    mustache: !female && r() < 0.15,
    lipstick: female && r() < 0.35 ? pick(r, ['#c03a5a', '#1a1a1e', '#8a3a6a']) : null,
    chain: r() < 0.12,
    stripe: r() < 0.3,
    dress: female && r() < 0.25,
    apron: null,
    ...opts,
  };
}

// Создаёт лист кадров человека (gfx/chars.js) и возвращает ключ текстуры
export function personTexture(scene, spec, key, kind = 'npc') {
  key = key || `p_${hashStr(JSON.stringify(spec)).toString(36)}`;
  return ensureActor(scene, key, spec, kind);
}

// ---------- Именованные персонажи Эпизода 2 ----------

export const CAST = {
  mira: { garment: 'sweater', h: 57, female: true, hair: 'bob', hairColor: '#3a2416', skin: '#f0d0b0', top: '#e8d8b0', accent: '#3a6a8a', pants: '#4a5a7a', shoes: '#eeeeee', glasses: false, stripe: true },
  lola: { h: 58, female: true, hair: 'long', hairColor: '#e8d8a0', skin: '#e8bc98', top: '#ff7ab8', accent: '#ffd166', pants: '#1a1a1e', shoes: '#c03a3a', dress: true, lipstick: '#c03a5a', chain: true },
  kira: { garment: 'leather', h: 59, female: true, hair: 'long', hairColor: '#1a1410', skin: '#f0d0b0', top: '#1a1a1e', accent: '#7a3ac8', pants: '#1a1a1e', shoes: '#1a1a1a', piercing: true, lipstick: '#1a1a1e' },
  vika: { h: 56, female: true, hair: 'bun', hairColor: '#b03030', skin: '#e3b48c', top: '#8a3a6a', accent: '#ffd166', pants: '#1a1a1e', shoes: '#c03a3a', dress: true, lipstick: '#c03a5a' },
  timur: { garment: 'tee', build: 'heavy', h: 62, female: false, hair: 'short', hairColor: '#1a1410', skin: '#c89070', top: '#e8e8e8', accent: '#c0303a', pants: '#2a2a2a', shoes: '#1a1a1a', apron: '#c0303a', mustache: true },
  bulldog: { garment: 'tee', build: 'heavy', h: 66, female: false, hair: 'bald', hairColor: '#1a1410', skin: '#e8bc98', top: '#1a1a1e', accent: '#e8e8e8', pants: '#1e1e26', shoes: '#1a1a1a', chain: true },
  barber: { garment: 'shirt', h: 61, female: false, hair: 'curly', hairColor: '#1a1410', skin: '#e3b48c', top: '#1a1a1e', accent: '#e8e8e8', pants: '#2a2a2a', shoes: '#5a3a2a', mustache: true, apron: '#2a2a2a' },
  tattoo: { garment: 'tee', h: 57, female: true, hair: 'mohawk', hairColor: '#3df0ff', skin: '#f0d0b0', top: '#1a1a1e', accent: '#ff3d8a', pants: '#1a1a1e', shoes: '#1a1a1a', piercing: true },
  photolab: { garment: 'cardigan', h: 60, female: false, hair: 'bald', hairColor: '#8a8a8a', skin: '#e8bc98', top: '#7a5a8c', accent: '#e8e8e8', pants: '#3a3448', shoes: '#5a3a2a', glasses: true },
  plumber: { garment: 'overalls', sleeveColor: '#8a8a94', h: 62, female: false, hair: 'cap', hairColor: '#3a2416', skin: '#c89070', top: '#2a3a6a', accent: '#d8a040', pants: '#2a3a6a', shoes: '#1a1a1a', mustache: true },
  cop: { garment: 'jacket', h: 64, female: false, hair: 'cap', hairColor: '#1a1410', skin: '#e8bc98', top: '#2a3a5a', accent: '#1a2a4a', pants: '#1a2a4a', shoes: '#1a1a1a' },
  olymp: { garment: 'jacket', h: 58, female: true, hair: 'bun', hairColor: '#1a1410', skin: '#f0d0b0', top: '#1a1a1e', accent: '#ffd166', pants: '#1a1a1e', shoes: '#1a1a1a', glasses: true },
};

export function castKey(scene, id) {
  return personTexture(scene, CAST[id], `cast_${id}`);
}

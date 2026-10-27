// Данные телефона Марка: контакты, переписки, звонки, соцсети, задания.
// Всё лежит в state (и сохраняется вместе с игрой), а интерфейс (ui/Phone.js) только показывает.
import { state, clockShort } from '../state.js';

export const CONTACTS = {
  mom: { name: 'Мама', color: '#ffb38a', letter: 'М' },
  dan: { name: 'Дэн', color: '#ff6b6b', letter: 'Д' },
  lyuba: { name: 'Тётя Люба', color: '#ffb38a', letter: 'Л' },
  ray: { name: 'РЕЙ В ЭТОЙ МАЛЫШЕЧКЕ', color: '#e8c27a', letter: 'Р' },
  arkasha: { name: 'jeffrY#creator', color: '#f0f0f0', letter: 'J' },
  stas: { name: 'QuadroXZ (Стас)', color: '#c0c8d8', letter: 'Q' },
  adam: { name: 'twinspeak', color: '#b8b8c0', letter: 'T' },
  roma: { name: '3g0th2002', color: '#ff8a3a', letter: '3' },
  mira: { name: 'Мира', color: '#9ae6ff', letter: 'М' },
  lola: { name: 'Лола', color: '#ff7ad8', letter: 'Л' },
  kira: { name: 'Кира', color: '#b0a0c8', letter: 'К' },
  palych: { name: 'Палыч (склад)', color: '#ff8a20', letter: 'П' },
  olymp: { name: '«Олимп» — менеджмент', color: '#ffd166', letter: 'О' },
  vika: { name: 'Вика', color: '#ff9ab0', letter: 'В' },
  unknown: { name: 'Неизвестный номер', color: '#8a8aa8', letter: '?' },
};

// ---------- События для интерфейса ----------

const listeners = new Set();

export function onPhone(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function emit(ev) {
  listeners.forEach((cb) => {
    try {
      cb(ev);
    } catch (e) {}
  });
}

// ---------- Контакты ----------

export function hasContact(id) {
  return state.phone.contacts.includes(id);
}

export function addContact(id, { silent = false, note } = {}) {
  if (hasContact(id)) return false;
  state.phone.contacts.push(id);
  if (!silent) emit({ type: 'notify', app: 'contacts', title: 'Новый контакт', text: note || CONTACTS[id]?.name || id });
  return true;
}

export function contactName(id) {
  return CONTACTS[id]?.name || id;
}

// ---------- Сообщения ----------

function thread(id) {
  if (!state.phone.threads[id]) state.phone.threads[id] = [];
  return state.phone.threads[id];
}

// Входящее сообщение. replies: [{ id, text }] — варианты ответа (обрабатывает story/phoneScripts.js)
export function receive(from, text, { replies = null, silent = false } = {}) {
  if (!hasContact(from)) addContact(from, { silent: true });
  thread(from).push({ dir: 'in', text, when: clockShort(), replies });
  state.phone.unread[from] = (state.phone.unread[from] || 0) + 1;
  if (!silent) emit({ type: 'notify', app: 'messages', from, title: contactName(from), text });
}

export function send(to, text) {
  thread(to).push({ dir: 'out', text, when: clockShort() });
  emit({ type: 'changed' });
}

export function pendingReplies(id) {
  const t = state.phone.threads[id] || [];
  const last = t[t.length - 1];
  return last && last.dir === 'in' && last.replies && !last.answered ? last.replies : null;
}

export function markAnswered(id) {
  const t = state.phone.threads[id] || [];
  const last = t[t.length - 1];
  if (last) last.answered = true;
}

export function markRead(id) {
  if (!state.phone.unread[id]) return;
  delete state.phone.unread[id];
  emit({ type: 'changed' });
}

export function unreadTotal() {
  return Object.values(state.phone.unread).reduce((a, b) => a + b, 0);
}

// Список переписок: последние сверху
export function threadList() {
  return Object.entries(state.phone.threads)
    .filter(([, msgs]) => msgs.length)
    .map(([id, msgs]) => ({ id, last: msgs[msgs.length - 1], unread: state.phone.unread[id] || 0, order: msgs.length }))
    .sort((a, b) => b.unread - a.unread || b.order - a.order);
}

// ---------- Звонки ----------

export function logCall(id, dir, ok = true) {
  state.phone.calls.unshift({ id, dir, ok, when: clockShort() });
  if (state.phone.calls.length > 30) state.phone.calls.length = 30;
}

// Входящий звонок: интерфейс покажет экран звонка, сценарий сам решит, что говорить
export function incomingCall(from, script) {
  emit({ type: 'call', from, script });
}

// ---------- Уведомления без переписки ----------

export function notify(app, title, text) {
  emit({ type: 'notify', app, title, text });
}

// ---------- Задания («Дела») ----------

export function quest(id, data) {
  const q = (state.quests[id] = { ...(state.quests[id] || { status: 'active' }), ...data });
  if (data.status === 'active' && !data.silent) notify('quests', 'Новое дело', q.title);
  if (data.status === 'done' && !data.silent) notify('quests', 'Дело сделано', q.title);
  if (data.status === 'failed' && !data.silent) notify('quests', 'Дело провалено', q.title);
  emit({ type: 'changed' });
  return q;
}

export function questStatus(id) {
  return state.quests[id]?.status || null;
}

// ---------- Соцсети ----------

export const APPS_SOCIAL = {
  ritm: { name: 'Ритм', color: '#ff3d8a' },
  kadr: { name: 'Кадр', color: '#ffd166' },
  vibe: { name: 'Вайб', color: '#3df0ff' },
};

// Подписчики растут не ровно: «Пульс» усиливает или гасит любой прирост
export function addFollowers(app, n, reason) {
  const soc = state.social;
  const k = 0.5 + state.pulse / 100;
  const delta = Math.round(n * (n > 0 ? k : 2 - k));
  soc.followers[app] = Math.max(0, (soc.followers[app] || 0) + delta);
  if (reason && delta) notify(app, APPS_SOCIAL[app].name, `${delta > 0 ? '+' : ''}${delta} подписчиков · ${reason}`);
  emit({ type: 'changed' });
  return delta;
}

// Пост в соцсети (от Марка или о Марке)
export function post(app, { author = 'Тень', text, likes = 0, comments = [], photo = null }) {
  state.social.posts.unshift({ app, author, text, likes, comments, photo, when: clockShort(), day: state.time.day });
  if (state.social.posts.length > 60) state.social.posts.length = 60;
  emit({ type: 'changed' });
}

// Новость или коммент в ленте «Вайба»
export function feed(author, text, { notifyMe = false } = {}) {
  state.social.feed.unshift({ author, text, when: clockShort(), day: state.time.day });
  if (state.social.feed.length > 80) state.social.feed.length = 80;
  if (notifyMe) notify('vibe', `Вайб · ${author}`, text);
  emit({ type: 'changed' });
}

export function phoneChanged() {
  emit({ type: 'changed' });
}

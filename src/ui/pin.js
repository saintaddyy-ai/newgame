// Контейнер интерфейса, закреплённый на экране.
// Phaser проверяет клики по scrollFactor каждого объекта, а не контейнера, поэтому
// кнопки внутри закреплённого контейнера «промахивались», когда камера сдвинута.
// Здесь всё, что кладётся в контейнер (и во вложенные контейнеры), тоже закрепляется.
export function pinned(container) {
  const orig = container.addHandler;
  container.addHandler = function (go) {
    orig.call(this, go);
    go.setScrollFactor?.(0);
    if (go.list && !go.__pinned) pinned(go);
  };
  container.__pinned = true;
  container.setScrollFactor(0);
  container.list.forEach((go) => {
    go.setScrollFactor?.(0);
    if (go.list && !go.__pinned) pinned(go);
  });
  return container;
}

export function uiContainer(scene, x = 0, y = 0, depth = 1000) {
  return pinned(scene.add.container(x, y).setDepth(depth));
}

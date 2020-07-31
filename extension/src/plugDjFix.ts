tryGetElementByClass('community__song-playing', (el: HTMLParagraphElement) => {
  const update = () => browser.runtime.sendMessage({
    type: 'Title',
    data: el.title
  });
  update().catch(console.error);
  const observer = new MutationObserver(() => update().catch(console.error));
  observer.observe(el, {
    attributes: true
  });
}).catch(console.error);

async function tryGetElementByClass<T extends Element>(name: string, fn: (el: T) => void) {
  while (true) {
    const el = document.getElementsByClassName(name);
    if (!el || el.length === 0 || el[0] === null) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      continue;
    }
    fn(el[0] as T);
    break;
  }
}

import { createElement } from './utilities';

export function useMarquee(el: HTMLElement, maxWidth: number, speed: number) {
  const invisibleWrapper = createElement('div', {classes: ['invis']});
  document.documentElement.append(invisibleWrapper);
  const observer = new MutationObserver(() => {
    const clone = el.cloneNode(true);
    invisibleWrapper.append(clone);
    requestAnimationFrame(() => {
      const {width} = invisibleWrapper.getBoundingClientRect();

      el.style.setProperty('--animation-width', `${maxWidth - width}px`);
      el.style.setProperty('animation-duration', `${width / speed}s`);

      if(width > maxWidth) {
        el.classList.add('mq-animating');
      } else {
        el.classList.remove('mq-animating');
      }
      invisibleWrapper.removeChild(clone);
    });
  });
  observer.observe(el, {subtree: true, childList: true});
}

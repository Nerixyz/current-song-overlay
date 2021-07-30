import { createElement } from './utilities';

export function useMarquee(el: HTMLElement, maxWidth: number, speed: number) {
  const invisibleWrapper = createElement('div', { classes: ['invis'] });
  invisibleWrapper.style.transform = 'scale(0.2)';
  document.documentElement.append(invisibleWrapper);
  const observer = new MutationObserver(() => {
    const clone = el.cloneNode(true);
    invisibleWrapper.append(clone);
    cancelAllAnimations(el);
    requestAnimationFrame(() => {
      let { width } = invisibleWrapper.getBoundingClientRect();
      width *= 5;

      if (width > maxWidth) {
        const animationWidth = maxWidth - width;
        el.animate([{
          transform: 'translateX(0)',
          opacity: '1',
          offset: 0,
        }, {
          transform: `translateX(${animationWidth}px)`,
          opacity: '1',
          offset: 0.4,
        }, {
          transform: `translateX(${animationWidth}px)`,
          opacity: '0',
          offset: 0.45,
        }, {
          transform: 'translateX(0)',
          opacity: '0',
          offset: 0.455,
        }, {
          opacity: '1',
          transform: 'translateX(0)',
          offset: 0.5
        }, {
          opacity: '1',
          transform: 'translateX(0)',
          offset: 1
        }], {
          iterations: Infinity,
          duration: (width / speed) * 1000
        });
      }

      invisibleWrapper.removeChild(clone);
    });
  });
  observer.observe(el, { subtree: true, childList: true });
}

function cancelAllAnimations(el: HTMLElement) {
  el.getAnimations().forEach(a => a.cancel());
}

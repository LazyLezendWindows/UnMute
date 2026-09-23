import type { Directive } from 'vue';

/**
 * v-tilt: rotates an element toward the pointer in 3D and moves a specular glare with it.
 * Writes CSS variables only (--tilt-x, --tilt-y, --glare-x, --glare-y, --glare-o); the `.u-tilt`
 * styles in _animations.scss turn them into a transform. Disabled for touch/coarse pointers and
 * when the user prefers reduced motion. `v-tilt="false"` turns it off; `v-tilt="{ max: 6 }"` limits it.
 */
type TiltOptions = boolean | { max?: number } | undefined;

interface TiltState {
  frame: number;
  onMove: (e: PointerEvent) => void;
  onLeave: () => void;
}

const states = new WeakMap<HTMLElement, TiltState>();

function supported(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function attach(el: HTMLElement, options: TiltOptions) {
  if (options === false || !supported() || states.has(el)) return;
  const max = typeof options === 'object' && options.max !== undefined ? options.max : 7;
  el.classList.add('u-tilt');

  const state: TiltState = {
    frame: 0,
    onMove: (e: PointerEvent) => {
      cancelAnimationFrame(state.frame);
      state.frame = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width; // 0..1
        const py = (e.clientY - rect.top) / rect.height;
        el.classList.add('is-tilting');
        el.style.setProperty('--tilt-x', `${((0.5 - py) * 2 * max).toFixed(2)}deg`);
        el.style.setProperty('--tilt-y', `${((px - 0.5) * 2 * max).toFixed(2)}deg`);
        el.style.setProperty('--glare-x', `${(px * 100).toFixed(1)}%`);
        el.style.setProperty('--glare-y', `${(py * 100).toFixed(1)}%`);
        el.style.setProperty('--glare-o', '1');
      });
    },
    onLeave: () => {
      cancelAnimationFrame(state.frame);
      el.classList.remove('is-tilting');
      el.style.setProperty('--tilt-x', '0deg');
      el.style.setProperty('--tilt-y', '0deg');
      el.style.setProperty('--glare-o', '0');
    },
  };
  el.addEventListener('pointermove', state.onMove);
  el.addEventListener('pointerleave', state.onLeave);
  states.set(el, state);
}

function detach(el: HTMLElement) {
  const state = states.get(el);
  if (!state) return;
  cancelAnimationFrame(state.frame);
  el.removeEventListener('pointermove', state.onMove);
  el.removeEventListener('pointerleave', state.onLeave);
  el.classList.remove('u-tilt', 'is-tilting');
  states.delete(el);
}

export const vTilt: Directive<HTMLElement, TiltOptions> = {
  mounted: (el, binding) => attach(el, binding.value),
  updated: (el, binding) => {
    if (binding.value === false) detach(el);
    else attach(el, binding.value);
  },
  beforeUnmount: detach,
};

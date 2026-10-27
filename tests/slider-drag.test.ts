import { afterEach, expect, it, vi } from 'vitest';
import { attachMouseDrag } from '../src/lib/widgets/Slider/mouseDrag.js';
afterEach(() => {
	document.body.innerHTML = '';
	vi.restoreAllMocks();
});
it('drags mouse, snaps, suppresses drag clicks and leaves touch and inputs native', () => {
	const node = document.createElement('div'),
		link = document.createElement('a'),
		input = document.createElement('input');
	node.append(link, input);
	document.body.append(node);
	Object.defineProperties(node, { clientWidth: { value: 200 }, scrollWidth: { value: 600 } });
	node.scrollTo = vi.fn((options: ScrollToOptions | number = {}) => {
		node.scrollLeft = typeof options === 'number' ? options : (options.left ?? 0);
	});
	node.setPointerCapture = vi.fn();
	node.hasPointerCapture = () => true;
	node.releasePointerCapture = vi.fn();
	const settle = vi.fn();
	const cleanup = attachMouseDrag(node, () => [0, 200, 400], settle);
	const pointer = (target: EventTarget, type: string, x: number, pointerType = 'mouse') =>
		target.dispatchEvent(new PointerEvent(type, { pointerId: 1, pointerType, button: 0, buttons: 1, clientX: x, bubbles: true, cancelable: true }));
	try {
		pointer(link, 'pointerdown', 150);
		pointer(window, 'pointermove', 80);
		expect(node.scrollLeft).toBe(70);
		expect(node.style.scrollSnapType).toBe('none');
		pointer(window, 'pointerup', 80);
		expect(settle).toHaveBeenCalledWith(1);
		expect(node.style.scrollSnapType).toBe('none');
		node.dispatchEvent(new Event('scrollend'));
		expect(node.style.scrollSnapType).toBe('none');
		node.scrollLeft = 200;
		node.dispatchEvent(new Event('scrollend'));
		expect(node.style.scrollSnapType).toBe('');
		expect(link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }))).toBe(false);
		pointer(link, 'pointerdown', 80);
		pointer(window, 'pointerup', 80);
		expect(link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }))).toBe(true);
		vi.mocked(node.scrollTo).mockClear();
		pointer(input, 'pointerdown', 150);
		pointer(window, 'pointermove', 0);
		pointer(window, 'pointerup', 0);
		pointer(link, 'pointerdown', 150, 'touch');
		pointer(window, 'pointermove', 0, 'touch');
		pointer(window, 'pointerup', 0, 'touch');
		expect(node.scrollTo).not.toHaveBeenCalled();
		pointer(link, 'pointerdown', 150);
		pointer(window, 'pointermove', 80);
		cleanup();
		expect(node.style.scrollSnapType).toBe('');
		expect(node.releasePointerCapture).toHaveBeenCalled();
		vi.mocked(node.scrollTo).mockClear();
		pointer(window, 'pointermove', 0);
		expect(node.scrollTo).not.toHaveBeenCalled();
	} finally {
		cleanup();
	}
});

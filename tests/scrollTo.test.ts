import { beforeEach, describe, expect, it, vi } from 'vitest';
import { scrollTo } from '../src/lib/utils/scrollTo/index.js';

describe('scrollTo', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
		vi.restoreAllMocks();
		Object.defineProperty(window, 'scrollY', { value: 300, configurable: true });
	});

	it('returns false when target selector is invalid or missing', () => {
		expect(scrollTo('#missing')).toBe(false);
		expect(scrollTo('[')).toBe(false);
	});

	it('scrolls to element with default options', () => {
		const node = document.createElement('div');
		node.getBoundingClientRect = vi.fn(() => ({ top: 100 }) as DOMRect);
		document.body.appendChild(node);

		const spy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
		const result = scrollTo(node);

		expect(result).toBe(true);
		expect(spy).toHaveBeenCalledWith({ top: 180, behavior: 'smooth' });
	});

	it('supports legacy numeric offset', () => {
		const node = document.createElement('div');
		node.getBoundingClientRect = vi.fn(() => ({ top: 50 }) as DOMRect);
		document.body.appendChild(node);

		const spy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
		scrollTo(node, 10);

		expect(spy).toHaveBeenCalledWith({ top: 340, behavior: 'smooth' });
	});

	it('supports options and can skip top clamping', () => {
		const node = document.createElement('div');
		node.getBoundingClientRect = vi.fn(() => ({ top: -500 }) as DOMRect);
		document.body.appendChild(node);

		const spy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
		scrollTo(node, { offset: 0, behavior: 'auto', clampTop: false });

		expect(spy).toHaveBeenCalledWith({ top: -200, behavior: 'auto' });
	});
});

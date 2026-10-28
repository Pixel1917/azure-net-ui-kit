import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRawSnippet, flushSync, mount, unmount } from 'svelte';
import Slider from '../src/lib/widgets/Slider/Slider.svelte';
import Harness from './fixtures/SliderHarness.svelte';
import type { SliderApi } from '../src/lib/widgets/Slider/types.js';
import { sliderCss } from '../src/lib/widgets/Slider/utils.js';

afterEach(() => {
	vi.restoreAllMocks();
	document.body.innerHTML = '';
});

describe('Slider', () => {
	it('supports intrinsic width and switches basis in numeric/auto breakpoints', () => {
		const css = sliderCss('auto', { slidesPerView: 'auto', spaceBetween: 16 }, { 800: { slidesPerView: 3 }, 1200: { slidesPerView: 'auto' } });
		expect(css).toContain('--slider-view:auto;--slider-gap:16px;--slider-basis:auto;');
		expect(css).toContain('--slider-view:3;--slider-gap:16px;--slider-basis:calc(');
		expect(css.match(/--slider-basis:auto;/g)).toHaveLength(2);
	});
	it('sorts breakpoints, normalizes numeric input and rejects CSS injection', () => {
		const css = sliderCss(
			'safe',
			{ slidesPerView: NaN, spaceBetween: -1 },
			{ 1000: { slidesPerView: 3 }, 600: { slidesPerView: 2 }, ...Object.fromEntries([['0){}</style>', { slidesPerView: 5 }]]) }
		);
		expect(css).toContain('--slider-view:1;--slider-gap:0px');
		expect(css.indexOf('600px')).toBeLessThan(css.indexOf('1000px'));
		expect(css).not.toContain('</style>');
	});
	it('exposes navigation, tracks scroll, handles keyboard and removes resize listeners', async () => {
		vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(200);
		vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(function (this: HTMLElement) {
			return this.children.length * 200;
		});
		vi.spyOn(HTMLElement.prototype, 'offsetLeft', 'get').mockImplementation(function (this: HTMLElement) {
			const index = this.parentElement ? Array.from(this.parentElement.children).indexOf(this) : 0;
			return index * 200;
		});
		const remove = vi.spyOn(window, 'removeEventListener');
		let api!: SliderApi;
		const changed = vi.fn();
		const instance = mount(Harness, {
			target: document.body,
			props: {
				ready: (value) => {
					api = value;
				},
				changed
			}
		});
		flushSync();
		const viewport = document.querySelector('.azure-net-ui-slider-viewport') as HTMLElement;
		viewport.scrollTo = vi.fn((options?: ScrollToOptions | number) => {
			viewport.scrollLeft = typeof options === 'number' ? options : (options?.left ?? 0);
			viewport.dispatchEvent(new Event('scroll'));
		});
		expect(api.pageCount).toBe(4);
		api.slideNext();
		flushSync();
		expect(api.activeIndex).toBe(1);
		expect(changed).toHaveBeenCalledWith(1);
		viewport.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
		flushSync();
		expect(api.isEnd).toBe(true);
		api.slideTo(-50);
		flushSync();
		expect(api.isBeginning).toBe(true);
		instance.update([], 2);
		flushSync();
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(api.pageCount).toBe(0);
		await unmount(instance);
		expect(remove).toHaveBeenCalledWith('resize', expect.any(Function));
		expect(() => api.slideNext()).not.toThrow();
	});
});

it('allows duplicate primitives and repeated object references without getKey', async () => {
	const shared = { name: 'same object' };
	for (const items of [
		['a', 'a'],
		[shared, shared]
	]) {
		const slide = createRawSnippet<[unknown, number]>(() => ({ render: () => '<span>Slide</span>' }));
		const instance = mount(Slider, { target: document.body, props: { items, slide } });
		flushSync();
		expect(document.querySelectorAll('.azure-net-ui-slider-slide')).toHaveLength(2);
		await unmount(instance);
	}
});

it('uses positional reuse by default and preserves explicit keyed identity on reorder', async () => {
	for (const keyed of [false, true]) {
		const instance = mount(Harness, { target: document.body, props: { keyed } });
		flushSync();
		const first = document.querySelector('.azure-net-ui-slider-slide');
		instance.update(['B', 'A', 'D', 'C']);
		flushSync();
		expect(document.querySelectorAll('.azure-net-ui-slider-slide')[keyed ? 1 : 0]).toBe(first);
		if (!keyed) {
			instance.update(['a', 'a']);
			flushSync();
			expect(document.querySelectorAll('.azure-net-ui-slider-slide')).toHaveLength(2);
		}
		await unmount(instance);
	}
});

it('keeps rapid smooth targets through intermediate scrollend and redundant measurements', async () => {
	vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(200);
	vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(800);
	vi.spyOn(HTMLElement.prototype, 'offsetLeft', 'get').mockImplementation(function (this: HTMLElement) {
		return this.parentElement ? Array.from(this.parentElement.children).indexOf(this) * 200 : 0;
	});
	// Simulate an ancestor scale(.5): screen coordinates must never be used for scrolling.
	vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ left: 0, width: 100 } as DOMRect);
	let api!: SliderApi;
	const instance = mount(Harness, {
		target: document.body,
		props: {
			ready: (value) => {
				api = value;
			}
		}
	});
	flushSync();
	const viewport = document.querySelector('.azure-net-ui-slider-viewport') as HTMLElement;
	const scrollTo = vi.fn();
	viewport.scrollTo = scrollTo;
	api.slideNext();
	flushSync();
	expect(scrollTo).toHaveBeenLastCalledWith({ left: 200, behavior: 'smooth' });
	expect(document.querySelector('button')!.disabled).toBe(false); // Reverse before activeIndex moves.
	viewport.scrollLeft = 40;
	viewport.dispatchEvent(new Event('scrollend'));
	window.dispatchEvent(new Event('resize'));
	api.slideNext();
	expect(scrollTo).toHaveBeenLastCalledWith({ left: 400, behavior: 'smooth' });
	api.slideNext();
	api.slideNext();
	expect(scrollTo).toHaveBeenLastCalledWith({ left: 600, behavior: 'smooth' });
	api.slidePrev();
	expect(scrollTo).toHaveBeenLastCalledWith({ left: 400, behavior: 'smooth' });
	viewport.scrollLeft = 400;
	viewport.dispatchEvent(new Event('scroll'));
	flushSync();
	expect(api.activeIndex).toBe(2);
	await unmount(instance);
});

it('includes a terminal position when one slide is wider than the viewport', async () => {
	vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(300);
	vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(600);
	vi.spyOn(HTMLElement.prototype, 'offsetLeft', 'get').mockReturnValue(0);
	let api!: SliderApi;
	const instance = mount(Slider, {
		target: document.body,
		props: {
			items: ['wide'],
			slidesPerView: 0.5,
			slide: createRawSnippet<[unknown, number]>(() => ({ render: () => '<span>Wide slide</span>' })),
			onReady: (value) => {
				api = value;
			}
		}
	});
	flushSync();
	const viewport = document.querySelector('.azure-net-ui-slider-viewport') as HTMLElement;
	const scrollTo = vi.fn();
	viewport.scrollTo = scrollTo;
	expect(api.pageCount).toBe(2);
	api.slideNext();
	expect(scrollTo).toHaveBeenLastCalledWith({ left: 300, behavior: 'smooth' });
	viewport.scrollLeft = 300;
	viewport.dispatchEvent(new Event('scrollend'));
	flushSync();
	expect(api.isEnd).toBe(true);
	api.slidePrev();
	expect(scrollTo).toHaveBeenLastCalledWith({ left: 0, behavior: 'smooth' });
	await unmount(instance);
});

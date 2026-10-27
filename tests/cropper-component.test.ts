import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import Cropper from '../src/lib/widgets/Cropper/Cropper.svelte';
import type { CropperApi } from '../src/lib/widgets/Cropper/types.js';
import { fitCrop, moveCrop, normalizeCrop, cropToNaturalPixels } from '../src/lib/widgets/Cropper/utils.js';

afterEach(() => {
	vi.restoreAllMocks();
	document.body.innerHTML = '';
});

describe('Cropper lifecycle', () => {
	it('rejects export before load, returns copies, ignores unrelated pointers and cleans up mid-drag', async () => {
		let api!: CropperApi;
		const instance = mount(Cropper, {
			target: document.body,
			props: {
				src: '/image.png',
				onReady: (value) => {
					api = value;
				}
			}
		});
		flushSync();
		expect(() => api.toCanvas()).toThrow('after image load');
		await expect(api.toBlob()).rejects.toThrow('after image load');
		const copy = api.getCrop();
		copy.width = 2;
		expect(api.getCrop().width).not.toBe(2);
		const image = document.querySelector('img')!;
		vi.spyOn(image, 'getBoundingClientRect').mockReturnValue({ width: 200, height: 200 } as DOMRect);
		const area = document.querySelector('.cropper-selection')!;
		area.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, button: 0, clientX: 0, clientY: 0, bubbles: true }));
		const before = api.getCrop();
		window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 2, clientX: 20, clientY: 20 }));
		expect(api.getCrop()).toEqual(before);
		window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 2 }));
		window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 10, clientY: 10 }));
		expect(api.getCrop().x).toBe(before.x + 5);
		await unmount(instance);
		const after = api.getCrop();
		window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 50, clientY: 50 }));
		expect(api.getCrop()).toEqual(after);
	});
	it('clamps invalid minimums and keeps extreme ratios while moving', () => {
		expect(normalizeCrop({ x: NaN, y: -1, width: 40, height: 40 }, 500, 500)).toEqual({ x: 0, y: 0, width: 100, height: 100 });
		const crop = fitCrop({ x: 10, y: 10, width: 80, height: 80 }, 200, 1, 8, 8);
		expect(crop.width / crop.height).toBeCloseTo(200);
		expect(moveCrop(crop, 0, 1).width / moveCrop(crop, 0, 1).height).toBeCloseTo(200);
		expect(cropToNaturalPixels({ x: 99.99, y: 99.99, width: 0.001, height: 0.001 }, 10, 10)).toEqual({ x: 9, y: 9, width: 1, height: 1 });
	});
});

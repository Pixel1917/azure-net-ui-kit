import { describe, expect, it } from 'vitest';
import { createInitialCrop, cropToNaturalPixels, moveCrop, resizeCrop } from '../src/lib/widgets/Cropper/utils.js';

describe('Cropper utils', () => {
	it('creates a centered crop that respects fixed aspect ratio', () => {
		const crop = createInitialCrop(1, 16 / 9);

		expect(crop.x).toBeGreaterThanOrEqual(0);
		expect(crop.y).toBeGreaterThanOrEqual(0);
		expect(crop.x + crop.width).toBeLessThanOrEqual(100);
		expect(crop.y + crop.height).toBeLessThanOrEqual(100);
		expect((crop.width / crop.height) * (16 / 9)).toBeCloseTo(1, 1);
	});

	it('moves crop inside image bounds', () => {
		const crop = moveCrop({ x: 10, y: 10, width: 40, height: 40 }, 80, 80);

		expect(crop).toEqual({ x: 60, y: 60, width: 40, height: 40 });
	});

	it('resizes freely when aspect ratio is not passed', () => {
		const crop = resizeCrop({
			crop: { x: 10, y: 10, width: 40, height: 40 },
			handle: 'se',
			deltaX: 15,
			deltaY: 10,
			viewportRatio: 1,
			minWidth: 8,
			minHeight: 8
		});

		expect(crop.width).toBe(55);
		expect(crop.height).toBe(50);
	});

	it('keeps fixed aspect ratio when resizing', () => {
		const crop = resizeCrop({
			crop: { x: 10, y: 10, width: 40, height: 40 },
			handle: 'se',
			deltaX: 20,
			deltaY: 0,
			aspectRatio: 1,
			viewportRatio: 1,
			minWidth: 8,
			minHeight: 8
		});

		expect(crop.width).toBeCloseTo(crop.height);
	});

	it('converts crop percentages to natural image pixels', () => {
		expect(cropToNaturalPixels({ x: 10, y: 20, width: 30, height: 40 }, 1000, 500)).toEqual({
			x: 100,
			y: 100,
			width: 300,
			height: 200
		});
	});
});

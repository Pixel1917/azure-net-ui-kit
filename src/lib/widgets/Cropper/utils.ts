import type { CropRect, CropperResizeHandle } from './types.js';

export interface ResizeCropParams {
	crop: CropRect;
	handle: CropperResizeHandle;
	deltaX: number;
	deltaY: number;
	aspectRatio?: number;
	viewportRatio: number;
	minWidth: number;
	minHeight: number;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

export const normalizeSize = (value: string | number | undefined, fallback: string) => {
	if (value === undefined) return fallback;
	return typeof value === 'number' ? `${value}px` : value;
};

export const normalizeCrop = (crop: CropRect, minWidth = 1, minHeight = 1): CropRect => {
	const width = clamp(crop.width, minWidth, 100);
	const height = clamp(crop.height, minHeight, 100);

	return {
		x: clamp(crop.x, 0, 100 - width),
		y: clamp(crop.y, 0, 100 - height),
		width,
		height
	};
};

export const createInitialCrop = (aspectRatio: number | undefined, viewportRatio: number): CropRect => {
	if (!aspectRatio || aspectRatio <= 0) {
		return { x: 15, y: 15, width: 70, height: 70 };
	}

	const targetHeight = (80 * viewportRatio) / aspectRatio;

	if (targetHeight <= 80) {
		return normalizeCrop({ x: 10, y: (100 - targetHeight) / 2, width: 80, height: targetHeight });
	}

	const targetWidth = (80 * aspectRatio) / viewportRatio;
	return normalizeCrop({ x: (100 - targetWidth) / 2, y: 10, width: targetWidth, height: 80 });
};

export const moveCrop = (crop: CropRect, deltaX: number, deltaY: number): CropRect => {
	return normalizeCrop({
		...crop,
		x: crop.x + deltaX,
		y: crop.y + deltaY
	});
};

const resizeFreeCrop = ({ crop, handle, deltaX, deltaY, minWidth, minHeight }: ResizeCropParams) => {
	let left = crop.x;
	let top = crop.y;
	let right = crop.x + crop.width;
	let bottom = crop.y + crop.height;

	if (handle.includes('w')) left += deltaX;
	if (handle.includes('e')) right += deltaX;
	if (handle.includes('n')) top += deltaY;
	if (handle.includes('s')) bottom += deltaY;

	left = clamp(left, 0, right - minWidth);
	top = clamp(top, 0, bottom - minHeight);
	right = clamp(right, left + minWidth, 100);
	bottom = clamp(bottom, top + minHeight, 100);

	return normalizeCrop({ x: left, y: top, width: right - left, height: bottom - top }, minWidth, minHeight);
};

const fitRatioCrop = (crop: CropRect, aspectRatio: number, viewportRatio: number, minWidth: number, minHeight: number) => {
	const next = { ...crop };
	next.width = Math.max(next.width, minWidth);
	next.height = (next.width * viewportRatio) / aspectRatio;

	if (next.height < minHeight) {
		next.height = minHeight;
		next.width = (next.height * aspectRatio) / viewportRatio;
	}

	if (next.x < 0) next.x = 0;
	if (next.y < 0) next.y = 0;
	if (next.x + next.width > 100) {
		next.width = 100 - next.x;
		next.height = (next.width * viewportRatio) / aspectRatio;
	}
	if (next.y + next.height > 100) {
		next.height = 100 - next.y;
		next.width = (next.height * aspectRatio) / viewportRatio;
	}

	return normalizeCrop(next, minWidth, minHeight);
};

const resizeRatioCrop = ({ crop, handle, deltaX, deltaY, aspectRatio = 1, viewportRatio, minWidth, minHeight }: ResizeCropParams) => {
	const leftAnchored = handle.includes('e') || handle === 'n' || handle === 's';
	const topAnchored = handle.includes('s') || handle === 'e' || handle === 'w';
	const horizontalDelta = handle.includes('w') ? -deltaX : deltaX;
	const verticalDelta = handle.includes('n') ? -deltaY : deltaY;
	const widthFromVertical = ((crop.height + verticalDelta) * aspectRatio) / viewportRatio;
	const widthFromHorizontal = crop.width + horizontalDelta;
	const nextWidth = Math.abs(verticalDelta) > Math.abs(horizontalDelta) ? widthFromVertical : widthFromHorizontal;
	const nextHeight = (nextWidth * viewportRatio) / aspectRatio;

	let x = crop.x;
	let y = crop.y;

	if (!leftAnchored) x = crop.x + crop.width - nextWidth;
	if (!topAnchored) y = crop.y + crop.height - nextHeight;
	if (handle === 'e' || handle === 'w') y = crop.y + (crop.height - nextHeight) / 2;
	if (handle === 'n' || handle === 's') x = crop.x + (crop.width - nextWidth) / 2;

	return fitRatioCrop({ x, y, width: nextWidth, height: nextHeight }, aspectRatio, viewportRatio, minWidth, minHeight);
};

export const resizeCrop = (params: ResizeCropParams): CropRect => {
	return params.aspectRatio && params.aspectRatio > 0 ? resizeRatioCrop(params) : resizeFreeCrop(params);
};

export const cropToNaturalPixels = (crop: CropRect, naturalWidth: number, naturalHeight: number) => {
	return {
		x: Math.round((crop.x / 100) * naturalWidth),
		y: Math.round((crop.y / 100) * naturalHeight),
		width: Math.round((crop.width / 100) * naturalWidth),
		height: Math.round((crop.height / 100) * naturalHeight)
	};
};

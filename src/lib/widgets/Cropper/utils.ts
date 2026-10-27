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
	const width = clamp(Number.isFinite(crop.width) ? crop.width : 70, clamp(Number.isFinite(minWidth) ? minWidth : 1, 0.001, 100), 100);
	const height = clamp(Number.isFinite(crop.height) ? crop.height : 70, clamp(Number.isFinite(minHeight) ? minHeight : 1, 0.001, 100), 100);

	return {
		x: clamp(Number.isFinite(crop.x) ? crop.x : 0, 0, 100 - width),
		y: clamp(Number.isFinite(crop.y) ? crop.y : 0, 0, 100 - height),
		width,
		height
	};
};

export const createInitialCrop = (aspectRatio: number | undefined, viewportRatio: number): CropRect => {
	if (!Number.isFinite(aspectRatio) || !aspectRatio || aspectRatio <= 0 || !Number.isFinite(viewportRatio) || viewportRatio <= 0) {
		return { x: 15, y: 15, width: 70, height: 70 };
	}

	const targetHeight = (80 * viewportRatio) / aspectRatio;

	if (targetHeight <= 80) {
		return normalizeCrop({ x: 10, y: (100 - targetHeight) / 2, width: 80, height: targetHeight }, 0.001, 0.001);
	}

	const targetWidth = (80 * aspectRatio) / viewportRatio;
	return normalizeCrop({ x: (100 - targetWidth) / 2, y: 10, width: targetWidth, height: 80 }, 0.001, 0.001);
};

export const moveCrop = (crop: CropRect, deltaX: number, deltaY: number): CropRect => {
	return normalizeCrop(
		{
			...crop,
			x: crop.x + deltaX,
			y: crop.y + deltaY
		},
		0.001,
		0.001
	);
};

/** Fit around the current center, preserving ratio even when the minimums cannot fit. */
export const fitCrop = (crop: CropRect, aspectRatio: number | undefined, viewportRatio: number, minWidth: number, minHeight: number): CropRect => {
	const next = normalizeCrop(crop, 0.001, 0.001);
	if (!Number.isFinite(aspectRatio) || !aspectRatio || aspectRatio <= 0 || !Number.isFinite(viewportRatio) || viewportRatio <= 0) {
		return normalizeCrop(next, minWidth, minHeight);
	}
	const ratio = aspectRatio / viewportRatio;
	const minimum = normalizeCrop({ x: 0, y: 0, width: minWidth, height: minHeight }, 0.001, 0.001);
	const width = Math.min(100, 100 * ratio, Math.max(next.width, minimum.width, minimum.height * ratio));
	const height = width / ratio;
	return {
		x: clamp(next.x + (next.width - width) / 2, 0, 100 - width),
		y: clamp(next.y + (next.height - height) / 2, 0, 100 - height),
		width,
		height
	};
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

const resizeRatioCrop = ({ crop, handle, deltaX, deltaY, aspectRatio = 1, viewportRatio, minWidth, minHeight }: ResizeCropParams) => {
	const ratio = aspectRatio / viewportRatio;
	const west = handle.includes('w'),
		east = handle.includes('e');
	const north = handle.includes('n'),
		south = handle.includes('s');
	const anchorX = west ? crop.x + crop.width : east ? crop.x : crop.x + crop.width / 2;
	const anchorY = north ? crop.y + crop.height : south ? crop.y : crop.y + crop.height / 2;
	const maxWidth = west ? anchorX : east ? 100 - anchorX : 2 * Math.min(anchorX, 100 - anchorX);
	const maxHeight = north ? anchorY : south ? 100 - anchorY : 2 * Math.min(anchorY, 100 - anchorY);
	const dx = west ? -deltaX : deltaX;
	const dy = north ? -deltaY : deltaY;
	const horizontal = crop.width + dx;
	const vertical = (crop.height + dy) * ratio;
	const requested = !west && !east ? vertical : !north && !south ? horizontal : Math.abs(dx) >= Math.abs(dy * ratio) ? horizontal : vertical;
	const maximum = Math.max(0, Math.min(maxWidth, maxHeight * ratio));
	// When minimum dimensions cannot fit, image bounds and aspect ratio take precedence.
	const minimum = Math.min(maximum, Math.max(minWidth, minHeight * ratio));
	const width = clamp(requested, minimum, maximum);
	const height = width / ratio;
	return {
		x: west ? anchorX - width : east ? anchorX : anchorX - width / 2,
		y: north ? anchorY - height : south ? anchorY : anchorY - height / 2,
		width,
		height
	};
};

export const resizeCrop = (params: ResizeCropParams): CropRect => {
	const normalized = {
		...params,
		crop: normalizeCrop(params.crop, 0.001, 0.001),
		minWidth: clamp(Number.isFinite(params.minWidth) ? params.minWidth : 1, 0.001, 100),
		minHeight: clamp(Number.isFinite(params.minHeight) ? params.minHeight : 1, 0.001, 100),
		deltaX: Number.isFinite(params.deltaX) ? params.deltaX : 0,
		deltaY: Number.isFinite(params.deltaY) ? params.deltaY : 0
	};
	return Number.isFinite(params.aspectRatio) && params.aspectRatio! > 0 && Number.isFinite(params.viewportRatio) && params.viewportRatio > 0
		? resizeRatioCrop(normalized)
		: resizeFreeCrop(normalized);
};

export const cropToNaturalPixels = (crop: CropRect, naturalWidth: number, naturalHeight: number) => {
	const next = normalizeCrop(crop, 0.001, 0.001);
	const x = clamp(Math.round((next.x / 100) * naturalWidth), 0, Math.max(0, naturalWidth - 1));
	const y = clamp(Math.round((next.y / 100) * naturalHeight), 0, Math.max(0, naturalHeight - 1));
	return {
		x,
		y,
		width: clamp(Math.round((next.width / 100) * naturalWidth), 1, naturalWidth - x),
		height: clamp(Math.round((next.height / 100) * naturalHeight), 1, naturalHeight - y)
	};
};

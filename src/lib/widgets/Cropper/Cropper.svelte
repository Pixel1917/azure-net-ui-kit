<script lang="ts">
	import { BROWSER } from '@azure-net/tools/environment';
	import { onMount } from 'svelte';
	import type { CropRect, CropperApi, CropperProps, CropperResizeHandle, CropperExportOptions } from './types.js';
	import { createInitialCrop, cropToNaturalPixels, moveCrop, normalizeCrop, normalizeSize, resizeCrop } from './utils.js';

	type DragState =
		| {
				type: 'move';
				startX: number;
				startY: number;
				crop: CropRect;
		  }
		| {
				type: 'resize';
				handle: CropperResizeHandle;
				startX: number;
				startY: number;
				crop: CropRect;
		  };

	const {
		src,
		aspectRatio,
		initialCrop,
		minWidth = 8,
		minHeight = 8,
		borderRadius = 0,
		disabled = false,
		grid = true,
		className = '',
		containerClassName = '',
		containerStyle = '',
		imageClassName = '',
		overlayColor = 'rgba(0, 0, 0, .58)',
		cropBorderColor = 'rgb(255, 255, 255)',
		cropHandleColor = 'rgb(255, 255, 255)',
		cropHandleSize = 12,
		onChange,
		onReady
	}: CropperProps = $props();

	let imageElement = $state<HTMLImageElement>();
	let imageSrc = $state('');
	let crop = $state<CropRect>({ x: 15, y: 15, width: 70, height: 70 });
	let viewportRatio = $state(1);
	let dragState: DragState | undefined;
	let objectUrl: string | undefined;
	let resizeObserver: ResizeObserver | undefined;

	const handles: CropperResizeHandle[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

	const cropStyle = $derived(`
		left: ${crop.x}%;
		top: ${crop.y}%;
		width: ${crop.width}%;
		height: ${crop.height}%;
		border-radius: ${normalizeSize(borderRadius, '12px')};
		border-color: ${cropBorderColor};
		--cropper-overlay: ${overlayColor};
	`);

	const emitChange = (nextCrop: CropRect) => {
		onChange?.(nextCrop);
	};

	const setCrop = (nextCrop: CropRect) => {
		crop = normalizeCrop(nextCrop, minWidth, minHeight);
		emitChange(crop);
	};

	const reset = () => {
		setCrop(initialCrop ?? createInitialCrop(aspectRatio, viewportRatio));
	};

	const getImageRect = () => imageElement?.getBoundingClientRect();

	const getPointerDelta = (event: PointerEvent, state: DragState) => {
		const rect = getImageRect();
		if (!rect) return { deltaX: 0, deltaY: 0 };

		return {
			deltaX: ((event.clientX - state.startX) / rect.width) * 100,
			deltaY: ((event.clientY - state.startY) / rect.height) * 100
		};
	};

	const handlePointerMove = (event: PointerEvent) => {
		if (!dragState || disabled) return;
		event.preventDefault();

		const { deltaX, deltaY } = getPointerDelta(event, dragState);

		if (dragState.type === 'move') {
			setCrop(moveCrop(dragState.crop, deltaX, deltaY));
			return;
		}

		setCrop(
			resizeCrop({
				crop: dragState.crop,
				handle: dragState.handle,
				deltaX,
				deltaY,
				aspectRatio,
				viewportRatio,
				minWidth,
				minHeight
			})
		);
	};

	const stopDragging = () => {
		dragState = undefined;
		window.removeEventListener('pointermove', handlePointerMove);
		window.removeEventListener('pointerup', stopDragging);
		window.removeEventListener('pointercancel', stopDragging);
	};

	const startDragging = (event: PointerEvent, nextDragState: DragState) => {
		if (disabled) return;
		event.preventDefault();
		event.stopPropagation();

		dragState = nextDragState;
		window.addEventListener('pointermove', handlePointerMove);
		window.addEventListener('pointerup', stopDragging);
		window.addEventListener('pointercancel', stopDragging);
	};

	const startMove = (event: PointerEvent) => {
		startDragging(event, {
			type: 'move',
			startX: event.clientX,
			startY: event.clientY,
			crop
		});
	};

	const startResize = (event: PointerEvent, handle: CropperResizeHandle) => {
		startDragging(event, {
			type: 'resize',
			handle,
			startX: event.clientX,
			startY: event.clientY,
			crop
		});
	};

	const updateViewportRatio = () => {
		const rect = getImageRect();
		if (!rect?.width || !rect.height) return;
		viewportRatio = rect.width / rect.height;
	};

	const watchImageSize = () => {
		if (!BROWSER || !imageElement) return;
		resizeObserver?.disconnect();
		resizeObserver = new ResizeObserver(updateViewportRatio);
		resizeObserver.observe(imageElement);
	};

	const handleImageLoad = () => {
		if (!imageElement) return;
		updateViewportRatio();
		watchImageSize();
		reset();
	};

	const getCanvasRadius = (width: number, height: number) => {
		if (typeof borderRadius === 'number') return borderRadius;
		const radius = Number.parseFloat(borderRadius);
		if (!Number.isFinite(radius) || radius <= 0) return 0;
		return borderRadius.trim().endsWith('%') ? (Math.min(width, height) * radius) / 100 : radius;
	};

	const clipRoundedCanvas = (context: CanvasRenderingContext2D, width: number, height: number, radius: number) => {
		const nextRadius = Math.min(radius, width / 2, height / 2);
		if (nextRadius <= 0) return;

		context.beginPath();
		context.moveTo(nextRadius, 0);
		context.lineTo(width - nextRadius, 0);
		context.quadraticCurveTo(width, 0, width, nextRadius);
		context.lineTo(width, height - nextRadius);
		context.quadraticCurveTo(width, height, width - nextRadius, height);
		context.lineTo(nextRadius, height);
		context.quadraticCurveTo(0, height, 0, height - nextRadius);
		context.lineTo(0, nextRadius);
		context.quadraticCurveTo(0, 0, nextRadius, 0);
		context.clip();
	};

	const toCanvas = (options: CropperExportOptions = {}) => {
		if (!BROWSER || !imageElement) {
			throw Error('Cropper can export only in browser environment after image load');
		}

		const naturalCrop = cropToNaturalPixels(crop, imageElement.naturalWidth, imageElement.naturalHeight);
		const canvas = document.createElement('canvas');
		const context = canvas.getContext('2d');

		canvas.width = naturalCrop.width;
		canvas.height = naturalCrop.height;

		if (!context) {
			throw Error('Cannot create cropper canvas context');
		}

		const radius = options.rounded === false ? 0 : getCanvasRadius(canvas.width, canvas.height);
		if (radius > 0) {
			context.save();
			clipRoundedCanvas(context, canvas.width, canvas.height, radius);
		}

		if (options.fill) {
			context.fillStyle = options.fill;
			context.fillRect(0, 0, canvas.width, canvas.height);
		}

		context.drawImage(imageElement, naturalCrop.x, naturalCrop.y, naturalCrop.width, naturalCrop.height, 0, 0, canvas.width, canvas.height);

		if (radius > 0) context.restore();

		return canvas;
	};

	const api: CropperApi = {
		getCrop: () => crop,
		reset,
		toCanvas,
		toDataUrl: (options = {}) => toCanvas(options).toDataURL(options.type ?? 'image/png', options.quality),
		toBlob: (options = {}) =>
			new Promise((resolve, reject) => {
				toCanvas(options).toBlob(
					(blob) => {
						if (!blob) {
							reject(Error('Cannot create cropper blob'));
							return;
						}
						resolve(blob);
					},
					options.type ?? 'image/png',
					options.quality
				);
			})
	};

	$effect(() => {
		if (typeof src === 'string') {
			imageSrc = src;
			return;
		}

		if (!BROWSER) return;

		objectUrl = URL.createObjectURL(src);
		imageSrc = objectUrl;

		return () => {
			if (objectUrl) {
				URL.revokeObjectURL(objectUrl);
				objectUrl = undefined;
			}
		};
	});

	onMount(() => {
		onReady?.(api);

		return () => {
			stopDragging();
			resizeObserver?.disconnect();
			if (objectUrl) URL.revokeObjectURL(objectUrl);
		};
	});
</script>

<div class="cropper {containerClassName}" style={containerStyle}>
	<div class="cropper-frame {className}">
		{#if imageSrc}
			<img bind:this={imageElement} class="cropper-image {imageClassName}" src={imageSrc} alt="" draggable="false" onload={handleImageLoad} />
			<div
				class="cropper-selection {grid ? 'cropper-selection-grid' : ''}"
				style={cropStyle}
				onpointerdown={startMove}
				role="application"
				aria-label="Image crop area"
			>
				{#each handles as handle (handle)}
					<button
						class="cropper-handle cropper-handle-{handle}"
						style="--cropper-handle-color: {cropHandleColor}; --cropper-handle-size: {normalizeSize(cropHandleSize, '12px')};"
						aria-label="Resize crop area {handle}"
						onpointerdown={(event) => startResize(event, handle)}
						type="button"
					></button>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style lang="scss">
	.cropper {
		width: 100%;
		max-width: var(--cropper_max_width, 100%);
	}

	.cropper-frame {
		position: relative;
		width: 100%;
		min-height: var(--cropper_min_height, 280px);
		overflow: hidden;
		user-select: none;
		touch-action: none;
		background:
			linear-gradient(45deg, rgba(255, 255, 255, 0.06) 25%, transparent 25%), linear-gradient(-45deg, rgba(255, 255, 255, 0.06) 25%, transparent 25%),
			linear-gradient(45deg, transparent 75%, rgba(255, 255, 255, 0.06) 75%), linear-gradient(-45deg, transparent 75%, rgba(255, 255, 255, 0.06) 75%),
			rgb(20, 20, 20);
		background-position:
			0 0,
			0 8px,
			8px -8px,
			-8px 0;
		background-size: 16px 16px;
		border-radius: var(--cropper_frame_radius, 18px);
	}

	.cropper-image {
		display: block;
		width: 100%;
		height: auto;
		object-fit: contain;
		pointer-events: none;
	}

	.cropper-selection {
		position: absolute;
		cursor: move;
		touch-action: none;
		box-sizing: border-box;
		border: 2px solid;
		outline: 1px solid rgba(0, 0, 0, 0.18);
		box-shadow: 0 0 0 9999px var(--cropper-overlay);
	}

	.cropper-selection-grid::before,
	.cropper-selection-grid::after {
		content: '';
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.cropper-selection-grid::before {
		background:
			linear-gradient(90deg, transparent 33.333%, rgba(255, 255, 255, 0.55) 33.333%, rgba(255, 255, 255, 0.55) 34%, transparent 34%),
			linear-gradient(90deg, transparent 66.333%, rgba(255, 255, 255, 0.55) 66.333%, rgba(255, 255, 255, 0.55) 67%, transparent 67%);
	}

	.cropper-selection-grid::after {
		background:
			linear-gradient(0deg, transparent 33.333%, rgba(255, 255, 255, 0.55) 33.333%, rgba(255, 255, 255, 0.55) 34%, transparent 34%),
			linear-gradient(0deg, transparent 66.333%, rgba(255, 255, 255, 0.55) 66.333%, rgba(255, 255, 255, 0.55) 67%, transparent 67%);
	}

	.cropper-handle {
		position: absolute;
		width: var(--cropper-handle-size);
		height: var(--cropper-handle-size);
		padding: 0;
		border: 2px solid rgba(0, 0, 0, 0.35);
		border-radius: 999px;
		background: var(--cropper-handle-color);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.28);
	}

	.cropper-handle-n {
		top: 0;
		left: 50%;
		transform: translate(-50%, -50%);
		cursor: ns-resize;
	}

	.cropper-handle-s {
		bottom: 0;
		left: 50%;
		transform: translate(-50%, 50%);
		cursor: ns-resize;
	}

	.cropper-handle-e {
		top: 50%;
		right: 0;
		transform: translate(50%, -50%);
		cursor: ew-resize;
	}

	.cropper-handle-w {
		top: 50%;
		left: 0;
		transform: translate(-50%, -50%);
		cursor: ew-resize;
	}

	.cropper-handle-ne {
		top: 0;
		right: 0;
		transform: translate(50%, -50%);
		cursor: nesw-resize;
	}

	.cropper-handle-nw {
		top: 0;
		left: 0;
		transform: translate(-50%, -50%);
		cursor: nwse-resize;
	}

	.cropper-handle-se {
		right: 0;
		bottom: 0;
		transform: translate(50%, 50%);
		cursor: nwse-resize;
	}

	.cropper-handle-sw {
		bottom: 0;
		left: 0;
		transform: translate(-50%, 50%);
		cursor: nesw-resize;
	}
</style>

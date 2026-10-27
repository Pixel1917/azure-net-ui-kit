import type { Attachment } from 'svelte/attachments';
import { untrack } from 'svelte';

export interface ZoomTransform {
	x: number;
	y: number;
	scale: number;
}
export interface ZoomPoint {
	x: number;
	y: number;
}
export interface ZoomableOptions {
	minZoom?: number;
	maxZoom?: number;
	step?: number;
	wheel?: boolean;
	wheelSpeed?: number;
	duration?: number;
	/** Vertical alignment on mount/reset and while content fits. Defaults to center. */
	align?: 'center' | 'top' | 'bottom';
	/** Keep content inside its viewport; small content follows align. */
	bounds?: boolean;
	onChange?: (transform: ZoomTransform) => void;
}
export interface ZoomController {
	attachment: Attachment<HTMLElement>;
	getTransform(): ZoomTransform;
	zoomTo(scale: number, point?: ZoomPoint): void;
	zoomIn(): void;
	zoomOut(): void;
	panBy(x: number, y: number): void;
	reset(): void;
}
const positive = (value: number | undefined, fallback: number) => (Number.isFinite(value) && value! > 0 ? value! : fallback);

/** One controller per viewport. Construction is safe during SSR; DOM work starts on attachment. */
export function createZoomable(options: ZoomableOptions = {}): ZoomController {
	const min = positive(options.minZoom, 1);
	const max = Math.max(min, positive(options.maxZoom, 5));
	const step = positive(options.step, 1.25);
	const alignment = options.align === 'top' ? 0 : options.align === 'bottom' ? 1 : 0.5;
	let transform: ZoomTransform = { x: 0, y: 0, scale: min };
	let controls: Pick<ZoomController, 'zoomTo' | 'panBy' | 'reset'> | undefined;
	const controller: ZoomController = {
		attachment: (node) => untrack(() => attachment(node)),
		getTransform: () => ({ ...transform }),
		zoomTo: (scale, point) => controls?.zoomTo(scale, point),
		zoomIn: () => controls?.zoomTo(transform.scale * step),
		zoomOut: () => controls?.zoomTo(transform.scale / step),
		panBy: (x, y) => controls?.panBy(x, y),
		reset: () => controls?.reset()
	};
	function attachment(viewport: HTMLElement) {
		if (controls) throw new Error('Use a separate zoom controller for each mounted viewport');
		const content = viewport.firstElementChild as HTMLElement | null;
		const view = viewport.ownerDocument.defaultView;
		if (!view || !content) return;
		const saved = [
			content.style.transform,
			content.style.transformOrigin,
			content.style.willChange,
			viewport.style.touchAction,
			viewport.style.overflow,
			viewport.style.position
		];
		content.style.transformOrigin = '0 0';
		content.style.willChange = 'transform';
		viewport.style.touchAction = 'none';
		viewport.style.overflow = 'hidden';
		if (view.getComputedStyle(viewport).position === 'static' || !view.getComputedStyle(viewport).position) viewport.style.position = 'relative';
		let originX = content.offsetLeft;
		let originY = content.offsetTop;
		let frame = 0;
		let disposed = false;
		let rendered = { ...transform };
		let animationStart: number | undefined;
		let animationFrom = { ...transform };
		const pointers = new Map<number, ZoomPoint>();
		const reduced = view.matchMedia?.('(prefers-reduced-motion: reduce)');
		const duration = options.duration === 0 ? 0 : positive(options.duration, 160);
		function constrain(next: ZoomTransform) {
			if (options.bounds === false) return next;
			const axis = (value: number, size: number, available: number, align: number) =>
				size <= available ? (available - size) * align : Math.min(0, Math.max(available - size, value));
			return {
				...next,
				x: axis(next.x, content!.offsetWidth * next.scale, viewport.clientWidth, 0.5),
				y: axis(next.y, content!.offsetHeight * next.scale, viewport.clientHeight, alignment)
			};
		}
		function initialTransform(): ZoomTransform {
			return {
				x: (viewport.clientWidth - content!.offsetWidth * min) / 2,
				y: (viewport.clientHeight - content!.offsetHeight * min) * alignment,
				scale: min
			};
		}
		function draw() {
			// Compensate for flex/grid alignment and margins instead of adding them twice.
			content!.style.transform = `translate3d(${rendered.x - originX}px, ${rendered.y - originY}px, 0) scale(${rendered.scale})`;
		}
		function animate(time: number) {
			frame = 0;
			if (disposed) return;
			animationStart ??= time;
			const progress = duration === 0 || reduced?.matches ? 1 : Math.min(1, (time - animationStart) / duration);
			const ease = 1 - (1 - progress) ** 3;
			rendered = {
				x: animationFrom.x + (transform.x - animationFrom.x) * ease,
				y: animationFrom.y + (transform.y - animationFrom.y) * ease,
				scale: animationFrom.scale + (transform.scale - animationFrom.scale) * ease
			};
			draw();
			if (progress < 1) frame = view!.requestAnimationFrame(animate);
		}
		function set(next: ZoomTransform, smooth = false) {
			if (disposed || !Object.values(next).every(Number.isFinite)) return;
			if (frame) view!.cancelAnimationFrame(frame);
			frame = 0;
			transform = constrain(next);
			if (smooth && duration && !reduced?.matches) {
				animationFrom = { ...rendered };
				animationStart = undefined;
				frame = view!.requestAnimationFrame(animate);
			} else {
				rendered = { ...transform };
				draw();
			}
			options.onChange?.({ ...transform });
		}
		function zoom(scale: number, point: ZoomPoint = { x: viewport.clientWidth / 2, y: viewport.clientHeight / 2 }, smooth = true) {
			if (!Number.isFinite(scale) || scale <= 0) return;
			const nextScale = Math.max(min, Math.min(max, scale));
			const ratio = nextScale / transform.scale;
			set({ x: point.x - (point.x - transform.x) * ratio, y: point.y - (point.y - transform.y) * ratio, scale: nextScale }, smooth);
		}
		controls = {
			zoomTo: zoom,
			panBy: (x, y) => set({ ...transform, x: transform.x + x, y: transform.y + y }, true),
			reset: () => set(initialTransform(), true)
		};
		function point(event: MouseEvent): ZoomPoint {
			const rect = viewport.getBoundingClientRect();
			return {
				x: Number.isFinite(event.clientX) ? event.clientX - rect.left - viewport.clientLeft : viewport.clientWidth / 2,
				y: Number.isFinite(event.clientY) ? event.clientY - rect.top - viewport.clientTop : viewport.clientHeight / 2
			};
		}
		function down(event: PointerEvent) {
			if (event.button !== 0 || pointers.size >= 2) return;
			if ((event.target as Element).closest('button,a,input,textarea,select,[contenteditable]')) return;
			if (frame) {
				view!.cancelAnimationFrame(frame);
				frame = 0;
				transform = { ...rendered };
			}
			pointers.set(event.pointerId, point(event));
			viewport.setPointerCapture?.(event.pointerId);
			event.preventDefault();
		}
		function move(event: PointerEvent) {
			const previous = pointers.get(event.pointerId);
			if (!previous) return;
			const before = [...pointers.values()];
			const next = point(event);
			pointers.set(event.pointerId, next);
			if (pointers.size === 1) {
				set({ ...transform, x: transform.x + next.x - previous.x, y: transform.y + next.y - previous.y });
			} else {
				const after = [...pointers.values()];
				const distance = (pair: ZoomPoint[]) => Math.hypot(pair[1].x - pair[0].x, pair[1].y - pair[0].y);
				const midpoint = (pair: ZoomPoint[]) => ({ x: (pair[0].x + pair[1].x) / 2, y: (pair[0].y + pair[1].y) / 2 });
				const oldCenter = midpoint(before),
					center = midpoint(after);
				const scale = distance(before) > 0 ? Math.max(min, Math.min(max, (transform.scale * distance(after)) / distance(before))) : transform.scale;
				const ratio = scale / transform.scale;
				set({ x: center.x - (oldCenter.x - transform.x) * ratio, y: center.y - (oldCenter.y - transform.y) * ratio, scale });
			}
			event.preventDefault();
		}
		function up(event: PointerEvent) {
			pointers.delete(event.pointerId);
			if (viewport.hasPointerCapture?.(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
		}
		function release() {
			for (const id of pointers.keys()) if (viewport.hasPointerCapture?.(id)) viewport.releasePointerCapture(id);
			pointers.clear();
		}
		function wheel(event: WheelEvent) {
			if (options.wheel === false) return;
			const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.clientHeight : 1);
			const scale = Math.max(min, Math.min(max, transform.scale * Math.exp(-delta * positive(options.wheelSpeed, 0.002))));
			if (scale === transform.scale) return;
			event.preventDefault();
			zoom(scale, point(event));
		}
		function preventDrag(event: Event) {
			event.preventDefault();
		}
		function resize() {
			originX = content!.offsetLeft;
			originY = content!.offsetTop;
			set(transform);
		}
		viewport.addEventListener('pointerdown', down);
		viewport.addEventListener('pointermove', move);
		viewport.addEventListener('pointerup', up);
		viewport.addEventListener('pointercancel', up);
		viewport.addEventListener('lostpointercapture', up);
		viewport.addEventListener('wheel', wheel, { passive: false });
		viewport.addEventListener('dragstart', preventDrag);
		view.addEventListener('blur', release);
		view.addEventListener('resize', resize);
		const observer = typeof view.ResizeObserver === 'function' ? new view.ResizeObserver(resize) : undefined;
		observer?.observe(viewport);
		observer?.observe(content);
		set(initialTransform());
		return () => {
			disposed = true;
			controls = undefined;
			if (frame) view.cancelAnimationFrame(frame);
			release();
			observer?.disconnect();
			viewport.removeEventListener('pointerdown', down);
			viewport.removeEventListener('pointermove', move);
			viewport.removeEventListener('pointerup', up);
			viewport.removeEventListener('pointercancel', up);
			viewport.removeEventListener('lostpointercapture', up);
			viewport.removeEventListener('wheel', wheel);
			viewport.removeEventListener('dragstart', preventDrag);
			view.removeEventListener('blur', release);
			view.removeEventListener('resize', resize);
			[
				content.style.transform,
				content.style.transformOrigin,
				content.style.willChange,
				viewport.style.touchAction,
				viewport.style.overflow,
				viewport.style.position
			] = saved;
		};
	}
	return controller;
}

export function zoomable(options: ZoomableOptions = {}): Attachment<HTMLElement> {
	// Read every option in the factory's reactive scope, not in the untracked DOM setup.
	return createZoomable({ ...options }).attachment;
}

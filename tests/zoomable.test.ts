import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createZoomable, zoomable } from '../src/lib/utils/zoomable/index.js';

let viewport: HTMLDivElement;
let content: HTMLDivElement;
let cleanup: (() => void) | void;
beforeEach(() => {
	viewport = document.createElement('div');
	content = document.createElement('div');
	viewport.append(content);
	document.body.append(viewport);
	Object.defineProperties(viewport, { clientWidth: { value: 200 }, clientHeight: { value: 100 } });
	Object.defineProperties(content, { offsetWidth: { value: 200, configurable: true }, offsetHeight: { value: 100, configurable: true } });
	viewport.setPointerCapture = vi.fn();
	viewport.hasPointerCapture = vi.fn(() => false);
});
afterEach(() => {
	cleanup?.();
	cleanup = undefined;
	document.body.innerHTML = '';
	vi.restoreAllMocks();
});
function pointer(type: string, id: number, x: number, y: number) {
	viewport.dispatchEvent(new PointerEvent(type, { pointerId: id, clientX: x, clientY: y, button: 0, bubbles: true, cancelable: true }));
}
describe('zoomable', () => {
	it.each(['center', 'top', 'bottom'] as const)('aligns smaller content at %s and restores alignment after reset', (align) => {
		Object.defineProperties(content, { offsetWidth: { value: 80 }, offsetHeight: { value: 40 } });
		const expectedY = align === 'top' ? 0 : align === 'bottom' ? 60 : 30;
		const controller = createZoomable({ align, duration: 0 });
		cleanup = controller.attachment(viewport);
		expect(controller.getTransform()).toEqual({ x: 60, y: expectedY, scale: 1 });
		controller.zoomTo(4);
		controller.panBy(-100, -100);
		controller.reset();
		expect(controller.getTransform()).toEqual({ x: 60, y: expectedY, scale: 1 });
		Object.defineProperty(content, 'offsetHeight', { value: 60 });
		window.dispatchEvent(new Event('resize'));
		expect(controller.getTransform().y).toBe(align === 'top' ? 0 : align === 'bottom' ? 40 : 20);
	});
	it('compensates existing layout offsets and restores viewport positioning', () => {
		Object.defineProperties(content, { offsetLeft: { value: 25 }, offsetTop: { value: 30 } });
		const controller = createZoomable({ duration: 0 });
		cleanup = controller.attachment(viewport);
		expect(content.style.transform).toContain('translate3d(-25px, -30px, 0)');
		expect(viewport.style.position).toBe('relative');
		cleanup?.();
		cleanup = undefined;
		expect(viewport.style.position).toBe('');
	});
	it('constructs without DOM and ignores controller calls before attachment', () => {
		const controller = createZoomable();
		controller.zoomIn();
		controller.panBy(10, 20);
		controller.reset();
		expect(controller.getTransform()).toEqual({ x: 0, y: 0, scale: 1 });
		expect(typeof zoomable()).toBe('function');
	});
	it('zooms around a focal point, clamps, bounds pan, resets and restores styles', () => {
		content.style.transform = 'rotate(2deg)';
		viewport.style.overflow = 'auto';
		const controller = createZoomable({ duration: 0, maxZoom: 3 });
		cleanup = controller.attachment(viewport);
		controller.zoomTo(2, { x: 100, y: 50 });
		expect(controller.getTransform()).toEqual({ x: -100, y: -50, scale: 2 });
		controller.panBy(-1000, -1000);
		expect(controller.getTransform()).toEqual({ x: -200, y: -100, scale: 2 });
		controller.zoomTo(99);
		expect(controller.getTransform().scale).toBe(3);
		controller.zoomTo(NaN);
		expect(controller.getTransform().scale).toBe(3);
		controller.reset();
		expect(controller.getTransform()).toEqual({ x: 0, y: 0, scale: 1 });
		cleanup?.();
		cleanup = undefined;
		expect(content.style.transform).toBe('rotate(2deg)');
		expect(viewport.style.overflow).toBe('auto');
		controller.zoomIn();
		expect(content.style.transform).toBe('rotate(2deg)');
	});
	it('pans, pinches, transitions back to one finger and cancels pointers', () => {
		const controller = createZoomable({ duration: 0, bounds: false });
		cleanup = controller.attachment(viewport);
		pointer('pointerdown', 1, 0, 0);
		pointer('pointermove', 1, 10, 20);
		expect(controller.getTransform()).toEqual({ x: 10, y: 20, scale: 1 });
		pointer('pointerdown', 2, 110, 20);
		pointer('pointermove', 2, 210, 20);
		expect(controller.getTransform().scale).toBe(2);
		pointer('pointerup', 2, 210, 20);
		const before = controller.getTransform();
		pointer('pointermove', 1, 20, 20);
		expect(controller.getTransform().x).toBe(before.x + 10);
		pointer('pointercancel', 1, 20, 20);
		pointer('pointermove', 1, 100, 100);
		expect(controller.getTransform().x).toBe(before.x + 10);
	});
	it('normalizes wheel deltas and does not trap scrolling at zoom limits', () => {
		const controller = createZoomable({ duration: 0 });
		cleanup = controller.attachment(viewport);
		const atLimit = new WheelEvent('wheel', { deltaY: 100, cancelable: true });
		viewport.dispatchEvent(atLimit);
		expect(atLimit.defaultPrevented).toBe(false);
		const zoom = new WheelEvent('wheel', { deltaY: -4, deltaMode: 1, cancelable: true });
		viewport.dispatchEvent(zoom);
		expect(zoom.defaultPrevented).toBe(true);
		expect(controller.getTransform().scale).toBeGreaterThan(1);
	});
	it('cancels pending animation and detaches listeners', () => {
		const cancel = vi.spyOn(window, 'cancelAnimationFrame');
		const controller = createZoomable();
		cleanup = controller.attachment(viewport);
		controller.zoomIn();
		cleanup?.();
		cleanup = undefined;
		expect(cancel).toHaveBeenCalled();
		const before = controller.getTransform();
		viewport.dispatchEvent(new WheelEvent('wheel', { deltaY: -100 }));
		expect(controller.getTransform()).toEqual(before);
	});
});

it('interpolates smooth transforms and respects reduced motion', () => {
	let callback: FrameRequestCallback | undefined;
	const request = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((next) => {
		callback = next;
		return 1;
	});
	vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
	const controller = createZoomable({ duration: 100 });
	cleanup = controller.attachment(viewport);
	controller.zoomTo(2);
	expect(content.style.transform).toContain('scale(1)');
	callback!(0);
	callback!(50);
	expect(content.style.transform).toContain('scale(1.875)');
	callback!(100);
	expect(content.style.transform).toContain('scale(2)');
	cleanup?.();
	cleanup = undefined;
	vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);
	const reduced = createZoomable();
	cleanup = reduced.attachment(viewport);
	request.mockClear();
	reduced.zoomTo(2);
	expect(content.style.transform).toContain('scale(2)');
	expect(request).not.toHaveBeenCalled();
});

it('recreates the attachment for reactive wheel options and cleans up on unmount', async () => {
	const { mount, flushSync, unmount } = await import('svelte');
	const { default: Fixture } = await import('./fixtures/ZoomAttachment.svelte');
	const instance = mount(Fixture, { target: document.body });
	flushSync();
	const node = document.querySelector('.viewport')!;
	node.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, cancelable: true }));
	expect(instance.getTransform().scale).toBeGreaterThan(1);
	instance.setWheel(false);
	flushSync();
	expect(instance.getTransform().scale).toBe(1);
	node.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, cancelable: true }));
	expect(instance.getTransform().scale).toBe(1);
	await unmount(instance);
	node.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, cancelable: true }));
	expect(instance.getTransform().scale).toBe(1);
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAnimate } from '../src/lib/utils/useAnimate/index.js';

let callbacks: IntersectionObserverCallback[];
let disconnect: ReturnType<typeof vi.fn>;
let node: HTMLElement;
const emit = (visible: boolean, index = callbacks.length - 1) =>
	callbacks[index]([{ target: node, isIntersecting: visible } as unknown as IntersectionObserverEntry], {} as IntersectionObserver);

beforeEach(() => {
	vi.useFakeTimers();
	callbacks = [];
	disconnect = vi.fn();
	node = document.createElement('div');
	vi.stubGlobal(
		'IntersectionObserver',
		class {
			constructor(callback: IntersectionObserverCallback) {
				callbacks.push(callback);
			}
			observe() {}
			disconnect = disconnect;
		}
	);
});
afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe('useAnimate', () => {
	it('reveals once, tokenizes arrays, preserves preexisting classes on cleanup', () => {
		node.className = 'existing';
		const action = useAnimate(node, { classes: ['existing', 'fade active', 'fade'] });
		emit(true);
		expect(node.className).toBe('existing fade active');
		expect(disconnect).toHaveBeenCalled();
		action?.destroy?.();
		expect(node.className).toBe('existing');
	});
	it('cancels delayed reveal on exit and repeats with once false', () => {
		const action = useAnimate(node, { classes: 'active', delay: 100, once: false });
		emit(true);
		vi.advanceTimersByTime(50);
		emit(false);
		vi.advanceTimersByTime(100);
		expect(node.className).toBe('');
		emit(true);
		vi.advanceTimersByTime(100);
		expect(node.className).toBe('active');
		emit(false);
		expect(node.className).toBe('');
		action?.destroy?.();
	});
	it('replaces settings, ignores stale callbacks and cancels pending work on destroy', () => {
		const action = useAnimate(node, { classes: 'old', delay: 100 });
		emit(true);
		action?.update?.({ classes: 'new' });
		emit(true, 0);
		vi.advanceTimersByTime(200);
		expect(node.className).toBe('');
		emit(true);
		expect(node.className).toBe('new');
		action?.update?.({ classes: 'changed' });
		expect(node.className).toBe('changed');
		action?.destroy?.();
		emit(true);
		vi.runAllTimers();
		expect(node.className).toBe('');
	});
	it('supports disabling and falls back without IntersectionObserver', () => {
		const action = useAnimate(node, { classes: 'active', enabled: false });
		expect(callbacks).toHaveLength(0);
		vi.stubGlobal('IntersectionObserver', undefined);
		action?.update?.({ classes: 'active' });
		expect(node.className).toBe('active');
		action?.update?.({ enabled: false });
		expect(node.className).toBe('');
		action?.destroy?.();
	});
	it('does not access the element on the server', () => {
		vi.stubGlobal('window', undefined);
		expect(() => useAnimate(undefined as unknown as HTMLElement, { classes: 'active' })).not.toThrow();
		expect(callbacks).toHaveLength(0);
	});
});

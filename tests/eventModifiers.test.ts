import { describe, expect, it, vi } from 'vitest';
import { event, immediate, once, prevent, stop } from '../src/lib/utils/eventModifiers/EventModifiers.js';

const createEventMock = () =>
	({
		preventDefault: vi.fn(),
		stopPropagation: vi.fn(),
		stopImmediatePropagation: vi.fn()
	}) as unknown as Event;

describe('eventModifiers', () => {
	it('supports chained modifiers and once semantics', () => {
		const fn = vi.fn();
		const handler = event.prevent.stop.immediate.once(fn);
		const evt = createEventMock();

		handler(evt);
		handler(evt);

		expect(fn).toHaveBeenCalledTimes(1);
		expect(evt.preventDefault).toHaveBeenCalledTimes(1);
		expect(evt.stopPropagation).toHaveBeenCalledTimes(1);
		expect(evt.stopImmediatePropagation).toHaveBeenCalledTimes(1);
	});

	it('supports alias modifier names', () => {
		const fn = vi.fn();
		const handler = event.preventDefault.stopPropagation.stopImmediatePropagation(fn);
		const evt = createEventMock();

		handler(evt);

		expect(fn).toHaveBeenCalledTimes(1);
		expect(evt.preventDefault).toHaveBeenCalledTimes(1);
		expect(evt.stopPropagation).toHaveBeenCalledTimes(1);
		expect(evt.stopImmediatePropagation).toHaveBeenCalledTimes(1);
	});

	it('preconfigured modifiers keep existing API', () => {
		const fn = vi.fn();
		const evt = createEventMock();

		prevent(fn)(evt);
		stop(fn)(evt);
		immediate(fn)(evt);
		const onceHandler = once(fn);
		onceHandler(evt);
		onceHandler(evt);

		expect(fn).toHaveBeenCalledTimes(4);
		expect(evt.preventDefault).toHaveBeenCalledTimes(1);
		expect(evt.stopPropagation).toHaveBeenCalledTimes(1);
		expect(evt.stopImmediatePropagation).toHaveBeenCalledTimes(1);
	});
});

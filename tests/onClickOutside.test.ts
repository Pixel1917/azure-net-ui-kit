import { beforeEach, describe, expect, it, vi } from 'vitest';
import { onClickOutside } from '../src/lib/utils/onClickOutside/OnClickOutside.js';

describe('onClickOutside', () => {
	let node: HTMLElement;
	let initiator: HTMLElement;
	let outside: HTMLElement;

	beforeEach(() => {
		document.body.innerHTML = '';

		node = document.createElement('div');
		initiator = document.createElement('button');
		outside = document.createElement('section');

		document.body.append(node, initiator, outside);
	});

	it('dispatches outside event when clicking outside', () => {
		const action = onClickOutside(node, initiator);
		const listener = vi.fn();
		node.addEventListener('outside', listener);

		outside.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));

		expect(listener).toHaveBeenCalledTimes(1);
		const event = listener.mock.calls[0][0] as CustomEvent;
		expect(event.detail.node).toBe(node);
		expect(event.detail.initiator).toBe(initiator);
		expect(event.detail.originalEvent).toBeInstanceOf(MouseEvent);

		action.destroy();
	});

	it('does not dispatch when clicking node or initiator', () => {
		const action = onClickOutside(node, initiator);
		const listener = vi.fn();
		node.addEventListener('outside', listener);

		node.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
		initiator.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));

		expect(listener).not.toHaveBeenCalled();
		action.destroy();
	});

	it('supports update for enabled and event type', () => {
		const action = onClickOutside(node, { event: 'click', enabled: true });
		const listener = vi.fn();
		node.addEventListener('outside', listener);

		action.update({ event: 'click', enabled: false });
		outside.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
		expect(listener).not.toHaveBeenCalled();

		action.update({ event: 'mousedown', enabled: true });
		outside.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
		expect(listener).not.toHaveBeenCalled();
		outside.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, composed: true }));
		expect(listener).toHaveBeenCalledTimes(1);

		action.destroy();
	});

	it('stops handling events after destroy', () => {
		const action = onClickOutside(node);
		const listener = vi.fn();
		node.addEventListener('outside', listener);

		action.destroy();
		outside.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));

		expect(listener).not.toHaveBeenCalled();
	});
});

describe('clickOutside attachment', () => {
	it('invokes callback, ignores descendants without composedPath and cleans up', async () => {
		const { clickOutside } = await import('../src/lib/utils/onClickOutside/OnClickOutside.js');
		const node = document.createElement('div');
		const child = document.createElement('span');
		node.append(child);
		document.body.append(node);
		const add = vi.spyOn(document, 'addEventListener');
		const onOutside = vi.fn();
		const cleanup = clickOutside({ onOutside })(node);
		const listener = add.mock.calls.find(([type]) => type === 'click')![1] as EventListener;
		const inside = new MouseEvent('click', { bubbles: true });
		Object.defineProperty(inside, 'composedPath', { value: undefined });
		Object.defineProperty(inside, 'target', { value: child });
		listener(inside);
		add.mockRestore();
		expect(onOutside).not.toHaveBeenCalled();
		document.body.click();
		expect(onOutside).toHaveBeenCalledTimes(1);
		cleanup?.();
		document.body.click();
		expect(onOutside).toHaveBeenCalledTimes(1);
	});
	it('rebinds when passive changes', () => {
		const node = document.createElement('div');
		document.body.append(node);
		const remove = vi.spyOn(document, 'removeEventListener');
		const action = onClickOutside(node, { passive: true });
		action.update({ passive: false });
		expect(remove).toHaveBeenCalledWith('click', expect.any(Function), true);
		action.destroy();
		remove.mockRestore();
	});
});

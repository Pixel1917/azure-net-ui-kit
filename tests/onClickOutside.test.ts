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

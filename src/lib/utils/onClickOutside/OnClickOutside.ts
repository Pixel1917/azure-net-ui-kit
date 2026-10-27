import type { Attachment } from 'svelte/attachments';

export type OnClickOutsideEventType = 'click' | 'pointerdown' | 'mousedown' | 'touchstart';

export type OnClickOutsideOptions = {
	initiator?: HTMLElement | null;
	enabled?: boolean;
	event?: OnClickOutsideEventType;
	capture?: boolean;
	passive?: boolean;
	onOutside?: (detail: OnClickOutsideEventDetail) => void;
};

export type OnClickOutsideEventDetail = {
	node: HTMLElement;
	initiator?: HTMLElement;
	originalEvent: Event;
};

type ResolvedOnClickOutsideOptions = {
	initiator: HTMLElement | null;
	enabled: boolean;
	event: OnClickOutsideEventType;
	capture: boolean;
	passive: boolean;
	onOutside?: (detail: OnClickOutsideEventDetail) => void;
};

const resolveOptions = (initiatorOrOptions?: HTMLElement | OnClickOutsideOptions): ResolvedOnClickOutsideOptions => {
	if (initiatorOrOptions && 'nodeType' in initiatorOrOptions) {
		return {
			initiator: initiatorOrOptions,
			enabled: true,
			event: 'click',
			capture: true,
			passive: true
		};
	}

	return {
		initiator: initiatorOrOptions?.initiator ?? null,
		enabled: initiatorOrOptions?.enabled ?? true,
		event: initiatorOrOptions?.event ?? 'click',
		capture: initiatorOrOptions?.capture ?? true,
		passive: initiatorOrOptions?.passive ?? true,
		onOutside: initiatorOrOptions?.onOutside
	};
};

const hasNodeInPath = (path: EventTarget[], node: HTMLElement | null): boolean => {
	return !!node && path.includes(node);
};

export const onClickOutside = (node: HTMLElement, initiatorOrOptions?: HTMLElement | OnClickOutsideOptions) => {
	if (!node?.ownerDocument?.defaultView) {
		return {
			update() {},
			destroy() {}
		};
	}

	let options = resolveOptions(initiatorOrOptions);
	const document = node.ownerDocument;
	const view = document.defaultView!;

	const listener = (event: Event): void => {
		if (!options.enabled) return;
		if (!(event.target instanceof view.Node)) return;

		const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
		if (
			node.contains(event.target) ||
			options.initiator?.contains(event.target) ||
			hasNodeInPath(path, node) ||
			hasNodeInPath(path, options.initiator)
		) {
			return;
		}

		const detail = { node, initiator: options.initiator ?? undefined, originalEvent: event };
		options.onOutside?.(detail);
		node.dispatchEvent(new view.CustomEvent('outside', { detail }));
	};

	const bind = () => {
		document.addEventListener(options.event, listener, {
			capture: options.capture,
			passive: options.passive
		});
	};

	const unbind = (eventType: OnClickOutsideEventType, capture: boolean) => {
		document.removeEventListener(eventType, listener, capture);
	};

	bind();

	return {
		update(next?: HTMLElement | OnClickOutsideOptions) {
			const prev = options;
			options = resolveOptions(next);

			if (prev.event !== options.event || prev.capture !== options.capture || prev.passive !== options.passive) {
				unbind(prev.event, prev.capture);
				bind();
			}
		},
		destroy(): void {
			unbind(options.event, options.capture);
		}
	};
};

/** Reactive options recreate the listener; the legacy action remains available. */
export const clickOutside =
	(options: OnClickOutsideOptions = {}): Attachment<HTMLElement> =>
	(node) =>
		onClickOutside(node, options).destroy;

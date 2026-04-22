import { BROWSER } from '@azure-net/tools/environment';

export type OnClickOutsideEventType = 'click' | 'pointerdown' | 'mousedown' | 'touchstart';

export type OnClickOutsideOptions = {
	initiator?: HTMLElement | null;
	enabled?: boolean;
	event?: OnClickOutsideEventType;
	capture?: boolean;
	passive?: boolean;
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
};

const resolveOptions = (initiatorOrOptions?: HTMLElement | OnClickOutsideOptions): ResolvedOnClickOutsideOptions => {
	if (initiatorOrOptions instanceof HTMLElement) {
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
		passive: initiatorOrOptions?.passive ?? true
	};
};

const hasNodeInPath = (path: EventTarget[], node: HTMLElement | null): boolean => {
	return !!node && path.includes(node);
};

export const onClickOutside = (node: HTMLElement, initiatorOrOptions?: HTMLElement | OnClickOutsideOptions) => {
	if (!BROWSER || typeof document === 'undefined') {
		return {
			update() {},
			destroy() {}
		};
	}

	let options = resolveOptions(initiatorOrOptions);

	const listener = (event: Event): void => {
		if (!options.enabled) return;
		if (!(event.target instanceof Node)) return;

		const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
		if (event.target === node || hasNodeInPath(path, node) || hasNodeInPath(path, options.initiator)) {
			return;
		}

		node.dispatchEvent(
			new CustomEvent<OnClickOutsideEventDetail>('outside', {
				detail: {
					node,
					initiator: options.initiator ?? undefined,
					originalEvent: event
				}
			})
		);
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

			if (prev.event !== options.event || prev.capture !== options.capture) {
				unbind(prev.event, prev.capture);
				bind();
			}
		},
		destroy(): void {
			unbind(options.event, options.capture);
		}
	};
};

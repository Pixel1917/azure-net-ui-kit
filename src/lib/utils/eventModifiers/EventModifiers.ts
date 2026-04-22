export type EventHandler<E = Event> = (event: E) => void;

interface EventModifier<E extends Event = Event> {
	(fn: () => void): EventHandler<E>;
	prevent: EventModifier<E>;
	stop: EventModifier<E>;
	immediate: EventModifier<E>;
	once: EventModifier<E>;
	preventDefault: EventModifier<E>;
	stopPropagation: EventModifier<E>;
	stopImmediatePropagation: EventModifier<E>;
}

const FLAG_PREVENT = 1 << 0;
const FLAG_STOP = 1 << 1;
const FLAG_IMMEDIATE = 1 << 2;
const FLAG_ONCE = 1 << 3;

const flagByProp: Record<string, number | undefined> = {
	prevent: FLAG_PREVENT,
	preventDefault: FLAG_PREVENT,
	stop: FLAG_STOP,
	stopPropagation: FLAG_STOP,
	immediate: FLAG_IMMEDIATE,
	stopImmediatePropagation: FLAG_IMMEDIATE,
	once: FLAG_ONCE
};

const createEventModifier = <E extends Event = Event>(initialMask = 0): EventModifier<E> => {
	const cache = new Map<number, EventModifier<E>>();
	const baseCallable = () => {};

	const getOrCreate = (mask: number): EventModifier<E> => {
		const cached = cache.get(mask);
		if (cached) return cached;

		const proxy = new Proxy(baseCallable, {
			get(_, prop: string | symbol) {
				if (typeof prop !== 'string') return undefined;

				const flag = flagByProp[prop];
				if (flag === undefined) return undefined;

				return getOrCreate(mask | flag);
			},
			apply(_, __, [fn]: [() => void]): EventHandler<E> {
				let executed = false;

				return (event: E) => {
					if ((mask & FLAG_ONCE) !== 0 && executed) return;

					if ((mask & FLAG_PREVENT) !== 0) {
						event.preventDefault();
					}
					if ((mask & FLAG_STOP) !== 0) {
						event.stopPropagation();
					}
					if ((mask & FLAG_IMMEDIATE) !== 0) {
						event.stopImmediatePropagation();
					}

					if ((mask & FLAG_ONCE) !== 0) executed = true;

					fn();
				};
			}
		}) as unknown as EventModifier<E>;

		cache.set(mask, proxy);
		return proxy;
	};

	return getOrCreate(initialMask);
};

export const prevent = createEventModifier(FLAG_PREVENT);
export const stop = createEventModifier(FLAG_STOP);
export const immediate = createEventModifier(FLAG_IMMEDIATE);
export const once = createEventModifier(FLAG_ONCE);
export const event = createEventModifier();

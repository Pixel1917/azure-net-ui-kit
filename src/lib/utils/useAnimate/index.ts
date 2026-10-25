import type { Action } from 'svelte/action';

export interface UseAnimateOptions {
	classes?: string | string[];
	delay?: number;
	root?: Element | Document | null;
	rootMargin?: string;
	threshold?: number | number[];
	once?: boolean;
	enabled?: boolean;
}

const tokens = (classes?: string | string[]) => [
	...new Set((Array.isArray(classes) ? classes : [classes ?? '']).flatMap((value) => value.split(/\s+/)).filter(Boolean))
];

/** Adds classes when visible. Updates replace options; destroy removes only classes added by this action. */
export const useAnimate: Action<HTMLElement, UseAnimateOptions | undefined> = (node, input) => {
	if (typeof window === 'undefined') return {};
	let options = input ?? {};
	let observer: IntersectionObserver | undefined;
	let timer: ReturnType<typeof setTimeout> | undefined;
	let generation = 0;
	let destroyed = false;
	let completed = false;
	let visible = false;
	const owned = new Set<string>();
	const remove = () => {
		for (const token of owned) node.classList.remove(token);
		owned.clear();
	};
	const cancel = () => {
		if (timer !== undefined) clearTimeout(timer);
		timer = undefined;
	};
	const stop = () => {
		generation++;
		cancel();
		observer?.disconnect();
		observer = undefined;
	};
	const reveal = () => {
		if (destroyed) return;
		for (const token of tokens(options.classes)) {
			if (!node.classList.contains(token)) {
				owned.add(token);
				node.classList.add(token);
			}
		}
		if (options.once !== false) {
			completed = true;
			observer?.disconnect();
			observer = undefined;
		}
	};
	const attach = () => {
		stop();
		visible = false;
		if (options.enabled === false) return;
		if (completed && options.once !== false) {
			reveal();
			return;
		}
		completed = false;
		const version = generation;
		if (typeof IntersectionObserver === 'undefined') {
			reveal();
			return;
		}
		observer = new IntersectionObserver(
			(entries) => {
				if (destroyed || generation !== version || completed) return;
				const entry = entries.filter((entry) => entry.target === node).at(-1);
				if (!entry || entry.isIntersecting === visible) return;
				visible = entry.isIntersecting;
				cancel();
				if (!visible) {
					if (options.once === false) remove();
					return;
				}
				const delay = options.delay ?? 0;
				if (Number.isFinite(delay) && delay > 0)
					timer = setTimeout(() => {
						timer = undefined;
						if (generation === version && !destroyed) reveal();
					}, delay);
				else reveal();
			},
			{ root: options.root ?? null, rootMargin: options.rootMargin ?? '0px', threshold: options.threshold ?? 0 }
		);
		observer.observe(node);
	};
	attach();
	return {
		update(next) {
			if (destroyed) return;
			remove();
			options = next ?? {};
			attach();
		},
		destroy() {
			destroyed = true;
			stop();
			remove();
		}
	};
};

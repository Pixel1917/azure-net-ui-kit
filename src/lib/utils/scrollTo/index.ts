import { BROWSER } from '@azure-net/tools/environment';

export type ScrollToOptions = {
	offset?: number;
	behavior?: ScrollBehavior;
	/**
	 * When true, prevents negative top value for the final window scroll position.
	 */
	clampTop?: boolean;
};

const DEFAULT_OFFSET = 220;
const DEFAULT_BEHAVIOR: ScrollBehavior = 'smooth';

const resolveElement = (target: string | Element): Element | null => {
	if (typeof target !== 'string') return target;

	try {
		return document.querySelector(target);
	} catch {
		return null;
	}
};

const resolveOptions = (optionsOrOffset?: number | ScrollToOptions): Required<ScrollToOptions> => {
	if (typeof optionsOrOffset === 'number') {
		return {
			offset: optionsOrOffset,
			behavior: DEFAULT_BEHAVIOR,
			clampTop: true
		};
	}

	return {
		offset: optionsOrOffset?.offset ?? DEFAULT_OFFSET,
		behavior: optionsOrOffset?.behavior ?? DEFAULT_BEHAVIOR,
		clampTop: optionsOrOffset?.clampTop ?? true
	};
};

export const scrollTo = (target: string | Element, optionsOrOffset?: number | ScrollToOptions): boolean => {
	if (!BROWSER) return false;

	const element = resolveElement(target);
	if (!element) return false;

	const { offset, behavior, clampTop } = resolveOptions(optionsOrOffset);
	const rect = element.getBoundingClientRect();
	const rawTop = rect.top + window.scrollY - offset;
	const top = clampTop ? Math.max(0, rawTop) : rawTop;

	window.scrollTo({ top, behavior });
	return true;
};

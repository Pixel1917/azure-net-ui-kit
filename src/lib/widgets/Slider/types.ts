import type { Snippet } from 'svelte';

export interface SliderLayout {
	slidesPerView?: number;
	spaceBetween?: number;
}
export interface SliderApi {
	readonly activeIndex: number;
	readonly isBeginning: boolean;
	readonly isEnd: boolean;
	readonly pageCount: number;
	slideTo(index: number, behavior?: ScrollBehavior): void;
	slideNext(): void;
	slidePrev(): void;
}
export interface SliderProps<T> extends SliderLayout {
	items: readonly T[];
	slide: Snippet<[T, number]>;
	/** Omit for positional reuse (duplicates allowed); supply unique keys to preserve item identity. */
	getKey?: (item: T) => string | number;
	breakpoints?: Record<number, SliderLayout>;
	navigation?: Snippet<[SliderApi]>;
	pagination?: Snippet<[SliderApi]>;
	showNavigation?: boolean;
	showPagination?: boolean;
	/** Opt in to decorations imported separately from @azure-net/ui-kit/slider.css. */
	styled?: boolean;
	label?: string;
	className?: string;
	onReady?: (api: SliderApi) => void;
	onChange?: (index: number) => void;
}

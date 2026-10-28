import type { SliderLayout } from './types.js';

export function normalizeLayout(layout: SliderLayout) {
	return {
		slidesPerView:
			layout.slidesPerView === 'auto'
				? ('auto' as const)
				: Number.isFinite(layout.slidesPerView) && layout.slidesPerView! > 0
					? layout.slidesPerView!
					: 1,
		spaceBetween: Number.isFinite(layout.spaceBetween) && layout.spaceBetween! >= 0 ? layout.spaceBetween! : 0
	};
}

/** Only finite numeric values enter the SSR stylesheet. The id comes from $props.id(). */
export function sliderCss(id: string, base: SliderLayout, breakpoints: Record<number, SliderLayout>) {
	const selector = `[data-slider="${id.replace(/[^a-zA-Z0-9_-]/g, '_')}"]`;
	const rule = (layout: SliderLayout) => {
		const { slidesPerView, spaceBetween } = normalizeLayout(layout);
		const basis = slidesPerView === 'auto' ? 'auto' : 'calc((100% - (var(--slider-view) - 1) * var(--slider-gap)) / var(--slider-view))';
		return `${selector}{--slider-view:${slidesPerView};--slider-gap:${spaceBetween}px;--slider-basis:${basis};}`;
	};
	return (
		rule(base) +
		Object.entries(breakpoints)
			.filter(([width]) => Number.isFinite(Number(width)) && Number(width) >= 0)
			.sort(([a], [b]) => Number(a) - Number(b))
			.map(([width, layout]) => `@media(min-width:${Number(width)}px){${rule({ ...base, ...layout })}}`)
			.join('')
	);
}

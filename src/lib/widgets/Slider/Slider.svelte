<script lang="ts" generics="T">
	import { untrack } from 'svelte';
	import type { SliderApi, SliderProps } from './types.js';
	import { sliderCss } from './utils.js';
	import { attachMouseDrag } from './mouseDrag.js';

	let {
		items,
		slide,
		getKey,
		slidesPerView = 1,
		spaceBetween = 0,
		breakpoints = {},
		navigation,
		pagination,
		showNavigation = false,
		showPagination = false,
		styled = false,
		label = 'Slides',
		className = '',
		onReady,
		onChange
	}: SliderProps<T> = $props();
	const uid = $props.id();
	const id = uid.replace(/[^a-zA-Z0-9_-]/g, '_');
	const css = $derived(sliderCss(id, { slidesPerView, spaceBetween }, breakpoints));
	let viewport: HTMLDivElement | undefined;
	let activeIndex = $state(0);
	let pageCount = $state(0);
	let positions: number[] = [];
	let targetIndex = $state<number>();

	const api: SliderApi = {
		get activeIndex() {
			return activeIndex;
		},
		get pageCount() {
			return pageCount;
		},
		get isBeginning() {
			return (targetIndex ?? activeIndex) === 0;
		},
		get isEnd() {
			return pageCount === 0 || (targetIndex ?? activeIndex) >= pageCount - 1;
		},
		slideTo,
		slideNext: () => slideTo((targetIndex ?? activeIndex) + 1),
		slidePrev: () => slideTo((targetIndex ?? activeIndex) - 1)
	};
	function slideTo(index: number, behavior: ScrollBehavior = 'smooth') {
		if (!viewport || !Number.isFinite(index) || !positions.length) return;
		targetIndex = Math.max(0, Math.min(Math.round(index), positions.length - 1));
		const reduced = viewport.ownerDocument.defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches;
		viewport.scrollTo({ left: positions[targetIndex], behavior: reduced ? 'instant' : behavior });
	}
	function sync() {
		if (!viewport) return;
		let nearest = 0;
		positions.forEach((position, index) => {
			if (Math.abs(position - viewport!.scrollLeft) < Math.abs(positions[nearest] - viewport!.scrollLeft)) nearest = index;
		});
		if (nearest !== activeIndex) {
			activeIndex = nearest;
			onChange?.(nearest);
		}
		if (targetIndex !== undefined && Math.abs(viewport.scrollLeft - positions[targetIndex]) < 1) targetIndex = undefined;
	}
	function measure() {
		if (!viewport) return;
		const max = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
		// The positioned viewport is the slides' shared offsetParent. Avoid transformed screen pixels.
		const origin = (viewport.firstElementChild as HTMLElement | null)?.offsetLeft ?? 0;
		let nextPositions = Array.from(viewport.children, (child) => Math.min(max, Math.max(0, (child as HTMLElement).offsetLeft - origin)));
		nextPositions = nextPositions.filter((value, index) => index === 0 || value - nextPositions[index - 1] > 1);
		if (nextPositions.length && max - nextPositions[nextPositions.length - 1] > 1) nextPositions.push(max);
		// Redundant measurements must not cancel a pending smooth-navigation target.
		if (nextPositions.length !== positions.length || nextPositions.some((value, index) => Math.abs(value - positions[index]) > 1)) {
			targetIndex = undefined;
		}
		positions = nextPositions;
		pageCount = positions.length;
		sync();
	}
	function setup(node: HTMLDivElement) {
		// Re-measure when layout props change, even if the viewport itself does not resize.
		void css;
		viewport = node;
		const view = node.ownerDocument.defaultView!;
		const resize = typeof view.ResizeObserver === 'function' ? new view.ResizeObserver(measure) : undefined;
		resize?.observe(node);
		const mutation = new view.MutationObserver(measure);
		mutation.observe(node, { childList: true, subtree: true });
		view.addEventListener('resize', measure);
		untrack(() => {
			measure();
			onReady?.(api);
		});
		const frame = view.requestAnimationFrame(measure);
		const cleanupDrag = attachMouseDrag(node, () => positions, slideTo);
		return () => {
			cleanupDrag();
			view.cancelAnimationFrame(frame);
			resize?.disconnect();
			mutation.disconnect();
			view.removeEventListener('resize', measure);
			viewport = undefined;
			positions = [];
			targetIndex = undefined;
		};
	}
	function keydown(event: KeyboardEvent) {
		if (event.target !== viewport || event.altKey || event.ctrlKey || event.metaKey) return;
		if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
		event.preventDefault();
		if (event.key === 'ArrowLeft') api.slidePrev();
		if (event.key === 'ArrowRight') api.slideNext();
		if (event.key === 'Home') slideTo(0);
		if (event.key === 'End') slideTo(pageCount - 1);
	}
</script>

{#snippet slideItem(item: T, index: number)}
	<div class="azure-net-ui-slider-slide" role="group" aria-roledescription="slide" aria-label={`${index + 1} of ${items.length}`}>
		{@render slide(item, index)}
	</div>
{/snippet}

<!-- Dynamic element content is text, unlike a literal style tag's raw-text body. -->
<svelte:head><svelte:element this={'style'}>{css}</svelte:element></svelte:head>
<section data-slider={id} class={['azure-net-ui-slider', className, { styled }]} aria-label={label} aria-roledescription="carousel">
	<!-- A scrollable viewport needs keyboard focus; descendants keep their own keyboard behavior. -->
	<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
	<div
		class="azure-net-ui-slider-viewport"
		id={`${id}-viewport`}
		role="group"
		aria-label={label}
		tabindex="0"
		{@attach setup}
		onscroll={sync}
		onscrollend={sync}
		onpointerdown={() => {
			targetIndex = undefined;
		}}
		onwheel={() => {
			targetIndex = undefined;
		}}
		onkeydown={keydown}
	>
		<!-- Positional fallback intentionally supports duplicate values; getKey opts into item identity. -->
		{#each items as item, index (getKey ? getKey(item) : index)}
			{@render slideItem(item, index)}
		{/each}
	</div>
	{#if navigation}{@render navigation(api)}
	{:else if showNavigation}
		<div class="azure-net-ui-slider-navigation">
			<button type="button" aria-controls={`${id}-viewport`} disabled={api.isBeginning} onclick={api.slidePrev}>Previous</button>
			<button type="button" aria-controls={`${id}-viewport`} disabled={api.isEnd} onclick={api.slideNext}>Next</button>
		</div>
	{/if}
	{#if pagination}{@render pagination(api)}
	{:else if showPagination}
		<div class="azure-net-ui-slider-pagination" aria-label="Choose slide">
			{#each Array.from({ length: pageCount }, (_, index) => index) as page (page)}
				<button
					type="button"
					aria-label={`Go to position ${page + 1}`}
					aria-current={activeIndex === page ? 'true' : undefined}
					onclick={() => slideTo(page)}>{page + 1}</button
				>
			{/each}
		</div>
	{/if}
</section>

<style>
	.azure-net-ui-slider {
		min-width: 0;
	}
	.azure-net-ui-slider-viewport {
		position: relative;
		display: flex;
		gap: var(--slider-gap);
		overflow-x: auto;
		scrollbar-width: none;
		cursor: grab;
		scroll-snap-type: x mandatory;
		direction: ltr;
	}
	.azure-net-ui-slider-viewport::-webkit-scrollbar {
		display: none;
		width: 0;
		height: 0;
	}
	.azure-net-ui-slider-slide {
		flex: 0 0 calc((100% - (var(--slider-view) - 1) * var(--slider-gap)) / var(--slider-view));
		min-width: 0;
		scroll-snap-align: start;
	}
</style>

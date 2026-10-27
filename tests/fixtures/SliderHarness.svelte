<script lang="ts">
	import Slider from '../../src/lib/widgets/Slider/Slider.svelte';
	import type { SliderApi } from '../../src/lib/widgets/Slider/types.js';
	let { ready, changed, keyed = false }: { keyed?: boolean; ready?: (api: SliderApi) => void; changed?: (index: number) => void } = $props();
	let items = $state(['A', 'B', 'C', 'D']);
	let slidesPerView = $state(1);
	export function update(next: string[], count = 1) {
		items = next;
		slidesPerView = count;
	}
</script>

<Slider
	{items}
	getKey={keyed ? (item) => item : undefined}
	{slidesPerView}
	spaceBetween={12}
	breakpoints={{ 768: { slidesPerView: 2 }, 1200: { slidesPerView: 3 } }}
	onReady={ready}
	onChange={changed}
>
	{#snippet slide(item)}<span>{item}</span>{/snippet}
	{#snippet navigation(api)}
		<button type="button" onclick={api.slidePrev} disabled={api.isBeginning}>Back</button>
		<button type="button" onclick={api.slideNext} disabled={api.isEnd}>Forward</button>
	{/snippet}
	{#snippet pagination(api)}<output>{api.activeIndex + 1}/{api.pageCount}</output>{/snippet}
</Slider>

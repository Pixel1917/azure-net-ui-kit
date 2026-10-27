<script lang="ts">
	import Slider from '../../src/lib/widgets/Slider/Slider.svelte';
	import Cropper from '../../src/lib/widgets/Cropper/Cropper.svelte';
	import type { SliderApi } from '../../src/lib/widgets/Slider/types.js';
	import type { CropperApi } from '../../src/lib/widgets/Cropper/types.js';
	import { createZoomable } from '../../src/lib/utils/zoomable/index.js';
	import { clickOutside } from '../../src/lib/utils/onClickOutside/OnClickOutside.js';
	let slider: SliderApi;
	let cropper: CropperApi;
	let outside = $state(0);
	let enabled = $state(true);
	let mounted = $state(true);
	let items = $state(['one', 'two', 'three', 'four', 'five']);
	let perView = $state(1);
	let cropSrc = $state<string | Blob>(
		'data:image/svg+xml,' +
			encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="200"><rect width="600" height="200" fill="green"/></svg>')
	);
	const zoom = createZoomable({ duration: 100 });
	export function getSlider() {
		return slider;
	}
	export function getZoom() {
		return zoom;
	}
	export function getCropper() {
		return cropper;
	}
	export function setItems(next: string[]) {
		items = next;
	}
	export function setPerView(next: number) {
		perView = next;
	}
	export function setSource(src: string | Blob) {
		cropSrc = src;
	}
	export function toggleOutside() {
		enabled = !enabled;
	}
	export function disposeWidgets() {
		mounted = false;
	}
</script>

{#if mounted}
	<Slider
		{items}
		slidesPerView={perView}
		spaceBetween={12}
		breakpoints={{ 768: { slidesPerView: 2 }, 1200: { slidesPerView: 3 } }}
		onReady={(api) => {
			slider = api;
		}}
		showNavigation
		showPagination
		styled
	>
		{#snippet slide(item)}<article>{item}<input aria-label={`Input ${item}`} /></article>{/snippet}
	</Slider>
	<div class="zoom" {@attach zoom.attachment}><div class="zoom-content">Zoom content</div></div>
	<button type="button" onclick={zoom.zoomIn}>Zoom in</button>
	<button type="button" onclick={zoom.zoomOut}>Zoom out</button>
	<button type="button" onclick={zoom.reset}>Reset zoom</button>
	<div class="crop">
		<Cropper
			src={cropSrc}
			aspectRatio={1}
			onReady={(api) => {
				cropper = api;
			}}
		/>
	</div>
	<div
		class="outside"
		{@attach clickOutside({
			enabled,
			onOutside: () => {
				outside++;
			}
		})}
	>
		Inside <span>child</span>
	</div>
{/if}
<output id="outside-count">{outside}</output>
<button type="button" id="outside-button">Outside</button>

<style>
	:global(body) {
		margin: 20px;
	}
	article {
		background: #eee;
		height: 100px;
	}
	input {
		display: block;
		max-width: 80%;
	}
	.zoom {
		width: 300px;
		height: 200px;
		margin-top: 20px;
	}
	.zoom-content {
		width: 300px;
		height: 200px;
		background: #ddd;
	}
	.crop {
		width: 300px;
		margin-top: 20px;
	}
	.outside {
		padding: 10px;
	}
</style>

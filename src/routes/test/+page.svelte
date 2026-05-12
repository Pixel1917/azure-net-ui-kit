<script lang="ts">
	import { Cropper, type CropperApi } from '$lib/widgets/index.js';

	let cropper = $state<CropperApi>();
	let cropped = $state<string>();

	const crop = () => {
		if (cropper) {
			cropped = cropper.toDataUrl({ rounded: true });
		}
	};
</script>

<a href="/">back</a>
<Cropper src="/1.png" aspectRatio={1} borderRadius={0} onReady={(api) => (cropper = api)} />

<button onclick={() => crop()}>crop</button>

{#if cropped}
	<img src={cropped} alt="test" />
{/if}

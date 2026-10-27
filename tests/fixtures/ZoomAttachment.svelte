<script lang="ts">
	import { zoomable, type ZoomableOptions, type ZoomTransform } from '../../src/lib/utils/zoomable/index.js';
	let last: ZoomTransform = { x: 0, y: 0, scale: 1 };
	let options = $state<ZoomableOptions>({
		wheel: true,
		duration: 0,
		bounds: false,
		onChange: (value) => {
			last = value;
		}
	});
	export function setWheel(enabled: boolean) {
		options.wheel = enabled;
	}
	export function getTransform() {
		return last;
	}
</script>

<div class="viewport" {@attach zoomable(options)}><div>Zoom content</div></div>

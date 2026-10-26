<script lang="ts">
	import { attachAnimation, type UseAnimateOptions } from '../../src/lib/utils/useAnimate/index.js';
	let options = $state<UseAnimateOptions>({ classes: 'first', delay: 100 });
	export function updateOptions(next: UseAnimateOptions) {
		options = next;
	}
</script>

<div class="original" {@attach attachAnimation(options)}>Animated</div>

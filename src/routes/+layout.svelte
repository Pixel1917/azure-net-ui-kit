<script lang="ts">
	import { NotificationContainer } from '$lib/widgets/Notification/index.js';
	import { ModalContainer, progressBar } from '$lib/widgets/index.js';
	import { scale } from 'svelte/transition';
	import { afterNavigate, beforeNavigate } from '$app/navigation';
	import { onMount } from 'svelte';

	const { children } = $props();

	const { start, done, configure } = progressBar;

	onMount(() => {
		configure({
			color: 'rgb(53, 165, 164)',
			height: 3,
			trickle: true,
			parent: document.body
		});
	});

	beforeNavigate(() => {
		start();
	});

	afterNavigate(() => {
		done();
	});
</script>

<ModalContainer overlay={{ background: '#000' }} />
<NotificationContainer globalMessageHandler={(message) => `${message} (handled notification)`} transition={scale} />
{@render children()}

<style>
	:global(body) {
		background: #333;
	}
</style>

<script lang="ts">
	import { scale } from 'svelte/transition';
	import type { ModalTemplateProps } from '$lib/widgets/index.js';

	const { text, update, closeModal, options }: { text: string } & ModalTemplateProps<{ text: string }> = $props();

	const { modalStyles, transition = scale, transitionParams } = $derived(options);

	const updateProps = () => {
		console.log(typeof update);
		update((modal) => {
			if (modal.props) {
				modal.props.text = 'Goodbye';
			}
			return modal;
		});
	};
</script>

<div class="modal" style={modalStyles} transition:transition={{ ...transitionParams, delay: 100 }}>
	<div>
		test
		{text}
		<button onclick={() => updateProps()}>upd</button>
		<button onclick={() => closeModal()}>cls</button>
	</div>
</div>

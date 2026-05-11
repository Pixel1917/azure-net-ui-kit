<script lang="ts">
	import type { ModalTemplateProps } from '$lib/widgets/index.js';

	const { text, update, closeModal }: { text: string } & ModalTemplateProps<{ text: string }> = $props();

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

<div>
	test
	{text}
	<button onclick={() => updateProps()}>upd</button>
	<button onclick={() => closeModal()}>cls</button>
</div>

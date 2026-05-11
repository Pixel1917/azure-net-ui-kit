<script lang="ts">
	import { notificationManager } from '$lib/widgets/Notification/index.js';
	import { modalManager } from '$lib/widgets/index.js';
	import { fly, slide } from 'svelte/transition';

	const { show, info, success, warning, alert, destroyAll } = notificationManager;

	const { create, show: showModal } = modalManager;

	const testModal1 = create({
		component: import('./TestModal.svelte'),
		props: { text: 'Hello world' },
		useDefaultTemplate: true,
		options: { injectModalStyles: { height: '50vh' }, transition: fly, closeOnEsc: false, closeOnOverlay: false, onClose: () => console.log('lol') }
	});

	const doSmth = () => {
		console.log('tut');
		showModal({
			component: import('./TestModal2.svelte'),
			props: { text: 'Hello world' },
			options: {
				injectModalStyles: { height: '50vh' },
				transition: slide,
				closeOnEsc: false,
				closeOnOverlay: false,
				onClose: () => console.log('lol')
			}
		});
	};
</script>

<a href="/test">test</a>
<button onclick={() => success('Hello success', { duration: 100000 })}>success</button>

<button onclick={() => info('Hello information', { transitionFrom: 'bottom-left' })}>info</button>

<button onclick={() => alert('Hello alert', { duration: 100000 })}>alert</button>

<button onclick={() => warning('Hello warning', { closeOnClick: true, duration: 100000 })}>warning</button>

<button
	onclick={() =>
		show({
			message: '<p>hello test</p>',
			html: true,
			duration: 100000,
			onClose: () => console.log('onClose'),
			theme: 'success',
			transitionFrom: 'bottom-center'
		})}>show</button
>

<button onclick={() => destroyAll()}>destroy</button>

<button onclick={() => testModal1.show()}>show test modal 1</button>
<button class="btn-cls-modal" onclick={() => testModal1.destroy()}>destroy test modal 1</button>
<button
	class="btn-upd-modal"
	onclick={() =>
		testModal1.update((modal) => {
			if (modal.props) {
				modal.props.text = 'Goodbye world';
			}
			return modal;
		})}>upd test modal 1</button
>

<button onclick={() => doSmth()}>doSmth</button>

<style>
	:root {
		--notification_font_size: 16px;
		--notification_padding_block: 16px;
		--notification_padding_inline: 56px;
		--notification_inline_offset: 48px;
		--notification_by_height_offset: 48px;
		--notification_max_width: 70px;
	}
</style>

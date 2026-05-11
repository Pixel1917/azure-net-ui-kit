<script lang="ts">
	import { setStore, destroyStore, ModalsStore, modalManager, type IModalStore, onOpenCloseHook } from './ModalStore.svelte.js';
	import { fade } from 'svelte/transition';
	import { onMount } from 'svelte';
	import BaseTemplate from './BaseTemplate.svelte';
	import type { Component } from 'svelte';
	import type { Modal, ModalContainerProps } from './types.js';

	type RenderableModalComponent = Component<Record<string, unknown>, Record<string, unknown>, string>;

	const { wrapper, modal, overlay }: ModalContainerProps = $props();

	let store = $state<IModalStore>();

	const handleOverlayClick = (event: MouseEvent, modalItem: Modal) => {
		if (modalItem.options.closeOnOverlay !== false) {
			if (event.target === event.currentTarget) {
				modalManager.destroy(modalItem.options.name);
			}
		}
	};

	const handleEscape = (event: KeyboardEvent) => {
		if (event.key === 'Escape' && modalManager?.current) {
			if (modalManager.current?.options?.closeOnEsc !== false) {
				modalManager.destroy(modalManager.current.options?.name);
			}
		}
	};

	onMount(() => {
		store = new ModalsStore({ wrapper, modal, overlay });
		setStore(store);
		document.addEventListener('keydown', handleEscape);
		const savedOverflow = document.body.style.overflow;
		onOpenCloseHook(() => {
			if (store?.modals && store.modals.length > 0) {
				document.body.style.overflow = 'hidden';
			} else {
				document.body.style.overflow = savedOverflow;
			}
		});
		return () => {
			document.body.style.overflow = savedOverflow;
			document.removeEventListener('keydown', handleEscape);
			destroyStore();
		};
	});
</script>

{#if store?.modals && store.modals.length > 0}
	<div style={store.overlayStyles} transition:fade={{ delay: 200 }}></div>
	{#each store.modals as modalItem, index (modalItem.options.name)}
		<div
			class="modal-wrapper"
			style="{modalItem.options.wrapperStyles}; display: {index === store.modals.length - 1 ? 'flex' : 'none'}"
			onclick={(e) => handleOverlayClick(e, modalItem)}
			onkeydown={() => undefined}
			role="dialog"
			aria-modal="true"
			tabindex="-1"
		>
			{#snippet renderModal()}
				{#if modalItem.component instanceof Promise && typeof modalItem.component.then === 'function'}
					{#await modalItem.component then AwaitedModalComponent}
						<AwaitedModalComponent
							{...modalItem.props}
							options={modalItem.options}
							closeModal={() => modalManager.destroy(modalItem.options.name)}
							update={(updater: (modal: Modal) => Modal) => modalManager.update(modalItem.options.name, updater)}
						/>
					{/await}
				{:else}
					{@const ModalComponent = modalItem.component as RenderableModalComponent}
					<ModalComponent
						{...modalItem.props}
						options={modalItem.options}
						closeModal={() => modalManager.destroy(modalItem.options.name)}
						update={(updater: (modal: Modal) => Modal) => modalManager.update(modalItem.options.name, updater)}
					/>
				{/if}
			{/snippet}
			{#if modalItem.useDefaultTemplate}
				<BaseTemplate
					options={modalItem.options}
					closeModal={() => modalManager.destroy(modalItem.options.name)}
					update={(updater: (modal: Modal) => Modal) => modalManager.update(modalItem.options.name, updater)}
				>
					{@render renderModal()}
				</BaseTemplate>
			{:else}
				{@render renderModal()}
			{/if}
		</div>
	{/each}
{/if}

<script lang="ts">
	import { destroyStore, NotificationsStore, notificationManager, setStore } from './NotificationStore.svelte.js';
	import { fly } from 'svelte/transition';
	import { onMount } from 'svelte';
	import type { NotificationContainerProps, NotificationPositions, Notification } from './types.js';
	import { event } from '../../utils/eventModifiers/index.js';

	let store = $state<NotificationsStore>();

	onMount(() => {
		store = new NotificationsStore();
		setStore(store);
		return () => destroyStore();
	});

	const {
		position = 'top-right',
		transition = fly,
		transitionParams,
		notificationSnippet,
		globalMessageHandler
	}: NotificationContainerProps = $props();

	const transitionParamsClosure = () => transitionParams;

	const positionClasses: Record<NotificationPositions, string> = {
		'top-left': 'top left',
		'top-center': 'top left-1/2 -translate-x-1/2',
		'top-right': 'top right',
		'bottom-left': 'bottom left',
		'bottom-center': 'bottom left-1/2 -translate-x-1/2',
		'bottom-right': 'bottom right',
		center: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
	};

	const transitionParamsInternal: NotificationContainerProps['transitionParams'] = {
		'top-left': { x: -320, y: 0, delay: 300 },
		'top-center': { x: 0, y: -100, delay: 300 },
		'top-right': { y: 30, delay: 300 },
		'bottom-left': { x: -320, y: 0, delay: 300 },
		'bottom-center': { x: 0, y: 100, delay: 300 },
		'bottom-right': { x: 320, y: 0, delay: 300 },
		center: { x: 0, y: 0, delay: 300 },
		...transitionParamsClosure()
	};
</script>

{#snippet notificationDefaultSnippet(notification: Notification)}
	<div
		class="notification notification-{notification.theme} {notification.className}"
		style="pointer-events: auto;"
		transition:transition|global={transitionParamsInternal?.[notification.transitionFrom ?? position]}
		onclick={event.stop.prevent(() => (notification.closeOnClick ? notificationManager.destroy(notification.id) : undefined))}
		tabindex="0"
		role="button"
		onkeydown={() => undefined}
	>
		{#if notification.message}
			{#if notification.html}
				{@html globalMessageHandler ? globalMessageHandler(notification.message) : notification.message}
			{:else}
				{globalMessageHandler ? globalMessageHandler(notification.message) : notification.message}
			{/if}
		{/if}
		{#if notification.showClose}
			<button
				class="notification-close"
				onclick={event.stop.prevent(() => notificationManager.destroy(notification.id))}
				aria-label="Закрыть уведомление {notification.id}"
			>
				<span aria-hidden="true"></span>
			</button>
		{/if}
	</div>
{/snippet}

{#if store?.notifications.length}
	<div
		class="notification-container {positionClasses[position]}"
		style="
      position: fixed;
      z-index: 9999;
      {position.includes('top') ? 'top' : 'bottom'}: var(--notification_block_offset, 16px);
      {position.includes('left') && !position.includes('center') ? 'left' : ''}: {position.includes('left')
			? 'var(--notification_inline_offset, 16px)'
			: ''};
      {position.includes('right') ? 'right' : ''}: {position.includes('right') ? 'var(--notification_inline_offset, 16px)' : ''};
      align-items: {position.includes('right') ? 'flex-end' : 'flex-start'};
      pointer-events: none;
      display: flex;
      gap: 8px;
      {position.includes('bottom') ? 'flex-direction: column-reverse;' : 'flex-direction: column;'}"
	>
		{#each store.notifications as notification (notification.id)}
			{#if notificationSnippet}
				{@render notificationSnippet({ notification })}
			{:else}
				{@render notificationDefaultSnippet(notification)}
			{/if}
		{/each}
	</div>
{/if}

<style lang="scss">
	.notification {
		border-radius: 8px;
		padding: var(--notification_padding_block, 16px) var(--notification_padding_inline, 48px);
		font-family: inherit;
		font-size: var(--notification_font_size);
		position: relative;
		max-width: var(--notification_max_width, unset);
		.notification-close {
			position: absolute;
			top: 4px;
			right: 4px;
			width: 24px;
			height: 24px;
			display: inline-grid;
			place-items: center;
			background: transparent;
			border: none;
			color: inherit;
			opacity: 0.72;
			cursor: pointer;
			border-radius: 999px;
			transition:
				opacity 160ms ease,
				background-color 160ms ease,
				transform 160ms ease;

			span {
				position: relative;
				width: 12px;
				height: 12px;
				display: block;
				transition: transform 180ms ease;

				&::before,
				&::after {
					content: '';
					position: absolute;
					top: 50%;
					left: 50%;
					width: 14px;
					height: 2px;
					border-radius: 999px;
					background: currentColor;
					transform-origin: center;
				}

				&::before {
					transform: translate(-50%, -50%) rotate(45deg);
				}

				&::after {
					transform: translate(-50%, -50%) rotate(-45deg);
				}
			}

			&:hover {
				opacity: 1;
				background-color: color-mix(in srgb, currentColor 10%, transparent);

				span {
					transform: rotate(90deg);
				}
			}

			&:active {
				transform: scale(0.9);
			}
		}
		&.notification-success {
			background-color: var(--notification_success_bg, rgb(53, 165, 164));
			color: var(--notification_success_color, rgb(255, 255, 255));
			box-shadow: var(--shadow_border_default, 0 4px 10px rgba(0, 0, 0, 0.1));
		}
		&.notification-info {
			background-color: var(--notification_info_bg, rgb(255, 255, 255));
			color: var(--notification_info_color, rgb(31, 31, 31));
			box-shadow: var(--shadow_border_default, 0 4px 10px rgba(0, 0, 0, 0.1));
		}
		&.notification-alert {
			background-color: var(--notification_alert_bg, rgb(219, 62, 62));
			color: var(--notification_alert_color, rgb(255, 255, 255));
			box-shadow: var(--shadow_border_default, 0 4px 10px rgba(0, 0, 0, 0.1));
		}
		&.notification-warning {
			background-color: var(--notification_warning_bg, rgb(244, 199, 62));
			color: var(--notification_warning_color, rgb(31, 31, 31));
			box-shadow: var(--shadow_border_default, 0 4px 10px rgba(0, 0, 0, 0.1));
		}
	}
</style>

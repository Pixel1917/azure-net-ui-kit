<script lang="ts">
	import { scale } from 'svelte/transition';
	import type { ModalTemplateProps } from './types.js';

	const { children, options, closeModal }: ModalTemplateProps = $props();

	const { transition = scale, transitionParams, modalStyles } = $derived(options);
</script>

<div class="modal" style={modalStyles} transition:transition|global={{ delay: 100, ...transitionParams }}>
	<button class="modal-close" onclick={() => closeModal()} aria-label="Close modal" type="button">
		<span aria-hidden="true"></span>
	</button>
	<div class="modal-content">
		{@render children()}
	</div>
</div>

<style lang="scss">
	.modal {
		@media (max-width: 640px) {
			max-width: 100%;
			max-height: 95vh;
		}
	}

	.modal-close {
		position: absolute;
		top: 8px;
		right: 8px;
		z-index: 10;
		width: 28px;
		height: 28px;
		display: inline-grid;
		place-items: center;
		border: none;
		border-radius: 999px;
		color: inherit;
		background: transparent;
		opacity: 0.72;
		cursor: pointer;
		transition:
			opacity 160ms ease,
			background-color 160ms ease,
			transform 160ms ease;

		span {
			position: relative;
			width: 14px;
			height: 14px;
			display: block;
			transition: transform 180ms ease;

			&::before,
			&::after {
				content: '';
				position: absolute;
				top: 50%;
				left: 50%;
				width: 16px;
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

	.modal-content {
		padding: var(--modal_content_padding, 40px 16px 16px);
		overflow-y: auto;
		flex: 1;

		&::-webkit-scrollbar {
			width: 6px;
		}

		&::-webkit-scrollbar-track {
			background: var(--modal_scrollbar_track, #f3f4f6);
			border-radius: 3px;
		}

		&::-webkit-scrollbar-thumb {
			background: var(--modal_scrollbar_thumb, #d1d5db);
			border-radius: 3px;

			&:hover {
				background: var(--modal_scrollbar_thumb_hover, #9ca3af);
			}
		}

		@media (max-width: 640px) {
			padding: var(--modal_content_mobile_padding, 20px);
		}
	}
</style>

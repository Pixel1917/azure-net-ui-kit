import type { Component, Snippet } from 'svelte';
import type { fade, FadeParams, fly, FlyParams, scale, ScaleParams, slide, SlideParams } from 'svelte/transition';
import type { ModalInlineStyles } from './utils.js';

export interface ModalStyleEntries {
	wrapper?: ModalInlineStyles;
	overlay?: ModalInlineStyles;
	modal?: ModalInlineStyles;
}

export interface ModalConfig extends Omit<ModalOptions, 'name'> {
	name?: string;
}

export interface ModalOptions {
	name: string;
	injectModalStyles?: ModalInlineStyles;
	injectWrapperStyles?: ModalInlineStyles;
	scrollable?: boolean;
	onClose?: () => Promise<void> | void;
	closeOnOverlay?: boolean;
	closeOnEsc?: boolean;
	modalStyles?: string;
	wrapperStyles?: string;
	transition?: typeof fly | typeof fade | typeof scale | typeof slide;
	transitionParams?: FlyParams | FadeParams | ScaleParams | SlideParams;
}

type AnyComponent = Component<Record<string, unknown>, Record<string, unknown>, string>;
type MaybeAsyncComponent = AnyComponent | Promise<AnyComponent>;

export interface Modal<TProps extends Record<string, unknown> = Record<string, unknown>> {
	component: Component<TProps, Record<string, unknown>, string> | Promise<Component<TProps, Record<string, unknown>, string>>;
	props?: TProps;
	options: ModalOptions;
}

export interface StoredModal {
	component: MaybeAsyncComponent;
	props?: Record<string, unknown>;
	options: ModalOptions;
	useDefaultTemplate?: boolean;
}

export interface PropsWithCloseModal {
	closeModal: () => void;
}

export interface ModalTemplateProps<TProps extends Record<string, unknown> = Record<string, unknown>> {
	children: Snippet;
	closeModal: () => void;
	update: (updater: (modal: Modal<TProps>) => Modal<TProps>) => void;
	options: ModalOptions;
	title?: string;
}

export type ModalContainerProps = ModalStyleEntries;

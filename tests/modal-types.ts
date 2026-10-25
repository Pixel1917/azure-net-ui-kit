import type { Component } from 'svelte';
import type { IModalManager, ModalHandle, CreatedModalHandle } from '../src/lib/widgets/Modal/ModalStore.svelte.js';

// Compile-only assertions, checked by svelte-check.
export function assertModalTypes(manager: IModalManager, component: Component<{ text: string; count?: number }>) {
	const module = { default: component };
	const direct: CreatedModalHandle = manager.create({ component, props: { text: 'hello', count: 1 } });
	const namespace: ModalHandle = manager.show({ component: module, props: { text: 'hello' } });
	const lazy: CreatedModalHandle<Promise<ModalHandle>> = manager.create({ component: Promise.resolve(module), props: { text: 'hello' } });
	const lazyDirect: Promise<ModalHandle> = manager.show({ component: Promise.resolve(component), props: { text: 'hello' } });
	const loaded: CreatedModalHandle<Promise<ModalHandle>> = manager.create({ loader: () => Promise.resolve(module), props: { text: 'hello' } });
	const loadedShow: Promise<ModalHandle> = manager.show({ loader: () => component, props: { text: 'hello' } });
	// @ts-expect-error loader props retain types
	manager.create({ loader: () => Promise.resolve(module), props: { text: 5 } });
	// @ts-expect-error cannot specify both sources
	manager.create({ component, loader: () => component, props: { text: 'hello' } });
	// @ts-expect-error a source is required
	manager.show({ props: { text: 'hello' } });
	void loaded;
	void loadedShow;
	// @ts-expect-error invalid prop type must not widen component inference
	manager.create({ component, props: { text: 123 } });
	// @ts-expect-error module props retain exact keys
	manager.show({ component: module, props: { text: 'hello', unknown: true } });
	// @ts-expect-error lazy module props retain types
	manager.show({ component: Promise.resolve(module), props: { text: false } });
	return { direct, namespace, lazy, lazyDirect };
}

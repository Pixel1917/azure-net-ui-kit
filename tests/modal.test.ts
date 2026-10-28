import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Component } from 'svelte';
import { setBrowser } from './mocks/toolsEnvironment.js';

const component = (() => ({})) as Component<Record<string, unknown>, Record<string, unknown>, string>;

const importModalStore = async (browser = true) => {
	vi.resetModules();
	const environment = await import('./mocks/toolsEnvironment.js');
	environment.setBrowser(browser);
	return await import('../src/lib/widgets/Modal/ModalStore.svelte.js');
};

const installStateShim = () => {
	vi.stubGlobal('$state', <T>(value: T) => value);
};

describe('Modal styles', () => {
	beforeEach(() => {
		setBrowser(true);
		installStateShim();
	});

	it('serializes inline style objects to css text', async () => {
		const { stylesToCssText } = await import('../src/lib/widgets/Modal/utils.js');

		expect(
			stylesToCssText({
				zIndex: 10,
				opacity: 0.5,
				width: 320,
				backgroundColor: 'red',
				height: undefined
			})
		).toBe('z-index: 10; opacity: 0.5; width: 320px; background-color: red');
	});

	it('merges container and per-show wrapper/modal styles into css strings', async () => {
		const { ModalsStore, modalManager, setStore, destroyStore } = await importModalStore();
		const store = new ModalsStore({
			wrapper: { alignItems: 'flex-start', paddingTop: 20 },
			modal: { maxWidth: 640, borderRadius: 16 },
			overlay: { backgroundColor: 'rgba(1, 2, 3, .5)' }
		});
		setStore(store);

		const { modal } = modalManager.show({
			component,
			options: {
				injectWrapperStyles: { alignItems: 'center' },
				injectModalStyles: { maxWidth: 720, height: 'auto' }
			}
		});

		expect(modal.options.wrapperStyles).toContain('position: fixed');
		expect(modal.options.wrapperStyles).toContain('padding-top: 20px');
		expect(modal.options.wrapperStyles).toContain('align-items: center');
		expect(modal.options.modalStyles).toContain('border-radius: 16px');
		expect(modal.options.modalStyles).toContain('max-width: 720px');
		expect(modal.options.modalStyles).toContain('height: auto');

		destroyStore();
	});

	it('keeps overlay styles container-only', async () => {
		const { ModalsStore } = await importModalStore();
		const store = new ModalsStore({
			overlay: { backgroundColor: 'rgba(10, 20, 30, .7)' }
		});

		expect(store.overlayStyles).toContain('background-color: rgba(10, 20, 30, .7)');
	});
});

describe('Modal manager SSR safety', () => {
	beforeEach(() => {
		setBrowser(true);
		installStateShim();
	});

	it('does not create a store during module import and throws before mount', async () => {
		const { modalManager } = await importModalStore();

		expect(modalManager.current).toBeUndefined();
		expect(() => modalManager.show({ component })).toThrow('before mount');
	});

	it('does not expose mutable global style setup', async () => {
		const { modalManager } = await importModalStore();

		expect('setGlobalStyles' in modalManager).toBe(false);
	});
});

describe('Modal manager lifecycle', () => {
	beforeEach(() => {
		setBrowser(true);
		installStateShim();
	});

	it('opens, updates and destroys through returned handle', async () => {
		const { ModalsStore, modalManager, setStore, destroyStore } = await importModalStore();
		const store = new ModalsStore();
		setStore(store);

		const handle = modalManager.create({
			component,
			options: { name: 'profile' }
		});

		const opened = handle.show();
		expect(store.modals).toHaveLength(1);
		expect(opened.modal.options.name).toBe('profile');

		handle.update((modal) => ({
			...modal,
			options: { ...modal.options, closeOnEsc: false }
		}));
		expect(store.current?.options.closeOnEsc).toBe(false);

		await handle.destroy();
		expect(store.modals).toHaveLength(0);

		destroyStore();
	});

	it('calls onClose after removing modals', async () => {
		const { ModalsStore, modalManager, setStore, destroyStore } = await importModalStore();
		const store = new ModalsStore();
		setStore(store);
		const onClose = vi.fn(() => {
			expect(store.modals).toHaveLength(0);
		});

		modalManager.show({ component, options: { name: 'confirm', onClose } });
		await modalManager.destroy('confirm');

		expect(onClose).toHaveBeenCalledTimes(1);
		destroyStore();
	});
});

describe('modal component resolution', () => {
	it('accepts components and module namespaces synchronously', async () => {
		const { modalManager, setStore, ModalsStore, destroyStore } = await importModalStore();
		setStore(new ModalsStore());
		for (const input of [component, { default: component }]) {
			const handle = modalManager.create({ component: input });
			expect(handle).not.toBeInstanceOf(Promise);
			expect(handle.show().modal.component).toBe(component);
			expect(modalManager.show({ component: input }).modal.component).toBe(component);
		}
		destroyStore();
	});
	it('resolves lazy create without opening and lazy show before insertion', async () => {
		const { modalManager, setStore, ModalsStore, destroyStore } = await importModalStore();
		const store = new ModalsStore();
		setStore(store);
		const pending = modalManager.create({ component: Promise.resolve({ default: component }) });
		expect(pending).not.toBeInstanceOf(Promise);
		const handle = pending;
		expect(store.modals).toHaveLength(0);
		expect((await handle.show()).modal.component).toBe(component);
		await handle.destroy();
		const shown = modalManager.show({ component: Promise.resolve(component) });
		expect(store.modals).toHaveLength(0);
		expect((await shown).modal.component).toBe(component);
		destroyStore();
	});
	it('rejects failed imports and does not open in a replacement container', async () => {
		const { modalManager, setStore, ModalsStore, destroyStore } = await importModalStore();
		setStore(new ModalsStore());
		await expect(modalManager.show({ component: Promise.reject(new Error('load failed')) })).rejects.toThrow('load failed');
		const pending = modalManager.show({ component: Promise.resolve({ default: component }) });
		destroyStore();
		const replacement = new ModalsStore();
		setStore(replacement);
		await expect(pending).rejects.toThrow('unmounted');
		expect(replacement.modals).toHaveLength(0);
		destroyStore();
	});
});

describe('modal container lifecycle', () => {
	it('renders a resolved module and restores scrolling on unmount', async () => {
		const { mount, unmount, flushSync } = await import('svelte');
		const { default: Container } = await import('../src/lib/widgets/Modal/ModalContainer.svelte');
		const module = await import('../src/routes/TestModal.svelte');
		const { modalManager } = await import('../src/lib/widgets/Modal/ModalStore.svelte.js');
		// happy-dom rejects animation.finished on cancellation, unlike Svelte's test animation driver.
		const animate = Element.prototype.animate;
		const animationSpy = vi.spyOn(Element.prototype, 'animate').mockImplementation(function (this: Element, ...args) {
			const animation = animate.apply(this, args);
			void animation.finished.catch(() => {});
			return animation;
		});
		const target = document.createElement('div');
		document.body.append(target);
		document.body.style.overflow = 'auto';
		const app = mount(Container, { target });
		flushSync();
		try {
			await modalManager.show({ component: Promise.resolve(module), props: { text: 'Lazy content' } });
			flushSync();
			expect(target.textContent).toContain('Lazy content');
			expect(document.body.style.overflow).toBe('hidden');
		} finally {
			await unmount(app);
			animationSpy.mockRestore();
			target.remove();
		}
		expect(document.body.style.overflow).toBe('auto');
	});
});

describe('lazy modal loader', () => {
	it('create is synchronous and does not invoke the loader until show', async () => {
		const { modalManager, ModalsStore, setStore, destroyStore } = await importModalStore();
		const loader = vi.fn(async () => ({ default: component }));
		const handle = modalManager.create({ loader });
		expect(handle).not.toBeInstanceOf(Promise);
		expect(loader).not.toHaveBeenCalled();
		const store = new ModalsStore();
		setStore(store);
		const shown = handle.show();
		expect(shown).toBeInstanceOf(Promise);
		expect((await shown).modal.component).toBe(component);
		expect(loader).toHaveBeenCalledTimes(1);
		await handle.destroy();
		await handle.show();
		expect(loader).toHaveBeenCalledTimes(2);
		destroyStore();
	});
	it('supports direct show with a sync loader and propagates loader failures', async () => {
		const { modalManager, ModalsStore, setStore, destroyStore } = await importModalStore();
		const store = new ModalsStore();
		setStore(store);
		expect((await modalManager.show({ loader: () => component })).modal.component).toBe(component);
		await modalManager.destroyAll();
		await expect(
			modalManager.show({
				loader: () => {
					throw new Error('failed');
				}
			})
		).rejects.toThrow('failed');
		await expect(modalManager.show({ loader: async () => ({ default: null }) })).rejects.toThrow('Svelte component');
		expect(store.modals).toHaveLength(0);
		destroyStore();
	});
	it('never invokes a loader on the server or before mount', async () => {
		const { modalManager } = await importModalStore();
		const loader = vi.fn(async () => component);
		const handle = modalManager.create({ loader });
		await expect(handle.show()).rejects.toThrow('before mount');
		expect(loader).not.toHaveBeenCalled();
	});
	it('does not open a lazy modal after its container has been replaced', async () => {
		const { modalManager, ModalsStore, setStore, destroyStore } = await importModalStore();
		setStore(new ModalsStore());
		let resolve!: (value: typeof component) => void;
		const promise = new Promise<typeof component>((done) => {
			resolve = done;
		});
		const pending = modalManager.show({ loader: () => promise });
		await Promise.resolve();
		destroyStore();
		const replacement = new ModalsStore();
		setStore(replacement);
		resolve(component);
		await expect(pending).rejects.toThrow('unmounted');
		expect(replacement.modals).toHaveLength(0);
		destroyStore();
	});
});

it('destroyAll clears modals before callbacks and attempts every callback after synchronous throws', async () => {
	const { ModalsStore } = await importModalStore();
	const store = new ModalsStore();
	const error = new Error('close failed');
	const first = vi.fn(() => {
		expect(store.modals).toEqual([]);
		throw error;
	});
	const second = vi.fn(() => {
		throw new Error('second failed');
	});
	const third = vi.fn(async () => {});
	for (const onClose of [first, second, third]) store.create({ component, options: { onClose } });
	await expect(store.destroyAll()).rejects.toBe(error);
	for (const callback of [first, second, third]) expect(callback).toHaveBeenCalledTimes(1);
	expect(store.modals).toEqual([]);
	await store.destroyAll();
	expect(first).toHaveBeenCalledTimes(1);
});

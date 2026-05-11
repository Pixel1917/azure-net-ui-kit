import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Component } from 'svelte';
import { setBrowser } from './mocks/toolsEnvironment.js';

const component = {} as Component<Record<string, unknown>, Record<string, unknown>, string>;

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

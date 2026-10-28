import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setBrowser } from './mocks/toolsEnvironment.js';
import type { INotificationStore } from '../src/lib/widgets/Notification/NotificationStore.svelte.js';

const importNotificationStore = async (browser = true) => {
	vi.resetModules();
	const environment = await import('./mocks/toolsEnvironment.js');
	environment.setBrowser(browser);
	return await import('../src/lib/widgets/Notification/NotificationStore.svelte.js');
};

describe('Notification manager SSR safety', () => {
	beforeEach(() => {
		setBrowser(true);
	});

	it('does not create a store during module import and throws before mount', async () => {
		const { notificationManager } = await importNotificationStore();

		await expect(notificationManager.show({ message: 'Hello' })).rejects.toThrow('before mount');
	});

	it('does not schedule timers on server', async () => {
		const { notificationManager, setStore, destroyStore } = await importNotificationStore(false);
		const timeoutSpy = vi.spyOn(globalThis, 'setTimeout');
		const store: INotificationStore = {
			notifications: [],
			create: (config) => {
				const notification = { id: 'server-safe', ...config };
				store.notifications = [notification];
				return notification;
			},
			destroy: vi.fn(),
			destroyAll: vi.fn()
		};
		setStore(store);

		await notificationManager.show({ message: 'No timer', duration: 100 });

		expect(timeoutSpy).not.toHaveBeenCalled();
		destroyStore();
		timeoutSpy.mockRestore();
	});
});

describe('Notification manager lifecycle', () => {
	beforeEach(() => {
		setBrowser(true);
		vi.useRealTimers();
	});

	it('returns a destroy handle that clears auto-close timeout', async () => {
		vi.useFakeTimers();
		const { notificationManager, setStore, destroyStore } = await importNotificationStore();
		const destroy = vi.fn();
		const store: INotificationStore = {
			notifications: [],
			create: (config) => {
				const notification = { id: 'client-toast', ...config };
				store.notifications = [notification];
				return notification;
			},
			destroy,
			destroyAll: vi.fn()
		};
		setStore(store);

		const created = await notificationManager.show({ message: 'Toast', duration: 100 });
		created.destroy();
		await vi.advanceTimersByTimeAsync(100);

		expect(destroy).toHaveBeenCalledTimes(1);
		expect(destroy).toHaveBeenCalledWith('client-toast');
		destroyStore();
		vi.useRealTimers();
	});
});

describe('Notification timer regressions', () => {
	it.each(['id', 'first', 'last', 'handle', 'all', 'store'] as const)('cancels timers on %s destruction', async (method) => {
		vi.useFakeTimers();
		const { NotificationsStore, notificationManager, setStore, destroyStore } = await importNotificationStore();
		const store = new NotificationsStore();
		setStore(store);
		const onClose = vi.fn();
		try {
			const handle = await notificationManager.show({ id: 'reuse', duration: 100, onClose });
			expect(vi.getTimerCount()).toBe(1);
			if (method === 'handle') await handle.destroy();
			else if (method === 'all') await notificationManager.destroyAll();
			else if (method === 'store') await store.destroy('reuse');
			else await notificationManager.destroy(method === 'id' ? 'reuse' : method);
			expect(vi.getTimerCount()).toBe(0);
			await notificationManager.show({ id: 'reuse', duration: 0 });
			await vi.advanceTimersByTimeAsync(200);
			expect(store.notifications).toHaveLength(1);
			expect(onClose).toHaveBeenCalledTimes(1);
		} finally {
			destroyStore();
			vi.useRealTimers();
		}
	});

	it('auto-closes once and releases its timer', async () => {
		vi.useFakeTimers();
		const { NotificationsStore, notificationManager, setStore, destroyStore } = await importNotificationStore();
		const store = new NotificationsStore();
		setStore(store);
		try {
			const onClose = vi.fn();
			await notificationManager.show({ duration: 100, onClose });
			await vi.advanceTimersByTimeAsync(100);
			expect(store.notifications).toEqual([]);
			expect(onClose).toHaveBeenCalledTimes(1);
			expect(vi.getTimerCount()).toBe(0);
		} finally {
			destroyStore();
			vi.useRealTimers();
		}
	});

	it('cancels on container unmount and isolates old handles from a remounted store', async () => {
		vi.useFakeTimers();
		const { notificationManager } = await importNotificationStore();
		const { mount, unmount, flushSync, createRawSnippet } = await import('svelte');
		const { default: Container } = await import('../src/lib/widgets/Notification/NotificationContainer.svelte');
		const props = { notificationSnippet: createRawSnippet(() => ({ render: () => '<span>Notification</span>' })) };
		let instance = mount(Container, { target: document.body, props });
		flushSync();
		try {
			const oldClose = vi.fn();
			const old = await notificationManager.show({ id: 'shared', duration: 100, onClose: oldClose });
			await unmount(instance);
			expect(vi.getTimerCount()).toBe(0);
			instance = mount(Container, { target: document.body, props });
			flushSync();
			const newClose = vi.fn();
			await notificationManager.show({ id: 'shared', duration: 0, onClose: newClose });
			await vi.advanceTimersByTimeAsync(200);
			expect(oldClose).not.toHaveBeenCalled();
			await old.destroy();
			expect(newClose).not.toHaveBeenCalled();
			await notificationManager.destroy('shared');
			expect(newClose).toHaveBeenCalledTimes(1);
		} finally {
			await unmount(instance);
			vi.useRealTimers();
		}
	});

	it('clears notifications and timers before attempting every throwing close callback', async () => {
		vi.useFakeTimers();
		const { NotificationsStore } = await importNotificationStore();
		const store = new NotificationsStore();
		const error = new Error('close failed');
		const first = vi.fn(() => {
			expect(store.notifications).toEqual([]);
			expect(vi.getTimerCount()).toBe(0);
			throw error;
		});
		const second = vi.fn(() => {
			throw new Error('second failed');
		});
		const third = vi.fn(async () => {});
		try {
			for (const onClose of [first, second, third]) store.create({ onClose, duration: 100 });
			await expect(store.destroyAll()).rejects.toBe(error);
			for (const callback of [first, second, third]) expect(callback).toHaveBeenCalledTimes(1);
			expect(store.notifications).toEqual([]);
			await vi.advanceTimersByTimeAsync(200);
			expect(first).toHaveBeenCalledTimes(1);
		} finally {
			store.clearTimers();
			vi.useRealTimers();
		}
	});
});

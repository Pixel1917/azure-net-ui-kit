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

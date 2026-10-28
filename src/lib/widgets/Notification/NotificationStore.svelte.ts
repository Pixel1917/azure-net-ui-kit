import { BROWSER } from '@azure-net/tools/environment';
import type { NotificationConfig, Notification } from './types.js';
import { UidGenerator } from '@azure-net/tools';

export interface NotificationCreated {
	notification: Notification;
	destroy: () => void;
}

export interface INotificationStore {
	notifications: Notification[];
	create(config: NotificationConfig): Notification;
	destroy(id?: string | 'last' | 'first'): Promise<void>;
	destroyAll(): Promise<void>;
	clearTimers?(): void;
}

export interface INotificationManager {
	show(config: NotificationConfig): Promise<NotificationCreated>;
	destroy(id?: string | 'last' | 'first'): Promise<void>;
	destroyAll(): Promise<void>;
	alert(message: NotificationConfig['message'], config?: Omit<NotificationConfig, 'theme' | 'message'>): Promise<NotificationCreated>;
	warning(message: NotificationConfig['message'], config?: Omit<NotificationConfig, 'theme' | 'message'>): Promise<NotificationCreated>;
	success(message: NotificationConfig['message'], config?: Omit<NotificationConfig, 'theme' | 'message'>): Promise<NotificationCreated>;
	info(message: NotificationConfig['message'], config?: Omit<NotificationConfig, 'theme' | 'message'>): Promise<NotificationCreated>;
}

const generateName = () => `${Date.now()}-${UidGenerator.generateUuid()}`;

const createNotification = (id: string, config: NotificationConfig): Notification => {
	return {
		id,
		message: config.message ?? '',
		theme: config.theme ?? 'success',
		html: config.html ?? false,
		duration: config.duration ?? 3000,
		className: config.className ?? '',
		transitionFrom: config.transitionFrom ?? 'top-right',
		onClose: config.onClose ?? undefined,
		closeOnClick: config.closeOnClick ?? true,
		showClose: config.showClose ?? true
	};
};

export class NotificationsStore implements INotificationStore {
	notifications = $state<Notification[]>([]);
	private timers = new Map<string, ReturnType<typeof setTimeout>>();

	private clearTimer(id: string) {
		clearTimeout(this.timers.get(id));
		this.timers.delete(id);
	}

	clearTimers() {
		for (const timer of this.timers.values()) clearTimeout(timer);
		this.timers.clear();
	}

	create(config: NotificationConfig) {
		const id = config.id ?? generateName();
		const notification = createNotification(id, config);
		this.notifications = [...this.notifications, notification];
		this.clearTimer(id);
		if (notification.duration && notification.duration > 0 && BROWSER) {
			this.timers.set(
				id,
				setTimeout(() => this.destroy(id), notification.duration)
			);
		}
		return notification;
	}

	async destroy(id?: string | 'last' | 'first') {
		if (!id) {
			return;
		}
		let notification: Notification | undefined;

		switch (id) {
			case 'last':
				notification = this.notifications.at(-1);
				break;
			case 'first':
				notification = this.notifications.at(0);
				break;
			default:
				notification = this.notifications.find((n) => n.id === id);
				break;
		}

		if (notification) {
			this.clearTimer(notification.id);
			this.notifications = this.notifications.filter((n) => n.id !== notification.id);
			await notification.onClose?.();
		}
	}

	async destroyAll() {
		const notifications = this.notifications;
		this.notifications = [];
		this.clearTimers();
		await Promise.all(notifications.map(async (n) => n.onClose?.()));
	}
}

const createNotificationManager = () => {
	let store: INotificationStore | undefined;
	const setStore = (notificationStore: INotificationStore) => {
		if (store !== notificationStore) store?.clearTimers?.();
		store = notificationStore;
	};

	const destroyStore = (notificationStore = store) => {
		notificationStore?.clearTimers?.();
		if (notificationStore !== store) return;
		store = undefined;
	};

	const show = async (config: NotificationConfig) => {
		if (!store) {
			throw Error('Do not call show on server side or before mount');
		}
		const owner = store;
		const notification = owner.create(config);

		return {
			notification,
			destroy: () => owner.destroy(notification.id)
		};
	};

	const destroy = async (id?: string | 'last' | 'first') => store?.destroy(id);
	const destroyAll = async () => store?.destroyAll();

	const notificationManager: INotificationManager = {
		show,
		destroy,
		destroyAll,
		alert: (message, config) => show({ ...config, theme: 'alert', message }),
		warning: (message, config) => show({ ...config, theme: 'warning', message }),
		success: (message, config) => show({ ...config, theme: 'success', message }),
		info: (message, config) => show({ ...config, theme: 'info', message })
	};

	return { notificationManager, setStore, destroyStore };
};

export const { notificationManager, setStore, destroyStore } = createNotificationManager();

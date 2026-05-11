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

	create(config: NotificationConfig) {
		const id = config.id ?? generateName();
		const notification = createNotification(id, config);
		this.notifications = [...this.notifications, notification];
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
			this.notifications = this.notifications.filter((n) => n.id !== notification.id);
			await notification.onClose?.();
		}
	}

	async destroyAll() {
		const closesList = this.notifications.map((n) => n.onClose?.());
		this.notifications = [];
		await Promise.all(closesList);
	}
}

const createNotificationManager = () => {
	let store: INotificationStore | undefined;
	const setStore = (notificationStore: INotificationStore) => {
		store = notificationStore;
	};

	const destroyStore = () => {
		store = undefined;
	};

	const show = async (config: NotificationConfig) => {
		if (!store) {
			throw Error('Do not call show on server side or before mount');
		}
		const notification = store.create(config);
		let timeout: ReturnType<typeof setTimeout> | undefined;

		if (notification.duration && notification.duration > 0 && BROWSER) {
			timeout = setTimeout(async () => {
				await store?.destroy(notification.id);
			}, notification.duration);
		}

		return {
			notification,
			destroy: () => {
				if (timeout) {
					clearTimeout(timeout);
				}
				destroy(notification.id);
			}
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

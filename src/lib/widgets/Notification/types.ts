import type { fly, fade, scale, slide, FlyParams, FadeParams, ScaleParams, SlideParams } from 'svelte/transition';
import type { Snippet } from 'svelte';

export type NotificationPositions = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right' | 'center';

export type NotificationThemes = 'success' | 'alert' | 'warning' | 'info';

export interface NotificationContainerProps {
	position?: NotificationPositions;
	transition?: typeof fly | typeof fade | typeof scale | typeof slide;
	transitionParams?: Record<NotificationPositions, FlyParams | FadeParams | ScaleParams | SlideParams>;
	notificationSnippet?: Snippet<[{ notification: Notification }]>;
	globalMessageHandler?: (message: string) => string;
}

export interface NotificationConfig extends Omit<Notification, 'id'> {
	id?: string;
}

export interface Notification {
	id: string;
	html?: boolean;
	message?: string;
	transitionFrom?: NotificationPositions;
	duration?: number;
	theme?: NotificationThemes;
	className?: string;
	closeOnClick?: boolean;
	showClose?: boolean;
	onClose?: () => void | Promise<void>;
}

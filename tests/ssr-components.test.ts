import { describe, expect, it, vi } from 'vitest';
import { render } from 'svelte/server';

const importForServer = async () => {
	vi.resetModules();
	const environment = await import('./mocks/toolsEnvironment.js');
	environment.setBrowser(false);

	const [modal, notification] = await Promise.all([
		import('../src/lib/widgets/Modal/ModalContainer.svelte'),
		import('../src/lib/widgets/Notification/NotificationContainer.svelte')
	]);

	return {
		ModalContainer: modal.default,
		NotificationContainer: notification.default
	};
};

describe('widget SSR rendering', () => {
	it('renders modal and notification containers on server without DOM access', async () => {
		const { ModalContainer, NotificationContainer } = await importForServer();

		expect(() => render(ModalContainer)).not.toThrow();
		expect(() => render(NotificationContainer)).not.toThrow();
	});
});

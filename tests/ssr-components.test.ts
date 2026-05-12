import { describe, expect, it, vi } from 'vitest';
import { render } from 'svelte/server';

const importForServer = async () => {
	vi.resetModules();
	const environment = await import('./mocks/toolsEnvironment.js');
	environment.setBrowser(false);

	const [modal, notification, cropper] = await Promise.all([
		import('../src/lib/widgets/Modal/ModalContainer.svelte'),
		import('../src/lib/widgets/Notification/NotificationContainer.svelte'),
		import('../src/lib/widgets/Cropper/Cropper.svelte')
	]);

	return {
		ModalContainer: modal.default,
		NotificationContainer: notification.default,
		Cropper: cropper.default
	};
};

describe('widget SSR rendering', () => {
	it('renders modal, notification and cropper widgets on server without DOM access', async () => {
		const { ModalContainer, NotificationContainer, Cropper } = await importForServer();

		expect(() => render(ModalContainer)).not.toThrow();
		expect(() => render(NotificationContainer)).not.toThrow();
		expect(() => render(Cropper, { props: { src: '/image.jpg' } })).not.toThrow();
	});
});

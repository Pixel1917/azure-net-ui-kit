import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setBrowser } from './mocks/toolsEnvironment.js';

const importProgressBar = async (browser = true) => {
	vi.resetModules();
	const environment = await import('./mocks/toolsEnvironment.js');
	environment.setBrowser(browser);
	return await import('../src/lib/widgets/ProgressBar/index.js');
};

describe('progressBar SSR safety', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
		setBrowser(true);
		vi.useRealTimers();
	});

	it('can be imported on server but throws when used', async () => {
		const { progressBar } = await importProgressBar(false);

		expect(() => progressBar.start()).toThrow('browser environment');
		expect(() => progressBar.configure({ color: 'red' })).toThrow('browser environment');
	});
});

describe('progressBar', () => {
	beforeEach(() => {
		document.head.innerHTML = '';
		document.body.innerHTML = '';
		setBrowser(true);
		vi.useRealTimers();
	});

	it('starts, increments and removes the progress element', async () => {
		const { progressBar } = await importProgressBar();

		progressBar.start();
		expect(progressBar.isStarted()).toBe(true);
		expect(document.querySelector('#azure-net-progress-bar .progress-bar')).not.toBeNull();

		const previousStatus = progressBar.status;
		progressBar.inc(0.2);
		expect(progressBar.status).toBeGreaterThan(previousStatus ?? 0);

		progressBar.remove();
		expect(progressBar.isStarted()).toBe(false);
		expect(document.getElementById('azure-net-progress-bar')).toBeNull();
	});

	it('supports custom parent and visual options', async () => {
		const { progressBar } = await importProgressBar();
		const parent = document.createElement('div');
		document.body.append(parent);

		progressBar.configure({
			parent,
			color: 'rgb(1, 2, 3)',
			height: 5,
			zIndex: 42,
			speed: 10,
			trickle: false
		});
		progressBar.set(0.5);

		const root = parent.querySelector('#azure-net-progress-bar');
		const bar = root?.querySelector('.progress-bar') as HTMLElement | null;

		expect(root).not.toBeNull();
		expect(bar?.style.getPropertyValue('--progress-bar-color')).toBe('rgb(1, 2, 3)');
		expect(bar?.style.getPropertyValue('--progress-bar-height')).toBe('5px');
		expect(bar?.style.getPropertyValue('--progress-bar-z-index')).toBe('42');

		progressBar.remove();
	});

	it('done removes the progress element after configured speed', async () => {
		vi.useFakeTimers();
		const { progressBar } = await importProgressBar();

		progressBar.configure({ speed: 20, trickle: false });
		progressBar.start().done();

		expect(document.getElementById('azure-net-progress-bar')).not.toBeNull();
		await vi.advanceTimersByTimeAsync(20);
		expect(document.getElementById('azure-net-progress-bar')).toBeNull();

		vi.useRealTimers();
	});
});

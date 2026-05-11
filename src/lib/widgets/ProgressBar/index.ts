import { BROWSER } from '@azure-net/tools/environment';
import { afterNavigate, beforeNavigate } from '$app/navigation';

export interface ProgressBarOptions {
	minimum?: number;
	speed?: number;
	trickle?: boolean;
	trickleRate?: number;
	trickleSpeed?: number;
	parent?: string | HTMLElement;
	color?: string;
	height?: string | number;
	zIndex?: number;
}

export interface ProgressBarManager {
	status: number | null;
	configure(options: ProgressBarOptions): ProgressBarManager;
	start(): ProgressBarManager;
	set(progress: number): ProgressBarManager;
	inc(amount?: number): ProgressBarManager;
	done(force?: boolean): ProgressBarManager;
	remove(): ProgressBarManager;
	isStarted(): boolean;
}

const BAR_ID = 'azure-net-progress-bar';
const STYLE_ID = 'azure-net-progress-bar-style';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

const toCssSize = (value: string | number) => (typeof value === 'number' ? `${value}px` : value);

const getRandomIncrement = (status: number) => {
	if (status < 0.2) return 0.1;
	if (status < 0.5) return 0.04;
	if (status < 0.8) return 0.02;
	if (status < 0.99) return 0.005;
	return 0;
};

const createProgressBar = (): ProgressBarManager => {
	let status: number | null = null;
	let trickleTimer: ReturnType<typeof setTimeout> | undefined;

	const options: Required<Omit<ProgressBarOptions, 'parent'>> & Pick<ProgressBarOptions, 'parent'> = {
		minimum: 0.08,
		speed: 240,
		trickle: true,
		trickleRate: 0.02,
		trickleSpeed: 700,
		parent: undefined,
		color: 'rgb(53, 165, 164)',
		height: 3,
		zIndex: 9999
	};

	const assertBrowser = () => {
		if (!BROWSER || typeof document === 'undefined') {
			throw Error('ProgressBar can be used only in browser environment');
		}
	};

	const getParent = () => {
		assertBrowser();

		if (typeof options.parent === 'string') {
			const parent = document.querySelector(options.parent);
			if (!parent) {
				throw Error(`ProgressBar parent "${options.parent}" was not found`);
			}
			return parent;
		}

		return options.parent ?? document.body;
	};

	const ensureStyle = () => {
		assertBrowser();

		if (document.getElementById(STYLE_ID)) return;

		const style = document.createElement('style');
		style.id = STYLE_ID;
		style.textContent = `
			#${BAR_ID} {
				pointer-events: none;
			}

			#${BAR_ID} .progress-bar {
				position: fixed;
				top: 0;
				left: 0;
				width: 100%;
				height: var(--progress-bar-height);
				background: var(--progress-bar-color);
				box-shadow: 0 0 10px var(--progress-bar-color), 0 0 5px var(--progress-bar-color);
				transform: translate3d(-100%, 0, 0);
				transition:
					transform var(--progress-bar-speed) ease,
					opacity var(--progress-bar-speed) ease;
				z-index: var(--progress-bar-z-index);
			}
		`;
		document.head.append(style);
	};

	const getElement = () => document.getElementById(BAR_ID);

	const render = () => {
		assertBrowser();
		ensureStyle();

		const existing = getElement();
		if (existing) return existing;

		const root = document.createElement('div');
		const bar = document.createElement('div');

		root.id = BAR_ID;
		bar.className = 'progress-bar';
		root.append(bar);
		getParent().append(root);

		return root;
	};

	const updateBar = (progress: number, opacity = '1') => {
		const root = render();
		const bar = root.firstElementChild as HTMLElement | null;

		if (!bar) return;

		bar.style.setProperty('--progress-bar-color', options.color);
		bar.style.setProperty('--progress-bar-height', toCssSize(options.height));
		bar.style.setProperty('--progress-bar-speed', `${options.speed}ms`);
		bar.style.setProperty('--progress-bar-z-index', String(options.zIndex));
		bar.style.opacity = opacity;
		bar.style.transform = `translate3d(${(-1 + progress) * 100}%, 0, 0)`;
	};

	const clearTrickle = () => {
		if (trickleTimer) {
			clearTimeout(trickleTimer);
			trickleTimer = undefined;
		}
	};

	const queueTrickle = () => {
		clearTrickle();

		if (!options.trickle || status === null) return;

		trickleTimer = setTimeout(() => {
			api.inc(options.trickleRate);
			queueTrickle();
		}, options.trickleSpeed);
	};

	const api: ProgressBarManager = {
		get status() {
			return status;
		},

		configure(nextOptions) {
			assertBrowser();
			Object.assign(options, nextOptions);
			return api;
		},

		start() {
			if (status === null) {
				api.set(0);
			}

			queueTrickle();
			return api;
		},

		set(progress) {
			assertBrowser();

			status = progress >= 1 ? null : clamp(progress, options.minimum, 0.994);
			updateBar(status ?? 1, progress >= 1 ? '0' : '1');

			if (progress >= 1) {
				clearTrickle();
				setTimeout(() => api.remove(), options.speed);
			}

			return api;
		},

		inc(amount) {
			const currentStatus = status;

			if (currentStatus === null) {
				return api.start();
			}

			return api.set(currentStatus + (amount ?? getRandomIncrement(currentStatus)));
		},

		done(force = false) {
			if (!force && status === null) {
				return api;
			}

			return api.set(1);
		},

		remove() {
			assertBrowser();
			clearTrickle();
			status = null;
			getElement()?.remove();
			return api;
		},

		isStarted() {
			return status !== null;
		}
	};

	return api;
};

export const progressBar = createProgressBar();

export const useRouteLoadBar = (options: ProgressBarOptions = {}) => {
	if (!BROWSER) {
		throw Error('useRouteLoadBar must be used on client side in component');
	}
	progressBar.configure(options);
	beforeNavigate(() => {
		progressBar.start();
	});

	afterNavigate(() => {
		progressBar.done();
	});
};

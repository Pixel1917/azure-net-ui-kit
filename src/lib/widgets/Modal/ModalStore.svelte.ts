import { UidGenerator } from '@azure-net/tools';
import { stylesToCssText, type ModalInlineStyles } from './utils.js';
import type { Component } from 'svelte';
import type { ModalConfig, StoredModal, Modal, ModalStyleEntries } from './types.js';

type AnyComponent = Component<Record<string, unknown>, Record<string, unknown>, string>;
type ComponentModule<TComponent> = { default: TComponent };
type AwaitedModalComponent<TComponent> =
	Awaited<TComponent> extends ComponentModule<infer TResolvedComponent> ? TResolvedComponent : Awaited<TComponent>;
type ExtractComponentProps<TComponent> =
	AwaitedModalComponent<TComponent> extends Component<infer TProps, Record<string, unknown>, string> ? TProps : never;

export interface IModalCreateConfig<TComponent> {
	component: TComponent;
	loader?: never;
	props?: Omit<ExtractComponentProps<NoInfer<TComponent>>, 'closeModal' | 'options' | 'children' | 'update'>;
	options?: ModalConfig;
	useDefaultTemplate?: boolean;
}

export interface IModalLoaderConfig<TComponent> extends Omit<IModalCreateConfig<TComponent>, 'component' | 'loader'> {
	component?: never;
	loader: () => TComponent;
}

export interface IModalStore {
	modals: StoredModal[];
	current?: StoredModal;
	overlayStyles: string;
	create<TComponent>(config: IModalCreateConfig<TComponent>): StoredModal;
	update(name: string, updater: (modal: Modal) => Modal): void;
	has(name: string): boolean;
	destroy(name?: string): void | Promise<void>;
	destroyLast(): void | Promise<void>;
	destroyAll(): void | Promise<void>;
}

export interface ModalHandle {
	modal: Modal;
	update: (updater: (modal: Modal) => Modal) => void;
	destroy: () => Promise<void>;
}
export interface CreatedModalHandle<TShow = ModalHandle> {
	show: () => TShow;
	update: ModalHandle['update'];
	destroy: ModalHandle['destroy'];
}
export type ModalResult<TComponent, TResult> = TComponent extends PromiseLike<unknown> ? Promise<TResult> : TResult;

export interface IModalManager {
	create<TComponent>(config: IModalCreateConfig<TComponent>): CreatedModalHandle<ModalResult<TComponent, ModalHandle>>;
	create<TComponent>(config: IModalLoaderConfig<TComponent>): CreatedModalHandle<Promise<ModalHandle>>;
	show<TComponent>(config: IModalCreateConfig<TComponent>): ModalResult<TComponent, ModalHandle>;
	show<TComponent>(config: IModalLoaderConfig<TComponent>): Promise<ModalHandle>;
	update(name: string, updater: (modal: Modal) => Modal): void;
	has(name: string): boolean;
	destroy(name?: string): void | Promise<void>;
	destroyLast(): void | Promise<void>;
	destroyAll(): void | Promise<void>;
	current?: StoredModal;
}

const generateName = () => `${Date.now()}-${UidGenerator.generateUuid()}`;

const hasStyles = (styles?: ModalInlineStyles) => {
	return !!styles && Object.keys(styles).length > 0;
};

const mergeStyles = (...stylesList: Array<ModalInlineStyles | undefined>): ModalInlineStyles => {
	return Object.assign({}, ...stylesList.filter(hasStyles));
};

const isThenable = <TValue>(value: TValue | Promise<TValue>): value is Promise<TValue> => {
	return !!value && typeof (value as Promise<TValue>).then === 'function';
};

const resolveComponent = <TComponent>(component: TComponent | ComponentModule<TComponent>): TComponent => {
	return component && typeof component === 'object' && 'default' in component ? component.default : component;
};

export const defaultStyles: ModalStyleEntries = {
	wrapper: {
		position: 'fixed',
		borderRadius: '12px',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		width: '100vw',
		height: '100vh',
		zIndex: 998,
		display: 'flex',
		justifyContent: 'center',
		alignItems: 'center'
	},
	modal: {
		maxWidth: '600px',
		width: '100%',
		position: 'relative',
		display: 'flex',
		flexDirection: 'column',
		overflowY: 'hidden',
		borderRadius: '8px',
		background: 'rgba(var(--modal_background_color, 255, 255, 255))',
		height: 'unset'
	},
	overlay: {
		position: 'fixed',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		width: '100vw',
		height: '100vh',
		zIndex: 997,
		backgroundColor: 'rgba(var(--modal_overlay_color, 0, 0, 0), .3)',
		backdropFilter: 'blur(2px)'
	}
};

export class ModalsStore implements IModalStore {
	modals = $state<StoredModal[]>([]);
	private styles: Required<ModalStyleEntries>;

	constructor(styles: ModalStyleEntries = {}) {
		this.styles = {
			wrapper: mergeStyles(defaultStyles.wrapper, styles.wrapper),
			modal: mergeStyles(defaultStyles.modal, styles.modal),
			overlay: mergeStyles(defaultStyles.overlay, styles.overlay)
		};
	}

	get current() {
		return this.modals.at(-1);
	}

	private toStoredModal(config: { component: unknown; props?: unknown; options?: ModalConfig; useDefaultTemplate?: boolean }) {
		const modalStyles = mergeStyles(this.styles.modal, config.options?.injectModalStyles);
		const wrapperStyles = mergeStyles(this.styles.wrapper, config.options?.injectWrapperStyles);
		if (config.options?.scrollable) {
			modalStyles.overflowY = 'auto';
		}
		return <StoredModal>{
			...config,
			options: {
				...config.options,
				name: config.options?.name ?? generateName(),
				modalStyles: stylesToCssText(modalStyles),
				wrapperStyles: stylesToCssText(wrapperStyles)
			}
		};
	}

	get overlayStyles() {
		return stylesToCssText(this.styles.overlay);
	}

	create<TComponent>(config: IModalCreateConfig<TComponent>) {
		const component = isThenable(config.component)
			? config.component.then((resolvedComponent) => resolveComponent(resolvedComponent))
			: resolveComponent(config.component);
		const builtModal = this.toStoredModal({ ...config, component: component as AnyComponent | Promise<AnyComponent> });
		if (!this.modals.find((m) => m.options.name === builtModal.options.name)) {
			this.modals = [...this.modals, builtModal];
		}
		return builtModal;
	}

	update(name: string, updater: (modal: Modal) => Modal) {
		this.modals = this.modals.map((m) => (m.options.name === name ? updater(m as Modal) : m));
	}

	has(name: string): boolean {
		return this.modals.some((m) => m.options.name === name);
	}

	async destroy(name?: string) {
		if (!name) {
			return;
		}
		const modal = this.modals.find((m) => m.options.name === name);
		this.modals = this.modals.filter((m) => m.options.name !== name);
		if (modal?.options?.onClose) {
			await modal.options.onClose();
		}
	}

	async destroyLast() {
		const modal = this.modals.at(-1);
		if (modal) {
			this.modals = this.modals.filter((m) => m.options.name !== modal.options?.name);
			if (modal?.options?.onClose) {
				await modal.options.onClose();
			}
		}
	}

	async destroyAll() {
		const closesList = this.modals.map((m) => m.options.onClose?.());
		this.modals = [];
		await Promise.all(closesList);
	}
}

const createModalManager = () => {
	let store: IModalStore | undefined;
	let hookHandler: ((action: 'open' | 'close') => void) | undefined;

	const setStore = (modalsStore: IModalStore) => {
		store = modalsStore;
	};

	const destroyStore = () => {
		store = undefined;
		hookHandler = undefined;
	};

	const onOpenCloseHook = (hook: (action: 'open' | 'close') => void) => {
		hookHandler = hook;
	};

	function create<TComponent>(config: IModalCreateConfig<TComponent>): CreatedModalHandle<ModalResult<TComponent, ModalHandle>>;
	function create<TComponent>(config: IModalLoaderConfig<TComponent>): CreatedModalHandle<Promise<ModalHandle>>;
	function create<TComponent>(
		config: IModalCreateConfig<TComponent> | IModalLoaderConfig<TComponent>
	): CreatedModalHandle<ModalHandle | Promise<ModalHandle>> {
		const name = config.options?.name ?? generateName();
		return {
			show: () => open({ ...config, options: { ...config.options, name } }),
			update: (updater: (modal: Modal) => Modal) => {
				if (!has(name)) {
					console.info(`No modal with name ${name} opened`);
					return;
				}
				update(name, updater);
			},
			destroy: () => destroy(name)
		};
	}

	const showResolved = <TComponent>(config: IModalCreateConfig<TComponent>): ModalHandle => {
		if (!store) {
			throw Error('Do not call show on server side or before mount');
		}
		const modal = store.create(config);
		hookHandler?.('open');
		return { modal, update: (updater: (modal: Modal) => Modal) => update(modal.options.name, updater), destroy: () => destroy(modal.options.name) };
	};

	function open<TComponent>(config: IModalCreateConfig<TComponent> | IModalLoaderConfig<TComponent>): ModalHandle | Promise<ModalHandle> {
		const target = store;
		const assertMounted = () => {
			if (!target || target !== store) throw new Error('Do not call show on server side or before mount; modal container may have been unmounted');
		};
		const finish = (value: unknown) => {
			assertMounted();
			const component = resolveComponent(value);
			if (typeof component !== 'function') throw new TypeError('Modal component must be a Svelte component or a module with a default component');
			return showResolved({
				component,
				props: config.props,
				options: config.options,
				useDefaultTemplate: config.useDefaultTemplate
			} as IModalCreateConfig<AnyComponent>);
		};
		if (config.loader !== undefined) {
			return Promise.resolve()
				.then(() => {
					assertMounted();
					if (config.component !== undefined) throw new TypeError('Use either component or loader, not both');
					return config.loader!();
				})
				.then(finish);
		}
		return isThenable(config.component) ? Promise.resolve(config.component).then(finish) : finish(config.component);
	}
	function show<TComponent>(config: IModalCreateConfig<TComponent>): ModalResult<TComponent, ModalHandle>;
	function show<TComponent>(config: IModalLoaderConfig<TComponent>): Promise<ModalHandle>;
	function show<TComponent>(config: IModalCreateConfig<TComponent> | IModalLoaderConfig<TComponent>) {
		return open(config);
	}

	const update = (name: string, updater: (modal: Modal) => Modal) => store?.update(name, updater);
	const has = (name: string) => store?.has(name) ?? false;
	const destroy = async (name?: string) => {
		await store?.destroy(name);
		hookHandler?.('close');
	};
	const destroyLast = async () => {
		await store?.destroyLast();
		hookHandler?.('close');
	};
	const destroyAll = async () => {
		await store?.destroyAll();
		hookHandler?.('close');
	};

	const modalManager: IModalManager = {
		create,
		show,
		update,
		has,
		destroy,
		destroyLast,
		destroyAll,
		get current() {
			return store?.current;
		}
	};

	return { modalManager, setStore, destroyStore, onOpenCloseHook };
};

export const { modalManager, setStore, destroyStore, onOpenCloseHook } = createModalManager();

# Svelte library

Everything you need to build a Svelte library, powered by [`sv`](https://npmjs.com/package/sv).

Read more about creating a library [in the docs](https://svelte.dev/docs/kit/packaging).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project in the current directory
npx sv create

# create a new project in my-app
npx sv create my-app
```

To recreate this project with the same configuration:

```sh
# recreate this project
pnpm dlx sv@0.15.1 create --template library --types ts --add prettier eslint --install pnpm azure-net-ui-kit
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

Everything inside `src/lib` is part of your library, everything inside `src/routes` can be used as a showcase or preview app.

## Building

To build your library:

```sh
npm pack
```

To create a production version of your showcase app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

## Publishing

Go into the `package.json` and give your package the desired name through the `"name"` option. Also consider adding a `"license"` field and point it to a `LICENSE` file which you can create from a template (one popular option is the [MIT license](https://opensource.org/license/mit/)).

To publish your library to [npm](https://www.npmjs.com):

```sh
npm publish
```

## Modal components

`modalManager.create` prepares a handle; its `show()` opens the modal.
`modalManager.show` opens immediately. Both infer props from a component,
a `{ default: Component }` module, or a promise resolving either form.
`create` is always synchronous. Only `show` becomes asynchronous for a promise input or a `loader`.
Use `loader: () => import(...)` to start loading at show time (plain `import(...)` starts immediately).
`component` and `loader` are mutually exclusive and both infer props:

```ts
import { modalManager } from '@azure-net/ui-kit/widgets';
import Dialog from './Dialog.svelte';

const prepared = modalManager.create({ component: Dialog, props: { title: 'Hello' } });
prepared.show();

const lazy = modalManager.create({
	loader: () => import('./Dialog.svelte'),
	props: { title: 'Hello' }
});
await lazy.show();

await modalManager.show({ component: import('./Dialog.svelte'), props: { title: 'Hello' } });
```

Import failures reject the returned promise without opening a modal. A pending
`show` cannot open in a container that was unmounted or replaced during loading.
Opening requires a mounted `ModalContainer`; preparing a handle does not.

## useAnimate

```svelte
<script lang="ts">
	import { useAnimate } from '@azure-net/ui-kit';
</script>

<section use:useAnimate={{ classes: ['visible', 'fade-in'], delay: 100, once: true }}>Content</section>
```

The action adds classes when the element intersects its observer root. Supply your
own CSS animations. Options: `classes`, `delay` (milliseconds), `root`, `rootMargin`,
`threshold`, `once` (default `true`), and `enabled` (default `true`). With `once: false`,
classes are removed on exit and added on re-entry. Delay is cancelled on exit.
Updates replace options and cancel stale work. After a one-time reveal, updated
classes apply immediately; use `once: false` to resume observation.
Disabling removes action-owned classes. Existing classes are preserved during cleanup.
Without IntersectionObserver, classes are applied immediately. SSR does nothing.

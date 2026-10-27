import { hydrate } from 'svelte';
import Harness from './Harness.svelte';
const target = document.getElementById('app');
if (!target) throw new Error('Missing hydration target');
Object.assign(window, { harness: hydrate(Harness, { target }) });
document.documentElement.dataset.hydrated = 'true';

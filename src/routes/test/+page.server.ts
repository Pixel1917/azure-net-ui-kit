import type { PageServerLoad } from './$types.js';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const load: PageServerLoad = async () => {
	await delay(3000);

	return {
		delayed: true
	};
};

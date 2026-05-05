import { Frontend } from '../../types';
import { formatNavLink } from '../../utils/formatNavLink';

export const generateVuePage = (
	frontends: Frontend[],
	editBasePath: string
) => {
	const navLinks = frontends.map(formatNavLink).join('\n\t\t\t');

	return `<script setup lang="ts">
import CountButton from '../components/CountButton.vue';
import { ref } from 'vue';

const props = defineProps<{
	initialCount: number;
}>();

const count = ref(props.initialCount);
const dropdown = ref<HTMLDetailsElement>();

const openDropdown = (event: PointerEvent) => {
	if (event.pointerType === 'mouse' && dropdown.value) {
		dropdown.value.open = true;
	}
};

const closeDropdown = (event: PointerEvent) => {
	if (event.pointerType === 'mouse' && dropdown.value) {
		dropdown.value.open = false;
	}
};
</script>

<template>
	<header>
		<a href="/">AbsoluteJS</a>
		<details
			ref="dropdown"
			@pointerenter="openDropdown"
			@pointerleave="closeDropdown"
		>
			<summary>Pages</summary>
			<nav>
				${navLinks}
			</nav>
		</details>
	</header>

	<main>
		<nav>
			<a href="https://absolutejs.com" target="_blank">
				<img
					class="logo"
					src="/assets/png/absolutejs-temp.png"
					alt="AbsoluteJS Logo"
				/>
			</a>
			<a href="https://vuejs.org" target="_blank">
				<img
					class="logo vue"
					src="/assets/svg/vue-logo.svg"
					alt="Vue Logo"
				/>
			</a>
		</nav>
		<h1>AbsoluteJS + Vue</h1>
		<CountButton :initialCount="count" />
		<p>
			Edit <code>${editBasePath}/pages/VueExample.vue</code> and save
			to test HMR.
		</p>
${
	frontends.length > 1
		? `		<p style="margin-top: 2rem">
			Explore the other pages to see multiple frameworks running
			together.
		</p>\n`
		: ''
}		<p style="color: #777; font-size: 1rem; margin-top: 2rem">
			Click on the AbsoluteJS and Vue logos to learn more.
		</p>
	</main>
</template>

<style scoped>
:global(#root) {
	display: flex;
	flex-direction: column;
	margin: 0 auto;
	height: 100%;
	width: 100%;
}
</style>
`;
};

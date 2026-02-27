<script lang="ts">
	type CounterProps = {
		initialCount: number;
	};

	let { initialCount }: CounterProps = $props();
	import { counter } from '../composables/counter.svelte';
	const { getCount, increment } = counter(initialCount);
</script>

<button onclick={increment}>count is {getCount()}</button>

<style>
	button:hover {
		border-color: #ff3e00;
	}

	@media (prefers-color-scheme: light) {
		button {
			background-color: #ffffff;
		}
	}
</style>

<template>
	<div class="surveyjs-creator-interface">
		<h3>SurveyJS Creator Interface (Test)</h3>
		<p>Value: {{ value }}</p>
		<button @click="testEmit">Test Emit</button>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
	props: {
		value: {
			type: [String, Object],
			default: null,
		},
	},
	emits: ['input'],
	setup(props, { emit }) {
		const testEmit = () => {
			emit('input', JSON.stringify({ test: 'data' }));
		};

		return {
			testEmit,
		};
	},
});
</script>

<style scoped>
.surveyjs-creator-interface {
	padding: 20px;
	border: 1px solid #ccc;
	border-radius: 4px;
}
</style>

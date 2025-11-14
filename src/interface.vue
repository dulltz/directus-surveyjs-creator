<template>
	<div class="surveyjs-creator-interface">
		<div v-if="creator" class="creator-wrapper">
			<SurveyCreatorComponent :model="creator" />
		</div>
		<div v-else class="loading">Loading SurveyJS Creator...</div>
	</div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted, watch } from 'vue';
import { SurveyCreatorComponent } from 'survey-creator-vue';
import { SurveyCreatorModel } from 'survey-creator-core';
import { setLicenseKey } from 'survey-core';
import 'survey-core/survey-core.min.css';
import 'survey-creator-core/survey-creator-core.min.css';

interface SurveyJSON {
	title?: string;
	pages?: any[];
	[key: string]: any;
}

export default defineComponent({
	components: {
		SurveyCreatorComponent,
	},
	props: {
		value: {
			type: [String, Object],
			default: null,
		},
	},
	emits: ['input'],
	setup(props, { emit }) {
		const creator = ref<SurveyCreatorModel | null>(null);
		const isMounted = ref(false);
		const licenseKeyFetched = ref(false);
		const initialLoadComplete = ref(false);

		const defaultSurvey: SurveyJSON = {
			title: 'New Survey',
			pages: [
				{
					name: 'page1',
					elements: [],
				},
			],
		};

		async function fetchLicenseKey() {
			try {
				const response = await fetch('/surveyjs-license');
				const data = await response.json();
				if (data.licenseKey) {
					setLicenseKey(data.licenseKey);
				}
			} catch (error) {
				console.warn('Failed to fetch SurveyJS license key:', error);
			}
			licenseKeyFetched.value = true;
		}

		function parseSurveyValue(value: any): SurveyJSON {
			if (!value) {
				return defaultSurvey;
			}

			let parsed: any;

			if (typeof value === 'object') {
				parsed = value;
			} else if (typeof value === 'string') {
				try {
					parsed = JSON.parse(value);
				} catch (error) {
					console.warn('Failed to parse survey JSON, using default:', error);
					return defaultSurvey;
				}
			} else {
				return defaultSurvey;
			}

			// Ensure valid survey structure
			if (!parsed.pages || !Array.isArray(parsed.pages)) {
				console.warn('Invalid survey structure, using default');
				return defaultSurvey;
			}

			// Ensure each page has elements array
			parsed.pages = parsed.pages.map((page: any) => ({
				...page,
				elements: page.elements || [],
			}));

			return parsed;
		}

		function initializeCreator(force: boolean = false) {
			if (!isMounted.value || !licenseKeyFetched.value) {
				return;
			}

			// Don't re-initialize if already complete, unless forced
			if (initialLoadComplete.value && !force) {
				return;
			}

			// Destroy previous creator instance if exists (when force re-initializing)
			if (creator.value && force) {
				creator.value = null;
			}

			const surveyJson = parseSurveyValue(props.value);

			const creatorOptions = {
				showLogicTab: false,
				showJSONEditorTab: true,
				showThemeTab: false,
				isAutoSave: false,
				showDesignerTab: true,
				showPreviewTab: false,
				showTestSurveyTab: false,
			};

			const newCreator = new SurveyCreatorModel(creatorOptions);
			newCreator.JSON = surveyJson;

			// Hide the save button - use Directus's save button instead
			newCreator.showSaveButton = false;

			// Auto-sync changes to Directus on any modification
			newCreator.onModified.add(() => {
				if (!isMounted.value) return;

				const surveyJson = newCreator.JSON;
				const jsonString = JSON.stringify(surveyJson);
				emit('input', jsonString);
			});

			creator.value = newCreator;
			initialLoadComplete.value = true;
		}

		// Watch for initial props.value load (Directus loads props asynchronously)
		// This watch automatically stops after the first non-null value is received
		const stopWatch = watch(() => props.value, (newValue) => {
			// If we get actual data from Directus (non-null value), initialize/re-initialize
			if (newValue && licenseKeyFetched.value && isMounted.value) {
				// Force re-initialization if actual data arrives (even if already initialized with default)
				initializeCreator(true);
				// Stop watching after receiving actual data to prevent memory issues
				stopWatch();
			}
		});

		onMounted(async () => {
			isMounted.value = true;
			await fetchLicenseKey();
			initializeCreator();

			// If still not initialized after a short delay (new item with null value),
			// ensure initialization with default survey
			setTimeout(() => {
				if (!initialLoadComplete.value) {
					initializeCreator();
				}
			}, 100);
		});

		onUnmounted(() => {
			isMounted.value = false;
			if (creator.value) {
				creator.value = null;
			}
		});

		return {
			creator,
		};
	},
});
</script>

<style>
/* Main container - full width layout avoiding Directus sidebars */
.surveyjs-creator-interface {
	position: relative;
	width: calc(100vw - 240px - 320px); /* Left sidebar + right panel */
	margin-left: -32px;
	margin-right: -32px;
	max-width: none;
	padding: 0 20px;
	box-sizing: border-box;
}

/* Responsive adjustments for collapsed sidebar */
@media (max-width: 960px) {
	.surveyjs-creator-interface {
		width: calc(100vw - 64px - 320px);
	}
}

/* Creator wrapper with full height */
.creator-wrapper {
	width: 100%;
	height: calc(100vh - 120px);
	min-height: 800px;
	display: flex;
	flex-direction: column;
	background: white;
	border-radius: 8px;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	padding: 16px;
}

/* Loading state */
.loading {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 200px;
	color: #666;
	font-size: 14px;
}

/* SurveyJS Creator styling */
:deep(.svc-creator) {
	contain: layout style paint;
	height: 100% !important;
	width: 100%;
}

:deep(.svc-creator__area) {
	will-change: auto;
}
</style>

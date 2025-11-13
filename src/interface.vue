<template>
	<div class="surveyjs-creator-interface">
		<div v-if="creator" class="creator-wrapper">
			<div class="save-notice">
				💾 After saving, please <strong>reload the page</strong> (F5 or Cmd/Ctrl+R) to see your changes.
			</div>
			<SurveyCreatorComponent :model="creator" />
		</div>
		<div v-else class="loading">Loading SurveyJS Creator...</div>
	</div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted } from 'vue';
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
			console.log('[SurveyJS] Fetching license key...');
			try {
				const response = await fetch('/surveyjs-license');
				const data = await response.json();
				console.log('[SurveyJS] License key fetched:', data.licenseKey ? 'present' : 'empty');
				if (data.licenseKey) {
					setLicenseKey(data.licenseKey);
					console.log('[SurveyJS] License key set');
				}
			} catch (error) {
				console.warn('[SurveyJS] Failed to fetch license key:', error);
			}
			licenseKeyFetched.value = true;
			console.log('[SurveyJS] License key fetch completed');
		}

		function parseSurveyValue(value: any): SurveyJSON {
			console.log('[SurveyJS] parseSurveyValue input:', value, 'type:', typeof value);

			if (!value) {
				console.log('[SurveyJS] Value is empty, using default');
				return defaultSurvey;
			}

			let parsed: any;

			// If value is already an object, use it
			if (typeof value === 'object') {
				console.log('[SurveyJS] Value is already an object');
				parsed = value;
			}
			// If value is a string, try to parse it
			else if (typeof value === 'string') {
				try {
					parsed = JSON.parse(value);
					console.log('[SurveyJS] Parsed string to object:', parsed);
				} catch (error) {
					console.warn('[SurveyJS] Failed to parse survey JSON, using default:', error);
					return defaultSurvey;
				}
			} else {
				console.log('[SurveyJS] Unknown value type, using default');
				return defaultSurvey;
			}

			// Ensure parsed has required structure
			if (!parsed.pages || !Array.isArray(parsed.pages)) {
				console.warn('[SurveyJS] Invalid survey structure, using default');
				return defaultSurvey;
			}

			// Ensure each page has elements array
			parsed.pages = parsed.pages.map((page: any) => ({
				...page,
				elements: page.elements || [],
			}));

			console.log('[SurveyJS] Final parsed value:', parsed);
			return parsed;
		}

		function initializeCreator() {
			console.log('[SurveyJS] initializeCreator called', {
				isMounted: isMounted.value,
				licenseKeyFetched: licenseKeyFetched.value,
			});

			if (!isMounted.value || !licenseKeyFetched.value) {
				console.log('[SurveyJS] Not ready to initialize, skipping');
				return;
			}

			const surveyJson = parseSurveyValue(props.value);
			console.log('[SurveyJS] Survey JSON parsed:', surveyJson);

			const creatorOptions = {
				showLogicTab: false,
				showJSONEditorTab: true,
				showThemeTab: false,
				isAutoSave: false,
				showDesignerTab: true,
				showPreviewTab: false,
				showTestSurveyTab: false,
			};

			console.log('[SurveyJS] Creating SurveyCreatorModel...');
			const newCreator = new SurveyCreatorModel(creatorOptions);
			console.log('[SurveyJS] SurveyCreatorModel created');

			newCreator.JSON = surveyJson;
			console.log('[SurveyJS] Survey JSON set to creator');

			// Save survey function
			newCreator.saveSurveyFunc = (saveNo: number, callback: (saveNo: number, success: boolean) => void) => {
				console.log('[SurveyJS] saveSurveyFunc called, saveNo:', saveNo);
				if (!isMounted.value) {
					console.log('[SurveyJS] Component unmounted, skipping save');
					callback(saveNo, false);
					return;
				}

				const surveyJson = newCreator.JSON;
				const jsonString = JSON.stringify(surveyJson);
				console.log('[SurveyJS] Emitting input event, length:', jsonString.length);
				emit('input', jsonString);
				callback(saveNo, true);
				console.log('[SurveyJS] Survey saved successfully');
			};

			creator.value = newCreator;
			console.log('[SurveyJS] Creator initialized successfully');
		}

		// Watch disabled - causes browser crashes due to SurveyJS Creator memory usage
		// Note: After saving, you must reload the page to see the updated survey
		console.log('[SurveyJS] Watch disabled to prevent browser crashes');
		console.log('[SurveyJS] Please reload the page after saving to see changes');

		onMounted(async () => {
			console.log('[SurveyJS] onMounted called');
			isMounted.value = true;
			await fetchLicenseKey();
			initializeCreator();
			console.log('[SurveyJS] onMounted completed');
		});

		onUnmounted(() => {
			console.log('[SurveyJS] onUnmounted called');
			isMounted.value = false;
			if (creator.value) {
				// Cleanup creator instance
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
.surveyjs-creator-interface {
	/* Use available width without being covered by sidebar */
	position: relative;
	width: calc(100vw - 240px - 320px); /* Account for left sidebar (240px) and right panel (320px) */
	margin-left: -32px; /* Compensate for Directus padding */
	margin-right: -32px;
	max-width: none;
	height: auto;
	max-height: none;
	overflow: visible;
	padding: 0 20px;
	box-sizing: border-box;
}

/* Adjust for collapsed sidebar */
@media (max-width: 960px) {
	.surveyjs-creator-interface {
		width: calc(100vw - 64px - 320px);
	}
}

/* When right panel is not visible */
@media (min-width: 961px) {
	.surveyjs-creator-interface.no-right-panel {
		width: calc(100vw - 240px - 64px);
	}
}

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

.save-notice {
	background: #fff3cd;
	border: 1px solid #ffc107;
	border-radius: 4px;
	padding: 8px 12px;
	margin-bottom: 12px;
	font-size: 13px;
	color: #856404;
	text-align: center;
}

.save-notice strong {
	color: #333;
	font-weight: 600;
}

.loading {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 200px;
	color: #666;
	font-size: 14px;
}

/* Reduce SurveyJS Creator memory usage */
:deep(.svc-creator) {
	contain: layout style paint;
	height: 100% !important; /* Fill the creator-wrapper */
	width: 100%;
}

:deep(.svc-creator__area) {
	will-change: auto;
}
</style>

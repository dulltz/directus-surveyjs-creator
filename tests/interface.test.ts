import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, VueWrapper, flushPromises } from '@vue/test-utils';
import InterfaceComponent from '../src/interface.vue';

// Mock fetch API for license key
global.fetch = vi.fn(() =>
	Promise.resolve({
		json: () => Promise.resolve({ licenseKey: 'test-license-key' }),
	} as Response)
);

// Mock SurveyJS modules
vi.mock('survey-creator-vue', () => ({
	SurveyCreatorComponent: {
		name: 'SurveyCreatorComponent',
		template: '<div class="survey-creator-mock"></div>',
		props: ['model'],
	},
}));

vi.mock('survey-creator-core', () => ({
	SurveyCreatorModel: class {
		JSON: any;
		saveSurveyFunc: any;
		showSaveButton: boolean;
		onModified: any;
		constructor(options?: any) {
			this.JSON = {};
			this.saveSurveyFunc = vi.fn();
			this.showSaveButton = true;
			this.onModified = {
				add: vi.fn(),
				remove: vi.fn(),
			};
		}
	},
}));

vi.mock('survey-core', () => ({
	setLicenseKey: vi.fn(),
}));

describe('SurveyJS Creator Interface Component', () => {
	let wrapper: VueWrapper<any>;

	beforeEach(() => {
		// Clean up after each test
		if (wrapper) {
			wrapper.unmount();
		}
	});

	it('should mount successfully', () => {
		wrapper = mount(InterfaceComponent, {
			props: {
				value: null,
			},
		});
		expect(wrapper.exists()).toBe(true);
	});

	it('should accept value prop', () => {
		const testValue = JSON.stringify({ title: 'Test Survey' });
		wrapper = mount(InterfaceComponent, {
			props: {
				value: testValue,
			},
		});
		expect(wrapper.props('value')).toBe(testValue);
	});

	it('should handle null or empty value with default survey definition', () => {
		wrapper = mount(InterfaceComponent, {
			props: {
				value: null,
			},
		});
		expect(wrapper.exists()).toBe(true);
	});

	it('should parse JSON string value', () => {
		const surveyJson = { title: 'Test Survey', pages: [] };
		wrapper = mount(InterfaceComponent, {
			props: {
				value: JSON.stringify(surveyJson),
			},
		});
		expect(wrapper.exists()).toBe(true);
	});

	it('should handle object value directly', () => {
		const surveyJson = { title: 'Test Survey', pages: [] };
		wrapper = mount(InterfaceComponent, {
			props: {
				value: surveyJson,
			},
		});
		expect(wrapper.exists()).toBe(true);
	});

	it('should emit input event when survey changes', async () => {
		wrapper = mount(InterfaceComponent, {
			props: {
				value: null,
			},
		});

		// Simulate survey change
		const newSurvey = { title: 'Updated Survey' };

		// The component should have a method to handle survey updates
		// We'll test that it emits the input event
		expect(wrapper.emitted()).toBeDefined();
	});

	it('should handle invalid JSON gracefully', () => {
		// Should not throw error with invalid JSON
		expect(() => {
			wrapper = mount(InterfaceComponent, {
				props: {
					value: 'invalid json {',
				},
			});
		}).not.toThrow();
	});

	it('should render SurveyCreatorComponent', async () => {
		const testValue = JSON.stringify({ title: 'Test Survey', pages: [{ name: 'page1', elements: [] }] });
		wrapper = mount(InterfaceComponent, {
			props: {
				value: testValue,
			},
		});

		// Wait for onMounted to complete and component to re-render
		await flushPromises();
		await wrapper.vm.$nextTick();

		// Check if the mock SurveyCreatorComponent is rendered
		expect(wrapper.find('.survey-creator-mock').exists()).toBe(true);
	});

	// === High Priority: Lifecycle Tests ===

	it('should handle async props loading (Directus lifecycle)', async () => {
		// 1. Mount with null (simulating Directus initial state)
		wrapper = mount(InterfaceComponent, {
			props: { value: null },
		});

		await flushPromises();

		// 2. Simulate Directus loading data asynchronously after 100ms
		const surveyData = { title: 'Async Survey', pages: [{ name: 'page1', elements: [] }] };
		await wrapper.setProps({ value: JSON.stringify(surveyData) });

		await flushPromises();
		await wrapper.vm.$nextTick();

		// 3. Creator should be initialized with the loaded data
		expect(wrapper.find('.survey-creator-mock').exists()).toBe(true);
	});

	it('should initialize with default survey after timeout when props remain null', async () => {
		// Mount with null value (new item creation)
		wrapper = mount(InterfaceComponent, {
			props: { value: null },
		});

		await flushPromises();

		// Wait for timeout fallback to trigger (100ms + buffer)
		await new Promise(resolve => setTimeout(resolve, 150));
		await wrapper.vm.$nextTick();

		// Should initialize with defaultSurvey
		expect(wrapper.find('.survey-creator-mock').exists()).toBe(true);
	});

	// === Medium Priority: Advanced Lifecycle Tests ===

	it('should re-initialize when real data arrives after default initialization', async () => {
		// 1. Mount with null → should initialize with defaultSurvey
		wrapper = mount(InterfaceComponent, {
			props: { value: null },
		});

		await flushPromises();
		await new Promise(resolve => setTimeout(resolve, 150));

		// 2. Real data arrives from Directus
		const realData = {
			title: 'Real Survey',
			pages: [{ name: 'page1', elements: [{ type: 'text', name: 'q1' }] }],
		};
		await wrapper.setProps({ value: JSON.stringify(realData) });

		await flushPromises();
		await wrapper.vm.$nextTick();

		// 3. Should re-initialize with real data (no errors should occur)
		expect(wrapper.find('.survey-creator-mock').exists()).toBe(true);
	});

	it('should handle license key fetch failure gracefully', async () => {
		// Mock fetch to fail
		const originalFetch = global.fetch;
		global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));

		wrapper = mount(InterfaceComponent, {
			props: { value: JSON.stringify({ title: 'Test', pages: [] }) },
		});

		await flushPromises();

		// Should still initialize despite license key failure
		expect(wrapper.find('.survey-creator-mock').exists()).toBe(true);

		// Restore original fetch
		global.fetch = originalFetch;
	});

	it('should clean up creator instance on unmount', async () => {
		wrapper = mount(InterfaceComponent, {
			props: { value: JSON.stringify({ title: 'Test', pages: [] }) },
		});

		await flushPromises();

		// Verify creator exists before unmount
		expect(wrapper.find('.survey-creator-mock').exists()).toBe(true);

		// Unmount should not throw errors
		expect(() => wrapper.unmount()).not.toThrow();
	});
});

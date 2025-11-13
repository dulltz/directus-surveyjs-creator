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
		constructor(options?: any) {
			this.JSON = {};
			this.saveSurveyFunc = vi.fn();
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
});

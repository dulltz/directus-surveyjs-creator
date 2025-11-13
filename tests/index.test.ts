import { describe, it, expect } from 'vitest';
import interfaceDefinition from '../src/index';

describe('SurveyJS Creator Interface Definition', () => {
	it('should have correct id', () => {
		expect(interfaceDefinition.id).toBe('surveyjs-creator');
	});

	it('should have correct name', () => {
		expect(interfaceDefinition.name).toBe('SurveyJS Creator');
	});

	it('should have an appropriate icon', () => {
		expect(interfaceDefinition.icon).toBeTruthy();
		expect(typeof interfaceDefinition.icon).toBe('string');
	});

	it('should have a description', () => {
		expect(interfaceDefinition.description).toBeTruthy();
		expect(typeof interfaceDefinition.description).toBe('string');
	});

	it('should support json and code field types', () => {
		expect(interfaceDefinition.types).toContain('json');
		expect(interfaceDefinition.types).toContain('code');
	});

	it('should have a component', () => {
		expect(interfaceDefinition.component).toBeDefined();
	});
});

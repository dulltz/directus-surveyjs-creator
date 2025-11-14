import { defineInterface } from '@directus/extensions-sdk';
import InterfaceComponent from './interface.vue';

export default defineInterface({
	id: 'surveyjs-creator',
	name: 'SurveyJS Creator',
	icon: 'poll',
	description: 'Create and edit surveys using SurveyJS Creator',
	component: InterfaceComponent,
	options: null,
	types: ['json', 'text'],
});

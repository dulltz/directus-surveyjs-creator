import { defineEndpoint } from '@directus/extensions-sdk';

export default defineEndpoint({
	id: 'surveyjs-license',
	handler: (router) => {
		router.get('/', (_req, res) => {
			const licenseKey = process.env.SURVEY_JS_LICENSE_KEY || '';
			res.json({ licenseKey });
		});
	},
});

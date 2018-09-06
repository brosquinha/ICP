import ArticleSelection from './ArticleSelection';
import ICPConfig from './icp_config';

export default class ICP {
	constructor() {
		ICP.endpoint = ICPConfig.endpoint;
		ICP.articleText = '';
		ICP.userActions = {};
		ICP.i18n = new I18n(window.wgUserLanguage);
		this.run(ICPConfig.steps[0], 0);
	}

	run(stepClass, stepIndex) {
		if (stepIndex >= ICPConfig.steps.length)
			this.finish_up();
		let step = new stepClass();
		step.build();
		step.stepDoneEvent.on('stepCompleted', () => {
			run((ICPConfig.steps[stepIndex + 1] || false), stepIndex + 1);
		})
	}
}
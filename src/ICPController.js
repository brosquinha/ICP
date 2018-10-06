import stepsOrder from 'steps_order';
import Article from './Article';
import Event from 'events';

export default class ICPController {
    constructor() {
		let article = new Article();
		this.currentStep = 0;
		let eventEmitter = new Event.EventEmitter();
		eventEmitter.on('stepCompleted', () => {
			run(++this.currentStep);
		})
	}
	
	run(stepIndex) {
		if (stepIndex >= stepsOrder.length)
			this.finish_up();
		let step = stepsOrder[stepIndex];
		step.build();
	}
}
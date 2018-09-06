import ICPStep from '../ICPStep';

var assert = require('assert');

describe('ICPStep', () => {
    it('should catch step completed', () => {
        let step = new ICPStep();
        step.stepDoneEvent.on('stepCompleted', () => {
            console.log('OK');
        });
        step.stepCompleted();
    });
});
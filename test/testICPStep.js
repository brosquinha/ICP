import ICPStep from '../src/ICPStep';
import assert from 'assert';

describe('ICPStep', () => {
    it('should catch step completed', () => {
        let step = new ICPStep();
        let eventCalled = false;
        step.stepDoneEvent.on('stepCompleted', () => {
            eventCalled = true;
        });
        step.stepCompleted();
        assert.ok(eventCalled);
    });
});
import ICP from './ICP';
import Event from 'events';

export default class ICPStep {
	constructor() {
		this.deltaTime = new Date().getTime();
		this.stepDoneEvent = new Event.EventEmitter();
	}
	build() {}

	stepCompleted() {
		this.stepDoneEvent.emit('stepCompleted');
	}

	errorHandler(func) {
		try {
			func();
		}
		catch(e) {
			console.log(e.toString());
			let erroTxt = e.name + ": " + e.message
			erroTxt += (typeof e.stack === "undefined") ? '' : ' - ' + e.stack;
			ICP.userActions.errors.push(erroTxt);
			ICP.userActions.userAgent = window.navigator.userAgent;
			alert(ICP.i18n.getMessage("error-handler-msg"));
			finalizarEdicao();
		}
	}

	get_step_deltatime() {
		return (new Date().getTime()) - this.deltaTime;
	}

	set_userActions_property(obj) {
		for (let item in obj) {
			ICP.userActions[item] = obj[item];
		}
	}

	/**
	 * Encodes URL
	 * 
	 * @param {String} url String to encode
	 * @returns {String}
	 */
	encodeURL(url) {
		return encodeURI(url.replace(/ /g, "_"));
	}

}

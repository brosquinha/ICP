import Article from './Article';
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

	ajaxCall(url, options) {
		//TODO
		return;
	}

	errorHandler(func) {
		try {
			func();
		}
		catch(e) {
			console.log(e.toString());
			let erroTxt = e.name + ": " + e.message
			erroTxt += (typeof e.stack === "undefined") ? '' : ' - ' + e.stack;
			Article.userActions.errors.push(erroTxt);
			Article.userActions.userAgent = window.navigator.userAgent;
			alert(Article.i18n.getMessage("error-handler-msg"));
			this.stepDoneEvent.emit('errorOccurred');
		}
	}

	getStepDeltatime() {
		return (new Date().getTime()) - this.deltaTime;
	}

	setUserActionsProperty(obj) {
		for (let item in obj) {
			Article.userActions[item] = obj[item];
		}
	}

	appendToArticleText(txt) {
		Article.articleText += txt;
	}

	isAnonAndRedlinks() {
		//TODO
		return false;
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

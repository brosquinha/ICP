class ICP {
	constructor() {
		ICP.endpoint = "http://pt.starwars.wikia.com";
		ICP.articleText = '';
		ICP.userActions = {};
		ICP.i18n = new I18n(window.wgUserLanguage);
	}
}
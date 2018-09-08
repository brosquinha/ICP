import ICPConfig from './icp_config.json';
import I18n from './i18n';

export default class Article {
	constructor() {
		Article.endpoint = ICPConfig.endpoint;
		Article.articleText = '';
		Article.userActions = {};
		Article.i18n = new I18n(window.wgUserLanguage);
	}
}
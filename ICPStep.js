import I18n from "./I18n";
class ICPStep {
	constructor() {
		ICPStep.articleText = '';
		ICPStep.i18n = new I18n(window.wgUserLanguage);
	}
	build() {
		
	}
	wrap_up() {
		
	}
}

class ArticleSelection extends ICPStep {
	constructor() {
		super();
		if (this.is_anon_and_redlink())
			this.build_message(ICPStep.i18n.getMessage("anon-redlink-welcome"));
		else
			this.build();
	}

	build() {
		DOMHandler.build_article_selection_table({
			columns: 2,
			items: [
				{
					text: ICPStep.i18n.getMessage("character"),
					class: "personagem"
				},
				{
					text: ICPStep.i18n.getMessage("planet"),
					class: "planeta"
				},
				{
					text: ICPStep.i18n.getMessage("droid"),
					class: "droide"
				},
				{
					text: ICPStep.i18n.getMessage("starship"),
					class: "nave"
				},
				{
					text: ICPStep.i18n.getMessage("event"),
					class: "evento"
				},
				{
					text: ICPStep.i18n.getMessage("technology"),
					class: "tecnologia"
				}
			]
		})
	}
}
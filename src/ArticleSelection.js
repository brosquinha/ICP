import Article from './Article';
import DOMHandler from "./DOMHandler";
import ICPStep from './ICPStep';

export default class ArticleSelection extends ICPStep {
	constructor() {
		super();
		if (this.isAnonAndRedlink())
			this.build_message(Article.i18n.getMessage("anon-redlink-welcome"));
		else
			this.build();
	}

	build() {
		DOMHandler.buildArticleSelectionTable({
			columns: 2,
			items: [
				{
					text: Article.i18n.getMessage("character"),
					infoboxName: "Personagem infobox",
					class: "personagem"
				},
				{
					text: Article.i18n.getMessage("planet"),
					infoboxName: "Planeta",
					class: "planeta"
				},
				{
					text: Article.i18n.getMessage("droid"),
					infoboxName: "Droide infobox",
					class: "droide"
				},
				{
					text: Article.i18n.getMessage("starship"),
					infoboxName: "Nave",
					class: "nave"
				},
				{
					text: Article.i18n.getMessage("event"),
					infoboxName: "Evento",
					class: "evento"
				},
				{
					text: Article.i18n.getMessage("technology"),
					infoboxName: "Dispositivo infobox",
					class: "tecnologia"
				}
			]
		}, this.wrap_up);
	}

	wrap_up(articleType) {
		this.setUserActionsProperty({
			passo0DT: this.getStepDeltatime(),
			ICPconfig: (localStorage.ICPsettings || false),
			infoboxType: articleType
		});
		ICPStep.outOfUniverse = false;
	}

	/**
	 * Star Wars Wiki specific logic
	 * 
	 * @param {String} articleType Article type
	 */
	get_infobox_type(articleType) {
		this.ajaxCall(Article.endpoint + "/api.php?action=query&prop=categories&titles=Template:" + this.encodeURL(articleType) + "&format=xml",
		(data) => {
			let categoryName = $($(data).find("cl")[0]).attr('title');
			console.log(categoryName);
			if (typeof(categoryName) != "undefined")
				if (categoryName == "Categoria:Infoboxes de mídia")
					foraDeUniverso = 1; //1 means out-of-universe article that needs Step1
				if (categoryName == "Categoria:Infoboxes fora do universo")
					foraDeUniverso = 2; //2 means out-of-universe article that does not need Step1
			this.stepCompleted();
		});
	}
}

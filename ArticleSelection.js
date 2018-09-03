import ICP from './ICP';
import ICPStep from './ICPStep';
import DOMHandler from "./DOMHandler";

class ArticleSelection extends ICPStep {
	constructor() {
		super();
		if (this.is_anon_and_redlink())
			this.build_message(ICP.i18n.getMessage("anon-redlink-welcome"));
		else
			this.build();
	}

	build() {
		DOMHandler.build_article_selection_table({
			columns: 2,
			items: [
				{
					text: ICP.i18n.getMessage("character"),
					class: "personagem"
				},
				{
					text: ICP.i18n.getMessage("planet"),
					class: "planeta"
				},
				{
					text: ICP.i18n.getMessage("droid"),
					class: "droide"
				},
				{
					text: ICP.i18n.getMessage("starship"),
					class: "nave"
				},
				{
					text: ICP.i18n.getMessage("event"),
					class: "evento"
				},
				{
					text: ICP.i18n.getMessage("technology"),
					class: "tecnologia"
				}
			]
		}, this.wrap_up)
	}

	wrap_up(articleType) {
		this.set_userActions_property({
			passo0DT: this.get_step_deltatime(),
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
		$.get(ICP.endpoint + "/api.php?action=query&prop=categories&titles=Template:" + this.encodeURL(articleType) + "&format=xml",
		(data) => { this.errorHandler(() => {
			let categoryName = $($(data).find("cl")[0]).attr('title');
			console.log(categoryName);
			if (typeof(categoryName) != "undefined")
				if (categoryName == "Categoria:Infoboxes de mídia")
					foraDeUniverso = 1; //1 means out-of-universe article that needs Step1
				if (categoryName == "Categoria:Infoboxes fora do universo")
					foraDeUniverso = 2; //2 means out-of-universe article that does not need Step1
			inserirEras(infoboxName, infoboxUrl);
		})});
	}
}
/**
 * Class for generating and manipulating Wikitext
 */
export default class WikitextHandler {
    /**
     * Builds a wikitext template call
     * 
     * @param {String} name Template name
     * @param {Array<String>} unnamed_params List of unnamed template parameters
     * @param {Object} named_params Key-value object of named template parameters
     */
    static generate_template(name, unnamed_params=[], named_params={}) {
        let tempalte_unnamed_params = "";
        let template_named_params = "";
        for (let i=0; i<unnamed_params.length; i++) {
            tempalte_unnamed_params += "|" + unnamed_params[i];
        }
        for (let key in named_params) {
            template_named_params += `\n|${key}=${named_params[key]}`;
        }
        return `{{${name}${tempalte_unnamed_params}${template_named_params}}}`;
    }
}
export default class DOMHandler {
    static build_article_selection_table(tableObj, callback) {
        let validate_tableObj = function(tableObj) {
            if (!("columns" in tableObj))
                throw new Error('Missing "columns" property in argument.');
            if (isNaN(tableObj.columns))
                throw new Error('tableObj.columns must be integer.');
            if (!("items" in tableObj))
                throw new Error('Missing "items" property in argument.');
            if (!Array.isArray(tableObj.items))
                throw new Error('tableObj.items must be an array.');
        };
        return validate_tableObj(tableObj);
    }
}
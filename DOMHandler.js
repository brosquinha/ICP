export default class DOMHandler {
    static build_article_selection_table(tableObj) {
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
        return;
        let localTable = window.document.createElement("table");
        localTable.setAttribute("id", "NewPageArticleType");
        localTable.style.width = "100%";
        localTable.style.borderSpacing = "3px";
        localTable.style.textAlign = "center";
        validate_tableObj(tableObj);
        let columnWidth = 100 / tableObj.columns;
        for (var i=0; i<(tableObj.items.length / tableObj.columns); i++) {
            "";//TODO: não prosseguir até ter teste para esse método
        }
    }
}
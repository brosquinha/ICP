import Article from './Article';

export default class DOMHandler {   
    static buildArticleSelectionTable(tableObj, callback) {
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
        validate_tableObj(tableObj);
        let tableIntroP = document.createElement("p");
        tableIntroP.innerText = Article.i18n.getMessage("article-selection-intro");
        tableIntroP.style.marginTop = "0";
        let tableElem = document.createElement("table");
        let columnWidth = 100 / tableObj.columns;
        for (let i=0; i<(tableObj.items.length / tableObj.columns); i++) {
            let tableRow = document.createElement("tr");
            for (let j=0; j<tableObj.columns; j++) {
                let tableItem = tableObj.items[i*tableObj.columns+j];
                if (typeof tableItem === "undefined")
                    break;
                let tableCell = document.createElement("td");
                tableCell.style.width = columnWidth + "%";
                tableCell.setAttribute("data-infobox-name", tableItem.infoboxName);
                tableCell.innerHTML = `<div class="infoboxIcon ${tableItem.class}"></div>`;
                tableRow.appendChild(tableCell);
            }
            tableElem.appendChild(tableRow);
        }
        let othersRow = document.createElement("tr");
        let othersCell = document.createElement("td");
        othersCell.colSpan = tableObj.columns;
        return DOMHandler.insertElementIntoModal(tableElem);
    }

    static insertElementIntoModal(elem) {
        //TODO
        return elem;
    }
}
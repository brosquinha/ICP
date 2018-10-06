import Article from './Article';

const ICPModalId = "ICPModal";

/**
 * Auxiliar class for DOM manipulation
 * 
 * For now, this is a static class, i.e., all its methods are static
 */
export default class DOMHandler {   
    
    /**
     * Sets up ICP modal
     */
    static setUpICPModal() {
        if (document.getElementById(ICPModalId) !== null)
            document.getElementById(ICPModalId).remove();
        let modalBlackout = document.createElement("div");
        modalBlackout.classList.add("modal-blackout", "visible");

        let modalContainer = document.createElement("div");
        modalContainer.id = ICPModalId;
        modalContainer.classList.add("modal", "medium", "no-scroll", "curated-content-tool-modal");
        modalBlackout.appendChild(modalContainer);

        let modalHeader = document.createElement("header");
        let modalHeaderClose = document.createElement("span");
        modalHeaderClose.classList.add('close');
        modalHeaderClose.innerText = 'Close';
        modalHeader.appendChild(modalHeaderClose);
        let modalHeaderTitle = document.createElement("h3");
        modalHeaderTitle.innerText = Article.i18n.getMessage("initial-modal-title");
        modalHeader.appendChild(modalHeaderTitle);
        modalContainer.appendChild(modalHeader);

        let modalSection = document.createElement("section");
        modalContainer.appendChild(modalSection);

        let modalFooter = document.createElement("footer");
        let modalFooterButton = document.createElement("button");
        modalFooterButton.id = "ICPsettings";
        modalFooterButton.classList.add("secondary");
        modalFooterButton.innerText = Article.i18n.getMessage('settings-button');
        modalFooter.appendChild(modalFooterButton);
        modalContainer.appendChild(modalFooter);

        document.body.appendChild(modalBlackout);
        DOMHandler.setICPModalCSS();
    }

    static setICPModalCSS() {
        //TODO
        return;
    }
    
    /**
     * Builds ICP default article selection table
     * 
     * In order to set your wiki's article types, this method expects a settings object
     * in the documented format. 
     * 
     * @param {Object} tableObj Table settings
     * @param {Number} tableObj.columns Number of columns for generated table
     * @param {Object[]} tableObj.items List of types of articles
     * @param {String} tableObj.items[].text Article type description
     * @param {String} tableObj.items[].infoboxName Infobox name associated with this type
     * @param {String} tableObj.items[].class CSS class name
     * @param {Function} callback Function to be called when user selects an article type
     */
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
                tableCell.innerHTML = `<div class="infoboxIcon ${tableItem.class}">${tableItem.text}</div>`;
                tableRow.appendChild(tableCell);
            }
            tableElem.appendChild(tableRow);
        }
        let othersRow = document.createElement("tr");
        let othersCell = document.createElement("td");
        othersCell.colSpan = tableObj.columns;
        othersCell.setAttribute("data-infobox-name", "others");
        othersCell.innerText = Article.i18n.getMessage("article-selection-others");
        othersRow.appendChild(othersCell);
        tableElem.appendChild(othersRow);
        return DOMHandler.setModalContent(tableElem);
    }

    static setModalContent(elem) {
        let modalSection = document.querySelector(`#${ICPModalId} section`);
        modalSection.innerHTML = '';
        modalSection.appendChild(elem);
        return modalSection;
    }

    static setModalStepName(txt) {
        let modalHeaderTitle = document.querySelector(`#${ICPModalId} header h3`);
        modalHeaderTitle.innerText = txt;
        return modalHeaderTitle;
    }
}
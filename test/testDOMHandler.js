import 'jsdom-global/register'
import DOMHandler from "../src/DOMHandler";
import { expect } from 'chai';
import Article from '../src/Article';

describe('DOMHandler', function() {
    it('should create article selection table', function() {
        let article = new Article();
        let actualTable = DOMHandler.buildArticleSelectionTable({
            columns: 2,
            items: [
                {
                    text: "blha",
                    infoboxName: "Blah",
                    class: "classe"
                },
                {
                    text: "yep",
                    infoboxName: "Hello there",
                    class: "hola"
                },
                {
                    text: "more",
                    infoboxName: "More",
                    class: "more"
                }
            ]
        });
        expect(actualTable).to.be.a('HTMLTableElement');
        expect(actualTable).to.have.property('children');
        expect(actualTable.children).to.have.lengthOf(2);
        expect(actualTable.children[0]).to.have.property('children');
        expect(actualTable.children[0].children).to.have.lengthOf(2);
        expect(actualTable.children[1]).to.have.property('children');
        expect(actualTable.children[1].children).to.have.lengthOf(1);
    });
})
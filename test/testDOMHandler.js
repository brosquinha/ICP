import 'jsdom-global/register'
import DOMHandler from "../src/DOMHandler";
import { expect } from 'chai';
import sinon from 'sinon';
import Article from '../src/Article';

describe('DOMHandler', function() {
    before(function() {
        this.article = new Article();
    });

    it('should create icp modal', function() {
        this.mock = sinon.mock(DOMHandler).expects('setICPModalCSS').once();
        DOMHandler.setUpICPModal();
        let ICPModal = document.getElementById("ICPModal");
        expect(ICPModal).to.be.a('HTMLDivElement');
        expect(ICPModal.children).to.have.lengthOf(3);
        expect(ICPModal.children[0].tagName).to.be.string("HEADER");
        expect(ICPModal.children[1].tagName).to.be.string("SECTION");
        expect(ICPModal.children[2].tagName).to.be.string("FOOTER");
    });
    
    it('should create article selection table', function() {
        this.mock = sinon.mock(DOMHandler).expects('setModalContent').once().returnsArg(0);
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
        expect(actualTable.children).to.have.lengthOf(3);
        expect(actualTable.children[0]).to.have.property('children');
        expect(actualTable.children[0].children).to.have.lengthOf(2);
        expect(actualTable.children[1]).to.have.property('children');
        expect(actualTable.children[1].children).to.have.lengthOf(1);
    });

    it('should insert element into modal section', function() {
        DOMHandler.setUpICPModal();
        let testElem = document.createElement("div");
        let testElemId = "testElement";
        testElem.id = testElemId
        DOMHandler.setModalContent(testElem);
        let modalSection = document.querySelector("#ICPModal section");
        expect(modalSection.children).to.have.lengthOf(1);
        expect(modalSection.children[0].id).to.be.string(testElemId);
    });

    it('should set step name into modal header', function() {
        DOMHandler.setUpICPModal();
        let stepName = 'Test step';
        DOMHandler.setModalStepName(stepName);
        let modalHeader = document.querySelector("#ICPModal header h3");
        expect(modalHeader.innerText).to.be.string(stepName);
    });

    afterEach(function() {
        if (this.mock)
            this.mock.restore();
    });

    /* Err... why not use those beautiful arrow functions?
    Because Mocha does not deal with them very well
    Ref: https://mochajs.org/#arrow-functions
    */
})
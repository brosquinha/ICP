import DOMHandler from "../src/DOMHandler";
import assert from 'assert';

describe('DOMHandler', function() {
    it('should validate tableObj', function() {
        assert.equal(DOMHandler.build_article_selection_table({
            columns: 2,
            items: [{
                text: "blha",
                class: "classe"
            }]
        }), null);
    });
})
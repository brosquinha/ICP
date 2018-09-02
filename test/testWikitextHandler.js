import WikitextHandler from "../WikitextHandler";

var assert = require('assert');

describe('WikitextHandler', () => {
    it('should generate template', () => {
        assert.equal(WikitextHandler.generate_template("test"), "{{test}}");
        assert.equal(WikitextHandler.generate_template(
            "test", ["value1", "value2"]), "{{test|value1|value2}}");
        assert.equal(WikitextHandler.generate_template("test", [], {
            "key1": "value1",
            "key2": "value2"
        }), "{{test\n|key1=value1\n|key2=value2}}");
    });
});
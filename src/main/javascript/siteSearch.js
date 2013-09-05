YUI.add('site-search', function(Y) {

    var DLL = Y.namespace('DLL'),
        jobPoolCount = 4,
        doc = Y.config.doc,
        domain = doc.domain,
        rxValidURL = /^((https?|ftp):\/\/)?(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i,
        rxMatcher = /^([^:\/?#]+:)?(?:\/\/([^\/?#]*))?([^?#]+)?(\?[^#]*)?(#.*)?/,
        rxInvalidPath = /^[^?]/,
        SearchTask
        ;

    DLL.SiteSearch = {

        isExternalUrl: function (url) {

            if (!rxValidURL.test(url)) {
                return false;
            }

            // get url parts
            var match = url.match(rxMatcher),
                host;

            // no match
            if (match === null) {
                return false;
            }

            // host matching part
            host = match[2] || match[3];
            if (typeof host === "undefined") {
                return false;
            }

            return !host.match(domain);
        },

        fetchInternalLinks: function () {
            var self = this;
            return Y.one(doc).all('a').filter(function (node) {
                var url = node.getAttribute('href');
                return rxInvalidPath.test(url) && !self.isExternalUrl(url);
            });
        },

        compileQuery: function (queryText) {
            return new RegExp(queryText, "i");
        },

        searchSite: function (queryText, callback) {
            var links = this.fetchInternalLinks();

            (new SearchTask({queryRx: this.compileQuery(queryText), anchor: links.shift(), callback: callback}))
                .run();
        }

    };

    SearchTask = Y.Base.create("SearchTask", Y.Model, [], {

        run: function () {
            var self = this;

            Y.io(this.get('anchor').getAttribute('href'), {
                on: {
                    success: function (int, xhr) {
                        if (this.get('queryRx').test(xhr.responseText)) {
                            this.get('callback')(this.get('anchor'));
                        }
                    }
                },
                context: self
            });
        }

    }, {
        ATTRS: {
            anchor: {value: null},
            callback: {value: null},
            queryRx: {value: null}
        }
    });

}, '1.0.0', {
    requires: ['node', 'model', 'io-base']
});
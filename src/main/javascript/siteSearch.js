/*global YUI:true*/
YUI.add('site-search', function(Y) {

    var DLL = Y.namespace('DLL'),
        Template = Y.Template.Micro,
        jobPoolCount = 4,
        doc = Y.config.doc,
        domain = doc.domain,
        rxValidURL = /^((https?|ftp):\/\/)?(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i,
        rxMatcher = /^([^:\/?#]+:)?(?:\/\/([^\/?#]*))?([^?#]+)?(\?[^#]*)?(#.*)?/,
        rxInvalidPath = /^[^?]/,
        SearchTask,
        TaskPoolExecutor,
        Templates = {}
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
            var links = this.fetchInternalLinks(),
                pool = new TaskPoolExecutor();

            links.each(function (node) {
                pool.add(new SearchTask({queryRx: this.compileQuery(queryText), anchor: node, callback: callback}));
            }, this);

        }

    };

    SearchTask = Y.Base.create("SearchTask", Y.Model, [], {

        run: function () {
            var self = this;

            Y.io(this.get('anchor').getAttribute('href'), {
                on: {
                    success: function (status, xhr) {
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

    TaskPoolExecutor = Y.Base.create("TaskPoolExecutor", Y.Base, [], {

        availablePool: [],

        jobPoolCapacity: jobPoolCount,

        running: false,

        add: function (task) {
            this.availablePool.push(task);
            this.execute();
            return this;
        },

        execute: function () {
            if (!this.running && this.availablePool.length > 0) {
                this.running = true;
                var executionPool = [];
                while (executionPool.length < this.jobPoolCapacity && this.availablePool.length > 0) {
                    executionPool.push(this.availablePool.pop());
                }

                Y.later(0, this, this._executePool, [executionPool]);
            }
        },

        _executePool: function (executionPool) {
            Y.Array.each(executionPool, function (task) {
                task.run();
            }, this);

            this.running = false;
            this.execute();
        }

    });

    DLL.SiteSearch.Widget = Y.Base.create("SiteSearch.Widget", Y.Widget, [], {
        renderUI: function () {
            var node = this.get('contentBox'),
                widget = Y.Node.create(Templates.widget())
                ;

            widget.one('.site-search.results').setStyles({'display': 'none'});
            widget.appendTo(node);
        },

        bindUI: function () {
            var node = this.get('contentBox'),
                input = node.one('.site-search.query-input'),
                results = node.one('.site-search.results')
                ;

            input.on('key', function () {
                results.empty();
                results.setStyles({
                    'display': 'none'
                });
                DLL.SiteSearch.searchSite(input.get('value'), function (node) {
                    results.setStyles({
                        'display': 'block'
                    });
                    Y.Node.create('<a href="'+node.getAttribute('href')+'">'+node.get('text')+'</a><br>')
                        .appendTo(results);
                });
            }, 'enter');
        },

        registerTemplate: function (name, templateCode) {
            Templates[name] = Template.compile(templateCode);
        }

    });

    Templates.widget = Template.compile(
        '<div class="site-search container">' +
            '<input type="text" class="site-search query-input"/>' +
            '<div class="site-search results"></div>' +
            '</div>'
    );

}, '1.0.0', {
    requires: ['node', 'model', 'io-base', 'widget', 'template-micro', 'event']
});
describe('SiteSearch integration test', function() {
    var domain = document.domain
        ;

    beforeEach(function () {
        expect(Y).toBeTruthy();
        expect(Y.DLL).toBeTruthy();
        expect(Y.DLL.SiteSearch).toBeTruthy();
        SiteSearch = Y.DLL.SiteSearch;
    });

    it('test external urls', function() {

        expect(SiteSearch.isExternalUrl("www.google.com")).toBe(true);

        expect(SiteSearch.isExternalUrl(domain)).toBe(false);

        expect(SiteSearch.isExternalUrl("http://www.google.com/page.html")).toBe(true);

        expect(SiteSearch.isExternalUrl("/page.html")).toBe(false);

    });

    it('test document links', function () {
        var links = SiteSearch.fetchInternalLinks(),
            size = links.size()
            ;

        Y.Node.create('<a href="test/page.html">link0</a><br>').appendTo('body');

        links = SiteSearch.fetchInternalLinks();

        expect(links.size()).toBe(size + 1);
    });

    it('search site for "test"', function () {
        Y.Node.create('<a href="test/page.html">link1</a><br>').appendTo('body');
        Y.Node.create('<a href="test/page1.html">link2</a><br>').appendTo('body');

        var links = SiteSearch.fetchInternalLinks(),
            size = links.size()
            ;

        SiteSearch.searchSite("test", function (node) {
            Y.Node.create('<a href="'+node.getAttribute('href')+'">'+node.get('text')+'</a><br>')
                .appendTo('body');
        });

        waitsFor(function () {
            links = SiteSearch.fetchInternalLinks();
            return links.size() === size * 2;
        }, "Anchors must be added to the page", 1000);
    });

    it("test searching from widget with results", function () {
        Y.Node.create('<div id="xpto"></div>').appendTo('body');

        var widget = new SiteSearch.Widget(),
            results;
        widget.render('#xpto');

        Y.one('#xpto .site-search.query-input').set('value', 'test');
        Y.one('#xpto .site-search.query-input').simulate('keydown', {keyCode:13});

        waitsFor(function () {
            return Y.one('#xpto .site-search.results').all('a').size() > 0;
        }, 1000, "Test must yield results");

    });

    it("test searching from widget with no results", function () {
        Y.Node.create('<div id="xpto1"></div>').appendTo('body');

        var widget = new SiteSearch.Widget(),
            results;
        widget.render('#xpto1');

        Y.one('#xpto1 .site-search.query-input').set('value', 'pot');
        Y.one('#xpto1 .site-search.query-input').simulate('keydown', {keyCode:13});

        waitsFor(function () {
            return Y.one('#xpto1 .site-search.results').all('a').size() === 0;
        }, 1000, "Pot must not yield results");
    });

});

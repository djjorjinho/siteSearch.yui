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

        Y.Node.create('<a href="test/page.html">link1</a>').appendTo('body');

        links = SiteSearch.fetchInternalLinks();

        expect(links.size()).toBe(size + 1);
    });

    it('search site for "test"', function () {
        Y.Node.create('<a href="test/page.html">link1</a>').appendTo('body');
        Y.Node.create('<a href="test/page1.html">link2</a>').appendTo('body');

        var links = SiteSearch.fetchInternalLinks(),
            size = links.size()
            ;

        SiteSearch.searchSite("test", function (node) {
            Y.Node.create('<a href="'+node.getAttribute('href')+'">'+node.get('text')+'</a>')
                .appendTo('body');
        });

        waitsFor(function () {
            links = SiteSearch.fetchInternalLinks();
            return links.size() === size + 1;
        }, 1000);
    });

});
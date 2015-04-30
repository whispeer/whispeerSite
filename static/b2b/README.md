# How to use Jekyll to build the landing pages

1. Create a new *.json file in _data (or copy securityEn.json and edit).
2. Create a new *.html file in a language directory (e.g.: en/security.html)
	1. Set FrontMatter Variable: layout: b2b
	2. Set FrontMatter Variable: dataSet with the name of the json file (e.g. dataSet: securityEn)
3. Run jekyll build

The Page will be compiled to _site/
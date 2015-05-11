# How to use Jekyll to build the landing pages

1. Create a new *.json file in _data (or copy b2bSecurityEn.json and edit).
2. Create a new *.html file in a language and b2b / b2c directory (e.g.: b2b/en/security.html)
	1. Set FrontMatter Variable: layout: b2b or layout: b2c
	2. Set FrontMatter Variable: dataSet with the name of the json file (e.g. dataSet: b2bsecurityEn)
3. Run jekyll build

The Page will be compiled to _site/
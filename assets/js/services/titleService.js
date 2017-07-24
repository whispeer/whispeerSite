
var localize = require("i18n/localizationConfig");

var titles = [], currentTitleIndex = 0;

/* warning: side effects */
const getTitle = () => {
	if (titles.length === 0) {
		return localize.getLocalizedString("window.title.basic");
	}

	if (currentTitleIndex >= titles.length) {
		currentTitleIndex = 0

		return localize.getLocalizedString("window.title.basic");
	}

	currentTitleIndex += 1

	return titles[currentTitleIndex - 1].title
}

function cycleTitle() {
	document.title = getTitle()
}

window.setInterval(cycleTitle, 3000);

var api = {
	addTitle: (title, reference) => {
		if (titles.some((d) => d.title === title && d.reference === reference)) {
			return
		}

		titles.push({ title, reference })

		cycleTitle()
	},
	removeTitle: (ref) => {
		titles = titles.filter(({ reference }) => reference !== ref)

		cycleTitle()
	},
	resetTitles: () => {
		titles = []

		cycleTitle()
	}
}

module.exports = api;

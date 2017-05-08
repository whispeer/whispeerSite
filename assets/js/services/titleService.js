
var localize = require("i18n/localizationConfig");

var advancedTitle = {}, count = 0, topicInternalCount = 0;

function cycleTitle() {
	var titles = Object.keys(advancedTitle);

	if (count >= titles.length) {
		count = 0;
		document.title = localize.getLocalizedString("window.title.basic");
	} else {
		var data = advancedTitle[titles[count]];
		document.title = localize.getLocalizedString("window.title." + titles[count]).replace("{data}", data[topicInternalCount]);

		topicInternalCount += 1;

		if (topicInternalCount >= data.length) {
			count += 1;
			topicInternalCount = 0;
		}
	}
}

window.setInterval(cycleTitle, 3000);

var api = {
	setAdvancedTitle: function (topic, data) {
		advancedTitle[topic] = advancedTitle[topic] || [];

		if (advancedTitle[topic].indexOf(data) === -1) {
			advancedTitle[topic].push(data);
			cycleTitle();
		}
	},
	removeAdvancedTitle: function (topic) {
		delete advancedTitle[topic];
		cycleTitle();
	}
};

module.exports = api;

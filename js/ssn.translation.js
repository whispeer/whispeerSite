"use strict";
if (typeof (ssn) === "undefined") {
	var ssn = {};
}

ssn.translation = {
	translations : {
		unknownName: "Unbekannter Name",
		moveMouse: "Bitte bewege deine Maus zuf&auml;llig umher.",
		waslogedout: "Du wurdest ausgeloggt",
		noSessionSaving: "Deine Sitzung kann nicht gespeichert werden!",
		ajaxError: "Da ist wohl etwas schiefgelaufen...",

		isFriend: "Freund",
		friendShipUser: "Freundschaftsanfrage senden",
		friendShipRequested: "Freundschaftsanfrage gesendet",
		friendShipRequestedFailed: "Freundschaftsanfrage fehlgeschlagen!",
		acceptFriendShipRequest: "Freundschaftsanfrage annehmen",
		noFriendShipRequests: "Du hast im Moment keine neuen Freundschaftsanfragen",
		sendNewMessage:	"Neue Nachricht versenden",

		thisIsYou: "Das bist du",
		sendMessageTo: "Nachricht an &1;",
		sendMessage: "Nachricht versenden"
	},

	getValue: function (val) {
		if (typeof this.translations[val] === "undefined") {
			ssn.logger.log("unset translation:" + val);
			return "";
		}

		var result = ssn.helper.decodeEntities(ssn.translation.translations[val]);

		var i = 1;
		for (i = 1; i < arguments.length; i += 1) {
			result = result.replace(new RegExp("&" + i + ";", "g"), arguments[i]);
		}

		var suche = /&\d;/g;
		if (suche.test(result)) {
			ssn.logger.log("Problematic Translation: " + val + " - " + result);
		}

		result = result.replace(suche, "");

		return result;
	}
};
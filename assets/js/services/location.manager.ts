import * as StorageService from "./storage.service";
import Storage from "./Storage";
import "jquery";
const h = require("../helper/helper.js");


const loginStorage: Storage = StorageService.withPrefix("whispeer.login");

const blockedReturnUrls: string[] = ["/b2c", "/recovery"];

const removeOther = (ele: JQuery) => {
	ele.siblings().remove();

	if (!ele.parent().is("body")) {
		removeOther(ele.parent());
	} else {
		ele.hide();
	}
};

const setTopLocation = (url: string) => {
	var locale = h.getLanguageFromPath() || "";
	if (StorageService.storageInfo.broken && url !== "/") {
		//if you read this code, welcome to my personal hell!

		/*
			So let me explain why this is necessary.
			Whispeer needs to store data locally, usually we use localStorage or indexedDB for that.
			This is an ugly quirks to move all content into an iframe and take the outer iframe as the
			storage area. This way the inner iframe could redirect as it wishes to without loosing the state.
			But why not use localStorage? We do, this is a fallback.
			Localstorage is not available in Safari Private Mode for example. Or if your disk is full.
		*/

		console.log("promoting as main window");
		StorageService.promoteMainWindow();

		if (window.frameElement) {
			removeOther(jQuery(window.frameElement));
		} else {
			jQuery(document.body).empty();
		}

		var body = jQuery(window.top.document.body);
		var iframe = jQuery("<iframe class='contentFallBack'></iframe>");

		body.append(iframe);
		iframe.attr("src", url);
	} else {
		(<any>window).top.location = "/" + locale + url;
	}
}

export const mainPage = () => {
	setTopLocation("/main");
}

export const landingPage = () => {
	setTopLocation("/");
}

export const isLoginPage = () => {
	return (<any>window).top.location.pathname.indexOf("/login") !== -1;
}

export const loginPage = () => {
	setTopLocation("/login");
}

export const isBlockedReturnUrl = (url: string) => {
	return blockedReturnUrls.filter((blockedUrl: string) => {
		return url.indexOf(blockedUrl) !== -1;
	}).length > 0;
};

export const setReturnUrl = (url: string) => {
	if (isBlockedReturnUrl(url)) {
		return;
	}

	loginStorage.set("returnUrl", url);
};

export const getUrlParameter = (param: any) => {
	var search = window.top.location.search;
	var pairs = search.substr(1).split("&");

	var result = h.array.find(pairs.map((pair: any) => {
		if (pair.indexOf("=") !== -1) {
			return {
				key: pair.substr(0, pair.indexOf("=")),
				value: pair.substr(pair.indexOf("=") + 1)
			};
		} else {
			return {
				key: pair,
				value: ""
			};
		}
	}), (pair: any) => {
		return pair.key === param;
	});

	if (result) {
		return result.value;
	}
}

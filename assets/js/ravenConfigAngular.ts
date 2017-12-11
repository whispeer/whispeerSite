import * as Raven from "raven-js"

const windowG: any = window

windowG.jQuery = require("jquery");
const angular = require("angular")
const angularPlugin = require("raven-js/plugins/angular")

Raven.config(SENTRY_KEY, {
	release: CLIENT_INFO.version,
	autoBreadcrumbs: false,
	environment: `${WHISPEER_ENV}`
})
	.addPlugin(angularPlugin, angular)
	.install();

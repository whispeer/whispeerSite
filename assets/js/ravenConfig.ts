import * as Raven from "raven-js"

Raven.config(SENTRY_KEY, {
	release: CLIENT_INFO.version,
	autoBreadcrumbs: false,
	environment: `${WHISPEER_ENV}`
}).install();

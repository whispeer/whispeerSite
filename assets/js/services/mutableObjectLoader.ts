import * as Bluebird from "bluebird"

import socketService from "../services/socket.service"
import Cache from "../services/Cache"
import errorService from "../services/error.service"

// What do we want to achieve and how:

// - Group multiple requests together -> download can do that for itself
// - Add cache info so server does not resend full data (esp. for trustManager) -> activeInstance
// - merge new and active -> restore has active and response
// - cache first then update

export enum UpdateEvent {
	wake,
	blink
}

const LONG_APP_PAUSE = 2 * 60 * 1000
const LONG_DISCONNECT = 60 * 1000

type hookType<ObjectType, CachedObjectType> = {
	download: (id: string, activeInstance: Optional<ObjectType>) => Bluebird<any>,
	load: (response: any, activeInstance: Optional<ObjectType>) => Bluebird<CachedObjectType>,
	restore: (response: CachedObjectType, activeInstance: Optional<ObjectType>) => Bluebird<ObjectType> | ObjectType,
	shouldUpdate: (event: UpdateEvent, activeInstance: ObjectType, lastUpdated: number) => Bluebird<boolean>,
	getID: (response: any) => string,
	cacheName: string,
}

type Optional<t> = t | null

function createLoader<ObjectType, CachedObjectType>({ download, load, restore, getID, cacheName, shouldUpdate }: hookType<ObjectType, CachedObjectType>) {
	let loading: { [s: string]: Bluebird<ObjectType> } = {}
	let byId: { [s: string]: {
		instance: ObjectType,
		lastUpdated: number,
		updating: boolean
	} } = {}

	const cache = new Cache(cacheName)

	const considerLoaded = (id) => {
		loading = { ...loading }
		delete loading[id]
	}

	const cacheInMemory = (id, instance: ObjectType, lastUpdated) => {
		byId = { ...byId, [id]: { instance, lastUpdated, updating: false } }
	}

	const loadFromCache = (id) => {
		let lastUpdated: number = Date.now()

		return cache.get(id)
			.then((cacheResponse) => {
				lastUpdated = cacheResponse.created
				return cacheResponse.data
			})
			.then((cachedData) => restore(cachedData, null))
			.then((instance) => {
				cacheInMemory(id, instance, lastUpdated)
				considerLoaded(id)
				scheduleInstanceUpdate(UpdateEvent.wake, id)
				return instance
			})
	}

	const serverResponseToInstance = (response, id, activeInstance: Optional<ObjectType>) =>
		load(response, activeInstance)
			.then((cacheableData) => cache.store(id, cacheableData).thenReturn(cacheableData))
			.then((cachedData) => restore(cachedData, activeInstance))
			.then((instance) => {
				if (activeInstance && activeInstance !== instance) {
					console.warn("Restore should update active instance")
				}
				cacheInMemory(id, instance, Date.now())

				return instance
			})
			.finally(() => considerLoaded(id))

	const updateInstance = (id, instance: ObjectType) =>
		download(id, instance).then((response) =>
			serverResponseToInstance(response, id, instance)
		)

	const scheduleInstanceUpdate = (event: UpdateEvent, id) => {
		const { instance, lastUpdated, updating } = byId[id]

		if (updating) {
			console.info(`Not updating instance because update is already running ${cacheName}/${id}`)
			return
		}

		byId[id].updating = true

		shouldUpdate(event, instance, lastUpdated).then((shouldUpdate) => {
			if (shouldUpdate) {
				console.info(`Schedule ${cacheName} instance ${id} update with event ${UpdateEvent[event]}`)
				return updateInstance(id, instance).then(() =>
					byId[id].lastUpdated = Date.now()
				)
			}
		}).catch(errorService.criticalError).finally(() => byId[id].updating = false)

		return
	}

	const scheduleInstancesUpdate = (event: UpdateEvent) => {
		console.info(`Schedule ${cacheName} instances update with event ${UpdateEvent[event]}`)

		Object.keys(byId)
			.forEach((id) => scheduleInstanceUpdate(event, id) )
	}

	let lastHeartbeat = Date.now()

	socketService.listen(() => lastHeartbeat = Date.now(), "heartbeat")

	socketService.on("connect", () => {
		console.info(`connect at ${Date.now()} after ${Date.now() - lastHeartbeat}`)

		if (Date.now() - lastHeartbeat > LONG_DISCONNECT) {
			scheduleInstancesUpdate(UpdateEvent.wake)
		} else {
			scheduleInstancesUpdate(UpdateEvent.blink)
		}

		lastHeartbeat = Date.now()
	})

	let pauseStarted = 0

	document.addEventListener("pause", () => pauseStarted = Date.now(), false);
	document.addEventListener("resume", () => {
		console.info(`ended pause at ${Date.now()} after ${Date.now() - pauseStarted}`)

		if (Date.now() - pauseStarted > LONG_APP_PAUSE) {
			scheduleInstancesUpdate(UpdateEvent.wake)
		} else {
			scheduleInstancesUpdate(UpdateEvent.blink)
		}
	}, false);

	return class ObjectLoader {
		static getLoaded(id): ObjectType {
			if (!ObjectLoader.isLoaded(id)) {
				throw new Error(`Not yet loaded: ${id}`)
			}

			return byId[id].instance
		}

		static isLoaded(id) {
			return byId.hasOwnProperty(id)
		}

		static load(source): Bluebird<ObjectType> {
			const id = getID(source)

			if (byId[id]) {
				serverResponseToInstance(source, id, byId[id].instance)

				return Bluebird.resolve(byId[id].instance)
			}

			if (!loading[id]) {
				loading = {
					...loading,
					[id]: loadFromCache(id)
						.catch(() => serverResponseToInstance(source, id, null))
				}
			}

			 return loading[id]
		}

		static updateCache(id, cacheableData: CachedObjectType) {
			return cache.store(id, cacheableData)
		}

		// Throws
		static getFromCache(id): Bluebird<ObjectType> {
			if (byId[id]) {
				return Bluebird.resolve(byId[id].instance)
			}

			return loadFromCache(id)
		}

		static get(id): Bluebird<ObjectType> {
			if (typeof id === "undefined" || id === null) {
				throw new Error(`Can't get object with id ${id} - ${cacheName}`)
			}

			if (byId[id]) {
				return Bluebird.resolve(byId[id].instance)
			}

			if (!loading[id]) {
				let promise = loadFromCache(id)
					.catch(() => download(id, null).then((response) => serverResponseToInstance(response, id, null))
				)

				loading = {
					...loading,
					[id]: promise
				}
			}

			 return loading[id]
		}

		static getAll = () => {
			return byId
		}

		static removeLoaded = (id) => delete byId[id]

		static addLoaded = (id, obj: ObjectType) => {
			byId[id] = { instance: obj, lastUpdated: Date.now(), updating: false }
		}
	}
}

export default createLoader

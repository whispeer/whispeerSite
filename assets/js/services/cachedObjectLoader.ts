import * as Bluebird from "bluebird"

import Cache from "../services/Cache"

type hookType<ObjectType, CachedObjectType> = {
	download: (id: string) => Bluebird<any>,
	load: (response: any) => Bluebird<CachedObjectType>,
	restore: (response: CachedObjectType) => Bluebird<ObjectType> | ObjectType,
	getID: (response: any) => string,
	cacheName: string
}

function createLoader<ObjectType, CachedObjectType>({ download, load, restore, getID, cacheName }: hookType<ObjectType, CachedObjectType>) {
	let loading: { [s: string]: Bluebird<ObjectType> } = {}
	let byId: { [s: string]: ObjectType } = {}

	const cache = new Cache(cacheName)

	const considerLoaded = (id) => {
		loading = { ...loading }
		delete loading[id]
	}

	const cacheInMemory = (id, instance) => {
		byId = { ...byId, [id]: instance }
		return instance
	}

	const loadFromCache = (id) =>
		cache.get(id)
			.then((cacheResponse) => cacheResponse.data)
			.then(restore)
			.then((instance) => {
				cacheInMemory(id, instance)
				considerLoaded(id)
				return instance
			})

	const serverResponseToInstance = (response, id) =>
		load(response)
			.then((cacheableData) => cache.store(id, cacheableData).thenReturn(cacheableData))
			.then(restore)
			.then((instance) => cacheInMemory(id, instance))
			.finally(() => considerLoaded(id))

	return class ObjectLoader {
		static getLoaded(id): ObjectType {
			if (!ObjectLoader.isLoaded(id)) {
				throw new Error(`Not yet loaded: ${id}`)
			}

			return byId[id]
		}

		static isLoaded(id) {
			return byId.hasOwnProperty(id)
		}

		// Throws
		static getFromCache(id): Bluebird<ObjectType> {
			if (byId[id]) {
				return Bluebird.resolve(byId[id])
			}

			return loadFromCache(id)
		}

		static load(response): Bluebird<ObjectType> {
			const id = getID(response)

			if (byId[id]) {
				return Bluebird.resolve(byId[id])
			}

			if (!loading[id]) {
				loading = {
					...loading,
					[id]: loadFromCache(id).catch(() => serverResponseToInstance(response, id))
				}
			}

			 return loading[id]
		}

		static get(id): Bluebird<ObjectType> {
			if (typeof id === "undefined" || id === null) {
				throw new Error(`Can't get object with id ${id} - ${cacheName}`)
			}

			if (byId[id]) {
				return Bluebird.resolve(byId[id])
			}

			if (!loading[id]) {
				let promise = loadFromCache(id)
					.catch(() => download(id).then((response) => serverResponseToInstance(response, id)))

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
			byId[id] = obj
		}
	}
}

export default createLoader

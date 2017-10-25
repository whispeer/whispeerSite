import * as Bluebird from "bluebird"

export type recordingType = {
	url: string,
	audio: HTMLAudioElement,
	duration: number
}

export type audioInfo = {
	url: string,
	estimatedDuration: number
}

export type recordingsType = recordingType[]

export default class VoicemailPlayer {

	private static activePlayer: VoicemailPlayer = null
	private playing = false
	private loaded = false
	private recordings: recordingsType = []

	private recordPlayingIndex = 0
	private loadingPromises : Bluebird<any>[] = []
	private positionRAFListener: Function[] = []

	constructor(recordings: audioInfo[]) {
		recordings.map(({ url, estimatedDuration }) => this.addRecording(url, estimatedDuration))
	}

	play() {
		if (VoicemailPlayer.activePlayer) {
			VoicemailPlayer.activePlayer.pause()
		}
		this.recordings[this.recordPlayingIndex].audio.play()
		VoicemailPlayer.activePlayer = this
		this.playing = true
		this.loaded = true

		this.positionListener()
	}

	private positionListener = () => {
		const position = this.getPosition()
		this.positionRAFListener.forEach((func) => func(position))

		if (this.isPlaying()) {
			window.requestAnimationFrame(this.positionListener)
		}
	}

	pause() {
		this.recordings[this.recordPlayingIndex].audio.pause()
		VoicemailPlayer.activePlayer = null
		this.playing = false
	}

	toggle() {
		if (this.playing) {
			this.pause()
		} else {
			this.play()
		}
	}

	onPositionUpdateRAF = (listener) => this.positionRAFListener.push(listener)

	isPlaying() {
		return this.playing
	}

	isPaused() {
		return !this.playing
	}

	getDuration(beforeIndex?: number) {
		return this.recordings.slice(0, beforeIndex).reduce((prev, next) => prev + next.duration, 0)
	}

	getPosition() {
		const currentDuration = this.getDuration(this.recordPlayingIndex)
		return currentDuration + this.recordings[this.recordPlayingIndex].audio.currentTime
	}

	reset() {
		this.recordings.forEach(({ audio }) => {
			audio.pause()
			audio.currentTime = 0
		})
		this.recordPlayingIndex = 0

		if (VoicemailPlayer.activePlayer && this !== VoicemailPlayer.activePlayer) {
			VoicemailPlayer.activePlayer.reset()
		}
		VoicemailPlayer.activePlayer = null
		this.playing = false
	}

	seekTo = (time) => {
		let timeInTrack = time
		const recordPlayingIndex = this.recordings.findIndex(({ duration }) => {
			if (timeInTrack < duration) {
				return true
			}

			timeInTrack -= duration
			return false
		})

		if (recordPlayingIndex === -1) {
			return
		}

		this.recordPlayingIndex = recordPlayingIndex

		this.recordings[this.recordPlayingIndex].audio.currentTime = timeInTrack
		this.positionListener()

		if (this.isPlaying()) {
			this.recordings.forEach(({ audio }, index) => {
				if (index !== recordPlayingIndex) {
					audio.pause()
					audio.currentTime = 0
				}
			})
			this.recordings[this.recordPlayingIndex].audio.play()
		}
	}

	awaitLoading = () => {
		return Bluebird.all(this.loadingPromises)
	}

	isLoaded = () => this.loaded

	private addRecording(url: string, duration: number) {
		const audio = new Audio(url)

		const audioInfo = {
			url,
			audio,
			duration
		}

		audio.addEventListener("ended", this.onEnded)

		const loadingPromise =
			new Bluebird((resolve) => audio.addEventListener("canplaythrough", resolve))

		this.loadingPromises.push(loadingPromise)
		this.recordings.push(audioInfo)
	}

	destroy() {
		this.recordings.forEach(({ audio, url }) => {
			audio.src = ""
			audio.load()

			// TODO delete file created!
			console.warn("TODO: delete file:", url)
		})
	}

	getRecordings() {
		return [...this.recordings]
	}

	private onEnded = () => {
		if (this.isPlaying()) {
			// Use a Promise to trigger the angular zone. Zones are bad. Angular DI is bad.
			Bluebird.resolve().then(() => {
				this.recordPlayingIndex += 1

				if (this.recordPlayingIndex >= this.recordings.length) {
					this.reset()
					return
				}

				this.recordings[this.recordPlayingIndex].audio.play()
			})
		}
	}
}

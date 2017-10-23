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
	private recordings: recordingsType = []

	private recordPlayingIndex = 0
	private position = 0
	private interval : number = null
	private loadingPromises : Bluebird<any>[] = []

	constructor(recordings: audioInfo[]) {
		recordings.map(({ url, estimatedDuration }) => this.addRecording(url, estimatedDuration))
	}

	play() {
		this.awaitLoading().then(() => {
			if (VoicemailPlayer.activePlayer) {
				VoicemailPlayer.activePlayer.reset()
			}
			this.recordings[this.recordPlayingIndex].audio.play()
			VoicemailPlayer.activePlayer = this
			this.playing = true

			clearInterval(this.interval)
			this.interval = window.setInterval(() => {
				this.position = this.recordings[this.recordPlayingIndex].audio.currentTime
			}, 100)

		})
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
		return currentDuration + this.position
	}

	reset() {
		clearInterval(this.interval)

		this.recordings.forEach(({ audio }) => audio.pause())
		this.recordPlayingIndex = 0
		this.position = 0
		this.interval = null

		if (VoicemailPlayer.activePlayer && this !== VoicemailPlayer.activePlayer) {
			VoicemailPlayer.activePlayer.reset()
		}
		VoicemailPlayer.activePlayer = null
		this.playing = false
	}

	awaitLoading = () => {
		return Bluebird.all(this.loadingPromises)
	}

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
			.then(() => audioInfo.duration = audio.duration )

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
				this.position = 0

				if (this.recordPlayingIndex >= this.recordings.length) {
					this.reset()
					return
				}

				this.recordings[this.recordPlayingIndex].audio.play()
			})
		}
	}
}

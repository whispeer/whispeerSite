"use strict";

import * as Bluebird from "bluebird"

const templateUrl = require("../../views/directives/voicemailPlayer.html");
const directivesModule = require("directives/directivesModule");

import VoicemailPlayer from "../asset/voicemailPlayer"
import blobService from "../services/blobService"
import Progress from "../asset/Progress"

const loadVoicemail = (voicemail) => {
	const loadProgress = new Progress()

	voicemail.loading = true
	voicemail.getProgress = () => loadProgress.getProgress()

	return blobService.getBlobUrl(voicemail.blobID, voicemail.type, loadProgress, voicemail.size).then((url) => {
		voicemail.url = url
		voicemail.loading = false
		voicemail.loaded = true
		return voicemail
	})
}

class voicemailPlayerComponent {
	private voicemails: {
		duration: number,
		size: number,
		loading: boolean,
		loaded: boolean
		getProgress: () => number
	}[]
	private player: VoicemailPlayer
	private previousTime: number
	seekVal: number = 0

	toggle = () => this.isPlaying() ? this.pause() : this.play()

	isPlaying = () => this.player ? this.player.isPlaying() : false

	isLoading = () => !!this.voicemails.find(({ loading }) => loading)

	getProgress = () => this.voicemails.reduce((prev, { getProgress }) => getProgress ? prev + getProgress(): 0, 0)

	getSize = () => this.voicemails.reduce((prev, { size }) => prev + size, 0)

	getPosition = () => this.player ? this.player.getPosition() : 0

	isLoaded = () => this.voicemails.reduce((prev, { loaded }) => prev && loaded, true)

	timeUpdate = (position) => {
		console.log("Position", position)
		const time = Math.floor(position)

		if (this.previousTime === time) {
			return
		}

		this.previousTime = time

		this.$element.find("#position").text(this.formatPosition(time))
	}

	formatPosition = (position: number) => {
		const minutes = Math.floor(position / 60)
		const seconds = position % 60

		const minutesString = `0${minutes}`.substr(-2)
		const secondsString = `0${seconds}`.substr(-2)

		return `${minutesString}:${secondsString}`
	}

	seekTo = (position: number) => this.player.seekTo(position)

	loadAndPlay = () => {
		const voicemails = this.voicemails

		return Bluebird.resolve(voicemails)
			.map((voicemail) => loadVoicemail(voicemail))
			.map(({ url, duration }) => ({ url, estimatedDuration: duration }))
			.then((voicemails) => new VoicemailPlayer(voicemails))
			.then((player) => {
				this.player = player
				this.player.onPositionUpdateRAF(this.timeUpdate)
				this.player.play()
			})
	}

	play = () => this.player ? this.player.play() : this.loadAndPlay()

	pause = () => this.player.pause()

	getDuration = () => this.player ? this.player.getDuration() : this.voicemails.reduce((prev, { duration }) => prev + duration, 0)

	constructor(private $element) {}

	static $inject = ["$element"]
}

directivesModule.component("voicemailPlayer", {
	bindings:	{
		voicemails: "<"
	},
	templateUrl,
	controller: voicemailPlayerComponent
})

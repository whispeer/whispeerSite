"use strict";

import * as Bluebird from "bluebird"

const templateUrl = require("../../views/directives/voicemailPlayer.html");
const directivesModule = require("directives/directivesModule");

import VoicemailPlayer from "../asset/voicemailPlayer"
import blobService from "../services/blobService"
import Progress from "../asset/Progress"

const ProgressBar = require('progressbar.js');

const loadVoicemail = (voicemail) => {
	const loadProgress = new Progress()

	voicemail.loading = true
	voicemail.getProgress = () => loadProgress.getProgress()

	return blobService.getBlobUrl(voicemail.blobID, voicemail.type, voicemail.size, loadProgress).then((url) => {
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
	private startTime: number = 0
	private progress: any
	seekVal: number = 0

	toggle = () => this.isPlaying() ? this.pause() : this.play()

	isPlaying = () => this.player ? this.player.isPlaying() : false

	isLoading = () => !!this.voicemails.find(({ loading }) => loading)

	getProgress = () => this.voicemails.reduce((prev, { getProgress }) => getProgress ? prev + getProgress(): 0, 0)

	getSize = () => this.voicemails.reduce((prev, { size }) => prev + size, 0)

	isLoaded = () => this.voicemails.reduce((prev, { loaded }) => prev && loaded, true)

	timeUpdate = (position) => {
		const time = Math.floor(position)

		this.progress.set(position/this.getDuration())

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

	seekTo = (position: number) => {
		if (this.player) {
			return this.player.seekTo(position)
		}

		this.startTime = position
		this.timeUpdate(position)
	}

	loadAndPlay = () => {
		const voicemails = this.voicemails

		return Bluebird.resolve(voicemails)
			.map((voicemail) => loadVoicemail(voicemail))
			.map(({ url, duration }) => ({ url, estimatedDuration: duration }))
			.then((voicemails) => new VoicemailPlayer(voicemails))
			.then((player) => {
				this.player = player
				this.player.onPositionUpdateRAF(this.timeUpdate)

				this.player.awaitLoading().then(() => {
					this.player.seekTo(this.startTime)
					this.player.play()
				})
			})
	}

	play = () => this.player ? this.player.play() : this.loadAndPlay()

	pause = () => this.player.pause()

	getDuration = () => this.player ? this.player.getDuration() : this.voicemails.reduce((prev, { duration }) => prev + duration, 0)

	constructor(private $element) {}

	$postLink = () => {
		const progressElement : HTMLElement = this.$element.find(".voicemail--progress")[0]
		this.progress = new ProgressBar.Line(progressElement, {
			strokeWidth: 2,
			trailWidth: 2,
			svgStyle: {width: '100%', height: '25%'}
		})

		progressElement.addEventListener('click', (event) => {
			const rect = progressElement.getBoundingClientRect()
			const progress = (event.pageX - rect.left) / rect.width;
			this.seekTo(this.getDuration() * progress)
		});
	}

	static $inject = ["$element"]
}

directivesModule.component("voicemailPlayer", {
	bindings:	{
		voicemails: "<"
	},
	templateUrl,
	controller: voicemailPlayerComponent
})

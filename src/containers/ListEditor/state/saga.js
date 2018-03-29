import {notification} from 'antd'
import randomString from 'randomstring'
import {put, call, takeLatest} from 'redux-saga/effects'
import {LOAD_NEW_LIST} from './constants'
import {setNewList} from './actions'
import {readLocalTextFile} from 'utils/read-file'

const showLoadFailMessage = () => {
	const config = {
		description: `File upload failed`,
		duration: null,
		message: `Incorrect file content`,
		placement: `topLeft`
	}

	notification[`info`](config)
}

function reExecString(re, str) {
	const result = re.exec(str)

	return result && result.length > 0 && result[1]
		? result[1].trim()
		: null
}

function reExecInt(re, str) {
	const result = reExecString(re, str)

	return result
		? parseInt(result, 10)
		: null
}

function *parseList(file) {
	const separator = /\r?\n/
	const listText = yield call(readLocalTextFile, file)

	if (!listText) return showLoadFailMessage()

	const re = {
		duration: /#EXTINF:\s?(-?\d+)\s?[^,]*,.*/,
		name: /#EXTINF:[^,]+,(.+)/,
		tvgShift: /#EXTINF:.+tvg-shift=(-?\d+)\s?.*,.*/,
		tvgName: /#EXTINF:.+tvg-name="([^"]+)"\s?.*,.*/,
		tvgLogo: /#EXTINF:.+tvg-logo="([^"]+)"\s?.*,.*/,
		groupTitle: /#EXTINF:.+group-title="([^"]+)"\s?.*,.*/,
		group: /#EXTGRP:(.+)/,
		playlistName: /#PLAYLIST:(.+)/
	}

	const list = listText.split(separator)

	if (list.length === 0 || list[0] !== `#EXTM3U`) return showLoadFailMessage()

	const channels = []
	let newChannel = {}
	let playlistName = null
	for (var i = 1; i < list.length; i++) {
		if (list[i] === ``) continue
		if (list[i][0] === `#`) {
			if (list[i].indexOf(`#EXTINF:`) === 0) {
				newChannel.duration = reExecInt(re.duration, list[i])
				newChannel.name = reExecString(re.name, list[i])
				newChannel.tvgShift = reExecInt(re.tvgShift, list[i])
				newChannel.tvgName = reExecString(re.tvgName, list[i])
				newChannel.tvgLogo = reExecString(re.tvgLogo, list[i])
				newChannel.groupTitle = reExecString(re.groupTitle, list[i])
			}
			else if (list[i].indexOf(`#EXTGRP:`) === 0) {
				newChannel.group = reExecString(re.group, list[i])
			}
			else if (list[i].indexOf(`#PLAYLIST:`) === 0) {
				playlistName = reExecString(re.playlistName, list[i])
			}
			else {
				if (!(`additional` in newChannel)) {
					newChannel.additional = []
				}
				newChannel.additional.push(list[i])
			}
		}
		else {
			newChannel.id = randomString.generate()
			newChannel.link = list[i].trim()
			channels.push(newChannel)
			newChannel = {}
		}
	}

	return {channels, playlistName}
}

function buildGroups(channels) {
	const groups = {
		none: [],
		index: [`none`]
	}
	let lastGroup = `none`

	channels.forEach(ch => {
		const group = ch.groupTitle || ch.group

		if (group) {
			if (!groups[group]) {
				groups[group] = []
				groups.index.push(group)
			}
			groups[group].push(ch.id)
			lastGroup = group
		}
		else {
			groups[lastGroup].push(ch.id)
		}
	})

	return groups
}

function *loadNewList(action) {
	const {channels, playlistName} = yield parseList(action.payload)
	const groups = yield buildGroups(channels)

	yield put(setNewList({channels, groups, playlistName}))
}

export default function *listEditorSaga() {
	yield takeLatest(LOAD_NEW_LIST, loadNewList)
}
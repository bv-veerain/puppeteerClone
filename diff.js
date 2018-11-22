'use strict'
const DiffMatchPatch = require('./diff_match_patch.js')
const diff_match_patch = DiffMatchPatch.diff_match_patch

exports.calculate_diff_arr = (params) => {
	let results = []
	let data = JSON.parse(params.data|| [])
	let timeout = params.timeout
	data.forEach(row => {
		let oldRow = row['old'] || {}
		let newRow = row['new'] || {}
		let keys = Object.keys(oldRow)
		if (Object.keys(newRow).length > Object.keys(oldRow).length) {
			keys = Object.keys(newRow)
		}
		let info = {}
		keys.forEach(key => {
			let dmp = new diff_match_patch();
			let newData = String(newRow[key]) || ""
			let oldData = String(oldRow[key]) || ""
			let diff = dmp.diff_main(oldData, newData)
			let ld = dmp.diff_levenshtein(diff)
			dmp.diff_cleanupSemantic(diff)

			info[key] = {diff: diff, distance: ld}
		})
		results.push(info)
	})
	return results
}

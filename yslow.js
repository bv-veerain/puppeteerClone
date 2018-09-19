const fs = require('fs')
const YSLOW = require('yslow').YSLOW
const { JSDOM } = require('jsdom')
const { document } = (new JSDOM('')).window
const program = require('commander')

exports.generateReport = async (filePath) => {
	try {
		let data = await fs.readFileSync(filePath, 'utf8')
		let result = customStringify(runYslow(JSON.parse(data)))
		return (result)
	} catch (err) {
		throw err
	}
}

function runYslow(harData){
	if (!harData) {
		return
	}
	return YSLOW.harImporter.run(document, harData, program.ruleset)
}

function customStringify(result){
	let cache = []
	return JSON.stringify(result, (key, value) => {
		if (typeof(value) === 'object' && value !== null) {
			if (cache.indexOf(value) !== -1) {
				return { "url": value["url"] }
			}
			cache.push(value)
		}
		return value
	})
}

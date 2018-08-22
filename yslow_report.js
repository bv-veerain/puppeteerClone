const fs = require('fs')
const formidable = require('formidable')
const YSLOW = require('yslow').YSLOW
const jsdom = require('jsdom')
const { JSDOM } = jsdom
const { document } = (new JSDOM('')).window
const program = require('commander')



class YslowReport {
	getYslowReport(req, res) {
		let form = new formidable.IncomingForm()
		form.parse(req, (err, fields, files) => {
			fs.readFile(files.upload.path, (err, data) => {
				if (err){
					throw err
				}
				let content = data || ""
				let result = this.runYslow(JSON.parse(content.toString('utf-8')))
				res.setHeader('Content-Type','application/json')
				res.end(this.customStringify(result))
			})
		})
	}

	runYslow(har) {
		let result
		if (!har) {
			return
		}
		result = YSLOW.harImporter.run(document, har, program.ruleset)
		return result
	}

	customStringify(result) {
		let cache = []
		return JSON.stringify(result, (key, value) => {
			if (typeof value === 'object' && value !== null) {
				if (cache.indexOf(value) !== -1) {
					return { "url": value["url"] }
				}
				cache.push(value)
			}
			return value
		})
	}

}
module.exports = YslowReport


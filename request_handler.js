'use strict'

const form = new(require('formidable').IncomingForm)
const Puppeteer = require('./puppeteer.js')
const Yslow = require('./yslow.js')
const atob = require('atob')

module.exports.handleGetHarAndScreenshot = (req, res) => {
	form.parse(req, async (err, fields, files) => {
		try {
			if (err)
				throw err

			let har_and_screenshot = await Puppeteer.generateHarAndScreenshot(
				atob(fields['link']),
				atob(fields['proxy']),
				atob(fields['username']),
				atob(fields['password'])
			) 
			res.end(JSON.stringify(har_and_screenshot))
		} catch (err) {
			if (err.errorCode === undefined) {
					err.errorCode = 422
				}
				res.writeHead(err.errorCode)
				res.end(err.message)
		}
	})
}

module.exports.handlePostYslowReport = (req, res) => {
	form.parse(req, async (err, fields, files) => {
		try {
			if (err)
				throw err
			let yslowReport = await Yslow.generateReport(files.upload.path)
			res.end(yslowReport)
		} catch (err) {
			res.writeHead(422)
			res.end(err.message)
		}
	})
}

module.exports.handlePostTokenize = (req, res) => {
	form.parse(req, (err, fields, files) => {
		try {
			if (err)
				throw err
			//Tokenizer Code here.
		} catch (err) {
			res.writeHead(422)
			res.end(err.message)
		}
	})
}

module.exports.handleNotFound = (req, res) => {
	res.writeHead(404)
	res.end('Page Not Found')
}

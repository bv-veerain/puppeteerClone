'use strict'

const Puppeteer = require('./puppeteer.js')
const Yslow = require('./yslow.js')
const formidable = require('formidable')

module.exports.handleGetHarAndScreenshot = (req, res) => {
	const form = new formidable.IncomingForm
	form.parse(req, async (err, fields, files) => {
		try {
			if (err)
				throw err
			let har_and_screenshot = await Puppeteer.generateHarAndScreenshot(
				fields.url,
				fields.proxy,
				fields.username,
				fields.password
			) 
			res.end(JSON.stringify(har_and_screenshot))
		} catch (err) {
			res.writeHead(422)
			res.end(err.message)
		}
	})
}

module.exports.handlePostYslowReport = (req, res) => {
	const form = new formidable.IncomingForm
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
	const form = new formidable.IncomingForm
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

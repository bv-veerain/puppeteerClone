'use strict'

const form = new(require('formidable').IncomingForm)
const Puppeteer = require('./puppeteer.js')

module.exports.handleGetHarAndScreenshot = (req, res) => {
	form.parse(req, async (err, fields, files) => {
		try {
			if (err)
				throw err

			let har_and_screenshot = await Puppeteer.generateHarAndScreenshot(
				fields['url'],
				fields['proxy_server'],
				fields['username'],
				fields['password']
			) 
			res.setHeader('Content-Type','application/json')
			res.end(JSON.stringify(har_and_screenshot))
		} catch (err) {
			res.writeHead(422)
			res.end(err.message)
		}
	})
}

module.exports.handlePostYslowReport = (req, res) => {
	form.parse(req, async (err, fields, files) => {
		try {
			if (err)
				throw err
			//YslowReport Code here.
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

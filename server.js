'use strict'

const url = require('url')
const http = require('http')
const handler = require('./request_handler.js')

const server = http.createServer((req, res) => {
	if (req.method === 'POST') {
		switch (req.url) {
			case "/har_and_screenshot":
				handler.handleGetHarAndScreenshot(req, res)
				break
			case "/yslow_report":
				handler.handlePostYslowReport(req, res)
				break
			case "/tokenize":
				handler.handlePostTokenize(req, res)
				break
			default:
				handler.handleNotFound(req, res)
		}
	} else {
		handler.handleNotFound(req, res)
	}
})
server.listen(8080)

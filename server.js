const CustomError = require('./customerror.js')
const YslowReport = require('./yslow_report.js')
const HarWithScreenshot = require('./har_with_screenshot.js')
const http = require('http')
const server = http.createServer()

server.on('request', async(req, res) => { 
	try {
		switch (req.url) {
		case "/har_with_screenshot" 	:	{	let harWithScreenshot = new HarWithScreenshot()
			harWithScreenshot.getHarWithScreenshot(req, res)
			break
		}
		case "/yslow_report" : {	let yslowReport = new YslowReport()
			yslowReport.getYslowReport(req, res)
			break
		}
		default : {
			let error = new CustomError('Please Check Request Address')
			throw error
		}
		}
	} catch (err) {
		if (err.error_code === undefined)
			err.error_code = 422
		res.writeHead(err.error_code)
		res.end(err.message)
	}
}).listen(8080)

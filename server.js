const YslowReport = require('./yslow_report.js')
const HarWithScreenshot = require('./har_with_screenshot.js')
const http = require('http')
const server = http.createServer()

server.on('request', (req, res) => { 
	switch (req.url) {
	case "/har_with_screenshot" : { 
		let harWithScreenshot = new HarWithScreenshot()
		harWithScreenshot.getHarWithScreenshot(req, res)
		break
	}
	case "/yslow_report" : { 
		let yslowReport = new YslowReport()
		yslowReport.getYslowReport(req, res)
		break
	}
	default : {
		res.writeHead(422)
		res.end('Please Check Your Request')
	}
	}
}).listen(8080)

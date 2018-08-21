const CustomError = require('./customerror.js')
const http = require('http')
const puppeteer = require('puppeteer')
const PuppeteerHar = require('puppeteer-har')
const server = http.createServer()
const fs = require('fs')
const formidable = require('formidable')
const YSLOW = require('yslow').YSLOW
const jsdom = require('jsdom')
const { JSDOM } = jsdom
const { document } = (new JSDOM('')).window
const program = require('commander')

server.on('request',async (req, res) => { 
	try {
		if (req.method === 'GET') {
			const buffer =  await generate_screenshot_har(req.headers.link, req.headers.proxy_server)
			let result = JSON.stringify(buffer)
			res.end(result)
		} else {
			let form = new formidable.IncomingForm()
			form.parse(req, (err, fields, files) => {
				fs.readFile(files.upload.path, (err, data) => {
					if (err) {
						throw err
					}
					let content = data || ""
					let result = runyslow(JSON.parse(content.toString('utf-8')))
					res.setHeader('Content-Type','application/json')
					res.end(customStringify(result))
				})
			})
		}
	} catch (err) {
		if (err.error_code === undefined)
			err.error_code = 422
		res.writeHead(err.error_code)
		res.end(err.message)
	}
}).listen(8080)

const WIDTH = 1366
const HEIGHT = 768
const NETWORKIDLETIMEOUT = 5000
const PAGELOADTIMEOUT = 40000
const EXTRAHEADERS = 'Accept-Language: en-GB,en-US;q=0.9,en;q=0.8'
const SCREENSHOTTYPE = 'jpeg'
const SCREENSHOTENCODING = 'base64'

async function generate_screenshot_har(link, proxy_server) {
	const browser = await puppeteer.launch({headless: true, slowmo: 0, ignoreHTTPSErrors: true,
		args: [ `--proxy-server = ${ proxy_server}` ]})
	const page = await browser.newPage()
	await page.setExtraHTTPHeaders({ EXTRAHEADERS })
	const har = new PuppeteerHar(page)
	await har.start()
	const response = await page.goto(link, { networkIdle2Timeout: NETWORKIDLETIMEOUT, waitUntil: 'load',
		timeout: PAGELOADTIMEOUT })
	await page.setViewport({
		width: WIDTH,
		height: HEIGHT
	})
	const data  =  await har.stop()
	const fullpagescreenshot = await page.screenshot({type: SCREENSHOTTYPE, encoding: SCREENSHOTENCODING, fullPage: true})
	const screenshot = await page.screenshot({type: SCREENSHOTTYPE, encoding: SCREENSHOTENCODING})
	browser.close()
	if (response.status() !== 200) {
		let error = new CustomError(`Puppeteer is Fine. Unable to Load URL ${link}`, response.status())
		throw error
	}

	return { har: data, site_screenshot: screenshot, full_site_screenshot: fullpagescreenshot } 
}

function runyslow(har) {
	let result
	if (!har) {
		return
	}
	result = YSLOW.harImporter.run(document, har, program.ruleset)
	return result
}

function customStringify(result) {
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

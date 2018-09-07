const CustomError = require('./customerror.js')
const puppeteer = require('puppeteer')
const PuppeteerHar = require('puppeteer-har')
const formidable = require('formidable')
const atob = require('atob')

const WIDTH = 1366
const HEIGHT = 768
const NETWORKIDLETIMEOUT = 5000
const PAGELOADTIMEOUT = 40000
const EXTRAHEADERS = 'Accept-Language: en-GB,en-US;q=0.9,en;q=0.8'
const SCREENSHOTTYPE = 'jpeg'
const SCREENSHOTENCODING = 'base64'

class Puppeteer {

	getHarWithScreenshot(req, res) {
		let self = this
		let form = new formidable.IncomingForm()
		form.parse(req, async(err, fields) => {
			if (err){
				res.writeHead(422)
				res.end(err)
			}
			let link = atob(fields['link'])
			let proxy = atob(fields['proxy'])
			let username = atob(fields['username'])
			let password = atob(fields['password'])
			try {
				const buffer = await self.generateHarWithScreenshot(link, proxy, username, password)
				const result = JSON.stringify(buffer)
				res.setHeader('Content-Type','application/json')
				res.end(result)
			} catch (err) {
				if (err.error_code === undefined) {
					err.error_code = 422
				}
				res.writeHead(err.error_code)
				res.end(err.message)
			}
		})
	}

	async generateHarWithScreenshot(link, proxy_server, username, password) {
		let browser
		try {
			browser = await puppeteer.launch({
				args: [ `--proxy-server = ${ proxy_server}` ]
			})
			const page = await browser.newPage()
			if (username && password) {
				await page.authenticate({username: username, password: password})
			}
			await page.setExtraHTTPHeaders({EXTRAHEADERS})
			await page.setViewport({width: WIDTH, height: HEIGHT})
			const har = new PuppeteerHar(page)
			await har.start()
			const response = await page.goto(link, {
				networkIdle2Timeout: NETWORKIDLETIMEOUT, 
				waitUntil: 'load',
				timeout: PAGELOADTIMEOUT
			})
			const data = await har.stop()
			if (response.status() === 200) {
				const fullpagescreenshot = await page.screenshot({
					type: SCREENSHOTTYPE,
					encoding: SCREENSHOTENCODING,
					fullPage: true
				})
				const screenshot = await page.screenshot({type: SCREENSHOTTYPE, encoding: SCREENSHOTENCODING})
				return { har: data, site_screenshot: screenshot, full_site_screenshot: fullpagescreenshot }
			} else {
				let error = new CustomError(`Puppeteer is Fine. Unable to Load URL ${link}`, response.status())
				throw error
			}
		} catch (e){
			throw e
		} finally {
			if (browser)
				browser.close()
		}
	}
}

module.exports = Puppeteer

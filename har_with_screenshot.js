const CustomError = require('./customerror.js')
const puppeteer = require('puppeteer')
const PuppeteerHar = require('puppeteer-har')

const WIDTH = 1366
const HEIGHT = 768
const NETWORKIDLETIMEOUT = 5000
const PAGELOADTIMEOUT = 40000
const EXTRAHEADERS = 'Accept-Language: en-GB,en-US;q=0.9,en;q=0.8'
const SCREENSHOTTYPE = 'jpeg'
const SCREENSHOTENCODING = 'base64'

class HarWithScreenshot {
	getHarWithScreenshot(req, res) {
		let body =""
		let self = this
		req.on('data', async (data) => {
			body += data
			body = JSON.parse(body)
			let { link, proxy, username, password } = body
			try {
				const buffer = await self.generate_har_with_screenshot(link, proxy, username, password)
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

	async generate_har_with_screenshot(link, proxy_server, username, password) {
		const browser = await puppeteer.launch({
			headless: true,
			slowmo: 0,
			ignoreHTTPSErrors: true,
			args: [ `--proxy-server = ${ proxy_server}` ]
		})
		const page = await browser.newPage()
		if (username && password) {
			await page.authenticate({username: username, password: password})
		}
		await page.setExtraHTTPHeaders({EXTRAHEADERS})
		const har = new PuppeteerHar(page)
		await har.start()
		const response = await page.goto(link, {
			networkIdle2Timeout: NETWORKIDLETIMEOUT, 
			waitUntil: 'load',
			timeout: PAGELOADTIMEOUT
		})
		const data = await har.stop()
		await page.setViewport({width: WIDTH, height: HEIGHT})
		const fullpagescreenshot = await page.screenshot({
			type: SCREENSHOTTYPE,
			encoding: SCREENSHOTENCODING,
			fullPage: true
		})
		const screenshot = await page.screenshot({type: SCREENSHOTTYPE, encoding: SCREENSHOTENCODING})
		browser.close()

		if (response.status() === 200) {
			return { har: data, site_screenshot: screenshot, full_site_screenshot: fullpagescreenshot }
		} else {
			let error = new CustomError(`Puppeteer is Fine. Unable to Load URL ${link}`, response.status())
			throw error
		}
	}
}

module.exports = HarWithScreenshot

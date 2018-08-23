const CustomError = require('./customerror.js')
const puppeteer = require('puppeteer')
const PuppeteerHar = require('puppeteer-har')
const formidable = require('formidable')

const WIDTH = 1366
const HEIGHT = 768
const NETWORKIDLETIMEOUT = 5000
const PAGELOADTIMEOUT = 40000
const EXTRAHEADERS = 'Accept-Language: en-GB,en-US;q=0.9,en;q=0.8'
const SCREENSHOTTYPE = 'jpeg'
const SCREENSHOTENCODING = 'base64'

class HarWithScreenshot {
	getHarWithScreenshot(req, res) {
		let form = new formidable.IncomingForm()
		form.parse(req,  async(err, fields) => {
			if (err){
				throw err
			}
			let blog_url = fields['link']
			let proxy_server = fields['proxy_server']
			const buffer =  await this.generate_har_with_screenshot(blog_url, proxy_server)
			const result =  JSON.stringify(buffer)
			res.setHeader('Content-Type','application/json')
			res.end(result)
		})
	}

	async generate_har_with_screenshot(link, proxy_server) {
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
}
module.exports = HarWithScreenshot

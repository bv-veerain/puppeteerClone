const puppeteer = require('puppeteer')
const PuppeteerHar = require('puppeteer-har')
const { UnableToLoadSiteError } = require('./errors.js')

exports.generateHarAndScreenshot = async (url, proxy_server, username, password) => {
	let browser
	try {
		browser = await puppeteer.launch({
			args: [ `--proxy-server = ${ proxy_server}` ]
		})
		const page = await browser.newPage()
		if (username && password) {
			await page.authenticate({username: username, password: password})
		}
		await page.setExtraHTTPHeaders({'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8'})
		await page.setViewport({width: 1366, height: 768})
		const har = new PuppeteerHar(page)
		await har.start()
		const response = await page.goto(url, {
			networkIdle2Timeout: 5000,
			waitUntil: 'load',
			timeout: 40000
		})
		const data = await har.stop()
		if (response.status() === 200) {
			const fullpagescreenshot = await page.screenshot({
				type: 'jpeg',
				encoding: 'base64',
				fullPage: true
			})
			const screenshot = await page.screenshot({
				type: 'jpeg',
				encoding: 'base64'
			})
			return { har: data, site_screenshot: screenshot, full_site_screenshot: fullpagescreenshot }
		} else {
			throw new UnableToLoadSiteError(`Unable to load site(${url}) : `, response.status())
		}
	} catch(err) {
		throw err
	} finally {
		if (browser)
			await browser.close()
	}
}

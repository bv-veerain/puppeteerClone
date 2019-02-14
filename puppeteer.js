'use strict'

const puppeteer = require('puppeteer')
const PuppeteerHar = require('puppeteer-har')
const AllowScreenshotRespCode = [200, 404]
const seq_no = function(){
	return Math.floor(Math.random() *100000000000000)}();
exports.generateHarAndScreenshot = async (url, proxy_server, username, password, request) => {
	let browser, pid, args
	args = proxy_server ? [ `--proxy-server=${proxy_server}` ] : []
	try {   
		request.log(['HARANDSCREENSHOTINFO'],`${seq_no}-BROWSER_LAUNCHING-${url}`)
		browser = await puppeteer.launch({
			ignoreHTTPSErrors: true,
			args: args
		})
		pid = browser.process().pid
		request.log(['HARANDSCREENSHOTINFO'],`${seq_no}-BROWSER_LAUNCHED_AND_NEW_TAB_OPENING-${url}-${pid}`)
		const page = await browser.newPage()
		request.log(['HARANDSCREENSHOTINFO'],`${seq_no}-NEW_TAB_OPENED_AND_SETTING_EXTRA_HEADERS-${url}-${pid}`)
		await page.setExtraHTTPHeaders({
			'Authorization': 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64')
		})
		request.log(['HARANDSCREENSHOTINFO'],`${seq_no}-EXTRA_HEADERS_WERE_SET_UP_AND_SETTING_VIEWPORT-${url}-${pid}`)
		await page.setViewport({width: 1366, height: 768})
		request.log(['HARANDSCREENSHOTINFO'],`${seq_no}-WEBPAGE_LOADING_AND_HAR_STARTED-${url}-${pid}`)
		const har = new PuppeteerHar(page)
		await har.start()
		const response = await page.goto(url, {
			waitUntil: 'networkidle0',
			timeout: 40000
		})
		request.log(['HARANDSCREENSHOTINFO'],`${seq_no}-WEBPAGE_LOADED_AND_RESPONCE_CREATED-${url}-${pid}`)
		const data = await har.stop()
		request.log(['HARANDSCREENSHOTINFO'],`${seq_no}-HAR_STOPPED-${url}-${pid}`)
		if (AllowScreenshotRespCode.includes(response.status())) {
			request.log(['HARANDSCREENSHOTINFO'],`${seq_no}-START_TAKING_SCREENSHOT-${url}-${pid}`)
			const fullPageScreenshot = await Promise.race([
				page.screenshot({type: 'jpeg', encoding: 'base64', fullPage: true}),
				new Promise((resolve, reject) => setTimeout(resolve, 20000, 'Full Screenshot Timed Out'))
			])
			if (fullPageScreenshot === 'Full Screenshot Timed Out') {
				request.log(['HARANDSCREENSHOTINFO'], `${seq_no}-FULLPAGE_SCREENSHOT_TIMEDOUT-${url}-${pid}`)
			} else	{
				request.log(['HARANDSCREENSHOTINFO'],`${seq_no}-FULLPAGE_SCREENSHOT_TAKEN-${url}-${pid}`)
			}
			const screenshot = await Promise.race([
				page.screenshot({type: 'jpeg', encoding: 'base64'}),
				new Promise((resolve, reject) => setTimeout(resolve, 20000, 'Site Screenshot Timed Out'))
			])
			if (screenshot === 'Site Screenshot Timed Out') {
				request.log(['HARANDSCREENSHOTINFO'],`${seq_no}-SCREENSHOT_TIMEDOUT-${url}-${pid}`)
			} else {
				request.log(['HARANDSCREENSHOTINFO'],`${seq_no}-SCREENSHOT_TAKEN-${url}-${pid}`)
			}
			return {
				site_resp_code: response.status(),
				har: data,
				site_screenshot: screenshot,
				full_site_screenshot: fullPageScreenshot
			}
		} else {
			request.log(['HARANDSCREENSHOTINFO'], `${seq_no}-SCREENSHOT_FAILED-${url}-${pid}`)
			return {
				site_resp_code: response.status()
			}
		}
	} catch (err) {
		request.log(['HARANDSCREENSHOTERROR'], `${seq_no}-SCREENSHOT_ERRORS-${url}-${pid}-${err.message}`)
		throw err
	} finally {
		if (browser){
			request.log(['HARANDSCREENSHOTINFO'],`${seq_no}-BROWSER_CLOSING-${url}-${pid}`)
			try {
				await browser.close()
				request.log(['HARANDSCREENSHOTINFO'],`${seq_no}-BROWSER_CLOSED-${url}-${pid}`)
			} catch (err){
				request.log(['HARANDSCREENSHOTERROR'],`${seq_no}-BROWSER_CLOSING_ERRORS-${url}-${pid}`)
			}
		} else {
			request.log(['HARSCREENSHOTINFO'],`${seq_no}-NO_BROWSER-${url}-${pid}`)
		}
	}
}

exports.capturePdf = async (url, proxy_server, username, password, request) => {
	let browser, pid
	let task = 'CAPTUREPDF'
	let args = proxy_server ? [ `--proxy-server=${proxy_server}` ] : []
	//try {
		request.log(['HARANDSCREENSHOTINFO'],`${seq_no}-BROWSER_LAUNCHING-${url}`)
		browser = await puppeteer.launch({
			ignoreHTTPSErrors: true,
			args: args
		})
		pid = browser.process().pid
		request.log(['HARANDSCREENSHOTINFO'],`${seq_no}-BROWSER_LAUNCHED_AND_NEW_TAB_OPENING-${url}-${pid}`)
		const page = await browser.newPage()
		request.log(['HARANDSCREENSHOTINFO'],`${seq_no}-NEW_TAB_OPENED_AND_SETTING_EXTRA_HEADERS-${url}-${pid}`)
		await page.setExtraHTTPHeaders({
			'Authorization': 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64')
		})
		request.log(['HARANDSCREENSHOTINFO'],`${seq_no}-EXTRA_HEADERS_WERE_SET_UP_AND_SETTING_VIEWPORT-${url}-${pid}`)
		await page.setViewport({width: 1366, height: 768})
		request.log(['HARANDSCREENSHOTINFO'],`${seq_no}-WEBPAGE_LOADING_AND_HAR_STARTED-${url}-${pid}`)
	const response = await page.goto(url, {
		waitUntil: 'networkidle0',
		timeout: 40000
	})
	const pdf = await page.pdf({
		format: 'A4',
		printBackground: true,
		margin: {top: '1cm', right: '1cm', bottom: '1cm', left: '1cm'}
	});
	return {
		pdf: Buffer.from(pdf).toString('base64')
	}
	//}
}

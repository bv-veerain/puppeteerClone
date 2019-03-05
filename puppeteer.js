'use strict'

const puppeteer = require('puppeteer')
const PuppeteerHar = require('puppeteer-har')
const allowScreenshotRespCode = [200, 404]
const genRandomSequence = () => {
	return Math.floor(Math.random() *100000000000000)
}

const pageGotoOptions = {
	waitUntil: 'networkidle0',
	timeout: 40000
}

const launchChromeWithNewPage = async (args) => {
	const browser = await puppeteer.launch({
		ignoreHTTPSErrors: true,
		args: args
	})
	const page = await browser.newPage()
	return {
		browser: browser,
		page: page
	}
}

const setViewPortAndHeader = async (page, options={}) => {
	await page.setExtraHTTPHeaders({
		'Authorization': 'Basic ' + Buffer.from(`${options.username}:${options.password}`).toString('base64')
	})
	await page.setViewport({
		width: options.width || 1366,
		height: options.height || 768
	})
	return page
}

exports.generateHarAndScreenshot = async (url, proxy_server, username, password, request) => {
	let browser, pid, args
	let seq_no = genRandomSequence()
	args = proxy_server ? [ `--proxy-server=${proxy_server}` ] : []
	let task = 'HARANDSCREENSHOTINFO'
	try {
		request.log([task],`${seq_no}-BROWSER_LAUNCHING-${url}`)
		let res = await launchChromeWithNewPage(args)
		browser = res.browser
		let page = res.page
		pid = browser.process().pid
		request.log([task],`${seq_no}-BROWSER_LAUNCHED_WITH_NEW_PAGE-${url}-${pid}`)
		page = await setViewPortAndHeader(page, {username:username, password:password})
		request.log([task],`${seq_no}-APPLIED_VIEW_PORT_AND_HEADER-${url}-${pid}`)
		const har = new PuppeteerHar(page)
		await har.start()
		request.log([task],`${seq_no}-HAR_STARTED-${url}-${pid}`)
		const response = await page.goto(url, pageGotoOptions)
		request.log([task],`${seq_no}-URL_LOADED-${url}-${pid}`)
		const data = await har.stop()
		request.log([task],`${seq_no}-HAR_STOPPED-${url}-${pid}`)
		if (allowScreenshotRespCode.includes(response.status())) {
			const fullPageScreenshot = await Promise.race([
				page.screenshot({type: 'jpeg', encoding: 'base64', fullPage: true}),
				new Promise((resolve) => setTimeout(resolve, 20000, 'Full Screenshot Timed Out'))
			])
			if (fullPageScreenshot === 'Full Screenshot Timed Out') {
				request.log([task], `${seq_no}-FULLPAGE_SCREENSHOT_TIMEDOUT-${url}-${pid}`)
			} else	{
				request.log([task],`${seq_no}-FULLPAGE_SCREENSHOT_TAKEN-${url}-${pid}`)
			}
			const screenshot = await Promise.race([
				page.screenshot({type: 'jpeg', encoding: 'base64'}),
				new Promise((resolve) => setTimeout(resolve, 20000, 'Site Screenshot Timed Out'))
			])
			if (screenshot === 'Site Screenshot Timed Out') {
				request.log([task],`${seq_no}-SCREENSHOT_TIMEDOUT-${url}-${pid}`)
			} else {
				request.log([task],`${seq_no}-SCREENSHOT_TAKEN-${url}-${pid}`)
			}
			return {
				site_resp_code: response.status(),
				har: data,
				site_screenshot: screenshot,
				full_site_screenshot: fullPageScreenshot
			}
		} else {
			request.log([task], `${seq_no}-SCREENSHOT_FAILED-${url}-${pid}`)
			return {
				site_resp_code: response.status()
			}
		}
	} catch (err) {
		request.log(['HARANDSCREENSHOTERROR'], `${seq_no}-SCREENSHOT_ERRORS-${url}-${pid}-${err.message}`)
		throw err
	} finally {
		if (browser){
			try {
				await browser.close()
				request.log([task],`${seq_no}-BROWSER_CLOSED-${url}-${pid}`)
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
	let seq_no = genRandomSequence()
	try {
		request.log([task],`${seq_no}-BROWSER_LAUNCHING-${url}`)
		let res = await launchChromeWithNewPage(args)
		browser = res.browser
		let page = res.page
		pid = browser.process().pid
		request.log([task],`${seq_no}-BROWSER_LAUNCHED_WITH_NEW_PAGE-${url}-${pid}`)
		page = await setViewPortAndHeader(page, {username:username, password:password})
		request.log([task],`${seq_no}-APPLIED_VIEW_PORT_AND_HEADER-${url}-${pid}`)
		await page.goto(url, pageGotoOptions)
		request.log([task],`${seq_no}-URL_LOADED-${url}-${pid}`)
		const pdf = await page.pdf({
			printBackground: true,
			width: 1100,
			height: 1027,
			margin: {
				top: 10,
				right: 100,
				bottom: 10,
				left: 100
			}
		})
		request.log([task],`${seq_no}-PDF_CAPTURED-${url}-${pid}`)
		return {
			pdf: Buffer.from(pdf).toString('base64')
		}
	} catch (err) {
		request.log(['CAPTUREPDF_ERROR'], `${seq_no}-CAPTURE_PDF_FAILED-${url}-${pid}-${err.message}`)
		throw err
	} finally {
		if (browser){
			try {
				await browser.close()
				request.log([task],`${seq_no}-BROWSER_CLOSED-${url}-${pid}`)
			} catch (err){
				request.log(['CAPTUREPDF_ERROR'],`${seq_no}-BROWSER_CLOSING_ERRORS-${url}-${pid}`)
			}
		} else {
			request.log(['CATUREPDF_INFO'],`${seq_no}-NO_BROWSER-${url}-${pid}`)
		}
	}
}

exports.loadFromSrc = async (src) => {
	let browser, pid
	let navigated_urls = []
	let task = 'LOAD_FROM_SRC'
	let seq_no = genRandomSequence()
	try {
		request.log([task],`${seq_no}-BROWSER_LAUNCHING`)
		let res = await launchChromeWithNewPage([])
		browser = res.browser
		let page = res.page
		pid = browser.process().pid
		request.log([task],`${seq_no}-BROWSER_LAUNCHED_WITH_NEW_PAGE-${pid}`)
		page.on('response', response => {
			let resp_code = response.status()
			if ((resp_code >= 300) && (resp_code <= 399)) {
				navigated_urls.push(Buffer.from(response.headers()['location']).toString('base64'))
			}
		})
		//XNOTE Give it a proper location.
		await page.goto('file:///tmp/a.html');
		await page.waitFor(5000); //wait for 5 seconds.
		let new_source = Buffer.from(await page.content()).toString('base64');
		request.log([task],`${seq_no}-SOURCE_LOADED-${pid}`)
		return {
			navigated_urls: navigated_urls,
			new_source: new_source
		}
	} catch (err) {
		request.log(['SOURCE_LOAD_ERROR'], `${seq_no}-SOURCE_LOAD_FAILED-${pid}-${err.message}`)
		throw err
	} finally {
		if (browser)
			await browser.close()
	}
}

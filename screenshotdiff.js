'use strict'
const cv = require('opencv4nodejs')
const axios = require('axios')
const compareImages = require("resemblejs/compareImages")
const Jimp = require('jimp')

const getScreenshotsBufs = async (screenshotUrl, targetScreenshotUrl) => {
	let screenshotBuf, targetScreenshotBuf
	await axios.all([getScreenshot(screenshotUrl), getScreenshot(targetScreenshotUrl)])
		.then(axios.spread(function (screenshotResp, targetScreenshotResp) {
			screenshotBuf = screenshotResp.data
			targetScreenshotBuf = targetScreenshotResp.data
		}))
	return {
		screenshotBuf: screenshotBuf,
		targetScreenshotBuf: targetScreenshotBuf
	}
}

const getScreenshot = (url) => {
	return axios.get(url, {responseType: 'arraybuffer'})
}

const getDiffImage = async (screenshotBuf, targetScreenshotBuf) => {
	let diffImage, diffImageBuf
	const options = {
		output: {
			errorColor: {
				red: 255,
				green: 0,
				blue: 255
			},
			errorType: "flatDifferenceIntensity",
			transparency: 0.3,
			largeImageThreshold: 0,
			useCrossOrigin: false,
			outputDiff: true
		},
		scaleToSameSize: false,
	}
	diffImageBuf = await compareImages(screenshotBuf, targetScreenshotBuf, options);
	diffImage = await Jimp.read(diffImageBuf.getBuffer())
	diffImage.background(0xFFFFFFFF);
	diffImageBuf = await diffImage.getBufferAsync(Jimp.MIME_JPEG)
	return diffImageBuf
}

const getBitmapImage = (screenshot, targetScreenshot) => {
	let bitmapRows, bitmapCols, intersectingRows, intersectingCols, bitmapPixels
	bitmapRows = Math.max(screenshot.rows, targetScreenshot.rows)
	bitmapCols = Math.max(screenshot.cols, targetScreenshot.cols)
	intersectingRows = Math.min(screenshot.rows, targetScreenshot.rows)
	intersectingCols = Math.min(screenshot.cols, targetScreenshot.cols)
	bitmapPixels = Array(bitmapRows).fill().map(() => Array(bitmapCols).fill(255))
	let screenshotPixels = new Uint8Array(screenshot.getData())
	let targetScreensohtPixels = new Uint8Array(targetScreenshot.getData())
	for( let row = 0; row < intersectingRows; row++) {
		for( let col = 0; col < intersectingCols; col++) {
			if (screenshotPixels[row * intersectingCols + col] == targetScreensohtPixels[row * intersectingCols + col]) {
				bitmapPixels[row][col] = 0
			}
		}
	}
	return new cv.Mat(bitmapPixels, cv.CV_8U)
}

const genRandomSequence = () => {
	return Math.floor(Math.random() *100000000000000)
}

const calPercentageDiff = (diffArea, bitmapWidth, bitmapHeight) => {
	return (diffArea / (bitmapWidth * bitmapHeight)) * 100
}

exports.calculateDiff = async (screenshotUrl, targetScreenshotUrl, request) => {
	let screenshot, targetScreenshot, bitmapImage, kernel, cannyImage, morphedImage, contours, coordinates, percentageDiff, screenshotBuf, targetScreenshotBuf
	let task = "SCREENSHOTDIFF"
	let seq_no = genRandomSequence()
	try {
		request.log([task],`${seq_no}- Reading Screenshots- screenshotURl- ${screenshotUrl}, targetScreenshotUrl ${targetScreenshotUrl}`)
		let resp = await getScreenshotsBufs(screenshotUrl, targetScreenshotUrl)
		screenshotBuf = resp.screenshotBuf
		targetScreenshotBuf = resp.targetScreenshotBuf
		if (screenshotBuf == null || targetScreenshotBuf == null) {
			throw Error("Screenshot Read Error")
		}
		screenshot = cv.imdecode(screenshotBuf).bgrToGray()
		targetScreenshot = cv.imdecode(targetScreenshotBuf).bgrToGray()
		request.log([task],`${seq_no}- Getting Bitmap Image`)
		bitmapImage = await getBitmapImage(screenshot, targetScreenshot)
		kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(20, 20), new cv.Point(-1,-1))
		request.log([task],`${seq_no}- Detecting Edges of Bitmap Image`)
		cannyImage = bitmapImage.canny(1, 254)
		morphedImage = cannyImage.morphologyEx(kernel, cv.MORPH_CLOSE, new cv.Point2(-1, -1), 1, cv.BORDER_CONSTANT)
		request.log([task],`${seq_no}- Finding Contours`)
		contours = morphedImage.findContours(cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE, new cv.Point2(0, 0))
		coordinates = new Array(contours.length)
		let diffArea = 0
		for (let iter=0; iter < contours.length; iter++) {
			let rect  = contours[iter].boundingRect()
			diffArea += rect.width * rect.height
			let coordinate = new Array(rect.x, rect.y, rect.x + rect.width, rect.y + rect.height)
			coordinates[iter] = coordinate
		}
		percentageDiff = calPercentageDiff(diffArea, bitmapImage.cols, bitmapImage.rows)
		request.log([task],`${seq_no}- Getting DiffImage`)
		let diffImage = await getDiffImage(screenshotBuf, targetScreenshotBuf)
		request.log([task],`${seq_no}- Task Completed`)
		screenshot.release()
		targetScreenshot.release()
		bitmapImage.release()
		cannyImage.release()
		morphedImage.release()
		return {
			diffImage: diffImage.toString('base64'),
			coordinates: coordinates,
			percentageDiff: percentageDiff
		}
	} catch (err) {
		request.log(['SCREENSHOTDIFFERROR'],`${seq_no}- screenshotUrl- ${screenshotUrl}, targetScreenshotUrl ${targetScreenshotUrl}, Error: ${err}`)
		throw err
	}
}


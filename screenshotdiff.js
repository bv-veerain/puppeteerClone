'use strict'
const cv = require('opencv4nodejs')
const axios = require('axios');
const fs = require('fs');

const readScreenshot = async (url) => {
	let imageData = await axios.get(url, {responseType: 'arraybuffer'})
	let imageDataBuffer = Buffer.from(imageData.data)
	return cv.imdecode(imageDataBuffer).bgrToGray()
}

const getBitmapImage = async (newScreenshot, oldScreenshot) => {	
	let bitmapRows, bitmapCols, rowMax, colMax, newScreenshotPixels, oldScreenshotPixels
	newScreenshotPixels = newScreenshot.rows * newScreenshot.cols
	oldScreenshotPixels = oldScreenshot.rows * oldScreenshot.cols
	if (newScreenshotPixels > oldScreenshotPixels) {
		bitmapRows = newScreenshot.rows
		bitmapCols = newScreenshot.cols
		rowMax = oldScreenshot.rows
		colMax = oldScreenshot.cols
	} else {
		bitmapRows = oldScreenshot.rows
		bitmapCols = oldScreenshot.cols
		rowMax = newScreenshot.rows
		colMax = newScreenshot.cols
	}
	let bitmapPixels = new Array(bitmapRows)
	for( let iter =0; iter < bitmapRows; iter++ ) { 
		bitmapPixels[iter] = new Array(bitmapCols).fill(0)
	}
	for( let row = 0; row < rowMax ; row++) {
		for ( let col = 0 ; col < colMax; col++) {
			if (newScreenshot.at(row, col) != oldScreenshot.at(row, col)) {
				bitmapPixels[row][col] = 255
			}
		}
	}
return new cv.Mat(bitmapPixels, cv.CV_8U)	
}

const genRandomSequence = () => {
  return Math.floor(Math.random() *100000000000000)
}

const calPercentageDiff = async (diffArea, bitmapWidth, bitmapHeight) => {
	return (diffArea / (bitmapWidth * bitmapHeight))
}

exports.diffCoordinatesAndChange = async (newScreenshotUrl, oldScreenshotUrl, request) => {
	let newScreenshot, oldScreenshot, bitmapImage, kernel, cannyImage, morphedImage, contours, coordinates, box, coordinate, percentageDiff
	let task = "SCREENSHOTDIFF"
	let seq_no = genRandomSequence()
	try {
		request.log([task],`${seq_no}- Reading Screenshots- NewScreenshotURl- ${newScreenshotUrl}, OldScreenshotUrl ${oldScreenshotUrl}`)
		newScreenshot = await readScreenshot(newScreenshotUrl)
		oldScreenshot = await readScreenshot(oldScreenshotUrl)
		if (newScreenshot == null || oldScreenshot == null) {
			throw Error("Screenshot Read Error")
		}
		request.log([task],`${seq_no}- Getting Bitmap Image`)
		bitmapImage = await getBitmapImage(newScreenshot, oldScreenshot)
		kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(8, 8), new cv.Point(1,1))
		request.log([task],`${seq_no}- Detecting Edges of Bitmap Image`)
		cannyImage = bitmapImage.canny(50,200)
		morphedImage = cannyImage.morphologyEx(kernel, cv.MORPH_CLOSE, new cv.Point2(7, 7), 1, cv.BORDER_CONSTANT)
		request.log([task],`${seq_no}- Finding Contours`)
		contours = morphedImage.findContours(cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE, new cv.Point2(0, 0))
		coordinates = new Array(contours.length)
		let diffArea = 0
		for (let iter=0; iter < contours.length; iter++) {
			box  = contours[iter].boundingRect()
			diffArea += box.width * box.height
			coordinate = new Array(box.x, box.y, box.width, box.height)
			coordinates[iter] = coordinate
		}
		percentageDiff = await calPercentageDiff(diffArea, bitmapImage.cols, bitmapImage.rows)
		return {
			coordinates: coordinates,
			percentageDiff: percentageDiff
		}
	} catch (err) {
		request.log(['SCREENSHOTDIFFERROR'],`${seq_no}- NewScreenshotURl- ${newScreenshotUrl}, OldScreenshotUrl ${oldScreenshotUrl}`)
		throw err
	}
}


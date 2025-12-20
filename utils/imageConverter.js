const sharp = require('sharp')
const path = require('path')
const fs = require('fs')

/**
 * Convert an image to WebP format
 * @param {string} inputPath - Path to the input image file
 * @param {string} outputPath - Path where the WebP file should be saved
 * @param {object} options - Conversion options (quality, maxWidth, maxHeight)
 * @returns {Promise<string>} - Path to the converted WebP file
 */
async function convertToWebP(inputPath, outputPath, options = {}) {
  try {
    const {
      quality = 85,
      maxWidth = 2000,
      maxHeight = 2000
    } = options


    const outputDir = path.dirname(outputPath)
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }


    await sharp(inputPath)
      .resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality })
      .toFile(outputPath)


    if (inputPath !== outputPath && !inputPath.toLowerCase().endsWith('.webp')) {
      try {
        fs.unlinkSync(inputPath)
      } catch (err) {
        console.error('Error deleting original file:', err)
      }
    }

    return outputPath
  } catch (error) {
    console.error('Error converting image to WebP:', error)
    throw error
  }
}

/**
 * Convert a buffer to WebP format
 * @param {Buffer} imageBuffer - Image buffer to convert
 * @param {string} outputPath - Path where the WebP file should be saved
 * @param {object} options - Conversion options
 * @returns {Promise<string>} - Path to the converted WebP file
 */
async function convertBufferToWebP(imageBuffer, outputPath, options = {}) {
  try {
    const {
      quality = 85,
      maxWidth = 2000,
      maxHeight = 2000
    } = options


    const outputDir = path.dirname(outputPath)
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }


    await sharp(imageBuffer)
      .resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality })
      .toFile(outputPath)

    return outputPath
  } catch (error) {
    console.error('Error converting buffer to WebP:', error)
    throw error
  }
}

module.exports = {
  convertToWebP,
  convertBufferToWebP
}




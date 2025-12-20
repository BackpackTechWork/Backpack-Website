const fs = require('fs')
const path = require('path')
const crypto = require('crypto')


const chunkStore = new Map()


setInterval(() => {
  const now = Date.now()
  for (const [uploadId, data] of chunkStore.entries()) {
    if (now - data.createdAt > 3600000) { 

      if (data.chunks) {
        data.chunks.forEach(chunkPath => {
          try {
            if (fs.existsSync(chunkPath)) {
              fs.unlinkSync(chunkPath)
            }
          } catch (err) {
            console.error('Error cleaning up chunk:', err)
          }
        })
      }
      chunkStore.delete(uploadId)
    }
  }
}, 600000) 

/**
 * Save a chunk of a file
 * @param {string} uploadId - Unique identifier for this upload
 * @param {number} chunkIndex - Index of this chunk (0-based)
 * @param {number} totalChunks - Total number of chunks
 * @param {Buffer} chunkData - The chunk data
 * @param {string} tempDir - Temporary directory for chunks
 * @returns {Promise<object>} - Upload status
 */
async function saveChunk(uploadId, chunkIndex, totalChunks, chunkData, tempDir) {
  try {

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }


    if (!chunkStore.has(uploadId)) {
      chunkStore.set(uploadId, {
        uploadId,
        totalChunks,
        receivedChunks: new Set(),
        chunks: [],
        createdAt: Date.now(),
        tempDir
      })
    }

    const uploadData = chunkStore.get(uploadId)


    const chunkPath = path.join(tempDir, `${uploadId}_chunk_${chunkIndex}`)
    fs.writeFileSync(chunkPath, chunkData)
    
    uploadData.chunks[chunkIndex] = chunkPath
    uploadData.receivedChunks.add(chunkIndex)


    const isComplete = uploadData.receivedChunks.size === totalChunks

    return {
      uploadId,
      chunkIndex,
      totalChunks,
      received: uploadData.receivedChunks.size,
      isComplete
    }
  } catch (error) {
    console.error('Error saving chunk:', error)
    throw error
  }
}

/**
 * Reassemble chunks into a complete file
 * @param {string} uploadId - Unique identifier for this upload
 * @param {string} outputPath - Path where the complete file should be saved
 * @returns {Promise<string>} - Path to the reassembled file
 */
async function reassembleChunks(uploadId, outputPath) {
  try {
    const uploadData = chunkStore.get(uploadId)
    
    if (!uploadData) {
      throw new Error(`Upload ${uploadId} not found`)
    }

    if (uploadData.receivedChunks.size !== uploadData.totalChunks) {
      throw new Error(`Not all chunks received. Got ${uploadData.receivedChunks.size} of ${uploadData.totalChunks}`)
    }


    const outputDir = path.dirname(outputPath)
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }


    const writeStream = fs.createWriteStream(outputPath)


    for (let i = 0; i < uploadData.totalChunks; i++) {
      const chunkPath = uploadData.chunks[i]
      if (!chunkPath || !fs.existsSync(chunkPath)) {
        throw new Error(`Chunk ${i} not found`)
      }

      const chunkData = fs.readFileSync(chunkPath)
      writeStream.write(chunkData)
    }

    writeStream.end()


    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve)
      writeStream.on('error', reject)
    })


    uploadData.chunks.forEach(chunkPath => {
      try {
        if (fs.existsSync(chunkPath)) {
          fs.unlinkSync(chunkPath)
        }
      } catch (err) {
        console.error('Error deleting chunk:', err)
      }
    })


    chunkStore.delete(uploadId)

    return outputPath
  } catch (error) {

    const uploadData = chunkStore.get(uploadId)
    if (uploadData) {
      uploadData.chunks.forEach(chunkPath => {
        try {
          if (fs.existsSync(chunkPath)) {
            fs.unlinkSync(chunkPath)
          }
        } catch (err) {
          console.error('Error cleaning up chunk:', err)
        }
      })
      chunkStore.delete(uploadId)
    }
    throw error
  }
}

/**
 * Clean up an upload (remove all chunks)
 * @param {string} uploadId - Unique identifier for this upload
 */
function cleanupUpload(uploadId) {
  const uploadData = chunkStore.get(uploadId)
  if (uploadData) {
    uploadData.chunks.forEach(chunkPath => {
      try {
        if (fs.existsSync(chunkPath)) {
          fs.unlinkSync(chunkPath)
        }
      } catch (err) {
        console.error('Error cleaning up chunk:', err)
      }
    })
    chunkStore.delete(uploadId)
  }
}

/**
 * Generate a unique upload ID
 * @returns {string}
 */
function generateUploadId() {
  return crypto.randomBytes(16).toString('hex')
}

module.exports = {
  saveChunk,
  reassembleChunks,
  cleanupUpload,
  generateUploadId
}




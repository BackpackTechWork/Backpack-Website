const fs = require("fs")
const fsp = require("fs").promises
const path = require("path")

// In-memory cache for project images to avoid repeated disk I/O
const imageCache = new Map()
const CACHE_TTL = 60 * 1000 // 1 minute cache

/**
 * Get project images asynchronously with caching
 * @param {string} projectId - The project ID
 * @param {string} basePath - Base path to the Projects folder
 * @returns {Promise<{thumbnail: string|null, images: string[]}>}
 */
async function getProjectImages(projectId, basePath) {
  const cacheKey = `project_${projectId}`
  const cached = imageCache.get(cacheKey)
  
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    return cached.data
  }

  const imagesDir = path.join(basePath, projectId.toString())
  const result = { thumbnail: null, images: [] }

  try {
    await fsp.access(imagesDir)
    const files = await fsp.readdir(imagesDir)
    
    const imageFiles = files.filter(f => 
      f.startsWith('image_') || f.startsWith('project_image_')
    )
    
    result.images = imageFiles.map(filename => 
      `/images/Projects/${projectId}/${filename}`
    )
    
    if (result.images.length > 0) {
      result.thumbnail = result.images[0]
    }
  } catch (err) {
    // Directory doesn't exist or isn't accessible - return empty
  }

  imageCache.set(cacheKey, { data: result, timestamp: Date.now() })
  return result
}

/**
 * Process multiple projects' images in parallel
 * @param {Array} projects - Array of project objects
 * @param {string} basePath - Base path to the Projects folder
 * @returns {Promise<void>} - Modifies projects in place
 */
async function processProjectImages(projects, basePath) {
  await Promise.all(projects.map(async (project) => {
    if (project.cover_image) {
      project.thumbnail = `/images/Projects/${project.id}/${project.cover_image}`
    }
    
    const imageData = await getProjectImages(project.id, basePath)
    
    if (!project.thumbnail && imageData.thumbnail) {
      project.thumbnail = imageData.thumbnail
    }
    
    project.images = imageData.images
  }))
}

/**
 * Check if a file/directory exists asynchronously
 * @param {string} filePath - Path to check
 * @returns {Promise<boolean>}
 */
async function fileExists(filePath) {
  try {
    await fsp.access(filePath)
    return true
  } catch {
    return false
  }
}

/**
 * Read directory contents asynchronously
 * @param {string} dirPath - Directory path
 * @returns {Promise<string[]>} - Array of filenames or empty array if dir doesn't exist
 */
async function readDirSafe(dirPath) {
  try {
    return await fsp.readdir(dirPath)
  } catch {
    return []
  }
}

/**
 * Invalidate cache for a specific project
 * @param {string|number} projectId 
 */
function invalidateProjectCache(projectId) {
  imageCache.delete(`project_${projectId}`)
}

/**
 * Clear entire image cache
 */
function clearImageCache() {
  imageCache.clear()
}

module.exports = {
  getProjectImages,
  processProjectImages,
  fileExists,
  readDirSafe,
  invalidateProjectCache,
  clearImageCache
}


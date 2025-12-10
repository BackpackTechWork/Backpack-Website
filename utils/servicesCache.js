const db = require("../config/database")


let servicesCache = null
let cacheTimestamp = null
const CACHE_TTL = 5 * 60 * 1000 

/**
 * Get services from cache or database
 * @returns {Promise<Array>} Array of services
 */
async function getServices() {

  if (servicesCache && cacheTimestamp) {
    const age = Date.now() - cacheTimestamp
    if (age < CACHE_TTL) {
      return servicesCache
    }
  }


  try {
    const [services] = await db.query(
      "SELECT id, title, slug FROM services WHERE is_active = true ORDER BY display_order"
    )
    servicesCache = services || []
    cacheTimestamp = Date.now()
    return servicesCache
  } catch (error) {
    console.error("Error fetching services for cache:", error)

    return servicesCache || []
  }
}

/**
 * Invalidate the cache - forces refresh on next request
 */
function invalidateCache() {
  servicesCache = null
  cacheTimestamp = null
}

/**
 * Refresh the cache immediately
 * @returns {Promise<Array>} Array of services
 */
async function refreshCache() {
  invalidateCache()
  return await getServices()
}

module.exports = {
  getServices,
  invalidateCache,
  refreshCache,
}






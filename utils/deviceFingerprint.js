const crypto = require('crypto')

/**
 * Generate a device fingerprint from request headers and user agent
 * This creates a unique identifier for each device/browser combination
 */
function generateDeviceFingerprint(req) {
  const userAgent = req.headers['user-agent'] || ''
  const acceptLanguage = req.headers['accept-language'] || ''
  const acceptEncoding = req.headers['accept-encoding'] || ''
  
  // Combine various headers to create a unique fingerprint
  const fingerprintString = `${userAgent}|${acceptLanguage}|${acceptEncoding}`
  
  // Create a hash of the fingerprint string
  const hash = crypto.createHash('sha256').update(fingerprintString).digest('hex')
  
  return hash.substring(0, 32) // Use first 32 characters for shorter ID
}

/**
 * Get or generate device ID from cookie or generate a new one
 */
function getDeviceId(req, res) {
  // Try to get device ID from cookie first
  let deviceId = req.cookies?.device_id
  
  // If no device ID exists, generate one and set it in cookie
  if (!deviceId) {
    deviceId = generateDeviceFingerprint(req)
    
    // Set cookie with 1 year expiration
    res.cookie('device_id', deviceId, {
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
      httpOnly: false, // Allow JavaScript access for client-side use
      secure: process.env.NODE_ENV === 'production', // Secure in production
      sameSite: 'lax'
    })
  }
  
  return deviceId
}

module.exports = {
  generateDeviceFingerprint,
  getDeviceId
}



function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next()
  }
  req.flash("error_msg", "Please log in to view this resource")

  // Save the intended URL to both session and cookie (cookie for OAuth persistence)
  if (!req.originalUrl.startsWith('/auth/login') && 
      !req.originalUrl.startsWith('/staff/login') &&
      !req.originalUrl.startsWith('/auth/signup')) {
    req.session.returnTo = req.originalUrl
    // Also save to cookie for OAuth flows where session might not persist
    res.cookie('returnTo', req.originalUrl, { 
      httpOnly: true, 
      maxAge: 10 * 60 * 1000, // 10 minutes
      sameSite: 'lax'
    })
  }

  if (req.originalUrl.startsWith('/team') || req.originalUrl.startsWith('/admin')) {
    res.redirect("/staff/login")
  } else {
    res.redirect("/auth/login")
  }
}


function ensureClient(req, res, next) {
  if (req.isAuthenticated() && req.user.role === "client") {
    return next()
  }
  req.flash("error_msg", "Access denied")
  res.redirect("/")
}


async function verifyUserExists(req, res, next) {
  if (!req.isAuthenticated() || !req.user) {
    return next()
  }

  // The user was already verified by passport's deserializeUser which uses caching.
  // If req.user is false (set by deserializeUser when user not found), handle logout.
  // This avoids an additional redundant database query.
  if (req.user === false) {
    if (typeof req.logout === 'function') {
      req.logout((err) => {
        if (err) console.error("Error logging out deleted user:", err)
      })
    }
    
    req.session.destroy((err) => {
      if (err) console.error("Error destroying session:", err)
    })
    
    req.user = null
    
    return res.redirect("/")
  }
  
  // User exists and is valid (already verified by deserializeUser)
  return next()
}


// In-memory cache to track when we last updated each user's last_active
// This avoids hitting the database on every single request
const lastActiveCache = new Map()
const LAST_ACTIVE_INTERVAL = 60 * 60 * 1000 // 1 hour in milliseconds

async function updateLastActive(req, res, next) {
  if (req.isAuthenticated() && req.user && req.user.id) {
    const userId = req.user.id
    const now = Date.now()
    const lastUpdate = lastActiveCache.get(userId)
    
    // Only hit the database if we haven't updated this user in the last hour
    if (!lastUpdate || (now - lastUpdate) >= LAST_ACTIVE_INTERVAL) {
      // Update cache immediately to prevent concurrent requests from all hitting DB
      lastActiveCache.set(userId, now)
      
      // Fire and forget - don't await, let it run in background
      const db = require("../config/database")
      db.query(
        "UPDATE users SET last_active = NOW() WHERE id = ?",
        [userId]
      ).catch(error => {
        console.error("Error updating last_active:", error)
        // Remove from cache on error so next request will retry
        lastActiveCache.delete(userId)
      })
    }
  }
  next()
}

function ensureAdmin(req, res, next) {
  if (req.isAuthenticated() && req.user.role === "admin") {
    return next()
  }
  

  // Check for API request indicators (case-insensitive)
  const contentType = req.headers['content-type'] || req.headers['Content-Type'] || ''
  const accept = req.headers['accept'] || req.headers['Accept'] || ''
  const xRequestedWith = req.headers['x-requested-with'] || req.headers['X-Requested-With'] || ''
  
  const isApiRequest = 
      contentType.toLowerCase().includes('application/json') || 
      accept.toLowerCase().includes('application/json') ||
      xRequestedWith.toLowerCase() === 'xmlhttprequest' ||
      req.path.includes('/api/') ||
      req.originalUrl.includes('/api/') ||
      req.url.includes('/api/') ||
      (req.method === 'POST' && (req.path.includes('/reorder') || req.originalUrl.includes('/reorder') || req.url.includes('/reorder')))
  
  if (isApiRequest) {
    return res.status(401).json({ 
      success: false, 
      message: "Admin access required. Please log in." 
    })
  }
  
  // Save the intended URL to both session and cookie
  if (!req.originalUrl.startsWith('/staff/login')) {
    req.session.returnTo = req.originalUrl
    // Also save to cookie for persistence
    res.cookie('returnTo', req.originalUrl, { 
      httpOnly: true, 
      maxAge: 10 * 60 * 1000, // 10 minutes
      sameSite: 'lax'
    })
  }
  
  req.flash("error_msg", "Admin access required")
  res.redirect("/staff/login")
}


function ensureTeamOrAdmin(req, res, next) {
  if (req.isAuthenticated() && (req.user.role === "team_member" || req.user.role === "admin")) {
    return next()
  }
  
  // Save the intended URL to both session and cookie
  if (!req.originalUrl.startsWith('/staff/login')) {
    req.session.returnTo = req.originalUrl
    // Also save to cookie for persistence
    res.cookie('returnTo', req.originalUrl, { 
      httpOnly: true, 
      maxAge: 10 * 60 * 1000, // 10 minutes
      sameSite: 'lax'
    })
  }
  
  req.flash("error_msg", "Access denied")
  res.redirect("/staff/login")
}

module.exports = {
  ensureAuthenticated,
  ensureClient,
  ensureAdmin,
  ensureTeamOrAdmin,
  verifyUserExists,
  updateLastActive,
}

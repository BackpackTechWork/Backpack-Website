
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

  try {
    const db = require("../config/database")
    const [users] = await db.query("SELECT id, role FROM users WHERE id = ?", [req.user.id])
    
    if (users.length === 0) {


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
    

    return next()
  } catch (error) {
    console.error("Error verifying user exists:", error)

    return next()
  }
}


async function updateLastActive(req, res, next) {
  if (req.isAuthenticated() && req.user && req.user.id) {
    try {
      const db = require("../config/database")


      await db.query(
        "UPDATE users SET last_active = NOW() WHERE id = ? AND (last_active IS NULL OR TIMESTAMPDIFF(HOUR, last_active, NOW()) >= 1)",
        [req.user.id]
      )
    } catch (error) {

      console.error("Error updating last_active:", error)
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

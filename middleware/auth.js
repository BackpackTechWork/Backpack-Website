
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next()
  }
  req.flash("error_msg", "Please log in to view this resource")

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


function ensureAdmin(req, res, next) {
  if (req.isAuthenticated() && req.user.role === "admin") {
    return next()
  }
  

  if (req.headers['content-type']?.includes('application/json') || 
      req.headers['accept']?.includes('application/json') ||
      req.path.includes('/api/') ||
      req.method === 'POST' && req.path.includes('/reorder')) {
    return res.status(401).json({ 
      success: false, 
      message: "Admin access required. Please log in." 
    })
  }
  
  req.flash("error_msg", "Admin access required")
  res.redirect("/staff/login")
}


function ensureTeamOrAdmin(req, res, next) {
  if (req.isAuthenticated() && (req.user.role === "team_member" || req.user.role === "admin")) {
    return next()
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
}

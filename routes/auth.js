const express = require("express")
const router = express.Router()
const passport = require("passport")

function isStrategyAvailable(name) {
  return Boolean(passport._strategies && passport._strategies[name])
}


router.get("/login", (req, res) => {
  if (req.isAuthenticated()) {
    // If already logged in, check for returnTo first
    const redirectTo = req.cookies.returnTo || req.session.returnTo
    if (redirectTo) {
      res.clearCookie('returnTo')
      delete req.session.returnTo
      return res.redirect(redirectTo)
    }
    // Otherwise use default
    return res.redirect("/client/portfolio")
  }
  res.render("auth/login", { title: "Login - Backpack Tech Works" })
})


router.get("/signup", (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect("/client/portfolio")
  }
  res.render("auth/signup", { title: "Sign Up - Backpack Tech Works" })
})


router.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err)
    }
    req.flash("success_msg", "You have been logged out")
    res.redirect("/")
  })
})


router.get("/google", (req, res, next) => {
  if (!isStrategyAvailable("google")) {
    return res.status(503).send("Google OAuth not configured")
  }
  return passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next)
})

router.get(
  "/google/callback",
  (req, res, next) => {
    if (!isStrategyAvailable("google")) {
      return res.status(503).send("Google OAuth not configured")
    }
    return passport.authenticate("google", { 
      failureRedirect: "/auth/login", 
      failureFlash: true,
      successFlash: false
    }, (err, user, info) => {
      if (err) {
        req.flash("error_msg", err.message || "Authentication failed")
        return res.redirect("/auth/login")
      }
      if (!user) {
        req.flash("error_msg", info?.message || "Authentication failed")
        return res.redirect("/auth/login")
      }
      req.login(user, (loginErr) => {
        if (loginErr) {
          return next(loginErr)
        }
        // Get returnTo from cookie first (most reliable for OAuth), then session, then default
        const redirectTo = req.cookies.returnTo || req.session.returnTo || "/client/portfolio"
        // Clear both cookie and session
        res.clearCookie('returnTo')
        delete req.session.returnTo
        return res.redirect(redirectTo)
      })
    })(req, res, next)
  },
)


router.get("/github", (req, res, next) => {
  if (!isStrategyAvailable("github")) {
    return res.status(503).send("GitHub OAuth not configured")
  }
  return passport.authenticate("github", { scope: ["user:email"] })(req, res, next)
})

router.get(
  "/github/callback",
  (req, res, next) => {
    if (!isStrategyAvailable("github")) {
      return res.status(503).send("GitHub OAuth not configured")
    }
    return passport.authenticate("github", { 
      failureRedirect: "/auth/login", 
      failureFlash: true,
      successFlash: false
    }, (err, user, info) => {
      if (err) {
        req.flash("error_msg", err.message || "Authentication failed")
        return res.redirect("/auth/login")
      }
      if (!user) {
        req.flash("error_msg", info?.message || "Authentication failed")
        return res.redirect("/auth/login")
      }
      req.login(user, (loginErr) => {
        if (loginErr) {
          return next(loginErr)
        }
        // Get returnTo from cookie first (most reliable for OAuth), then session, then default
        const redirectTo = req.cookies.returnTo || req.session.returnTo || "/client/portfolio"
        // Clear both cookie and session
        res.clearCookie('returnTo')
        delete req.session.returnTo
        return res.redirect(redirectTo)
      })
    })(req, res, next)
  },
)

module.exports = router


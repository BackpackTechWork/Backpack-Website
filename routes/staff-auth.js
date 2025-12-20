const express = require("express")
const router = express.Router()
const passport = require("passport")
const bcrypt = require("bcrypt")
const db = require("../config/database")


router.get("/login", (req, res) => {
  if (req.isAuthenticated()) {

    if (req.user.role === "admin") {
      return res.redirect("/admin/dashboard")
    } else if (req.user.role === "team_member") {
      return res.redirect("/")
    }
    return res.redirect("/")
  }
  res.render("auth/staff-login", { title: "Staff Login - Backpack Tech Works" })
})


router.post("/login", async (req, res, next) => {
  const { email, password } = req.body

  try {

    const [users] = await db.query("SELECT * FROM users WHERE email = ? AND (role = ? OR role = ?)", [
      email,
      "admin",
      "team_member",
    ])

    if (users.length === 0) {
      req.flash("error_msg", "Invalid email or password")
      return res.redirect("/staff/login")
    }

    const user = users[0]


    if (!user.password) {
      req.flash("error_msg", "This account uses OAuth authentication. Please use the client login.")
      return res.redirect("/staff/login")
    }


    const isMatch = await bcrypt.compare(password, user.password)

    if (!isMatch) {
      req.flash("error_msg", "Invalid email or password")
      return res.redirect("/staff/login")
    }


    await db.query("UPDATE users SET last_login = NOW() WHERE id = ?", [user.id])

    req.login(user, (err) => {
      if (err) {
        return next(err)
      }


      if (user.role === "admin") {
        return res.redirect("/admin/dashboard")
      } else if (user.role === "team_member") {
        return res.redirect("/")
      }


      res.redirect("/")
    })
  } catch (error) {
    console.error("Staff login error:", error)
    req.flash("error_msg", "An error occurred during login")
    res.redirect("/staff/login")
  }
})


router.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err)
    }
    req.flash("success_msg", "You have been logged out")
    res.redirect("/staff/login")
  })
})

module.exports = router




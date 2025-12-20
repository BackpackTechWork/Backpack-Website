require("dotenv").config()
const express = require("express")
const session = require("express-session")
const passport = require("passport")
const flash = require("express-flash")
const methodOverride = require("method-override")
const path = require("path")

const app = express()
const PORT = process.env.PORT || 3000
const SESSION_SECRET = process.env.SESSION_SECRET || "dev_secret_change_me"


require("./config/passport")
const { getServices } = require("./utils/servicesCache")


const authRoutes = require("./routes/auth")
const staffAuthRoutes = require("./routes/staff-auth")
const indexRoutes = require("./routes/index")
const serviceRoutes = require("./routes/services")
const teamRoutes = require("./routes/team")
const clientRoutes = require("./routes/client")
const adminRoutes = require("./routes/admin")


app.set("view engine", "ejs")
app.set("views", path.join(__dirname, "views"))


const ejs = require("ejs")
const fs = require("fs")
app.engine("ejs", (filePath, options, callback) => {

  const include = (file) => {

    let fullPath
    if (path.isAbsolute(file)) {
      fullPath = file
    } else {

      const relativePath = path.resolve(path.dirname(filePath), file)
      if (fs.existsSync(relativePath)) {
        fullPath = relativePath
      } else if (fs.existsSync(relativePath + ".ejs")) {
        fullPath = relativePath + ".ejs"
      } else {

        const viewsPath = path.resolve(app.get("views"), file)
        if (fs.existsSync(viewsPath)) {
          fullPath = viewsPath
        } else if (fs.existsSync(viewsPath + ".ejs")) {
          fullPath = viewsPath + ".ejs"
        } else {
          throw new Error(`Include file not found: ${file}`)
        }
      }
    }
    
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Include file not found: ${file}`)
    }
    
    const template = fs.readFileSync(fullPath, "utf8")

    return ejs.render(template, options)
  }
  
  ejs.renderFile(
    filePath,
    { ...options, include },
    callback
  )
})


app.use(express.static(path.join(__dirname, "public")))
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(methodOverride("_method"))


app.use((req, res, next) => {

  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader(
    'Content-Security-Policy',
    `
      default-src 'self';
      script-src 'self' https: 'unsafe-inline';
      style-src 'self' https: 'unsafe-inline';
      img-src 'self' data: https:;
      font-src 'self' https: data:;
      connect-src 'self' https:;
      frame-src 'self' https://www.youtube.com https://youtube.com https://youtu.be https://player.vimeo.com https://vimeo.com;
      frame-ancestors 'self';
    `.replace(/\s+/g, ' ')
  )
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
  

  if (req.path.endsWith('.xml') || req.path === '/sitemap.xml') {
    res.setHeader('Content-Type', 'application/xml; charset=utf-8')
  }
  if (req.path === '/robots.txt') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  }
  
  next()
})


app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, 
    },
  }),
)


app.use(flash())


app.use(passport.initialize())
app.use(passport.session())


app.use((req, res, next) => {

  if (req.user === false) {

    req.user = null

    if (typeof req.logout === 'function') {
      req.logout((err) => {
        if (err) console.error("Error logging out deleted user:", err)
      })
    }

    if (req.session && req.session.passport) {
      delete req.session.passport.user
    }
  }
  
  res.locals.user = req.user || null
  res.locals.success_msg = req.flash("success_msg")
  res.locals.error_msg = req.flash("error_msg")
  res.locals.error = req.flash("error")
  res.locals.currentPath = req.originalUrl || req.path || '/'
  res.locals.req = req
  next()
})


const { updateLastActive } = require("./middleware/auth")
app.use(updateLastActive)


app.use(async (req, res, next) => {
  try {
    res.locals.footerServices = await getServices()
  } catch (error) {
    console.error("Error fetching services for footer:", error)
    res.locals.footerServices = []
  }
  next()
})


app.use("/", indexRoutes)
app.use("/auth", authRoutes)
app.use("/staff", staffAuthRoutes)
app.use("/services", serviceRoutes)
app.use("/team", teamRoutes)
app.use("/client", clientRoutes)
app.use("/admin", adminRoutes)


app.use((req, res) => {
  res.status(404).render("404", { 
    title: "Page Not Found",
    user: req.user || null, 
  })
})


app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).render("error", {
    title: "Error",
    message: "Something went wrong!",
    error: process.env.NODE_ENV === "development" ? err : {},
    user: req.user || null, 
  })
})

app.listen(PORT, "0.0.0.0", () => {
  const os = require("os")
  const networkInterfaces = os.networkInterfaces()
  let localIP = "N/A"
  

  for (const interfaceName of Object.keys(networkInterfaces)) {
    const addresses = networkInterfaces[interfaceName]
    for (const address of addresses) {

      const isIPv4 = address.family === "IPv4" || address.family === 4
      if (isIPv4 && !address.internal) {
        localIP = address.address
        break
      }
    }
    if (localIP !== "N/A") break
  }
  
  console.log("\n" + "=".repeat(60))
  console.log("  📦 Backpack Tech Works Server")
  console.log("=".repeat(60))
  console.log(`  ✅ Server running successfully`)
  console.log(`  🏠 Local:   http://localhost:${PORT}`)
  if (localIP !== "N/A") {
    console.log(`  🌐 Network: http://${localIP}:${PORT}`)
  }
  console.log("=".repeat(60) + "\n")
})


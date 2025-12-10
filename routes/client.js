const express = require("express")
const router = express.Router()
const { ensureAuthenticated, ensureClient, verifyUserExists } = require("../middleware/auth")
const db = require("../config/database")
const fs = require("fs")
const path = require("path")


router.get("/portfolio", ensureAuthenticated, verifyUserExists, async (req, res) => {
  try {

    const [clients] = await db.query(`
      SELECT u.*, b.name as brand_name, b.logo as brand_logo
      FROM users u
      LEFT JOIN brands b ON u.brand_id = b.id
      WHERE u.id = ? AND u.role = 'client'
    `, [req.user.id])

    if (clients.length === 0) {
      return res.redirect("/")
    }

    const client = clients[0]


    const [projects] = await db.query(`
      SELECT p.*, s.title as service_title, s.slug as service_slug
      FROM projects p
      LEFT JOIN services s ON p.service_id = s.id
      WHERE p.client_id = ?
      ORDER BY p.created_at DESC
    `, [req.user.id])


    projects.forEach(project => {
      if (project.cover_image) {
        project.image = `/images/Projects/${project.id}/${project.cover_image}`
      } else {

        const imagesDir = path.join(__dirname, "../public/images/Projects", project.id.toString())
        if (fs.existsSync(imagesDir)) {
          const images = fs.readdirSync(imagesDir).filter(f => f.startsWith('image_'))
          if (images.length > 0) {
            project.image = `/images/Projects/${project.id}/${images[0]}`
          }
        }
      }
    })


    const [inquiries] = await db.query(`
      SELECT * FROM inquiries
      WHERE user_id = ?
      ORDER BY created_at DESC
    `, [req.user.id])

    res.render("client/portfolio", {
      title: "My Portfolio - Backpack Tech Works",
      client,
      projects: projects || [],
      inquiries: inquiries || [],
      user: req.user
    })
  } catch (error) {
    console.error("Error loading portfolio:", error)
    res.render("client/portfolio", {
      title: "My Portfolio - Backpack Tech Works",
      client: req.user,
      projects: [],
      inquiries: [],
      user: req.user
    })
  }
})


router.get("/profile", ensureAuthenticated, verifyUserExists, (req, res) => {
  res.render("client/profile", {
    title: "My Profile - Backpack Tech Works",
  })
})


router.post("/profile", ensureAuthenticated, verifyUserExists, async (req, res) => {
  try {
    const { name, phone } = req.body


    await db.query(
      "UPDATE users SET name = ?, phone = ? WHERE id = ?",
      [name, phone || null, req.user.id]
    )

    res.json({ success: true, message: "Profile updated successfully" })
  } catch (error) {
    console.error("Error updating profile:", error)
    res.status(500).json({ success: false, message: "Error updating profile" })
  }
})


router.get("/projects", ensureAuthenticated, verifyUserExists, async (req, res) => {
  try {
    const searchQuery = req.query.search || ""
    const serviceFilter = req.query.service || ""


    let whereConditions = ["p.client_id = ?"]
    let queryParams = [req.user.id]


    if (searchQuery) {
      whereConditions.push("(p.title LIKE ? OR p.description LIKE ?)")
      const searchPattern = `%${searchQuery}%`
      queryParams.push(searchPattern, searchPattern)
    }


    if (serviceFilter) {
      whereConditions.push("p.service_id = ?")
      queryParams.push(serviceFilter)
    }

    const [projects] = await db.query(`
      SELECT p.*, 
        s.title as service_title,
        s.slug as service_slug,
        s.id as service_id
      FROM projects p
      LEFT JOIN services s ON p.service_id = s.id
      WHERE ${whereConditions.join(" AND ")}
      ORDER BY p.created_at DESC
    `, queryParams)


    const [allServices] = await db.query(`
      SELECT DISTINCT s.id, s.title, s.slug
      FROM services s
      INNER JOIN projects p ON s.id = p.service_id
      WHERE p.client_id = ?
      ORDER BY s.title ASC
    `, [req.user.id])


    projects.forEach(project => {
      if (project.cover_image) {
        project.image = `/images/Projects/${project.id}/${project.cover_image}`
      } else {

        const imagesDir = path.join(__dirname, "../public/images/Projects", project.id.toString())
        if (fs.existsSync(imagesDir)) {
          const images = fs.readdirSync(imagesDir).filter(f => f.startsWith('image_'))
          if (images.length > 0) {
            project.image = `/images/Projects/${project.id}/${images[0]}`
          }
        }
      }
    })

    res.render("client/projects", {
      title: "My Projects - Backpack Tech Works",
      projects: projects || [],
      services: allServices || [],
      searchQuery: searchQuery,
      selectedService: serviceFilter,
    })
  } catch (error) {
    console.error(error)
    res.render("client/projects", {
      title: "My Projects - Backpack Tech Works",
      projects: [],
      services: [],
      searchQuery: "",
      selectedService: "",
    })
  }
})


router.get("/projects/:identifier", ensureAuthenticated, verifyUserExists, async (req, res) => {
  try {
    const { identifier } = req.params
    const numericId = Number(identifier)

    const [projects] = await db.query(`
      SELECT p.*, 
        s.title as service_title,
        s.slug as service_slug,
        s.icon as service_icon
      FROM projects p
      LEFT JOIN services s ON p.service_id = s.id
      WHERE p.client_id = ?
        AND (p.slug = ? OR p.id = ?)
      LIMIT 1
    `, [req.user.id, identifier, !isNaN(numericId) ? numericId : 0])

    if (projects.length === 0) {
      return res.status(404).render("404", {
        title: "Project Not Found - Backpack Tech Works",
      })
    }

    const project = projects[0]


    let technologies = []
    if (project.technologies) {
      try {
        technologies = Array.isArray(project.technologies)
          ? project.technologies
          : JSON.parse(project.technologies)
      } catch (error) {
        technologies = []
      }
    }
    project.technologies = technologies


    const imagesDir = path.join(__dirname, "../public/images/Projects", project.id.toString())
    let imageGallery = []

    if (fs.existsSync(imagesDir)) {
      imageGallery = fs.readdirSync(imagesDir)
        .filter(filename => filename.startsWith("image_"))
        .map(filename => `/images/Projects/${project.id}/${filename}`)
    }


    let coverImagePath = null
    if (project.cover_image) {
      coverImagePath = `/images/Projects/${project.id}/${project.cover_image}`
    }
    

    if (!coverImagePath && imageGallery.length > 0) {
      coverImagePath = imageGallery[0]
    }


    if (coverImagePath && coverImagePath.startsWith(`/images/Projects/${project.id}/`)) {
      if (!imageGallery.includes(coverImagePath)) {

        imageGallery.unshift(coverImagePath)
      } else {

        const coverIndex = imageGallery.indexOf(coverImagePath)
        if (coverIndex > 0) {
          imageGallery.splice(coverIndex, 1)
          imageGallery.unshift(coverImagePath)
        }
      }
    }

    project.images = imageGallery
    project.cover_image_path = coverImagePath


    const [milestones] = await db.query(
      `SELECT * FROM project_milestones 
       WHERE project_id = ? 
       ORDER BY display_order, created_at`,
      [project.id]
    )

    let totalTasks = 0
    let completedTasks = 0

    for (const milestone of milestones) {
      const [tasks] = await db.query(
        `SELECT * FROM milestone_tasks 
         WHERE milestone_id = ? 
         ORDER BY display_order, created_at`,
        [milestone.id]
      )
      milestone.tasks = tasks || []

      const milestoneCompleted = milestone.tasks.filter(task => task.is_completed).length
      milestone.progress = milestone.tasks.length > 0
        ? Math.round((milestoneCompleted / milestone.tasks.length) * 100)
        : (milestone.status === "Completed" ? 100 : 0)

      totalTasks += milestone.tasks.length
      completedTasks += milestoneCompleted
    }

    project.milestones = milestones

    const overallProgress = totalTasks > 0
      ? Math.round((completedTasks / totalTasks) * 100)
      : (milestones.every(m => m.status === "Completed") && milestones.length > 0 ? 100 : 0)

    const timelineStats = {
      totalMilestones: milestones.length,
      totalTasks,
      completedTasks,
      progress: overallProgress,
      status: project.status || (overallProgress === 100 ? "completed" : "in_progress"),
    }

    res.render("client/project-detail", {
      title: `${project.title || "Project"} - Backpack Tech Works`,
      project,
      timelineStats,
      user: req.user,
    })
  } catch (error) {
    console.error("Error loading client project detail:", error)
    res.status(500).render("error", {
      title: "Error - Backpack Tech Works",
      message: "Unable to load project details at the moment.",
    })
  }
})


router.get("/inquiries", ensureAuthenticated, verifyUserExists, async (req, res) => {
  try {
    const searchQuery = req.query.search || ""
    const statusFilter = req.query.status || ""


    let whereConditions = ["user_id = ?"]
    let queryParams = [req.user.id]


    if (searchQuery) {
      whereConditions.push("(subject LIKE ? OR message LIKE ?)")
      const searchPattern = `%${searchQuery}%`
      queryParams.push(searchPattern, searchPattern)
    }


    if (statusFilter) {
      whereConditions.push("status = ?")
      queryParams.push(statusFilter)
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : ""

    const [inquiries] = await db.query(
      `SELECT * FROM inquiries ${whereClause} ORDER BY created_at DESC`,
      queryParams
    )

    res.render("client/inquiries", {
      title: "My Inquiries - Backpack Tech Works",
      inquiries: inquiries || [],
      searchQuery,
      selectedStatus: statusFilter,
    })
  } catch (error) {
    console.error(error)
    res.render("client/inquiries", {
      title: "My Inquiries - Backpack Tech Works",
      inquiries: [],
      searchQuery: "",
      selectedStatus: "",
    })
  }
})


router.get("/games", ensureAuthenticated, verifyUserExists, (req, res) => {
  res.render("client/games", {
    title: "Games - Backpack Tech Works",
  })
})


router.get("/games/:gameName", ensureAuthenticated, verifyUserExists, (req, res) => {
  const { gameName } = req.params
  const validGames = ['bounce', 'snake', 'tetris', 'defender', 'pacman', 'puzzle', 'spider']
  
  if (!validGames.includes(gameName)) {
    return res.status(404).render("404", {
      title: "Game Not Found - Backpack Tech Works",
    })
  }
  
  res.render("client/game-play", {
    title: `${gameName.charAt(0).toUpperCase() + gameName.slice(1)} - Backpack Tech Works`,
    gameName: gameName,
  })
})


router.use("/Games", express.static(path.join(__dirname, "../views/client/Games")))

module.exports = router


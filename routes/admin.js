const express = require("express")
const router = express.Router()
const { ensureAdmin } = require("../middleware/auth")
const db = require("../config/database")
const { upload, deleteOldProfilePicture } = require("../utils/upload")
const { getTeamProfileData, saveTeamProfileData, saveBioAndSocialLinks } = require("../services/teamProfileService")
const { invalidateCache } = require("../utils/servicesCache")
const multer = require("multer")


const parseFormDataMiddleware = multer().none()


const parseChunkedUploadMiddleware = multer({
  limits: {
    fieldSize: 1 * 1024 * 1024, 
    fields: 10,
    fieldNameSize: 100
  }
}).none()
const path = require("path")
const fs = require("fs")


router.get("/dashboard", ensureAdmin, async (req, res) => {
  try {

    const [totalClients] = await db.query('SELECT COUNT(*) as count FROM users WHERE role = "client"')
    

    const [clientsThisMonth] = await db.query(
      'SELECT COUNT(*) as count FROM users WHERE role = "client" AND MONTH(created_at) = MONTH(CURRENT_DATE()) AND YEAR(created_at) = YEAR(CURRENT_DATE())'
    )
    

    const [clientsLastMonth] = await db.query(
      'SELECT COUNT(*) as count FROM users WHERE role = "client" AND MONTH(created_at) = MONTH(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH)) AND YEAR(created_at) = YEAR(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))'
    )
    

    const lastMonthCount = clientsLastMonth[0].count
    const thisMonthCount = clientsThisMonth[0].count
    let clientPercentageChange = 0
    if (lastMonthCount > 0) {
      clientPercentageChange = ((thisMonthCount - lastMonthCount) / lastMonthCount * 100).toFixed(1)
    } else if (thisMonthCount > 0) {
      clientPercentageChange = 100
    }
    

    const [totalProjects] = await db.query('SELECT COUNT(*) as count FROM projects')
    

    const [projectsThisMonth] = await db.query(
      'SELECT COUNT(*) as count FROM projects WHERE MONTH(created_at) = MONTH(CURRENT_DATE()) AND YEAR(created_at) = YEAR(CURRENT_DATE())'
    )
    

    const [projectsLastMonth] = await db.query(
      'SELECT COUNT(*) as count FROM projects WHERE MONTH(created_at) = MONTH(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH)) AND YEAR(created_at) = YEAR(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))'
    )
    

    const lastMonthProjectCount = projectsLastMonth[0].count
    const thisMonthProjectCount = projectsThisMonth[0].count
    let projectPercentageChange = 0
    if (lastMonthProjectCount > 0) {
      projectPercentageChange = ((thisMonthProjectCount - lastMonthProjectCount) / lastMonthProjectCount * 100).toFixed(1)
    } else if (thisMonthProjectCount > 0) {
      projectPercentageChange = 100
    }
    

    const [teamMembers] = await db.query("SELECT COUNT(*) as count FROM team_members WHERE is_active = true")
    

    const [teamMembersThisMonth] = await db.query(
      'SELECT COUNT(*) as count FROM team_members WHERE is_active = true AND MONTH(created_at) = MONTH(CURRENT_DATE()) AND YEAR(created_at) = YEAR(CURRENT_DATE())'
    )
    

    const [teamMembersLastMonth] = await db.query(
      'SELECT COUNT(*) as count FROM team_members WHERE is_active = true AND MONTH(created_at) = MONTH(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH)) AND YEAR(created_at) = YEAR(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))'
    )
    

    const lastMonthTeamCount = teamMembersLastMonth[0].count
    const thisMonthTeamCount = teamMembersThisMonth[0].count
    let teamPercentageChange = 0
    if (lastMonthTeamCount > 0) {
      teamPercentageChange = ((thisMonthTeamCount - lastMonthTeamCount) / lastMonthTeamCount * 100).toFixed(1)
    } else if (thisMonthTeamCount > 0) {
      teamPercentageChange = 100
    }
    

    const [topServices] = await db.query(`
      SELECT s.id, s.title, s.icon, COUNT(p.id) as project_count
      FROM services s
      LEFT JOIN projects p ON s.id = p.service_id
      WHERE s.is_active = true
      GROUP BY s.id, s.title, s.icon
      ORDER BY project_count DESC
      LIMIT 5
    `)
    

    const [topClients] = await db.query(`
      SELECT u.id, u.name, u.avatar, COUNT(p.id) as project_count
      FROM users u
      INNER JOIN projects p ON u.id = p.client_id
      WHERE u.role = "client"
      GROUP BY u.id, u.name, u.avatar
      ORDER BY project_count DESC
      LIMIT 10
    `)

    res.render("admin/dashboard", {
      title: "Admin Dashboard - Backpack Tech Works",
      stats: {
        totalClients: totalClients[0].count,
        clientsThisMonth: clientsThisMonth[0].count,
        clientPercentageChange: parseFloat(clientPercentageChange),
        totalProjects: totalProjects[0].count,
        projectsThisMonth: projectsThisMonth[0].count,
        projectPercentageChange: parseFloat(projectPercentageChange),
        teamMembers: teamMembers[0].count,
        teamMembersThisMonth: teamMembersThisMonth[0].count,
        teamPercentageChange: parseFloat(teamPercentageChange),
      },
      topServices,
      topClients
    })
  } catch (error) {
    console.error(error)
    res.render("admin/dashboard", {
      title: "Admin Dashboard",
      stats: { 
        totalClients: 0,
        clientsThisMonth: 0,
        clientPercentageChange: 0,
        totalProjects: 0,
        projectsThisMonth: 0,
        projectPercentageChange: 0,
        teamMembers: 0,
        teamMembersThisMonth: 0,
        teamPercentageChange: 0,
      },
      topServices: [],
      topClients: []
    })
  }
})


router.get("/team", ensureAdmin, async (req, res) => {
  try {
    const { search } = req.query
    
    let query = `
      SELECT tm.*, u.name, u.email, u.avatar, u.last_login, u.last_active
      FROM team_members tm
      JOIN users u ON tm.user_id = u.id
      WHERE 1=1
    `
    const params = []
    
    if (search && search.trim()) {
      query += ` AND (u.name LIKE ? OR tm.position LIKE ?)`
      const searchTerm = `%${search.trim()}%`
      params.push(searchTerm, searchTerm)
    }
    
    query += ` ORDER BY tm.display_order`
    
    const [teamMembers] = await db.query(query, params)

    res.render("admin/team", {
      title: "Manage Team - Backpack Tech Works",
      teamMembers,
      filters: {
        search: search || ''
      }
    })
  } catch (error) {
    console.error(error)
    res.render("admin/team", {
      title: "Manage Team",
      teamMembers: [],
      filters: {
        search: ''
      }
    })
  }
})


router.get("/team/add", ensureAdmin, async (req, res) => {
  try {

    const [maxOrderResult] = await db.query(
      "SELECT COALESCE(MAX(display_order), -1) as max_order FROM team_members"
    )
    const nextDisplayOrder = (maxOrderResult[0]?.max_order || -1) + 1
    
    res.render("admin/team-form", {
      title: "Add Team Member - Backpack Tech Works",
      isEdit: false,
      member: { display_order: nextDisplayOrder }
    })
  } catch (error) {
    console.error(error)
    req.flash("error_msg", "Failed to load add form")
    res.redirect("/admin/team")
  }
})


router.get("/team/edit/:id", ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const [members] = await db.query(`
      SELECT tm.*, u.name, u.email, u.avatar, u.role 
      FROM team_members tm
      JOIN users u ON tm.user_id = u.id
      WHERE tm.id = ?
    `, [id])

    if (members.length === 0) {
      req.flash("error_msg", "Team member not found")
      return res.redirect("/admin/team")
    }

    res.render("admin/team-form", {
      title: "Edit Team Member - Backpack Tech Works",
      member: members[0],
      isEdit: true
    })
  } catch (error) {
    console.error(error)
    req.flash("error_msg", "Failed to load edit form")
    res.redirect("/admin/team")
  }
})


router.post("/team/add", ensureAdmin, parseFormDataMiddleware, async (req, res) => {
  try {
    const { name, email, role, position, bio, skills, linkedin, github, twitter, instagram, facebook, display_order, is_active, avatarUrl } = req.body


    let finalDisplayOrder = parseInt(display_order)
    if (isNaN(finalDisplayOrder)) {
      const [maxOrderResult] = await db.query(
        "SELECT COALESCE(MAX(display_order), -1) as max_order FROM team_members"
      )
      finalDisplayOrder = (maxOrderResult[0]?.max_order || -1) + 1
    }

    const [existingUsers] = await db.query('SELECT id FROM users WHERE email = ?', [email])
    if (existingUsers.length > 0) {
      const errorMessage = encodeURIComponent("A user with this email already exists")
      return res.redirect(`/admin/team/add?error=true&message=${errorMessage}`)
    }


    let avatarPath = null
    if (avatarUrl) {
      avatarPath = avatarUrl
    } else if (req.file) {
      avatarPath = `/profiles/${req.file.filename}`
    }


    const [userResult] = await db.query(
      "INSERT INTO users (name, email, avatar, role, provider) VALUES (?, ?, ?, ?, ?)",
      [name, email, avatarPath, role || 'team_member', 'local']
    )

    const userId = userResult.insertId


    let skillsArray = [];
    if (skills) {
      if (Array.isArray(skills)) {
        skillsArray = skills;
      } else if (typeof skills === 'string') {
        skillsArray = skills.split(",").map(s => s.trim()).filter(s => s);
      }
    }




    await db.query(
      "INSERT INTO team_members (user_id, position, bio, skills, linkedin, github, twitter, instagram, facebook, display_order, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        userId, 
        position, 
        bio, 
        JSON.stringify(skillsArray), 
        linkedin, 
        github, 
        twitter,
        instagram,
        facebook,
        finalDisplayOrder,
        is_active === 'true' || is_active === true
      ]
    )


    res.redirect("/admin/team/add?success=true")
  } catch (error) {
    console.error(error)
    

    if (req.body.avatarUrl) {
      const avatarPath = path.join(__dirname, '../public', req.body.avatarUrl)
      try {
        if (fs.existsSync(avatarPath)) {
          fs.unlinkSync(avatarPath)
        }
      } catch (unlinkError) {
        console.error("Error deleting uploaded avatar file:", unlinkError)
      }
    }

    if (req.file) {
      try {
        fs.unlinkSync(req.file.path)
      } catch (unlinkError) {
        console.error("Error deleting file:", unlinkError)
      }
    }
    

    const errorMessage = encodeURIComponent(error.message || "Failed to add team member")
    res.redirect(`/admin/team/add?error=true&message=${errorMessage}`)
  }
})


router.post("/team/reorder", ensureAdmin, async (req, res) => {
  try {
    const { teamMemberIds } = req.body

    if (!teamMemberIds || !Array.isArray(teamMemberIds) || teamMemberIds.length === 0) {
      return res.status(400).json({ success: false, message: "Team member IDs array is required" })
    }


    for (let i = 0; i < teamMemberIds.length; i++) {
      await db.query(
        "UPDATE team_members SET display_order = ? WHERE id = ?",
        [i, teamMemberIds[i]]
      )
    }

    res.json({ success: true, message: "Team member order updated successfully" })
  } catch (error) {
    console.error("Error reordering team members:", error)
    res.status(500).json({ success: false, message: "Error reordering team members" })
  }
})


router.post("/team/:id", ensureAdmin, parseFormDataMiddleware, async (req, res) => {
  try {
    const { id } = req.params
    const { avatarUrl } = req.body
    const { name, email, password, role, position, bio, skills, linkedin, github, twitter, instagram, facebook, display_order, is_active } = req.body


    const [teamMembers] = await db.query(
      "SELECT user_id FROM team_members WHERE id = ?",
      [id]
    )

    if (teamMembers.length === 0) {
      const errorMessage = encodeURIComponent("Team member not found")
      return res.redirect(`/admin/team/edit/${id}?error=true&message=${errorMessage}`)
    }

    const userId = teamMembers[0].user_id


    if (name && name.trim() !== '') {
      await db.query(
        "UPDATE users SET name = ? WHERE id = ?",
        [name.trim(), userId]
      )
    }

    if (email) {
      const [existingUsers] = await db.query(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, userId]
      )
      if (existingUsers.length > 0) {

        if (req.file) {
          try {
            fs.unlinkSync(req.file.path)
          } catch (unlinkError) {
            console.error("Error deleting file:", unlinkError)
          }
        }
        const errorMessage = encodeURIComponent("A user with this email already exists")
        return res.redirect(`/admin/team/edit/${id}?error=true&message=${errorMessage}`)
      }


      await db.query(
        "UPDATE users SET email = ? WHERE id = ?",
        [email, userId]
      )
    }


    if (password && password.trim() !== '') {
      const bcrypt = require("bcrypt")
      const hashedPassword = await bcrypt.hash(password, 10)
      await db.query(
        "UPDATE users SET password = ? WHERE id = ?",
        [hashedPassword, userId]
      )
    }


    if (role && (role === 'team_member' || role === 'admin')) {
      await db.query(
        "UPDATE users SET role = ? WHERE id = ?",
        [role, userId]
      )
    }


    if (avatarUrl) {

      const newAvatarPath = avatarUrl

      const [users] = await db.query("SELECT avatar FROM users WHERE id = ?", [userId])
      const oldAvatarPath = users[0]?.avatar

      await db.query("UPDATE users SET avatar = ? WHERE id = ?", [newAvatarPath, userId])


      if (oldAvatarPath && oldAvatarPath !== newAvatarPath) {
        deleteOldProfilePicture(oldAvatarPath)
      }
    } else if (req.file) {

      const newAvatarPath = `/profiles/${req.file.filename}`

      const [users] = await db.query("SELECT avatar FROM users WHERE id = ?", [userId])
      const oldAvatarPath = users[0]?.avatar

      await db.query("UPDATE users SET avatar = ? WHERE id = ?", [newAvatarPath, userId])

      if (oldAvatarPath) {
        deleteOldProfilePicture(oldAvatarPath)
      }
    }


    let skillsArray = [];
    if (skills) {
      if (Array.isArray(skills)) {
        skillsArray = skills;
      } else if (typeof skills === 'string') {
        skillsArray = skills.split(",").map(s => s.trim()).filter(s => s);
      }
    }


    await db.query(
      "UPDATE team_members SET position = ?, bio = ?, skills = ?, linkedin = ?, github = ?, twitter = ?, instagram = ?, facebook = ?, display_order = ?, is_active = ? WHERE id = ?",
      [
        position, 
        bio, 
        JSON.stringify(skillsArray), 
        linkedin, 
        github, 
        twitter,
        instagram,
        facebook,
        display_order || 0,
        is_active === 'true' || is_active === true,
        id
      ],
    )


    res.redirect(`/admin/team/edit/${id}?success=true`)
  } catch (error) {
    console.error(error)
    

    if (req.body.avatarUrl) {
      const avatarPath = path.join(__dirname, '../public', req.body.avatarUrl)
      try {
        if (fs.existsSync(avatarPath)) {
          fs.unlinkSync(avatarPath)
        }
      } catch (unlinkError) {
        console.error("Error deleting uploaded avatar file:", unlinkError)
      }
    }

    if (req.file) {
      try {
        fs.unlinkSync(req.file.path)
      } catch (unlinkError) {
        console.error("Error deleting file:", unlinkError)
      }
    }
    
    const errorMessage = encodeURIComponent(error.message || "Failed to update team member")
    res.redirect(`/admin/team/edit/${req.params.id}?error=true&message=${errorMessage}`)
  }
})


router.delete("/team/:id", ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params


    const [teamMembers] = await db.query(
      "SELECT user_id FROM team_members WHERE id = ?",
      [id]
    )

    if (teamMembers.length === 0) {
      return res.status(404).json({ success: false, message: "Team member not found" })
    }

    const userId = teamMembers[0].user_id


    const [users] = await db.query("SELECT avatar FROM users WHERE id = ?", [userId])
    const avatarPath = users[0]?.avatar


    if (avatarPath) {
      deleteOldProfilePicture(avatarPath)
    }


    await db.query("DELETE FROM team_members WHERE id = ?", [id])


    await db.query("DELETE FROM users WHERE id = ?", [userId])

    res.json({ success: true, message: "Team member deleted successfully" })
  } catch (error) {
    console.error("Error deleting team member:", error)
    res.status(500).json({ success: false, message: "Error deleting team member" })
  }
})


router.get("/inquiries", ensureAdmin, async (req, res) => {
  try {
    const { search, date_from, date_to, status } = req.query
    
    let query = `
      SELECT i.*, u.name as user_name 
      FROM inquiries i
      LEFT JOIN users u ON i.user_id = u.id
      WHERE 1=1
    `
    const params = []
    

    if (search && search.trim()) {
      query += ` AND (
        i.name LIKE ? OR 
        i.email LIKE ? OR 
        i.subject LIKE ? OR 
        i.message LIKE ? OR
        u.name LIKE ?
      )`
      const searchTerm = `%${search.trim()}%`
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm)
    }
    

    if (date_from) {
      query += ` AND DATE(i.created_at) >= ?`
      params.push(date_from)
    }
    
    if (date_to) {
      query += ` AND DATE(i.created_at) <= ?`
      params.push(date_to)
    }
    

    if (status) {
      query += ` AND i.status = ?`
      params.push(status)
    }
    
    query += ` ORDER BY i.created_at DESC`
    
    const [inquiries] = await db.query(query, params)

    res.render("admin/inquiries", {
      title: "Manage Inquiries - Backpack Tech Works",
      inquiries,
      filters: {
        search: search || '',
        date_from: date_from || '',
        date_to: date_to || '',
        status: status || ''
      }
    })
  } catch (error) {
    console.error(error)
    res.render("admin/inquiries", {
      title: "Manage Inquiries",
      inquiries: [],
      filters: {
        search: '',
        date_from: '',
        date_to: '',
        status: ''
      }
    })
  }
})


router.get("/profile", ensureAdmin, async (req, res) => {
  try {
    const profileData = await getTeamProfileData(req.user.id)

    res.render("admin/profile", {
      title: "My Profile - Backpack Tech Works",
      user: req.user,
      ...profileData,
    })
  } catch (error) {
    console.error("Error loading profile:", error)
    res.redirect("/admin/dashboard")
  }
})


router.post("/profile/bio-social", ensureAdmin, async (req, res) => {
  try {
    const payload = {
      bio: req.body.bio || req.body.simpleBio,
      shortBio: req.body.bio || req.body.simpleBio,
      linkedin: req.body.linkedin,
      github: req.body.github,
      twitter: req.body.twitter,
      instagram: req.body.instagram,
      facebook: req.body.facebook,
    }

    await saveBioAndSocialLinks(req.user.id, payload)

    res.json({ success: true, message: "Bio and social links updated successfully" })
  } catch (error) {
    console.error("Error updating bio and social links:", error)
    const status = error.statusCode || 500
    res.status(status).json({ success: false, message: error.message || "Error updating bio and social links" })
  }
})


function parseFormData(body) {
  const parsed = { ...body }
  

  if (body.experiences) {
    parsed.experiences = Array.isArray(body.experiences) ? body.experiences : []
  } else {
    const experiences = []
    const expKeys = Object.keys(body).filter(key => key.startsWith('experiences['))
    const expIndices = new Set()
    expKeys.forEach(key => {
      const match = key.match(/experiences\[(\d+)\]/)
      if (match) expIndices.add(parseInt(match[1]))
    })
    
    expIndices.forEach(index => {
      const exp = {}
      Object.keys(body).forEach(key => {
        const match = key.match(/experiences\[(\d+)\]\[(.+)\]/)
        if (match && parseInt(match[1]) === index) {
          exp[match[2]] = body[key]
        }
      })
      if (Object.keys(exp).length > 0) {
        experiences.push(exp)
      }
    })
    parsed.experiences = experiences
  }
  

  if (body.education) {
    parsed.education = Array.isArray(body.education) ? body.education : []
  } else {
    const education = []
    const eduKeys = Object.keys(body).filter(key => key.startsWith('education['))
    const eduIndices = new Set()
    eduKeys.forEach(key => {
      const match = key.match(/education\[(\d+)\]/)
      if (match) eduIndices.add(parseInt(match[1]))
    })
    
    eduIndices.forEach(index => {
      const edu = {}
      Object.keys(body).forEach(key => {
        const match = key.match(/education\[(\d+)\]\[(.+)\]/)
        if (match && parseInt(match[1]) === index) {
          edu[match[2]] = body[key]
        }
      })
      if (Object.keys(edu).length > 0) {
        education.push(edu)
      }
    })
    parsed.education = education
  }
  

  if (body.languages) {
    parsed.languages = Array.isArray(body.languages) ? body.languages : []
  } else {
    const languages = []
    const langKeys = Object.keys(body).filter(key => key.startsWith('languages['))
    const langIndices = new Set()
    langKeys.forEach(key => {
      const match = key.match(/languages\[(\d+)\]/)
      if (match) langIndices.add(parseInt(match[1]))
    })
    
    langIndices.forEach(index => {
      const lang = {}
      Object.keys(body).forEach(key => {
        const match = key.match(/languages\[(\d+)\]\[(.+)\]/)
        if (match && parseInt(match[1]) === index) {
          lang[match[2]] = body[key]
        }
      })
      if (Object.keys(lang).length > 0) {
        languages.push(lang)
      }
    })
    parsed.languages = languages
  }
  

  if (body.skills) {
    parsed.skills = Array.isArray(body.skills) ? body.skills : [body.skills].filter(Boolean)
  } else {
    parsed.skills = []
  }
  
  return parsed
}


router.post("/profile", ensureAdmin, parseFormDataMiddleware, async (req, res) => {
  try {
    const parsedData = parseFormData(req.body)
    await saveTeamProfileData(req.user.id, parsedData)
    res.json({ success: true, message: "Profile updated successfully" })
  } catch (error) {
    console.error("Error updating profile:", error)
    const status = error.statusCode || 500
    res.status(status).json({ success: false, message: error.message || "Error updating profile" })
  }
})


router.post("/upload-avatar", ensureAdmin, parseFormDataMiddleware, async (req, res) => {
  try {
    const { avatarUrl } = req.body


    if (avatarUrl) {
      const newAvatarPath = avatarUrl


      const [users] = await db.query("SELECT avatar FROM users WHERE id = ?", [req.user.id])
      const oldAvatarPath = users[0]?.avatar


      await db.query("UPDATE users SET avatar = ? WHERE id = ?", [newAvatarPath, req.user.id])


      if (oldAvatarPath && oldAvatarPath !== newAvatarPath) {
        deleteOldProfilePicture(oldAvatarPath)
      }

      return res.json({ 
        success: true, 
        message: "Profile picture updated successfully",
        avatar: newAvatarPath
      })
    }


    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" })
    }

    const newAvatarPath = `/profiles/${req.file.filename}`

    const [users] = await db.query("SELECT avatar FROM users WHERE id = ?", [req.user.id])
    const oldAvatarPath = users[0]?.avatar

    await db.query("UPDATE users SET avatar = ? WHERE id = ?", [newAvatarPath, req.user.id])

    if (oldAvatarPath) {
      deleteOldProfilePicture(oldAvatarPath)
    }

    res.json({ 
      success: true, 
      message: "Profile picture updated successfully",
      avatar: newAvatarPath
    })
  } catch (error) {
    console.error("Error uploading profile picture:", error)
    
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path)
      } catch (unlinkError) {
        console.error("Error deleting file:", unlinkError)
      }
    }
    
    res.status(500).json({ success: false, message: "Error uploading profile picture" })
  }
})


router.post("/upload-alter-ego", ensureAdmin, parseFormDataMiddleware, async (req, res) => {
  try {
    const { avatarUrl } = req.body


    if (avatarUrl) {
      const newAlterEgoPath = avatarUrl


      const [teamMembers] = await db.query("SELECT id, alter_ego FROM team_members WHERE user_id = ?", [req.user.id])
      
      if (teamMembers.length === 0) {
        await db.query(
          "INSERT INTO team_members (user_id, alter_ego) VALUES (?, ?)",
          [req.user.id, newAlterEgoPath]
        )
      } else {
        const oldAlterEgoPath = teamMembers[0]?.alter_ego
        
        await db.query("UPDATE team_members SET alter_ego = ? WHERE user_id = ?", [newAlterEgoPath, req.user.id])

        if (oldAlterEgoPath && oldAlterEgoPath !== newAlterEgoPath) {
          deleteOldProfilePicture(oldAlterEgoPath)
        }
      }

      return res.json({ 
        success: true, 
        message: "Alter ego picture updated successfully",
        alter_ego: newAlterEgoPath
      })
    }


    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" })
    }

    const newAlterEgoPath = `/profiles/${req.file.filename}`

    const [teamMembers] = await db.query("SELECT id, alter_ego FROM team_members WHERE user_id = ?", [req.user.id])
    
    if (teamMembers.length === 0) {
      await db.query(
        "INSERT INTO team_members (user_id, alter_ego) VALUES (?, ?)",
        [req.user.id, newAlterEgoPath]
      )
    } else {
      const oldAlterEgoPath = teamMembers[0]?.alter_ego
      
      await db.query("UPDATE team_members SET alter_ego = ? WHERE user_id = ?", [newAlterEgoPath, req.user.id])

      if (oldAlterEgoPath) {
        deleteOldProfilePicture(oldAlterEgoPath)
      }
    }

    res.json({ 
      success: true, 
      message: "Alter ego picture updated successfully",
      alter_ego: newAlterEgoPath
    })
  } catch (error) {
    console.error("Error uploading alter ego picture:", error)
    
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path)
      } catch (unlinkError) {
        console.error("Error deleting file:", unlinkError)
      }
    }
    
    res.status(500).json({ success: false, message: "Error uploading alter ego picture" })
  }
})


router.post("/change-password", ensureAdmin, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Current password and new password are required" })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters long" })
    }


    const [users] = await db.query("SELECT password FROM users WHERE id = ?", [req.user.id])
    
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" })
    }

    const user = users[0]


    if (!user.password) {
      return res.status(400).json({ success: false, message: "This account uses OAuth authentication. Password cannot be changed." })
    }


    const bcrypt = require("bcrypt")
    const isMatch = await bcrypt.compare(currentPassword, user.password)

    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Current password is incorrect" })
    }


    const hashedPassword = await bcrypt.hash(newPassword, 10)


    await db.query("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, req.user.id])

    res.json({ success: true, message: "Password changed successfully" })
  } catch (error) {
    console.error("Error changing password:", error)
    res.status(500).json({ success: false, message: "Error changing password" })
  }
})

router.get("/clients", ensureAdmin, async (req, res) => {
  try {
    const { search, brand_id } = req.query
    
    let query = `
      SELECT u.*, 
        b.name as brand_name,
        b.logo as brand_logo,
        (SELECT COUNT(*) FROM projects WHERE client_id = u.id) as project_count,
        (SELECT COUNT(*) FROM inquiries WHERE user_id = u.id) as inquiry_count
      FROM users u
      LEFT JOIN brands b ON u.brand_id = b.id
      WHERE u.role = 'client'
    `
    const params = []
    

    if (search && search.trim()) {
      query += ` AND (u.name LIKE ? OR u.email LIKE ?)`
      const searchTerm = `%${search.trim()}%`
      params.push(searchTerm, searchTerm)
    }
    
    if (brand_id && brand_id !== '') {
      query += ` AND u.brand_id = ?`
      params.push(brand_id)
    }
    
    query += ` ORDER BY u.created_at DESC`
    
    const [clients] = await db.query(query, params)


    const [brands] = await db.query(`
      SELECT id, name, logo
      FROM brands
      ORDER BY name ASC
    `)

    res.render("admin/clients", {
      title: "Manage Clients - Backpack Tech Works",
      clients,
      brands: brands || [],
      filters: {
        search: search || '',
        brand_id: brand_id || ''
      }
    })
  } catch (error) {
    console.error(error)
    res.render("admin/clients", {
      title: "Manage Clients",
      clients: [],
      brands: [],
      filters: {
        search: '',
        brand_id: ''
      }
    })
  }
})


router.get("/clients/add", ensureAdmin, async (req, res) => {
  try {

    const [projects] = await db.query(`
      SELECT id, title, client_id
      FROM projects
      ORDER BY title ASC
    `)
    

    const [brands] = await db.query(`
      SELECT id, name, logo
      FROM brands
      ORDER BY name ASC
    `)
    
    res.render("admin/client-form", {
      title: "Add Client - Backpack Tech Works",
      isEdit: false,
      client: {},
      projects: projects || [],
      brands: brands || [],
      user: req.user
    })
  } catch (error) {
    console.error(error)
    req.flash("error_msg", "Failed to load add form")
    res.redirect("/admin/clients")
  }
})


router.get("/clients/edit/:id", ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const [clients] = await db.query(
      "SELECT * FROM users WHERE id = ? AND role = 'client'",
      [id]
    )

    if (clients.length === 0) {
      req.flash("error_msg", "Client not found")
      return res.redirect("/admin/clients")
    }


    const [projects] = await db.query(`
      SELECT id, title, client_id
      FROM projects
      ORDER BY title ASC
    `)
    

    const [assignedProjects] = await db.query(`
      SELECT id FROM projects WHERE client_id = ?
    `, [id])


    const [brands] = await db.query(`
      SELECT id, name, logo
      FROM brands
      ORDER BY name ASC
    `)

    res.render("admin/client-form", {
      title: "Edit Client - Backpack Tech Works",
      client: clients[0],
      projects: projects || [],
      assignedProjectIds: assignedProjects ? assignedProjects.map(p => p.id) : [],
      brands: brands || [],
      isEdit: true,
      user: req.user
    })
  } catch (error) {
    console.error(error)
    req.flash("error_msg", "Failed to load edit form")
    res.redirect("/admin/clients")
  }
})


router.get("/clients/view/:id", ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params
    

    const [clients] = await db.query(`
      SELECT u.*, b.name as brand_name, b.logo as brand_logo
      FROM users u
      LEFT JOIN brands b ON u.brand_id = b.id
      WHERE u.id = ? AND u.role = 'client'
    `, [id])

    if (clients.length === 0) {
      req.flash("error_msg", "Client not found")
      return res.redirect("/admin/clients")
    }

    const client = clients[0]


    const [projects] = await db.query(`
      SELECT p.*, s.title as service_title
      FROM projects p
      LEFT JOIN services s ON p.service_id = s.id
      WHERE p.client_id = ?
      ORDER BY p.created_at DESC
    `, [id])


    const [inquiries] = await db.query(`
      SELECT * FROM inquiries
      WHERE user_id = ?
      ORDER BY created_at DESC
    `, [id])

    res.render("admin/client-view", {
      title: `Client Details - ${client.name}`,
      client,
      projects,
      inquiries,
      user: req.user
    })
  } catch (error) {
    console.error(error)
    req.flash("error_msg", "Failed to load client details")
    res.redirect("/admin/clients")
  }
})


router.post("/clients/add", ensureAdmin, upload, async (req, res) => {
  try {
    const { name, email, project_ids, brand_id, provider } = req.body


    if (!name || !email || !provider) {
      const errorMessage = encodeURIComponent("Name, email, and provider are required")
      return res.redirect(`/admin/clients/add?error=true&message=${errorMessage}`)
    }


    if (provider !== 'google' && provider !== 'github') {
      const errorMessage = encodeURIComponent("Provider must be either 'google' or 'github'")
      return res.redirect(`/admin/clients/add?error=true&message=${errorMessage}`)
    }

    const [existingUsers] = await db.query('SELECT id FROM users WHERE email = ?', [email])
    if (existingUsers.length > 0) {
      const errorMessage = encodeURIComponent("A user with this email already exists")
      return res.redirect(`/admin/clients/add?error=true&message=${errorMessage}`)
    }


    let avatarPath = null
    if (req.file) {
      avatarPath = `/profiles/${req.file.filename}`
    }



    const [result] = await db.query(
      "INSERT INTO users (name, email, password, avatar, role, provider, provider_id, brand_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [name, email, null, avatarPath, 'client', provider, null, brand_id || null]
    )

    const clientId = result.insertId


    let projectIds = []
    if (project_ids) {
      if (Array.isArray(project_ids)) {
        projectIds = project_ids.filter(id => id && id !== '')
      } else if (typeof project_ids === 'string' && project_ids.trim() !== '') {

        projectIds = project_ids.split(',').map(id => id.trim()).filter(id => id && id !== '')
      }
    }
    
    if (projectIds.length > 0) {
      const placeholders = projectIds.map(() => '?').join(',')
      await db.query(
        `UPDATE projects SET client_id = ? WHERE id IN (${placeholders})`,
        [clientId, ...projectIds]
      )
    }

    res.redirect("/admin/clients/add?success=true")
  } catch (error) {
    console.error(error)
    

    if (req.file) {
      try {
        fs.unlinkSync(req.file.path)
      } catch (unlinkError) {
        console.error("Error deleting file:", unlinkError)
      }
    }
    
    const errorMessage = encodeURIComponent(error.message || "Failed to add client")
    res.redirect(`/admin/clients/add?error=true&message=${errorMessage}`)
  }
})


router.post("/clients/:id", ensureAdmin, upload, async (req, res) => {
  try {
    const { id } = req.params
    const { name, email, project_ids, brand_id, provider } = req.body


    const [clients] = await db.query(
      "SELECT * FROM users WHERE id = ? AND role = 'client'",
      [id]
    )

    if (clients.length === 0) {
      const errorMessage = encodeURIComponent("Client not found")
      return res.redirect(`/admin/clients/edit/${id}?error=true&message=${errorMessage}`)
    }


    if (provider && provider !== 'google' && provider !== 'github') {
      const errorMessage = encodeURIComponent("Provider must be either 'google' or 'github'")
      return res.redirect(`/admin/clients/edit/${id}?error=true&message=${errorMessage}`)
    }


    if (name) {
      await db.query(
        "UPDATE users SET name = ? WHERE id = ?",
        [name, id]
      )
    }


    if (email) {
      const [existingUsers] = await db.query(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, id]
      )
      if (existingUsers.length > 0) {

        if (req.file) {
          try {
            fs.unlinkSync(req.file.path)
          } catch (unlinkError) {
            console.error("Error deleting file:", unlinkError)
          }
        }
        const errorMessage = encodeURIComponent("A user with this email already exists")
        return res.redirect(`/admin/clients/edit/${id}?error=true&message=${errorMessage}`)
      }


      await db.query(
        "UPDATE users SET email = ? WHERE id = ?",
        [email, id]
      )
    }


    if (provider) {
      await db.query(
        "UPDATE users SET provider = ? WHERE id = ?",
        [provider, id]
      )

    }


    if (req.file) {
      const newAvatarPath = `/profiles/${req.file.filename}`


      const oldAvatarPath = clients[0]?.avatar


      await db.query("UPDATE users SET avatar = ? WHERE id = ?", [newAvatarPath, id])


      if (oldAvatarPath) {
        deleteOldProfilePicture(oldAvatarPath)
      }
    }


    if (brand_id !== undefined) {
      await db.query(
        "UPDATE users SET brand_id = ? WHERE id = ?",
        [brand_id || null, id]
      )
    }




    if (project_ids !== undefined) {

      await db.query("UPDATE projects SET client_id = NULL WHERE client_id = ?", [id])
      

      let projectIds = []
      if (project_ids) {
        if (Array.isArray(project_ids)) {
          projectIds = project_ids.filter(pid => pid && pid !== '')
        } else if (typeof project_ids === 'string' && project_ids.trim() !== '') {

          projectIds = project_ids.split(',').map(pid => pid.trim()).filter(pid => pid && pid !== '')
        }
      }
      
      if (projectIds.length > 0) {
        const placeholders = projectIds.map(() => '?').join(',')
        await db.query(
          `UPDATE projects SET client_id = ? WHERE id IN (${placeholders})`,
          [id, ...projectIds]
        )
      }
    }

    res.redirect(`/admin/clients/edit/${id}?success=true`)
  } catch (error) {
    console.error(error)
    

    if (req.file) {
      try {
        fs.unlinkSync(req.file.path)
      } catch (unlinkError) {
        console.error("Error deleting file:", unlinkError)
      }
    }
    
    const errorMessage = encodeURIComponent(error.message || "Failed to update client")
    res.redirect(`/admin/clients/edit/${id}?error=true&message=${errorMessage}`)
  }
})


router.post("/clients/:id/assign-inquiry", ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { inquiry_id } = req.body

    await db.query("UPDATE inquiries SET user_id = ? WHERE id = ?", [id, inquiry_id])
    res.json({ success: true, message: "Inquiry assigned to client successfully" })
  } catch (error) {
    console.error("Error assigning inquiry:", error)
    res.status(500).json({ success: false, message: "Error assigning inquiry" })
  }
})


router.post("/clients/:id/assign-project", ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { project_id } = req.body

    await db.query("UPDATE projects SET client_id = ? WHERE id = ?", [id, project_id])
    res.json({ success: true, message: "Project assigned to client successfully" })
  } catch (error) {
    console.error("Error assigning project:", error)
    res.status(500).json({ success: false, message: "Error assigning project" })
  }
})


router.delete("/clients/:id", ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params


    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ success: false, message: "Cannot delete your own account" })
    }

    await db.query("DELETE FROM users WHERE id = ? AND role = 'client'", [id])
    res.json({ success: true, message: "Client deleted successfully" })
  } catch (error) {
    console.error("Error deleting client:", error)
    res.status(500).json({ success: false, message: "Error deleting client" })
  }
})




const serviceIconStorage = multer.diskStorage({
  destination: function (req, file, cb) {

    const tempDir = path.join(__dirname, '../public/temp')
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }
    cb(null, tempDir)
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)

    const ext = path.extname(file.originalname)
    const filename = `service_icon_temp_${timestamp}_${random}${ext}`
    cb(null, filename)
  }
})

const serviceIconUpload = multer({
  storage: serviceIconStorage,
  limits: { fileSize: 1 * 1024 * 1024 }, 
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|svg/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype) || file.mimetype === 'image/svg+xml'
    if (mimetype && extname) {
      return cb(null, true)
    } else {
      cb(new Error('Only image files are allowed!'))
    }
  }
})


router.get("/services", ensureAdmin, async (req, res) => {
  try {
    const { search } = req.query
    
    let query = `
      SELECT s.*, 
        (SELECT COUNT(*) FROM projects WHERE service_id = s.id) as project_count
      FROM services s
      WHERE 1=1
    `
    const params = []
    

    if (search && search.trim()) {
      query += ` AND s.title LIKE ?`
      params.push(`%${search.trim()}%`)
    }
    
    query += ` ORDER BY s.display_order, s.created_at DESC`
    
    const [services] = await db.query(query, params)

    res.render("admin/services", {
      title: "Manage Services - Backpack Tech Works",
      services,
      filters: {
        search: search || ''
      }
    })
  } catch (error) {
    console.error(error)
    res.render("admin/services", {
      title: "Manage Services",
      services: [],
      filters: {
        search: ''
      }
    })
  }
})


router.get("/services/add", ensureAdmin, async (req, res) => {
  try {

    const [maxOrderResult] = await db.query(
      "SELECT COALESCE(MAX(display_order), -1) as max_order FROM services"
    )
    const nextDisplayOrder = (maxOrderResult[0]?.max_order || -1) + 1
    
    res.render("admin/service-form", {
      title: "Add Service - Backpack Tech Works",
      isEdit: false,
      service: { display_order: nextDisplayOrder },
      user: req.user
    })
  } catch (error) {
    console.error(error)
    req.flash("error_msg", "Failed to load add form")
    res.redirect("/admin/services")
  }
})


router.get("/services/edit/:id", ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const [services] = await db.query(
      "SELECT * FROM services WHERE id = ?",
      [id]
    )

    if (services.length === 0) {
      req.flash("error_msg", "Service not found")
      return res.redirect("/admin/services")
    }

    res.render("admin/service-form", {
      title: "Edit Service - Backpack Tech Works",
      service: services[0],
      isEdit: true,
      user: req.user
    })
  } catch (error) {
    console.error(error)
    req.flash("error_msg", "Failed to load edit form")
    res.redirect("/admin/services")
  }
})


router.post("/services/add", ensureAdmin, serviceIconUpload.single('iconImage'), async (req, res) => {
  try {
    const { title, slug, short_description, full_description, icon, features, technologies, display_order, is_active } = req.body


    let finalDisplayOrder = parseInt(display_order)
    if (isNaN(finalDisplayOrder)) {
      const [maxOrderResult] = await db.query(
        "SELECT COALESCE(MAX(display_order), -1) as max_order FROM services"
      )
      finalDisplayOrder = (maxOrderResult[0]?.max_order || -1) + 1
    }

    let iconValue = icon || ''
    if (req.file) {

      const serviceIconsDir = path.join(__dirname, '../public/images/services')
      if (!fs.existsSync(serviceIconsDir)) {
        fs.mkdirSync(serviceIconsDir, { recursive: true })
      }

      const timestamp = Date.now()
      const random = Math.random().toString(36).substring(2, 8)
      const webpFilename = `service_icon_${timestamp}_${random}.webp`
      const webpPath = path.join(serviceIconsDir, webpFilename)


      const fileBuffer = fs.readFileSync(req.file.path)
      await convertBufferToWebP(fileBuffer, webpPath, {
        quality: 85,
        maxWidth: 512,
        maxHeight: 512
      })


      try {
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path)
        }
      } catch (err) {
        console.error('Error deleting temp icon file:', err)
      }

      iconValue = `/images/services/${webpFilename}`
    }


    let featuresArray = []
    if (features) {
      if (Array.isArray(features)) {
        featuresArray = features.map(f => f.trim()).filter(f => f)
      } else if (typeof features === 'string') {
        featuresArray = features.split(',').map(f => f.trim()).filter(f => f)
      }
    }


    let technologiesArray = []
    if (technologies) {
      if (Array.isArray(technologies)) {
        technologiesArray = technologies.map(t => t.trim()).filter(t => t)
      } else if (typeof technologies === 'string') {
        technologiesArray = technologies.split(',').map(t => t.trim()).filter(t => t)
      }
    }


    let isActive = false
    if (is_active) {
      if (Array.isArray(is_active)) {

        isActive = is_active[is_active.length - 1] === 'true' || is_active[is_active.length - 1] === true
      } else {
        isActive = is_active === 'true' || is_active === true || is_active === 'on'
      }
    }

    await db.query(
      `INSERT INTO services (title, slug, short_description, full_description, icon, features, technologies, display_order, is_active) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        slug,
        short_description,
        full_description,
        iconValue,
        JSON.stringify(featuresArray),
        JSON.stringify(technologiesArray),
        finalDisplayOrder,
        isActive
      ]
    )


    invalidateCache()

    res.redirect("/admin/services/add?success=true")
  } catch (error) {
    console.error("Error creating service:", error)
    

    if (req.file) {
      try {
        fs.unlinkSync(req.file.path)
      } catch (unlinkError) {
        console.error("Error deleting file:", unlinkError)
      }
    }
    
    const errorMessage = encodeURIComponent(error.message || "Failed to create service")
    res.redirect(`/admin/services/add?error=true&message=${errorMessage}`)
  }
})


router.post("/services/reorder", ensureAdmin, async (req, res) => {
  try {
    const { serviceIds } = req.body

    if (!serviceIds || !Array.isArray(serviceIds) || serviceIds.length === 0) {
      return res.status(400).json({ success: false, message: "Service IDs array is required" })
    }


    for (let i = 0; i < serviceIds.length; i++) {
      await db.query(
        "UPDATE services SET display_order = ? WHERE id = ?",
        [i, serviceIds[i]]
      )
    }

    invalidateCache()

    res.json({ success: true, message: "Service order updated successfully" })
  } catch (error) {
    console.error("Error reordering services:", error)
    res.status(500).json({ success: false, message: "Error reordering services" })
  }
})


router.post("/services/:id", ensureAdmin, serviceIconUpload.single('iconImage'), async (req, res) => {
  try {
    const { id } = req.params
    const { title, slug, short_description, full_description, icon, features, technologies, display_order, is_active } = req.body


    const [existingServices] = await db.query("SELECT icon FROM services WHERE id = ?", [id])
    if (existingServices.length === 0) {

      if (req.file) {
        try {
          fs.unlinkSync(req.file.path)
        } catch (unlinkError) {
          console.error("Error deleting file:", unlinkError)
        }
      }
      const errorMessage = encodeURIComponent("Service not found")
      return res.redirect(`/admin/services/edit/${id}?error=true&message=${errorMessage}`)
    }


    let iconValue = icon || existingServices[0].icon
    if (req.file) {

      const serviceIconsDir = path.join(__dirname, '../public/images/services')
      if (!fs.existsSync(serviceIconsDir)) {
        fs.mkdirSync(serviceIconsDir, { recursive: true })
      }

      const timestamp = Date.now()
      const random = Math.random().toString(36).substring(2, 8)
      const webpFilename = `service_icon_${timestamp}_${random}.webp`
      const webpPath = path.join(serviceIconsDir, webpFilename)


      const fileBuffer = fs.readFileSync(req.file.path)
      await convertBufferToWebP(fileBuffer, webpPath, {
        quality: 85,
        maxWidth: 512,
        maxHeight: 512
      })


      try {
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path)
        }
      } catch (err) {
        console.error('Error deleting temp icon file:', err)
      }

      iconValue = `/images/services/${webpFilename}`
      

      const oldIcon = existingServices[0].icon
      if (oldIcon && oldIcon.startsWith('/images/services/')) {
        const oldIconPath = path.join(__dirname, '../public', oldIcon)
        if (fs.existsSync(oldIconPath)) {
          try {
            fs.unlinkSync(oldIconPath)
          } catch (unlinkError) {
            console.error("Error deleting old icon:", unlinkError)
          }
        }
      }
    }


    let featuresArray = []
    if (features) {
      if (Array.isArray(features)) {
        featuresArray = features.map(f => f.trim()).filter(f => f)
      } else if (typeof features === 'string') {
        featuresArray = features.split(',').map(f => f.trim()).filter(f => f)
      }
    }


    let technologiesArray = []
    if (technologies) {
      if (Array.isArray(technologies)) {
        technologiesArray = technologies.map(t => t.trim()).filter(t => t)
      } else if (typeof technologies === 'string') {
        technologiesArray = technologies.split(',').map(t => t.trim()).filter(t => t)
      }
    }


    let isActive = false
    if (is_active) {
      if (Array.isArray(is_active)) {

        isActive = is_active[is_active.length - 1] === 'true' || is_active[is_active.length - 1] === true
      } else {
        isActive = is_active === 'true' || is_active === true || is_active === 'on'
      }
    }

    await db.query(
      `UPDATE services SET title = ?, slug = ?, short_description = ?, full_description = ?, icon = ?, 
       features = ?, technologies = ?, display_order = ?, is_active = ? WHERE id = ?`,
      [
        title,
        slug,
        short_description,
        full_description,
        iconValue,
        JSON.stringify(featuresArray),
        JSON.stringify(technologiesArray),
        display_order || 0,
        isActive,
        id
      ]
    )


    invalidateCache()

    res.redirect(`/admin/services/edit/${id}?success=true`)
  } catch (error) {
    console.error("Error updating service:", error)
    

    if (req.file) {
      try {
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path)
        }
      } catch (unlinkError) {
        console.error("Error deleting temp file:", unlinkError)
      }
    }
    
    const errorMessage = encodeURIComponent(error.message || "Failed to update service")
    res.redirect(`/admin/services/edit/${req.params.id}?error=true&message=${errorMessage}`)
  }
})


router.post("/services/:id/toggle", ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const [services] = await db.query("SELECT is_active FROM services WHERE id = ?", [id])
    
    if (services.length === 0) {
      return res.status(404).json({ success: false, message: "Service not found" })
    }

    const newStatus = !services[0].is_active
    await db.query("UPDATE services SET is_active = ? WHERE id = ?", [newStatus, id])
    

    invalidateCache()
    
    res.json({ success: true, message: `Service ${newStatus ? 'activated' : 'deactivated'} successfully`, is_active: newStatus })
  } catch (error) {
    console.error("Error toggling service:", error)
    res.status(500).json({ success: false, message: "Error updating service status" })
  }
})


router.delete("/services/:id", ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params


    const [services] = await db.query("SELECT icon FROM services WHERE id = ?", [id])
    
    if (services.length === 0) {
      return res.status(404).json({ success: false, message: "Service not found" })
    }


    const [projects] = await db.query("SELECT COUNT(*) as count FROM projects WHERE service_id = ?", [id])
    
    if (projects[0].count > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot delete service. It has ${projects[0].count} associated project(s).` 
      })
    }


    const icon = services[0].icon
    if (icon && icon.startsWith('/images/services/')) {
      const iconPath = path.join(__dirname, '../public', icon)
      if (fs.existsSync(iconPath)) {
        try {
          fs.unlinkSync(iconPath)
        } catch (unlinkError) {
          console.error("Error deleting service icon file:", unlinkError)
        }
      }
    }


    await db.query("DELETE FROM services WHERE id = ?", [id])
    

    invalidateCache()
    
    res.json({ success: true, message: "Service deleted successfully" })
  } catch (error) {
    console.error("Error deleting service:", error)
    res.status(500).json({ success: false, message: "Error deleting service" })
  }
})




const projectImagesStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const projectImagesDir = path.join(__dirname, '../public/images/Projects')
    if (!fs.existsSync(projectImagesDir)) {
      fs.mkdirSync(projectImagesDir, { recursive: true })
    }
    cb(null, projectImagesDir)
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    const ext = path.extname(file.originalname)
    const filename = `project_image_${timestamp}_${random}${ext}`
    cb(null, filename)
  }
})


const projectImagesUpload = multer({
  storage: projectImagesStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, 
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype)
    if (mimetype && extname) {
      return cb(null, true)
    } else {
      cb(new Error('Only image files are allowed for images field!'))
    }
  }
})


function getProjectFolders(projectId) {
  const imagesDir = path.join(__dirname, '../public/images/Projects', projectId.toString())
  return { imagesDir }
}


function createProjectFolders(projectId) {
  const { imagesDir } = getProjectFolders(projectId)
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true })
  }
}


function deleteProjectFolders(projectId) {
  const { imagesDir } = getProjectFolders(projectId)
  try {
    if (fs.existsSync(imagesDir)) {
      fs.rmSync(imagesDir, { recursive: true, force: true })
    }
  } catch (error) {
    console.error(`Error deleting project folders for project ${projectId}:`, error)
  }
}




const projectUpload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      const projectId = req.params?.id || req.body?.project_id
      
      if (projectId) {

        const { imagesDir } = getProjectFolders(projectId)
        if (!fs.existsSync(imagesDir)) {
          fs.mkdirSync(imagesDir, { recursive: true })
        }
        cb(null, imagesDir)
      } else {

        const tempDir = path.join(__dirname, '../public/temp')
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true })
        }
        cb(null, tempDir)
      }
    },
    filename: function (req, file, cb) {
      const timestamp = Date.now()
      const random = Math.random().toString(36).substring(2, 8)
      const ext = path.extname(file.originalname)
      const filename = `image_${timestamp}_${random}${ext}`
      cb(null, filename)
    }
  }),
  limits: { 
    fileSize: 5 * 1024 * 1024, 
    files: 20 
  },
  fileFilter: (req, file, cb) => {

    const allowedTypes = /jpeg|jpg|png|gif|webp/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype)
    if (mimetype && extname) {
      return cb(null, true)
    } else {
      cb(new Error('Only image files are allowed!'))
    }
  }
})


async function saveMilestones(projectId, milestonesData) {
  if (!milestonesData) return

  try {
    let milestones
    if (typeof milestonesData === 'string') {
      milestones = JSON.parse(milestonesData)
    } else {
      milestones = milestonesData
    }

    if (!Array.isArray(milestones)) return


    const [existingMilestones] = await db.query(
      'SELECT id FROM project_milestones WHERE project_id = ?',
      [projectId]
    )
    const existingIds = existingMilestones.map(m => m.id)
    const newIds = []


    for (let i = 0; i < milestones.length; i++) {
      const milestone = milestones[i]
      const { id, title, status, date, tasks } = milestone

      if (!title) continue 

      let milestoneId

      if (id && existingIds.includes(parseInt(id))) {

        await db.query(
          `UPDATE project_milestones SET title = ?, status = ?, date = ?, display_order = ? WHERE id = ?`,
          [title, status || 'Not Started', date || null, i, id]
        )
        milestoneId = parseInt(id)
        newIds.push(milestoneId)
      } else {

        const [result] = await db.query(
          `INSERT INTO project_milestones (project_id, title, status, date, display_order) VALUES (?, ?, ?, ?, ?)`,
          [projectId, title, status || 'Not Started', date || null, i]
        )
        milestoneId = result.insertId
        newIds.push(milestoneId)
      }


      if (milestoneId && tasks && Array.isArray(tasks)) {

        const [existingTasks] = await db.query(
          'SELECT id FROM milestone_tasks WHERE milestone_id = ?',
          [milestoneId]
        )
        const existingTaskIds = existingTasks.map(t => t.id)
        const newTaskIds = []

        for (let j = 0; j < tasks.length; j++) {
          const task = tasks[j]
          const { id: taskId, title: taskTitle, description, is_completed } = task

          if (!taskTitle) continue 

          let finalTaskId

          if (taskId && existingTaskIds.includes(parseInt(taskId))) {

            await db.query(
              `UPDATE milestone_tasks SET title = ?, description = ?, is_completed = ?, display_order = ? WHERE id = ?`,
              [taskTitle, description || null, is_completed === true || is_completed === 'true', j, taskId]
            )
            finalTaskId = parseInt(taskId)
            newTaskIds.push(finalTaskId)
          } else {

            const [taskResult] = await db.query(
              `INSERT INTO milestone_tasks (milestone_id, title, description, is_completed, display_order) VALUES (?, ?, ?, ?, ?)`,
              [milestoneId, taskTitle, description || null, is_completed === true || is_completed === 'true', j]
            )
            finalTaskId = taskResult.insertId
            newTaskIds.push(finalTaskId)
          }
        }


        const tasksToDelete = existingTaskIds.filter(id => !newTaskIds.includes(id))
        if (tasksToDelete.length > 0) {
          await db.query(
            `DELETE FROM milestone_tasks WHERE id IN (${tasksToDelete.map(() => '?').join(',')})`,
            tasksToDelete
          )
        }
      }
    }


    const milestonesToDelete = existingIds.filter(id => !newIds.includes(id))
    if (milestonesToDelete.length > 0) {

      await db.query(
        `DELETE FROM project_milestones WHERE id IN (${milestonesToDelete.map(() => '?').join(',')})`,
        milestonesToDelete
      )
    }
  } catch (error) {
    console.error('Error saving milestones:', error)
    throw error
  }
}


router.get("/projects", ensureAdmin, async (req, res) => {
  try {
    const { search, client_id, service_id, status } = req.query
    
    let query = `
      SELECT p.*, 
        u.name as client_name,
        u.email as client_email,
        s.title as service_title, s.slug as service_slug
      FROM projects p
      LEFT JOIN users u ON p.client_id = u.id
      LEFT JOIN services s ON p.service_id = s.id
      WHERE 1=1
    `
    const params = []
    

    if (search && search.trim()) {
      query += ` AND p.title LIKE ?`
      params.push(`%${search.trim()}%`)
    }
    

    if (client_id && client_id !== '') {
      query += ` AND p.client_id = ?`
      params.push(client_id)
    }
    

    if (service_id && service_id !== '') {
      query += ` AND p.service_id = ?`
      params.push(service_id)
    }
    

    if (status && status !== '') {
      if (status === 'featured') {
        query += ` AND p.is_featured = 1`
      } else if (status === 'normal') {
        query += ` AND p.is_featured = 0`
      }
    }
    
    query += ` ORDER BY p.created_at DESC`
    
    const [projects] = await db.query(query, params)


    for (let project of projects) {
      const [milestones] = await db.query(
        `SELECT * FROM project_milestones WHERE project_id = ? ORDER BY display_order, created_at`,
        [project.id]
      )
      project.milestones = milestones || []
    }


    projects.forEach(project => {
      if (project.cover_image) {
        project.image = `/images/Projects/${project.id}/${project.cover_image}`
      } else {

        const { imagesDir } = getProjectFolders(project.id)
        if (fs.existsSync(imagesDir)) {
          const images = fs.readdirSync(imagesDir).filter(f => f.startsWith('image_') || f.startsWith('project_image_'))
          if (images.length > 0) {
            project.image = `/images/Projects/${project.id}/${images[0]}`
          }
        }
      }
    })


    const [clients] = await db.query('SELECT id, name FROM users WHERE role = "client" ORDER BY name')
    const [services] = await db.query('SELECT id, title FROM services WHERE is_active = true ORDER BY title')

    res.render("admin/projects", {
      title: "Manage Projects - Backpack Tech Works",
      projects,
      clients: clients || [],
      services: services || [],
      filters: {
        search: search || '',
        client_id: client_id || '',
        service_id: service_id || '',
        status: status || ''
      }
    })
  } catch (error) {
    console.error(error)
    res.render("admin/projects", {
      title: "Manage Projects",
      projects: [],
      clients: [],
      services: [],
      filters: {
        search: '',
        client_id: '',
        service_id: '',
        status: ''
      }
    })
  }
})


router.get("/projects/add", ensureAdmin, async (req, res) => {
  try {

    const [clients] = await db.query('SELECT id, name, email FROM users WHERE role = "client" ORDER BY name')
    const [services] = await db.query('SELECT id, title FROM services WHERE is_active = true ORDER BY title')

    res.render("admin/project-form", {
      title: "Add Project - Backpack Tech Works",
      isEdit: false,
      project: {},
      clients: clients || [],
      services: services || [],
      user: req.user
    })
  } catch (error) {
    console.error(error)
    req.flash("error_msg", "Failed to load add form")
    res.redirect("/admin/projects")
  }
})


router.get("/projects/edit/:id", ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const [projects] = await db.query(
      "SELECT * FROM projects WHERE id = ?",
      [id]
    )

    if (projects.length === 0) {
      req.flash("error_msg", "Project not found")
      return res.redirect("/admin/projects")
    }

    const project = projects[0]


    const { imagesDir } = getProjectFolders(id)
    let projectImages = []

    if (fs.existsSync(imagesDir)) {
      projectImages = fs.readdirSync(imagesDir)
        .filter(f => f.startsWith('image_') || f.startsWith('project_image_'))
        .map(filename => ({
          filename,
          path: `/images/Projects/${id}/${filename}`
        }))
    }


    project.images = projectImages


    const [milestones] = await db.query(
      `SELECT * FROM project_milestones WHERE project_id = ? ORDER BY display_order, created_at`,
      [id]
    )
    

    for (let milestone of milestones) {
      const [tasks] = await db.query(
        `SELECT * FROM milestone_tasks WHERE milestone_id = ? ORDER BY display_order, created_at`,
        [milestone.id]
      )
      milestone.tasks = tasks || []
    }

    project.milestones = milestones || []


    const [clients] = await db.query('SELECT id, name, email FROM users WHERE role = "client" ORDER BY name')
    const [services] = await db.query('SELECT id, title FROM services WHERE is_active = true ORDER BY title')

    res.render("admin/project-form", {
      title: "Edit Project - Backpack Tech Works",
      project,
      isEdit: true,
      clients: clients || [],
      services: services || [],
      user: req.user
    })
  } catch (error) {
    console.error(error)
    req.flash("error_msg", "Failed to load edit form")
    res.redirect("/admin/projects")
  }
})


router.post("/projects/add", ensureAdmin, parseFormDataMiddleware, async (req, res) => {
  let tempFiles = []
  try {
    const { title, slug, description, client_id, service_id, technologies, project_url, video_url, completed_at, is_featured, cover_image, uploaded_images, existing_images_json } = req.body


    let technologiesArray = []
    if (technologies) {
      if (Array.isArray(technologies)) {
        technologiesArray = technologies.map(t => t.trim()).filter(t => t)
      } else if (typeof technologies === 'string') {
        technologiesArray = technologies.split(',').map(t => t.trim()).filter(t => t)
      }
    }


    const [result] = await db.query(
      `INSERT INTO projects (title, slug, description, client_id, service_id, technologies, cover_image, project_url, video_url, completed_at, is_featured) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        slug,
        description,
        client_id || null,
        service_id || null,
        JSON.stringify(technologiesArray),
        null, 
        project_url || null,
        video_url || null,
        completed_at || null,
        is_featured === 'true' || is_featured === true
      ]
    )

    const projectId = result.insertId


    createProjectFolders(projectId)
    const { imagesDir } = getProjectFolders(projectId)

    let imageFilenames = []
    

    let existingImages = []
    if (existing_images_json) {
      try {
        existingImages = JSON.parse(existing_images_json)
        if (!Array.isArray(existingImages)) {
          existingImages = []
        }
      } catch (e) {
        existingImages = []
      }
    }
    

    existingImages = [...new Set(existingImages.map(img => String(img).trim()))]
    imageFilenames = [...existingImages]
    

    if (uploaded_images) {
      let uploadedUrls = []
      try {
        uploadedUrls = JSON.parse(uploaded_images)
        if (!Array.isArray(uploadedUrls)) {
          uploadedUrls = []
        }
      } catch (e) {
        uploadedUrls = []
      }
      

      const projectsBaseDir = path.join(__dirname, '../public/images/Projects')
      uploadedUrls.forEach(imageUrl => {
        if (imageUrl && typeof imageUrl === 'string') {

          const filename = imageUrl.split('/').pop()
          if (filename) {
            const sourcePath = path.join(projectsBaseDir, filename)
            const destPath = path.join(imagesDir, filename)
            
            if (fs.existsSync(sourcePath)) {
              try {
                fs.renameSync(sourcePath, destPath)
                if (!imageFilenames.includes(filename)) {
                  imageFilenames.push(filename)
                }
                tempFiles.push(destPath)
              } catch (e) {
                console.error("Error moving uploaded image:", e)
              }
            }
          }
        }
      })
    }


    let coverImageFilename = null
    if (cover_image) {

      if (cover_image.startsWith('/images/Projects/')) {
        coverImageFilename = cover_image.split('/').pop()
      } else if (cover_image.includes('project_image_')) {

        coverImageFilename = cover_image
      }
      

      if (coverImageFilename && !imageFilenames.includes(coverImageFilename)) {
        coverImageFilename = null
      }
    }
    

    if (!coverImageFilename && imageFilenames.length > 0) {
      coverImageFilename = imageFilenames[0]
    }



    await db.query(
      `UPDATE projects SET cover_image = ? WHERE id = ?`,
      [coverImageFilename, projectId]
    )


    await saveMilestones(projectId, req.body.milestones)

    res.redirect("/admin/projects/add?success=true")
  } catch (error) {
    console.error("Error creating project:", error)
    

    tempFiles.forEach(filePath => {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath)
        }
      } catch (e) {
        console.error("Error cleaning up file:", e)
      }
    })
    
    const errorMessage = encodeURIComponent(error.message || "Failed to create project")
    res.redirect(`/admin/projects/add?error=true&message=${errorMessage}`)
  }
})


router.post("/projects/:id", ensureAdmin, parseFormDataMiddleware, async (req, res) => {
  try {
    const { id } = req.params
    const { title, slug, description, client_id, service_id, technologies, project_url, video_url, completed_at, is_featured, delete_images, cover_image, uploaded_images, existing_images_json } = req.body

    const [existingProjects] = await db.query("SELECT cover_image FROM projects WHERE id = ?", [id])
    if (existingProjects.length === 0) {
      const errorMessage = encodeURIComponent("Project not found")
      return res.redirect(`/admin/projects/edit/${id}?error=true&message=${errorMessage}`)
    }

    const existingProject = existingProjects[0]
    createProjectFolders(id)
    const { imagesDir } = getProjectFolders(id)


    let existingImages = []
    if (existing_images_json) {
      try {
        existingImages = JSON.parse(existing_images_json)
        if (!Array.isArray(existingImages)) {
          existingImages = []
        }
      } catch (e) {
        existingImages = []
      }
    }
    

    if (existingImages.length === 0 && fs.existsSync(imagesDir)) {
      existingImages = fs.readdirSync(imagesDir)
        .filter(f => f.startsWith('image_') || f.startsWith('project_image_'))
        .map(filename => filename)
    }
    

    existingImages = [...new Set(existingImages.map(img => String(img).trim()))]
    

    if (delete_images) {
      const imagesToDelete = Array.isArray(delete_images) ? delete_images : [delete_images]
      imagesToDelete.forEach(filename => {
        const imagePath = path.join(imagesDir, filename)
        if (fs.existsSync(imagePath)) {
          try {
            fs.unlinkSync(imagePath)
          } catch (e) {
            console.error("Error deleting image:", e)
          }
        }

        existingImages = existingImages.filter(img => {
          const imgFilename = typeof img === 'string' ? img.split('/').pop() : img
          return imgFilename !== filename
        })
      })
    }


    if (uploaded_images) {
      let uploadedUrls = []
      try {
        uploadedUrls = JSON.parse(uploaded_images)
        if (!Array.isArray(uploadedUrls)) {
          uploadedUrls = []
        }
      } catch (e) {
        uploadedUrls = []
      }
      

      const projectsBaseDir = path.join(__dirname, '../public/images/Projects')
      uploadedUrls.forEach(imageUrl => {
        if (imageUrl && typeof imageUrl === 'string') {
          const filename = imageUrl.split('/').pop()
          if (filename) {
            const sourcePath = path.join(projectsBaseDir, filename)
            const destPath = path.join(imagesDir, filename)
            
            if (fs.existsSync(sourcePath)) {
              try {
                fs.renameSync(sourcePath, destPath)

                if (!existingImages.includes(filename)) {
                  existingImages.push(filename)
                }
              } catch (e) {
                console.error("Error moving uploaded image:", e)
              }
            }
          }
        }
      })
    }


    let coverImageFilename = cover_image || null
    if (cover_image) {

      if (cover_image.startsWith('/images/Projects/')) {
        coverImageFilename = cover_image.split('/').pop()
      } else if (cover_image.includes('project_image_')) {

        coverImageFilename = cover_image
      }
      

      if (coverImageFilename && !existingImages.includes(coverImageFilename)) {
        coverImageFilename = null
      }
    }
    

    if (!coverImageFilename && existingImages.length > 0) {
      coverImageFilename = existingProject.cover_image || existingImages[0]
    }


    let technologiesArray = []
    if (technologies) {
      if (Array.isArray(technologies)) {
        technologiesArray = technologies.map(t => t.trim()).filter(t => t)
      } else if (typeof technologies === 'string') {
        technologiesArray = technologies.split(',').map(t => t.trim()).filter(t => t)
      }
    }

    await db.query(
      `UPDATE projects SET title = ?, slug = ?, description = ?, client_id = ?, service_id = ?, 
       technologies = ?, cover_image = ?, project_url = ?, video_url = ?, completed_at = ?, is_featured = ? WHERE id = ?`,
      [
        title,
        slug,
        description,
        client_id || null,
        service_id || null,
        JSON.stringify(technologiesArray),
        coverImageFilename,
        project_url || null,
        video_url || null,
        completed_at || null,
        is_featured === 'true' || is_featured === true,
        id
      ]
    )
    




    await saveMilestones(id, req.body.milestones)

    res.redirect(`/admin/projects/edit/${id}?success=true`)
  } catch (error) {
    console.error("Error updating project:", error)
    const errorMessage = encodeURIComponent(error.message || "Failed to update project")
    const projectId = req.params.id || 'unknown'
    res.redirect(`/admin/projects/edit/${projectId}?error=true&message=${errorMessage}`)
  }
})


router.post("/projects/:id/toggle-featured", ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const [projects] = await db.query("SELECT is_featured FROM projects WHERE id = ?", [id])
    
    if (projects.length === 0) {
      return res.status(404).json({ success: false, message: "Project not found" })
    }

    const newStatus = !projects[0].is_featured
    await db.query("UPDATE projects SET is_featured = ? WHERE id = ?", [newStatus, id])
    
    res.json({ success: true, message: `Project ${newStatus ? 'featured' : 'unfeatured'} successfully`, is_featured: newStatus })
  } catch (error) {
    console.error("Error toggling project:", error)
    res.status(500).json({ success: false, message: "Error updating project status" })
  }
})


router.delete("/projects/:id", ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params


    await db.query("DELETE FROM projects WHERE id = ?", [id])


    deleteProjectFolders(id)

    res.json({ success: true, message: "Project deleted successfully" })
  } catch (error) {
    console.error("Error deleting project:", error)
    res.status(500).json({ success: false, message: "Error deleting project" })
  }
})




router.post("/inquiries/:id/status", ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body

    if (!['new', 'in_progress', 'resolved'].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" })
    }

    await db.query("UPDATE inquiries SET status = ? WHERE id = ?", [status, id])
    res.json({ success: true, message: "Inquiry status updated successfully" })
  } catch (error) {
    console.error("Error updating inquiry status:", error)
    res.status(500).json({ success: false, message: "Error updating inquiry status" })
  }
})


router.post("/inquiries/bulk-status", ensureAdmin, async (req, res) => {
  try {
    const { inquiry_ids, status } = req.body

    if (!inquiry_ids || !Array.isArray(inquiry_ids) || inquiry_ids.length === 0) {
      return res.status(400).json({ success: false, message: "No inquiries selected" })
    }

    if (!['new', 'in_progress', 'resolved'].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" })
    }

    const placeholders = inquiry_ids.map(() => '?').join(',')
    await db.query(
      `UPDATE inquiries SET status = ? WHERE id IN (${placeholders})`,
      [status, ...inquiry_ids]
    )

    res.json({ success: true, message: `${inquiry_ids.length} inquiry/inquiries updated successfully` })
  } catch (error) {
    console.error("Error bulk updating inquiry status:", error)
    res.status(500).json({ success: false, message: "Error updating inquiry status" })
  }
})


router.delete("/inquiries/:id", ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params
    await db.query("DELETE FROM inquiries WHERE id = ?", [id])
    res.json({ success: true, message: "Inquiry deleted successfully" })
  } catch (error) {
    console.error("Error deleting inquiry:", error)
    res.status(500).json({ success: false, message: "Error deleting inquiry" })
  }
})


router.get("/api/unassigned-projects", ensureAdmin, async (req, res) => {
  try {
    const [projects] = await db.query(`
      SELECT p.id, p.title
      FROM projects p
      WHERE p.client_id IS NULL
      ORDER BY p.created_at DESC
    `)
    res.json({ success: true, projects })
  } catch (error) {
    console.error("Error fetching unassigned projects:", error)
    res.status(500).json({ success: false, message: "Error fetching projects" })
  }
})


router.get("/api/unassigned-inquiries", ensureAdmin, async (req, res) => {
  try {
    const [inquiries] = await db.query(`
      SELECT i.id, i.subject, i.email, i.name
      FROM inquiries i
      WHERE i.user_id IS NULL
      ORDER BY i.created_at DESC
    `)
    res.json({ success: true, inquiries })
  } catch (error) {
    console.error("Error fetching unassigned inquiries:", error)
    res.status(500).json({ success: false, message: "Error fetching inquiries" })
  }
})




const brandLogoStorage = multer.diskStorage({
  destination: function (req, file, cb) {

    const tempDir = path.join(__dirname, '../public/temp')
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }
    cb(null, tempDir)
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)

    const ext = path.extname(file.originalname)
    const filename = `brand_logo_temp_${timestamp}_${random}${ext}`
    cb(null, filename)
  }
})

const brandLogoUpload = multer({
  storage: brandLogoStorage,
  limits: { fileSize: 1 * 1024 * 1024 }, 
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|svg|ico/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype) || file.mimetype === 'image/svg+xml' || file.mimetype === 'image/x-icon'
    if (mimetype && extname) {
      return cb(null, true)
    } else {
      cb(new Error('Only image files are allowed!'))
    }
  }
})


router.get("/brands", ensureAdmin, async (req, res) => {
  try {
    const { search } = req.query
    
    let query = `
      SELECT b.*, 
        (SELECT COUNT(*) FROM users WHERE brand_id = b.id AND role = 'client') as client_count
      FROM brands b
      WHERE 1=1
    `
    const params = []
    

    if (search && search.trim()) {
      query += ` AND b.name LIKE ?`
      params.push(`%${search.trim()}%`)
    }
    
    query += ` ORDER BY b.created_at DESC`
    
    const [brands] = await db.query(query, params)

    res.render("admin/brands", {
      title: "Manage Brands - Backpack Tech Works",
      brands,
      filters: {
        search: search || ''
      }
    })
  } catch (error) {
    console.error(error)
    res.render("admin/brands", {
      title: "Manage Brands",
      brands: [],
      filters: {
        search: ''
      }
    })
  }
})


router.get("/brands/add", ensureAdmin, async (req, res) => {
  try {
    res.render("admin/brand-form", {
      title: "Add Brand - Backpack Tech Works",
      isEdit: false,
      brand: {}
    })
  } catch (error) {
    console.error(error)
    req.flash("error_msg", "Failed to load add form")
    res.redirect("/admin/brands")
  }
})


router.get("/brands/edit/:id", ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const [brands] = await db.query(
      "SELECT * FROM brands WHERE id = ?",
      [id]
    )

    if (brands.length === 0) {
      req.flash("error_msg", "Brand not found")
      return res.redirect("/admin/brands")
    }

    res.render("admin/brand-form", {
      title: "Edit Brand - Backpack Tech Works",
      brand: brands[0],
      isEdit: true
    })
  } catch (error) {
    console.error(error)
    req.flash("error_msg", "Failed to load edit form")
    res.redirect("/admin/brands")
  }
})


router.post("/brands/add", ensureAdmin, brandLogoUpload.single('logo'), async (req, res) => {
  try {
    const { name } = req.body

    if (!name || !name.trim()) {
      const errorMessage = encodeURIComponent("Brand name is required")
      return res.redirect(`/admin/brands/add?error=true&message=${errorMessage}`)
    }

    let logoPath = null
    if (req.file) {

      const logosDir = path.join(__dirname, '../public/logos')
      if (!fs.existsSync(logosDir)) {
        fs.mkdirSync(logosDir, { recursive: true })
      }

      const timestamp = Date.now()
      const random = Math.random().toString(36).substring(2, 8)
      const webpFilename = `brand_logo_${timestamp}_${random}.webp`
      const webpPath = path.join(logosDir, webpFilename)


      const fileBuffer = fs.readFileSync(req.file.path)
      await convertBufferToWebP(fileBuffer, webpPath, {
        quality: 85,
        maxWidth: 512,
        maxHeight: 512
      })


      try {
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path)
        }
      } catch (err) {
        console.error('Error deleting temp logo file:', err)
      }

      logoPath = `/logos/${webpFilename}`
    }

    await db.query(
      `INSERT INTO brands (name, logo) VALUES (?, ?)`,
      [name.trim(), logoPath]
    )

    res.redirect("/admin/brands/add?success=true")
  } catch (error) {
    console.error("Error creating brand:", error)
    


    if (req.file) {
      try {
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path)
        }
      } catch (unlinkError) {
        console.error("Error deleting temp file:", unlinkError)
      }
    }
    
    const errorMessage = encodeURIComponent(error.message || "Failed to create brand")
    res.redirect(`/admin/brands/add?error=true&message=${errorMessage}`)
  }
})


router.post("/brands/:id", ensureAdmin, brandLogoUpload.single('logo'), async (req, res) => {
  try {
    const { id } = req.params
    const { name } = req.body


    const [existingBrands] = await db.query("SELECT logo FROM brands WHERE id = ?", [id])
    if (existingBrands.length === 0) {

      if (req.file) {
        try {
          fs.unlinkSync(req.file.path)
        } catch (unlinkError) {
          console.error("Error deleting file:", unlinkError)
        }
      }
      const errorMessage = encodeURIComponent("Brand not found")
      return res.redirect(`/admin/brands/edit/${id}?error=true&message=${errorMessage}`)
    }

    if (!name || !name.trim()) {
      const errorMessage = encodeURIComponent("Brand name is required")
      return res.redirect(`/admin/brands/edit/${id}?error=true&message=${errorMessage}`)
    }


    let logoPath = existingBrands[0].logo
    if (req.file) {

      const logosDir = path.join(__dirname, '../public/logos')
      if (!fs.existsSync(logosDir)) {
        fs.mkdirSync(logosDir, { recursive: true })
      }

      const timestamp = Date.now()
      const random = Math.random().toString(36).substring(2, 8)
      const webpFilename = `brand_logo_${timestamp}_${random}.webp`
      const webpPath = path.join(logosDir, webpFilename)


      const fileBuffer = fs.readFileSync(req.file.path)
      await convertBufferToWebP(fileBuffer, webpPath, {
        quality: 85,
        maxWidth: 512,
        maxHeight: 512
      })


      try {
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path)
        }
      } catch (err) {
        console.error('Error deleting temp logo file:', err)
      }

      logoPath = `/logos/${webpFilename}`
      

      const oldLogo = existingBrands[0].logo
      if (oldLogo && oldLogo.startsWith('/logos/')) {
        const oldLogoPath = path.join(__dirname, '../public', oldLogo)
        if (fs.existsSync(oldLogoPath)) {
          try {
            fs.unlinkSync(oldLogoPath)
          } catch (unlinkError) {
            console.error("Error deleting old logo:", unlinkError)
          }
        }
      }
    }

    await db.query(
      `UPDATE brands SET name = ?, logo = ? WHERE id = ?`,
      [name.trim(), logoPath, id]
    )

    res.redirect(`/admin/brands/edit/${id}?success=true`)
  } catch (error) {
    console.error("Error updating brand:", error)
    


    if (req.file) {
      try {
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path)
        }
      } catch (unlinkError) {
        console.error("Error deleting temp file:", unlinkError)
      }
    }
    
    const errorMessage = encodeURIComponent(error.message || "Failed to update brand")
    res.redirect(`/admin/brands/edit/${req.params.id}?error=true&message=${errorMessage}`)
  }
})


router.delete("/brands/:id", ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params


    const [clients] = await db.query("SELECT COUNT(*) as count FROM users WHERE brand_id = ? AND role = 'client'", [id])
    
    if (clients[0].count > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot delete brand. It has ${clients[0].count} associated client(s).` 
      })
    }


    const [brands] = await db.query("SELECT logo FROM brands WHERE id = ?", [id])
    
    if (brands.length === 0) {
      return res.status(404).json({ success: false, message: "Brand not found" })
    }

    const logoPath = brands[0].logo


    if (logoPath && logoPath.startsWith('/logos/')) {
      const logoFilePath = path.join(__dirname, '../public', logoPath)
      if (fs.existsSync(logoFilePath)) {
        try {
          fs.unlinkSync(logoFilePath)
        } catch (unlinkError) {
          console.error("Error deleting brand logo file:", unlinkError)
        }
      }
    }


    await db.query("DELETE FROM brands WHERE id = ?", [id])

    res.json({ success: true, message: "Brand deleted successfully" })
  } catch (error) {
    console.error("Error deleting brand:", error)
    res.status(500).json({ success: false, message: "Error deleting brand" })
  }
})




const { saveChunk, reassembleChunks, cleanupUpload, generateUploadId } = require("../utils/chunkedUpload")
const { convertBufferToWebP } = require("../utils/imageConverter")


const CHUNK_SIZE = 1024 * 1024 
const MAX_FILE_SIZE = 5 * 1024 * 1024 


const tempChunksDir = path.join(__dirname, '../temp/chunks')
if (!fs.existsSync(tempChunksDir)) {
  fs.mkdirSync(tempChunksDir, { recursive: true })
}


router.post("/api/chunked-upload/chunk", ensureAdmin, (req, res, next) => {
  parseChunkedUploadMiddleware(req, res, (err) => {
    if (err) {
      console.error("Multer error in chunk upload:", err)
      return res.status(400).json({ success: false, message: err.message || "Error parsing form data" })
    }
    next()
  })
}, async (req, res) => {
  try {
    const { uploadId, chunkIndex, totalChunks, fileName, fileSize, chunkData: chunkDataBase64 } = req.body

    if (!uploadId || chunkIndex === undefined || !totalChunks || !fileName) {
      return res.status(400).json({ success: false, message: "Missing required fields" })
    }


    const totalSize = parseInt(fileSize)
    if (isNaN(totalSize) || totalSize > MAX_FILE_SIZE) {
      return res.status(400).json({ success: false, message: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` })
    }


    if (!chunkDataBase64) {
      return res.status(400).json({ success: false, message: "Chunk data is required" })
    }


    let chunkData
    try {
      chunkData = Buffer.from(chunkDataBase64, 'base64')
    } catch (decodeError) {
      return res.status(400).json({ success: false, message: "Invalid chunk data format" })
    }


    const result = await saveChunk(
      uploadId,
      parseInt(chunkIndex),
      parseInt(totalChunks),
      chunkData,
      tempChunksDir
    )

    res.json({ success: true, ...result })
  } catch (error) {
    console.error("Error handling chunk:", error)
    res.status(500).json({ success: false, message: error.message || "Error processing chunk" })
  }
})


const completedUploads = new Map()


router.post("/api/chunked-upload/complete", ensureAdmin, (req, res, next) => {
  parseChunkedUploadMiddleware(req, res, (err) => {
    if (err) {
      console.error("Multer error in complete upload:", err)
      return res.status(400).json({ success: false, message: err.message || "Error parsing form data" })
    }
    next()
  })
}, async (req, res) => {
  try {
    const { uploadId, fileName } = req.body


    if (completedUploads.has(uploadId)) {
      const existingResult = completedUploads.get(uploadId)
      return res.json(existingResult)
    }

    if (!uploadId || !fileName) {
      return res.status(400).json({ success: false, message: "Missing uploadId or fileName" })
    }


    const allowedTypes = /jpeg|jpg|png|gif|webp/i
    const ext = path.extname(fileName).toLowerCase().replace('.', '')
    if (!allowedTypes.test(ext)) {
      cleanupUpload(uploadId)
      return res.status(400).json({ success: false, message: "Invalid file type. Only images are allowed." })
    }


    const tempFilePath = path.join(tempChunksDir, `${uploadId}_complete`)
    await reassembleChunks(uploadId, tempFilePath)


    const uploadType = req.body.type || 'blog'
    let targetDir, filenamePrefix, urlPrefix, quality, maxWidth, maxHeight
    
    if (uploadType === 'project') {
      targetDir = path.join(__dirname, '../public/images/Projects')
      filenamePrefix = 'project_image_'
      urlPrefix = '/images/Projects/'
      quality = 85
      maxWidth = 2000
      maxHeight = 2000
    } else if (uploadType === 'avatar') {
      targetDir = path.join(__dirname, '../public/profiles')
      filenamePrefix = 'profile_'
      urlPrefix = '/profiles/'
      quality = 90
      maxWidth = 800
      maxHeight = 800
    } else {
      targetDir = path.join(__dirname, '../public/images/Blogs')
      filenamePrefix = 'blog_image_'
      urlPrefix = '/images/Blogs/'
      quality = 85
      maxWidth = 2000
      maxHeight = 2000
    }
    
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true })
    }

    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    const webpFilename = `${filenamePrefix}${timestamp}_${random}.webp`
    const webpPath = path.join(targetDir, webpFilename)


    const fileBuffer = fs.readFileSync(tempFilePath)
    await convertBufferToWebP(fileBuffer, webpPath, {
      quality: quality,
      maxWidth: maxWidth,
      maxHeight: maxHeight
    })


    try {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath)
      }
    } catch (err) {
      console.error('Error deleting temp file:', err)
    }

    const webpUrl = `${urlPrefix}${webpFilename}`

    const result = {
      success: true,
      url: webpUrl,
      filename: webpFilename
    }


    completedUploads.set(uploadId, result)
    

    setTimeout(() => {
      completedUploads.delete(uploadId)
    }, 5 * 60 * 1000)

    res.json(result)
  } catch (error) {
    console.error("Error completing upload:", error)
    cleanupUpload(req.body.uploadId)
    res.status(500).json({ success: false, message: error.message || "Error completing upload" })
  }
})


router.get("/api/chunked-upload/upload-id", ensureAdmin, (req, res) => {
  const uploadId = generateUploadId()
  res.json({ success: true, uploadId })
})

const blogImagesStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const blogsDir = path.join(__dirname, '../public/images/Blogs')
    if (!fs.existsSync(blogsDir)) {
      fs.mkdirSync(blogsDir, { recursive: true })
    }
    cb(null, blogsDir)
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    const ext = path.extname(file.originalname)
    const filename = `blog_image_${timestamp}_${random}${ext}`
    cb(null, filename)
  }
})

const blogImagesUpload = multer({
  storage: blogImagesStorage,
  limits: { fileSize: 1024 * 1024 }, 
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype)
    if (mimetype && extname) {
      return cb(null, true)
    } else {
      cb(new Error('Only image files are allowed!'))
    }
  }
})


router.get("/activities", ensureAdmin, async (req, res) => {
  res.redirect("/admin/activities/blogs")
})




router.get("/activities/blogs", ensureAdmin, async (req, res) => {
  try {
    const { search } = req.query
    
    let query = `
      SELECT b.*, u.name as author_name
      FROM blogs b
      LEFT JOIN users u ON b.author_id = u.id
      WHERE 1=1
    `
    const params = []
    

    if (search && search.trim()) {
      query += ` AND (b.title LIKE ? OR b.content LIKE ?)`
      const searchTerm = `%${search.trim()}%`
      params.push(searchTerm, searchTerm)
    }
    
    query += ` ORDER BY b.created_at DESC`
    
    const [blogs] = await db.query(query, params)


    blogs.forEach(blog => {
      if (blog.images) {
        try {

          if (typeof blog.images === 'string') {

            try {
              const parsed = JSON.parse(blog.images)
              blog.images = Array.isArray(parsed) ? parsed : [parsed]
            } catch (parseError) {

              blog.images = [blog.images]
            }
          } else if (Array.isArray(blog.images)) {
            blog.images = blog.images
          } else {
            blog.images = []
          }
        } catch (e) {
          blog.images = []
        }
      } else {
        blog.images = []
      }
      if (blog.links) {
        try {
          blog.links = JSON.parse(blog.links)
        } catch (e) {
          blog.links = []
        }
      } else {
        blog.links = []
      }
    })

    res.render("admin/blogs", {
      title: "Manage Blogs - Backpack Tech Works",
      blogs,
      filters: {
        search: search || ''
      },
      user: req.user
    })
  } catch (error) {
    console.error(error)
    res.render("admin/blogs", {
      title: "Manage Blogs",
      blogs: [],
      filters: {
        search: ''
      },
      user: req.user
    })
  }
})


router.get("/activities/blogs/add", ensureAdmin, async (req, res) => {
  try {
    res.render("admin/blog-form", {
      title: "Add Blog - Backpack Tech Works",
      isEdit: false,
      blog: {},
      user: req.user
    })
  } catch (error) {
    console.error(error)
    req.flash("error_msg", "Failed to load add form")
    res.redirect("/admin/activities/blogs")
  }
})


router.get("/activities/blogs/edit/:id", ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const [blogs] = await db.query(
      "SELECT * FROM blogs WHERE id = ?",
      [id]
    )

    if (blogs.length === 0) {
      req.flash("error_msg", "Blog not found")
      return res.redirect("/admin/activities/blogs")
    }

    const blog = blogs[0]


    if (blog.images) {
      try {

        if (typeof blog.images === 'string') {

          try {
            const parsed = JSON.parse(blog.images)
            blog.images = Array.isArray(parsed) ? parsed : [parsed]
          } catch (parseError) {

            blog.images = [blog.images]
          }
        } else if (Array.isArray(blog.images)) {
          blog.images = blog.images
        } else {
          blog.images = []
        }
      } catch (e) {
        blog.images = []
      }
    } else {
      blog.images = []
    }
    

    if (blog.images.length > 0 && typeof blog.images[0] === 'string') {
      blog.images = blog.images.map(img => ({
        filename: img.split('/').pop(),
        path: img
      }))
    }
    
    if (blog.links) {
      try {

        if (typeof blog.links === 'string') {
          try {
            const parsed = JSON.parse(blog.links)
            blog.links = Array.isArray(parsed) ? parsed : (parsed ? [parsed] : [])
          } catch (e) {

            blog.links = []
          }
        } else if (Array.isArray(blog.links)) {

          blog.links = blog.links
        } else {
          blog.links = []
        }
      } catch (e) {
        blog.links = []
      }
    } else {
      blog.links = []
    }

    res.render("admin/blog-form", {
      title: "Edit Blog - Backpack Tech Works",
      blog,
      isEdit: true,
      user: req.user
    })
  } catch (error) {
    console.error(error)
    req.flash("error_msg", "Failed to load edit form")
    res.redirect("/admin/activities/blogs")
  }
})


function parseLinks(body) {
  let linksArray = []
  


  

  if (body.links && Array.isArray(body.links)) {
    linksArray = body.links
      .filter(link => link && (link.url || (typeof link === 'object' && Object.keys(link).length > 0)))
      .map(link => {
        if (typeof link === 'object' && link.url) {
          const linkText = link.text ? link.text.trim() : '';
          const linkUrl = link.url ? link.url.trim() : '';
          

          if (linkText && linkUrl) {
            return {
              text: linkText,
              url: linkUrl
            }
          }
        } else if (typeof link === 'string' && link.trim()) {

          return {
            text: link.trim(),
            url: link.trim()
          }
        }
        return null
      })
      .filter(Boolean)
  } else {


    const linkIndices = new Set()
    Object.keys(body).forEach(key => {

      const match = key.match(/links\[(\d*)\]\[(.+)\]/)
      if (match) {
        const index = match[1] === '' ? linkIndices.size : parseInt(match[1])
        linkIndices.add(index)
      }
    })
    

    const sortedIndices = Array.from(linkIndices).sort((a, b) => a - b)
    sortedIndices.forEach(index => {
      const link = {}
      Object.keys(body).forEach(key => {

        const match = key.match(/links\[(\d*)\]\[(.+)\]/)
        if (match) {
          const keyIndex = match[1] === '' ? sortedIndices.indexOf(index) : parseInt(match[1])
          if (keyIndex === index || (match[1] === '' && sortedIndices.indexOf(index) === sortedIndices.indexOf(parseInt(match[1] || '0')))) {
            link[match[2]] = body[key]
          }
        }
      })


      const linkText = link.text ? link.text.trim() : '';
      const linkUrl = link.url ? link.url.trim() : '';
      
      if (linkText && linkUrl) {
        linksArray.push({
          text: linkText,
          url: linkUrl
        })
      }
    })
    

    if (linksArray.length === 0) {
      const textKeys = Object.keys(body).filter(key => key.match(/links\[\]\[text\]/))
      const urlKeys = Object.keys(body).filter(key => key.match(/links\[\]\[url\]/))
      
      for (let i = 0; i < Math.max(textKeys.length, urlKeys.length); i++) {
        const textKey = `links[${i}][text]` in body ? `links[${i}][text]` : (textKeys[i] || null)
        const urlKey = `links[${i}][url]` in body ? `links[${i}][url]` : (urlKeys[i] || null)
        
        const linkText = (textKey && body[textKey]) ? body[textKey].trim() : '';
        const linkUrl = (urlKey && body[urlKey]) ? body[urlKey].trim() : '';
        

        if (linkText && linkUrl) {
          linksArray.push({
            text: linkText,
            url: linkUrl
          })
        }
      }
    }
  }
  

  return linksArray
}



const handleMulterError = (multerMiddleware) => {
  return (req, res, next) => {
    multerMiddleware(req, res, (err) => {
      if (err) {
        console.error("Multer error:", err)
        const errorMessage = encodeURIComponent(err.message || "File upload error occurred")

        if (req.params && req.params.id) {
          return res.redirect(`/admin/activities/blogs/edit/${req.params.id}?error=true&message=${errorMessage}`)
        } else {
          return res.redirect(`/admin/activities/blogs/add?error=true&message=${errorMessage}`)
        }
      }
      next()
    })
  }
}

router.post("/activities/blogs/add", ensureAdmin, parseFormDataMiddleware, async (req, res) => {
  try {
    const { title, slug, content, video_url, is_published, uploaded_images } = req.body


    let imagePaths = []
    if (uploaded_images) {

      if (typeof uploaded_images === 'string') {
        try {
          imagePaths = JSON.parse(uploaded_images)
        } catch (e) {
          imagePaths = uploaded_images.split(',').filter(url => url.trim())
        }
      } else if (Array.isArray(uploaded_images)) {
        imagePaths = uploaded_images
      }
    }


    let coverImagePath = null
    const coverImage = req.body.cover_image
    
    if (coverImage) {
      if (coverImage.startsWith('new_image_index_')) {

        const indexStr = coverImage.replace('new_image_index_', '')
        const index = parseInt(indexStr)
        if (!isNaN(index) && index >= 0 && index < imagePaths.length) {
          coverImagePath = imagePaths[index]
        }
      } else if (coverImage.startsWith('/images/Blogs/')) {

        coverImagePath = coverImage
      }
    }
    

    if (!coverImagePath && imagePaths.length > 0) {
      coverImagePath = imagePaths[0]
    }


    const linksArray = parseLinks(req.body)


    let blogSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    

    let finalSlug = blogSlug
    let counter = 1
    while (true) {
      const [existing] = await db.query("SELECT id FROM blogs WHERE slug = ?", [finalSlug])
      if (existing.length === 0) break
      finalSlug = `${blogSlug}-${counter}`
      counter++
    }

    await db.query(
      `INSERT INTO blogs (title, slug, content, cover_image, images, links, video_url, author_id, is_published) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        finalSlug,
        content,
        coverImagePath,
        JSON.stringify(imagePaths),
        JSON.stringify(linksArray),
        video_url || null,
        req.user.id,
        is_published === 'true' || is_published === true || is_published === 'on'
      ]
    )

    res.redirect("/admin/activities/blogs/add?success=true")
  } catch (error) {
    console.error("Error creating blog:", error)
    

    if (req.files) {
      Object.keys(req.files).forEach(fieldname => {
        req.files[fieldname].forEach(file => {
          try {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path)
            }
          } catch (unlinkError) {
            console.error("Error deleting file:", unlinkError)
          }
        })
      })
    }
    
    const errorMessage = encodeURIComponent(error.message || "Failed to create blog")
    res.redirect(`/admin/activities/blogs/add?error=true&message=${errorMessage}`)
  }
})


router.post("/activities/blogs/:id", ensureAdmin, parseFormDataMiddleware, async (req, res) => {
  try {
    const { id } = req.params
    const { title, slug, content, video_url, links, delete_images, is_published, uploaded_images, existing_images, existing_images_json } = req.body


    const [existingBlogs] = await db.query("SELECT * FROM blogs WHERE id = ?", [id])
    if (existingBlogs.length === 0) {

      if (req.files) {
        Object.keys(req.files).forEach(fieldname => {
          req.files[fieldname].forEach(file => {
            try {
              fs.unlinkSync(file.path)
            } catch (unlinkError) {
              console.error("Error deleting file:", unlinkError)
            }
          })
        })
      }
      const errorMessage = encodeURIComponent("Blog not found")
      return res.redirect(`/admin/activities/blogs/edit/${id}?error=true&message=${errorMessage}`)
    }

    const existingBlog = existingBlogs[0]



    let existingImages = []
    

    if (existing_images_json) {
      if (typeof existing_images_json === 'string') {
        try {
          const parsed = JSON.parse(existing_images_json)
          if (Array.isArray(parsed)) {
            existingImages = parsed.filter(img => img && typeof img === 'string' && img.trim())
          }
        } catch (e) {
          console.error('Error parsing existing_images_json:', e)
        }
      }
    }
    


    if (existingImages.length === 0 && existing_images) {
      if (typeof existing_images === 'string') {
        try {
          const parsed = JSON.parse(existing_images)
          if (Array.isArray(parsed)) {
            existingImages = parsed.filter(img => img && typeof img === 'string' && img.trim())
          }
        } catch (e) {

          existingImages = existing_images.split(',').filter(url => url && url.trim())
        }
      } else if (Array.isArray(existing_images)) {

        existingImages = existing_images.filter(img => img && (typeof img === 'string' ? img.trim() : true))
      }
    }
    

    if (existingImages.length === 0 && existingBlog.images) {
      try {
        if (typeof existingBlog.images === 'string') {
          try {
            const parsed = JSON.parse(existingBlog.images)
            existingImages = Array.isArray(parsed) ? parsed : [parsed]
          } catch (parseError) {
            existingImages = [existingBlog.images]
          }
        } else if (Array.isArray(existingBlog.images)) {
          existingImages = existingBlog.images
        }
      } catch (e) {
        existingImages = []
      }
    }
    

    existingImages = [...new Set(existingImages.map(img => String(img).trim()))]


    let originalImagesFromDB = []
    if (existingBlog.images) {
      try {
        if (typeof existingBlog.images === 'string') {
          try {
            const parsed = JSON.parse(existingBlog.images)
            originalImagesFromDB = Array.isArray(parsed) ? parsed : [parsed]
          } catch (parseError) {
            originalImagesFromDB = [existingBlog.images]
          }
        } else if (Array.isArray(existingBlog.images)) {
          originalImagesFromDB = existingBlog.images
        }
      } catch (e) {
        originalImagesFromDB = []
      }
    }


    if (delete_images) {
      const imagesToDelete = Array.isArray(delete_images) ? delete_images : [delete_images]
      imagesToDelete.forEach(imagePath => {
        const fullPath = path.join(__dirname, '../public', imagePath)
        if (fs.existsSync(fullPath)) {
          try {
            fs.unlinkSync(fullPath)
          } catch (e) {
            console.error("Error deleting image:", e)
          }
        }

        existingImages = existingImages.filter(img => img !== imagePath)
      })
    }


    if (uploaded_images) {

      let newImages = []
      if (typeof uploaded_images === 'string') {
        try {
          newImages = JSON.parse(uploaded_images)
        } catch (e) {
          newImages = uploaded_images.split(',').filter(url => url && url.trim())
        }
      } else if (Array.isArray(uploaded_images)) {
        newImages = uploaded_images.filter(url => url && url.trim())
      }
      

      const existingImageSet = new Set(existingImages)
      newImages.forEach(newImg => {
        if (!existingImageSet.has(newImg)) {
          existingImages.push(newImg)
        }
      })
    }


    const finalImageSet = new Set(existingImages)
    const removedImages = originalImagesFromDB.filter(img => !finalImageSet.has(img))
    
    removedImages.forEach(imagePath => {
      const fullPath = path.join(__dirname, '../public', imagePath)
      if (fs.existsSync(fullPath)) {
        try {
          fs.unlinkSync(fullPath)
        } catch (e) {
          console.error("Error deleting removed image:", e)
        }
      }
    })


    let coverImagePath = existingBlog.cover_image
    const coverImage = req.body.cover_image
    const oldCoverImage = existingBlog.cover_image
    
    if (coverImage) {
      if (coverImage.startsWith('new_image_index_')) {

        const indexStr = coverImage.replace('new_image_index_', '')
        const index = parseInt(indexStr)
        if (!isNaN(index) && index >= 0 && index < existingImages.length) {
          coverImagePath = existingImages[index]
        }
      } else if (coverImage.startsWith('/images/Blogs/')) {

        coverImagePath = coverImage
      }
    }
    

    if (!coverImagePath && existingImages.length > 0) {
      coverImagePath = existingImages[0]
    }


    if (oldCoverImage && oldCoverImage !== coverImagePath) {

      if (!existingImages.includes(oldCoverImage)) {
        const oldCoverPath = path.join(__dirname, '../public', oldCoverImage)
        if (fs.existsSync(oldCoverPath)) {
          try {
            fs.unlinkSync(oldCoverPath)
          } catch (e) {
            console.error("Error deleting old cover image:", e)
          }
        }
      }
    }


    const linksArray = parseLinks(req.body)


    let blogSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    

    let finalSlug = blogSlug
    if (finalSlug !== existingBlog.slug) {
      let counter = 1
      while (true) {
        const [existing] = await db.query("SELECT id FROM blogs WHERE slug = ? AND id != ?", [finalSlug, id])
        if (existing.length === 0) break
        finalSlug = `${blogSlug}-${counter}`
        counter++
      }
    }

    await db.query(
      `UPDATE blogs SET title = ?, slug = ?, content = ?, cover_image = ?, images = ?, links = ?, video_url = ?, is_published = ? WHERE id = ?`,
      [
        title,
        finalSlug,
        content,
        coverImagePath,
        JSON.stringify(existingImages),
        JSON.stringify(linksArray),
        video_url || null,
        is_published === 'true' || is_published === true || is_published === 'on',
        id
      ]
    )

    res.redirect(`/admin/activities/blogs/edit/${id}?success=true`)
  } catch (error) {
    console.error("Error updating blog:", error)
    

    if (req.files) {
      Object.keys(req.files).forEach(fieldname => {
        req.files[fieldname].forEach(file => {
          try {
            fs.unlinkSync(file.path)
          } catch (unlinkError) {
            console.error("Error deleting file:", unlinkError)
          }
        })
      })
    }
    
    const errorMessage = encodeURIComponent(error.message || "Failed to update blog")
    res.redirect(`/admin/activities/blogs/edit/${id}?error=true&message=${errorMessage}`)
  }
})


router.post("/activities/blogs/:id/toggle", ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const [blogs] = await db.query("SELECT is_published FROM blogs WHERE id = ?", [id])
    
    if (blogs.length === 0) {
      return res.status(404).json({ success: false, message: "Blog not found" })
    }

    const newStatus = !blogs[0].is_published
    await db.query("UPDATE blogs SET is_published = ? WHERE id = ?", [newStatus, id])
    
    res.json({ success: true, message: `Blog ${newStatus ? 'published' : 'unpublished'} successfully`, is_published: newStatus })
  } catch (error) {
    console.error("Error toggling blog:", error)
    res.status(500).json({ success: false, message: "Error updating blog status" })
  }
})


router.delete("/activities/blogs/:id", ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params


    const [blogs] = await db.query("SELECT cover_image, images FROM blogs WHERE id = ?", [id])
    
    if (blogs.length === 0) {
      return res.status(404).json({ success: false, message: "Blog not found" })
    }

    const blog = blogs[0]


    if (blog.cover_image) {
      const coverPath = path.join(__dirname, '../public', blog.cover_image)
      if (fs.existsSync(coverPath)) {
        try {
          fs.unlinkSync(coverPath)
        } catch (e) {
          console.error("Error deleting cover image:", e)
        }
      }
    }


    if (blog.images) {
      try {
        let images = []

        if (typeof blog.images === 'string') {
          try {
            images = JSON.parse(blog.images)
            if (!Array.isArray(images)) {
              images = [images]
            }
          } catch (parseError) {
            images = [blog.images]
          }
        } else if (Array.isArray(blog.images)) {
          images = blog.images
        }
        

        images.forEach(imagePath => {
          const fullPath = path.join(__dirname, '../public', imagePath)
          if (fs.existsSync(fullPath)) {
            try {
              fs.unlinkSync(fullPath)
            } catch (e) {
              console.error("Error deleting image:", e)
            }
          }
        })
      } catch (e) {
        console.error("Error parsing images:", e)
      }
    }


    await db.query("DELETE FROM blogs WHERE id = ?", [id])

    res.json({ success: true, message: "Blog and all associated images deleted successfully" })
  } catch (error) {
    console.error("Error deleting blog:", error)
    res.status(500).json({ success: false, message: "Error deleting blog" })
  }
})




router.get("/activities/polls", ensureAdmin, async (req, res) => {
  try {
    const [polls] = await db.query(`
      SELECT p.*, 
        (SELECT COUNT(*) FROM poll_votes WHERE poll_id = p.id) as vote_count
      FROM polls p
      ORDER BY p.created_at DESC
    `)



    for (let poll of polls) {
      if (poll.options) {
        if (typeof poll.options === 'string') {

          try {
            poll.options = JSON.parse(poll.options)
          } catch (e) {
            poll.options = []
          }
        } else if (Array.isArray(poll.options)) {

        } else if (typeof poll.options === 'object') {

          poll.options = Object.values(poll.options)
        } else {
          poll.options = []
        }
      } else {
        poll.options = []
      }
      

      const [votes] = await db.query(`
        SELECT option_index, COUNT(*) as count
        FROM poll_votes
        WHERE poll_id = ?
        GROUP BY option_index
      `, [poll.id])
      

      poll.optionVotes = []
      poll.totalVotes = poll.vote_count || 0
      for (let i = 0; i < poll.options.length; i++) {
        const voteData = votes.find(v => v.option_index === i)
        poll.optionVotes[i] = voteData ? voteData.count : 0
      }
    }

    res.render("admin/polls", {
      title: "Manage Polls - Backpack Tech Works",
      polls,
      user: req.user
    })
  } catch (error) {
    console.error(error)
    res.render("admin/polls", {
      title: "Manage Polls",
      polls: [],
      user: req.user
    })
  }
})


router.get("/activities/polls/add", ensureAdmin, async (req, res) => {
  try {
    res.render("admin/poll-form", {
      title: "Add Poll - Backpack Tech Works",
      isEdit: false,
      poll: {},
      user: req.user
    })
  } catch (error) {
    console.error(error)
    req.flash("error_msg", "Failed to load add form")
    res.redirect("/admin/activities/polls")
  }
})


router.get("/activities/polls/results/:id", ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const [polls] = await db.query(
      "SELECT * FROM polls WHERE id = ?",
      [id]
    )

    if (polls.length === 0) {
      req.flash("error_msg", "Poll not found")
      return res.redirect("/admin/activities/polls")
    }

    const poll = polls[0]


    let pollOptions = []
    if (poll.options) {
      if (typeof poll.options === 'string') {
        try {
          pollOptions = JSON.parse(poll.options)
        } catch (e) {
          pollOptions = []
        }
      } else if (Array.isArray(poll.options)) {
        pollOptions = poll.options
      } else if (typeof poll.options === 'object') {
        pollOptions = Object.values(poll.options)
      }
    }


    const [votes] = await db.query(`
      SELECT option_index, COUNT(*) as count
      FROM poll_votes
      WHERE poll_id = ?
      GROUP BY option_index
      ORDER BY option_index
    `, [id])
    

    const [totalVotes] = await db.query(`
      SELECT COUNT(*) as count
      FROM poll_votes
      WHERE poll_id = ?
    `, [id])
    

    const [recentVotes] = await db.query(`
      SELECT pv.*, u.name as user_name, u.email as user_email
      FROM poll_votes pv
      LEFT JOIN users u ON pv.user_id = u.id
      WHERE pv.poll_id = ?
      ORDER BY pv.created_at DESC
      LIMIT 10
    `, [id])


    const [votesByDate] = await db.query(`
      SELECT DATE(created_at) as vote_date, COUNT(*) as count
      FROM poll_votes
      WHERE poll_id = ?
      GROUP BY DATE(created_at)
      ORDER BY vote_date ASC
    `, [id])


    const optionVotes = []
    const total = totalVotes[0]?.count || 0
    for (let i = 0; i < pollOptions.length; i++) {
      const voteData = votes.find(v => v.option_index === i)
      optionVotes[i] = voteData ? voteData.count : 0
    }

    res.render("admin/poll-results", {
      title: `Poll Results - ${poll.question} - Backpack Tech Works`,
      poll: {
        ...poll,
        options: pollOptions
      },
      optionVotes,
      totalVotes: total,
      recentVotes,
      votesByDate,
      user: req.user
    })
  } catch (error) {
    console.error(error)
    req.flash("error_msg", "Failed to load poll results")
    res.redirect("/admin/activities/polls")
  }
})

router.get("/activities/polls/edit/:id", ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const [polls] = await db.query(
      "SELECT * FROM polls WHERE id = ?",
      [id]
    )

    if (polls.length === 0) {
      req.flash("error_msg", "Poll not found")
      return res.redirect("/admin/activities/polls")
    }

    const poll = polls[0]


    if (poll.options) {
      if (typeof poll.options === 'string') {

        try {
          poll.options = JSON.parse(poll.options)
        } catch (e) {
          poll.options = []
        }
      } else if (Array.isArray(poll.options)) {

      } else if (typeof poll.options === 'object') {

        poll.options = Object.values(poll.options)
      } else {
        poll.options = []
      }
    } else {
      poll.options = []
    }

    res.render("admin/poll-form", {
      title: "Edit Poll - Backpack Tech Works",
      poll,
      isEdit: true,
      user: req.user
    })
  } catch (error) {
    console.error(error)
    req.flash("error_msg", "Failed to load edit form")
    res.redirect("/admin/activities/polls")
  }
})


router.post("/activities/polls/add", ensureAdmin, async (req, res) => {
  try {
    const { question, options, is_active } = req.body


    let optionsArray = []
    if (options) {
      if (Array.isArray(options)) {
        optionsArray = options.filter(opt => opt && opt.trim())
      } else if (typeof options === 'string') {
        try {
          optionsArray = JSON.parse(options)
        } catch (e) {
          optionsArray = options.split(/[,\n]/).map(opt => opt.trim()).filter(opt => opt)
        }
      }
    }

    if (optionsArray.length < 2) {
      const errorMessage = encodeURIComponent("Poll must have at least 2 options")
      return res.redirect(`/admin/activities/polls/add?error=true&message=${errorMessage}`)
    }

    await db.query(
      `INSERT INTO polls (question, options, is_active) VALUES (?, ?, ?)`,
      [
        question,
        JSON.stringify(optionsArray),
        is_active === 'true' || is_active === true || is_active === 'on'
      ]
    )

    res.redirect("/admin/activities/polls/add?success=true")
  } catch (error) {
    console.error("Error creating poll:", error)
    const errorMessage = encodeURIComponent(error.message || "Failed to create poll")
    res.redirect(`/admin/activities/polls/add?error=true&message=${errorMessage}`)
  }
})


router.post("/activities/polls/:id", ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { question, options, is_active } = req.body


    const [existingPolls] = await db.query("SELECT * FROM polls WHERE id = ?", [id])
    if (existingPolls.length === 0) {
      const errorMessage = encodeURIComponent("Poll not found")
      return res.redirect(`/admin/activities/polls/edit/${id}?error=true&message=${errorMessage}`)
    }


    let optionsArray = []
    if (options) {
      if (Array.isArray(options)) {
        optionsArray = options.filter(opt => opt && opt.trim())
      } else if (typeof options === 'string') {
        try {
          optionsArray = JSON.parse(options)
        } catch (e) {
          optionsArray = options.split(/[,\n]/).map(opt => opt.trim()).filter(opt => opt)
        }
      }
    }

    if (optionsArray.length < 2) {
      const errorMessage = encodeURIComponent("Poll must have at least 2 options")
      return res.redirect(`/admin/activities/polls/edit/${id}?error=true&message=${errorMessage}`)
    }

    await db.query(
      `UPDATE polls SET question = ?, options = ?, is_active = ? WHERE id = ?`,
      [
        question,
        JSON.stringify(optionsArray),
        is_active === 'true' || is_active === true || is_active === 'on',
        id
      ]
    )

    res.redirect(`/admin/activities/polls/edit/${id}?success=true`)
  } catch (error) {
    console.error("Error updating poll:", error)
    const errorMessage = encodeURIComponent(error.message || "Failed to update poll")
    res.redirect(`/admin/activities/polls/edit/${id}?error=true&message=${errorMessage}`)
  }
})


router.post("/activities/polls/:id/toggle-active", ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params
    

    const [polls] = await db.query("SELECT is_active FROM polls WHERE id = ?", [id])
    if (polls.length === 0) {
      return res.status(404).json({ success: false, message: "Poll not found" })
    }
    
    const newStatus = !polls[0].is_active
    

    await db.query("UPDATE polls SET is_active = ? WHERE id = ?", [newStatus, id])
    
    res.json({ 
      success: true, 
      message: `Poll ${newStatus ? 'activated' : 'deactivated'} successfully`,
      is_active: newStatus
    })
  } catch (error) {
    console.error("Error toggling poll status:", error)
    res.status(500).json({ success: false, message: "Error toggling poll status" })
  }
})


router.delete("/activities/polls/:id", ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params
    await db.query("DELETE FROM polls WHERE id = ?", [id])
    res.json({ success: true, message: "Poll deleted successfully" })
  } catch (error) {
    console.error("Error deleting poll:", error)
    res.status(500).json({ success: false, message: "Error deleting poll" })
  }
})

module.exports = router


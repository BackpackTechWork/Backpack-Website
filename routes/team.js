const express = require("express")
const router = express.Router()
const db = require("../config/database")
const { upload, deleteOldProfilePicture } = require("../utils/upload")
const { getTeamProfileData, saveTeamProfileData, saveBioAndSocialLinks } = require("../services/teamProfileService")
const path = require("path")
const fs = require("fs")
const { ensureAuthenticated } = require("../middleware/auth")
const multer = require("multer")


const parseFormDataMiddleware = multer().none()


const parseChunkedUploadMiddleware = multer({
  limits: {
    fieldSize: 1 * 1024 * 1024, 
    fields: 10,
    fieldNameSize: 100
  }
}).none()

const { saveChunk, reassembleChunks, cleanupUpload, generateUploadId } = require("../utils/chunkedUpload")
const { convertBufferToWebP } = require("../utils/imageConverter")


const CHUNK_SIZE = 1024 * 1024 
const MAX_FILE_SIZE = 5 * 1024 * 1024 


const tempChunksDir = path.join(__dirname, '../temp/chunks')
if (!fs.existsSync(tempChunksDir)) {
  fs.mkdirSync(tempChunksDir, { recursive: true })
}


const completedUploads = new Map()


router.post("/api/chunked-upload/chunk", ensureAuthenticated, (req, res, next) => {
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


router.post("/api/chunked-upload/complete", ensureAuthenticated, (req, res, next) => {
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


    const uploadType = req.body.type || 'avatar'
    let targetDir, filenamePrefix, urlPrefix, quality, maxWidth, maxHeight
    
    if (uploadType === 'avatar') {
      targetDir = path.join(__dirname, '../public/profiles')
      filenamePrefix = 'profile_'
      urlPrefix = '/profiles/'
      quality = 90
      maxWidth = 800
      maxHeight = 800
    } else {
      targetDir = path.join(__dirname, '../public/profiles')
      filenamePrefix = 'profile_'
      urlPrefix = '/profiles/'
      quality = 90
      maxWidth = 800
      maxHeight = 800
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
    res.status(500).json({ success: false, message: error.message || "Error completing upload" })
  }
})


router.get("/api/chunked-upload/upload-id", ensureAuthenticated, (req, res) => {
  const uploadId = generateUploadId()
  res.json({ success: true, uploadId })
})


async function getTeamMemberPublicData(teamMemberId) {
  const [teamMembers] = await db.query(
    `SELECT tm.*, u.name, u.email, u.avatar, u.id as user_id
     FROM team_members tm
     JOIN users u ON tm.user_id = u.id
     WHERE tm.id = ? AND tm.is_active = true`,
    [teamMemberId]
  )

  const teamMember = teamMembers.length ? teamMembers[0] : null

  const profileData = {
    teamMember,
    experiences: [],
    education: [],
    licenses: [],
    projects: [],
    languages: [],
    markdownPreview: "",
  }

  if (!teamMember) {
    return profileData
  }

  const queries = [
    { key: "experiences", sql: "SELECT * FROM team_experiences WHERE team_member_id = ? ORDER BY display_order ASC, id ASC" },
    { key: "education", sql: "SELECT * FROM team_education WHERE team_member_id = ? ORDER BY display_order ASC, id ASC" },
    { key: "licenses", sql: "SELECT * FROM team_licenses WHERE team_member_id = ? ORDER BY display_order ASC, id ASC" },
    { key: "projects", sql: "SELECT * FROM team_personal_projects WHERE team_member_id = ? ORDER BY display_order ASC, id ASC" },
    { key: "languages", sql: "SELECT * FROM team_languages WHERE team_member_id = ? ORDER BY display_order ASC, id ASC" },
  ]

  for (const { key, sql } of queries) {
    const [rows] = await db.query(sql, [teamMemberId])
    profileData[key] = rows
  }


  if (teamMember?.skills) {
    try {
      teamMember.skills = Array.isArray(teamMember.skills)
        ? teamMember.skills
        : JSON.parse(teamMember.skills)
    } catch {
      teamMember.skills = []
    }
  } else {
    teamMember.skills = []
  }

  profileData.projects = profileData.projects.map((project) => {
    if (project.technologies) {
      try {
        project.technologies = Array.isArray(project.technologies)
          ? project.technologies
          : JSON.parse(project.technologies)
      } catch {
        project.technologies = []
      }
    } else {
      project.technologies = []
    }
    return project
  })


  if (teamMember?.bio_markdown) {
    const { renderMarkdownToHtml } = require("../utils/markdown")
    profileData.markdownPreview = renderMarkdownToHtml(teamMember.bio_markdown)
  }

  return profileData
}


router.get("/", async (req, res) => {
  try {
    const [teamMembers] = await db.query(`
      SELECT tm.*, u.name, u.email, u.avatar, u.id as user_id
      FROM team_members tm
      JOIN users u ON tm.user_id = u.id
      WHERE tm.is_active = true
      ORDER BY tm.display_order ASC, tm.id ASC
    `)


    const formattedMembers = teamMembers.map(member => {
      let skills = []
      if (member.skills) {
        try {
          skills = Array.isArray(member.skills) ? member.skills : JSON.parse(member.skills)
        } catch {
          skills = []
        }
      }


      let avatar = member.avatar
      if (avatar && avatar.includes('googleusercontent.com')) {
        avatar = avatar.replace(/=s\d+-c$/, '') + '=s256-c'
      }

      return {
        id: member.id,
        user_id: member.user_id,
        name: member.name,
        position: member.position,
        bio: member.bio,
        avatar: avatar,
        alter_ego: member.alter_ego,
        skills: skills,
        linkedin: member.linkedin,
        github: member.github,
        twitter: member.twitter,
        instagram: member.instagram,
        facebook: member.facebook,
        profile_type: member.profile_type || 'markdown'
      }
    })

    res.render("team/index", {
      title: "Meet Our Team - Backpack Tech Works",
      seoDescription: "Meet the talented professionals behind Backpack Tech Works. Our expert team of developers, designers, and consultants dedicated to delivering exceptional software solutions.",
      seoKeywords: "Backpack Tech Works team, software developers, tech team, development team, expert developers",
      seoImage: "/Backpack.webp",
      seoType: "website",
      teamMembers: formattedMembers,
    })
  } catch (error) {
    console.error("Error loading team members:", error)
    res.render("team/index", {
      title: "Meet Our Team - Backpack Tech Works",
      seoDescription: "Meet the talented professionals behind Backpack Tech Works. Our expert team of developers, designers, and consultants dedicated to delivering exceptional software solutions.",
      seoKeywords: "Backpack Tech Works team, software developers, tech team, development team, expert developers",
      seoImage: "/Backpack.webp",
      seoType: "website",
      teamMembers: [],
    })
  }
})


router.get("/profile", ensureAuthenticated, async (req, res) => {
  try {
    if (!req.user || (req.user.role !== 'team_member' && req.user.role !== 'admin')) {
      return res.redirect("/")
    }

    const profileData = await getTeamProfileData(req.user.id)

    res.render("team/profile", {
      title: "My Profile - Backpack Tech Works",
      user: req.user,
      ...profileData,
    })
  } catch (error) {
    console.error("Error loading profile:", error)
    res.redirect("/")
  }
})


router.get("/:id", async (req, res) => {
  try {
    const teamMemberId = parseInt(req.params.id)
    
    if (isNaN(teamMemberId)) {
      return res.status(404).render("404", { title: "Team Member Not Found" })
    }

    const profileData = await getTeamMemberPublicData(teamMemberId)

    if (!profileData.teamMember) {
      return res.status(404).render("404", { title: "Team Member Not Found" })
    }

    const member = profileData.teamMember


    let avatar = member.avatar
    if (avatar && avatar.includes('googleusercontent.com')) {
      avatar = avatar.replace(/=s\d+-c$/, '') + '=s256-c'
    }


    const memberData = {
      id: member.id,
      user_id: member.user_id,
      name: member.name,
      position: member.position,
      bio: member.bio,
      bio_markdown: member.bio_markdown,
      avatar: avatar,
      alter_ego: member.alter_ego,
      skills: member.skills,
      linkedin: member.linkedin,
      github: member.github,
      twitter: member.twitter,
      instagram: member.instagram,
      facebook: member.facebook,
      profile_type: member.profile_type || 'markdown'
    }

    console.log(memberData.bio_markdown)

    const memberDescription = member.bio 
      ? (member.bio.length > 160 ? member.bio.substring(0, 157) + '...' : member.bio)
      : `Meet ${member.name}, ${member.position} at Backpack Tech Works. Expert software development professional.`;
    
    const memberImage = member.avatar 
      ? (member.avatar.startsWith('http') ? member.avatar : `/avatars/${member.avatar}`)
      : "/Backpack.webp";
    
    const memberUrl = `${process.env.SITE_URL || 'https://backpacktechworks.com'}/team/${member.id}`;
    

    const structuredData = {
      "@type": "Person",
      "@id": `${memberUrl}#person`,
      "name": member.name,
      "jobTitle": member.position,
      "description": member.bio || memberDescription,
      "url": memberUrl,
      "image": memberImage.startsWith('http') ? memberImage : `${process.env.SITE_URL || 'https://backpacktechworks.com'}${memberImage}`,
      "worksFor": {
        "@id": `${process.env.SITE_URL || 'https://backpacktechworks.com'}#organization`
      }
    };
    
    if (member.linkedin) {
      structuredData.sameAs = [member.linkedin];
      if (member.github) structuredData.sameAs.push(member.github);
      if (member.twitter) structuredData.sameAs.push(member.twitter);
    }
    
    res.render("team/detail", {
      title: `${member.name} - Backpack Tech Works`,
      seoDescription: memberDescription,
      seoKeywords: `${member.name}, ${member.position}, Backpack Tech Works team, software developer`,
      seoImage: memberImage,
      seoType: "profile",
      structuredData: structuredData,
      member: memberData,
      ...profileData,
    })
  } catch (error) {
    console.error("Error loading team member:", error)
    return res.status(404).render("404", { title: "Team Member Not Found" })
  }
})


router.post("/profile/bio-social", ensureAuthenticated, async (req, res) => {
  try {
    if (!req.user || (req.user.role !== 'team_member' && req.user.role !== 'admin')) {
      return res.status(403).json({ success: false, message: "Unauthorized" })
    }

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


router.post("/profile", ensureAuthenticated, parseFormDataMiddleware, async (req, res) => {
  try {
    if (!req.user || (req.user.role !== 'team_member' && req.user.role !== 'admin')) {
      return res.status(403).json({ success: false, message: "Unauthorized" })
    }

    const parsedData = parseFormData(req.body)


    const payload = {
      ...parsedData,
      shortBio: parsedData.bio ?? parsedData.shortBio,
    }
    

    if (req.user.role === 'team_member') {
      delete payload.position
    }

    await saveTeamProfileData(req.user.id, payload)

    res.json({ success: true, message: "Profile updated successfully" })
  } catch (error) {
    console.error("Error updating profile:", error)
    const status = error.statusCode || 500
    res.status(status).json({ success: false, message: error.message || "Error updating profile" })
  }
})


router.post("/change-password", ensureAuthenticated, async (req, res) => {
  try {
    if (!req.user || (req.user.role !== 'team_member' && req.user.role !== 'admin')) {
      return res.status(403).json({ success: false, message: "Unauthorized" })
    }

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


router.post("/upload-avatar", ensureAuthenticated, parseFormDataMiddleware, async (req, res) => {
  try {
    const { avatarUrl } = req.body

    if (!req.user || (req.user.role !== 'team_member' && req.user.role !== 'admin')) {
      return res.status(403).json({ success: false, message: "Unauthorized" })
    }


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


router.post("/upload-alter-ego", ensureAuthenticated, parseFormDataMiddleware, async (req, res) => {
  try {
    const { avatarUrl } = req.body

    if (!req.user || (req.user.role !== 'team_member' && req.user.role !== 'admin')) {
      return res.status(403).json({ success: false, message: "Unauthorized" })
    }


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

module.exports = router


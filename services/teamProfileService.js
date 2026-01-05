const db = require("../config/database")
const { validateMarkdown, normalizeMarkdown, renderMarkdownToHtml } = require("../utils/markdown")
const { invalidateUserCache } = require("../config/passport")

const sanitizeString = (value) => {
  if (value === undefined || value === null) return null
  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }
  return value
}

const normalizeDate = (value) => {
  const sanitized = sanitizeString(value)
  return sanitized || null
}

async function getTeamProfileData(userId) {
  const [teamMembers] = await db.query(
    "SELECT * FROM team_members WHERE user_id = ?",
    [userId]
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

  const teamMemberId = teamMember.id

  if (!teamMemberId) {
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

  profileData.markdownPreview = teamMember?.bio_markdown
    ? renderMarkdownToHtml(teamMember.bio_markdown)
    : ""

  return profileData
}

async function saveTeamProfileData(userId, payload = {}) {
  const {
    name,
    email,
    position,
    shortBio,
    bio_markdown,
    bio,
    profile_type,
    skills = [],
    linkedin,
    github,
    twitter,
    instagram,
    facebook,
    experiences = [],
    education = [],
    licenses = [],
    projects = [],
    languages = [],
  } = payload




  if (bio_markdown && !validateMarkdown(bio_markdown)) {
    const error = new Error("Invalid markdown content detected")
    error.statusCode = 400
    throw error
  }


  if (name !== undefined || email !== undefined) {

    const [currentUser] = await db.query(
      "SELECT name, email FROM users WHERE id = ?",
      [userId]
    )
    
    const currentName = currentUser.length > 0 ? currentUser[0].name : null
    const currentEmail = currentUser.length > 0 ? currentUser[0].email : null
    

    const nameToUpdate = name !== undefined ? sanitizeString(name) : currentName
    const emailToUpdate = email !== undefined ? sanitizeString(email) : currentEmail
    
    await db.query(
      "UPDATE users SET name = ?, email = ? WHERE id = ?",
      [nameToUpdate, emailToUpdate, userId]
    )
    
    // Invalidate user cache after update
    invalidateUserCache(userId)
  }


  const [existingRows] = await db.query(
    "SELECT id FROM team_members WHERE user_id = ?",
    [userId]
  )

  let teamMemberId

  const normalizedMarkdown = normalizeMarkdown(bio_markdown)


  let positionToUpdate = sanitizeString(position)
  if (!positionToUpdate && existingRows.length) {

    const [existing] = await db.query("SELECT position FROM team_members WHERE id = ?", [existingRows[0].id])
    if (existing.length > 0) {
      positionToUpdate = existing[0].position
    }
  }




  let bioToSave = null
  let markdownToSave = null
  
  if (profile_type !== undefined) {

    bioToSave = sanitizeString(bio || shortBio || payload.bio)
    markdownToSave = normalizedMarkdown
  } else {

    if (existingRows.length) {
      const [existing] = await db.query(
        "SELECT bio, bio_markdown FROM team_members WHERE id = ?",
        [existingRows[0].id]
      )
      if (existing.length > 0) {

        bioToSave = (bio || shortBio || payload.bio) ? sanitizeString(bio || shortBio || payload.bio) : existing[0].bio
        markdownToSave = (bio_markdown && normalizedMarkdown) ? normalizedMarkdown : existing[0].bio_markdown
      } else {
        bioToSave = sanitizeString(bio || shortBio || payload.bio)
        markdownToSave = normalizedMarkdown
      }
    } else {
      bioToSave = sanitizeString(bio || shortBio || payload.bio)
      markdownToSave = normalizedMarkdown
    }
  }


  let profileTypeToSave = sanitizeString(profile_type)
  if (!profileTypeToSave && existingRows.length) {
    const [existing] = await db.query("SELECT profile_type FROM team_members WHERE id = ?", [existingRows[0].id])
    if (existing.length > 0 && existing[0].profile_type) {
      profileTypeToSave = existing[0].profile_type
    }
  }
  profileTypeToSave = profileTypeToSave || 'markdown'


  let linkedinToSave = sanitizeString(linkedin)
  let githubToSave = sanitizeString(github)
  let twitterToSave = sanitizeString(twitter)
  let instagramToSave = sanitizeString(instagram)
  let facebookToSave = sanitizeString(facebook)

  if (existingRows.length && (linkedin === undefined && github === undefined && twitter === undefined && instagram === undefined && facebook === undefined)) {

    const [existing] = await db.query(
      "SELECT linkedin, github, twitter, instagram, facebook FROM team_members WHERE id = ?",
      [existingRows[0].id]
    )
    if (existing.length > 0) {
      linkedinToSave = linkedinToSave ?? existing[0].linkedin
      githubToSave = githubToSave ?? existing[0].github
      twitterToSave = twitterToSave ?? existing[0].twitter
      instagramToSave = instagramToSave ?? existing[0].instagram
      facebookToSave = facebookToSave ?? existing[0].facebook
    }
  }

  const profileFields = [
    positionToUpdate,
    bioToSave,
    markdownToSave,
    JSON.stringify(Array.isArray(skills) ? skills : []),
    linkedinToSave,
    githubToSave,
    twitterToSave,
    instagramToSave,
    facebookToSave,
    profileTypeToSave,
  ]

  if (existingRows.length) {
    teamMemberId = existingRows[0].id
    await db.query(
      `UPDATE team_members 
        SET position = ?, bio = ?, bio_markdown = ?, skills = ?, linkedin = ?, github = ?, twitter = ?, instagram = ?, facebook = ?, profile_type = ?
        WHERE id = ?`,
      [...profileFields, teamMemberId]
    )
  } else {
    const [result] = await db.query(
      `INSERT INTO team_members (user_id, position, bio, bio_markdown, skills, linkedin, github, twitter, instagram, facebook, profile_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, ...profileFields]
    )
    teamMemberId = result.insertId
  }

  const deleteAndInsert = async (table, items, mapper) => {
    await db.query(`DELETE FROM ${table} WHERE team_member_id = ?`, [teamMemberId])
    if (!items || !Array.isArray(items) || !items.length) return

    let order = 0
    for (const item of items) {
      const values = mapper(item, order)
      if (!values) continue
      order += 1
      const placeholders = new Array(values.length).fill("?").join(", ")
      await db.query(
        `INSERT INTO ${table} (${mapper.columns.join(", ")}) VALUES (${placeholders})`,
        values
      )
    }
  }

  deleteAndInsert.columns = {}

const sanitizeExperience = (item = {}, order = 0) => {
    const title = sanitizeString(item.title)
    const company = sanitizeString(item.company)
    if (!title || !company) return null

    return [
      teamMemberId,
      title,
      company,
      sanitizeString(item.description),
      normalizeDate(item.start_date),
    normalizeDate(item.end_date),
    !!item.is_current,
    item.display_order ?? order,
    ]
  }
  sanitizeExperience.columns = [
    "team_member_id",
    "title",
    "company",
    "description",
    "start_date",
    "end_date",
    "is_current",
    "display_order",
  ]

const sanitizeEducation = (item = {}, order = 0) => {
    const degree = sanitizeString(item.degree)
    const institution = sanitizeString(item.institution)
    if (!degree || !institution) return null

    return [
      teamMemberId,
      degree,
      sanitizeString(item.field_of_study),
      institution,
      sanitizeString(item.description),
      normalizeDate(item.start_date),
    normalizeDate(item.end_date),
    item.display_order ?? order,
    ]
  }
  sanitizeEducation.columns = [
    "team_member_id",
    "degree",
    "field_of_study",
    "institution",
    "description",
    "start_date",
    "end_date",
    "display_order",
  ]

const sanitizeLicense = (item = {}, order = 0) => {
    const name = sanitizeString(item.name)
    if (!name) return null

    return [
      teamMemberId,
      name,
      sanitizeString(item.issuing_organization),
      normalizeDate(item.issue_date),
      normalizeDate(item.expiry_date),
      sanitizeString(item.credential_id),
    sanitizeString(item.credential_url),
    item.display_order ?? order,
    ]
  }
  sanitizeLicense.columns = [
    "team_member_id",
    "name",
    "issuing_organization",
    "issue_date",
    "expiry_date",
    "credential_id",
    "credential_url",
    "display_order",
  ]

const sanitizeProject = (item = {}, order = 0) => {
    const name = sanitizeString(item.name)
    if (!name) return null

    const technologiesArray = Array.isArray(item.technologies)
      ? item.technologies
      : typeof item.technologies === "string" && item.technologies.length
        ? item.technologies.split(",").map((t) => t.trim()).filter(Boolean)
        : []

    return [
      teamMemberId,
      name,
      sanitizeString(item.description),
      sanitizeString(item.url),
      normalizeDate(item.start_date),
      normalizeDate(item.end_date),
    JSON.stringify(technologiesArray),
    item.display_order ?? order,
    ]
  }
  sanitizeProject.columns = [
    "team_member_id",
    "name",
    "description",
    "url",
    "start_date",
    "end_date",
    "technologies",
    "display_order",
  ]

const sanitizeLanguage = (item = {}, order = 0) => {
    const language = sanitizeString(item.language)
    if (!language) return null

    const allowedLevels = ["beginner", "intermediate", "advanced", "native"]
    const level = allowedLevels.includes(item.proficiency_level)
      ? item.proficiency_level
      : "intermediate"

    return [
      teamMemberId,
      language,
      level,
      item.display_order ?? order,
    ]
  }
  sanitizeLanguage.columns = [
    "team_member_id",
    "language",
    "proficiency_level",
    "display_order",
  ]

  await deleteAndInsert("team_experiences", experiences, sanitizeExperience)
  await deleteAndInsert("team_education", education, sanitizeEducation)
  await deleteAndInsert("team_licenses", licenses, sanitizeLicense)
  await deleteAndInsert("team_personal_projects", projects, sanitizeProject)
  await deleteAndInsert("team_languages", languages, sanitizeLanguage)

  return { teamMemberId }
}

async function saveBioAndSocialLinks(userId, payload = {}) {
  const {
    bio,
    shortBio,
    linkedin,
    github,
    twitter,
    instagram,
    facebook,
  } = payload


  const [existingRows] = await db.query(
    "SELECT id, bio, bio_markdown, profile_type FROM team_members WHERE user_id = ?",
    [userId]
  )

  if (existingRows.length === 0) {

    const [result] = await db.query(
      `INSERT INTO team_members (user_id, bio, linkedin, github, twitter, instagram, facebook, profile_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        sanitizeString(bio || shortBio),
        sanitizeString(linkedin),
        sanitizeString(github),
        sanitizeString(twitter),
        sanitizeString(instagram),
        sanitizeString(facebook),
        'markdown' 
      ]
    )
    return { teamMemberId: result.insertId }
  }

  const teamMemberId = existingRows[0].id
  const existing = existingRows[0]



  const bioToUpdate = (bio !== undefined || shortBio !== undefined) 
    ? sanitizeString(bio || shortBio) 
    : existing.bio

  await db.query(
    `UPDATE team_members 
      SET bio = ?, linkedin = ?, github = ?, twitter = ?, instagram = ?, facebook = ?
      WHERE id = ?`,
    [
      bioToUpdate,
      sanitizeString(linkedin),
      sanitizeString(github),
      sanitizeString(twitter),
      sanitizeString(instagram),
      sanitizeString(facebook),
      teamMemberId
    ]
  )

  return { teamMemberId }
}

module.exports = {
  getTeamProfileData,
  saveTeamProfileData,
  saveBioAndSocialLinks,
}



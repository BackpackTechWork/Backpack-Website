const fs = require("fs")
const path = require("path")


async function ensureAdminAccount(db) {
  const bcrypt = require("bcrypt")

  const [[existing]] = await db.query("SELECT id FROM users WHERE email=? LIMIT 1", ["admin@backpack.com"])
  if (existing) return


  const [[admins]] = await db.query("SELECT COUNT(*) as c FROM users WHERE role='admin'")
  if (admins.c > 0) return

  const adminPassword = await bcrypt.hash("admin123", 10)
  await db.query(
    `INSERT INTO users (email, name, avatar, provider, provider_id, role, password) VALUES (?,?,?,?,?,?,?)`,
    ["admin@backpack.com", "Admin User", null, "local", "admin_local", "admin", adminPassword]
  )
  console.log("    ✅ Admin account created")
}


async function ensureTeamMemberAccount(db) {
  const bcrypt = require("bcrypt")

  const [[existing]] = await db.query("SELECT id FROM users WHERE email=? LIMIT 1", ["team@backpack.com"])
  if (existing) return


  const [[teamMembers]] = await db.query("SELECT COUNT(*) as c FROM users WHERE role='team_member'")
  if (teamMembers.c > 0) return

  const teamPassword = await bcrypt.hash("team123", 10)
  await db.query(
    `INSERT INTO users (email, name, avatar, provider, provider_id, role, password) VALUES (?,?,?,?,?,?,?)`,
    ["team@backpack.com", "Team Member", null, "local", "team_local", "team_member", teamPassword]
  )
  console.log("    ✅ Team member account created")
}


async function ensureTeamMemberRecords(db) {
  const [[admin]] = await db.query("SELECT id FROM users WHERE role='admin' LIMIT 1")
  const [[team]] = await db.query("SELECT id FROM users WHERE role='team_member' LIMIT 1")
  
  if (admin) {
    const [[existingAdminRecord]] = await db.query("SELECT id FROM team_members WHERE user_id=? LIMIT 1", [admin.id])
    if (!existingAdminRecord) {
      await db.query(
        `INSERT INTO team_members (user_id, position, bio, skills, linkedin, github, twitter, image, display_order, is_active) VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [admin.id, "Founder & CTO", "Leading technology and product.", JSON.stringify(["Architecture", "Security", "Leadership"]), "https://linkedin.com", "https://github.com", "https://twitter.com", null, 1, true]
      )
    }
  }

  if (team) {
    const [[existingTeamRecord]] = await db.query("SELECT id FROM team_members WHERE user_id=? LIMIT 1", [team.id])
    if (!existingTeamRecord) {
      await db.query(
        `INSERT INTO team_members (user_id, position, bio, skills, linkedin, github, twitter, image, display_order, is_active) VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [team.id, "Full-Stack Engineer", "Building web and mobile solutions.", JSON.stringify(["React", "Node.js", "SQL"]), "https://linkedin.com", "https://github.com", "https://twitter.com", null, 2, true]
      )
    }
  }
}


async function executeSqlFile(db, sqlFilePath) {
  if (!fs.existsSync(sqlFilePath)) {
    console.log(`    SQL file not found: ${sqlFilePath}, skipping SQL seeding`)
    return
  }

  const sql = fs.readFileSync(sqlFilePath, "utf8")
  

  const statements = []
  let currentStatement = ""
  let inSingleQuote = false
  let inDoubleQuote = false
  let inBacktick = false
  let inComment = false
  let commentType = null 
  let i = 0
  
  while (i < sql.length) {
    const char = sql[i]
    const nextChar = sql[i + 1]
    const prevChar = i > 0 ? sql[i - 1] : ''
    const prevPrevChar = i > 1 ? sql[i - 2] : ''
    

    const isEscaped = prevChar === '\\' && prevPrevChar !== '\\'
    

    if (!inSingleQuote && !inDoubleQuote && !inBacktick && !isEscaped) {

      if (char === '-' && nextChar === '-' && !inComment) {
        inComment = true
        commentType = '--'
        i += 2
        continue
      }

      if (char === '/' && nextChar === '*' && !inComment) {
        inComment = true
        commentType = '/*'
        i += 2
        continue
      }

      if (inComment && commentType === '/*' && char === '*' && nextChar === '/') {
        inComment = false
        commentType = null
        i += 2
        continue
      }

      if (inComment && commentType === '--' && char === '\n') {
        inComment = false
        commentType = null
        i++
        continue
      }
      
      if (inComment) {
        i++
        continue
      }
    }
    

    if (!inComment && !isEscaped) {
      if (char === "'" && !inDoubleQuote && !inBacktick) {
        inSingleQuote = !inSingleQuote
      } else if (char === '"' && !inSingleQuote && !inBacktick) {
        inDoubleQuote = !inDoubleQuote
      } else if (char === '`' && !inSingleQuote && !inDoubleQuote) {
        inBacktick = !inBacktick
      }
    }
    

    if (char === ';' && !inSingleQuote && !inDoubleQuote && !inBacktick && !inComment) {
      const trimmed = currentStatement.trim()
      if (trimmed.length > 0 && !trimmed.match(/^\/\*!.*\*\/$/)) {
        statements.push(trimmed)
      }
      currentStatement = ""
      i++
      continue
    }
    
    if (!inComment) {
      currentStatement += char
    }
    i++
  }
  

  const trimmed = currentStatement.trim()
  if (trimmed.length > 0 && !trimmed.match(/^\/\*!.*\*\/$/)) {
    statements.push(trimmed)
  }


  let executed = 0
  for (const statement of statements) {
    if (statement.trim()) {
      try {
        await db.query(statement)
        executed++
      } catch (error) {

        const errorMsg = error.message.toLowerCase()
        if (errorMsg.includes("duplicate entry") || 
            errorMsg.includes("table") && errorMsg.includes("doesn't exist") ||
            errorMsg.includes("unknown table")) {

          continue
        }
        console.error(`    ⚠️  Error executing SQL: ${error.message.substring(0, 100)}`)

      }
    }
  }
  
  if (executed > 0) {
    console.log(`    ✅ Demo data seeded successfully (${executed} statements executed)`)
  } else {
    console.log(`    ⚠️  No statements executed (may already be seeded)`)
  }
}


async function ensureEssentialAccounts(db) {
  await ensureAdminAccount(db)
  await ensureTeamMemberAccount(db)
  await ensureTeamMemberRecords(db)
}


async function seedFromSqlFile(db, sqlFilePath) {
  await executeSqlFile(db, sqlFilePath)
}

async function seedAll(db, sqlFilePath) {

  if (sqlFilePath) {
    await seedFromSqlFile(db, sqlFilePath)
  }

  console.log("  ✅ Seeding complete\n")
}


module.exports = { seedAll, ensureEssentialAccounts }


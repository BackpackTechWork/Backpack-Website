const passport = require("passport")
const GoogleStrategy = require("passport-google-oauth20").Strategy
const GitHubStrategy = require("passport-github2").Strategy
const db = require("./database")


passport.serializeUser((user, done) => {
  done(null, user.id)
})


passport.deserializeUser(async (id, done) => {
  try {
    const [rows] = await db.query("SELECT * FROM users WHERE id = ?", [id])
    

    if (!rows || rows.length === 0 || !rows[0]) {
      return done(null, false)
    }
    
    done(null, rows[0])
  } catch (error) {

    console.error("Error deserializing user:", error)
    done(null, false)
  }
})


if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CALLBACK_URL) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {

          const [existingUser] = await db.query("SELECT * FROM users WHERE provider = ? AND provider_id = ?", [
            "google",
            profile.id,
          ])

          if (existingUser.length > 0) {

            const newAvatar = profile.photos[0]?.value || existingUser[0].avatar
            const newName = profile.displayName || existingUser[0].name
            await db.query(
              "UPDATE users SET avatar = ?, name = ?, last_login = NOW() WHERE id = ?",
              [newAvatar, newName, existingUser[0].id]
            )

            const [updatedUser] = await db.query("SELECT * FROM users WHERE id = ?", [existingUser[0].id])
            return done(null, updatedUser[0])
          }


          const email = profile.emails[0].value
          const [shellAccount] = await db.query(
            "SELECT * FROM users WHERE email = ? AND role = 'client' AND provider = ? AND (provider_id IS NULL OR provider_id = '')",
            [email, "google"]
          )

          if (shellAccount.length > 0) {


            const newAvatar = profile.photos[0]?.value || shellAccount[0].avatar
            const newName = profile.displayName || shellAccount[0].name
            await db.query(
              "UPDATE users SET provider = ?, provider_id = ?, avatar = ?, name = ?, last_login = NOW() WHERE id = ?",
              ["google", profile.id, newAvatar, newName, shellAccount[0].id]
            )

            const [updatedUser] = await db.query("SELECT * FROM users WHERE id = ?", [shellAccount[0].id])
            return done(null, updatedUser[0])
          }


          const [result] = await db.query(
            "INSERT INTO users (email, name, avatar, provider, provider_id, role, last_login) VALUES (?, ?, ?, ?, ?, ?, NOW())",
            [email, profile.displayName, profile.photos[0]?.value, "google", profile.id, "client"],
          )

          const [newUser] = await db.query("SELECT * FROM users WHERE id = ?", [result.insertId])
          done(null, newUser[0])
        } catch (error) {

          if (error.code === 'ER_DUP_ENTRY' && error.sqlMessage && error.sqlMessage.includes('users.email')) {
            const email = profile.emails[0].value
            const customError = new Error(`You already have an account with this email ${email}. Please sign in instead.`)
            customError.status = 400
            customError.email = email
            return done(customError, null)
          }
          done(error, null)
        }
      },
    ),
  )
} else {
  console.warn("[auth] Google OAuth is disabled: missing GOOGLE_CLIENT_ID/SECRET/CALLBACK_URL")
}


if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET && process.env.GITHUB_CALLBACK_URL) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: process.env.GITHUB_CALLBACK_URL,
        scope: ["user:email"],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {

          const [existingUser] = await db.query("SELECT * FROM users WHERE provider = ? AND provider_id = ?", [
            "github",
            profile.id,
          ])

          if (existingUser.length > 0) {

            const newAvatar = profile.photos[0]?.value || existingUser[0].avatar
            const newName = profile.displayName || profile.username || existingUser[0].name
            await db.query(
              "UPDATE users SET avatar = ?, name = ?, last_login = NOW() WHERE id = ?",
              [newAvatar, newName, existingUser[0].id]
            )

            const [updatedUser] = await db.query("SELECT * FROM users WHERE id = ?", [existingUser[0].id])
            return done(null, updatedUser[0])
          }


          const email = profile.emails && profile.emails[0] ? profile.emails[0].value : `${profile.username}@github.com`
          const [shellAccount] = await db.query(
            "SELECT * FROM users WHERE email = ? AND role = 'client' AND provider = ? AND (provider_id IS NULL OR provider_id = '')",
            [email, "github"]
          )

          if (shellAccount.length > 0) {


            const newAvatar = profile.photos[0]?.value || shellAccount[0].avatar
            const newName = profile.displayName || profile.username || shellAccount[0].name
            await db.query(
              "UPDATE users SET provider = ?, provider_id = ?, avatar = ?, name = ?, last_login = NOW() WHERE id = ?",
              ["github", profile.id, newAvatar, newName, shellAccount[0].id]
            )

            const [updatedUser] = await db.query("SELECT * FROM users WHERE id = ?", [shellAccount[0].id])
            return done(null, updatedUser[0])
          }


          const [result] = await db.query(
            "INSERT INTO users (email, name, avatar, provider, provider_id, role, last_login) VALUES (?, ?, ?, ?, ?, ?, NOW())",
            [email, profile.displayName || profile.username, profile.photos[0]?.value, "github", profile.id, "client"],
          )

          const [newUser] = await db.query("SELECT * FROM users WHERE id = ?", [result.insertId])
          done(null, newUser[0])
        } catch (error) {

          if (error.code === 'ER_DUP_ENTRY' && error.sqlMessage && error.sqlMessage.includes('users.email')) {
            const email = profile.emails && profile.emails[0] ? profile.emails[0].value : `${profile.username}@github.com`
            const customError = new Error(`You already have an account with this email ${email}. Please sign in instead.`)
            customError.status = 400
            customError.email = email
            return done(customError, null)
          }
          done(error, null)
        }
      },
    ),
  )
} else {
  console.warn("[auth] GitHub OAuth is disabled: missing GITHUB_CLIENT_ID/SECRET/CALLBACK_URL")
}

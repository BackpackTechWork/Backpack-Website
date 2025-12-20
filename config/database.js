const mysql = require("mysql2")
const readline = require("readline")

const DB_HOST = process.env.DB_HOST || "localhost"
const DB_USER = process.env.DB_USER || "root"
const DB_PASSWORD = process.env.DB_PASSWORD || ""
const DB_NAME = process.env.DB_NAME || "backpack_tech_works"

let pool
let promisePool

async function addColumnIfMissing(table, column, definition) {
  try {
    await promisePool.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
  } catch (error) {
    if (!error.message.includes("Duplicate column name")) {
      throw error
    }
  }
}

async function createDatabaseIfNotExists() {
  const connection = mysql.createConnection({ host: DB_HOST, user: DB_USER, password: DB_PASSWORD })
  const exec = connection.promise()
  await exec.query(
    `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`,
  )
  connection.end()
  console.log(`  ✅ Database '${DB_NAME}' ready`)
}

async function createTablesIfNotExist() {
  console.log("\n  📦 Creating database tables...")
  
  await promisePool.query(`CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar VARCHAR(500),
    provider VARCHAR(50) NOT NULL,
    provider_id VARCHAR(255),
    role ENUM('client', 'team_member', 'admin') DEFAULT 'client',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    password VARCHAR(255) DEFAULT NULL,
    INDEX idx_email (email),
    INDEX idx_provider (provider, provider_id)
  );`)
  console.log("    ✅ Table 'users' ready")

  await promisePool.query(`CREATE TABLE IF NOT EXISTS team_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE,
    position VARCHAR(255) NOT NULL,
    bio TEXT,
    bio_markdown LONGTEXT,
    skills JSON,
    linkedin VARCHAR(255),
    github VARCHAR(255),
    twitter VARCHAR(255),
    instagram VARCHAR(255),
    facebook VARCHAR(255),
    image VARCHAR(500),
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );`)
  console.log("    ✅ Table 'team_members' ready")

  await addColumnIfMissing("team_members", "bio_markdown", "LONGTEXT NULL")
  await addColumnIfMissing("team_members", "facebook", "VARCHAR(255) NULL")
  await addColumnIfMissing("team_members", "profile_type", "VARCHAR(50) DEFAULT 'markdown'")
  await addColumnIfMissing("team_members", "alter_ego", "VARCHAR(500) NULL")
  await addColumnIfMissing("users", "phone", "VARCHAR(20) NULL")
  await addColumnIfMissing("users", "last_login", "TIMESTAMP NULL")
  await addColumnIfMissing("users", "last_active", "TIMESTAMP NULL")

  await promisePool.query(`CREATE TABLE IF NOT EXISTS team_experiences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    team_member_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    company VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    is_current BOOLEAN DEFAULT FALSE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (team_member_id) REFERENCES team_members(id) ON DELETE CASCADE
  );`)
  console.log("    ✅ Table 'team_experiences' ready")

  await promisePool.query(`CREATE TABLE IF NOT EXISTS team_education (
    id INT AUTO_INCREMENT PRIMARY KEY,
    team_member_id INT NOT NULL,
    degree VARCHAR(255) NOT NULL,
    field_of_study VARCHAR(255),
    institution VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (team_member_id) REFERENCES team_members(id) ON DELETE CASCADE
  );`)
  console.log("    ✅ Table 'team_education' ready")

  await promisePool.query(`CREATE TABLE IF NOT EXISTS team_licenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    team_member_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    issuing_organization VARCHAR(255),
    issue_date DATE,
    expiry_date DATE,
    credential_id VARCHAR(255),
    credential_url VARCHAR(500),
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (team_member_id) REFERENCES team_members(id) ON DELETE CASCADE
  );`)
  console.log("    ✅ Table 'team_licenses' ready")

  await promisePool.query(`CREATE TABLE IF NOT EXISTS team_personal_projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    team_member_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    url VARCHAR(500),
    start_date DATE,
    end_date DATE,
    technologies JSON,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (team_member_id) REFERENCES team_members(id) ON DELETE CASCADE
  );`)
  console.log("    ✅ Table 'team_personal_projects' ready")

  await promisePool.query(`CREATE TABLE IF NOT EXISTS team_languages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    team_member_id INT NOT NULL,
    language VARCHAR(100) NOT NULL,
    proficiency_level ENUM('beginner', 'intermediate', 'advanced', 'native') DEFAULT 'intermediate',
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (team_member_id) REFERENCES team_members(id) ON DELETE CASCADE
  );`)
  console.log("    ✅ Table 'team_languages' ready")

  await promisePool.query(`CREATE TABLE IF NOT EXISTS services (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    short_description TEXT,
    full_description TEXT,
    icon VARCHAR(100),
    features JSON,
    technologies JSON,
    is_active BOOLEAN DEFAULT true,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  );`)
  console.log("    ✅ Table 'services' ready")

  await promisePool.query(`CREATE TABLE IF NOT EXISTS projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    client_id INT,
    service_id INT,
    technologies JSON,
    cover_image VARCHAR(255),
    project_url VARCHAR(500),
    video_url VARCHAR(500),
    completed_at DATE,
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL
  );`)
  console.log("    ✅ Table 'projects' ready")

  await addColumnIfMissing("projects", "video_url", "VARCHAR(500) NULL")

  await promisePool.query(`CREATE TABLE IF NOT EXISTS inquiries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    message TEXT NOT NULL,
    status ENUM('new', 'in_progress', 'resolved') DEFAULT 'new',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  );`)
  console.log("    ✅ Table 'inquiries' ready")

  await promisePool.query(`CREATE TABLE IF NOT EXISTS brands (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    logo VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  );`)
  console.log("    ✅ Table 'brands' ready")

  await promisePool.query(`CREATE TABLE IF NOT EXISTS blogs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    content LONGTEXT NOT NULL,
    cover_image VARCHAR(500),
    images JSON,
    links JSON,
    author_id INT,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_slug (slug),
    INDEX idx_published (is_published)
  );`)
  console.log("    ✅ Table 'blogs' ready")

  await addColumnIfMissing("blogs", "video_url", "VARCHAR(500) NULL")

  await promisePool.query(`CREATE TABLE IF NOT EXISTS polls (
    id INT AUTO_INCREMENT PRIMARY KEY,
    question VARCHAR(500) NOT NULL,
    options JSON NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_active (is_active)
  );`)
  console.log("    ✅ Table 'polls' ready")

  await promisePool.query(`CREATE TABLE IF NOT EXISTS poll_votes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    poll_id INT NOT NULL,
    user_id INT,
    option_index INT NOT NULL,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_vote (poll_id, user_id),
    INDEX idx_poll (poll_id)
  );`)
  console.log("    ✅ Table 'poll_votes' ready")

  await promisePool.query(`CREATE TABLE IF NOT EXISTS project_milestones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    status ENUM('Not Started', 'In Progress', 'On Hold', 'Delayed', 'Completed', 'Cancelled') DEFAULT 'Not Started',
    date DATE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    INDEX idx_project (project_id),
    INDEX idx_status (status)
  );`)
  console.log("    ✅ Table 'project_milestones' ready")

  await promisePool.query(`CREATE TABLE IF NOT EXISTS milestone_tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    milestone_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    is_completed BOOLEAN DEFAULT false,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (milestone_id) REFERENCES project_milestones(id) ON DELETE CASCADE,
    INDEX idx_milestone (milestone_id)
  );`)
  console.log("    ✅ Table 'milestone_tasks' ready")


  try {
    await promisePool.query(`ALTER TABLE users ADD COLUMN brand_id INT NULL AFTER role;`)
  } catch (error) {

    if (!error.message.includes('Duplicate column name')) {
      console.error('Error adding brand_id column:', error)
    }
  }


  try {
    const [fkExists] = await promisePool.query(
      `SELECT CONSTRAINT_NAME 
       FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
       WHERE TABLE_SCHEMA = ? 
         AND TABLE_NAME = 'users' 
         AND COLUMN_NAME = 'brand_id' 
         AND REFERENCED_TABLE_NAME = 'brands' 
         AND CONSTRAINT_NAME = 'fk_user_brand'`,
      [DB_NAME]
    )

    if (fkExists.length === 0) {
      await promisePool.query(
        `ALTER TABLE users ADD CONSTRAINT fk_user_brand FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL;`
      )
    }
  } catch (error) {
    console.error('Error ensuring brand foreign key:', error)
  }
  
  console.log("  ✅ All tables ready\n")
}

async function maybeAskToSeed() {
  const path = require("path")
  const { seedAll, ensureEssentialAccounts } = require("../utils/seeder")
  const db = { query: (...args) => promisePool.query(...args) }

  if (process.env.SEED_DB === "true") {
    const sqlFilePath = path.join(__dirname, "..", "seed.sql")
    await seedAll(db, sqlFilePath)
    return
  }

  if (process.env.SEED_DB === "false") {
    await ensureEssentialAccounts(db)
    return
  }

  if (!process.stdin.isTTY) {
    await ensureEssentialAccounts(db)
    return
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  const timeout = setTimeout(() => {
    rl.close()
    ensureEssentialAccounts(db)
  }, 15000)

  rl.question("  Seed database with default demo data? (Y/N) [Timeout: 15s] ", (answer) => {
    clearTimeout(timeout)
    rl.close()

    if (String(answer).trim().toUpperCase() === "Y") {
      const sqlFilePath = path.join(__dirname, "..", "seed.sql")
      seedAll(db, sqlFilePath).catch((e) => console.error("  Error seeding:", e))
    } else {
      ensureEssentialAccounts(db)
    }
  })
}


async function initialize() {
  console.log("\n📦 [Database] Initializing connection...")
  await createDatabaseIfNotExists()
  pool = mysql.createPool({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  })
  promisePool = pool.promise()
  await createTablesIfNotExist()
  maybeAskToSeed().catch((e) => console.error("  Error during seeding:", e))
}


initialize().catch((e) => console.error("[db] Init error:", e))

module.exports = {
  pool: () => pool,
  query: (...args) => promisePool.query(...args),
}

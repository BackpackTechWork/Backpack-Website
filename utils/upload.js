const multer = require('multer')
const path = require('path')
const fs = require('fs')


const profilesDir = path.join(__dirname, '../public/profiles')
if (!fs.existsSync(profilesDir)) {
  fs.mkdirSync(profilesDir, { recursive: true })
  console.log('Created profiles directory:', profilesDir)
}


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, profilesDir)
  },
  filename: function (req, file, cb) {

    const userId = req.user ? req.user.id : 'new'
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    const ext = path.extname(file.originalname)
    const filename = `profile_${userId}_${timestamp}_${random}${ext}`
    cb(null, filename)
  }
})


const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
  const mimetype = allowedTypes.test(file.mimetype)

  if (mimetype && extname) {
    return cb(null, true)
  } else {
    cb(new Error('Only image files are allowed!'))
  }
}


const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 
  },
  fileFilter: fileFilter
})


function deleteOldProfilePicture(avatarPath) {
  if (!avatarPath) return


  if (avatarPath.includes('/profiles/')) {
    const filename = path.basename(avatarPath)
    const filePath = path.join(profilesDir, filename)
    
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath)
        console.log(`Deleted old profile picture: ${filename}`)
      } catch (error) {
        console.error(`Error deleting old profile picture: ${error.message}`)
      }
    }
  }
}

module.exports = {
  upload: upload.single('profilePicture'),
  deleteOldProfilePicture
}


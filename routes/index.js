const express = require("express")
const router = express.Router()
const https = require("https")
const db = require("../config/database")
const fs = require("fs")
const path = require("path")
const { getServices } = require("../utils/servicesCache")


router.get("/", async (req, res) => {
  try {
    const [services] = await db.query("SELECT * FROM services WHERE is_active = true ORDER BY display_order")
    const [projects] = await db.query(
      "SELECT * FROM projects WHERE is_featured = true ORDER BY completed_at DESC LIMIT 6",
    )
    

    const [blogs] = await db.query(`
      SELECT id, title, slug, cover_image, created_at
      FROM blogs
      WHERE is_published = true
      ORDER BY created_at DESC
      LIMIT 3
    `)
    

    const [polls] = await db.query(`
      SELECT p.*, 
        (SELECT COUNT(*) FROM poll_votes WHERE poll_id = p.id) as vote_count
      FROM polls p
      WHERE p.is_active = true
      ORDER BY p.created_at DESC
      LIMIT 3
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

    const [brandsWithProjects] = await db.query(`
      SELECT 
        b.*, 
        COUNT(p.id) AS project_count
      FROM brands b
      LEFT JOIN users u 
        ON b.id = u.brand_id 
        AND u.role = 'client'
      LEFT JOIN projects p 
        ON u.id = p.client_id
      GROUP BY b.id, b.name, b.logo, b.created_at, b.updated_at
      ORDER BY project_count DESC
      LIMIT 9
    `)
    
    
    const count = brandsWithProjects.length
    const roundedCount = count < 3 ? count : Math.floor(count / 3) * 3
    const logos = brandsWithProjects.slice(0, roundedCount).map(brand => ({
      filename: brand.logo ? brand.logo.split('/').pop() : null,
      name: brand.name,
      logo: brand.logo
    }))


    const testimonials = [
      {
        name: "Maung Shwe Hla",
        company: "NMS",
        avatar: "Maung Shwe Hla.jpg",
        avatarFolder: "avatars",
        rating: 4,
        text: "Backpack transformed our mobile app development process. Their team delivered a flawless product on time and within budget. The attention to detail and user experience was exceptional.",
        featured: false
      },
      {
        name: "Mr. Romjan",
        company: "Nuzeta",
        avatar: "Mr. Romjan.jpg",
        avatarFolder: "avatars",
        rating: 4.5,
        text: "The custom software solution they built for us streamlined our operations significantly. Professional team, great communication.",
        featured: false
      },
      {
        name: "Mr. Tamjin",
        company: "PMS",
        avatar: "Mr. Tamjin.jpg",
        avatarFolder: "avatars",
        rating: 4.5,
        text: "Outstanding web development work. They took our vision and created something even better than we imagined. The UI/UX design is top-notch.",
        featured: false
      },
      {
        name: "Khim",
        company: "MIR",
        avatar: "Khim.jpg",
        avatarFolder: "avatars",
        rating: 5,
        text: "Solid team with great technical expertise. They helped us modernize our legacy systems with minimal downtime.",
        featured: false
      },
      {
        name: "Seng",
        company: "MIR",
        avatar: "Seng.png",
        avatarFolder: "avatars",
        rating: 4.5,
        text: "Their automation solutions saved us countless hours of manual work. The ROI was evident within the first month of deployment.",
        featured: false
      },
      {
        name: "Khaleed Naji",
        company: "Tuwaiq Academy",
        avatar: "Khaleed Naji.jpg",
        avatarFolder: "avatars",
        rating: 4.8,
        text: "Exceptional service from start to finish. The enterprise solution they developed has become critical to our daily operations. Highly recommended!",
        featured: false
      },
      {
        name: "Dr. Abdelrahman Elamin",
        company: "Al-Osmani Pharmacy",
        avatar: "Dr.Abdelrahman Elamin.png",
        avatarFolder: "avatars",
        rating: 4.5,
        text: "Working with Backpack was a game changer for our organization. They understood our vision and delivered a scalable solution that grew with us.",
        featured: false
      }
    ]

    const randomIndex = Math.floor(Math.random() * testimonials.length)
    testimonials[randomIndex].featured = true

    res.render("index", {
      title: "Backpack Tech Works - Expert Software Development Solutions",
      seoDescription: "Backpack Tech Works creates smart, practical software solutions that turn ideas into reality. Expert web development, mobile apps, and digital solutions for modern businesses.",
      seoKeywords: "software development, web development, mobile apps, digital solutions, tech consulting, custom software, enterprise solutions, Backpack Tech Works",
      seoImage: "/Backpack.webp",
      seoType: "website",
      services,
      projects,
      logos,
      testimonials,
      blogs: blogs || [],
      polls: polls || []
    })
  } catch (error) {
    console.error(error)
    res.render("index", {
      title: "Backpack Tech Works - Expert Software Development Solutions",
      seoDescription: "Backpack Tech Works creates smart, practical software solutions that turn ideas into reality. Expert web development, mobile apps, and digital solutions for modern businesses.",
      seoKeywords: "software development, web development, mobile apps, digital solutions, tech consulting, custom software, enterprise solutions, Backpack Tech Works",
      seoImage: "/Backpack.webp",
      seoType: "website",
      services: [],
      projects: [],
      logos: [],
      testimonials: [],
    })
  }
})


const projectTechStacks = {
  'al-osmani-erp-system': ['EJS', 'Node JS', 'MySQL', 'Chart JS'],
  'logistics-and-fulilment-client-dashboard': ['EJS', 'MySQL', 'ChartJS', 'Sheet API']
}


router.get("/projects", async (req, res) => {
  try {

    const [projects] = await db.query(`
      SELECT p.*, 
        s.title as service_title,
        s.slug as service_slug
      FROM projects p
      LEFT JOIN services s ON p.service_id = s.id
      WHERE p.is_featured = true
      ORDER BY p.completed_at DESC, p.created_at DESC
    `)


    projects.forEach(project => {

      if (project.cover_image) {
        project.thumbnail = `/images/Projects/${project.id}/${project.cover_image}`
      } else {

        const imagesDir = path.join(__dirname, "../public/images/Projects", project.id.toString())
        if (fs.existsSync(imagesDir)) {
          const images = fs.readdirSync(imagesDir).filter(f => f.startsWith('image_'))
          if (images.length > 0) {
            project.thumbnail = `/images/Projects/${project.id}/${images[0]}`
          }
        }
      }


      const imagesDir = path.join(__dirname, "../public/images/Projects", project.id.toString())
      let imageGallery = []
      if (fs.existsSync(imagesDir)) {
        imageGallery = fs.readdirSync(imagesDir)
          .filter(filename => filename.startsWith("image_"))
          .map(filename => `/images/Projects/${project.id}/${filename}`)
      }
      project.images = imageGallery


      let techStack = []
      if (project.technologies) {
        try {
          techStack = Array.isArray(project.technologies)
            ? project.technologies
            : JSON.parse(project.technologies)
        } catch (error) {
          techStack = []
        }
      }
      project.techStack = techStack


      project.displayName = project.title
    })
    

    const services = await getServices()
    
    res.render("projects", { 
      title: "Our Projects - Backpack Tech Works",
      seoDescription: "Explore our portfolio of successful software development projects. See how Backpack Tech Works delivers innovative digital solutions for businesses across various industries.",
      seoKeywords: "software projects, web development projects, mobile app projects, portfolio, case studies, Backpack Tech Works projects",
      seoImage: "/Backpack.webp",
      seoType: "website",
      projects: projects || [],
      services: services || []
    })
  } catch (error) {
    console.error(error)
    res.render("projects", {
      title: "Our Projects - Backpack Tech Works",
      seoDescription: "Explore our portfolio of successful software development projects. See how Backpack Tech Works delivers innovative digital solutions for businesses across various industries.",
      seoKeywords: "software projects, web development projects, mobile app projects, portfolio, case studies, Backpack Tech Works projects",
      seoImage: "/Backpack.webp",
      seoType: "website",
      projects: []
    })
  }
})


router.get("/projects/:slug", async (req, res) => {
  try {
    const { slug } = req.params
    

    const [projects] = await db.query(`
      SELECT p.*, 
        s.title as service_title,
        s.slug as service_slug,
        s.icon as service_icon
      FROM projects p
      LEFT JOIN services s ON p.service_id = s.id
      WHERE p.slug = ? AND p.is_featured = true
      LIMIT 1
    `, [slug])

    if (projects.length === 0) {
      return res.status(404).render("404", { title: "Project Not Found" })
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
    project.techStack = technologies


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


    if (coverImagePath && !imageGallery.includes(coverImagePath)) {
      imageGallery.unshift(coverImagePath)
    }

    project.images = imageGallery
    project.displayName = project.title


    let projectLink = null
    if (project.project_url) {
      try {
        const parsed = JSON.parse(project.project_url)

        if (Array.isArray(parsed) && parsed.length > 0) {
          projectLink = typeof parsed[0] === 'string' ? parsed[0] : parsed[0].url
        } else if (typeof parsed === 'object' && parsed.url) {
          projectLink = parsed.url
        } else {
          projectLink = project.project_url
        }
      } catch (error) {

        projectLink = project.project_url
      }
    }
    project.projectLink = projectLink
    
    const projectDescription = project.description 
      ? (project.description.length > 160 ? project.description.substring(0, 157) + '...' : project.description)
      : `Learn about ${project.displayName}, a project by Backpack Tech Works. Expert software development solutions.`;
    
    const projectImage = coverImagePath || "/Backpack.webp";
    const projectUrl = `${process.env.SITE_URL || 'https://backpacktechworks.com'}/projects/${project.slug}`;
    
    // Build structured data for project
    const structuredData = {
      "@type": "CreativeWork",
      "@id": `${projectUrl}#project`,
      "name": project.displayName,
      "description": project.description || projectDescription,
      "url": projectUrl,
      "image": projectImage.startsWith('http') ? projectImage : `${process.env.SITE_URL || 'https://backpacktechworks.com'}${projectImage}`,
      "datePublished": project.created_at ? new Date(project.created_at).toISOString() : null,
      "dateModified": project.updated_at ? new Date(project.updated_at).toISOString() : null,
      "author": {
        "@id": `${process.env.SITE_URL || 'https://backpacktechworks.com'}#organization`
      },
      "publisher": {
        "@id": `${process.env.SITE_URL || 'https://backpacktechworks.com'}#organization`
      }
    };
    
    if (project.techStack && project.techStack.length > 0) {
      structuredData.keywords = project.techStack.join(', ');
    }
    
    res.render("projects/detail", {
      title: `${project.displayName} - Backpack Tech Works`,
      seoDescription: projectDescription,
      seoKeywords: project.techStack ? project.techStack.join(', ') : "software development, web development, Backpack Tech Works",
      seoImage: projectImage,
      seoType: "article",
      seoPublishedTime: project.created_at ? new Date(project.created_at).toISOString() : null,
      seoModifiedTime: project.updated_at ? new Date(project.updated_at).toISOString() : null,
      seoSection: project.service_title || "Projects",
      seoTags: project.techStack || [],
      structuredData: structuredData,
      project
    })
  } catch (error) {
    console.error(error)
    res.status(500).render("error", {
      title: "Error",
      message: "Unable to load project details",
    })
  }
})


router.get("/terms", (req, res) => {
  res.render("terms", {
    title: "Terms of Service - Backpack Tech Works",
    seoDescription: "Terms of Service for Backpack Tech Works. Read our terms and conditions for using our software development services and website.",
    seoKeywords: "terms of service, terms and conditions, Backpack Tech Works terms",
    seoImage: "/Backpack.webp",
    seoType: "website",
    noindex: true
  })
})


router.get("/privacy", (req, res) => {
  res.render("privacy", {
    title: "Privacy Policy - Backpack Tech Works",
    seoDescription: "Privacy Policy for Backpack Tech Works. Learn how we collect, use, and protect your personal information.",
    seoKeywords: "privacy policy, data protection, Backpack Tech Works privacy",
    seoImage: "/Backpack.webp",
    seoType: "website",
    noindex: true
  })
})


router.get("/contact", (req, res) => {

  const successMessages = res.locals.success_msg || []
  const errorMessages = res.locals.error_msg || []
  
  res.render("contact", {
    seoDescription: "Get in touch with Backpack Tech Works. Contact us for expert software development services, web development, mobile apps, and digital solutions for your business.",
    seoKeywords: "contact Backpack Tech Works, software development contact, web development services, tech consulting, get quote",
    seoImage: "/images/Assets/Contact Guy.png",
    seoType: "website", 
    title: "Contact Us - Backpack Tech Works",
    user: req.user || null,
    success: successMessages.length > 0 ? successMessages[0] : '',
    error: errorMessages.length > 0 ? errorMessages[0] : ''
  })
})


router.post("/contact", async (req, res) => {
  try {
    const { name, email, subject, message } = req.body
    const userId = req.user ? req.user.id : null

    await db.query("INSERT INTO inquiries (user_id, name, email, subject, message) VALUES (?, ?, ?, ?, ?)", [
      userId,
      name,
      email,
      subject,
      message,
    ])

    req.flash("success_msg", "Thank you for your message! We will get back to you soon.")
    res.redirect("/contact")
  } catch (error) {
    console.error(error)
    req.flash("error_msg", "Something went wrong. Please try again.")
    res.redirect("/contact")
  }
})


router.get("/blogs", async (req, res) => {
  try {
    const searchQuery = req.query.search || ''
    let blogsQuery = `
      SELECT b.*, u.name as author_name
      FROM blogs b
      LEFT JOIN users u ON b.author_id = u.id
      WHERE b.is_published = true
    `
    const queryParams = []
    
    if (searchQuery.trim()) {
      blogsQuery += ` AND (b.title LIKE ? OR b.content LIKE ?)`
      const searchTerm = `%${searchQuery.trim()}%`
      queryParams.push(searchTerm, searchTerm)
    }
    
    blogsQuery += ` ORDER BY b.created_at DESC`
    
    const [blogs] = await db.query(blogsQuery, queryParams)


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

    res.render("blogs/index", {
      title: "Blogs - Backpack Tech Works",
      seoDescription: "Read the latest articles and insights from Backpack Tech Works. Expert tips on software development, web development, technology trends, and digital solutions.",
      seoKeywords: "tech blog, software development blog, web development articles, technology insights, Backpack Tech Works blog",
      seoImage: "/Backpack.webp",
      seoType: "website",
      blogs,
      searchQuery: searchQuery
    })
  } catch (error) {
    console.error(error)
    res.render("blogs/index", {
      title: "Blogs - Backpack Tech Works",
      seoDescription: "Read the latest articles and insights from Backpack Tech Works. Expert tips on software development, web development, technology trends, and digital solutions.",
      seoKeywords: "tech blog, software development blog, web development articles, technology insights, Backpack Tech Works blog",
      seoImage: "/Backpack.webp",
      seoType: "website",
      blogs: [],
      searchQuery: req.query.search || ''
    })
  }
})


router.get("/blogs/:slug", async (req, res) => {
  try {
    const { slug } = req.params
    const [blogs] = await db.query(`
      SELECT b.*, u.name as author_name, u.avatar as author_avatar
      FROM blogs b
      LEFT JOIN users u ON b.author_id = u.id
      WHERE b.slug = ? AND b.is_published = true
    `, [slug])

    if (blogs.length === 0) {
      return res.status(404).render("404", { title: "Blog Not Found" })
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
    if (blog.links) {

      if (typeof blog.links === 'string') {
        try {
          blog.links = JSON.parse(blog.links)
        } catch (e) {
          blog.links = []
        }
      } else if (Array.isArray(blog.links)) {

      } else if (typeof blog.links === 'object') {

        if (!Array.isArray(blog.links)) {
          blog.links = [blog.links]
        }
      }
    } else {
      blog.links = []
    }
    

    if (!Array.isArray(blog.links)) {
      blog.links = [blog.links]
    }

    // Extract blog description from content
    const blogDescription = blog.excerpt || (blog.content 
      ? blog.content.replace(/<[^>]*>/g, '').substring(0, 160) + '...'
      : `Read ${blog.title} on Backpack Tech Works blog. Expert insights on software development and technology.`);
    
    const blogImage = blog.cover_image 
      ? `/images/Blogs/${blog.cover_image}`
      : (blog.images && blog.images.length > 0 ? blog.images[0] : "/Backpack.webp");
    
    const blogUrl = `${process.env.SITE_URL || 'https://backpacktechworks.com'}/blogs/${blog.slug}`;
    
    // Build structured data for blog post
    const structuredData = {
      "@type": "BlogPosting",
      "@id": `${blogUrl}#blogpost`,
      "headline": blog.title,
      "description": blogDescription,
      "url": blogUrl,
      "image": blogImage.startsWith('http') ? blogImage : `${process.env.SITE_URL || 'https://backpacktechworks.com'}${blogImage}`,
      "datePublished": blog.created_at ? new Date(blog.created_at).toISOString() : null,
      "dateModified": blog.updated_at ? new Date(blog.updated_at).toISOString() : null,
      "author": {
        "@type": "Person",
        "name": blog.author_name || "Backpack Tech Works",
        "url": `${process.env.SITE_URL || 'https://backpacktechworks.com'}/team`
      },
      "publisher": {
        "@id": `${process.env.SITE_URL || 'https://backpacktechworks.com'}#organization`
      },
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": blogUrl
      }
    };

    res.render("blogs/detail", {
      title: `${blog.title} - Backpack Tech Works`,
      seoDescription: blogDescription,
      seoKeywords: blog.tags || "software development, web development, technology, Backpack Tech Works blog",
      seoImage: blogImage,
      seoType: "article",
      seoPublishedTime: blog.created_at ? new Date(blog.created_at).toISOString() : null,
      seoModifiedTime: blog.updated_at ? new Date(blog.updated_at).toISOString() : null,
      seoSection: "Blog",
      seoTags: blog.tags ? (Array.isArray(blog.tags) ? blog.tags : [blog.tags]) : [],
      structuredData: structuredData,
      blog
    })
  } catch (error) {
    console.error(error)
    res.status(500).render("error", {
      title: "Error",
      message: "Unable to load blog post",
    })
  }
})


router.get("/avatar-proxy", (req, res) => {
  const imageUrl = req.query.url

  if (!imageUrl || !imageUrl.includes("googleusercontent.com")) {
    return res.status(400).json({ error: "Invalid image URL" })
  }

  try {

    const url = new URL(imageUrl)
    

    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    }


    const proxyReq = https.request(options, (proxyRes) => {

      res.setHeader("Content-Type", proxyRes.headers["content-type"] || "image/jpeg")

      res.setHeader("Cache-Control", "public, max-age=3600, must-revalidate")
      

      if (proxyRes.statusCode !== 200) {
        return res.status(proxyRes.statusCode).json({ error: "Failed to fetch image" })
      }


      proxyRes.pipe(res)
    })

    proxyReq.on("error", (error) => {
      console.error("Error proxying image:", error)
      res.status(500).json({ error: "Error fetching image" })
    })

    proxyReq.end()
  } catch (error) {
    console.error("Error parsing image URL:", error)
    res.status(400).json({ error: "Invalid URL format" })
  }
})


router.get("/polls", async (req, res) => {
  try {
    const [polls] = await db.query(`
      SELECT p.*, 
        (SELECT COUNT(*) FROM poll_votes WHERE poll_id = p.id) as vote_count
      FROM polls p
      WHERE p.is_active = true
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

    res.render("polls/index", {
      title: "Polls - Backpack Tech Works",
      polls
    })
  } catch (error) {
    console.error(error)
    res.render("polls/index", {
      title: "Polls - Backpack Tech Works",
      polls: []
    })
  }
})


router.post("/polls/:id/vote", async (req, res) => {
  try {
    const { id } = req.params
    const { option_index } = req.body
    const userIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown'
    

    const [polls] = await db.query(
      "SELECT * FROM polls WHERE id = ? AND is_active = true",
      [id]
    )
    
    if (polls.length === 0) {
      return res.status(404).json({ success: false, message: "Poll not found or inactive" })
    }
    
    const poll = polls[0]
    let options = []
    if (poll.options) {
      if (typeof poll.options === 'string') {

        try {
          options = JSON.parse(poll.options)
        } catch (e) {
          options = []
        }
      } else if (Array.isArray(poll.options)) {

        options = poll.options
      } else if (typeof poll.options === 'object') {

        options = Object.values(poll.options)
      }
    }
    

    const optionIndex = parseInt(option_index)
    if (isNaN(optionIndex) || optionIndex < 0 || optionIndex >= options.length) {
      return res.status(400).json({ success: false, message: "Invalid option selected" })
    }
    


    const [existingVotes] = await db.query(
      "SELECT * FROM poll_votes WHERE poll_id = ? AND ip_address = ?",
      [id, userIp]
    )
    
    if (existingVotes.length > 0) {
      return res.status(400).json({ success: false, message: "You have already voted on this poll" })
    }
    

    const userId = req.user ? req.user.id : null
    

    await db.query(
      `INSERT INTO poll_votes (poll_id, user_id, option_index, ip_address) VALUES (?, ?, ?, ?)`,
      [id, userId, optionIndex, userIp]
    )
    
    res.json({ success: true, message: "Vote recorded successfully" })
  } catch (error) {
    console.error("Error recording vote:", error)
    res.status(500).json({ success: false, message: "Error recording vote" })
  }
})


router.get("/polls/:id/results", async (req, res) => {
  try {
    const { id } = req.params
    
    const [polls] = await db.query(
      "SELECT * FROM polls WHERE id = ? AND is_active = true",
      [id]
    )
    
    if (polls.length === 0) {
      return res.status(404).json({ success: false, message: "Poll not found" })
    }
    
    const poll = polls[0]
    let options = []
    if (poll.options) {
      if (typeof poll.options === 'string') {

        try {
          options = JSON.parse(poll.options)
        } catch (e) {
          options = []
        }
      } else if (Array.isArray(poll.options)) {

        options = poll.options
      } else if (typeof poll.options === 'object') {

        options = Object.values(poll.options)
      }
    }
    

    const [votes] = await db.query(`
      SELECT option_index, COUNT(*) as count
      FROM poll_votes
      WHERE poll_id = ?
      GROUP BY option_index
    `, [id])
    

    const [totalVotes] = await db.query(`
      SELECT COUNT(*) as count
      FROM poll_votes
      WHERE poll_id = ?
    `, [id])
    

    const optionVotes = []
    const total = totalVotes[0]?.count || 0
    for (let i = 0; i < options.length; i++) {
      const voteData = votes.find(v => v.option_index === i)
      optionVotes[i] = voteData ? voteData.count : 0
    }
    
    res.json({
      success: true,
      poll: {
        id: poll.id,
        question: poll.question,
        options: options,
        optionVotes: optionVotes,
        totalVotes: total
      }
    })
  } catch (error) {
    console.error("Error fetching poll results:", error)
    res.status(500).json({ success: false, message: "Error fetching poll results" })
  }
})

// Sitemap generator
router.get("/sitemap.xml", async (req, res) => {
  try {
    const siteUrl = process.env.SITE_URL || 'https://backpacktechworks.com'
    const currentDate = new Date().toISOString().split('T')[0]
    
    // Get all public pages
    const urls = [
      { loc: `${siteUrl}/`, changefreq: 'daily', priority: '1.0', lastmod: currentDate },
      { loc: `${siteUrl}/services`, changefreq: 'weekly', priority: '0.9', lastmod: currentDate },
      { loc: `${siteUrl}/projects`, changefreq: 'weekly', priority: '0.9', lastmod: currentDate },
      { loc: `${siteUrl}/team`, changefreq: 'monthly', priority: '0.8', lastmod: currentDate },
      { loc: `${siteUrl}/blogs`, changefreq: 'daily', priority: '0.8', lastmod: currentDate },
      { loc: `${siteUrl}/contact`, changefreq: 'monthly', priority: '0.7', lastmod: currentDate },
    ]
    
    // Get all active services
    try {
      const [services] = await db.query("SELECT slug, updated_at FROM services WHERE is_active = true")
      services.forEach(service => {
        const lastmod = service.updated_at ? new Date(service.updated_at).toISOString().split('T')[0] : currentDate
        urls.push({
          loc: `${siteUrl}/services/${service.slug}`,
          changefreq: 'monthly',
          priority: '0.8',
          lastmod: lastmod
        })
      })
    } catch (error) {
      console.error("Error fetching services for sitemap:", error)
    }
    
    // Get all featured projects
    try {
      const [projects] = await db.query("SELECT slug, updated_at FROM projects WHERE is_featured = true")
      projects.forEach(project => {
        const lastmod = project.updated_at ? new Date(project.updated_at).toISOString().split('T')[0] : currentDate
        urls.push({
          loc: `${siteUrl}/projects/${project.slug}`,
          changefreq: 'monthly',
          priority: '0.8',
          lastmod: lastmod
        })
      })
    } catch (error) {
      console.error("Error fetching projects for sitemap:", error)
    }
    
    // Get all published blogs
    try {
      const [blogs] = await db.query("SELECT slug, updated_at FROM blogs WHERE is_published = true")
      blogs.forEach(blog => {
        const lastmod = blog.updated_at ? new Date(blog.updated_at).toISOString().split('T')[0] : currentDate
        urls.push({
          loc: `${siteUrl}/blogs/${blog.slug}`,
          changefreq: 'weekly',
          priority: '0.7',
          lastmod: lastmod
        })
      })
    } catch (error) {
      console.error("Error fetching blogs for sitemap:", error)
    }
    
    // Get all active team members
    try {
      const [teamMembers] = await db.query("SELECT id FROM team_members WHERE is_active = true")
      teamMembers.forEach(member => {
        urls.push({
          loc: `${siteUrl}/team/${member.id}`,
          changefreq: 'monthly',
          priority: '0.6',
          lastmod: currentDate
        })
      })
    } catch (error) {
      console.error("Error fetching team members for sitemap:", error)
    }
    
    // Generate XML
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n'
    xml += '        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"\n'
    xml += '        xmlns:xhtml="http://www.w3.org/1999/xhtml"\n'
    xml += '        xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0"\n'
    xml += '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"\n'
    xml += '        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n'
    
    urls.forEach(url => {
      xml += '  <url>\n'
      xml += `    <loc>${url.loc}</loc>\n`
      xml += `    <lastmod>${url.lastmod}</lastmod>\n`
      xml += `    <changefreq>${url.changefreq}</changefreq>\n`
      xml += `    <priority>${url.priority}</priority>\n`
      xml += '  </url>\n'
    })
    
    xml += '</urlset>'
    
    res.set('Content-Type', 'text/xml')
    res.send(xml)
  } catch (error) {
    console.error("Error generating sitemap:", error)
    res.status(500).send('Error generating sitemap')
  }
})

// Robots.txt
router.get("/robots.txt", (req, res) => {
  const siteUrl = process.env.SITE_URL || 'https://backpacktechworks.com'
  const robotsTxt = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /client/
Disallow: /auth/
Disallow: /staff/
Disallow: /api/

# Sitemap
Sitemap: ${siteUrl}/sitemap.xml

# Crawl-delay
Crawl-delay: 1`
  
  res.set('Content-Type', 'text/plain')
  res.send(robotsTxt)
})

module.exports = router

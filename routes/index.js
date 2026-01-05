const express = require("express")
const router = express.Router()
const https = require("https")
const db = require("../config/database")
const fs = require("fs")
const path = require("path")
const { getServices } = require("../utils/servicesCache")
const { processProjectImages, getProjectImages } = require("../utils/fileHelpers")


// Videos All Page
router.get("/videos", async (req, res) => {
  try {
    const searchQuery = req.query.search || ''
    const { page = 1 } = req.query
    const pageNum = Math.max(1, parseInt(page) || 1)
    const limit = 5
    const offset = (pageNum - 1) * limit

    let videosQuery = `
      SELECT * FROM videos
      WHERE is_active = true
    `
    const queryParams = []
    
    if (searchQuery.trim()) {
      videosQuery += ` AND (title LIKE ? OR description LIKE ?)`
      const searchTerm = `%${searchQuery.trim()}%`
      queryParams.push(searchTerm, searchTerm)
    }
    
    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM videos WHERE is_active = true${searchQuery.trim() ? ' AND (title LIKE ? OR description LIKE ?)' : ''}`
    const [countResult] = await db.query(countQuery, queryParams)
    const totalCount = countResult[0].count
    const totalPages = Math.ceil(totalCount / limit)
    
    videosQuery += ` ORDER BY display_order DESC, created_at DESC LIMIT ? OFFSET ?`
    
    const [videos] = await db.query(videosQuery, [...queryParams, limit, offset])

    res.render("videos/index", {
      title: "Videos - We Code, We Show - Backpack Tech Works",
      seoDescription: "Watch our latest videos and tutorials. Stay updated with tech insights, coding tutorials, and more from Backpack Tech Works.",
      seoKeywords: "tech videos, coding tutorials, software development videos, Backpack Tech Works videos",
      seoImage: "/Backpack.webp",
      seoType: "website",
      videos,
      searchQuery: searchQuery,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalCount,
        limit,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1,
        queryParams: new URLSearchParams(req.query).toString().replace(/&?page=\d+/, '')
      }
    })
  } catch (error) {
    console.error(error)
    res.render("videos/index", {
      title: "Videos - Backpack Tech Works",
      videos: [],
      searchQuery: req.query.search || '',
      pagination: {
        currentPage: 1,
        totalPages: 0,
        totalCount: 0,
        limit: 5,
        hasNext: false,
        hasPrev: false,
        queryParams: ''
      }
    })
  }
})

// Video Detail Page
router.get("/videos/:id", async (req, res) => {
  try {
    const { id } = req.params
    const videoId = parseInt(id)
    
    if (isNaN(videoId)) {
      return res.status(404).render("404", {
        title: "Video Not Found - Backpack Tech Works",
      })
    }
    
    const [videos] = await db.query(`
      SELECT * FROM videos
      WHERE id = ? AND is_active = true
    `, [videoId])
    
    if (videos.length === 0) {
      return res.status(404).render("404", {
        title: "Video Not Found - Backpack Tech Works",
      })
    }
    
    const video = videos[0]
    
    // Get related videos (other active videos excluding current)
    const [relatedVideos] = await db.query(`
      SELECT * FROM videos
      WHERE is_active = true AND id != ?
      ORDER BY display_order DESC, created_at DESC
      LIMIT 6
    `, [videoId])
    
    // Extract YouTube video ID for thumbnail
    let youtubeVideoId = ''
    let isShort = false
    if (video.youtube_url) {
      const shortsMatch = video.youtube_url.match(/youtube\.com\/shorts\/([^&\n?#]+)/)
      if (shortsMatch) {
        youtubeVideoId = shortsMatch[1]
        isShort = true
      } else {
        const urlMatch = video.youtube_url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/)
        youtubeVideoId = urlMatch ? urlMatch[1] : ''
      }
    }
    
    res.render("videos/detail", {
      title: `${video.title} - Backpack Tech Works`,
      seoDescription: video.description || `Watch ${video.title} - A video from Backpack Tech Works`,
      seoKeywords: "tech video, Backpack Tech Works, " + video.title,
      seoImage: youtubeVideoId ? `https://img.youtube.com/vi/${youtubeVideoId}/maxresdefault.jpg` : "/Backpack.webp",
      seoType: "video.other",
      video,
      youtubeVideoId,
      isShort,
      relatedVideos
    })
  } catch (error) {
    console.error("Error fetching video:", error)
    res.status(500).render("error", {
      title: "Error - Backpack Tech Works",
      message: "Unable to load video at the moment.",
    })
  }
})

router.get("/", async (req, res) => {
  try {
    // Parallelize all independent database queries for better performance
    const [
      [services],
      [projects],
      [blogs],
      [polls],
      [videos],
      [brandsWithProjects]
    ] = await Promise.all([
      db.query("SELECT * FROM services WHERE is_active = true ORDER BY display_order"),
      db.query("SELECT * FROM projects WHERE is_featured = true ORDER BY completed_at DESC LIMIT 6"),
      db.query(`
        SELECT id, title, slug, cover_image, created_at
        FROM blogs
        WHERE is_published = true
        ORDER BY created_at DESC
        LIMIT 7
      `),
      db.query(`
        SELECT p.*, 
          (SELECT COUNT(*) FROM poll_votes WHERE poll_id = p.id) as vote_count
        FROM polls p
        WHERE p.is_active = true
        ORDER BY p.created_at DESC
        LIMIT 3
      `),
      db.query(`
        SELECT * FROM videos
        WHERE is_active = true
        ORDER BY display_order DESC, created_at DESC
        LIMIT 3
      `),
      db.query(`
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
    ])

    // Batch fetch all poll votes in a single query instead of N+1
    const pollIds = polls.map(p => p.id)
    let allPollVotes = []
    if (pollIds.length > 0) {
      const [votes] = await db.query(`
        SELECT poll_id, option_index, COUNT(*) as count
        FROM poll_votes
        WHERE poll_id IN (?)
        GROUP BY poll_id, option_index
      `, [pollIds])
      allPollVotes = votes
    }

    for (let poll of polls) {
      if (poll.options) {
        if (typeof poll.options === 'string') {
          try {
            poll.options = JSON.parse(poll.options)
          } catch (e) {
            poll.options = []
          }
        } else if (Array.isArray(poll.options)) {
          // already an array
        } else if (typeof poll.options === 'object') {
          poll.options = Object.values(poll.options)
        } else {
          poll.options = []
        }
      } else {
        poll.options = []
      }
      
      // Use the batched votes instead of individual queries
      const pollVotes = allPollVotes.filter(v => v.poll_id === poll.id)
      
      poll.optionVotes = []
      poll.totalVotes = poll.vote_count || 0
      for (let i = 0; i < poll.options.length; i++) {
        const voteData = pollVotes.find(v => v.option_index === i)
        poll.optionVotes[i] = voteData ? voteData.count : 0
      }
    }
    
    
    // brandsWithProjects is already fetched above via Promise.all
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
        avatar: "Maung Shwe Hla.webp",
        avatarFolder: "avatars",
        rating: 4,
        text: "Backpack transformed our mobile app development process. Their team delivered a flawless product on time and within budget. The attention to detail and user experience was exceptional.",
        featured: false
      },
      {
        name: "Mr. Romjan",
        company: "Nuzeta",
        avatar: "Mr. Romjan.webp",
        avatarFolder: "avatars",
        rating: 4.5,
        text: "The custom software solution they built for us streamlined our operations significantly. Professional team, great communication.",
        featured: false
      },
      {
        name: "Mr. Tamjin",
        company: "PMS",
        avatar: "Mr. Tamjin.webp",
        avatarFolder: "avatars",
        rating: 4.5,
        text: "Outstanding web development work. They took our vision and created something even better than we imagined. The UI/UX design is top-notch.",
        featured: false
      },
      {
        name: "Khim",
        company: "MIR",
        avatar: "Khim.webp",
        avatarFolder: "avatars",
        rating: 5,
        text: "Solid team with great technical expertise. They helped us modernize our legacy systems with minimal downtime.",
        featured: false
      },
      {
        name: "Seng",
        company: "MIR",
        avatar: "Seng.webp",
        avatarFolder: "avatars",
        rating: 4.5,
        text: "Their automation solutions saved us countless hours of manual work. The ROI was evident within the first month of deployment.",
        featured: false
      },
      {
        name: "Khaleed Naji",
        company: "Tuwaiq Academy",
        avatar: "Khaleed Naji.webp",
        avatarFolder: "avatars",
        rating: 4.8,
        text: "Exceptional service from start to finish. The enterprise solution they developed has become critical to our daily operations. Highly recommended!",
        featured: false
      },
      {
        name: "Dr. Abdelrahman Elamin",
        company: "Al-Osmani Pharmacy",
        avatar: "Dr.Abdelrahman Elamin.webp",
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
      polls: polls || [],
      videos: videos || []
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
      videos: []
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

    // Process project images asynchronously in parallel
    const basePath = path.join(__dirname, "../public/images/Projects")
    await processProjectImages(projects, basePath)

    // Process tech stacks and display names
    projects.forEach(project => {
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

    // Use async file operations instead of sync
    const basePath = path.join(__dirname, "../public/images/Projects")
    const imageData = await getProjectImages(project.id, basePath)
    let imageGallery = imageData.images

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

    const [links] = await db.query(
      `SELECT * FROM project_links WHERE project_id = ? ORDER BY display_order, created_at`,
      [project.id]
    )
    project.links = links || []
    
    const projectDescription = project.description 
      ? (project.description.length > 160 ? project.description.substring(0, 157) + '...' : project.description)
      : `Learn about ${project.displayName}, a project by Backpack Tech Works. Expert software development solutions.`;
    
    const projectImage = coverImagePath || "/Backpack.webp";
    const projectUrl = `${process.env.SITE_URL || 'https://backpacktechworks.com'}/projects/${project.slug}`;
    

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
    noindex: false
  })
})


router.get("/privacy", (req, res) => {
  res.render("privacy", {
    title: "Privacy Policy - Backpack Tech Works",
    seoDescription: "Privacy Policy for Backpack Tech Works. Learn how we collect, use, and protect your personal information.",
    seoKeywords: "privacy policy, data protection, Backpack Tech Works privacy",
    seoImage: "/Backpack.webp",
    seoType: "website",
    noindex: false
  })
})


router.get("/contact", (req, res) => {

  const successMessages = res.locals.success_msg || []
  const errorMessages = res.locals.error_msg || []
  
  res.render("contact", {
    seoDescription: "Get in touch with Backpack Tech Works. Contact us for expert software development services, web development, mobile apps, and digital solutions for your business.",
    seoKeywords: "contact Backpack Tech Works, software development contact, web development services, tech consulting, get quote",
    seoImage: "/images/Assets/Contact Guy.webp",
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
    const { page = 1 } = req.query
    const pageNum = Math.max(1, parseInt(page) || 1)
    const limit = 10
    const offset = (pageNum - 1) * limit

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
    
    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM blogs b WHERE b.is_published = true${searchQuery.trim() ? ' AND (b.title LIKE ? OR b.content LIKE ?)' : ''}`
    const [countResult] = await db.query(countQuery, queryParams)
    const totalCount = countResult[0].count
    const totalPages = Math.ceil(totalCount / limit)
    
    blogsQuery += ` ORDER BY b.created_at DESC LIMIT ? OFFSET ?`
    
    const [blogs] = await db.query(blogsQuery, [...queryParams, limit, offset])


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
      searchQuery: searchQuery,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalCount,
        limit,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1,
        queryParams: new URLSearchParams(req.query).toString().replace(/&?page=\d+/, '')
      }
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
      searchQuery: req.query.search || '',
      pagination: {
        currentPage: 1,
        totalPages: 0,
        totalCount: 0,
        limit: 10,
        hasNext: false,
        hasPrev: false,
        queryParams: ''
      }
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


    const blogDescription = blog.excerpt || (blog.content 
      ? blog.content.replace(/<[^>]*>/g, '').substring(0, 160) + '...'
      : `Read ${blog.title} on Backpack Tech Works blog. Expert insights on software development and technology.`);
    
    const blogImage = blog.cover_image 
      ? `/images/Blogs/${blog.cover_image}`
      : (blog.images && blog.images.length > 0 ? blog.images[0] : "/Backpack.webp");
    
    const blogUrl = `${process.env.SITE_URL || 'https://backpacktechworks.com'}/blogs/${blog.slug}`;
    

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
    const { page = 1 } = req.query
    const pageNum = Math.max(1, parseInt(page) || 1)
    const limit = 10
    const offset = (pageNum - 1) * limit

    // Get total count
    const [countResult] = await db.query(`SELECT COUNT(*) as count FROM polls WHERE is_active = true`)
    const totalCount = countResult[0].count
    const totalPages = Math.ceil(totalCount / limit)

    const [polls] = await db.query(`
      SELECT p.*, 
        (SELECT COUNT(*) FROM poll_votes WHERE poll_id = p.id) as vote_count
      FROM polls p
      WHERE p.is_active = true
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `, [limit, offset])

    // Batch fetch all poll votes in a single query instead of N+1
    const pollIds = polls.map(p => p.id)
    let allPollVotes = []
    if (pollIds.length > 0) {
      const [votes] = await db.query(`
        SELECT poll_id, option_index, COUNT(*) as count
        FROM poll_votes
        WHERE poll_id IN (?)
        GROUP BY poll_id, option_index
      `, [pollIds])
      allPollVotes = votes
    }

    for (let poll of polls) {
      if (poll.options) {
        if (typeof poll.options === 'string') {
          try {
            poll.options = JSON.parse(poll.options)
          } catch (e) {
            poll.options = []
          }
        } else if (Array.isArray(poll.options)) {
          // already an array
        } else if (typeof poll.options === 'object') {
          poll.options = Object.values(poll.options)
        } else {
          poll.options = []
        }
      } else {
        poll.options = []
      }
      
      // Use the batched votes instead of individual queries
      const pollVotes = allPollVotes.filter(v => v.poll_id === poll.id)

      poll.optionVotes = []
      poll.totalVotes = poll.vote_count || 0
      for (let i = 0; i < poll.options.length; i++) {
        const voteData = pollVotes.find(v => v.option_index === i)
        poll.optionVotes[i] = voteData ? voteData.count : 0
      }
    }

    res.render("polls/index", {
      title: "Polls - Backpack Tech Works",
      polls,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalCount,
        limit,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1,
        queryParams: new URLSearchParams(req.query).toString().replace(/&?page=\d+/, '')
      }
    })
  } catch (error) {
    console.error(error)
    res.render("polls/index", {
      title: "Polls - Backpack Tech Works",
      polls: [],
      pagination: {
        currentPage: 1,
        totalPages: 0,
        totalCount: 0,
        limit: 10,
        hasNext: false,
        hasPrev: false,
        queryParams: ''
      }
    })
  }
})


router.get("/polls/:id", async (req, res) => {
  try {
    const { id } = req.params
    
    const [polls] = await db.query(
      "SELECT * FROM polls WHERE id = ? AND is_active = true",
      [id]
    )
    
    if (polls.length === 0) {
      return res.status(404).render("404", { title: "Poll Not Found" })
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
    `, [id])
    
    const [totalVotes] = await db.query(`
      SELECT COUNT(*) as count
      FROM poll_votes
      WHERE poll_id = ?
    `, [id])
    
    poll.optionVotes = []
    poll.totalVotes = totalVotes[0]?.count || 0
    for (let i = 0; i < pollOptions.length; i++) {
      const voteData = votes.find(v => v.option_index === i)
      poll.optionVotes[i] = voteData ? voteData.count : 0
    }
    
    res.render("polls/detail", {
      title: `${poll.question} - Polls - Backpack Tech Works`,
      poll,
      pollOptions
    })
  } catch (error) {
    console.error("Error loading poll detail:", error)
    res.status(500).render("error", {
      title: "Error",
      message: "Unable to load poll",
    })
  }
})

router.post("/polls/:id/vote", async (req, res) => {
  try {
    const { id } = req.params
    const { option_index } = req.body
    const { getDeviceId } = require("../utils/deviceFingerprint")
    
    // Get device ID from cookie (set by server) or generate one
    // This ensures consistency - server sets the cookie, we use it here
    const deviceId = getDeviceId(req, res)
    

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
    


    // Check for existing vote by device_id (primary check) or user_id
    let existingVotes = []
    if (deviceId) {
      const [deviceVotes] = await db.query(
        "SELECT * FROM poll_votes WHERE poll_id = ? AND device_id = ?",
        [id, deviceId]
      )
      existingVotes = deviceVotes
    }
    
    // Also check by user_id if user is logged in
    if (existingVotes.length === 0 && req.user) {
      const [userVotes] = await db.query(
        "SELECT * FROM poll_votes WHERE poll_id = ? AND user_id = ?",
        [id, req.user.id]
      )
      existingVotes = userVotes
    }
    
    if (existingVotes.length > 0) {
      return res.status(400).json({ success: false, message: "You have already voted on this poll" })
    }
    

    const userId = req.user ? req.user.id : null
    

    await db.query(
      `INSERT INTO poll_votes (poll_id, user_id, option_index, device_id) VALUES (?, ?, ?, ?)`,
      [id, userId, optionIndex, deviceId]
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


router.get("/sitemap.xml", async (req, res) => {
  try {
    const siteUrl = process.env.SITE_URL || 'https://backpacktechworks.com'
    const currentDate = new Date().toISOString().split('T')[0]
    

    const urls = [
      { loc: `${siteUrl}/`, changefreq: 'daily', priority: '1.0', lastmod: currentDate },
      { loc: `${siteUrl}/services`, changefreq: 'weekly', priority: '0.9', lastmod: currentDate },
      { loc: `${siteUrl}/projects`, changefreq: 'weekly', priority: '0.9', lastmod: currentDate },
      { loc: `${siteUrl}/team`, changefreq: 'monthly', priority: '0.8', lastmod: currentDate },
      { loc: `${siteUrl}/blogs`, changefreq: 'weekly', priority: '0.8', lastmod: currentDate },
      { loc: `${siteUrl}/videos`, changefreq: 'weekly', priority: '0.8', lastmod: currentDate },
      { loc: `${siteUrl}/polls`, changefreq: 'weekly', priority: '0.8', lastmod: currentDate },
      { loc: `${siteUrl}/contact`, changefreq: 'yearly', priority: '0.7', lastmod: currentDate },
    ]
    

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
    

    try {
      const [polls] = await db.query("SELECT id, updated_at FROM polls WHERE is_active = true")
      polls.forEach(poll => {
        const lastmod = poll.updated_at ? new Date(poll.updated_at).toISOString().split('T')[0] : currentDate
        urls.push({
          loc: `${siteUrl}/polls/${poll.id}`,
          changefreq: 'weekly',
          priority: '0.7',
          lastmod: lastmod
        })
      })
    } catch (error) {
      console.error("Error fetching polls for sitemap:", error)
    }
    

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

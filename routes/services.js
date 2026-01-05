const express = require("express")
const router = express.Router()
const db = require("../config/database")
const fs = require("fs")
const path = require("path")
const { processProjectImages } = require("../utils/fileHelpers")


router.get("/", async (req, res) => {
  try {
    const [services] = await db.query("SELECT * FROM services WHERE is_active = true ORDER BY display_order")
    res.render("services/index", {
      title: "Our Services - Backpack Tech Works",
      seoDescription: "Comprehensive software development services by Backpack Tech Works. Expert web development, mobile apps, enterprise solutions, and digital transformation services.",
      seoKeywords: "software development services, web development services, mobile app development, enterprise solutions, digital transformation, Backpack Tech Works services",
      seoImage: "/Backpack.webp",
      seoType: "website",
      services,
    })
  } catch (error) {
    console.error(error)
    res.render("services/index", {
      title: "Our Services - Backpack Tech Works",
      seoDescription: "Comprehensive software development services by Backpack Tech Works. Expert web development, mobile apps, enterprise solutions, and digital transformation services.",
      seoKeywords: "software development services, web development services, mobile app development, enterprise solutions, digital transformation, Backpack Tech Works services",
      seoImage: "/Backpack.webp",
      seoType: "website",
      services: [],
    })
  }
})


router.get("/:slug", async (req, res) => {
  try {
    const [services] = await db.query("SELECT * FROM services WHERE slug = ? AND is_active = true", [req.params.slug])

    if (services.length === 0) {
      return res.status(404).render("404", { title: "Service Not Found" })
    }

    const service = services[0]


    // Efficient random selection: get count first, then use LIMIT with OFFSET
    // This avoids ORDER BY RAND() which scans all rows
    const [[countResult]] = await db.query(
      "SELECT COUNT(*) as total FROM projects WHERE service_id = ? AND is_featured = true",
      [service.id]
    )
    const totalProjects = countResult.total
    const limit = Math.min(3, totalProjects)
    
    let projects = []
    if (totalProjects > 0) {
      if (totalProjects <= 3) {
        // If 3 or fewer projects, just get them all
        const [allProjects] = await db.query(
          "SELECT * FROM projects WHERE service_id = ? AND is_featured = true LIMIT 3",
          [service.id]
        )
        projects = allProjects
      } else {
        // Get 3 random offsets and fetch those specific projects
        const offsets = new Set()
        while (offsets.size < 3) {
          offsets.add(Math.floor(Math.random() * totalProjects))
        }
        const offsetArray = Array.from(offsets)
        
        // Fetch projects at random offsets in parallel
        const projectPromises = offsetArray.map(offset =>
          db.query(
            "SELECT * FROM projects WHERE service_id = ? AND is_featured = true LIMIT 1 OFFSET ?",
            [service.id, offset]
          )
        )
        const results = await Promise.all(projectPromises)
        projects = results.map(([rows]) => rows[0]).filter(Boolean)
      }
    }

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

    const serviceDescription = service.description 
      ? (service.description.length > 160 ? service.description.substring(0, 157) + '...' : service.description)
      : `Learn about ${service.title} services from Backpack Tech Works. Expert software development solutions.`;
    
    const serviceImage = service.icon 
      ? `/images/services/${service.icon}`
      : "/Backpack.webp";
    
    const serviceUrl = `${process.env.SITE_URL || 'https://backpacktechworks.com'}/services/${service.slug}`;
    

    const structuredData = {
      "@type": "Service",
      "@id": `${serviceUrl}#service`,
      "name": service.title,
      "description": service.description || serviceDescription,
      "url": serviceUrl,
      "image": serviceImage.startsWith('http') ? serviceImage : `${process.env.SITE_URL || 'https://backpacktechworks.com'}${serviceImage}`,
      "provider": {
        "@id": `${process.env.SITE_URL || 'https://backpacktechworks.com'}#organization`
      },
      "serviceType": service.title,
      "areaServed": "Worldwide"
    };
    
    res.render("services/detail", {
      title: `${service.title} - Backpack Tech Works`,
      seoDescription: serviceDescription,
      seoKeywords: `${service.title}, software development, web development, Backpack Tech Works services`,
      seoImage: serviceImage,
      seoType: "website",
      structuredData: structuredData,
      service,
      projects,
    })
  } catch (error) {
    console.error(error)
    res.status(500).render("error", {
      title: "Error",
      message: "Unable to load service details",
    })
  }
})

module.exports = router

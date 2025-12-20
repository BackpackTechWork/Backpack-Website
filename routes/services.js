const express = require("express")
const router = express.Router()
const db = require("../config/database")
const fs = require("fs")
const path = require("path")


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


    const [projects] = await db.query(
      "SELECT * FROM projects WHERE service_id = ? AND is_featured = true ORDER BY RAND() LIMIT 3",
      [service.id],
    )


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

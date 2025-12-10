# Backpack Tech Works

A full-featured software house website built with Node.js, Express, EJS, and MySQL.

## Features

- Beautiful, modern design with custom brand colors
- OAuth authentication (Google, GitHub)
- Role-based access control (Client, Team Member, Admin)
- Fully responsive design
- MySQL database with comprehensive schema
- Contact form with inquiry management
- Team member profiles with detailed information
- Service pages with detailed information
- Client and Admin dashboards
- Blog system with markdown support
- Project management and portfolio
- Poll system for user engagement

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (v14 or higher)
- MySQL (v5.7 or higher)
- npm or yarn package manager

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd "Backpack Website"
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` and fill in your credentials. See the [Environment Variables](#environment-variables) section below for details.

### 4. Set Up Database

The application will automatically create the database and tables on first run. Make sure your MySQL server is running and the credentials in `.env` are correct.

Alternatively, you can manually create the database:

```bash
mysql -u your_username -p < seed.sql
```

### 5. Configure OAuth Applications

#### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Navigate to "Credentials" and create OAuth 2.0 Client ID
5. Configure the consent screen
6. Add authorized redirect URI: `http://localhost:3000/auth/google/callback`
7. Copy the Client ID and Client Secret to your `.env` file

#### GitHub OAuth Setup

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the application details:
   - Application name: Your app name
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:3000/auth/github/callback`
4. Click "Register application"
5. Copy the Client ID and Client Secret to your `.env` file

**Note:** OAuth providers are optional. The application will work without them, but OAuth login features will be disabled.

### 6. Run the Application

#### Development Mode

Development mode with auto-restart using nodemon:

```bash
npm run dev
```

#### Production Mode

```bash
npm start
```

The application will be available at `http://localhost:3000` (or the port specified in your `.env` file).

## Environment Variables

The following environment variables can be configured in your `.env` file:

### Server Configuration

- `PORT` - Server port number (default: 3000)
- `NODE_ENV` - Environment mode: `development` or `production` (default: development)
- `SESSION_SECRET` - Secret key for session encryption (required, change in production)

### Database Configuration

- `DB_HOST` - MySQL host address (default: localhost)
- `DB_USER` - MySQL username (default: root)
- `DB_PASSWORD` - MySQL password (default: empty)
- `DB_NAME` - Database name (default: backpack_tech_works)

### OAuth Configuration (Optional)

#### Google OAuth

- `GOOGLE_CLIENT_ID` - Google OAuth Client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth Client Secret
- `GOOGLE_CALLBACK_URL` - Google OAuth callback URL (e.g., `http://localhost:3000/auth/google/callback`)

#### GitHub OAuth

- `GITHUB_CLIENT_ID` - GitHub OAuth Client ID
- `GITHUB_CLIENT_SECRET` - GitHub OAuth Client Secret
- `GITHUB_CALLBACK_URL` - GitHub OAuth callback URL (e.g., `http://localhost:3000/auth/github/callback`)

### Database Seeding

- `SEED_DB` - Set to `true` to automatically seed the database with demo data, `false` to skip (default: prompts on first run)

## Project Structure

```
backpack-tech-works/
├── config/
│   ├── database.js          # MySQL connection and table creation
│   └── passport.js          # OAuth authentication strategies
├── middleware/
│   └── auth.js              # Authentication middleware
├── public/
│   ├── avatars/             # User avatar images
│   ├── css/                 # Stylesheets
│   ├── images/              # Static images
│   ├── logos/               # Brand logos
│   └── profiles/            # Profile images
├── routes/
│   ├── index.js             # Home, about, contact routes
│   ├── auth.js              # Client authentication routes
│   ├── staff-auth.js        # Staff authentication routes
│   ├── services.js          # Service pages routes
│   ├── team.js              # Team pages routes
│   ├── client.js            # Client dashboard routes
│   └── admin.js             # Admin dashboard routes
├── services/
│   └── teamProfileService.js  # Team profile business logic
├── utils/
│   ├── markdown.js          # Markdown processing utilities
│   ├── seeder.js            # Database seeding utilities
│   ├── servicesCache.js     # Services caching
│   └── upload.js            # File upload handling
├── views/
│   ├── partials/            # Reusable EJS partials (header, footer, sidebars)
│   ├── admin/               # Admin dashboard views
│   ├── auth/                # Authentication views
│   ├── blogs/               # Blog views
│   ├── client/              # Client dashboard views
│   ├── team/                # Team member views
│   └── *.ejs                # Other page views
├── .env.example             # Environment variables template
├── server.js                # Main application entry point
├── seed.sql                 # Database seed data
└── package.json             # Project dependencies
```

## Default Admin Setup

To create an admin user, you can either:

1. Update an existing user's role in the database:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

2. Use the admin dashboard (if you already have admin access) to promote users

## Brand Colors

The application uses the following color scheme:

- **Red**: `#C51D34`
- **Dark Gray**: `#2E2E30`
- **Gray**: `#808080`
- **Light Gray**: `#F5F5F5`
- **Cream White**: `#FDFBF7`

## Technologies Used

- **Backend**: Node.js, Express.js
- **Template Engine**: EJS (Embedded JavaScript)
- **Database**: MySQL
- **Authentication**: Passport.js (OAuth 2.0)
- **Session Management**: express-session
- **File Upload**: Multer
- **Markdown Processing**: Marked
- **Styling**: Custom CSS

## Development

### Running in Development Mode

```bash
npm run dev
```

This will start the server with nodemon, which automatically restarts the server when files change.

### Database Seeding

On first run, the application will prompt you to seed the database with demo data. You can also control this behavior using the `SEED_DB` environment variable:

- Set `SEED_DB=true` to automatically seed
- Set `SEED_DB=false` to skip seeding
- Leave unset to be prompted interactively

## Production Deployment

Before deploying to production:

1. Set `NODE_ENV=production` in your `.env` file
2. Change `SESSION_SECRET` to a strong, random string
3. Update OAuth callback URLs to your production domain
4. Ensure your MySQL database is properly secured
5. Configure proper file upload limits and storage
6. Set up proper logging and error monitoring

## Troubleshooting

### Database Connection Issues

- Verify MySQL is running: `mysql --version`
- Check database credentials in `.env`
- Ensure the database user has proper permissions

### OAuth Not Working

- Verify OAuth credentials are correctly set in `.env`
- Check that callback URLs match exactly (including protocol and port)
- Ensure OAuth apps are properly configured in provider dashboards

### Port Already in Use

If port 3000 is already in use, change the `PORT` variable in `.env` to an available port.

## License

This project is proprietary and confidential. All rights reserved. This software and associated documentation files are the property of Backpack Tech Works and may not be used, copied, modified, or distributed without explicit written permission.

## Support

For issues and questions, please open an issue on the repository or contact the development team.

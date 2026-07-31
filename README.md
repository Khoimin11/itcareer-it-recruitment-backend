# ITcareer Backend

Backend service for **ITcareer**, an IT recruitment platform connecting candidates and companies through job posting, search, and CV submission workflows.

Although this repository contains only the backend source code, it powers the full system used by the frontend demo below.

## Live Demo

- Frontend demo: `https://itcareer-theta.vercel.app`
- Backend repository: `https://github.com/Khoimin11/itcareer-it-recruitment-backend`

## Project Overview

ITcareer is a recruitment platform built around 2 main user groups:

- **Candidates** can browse jobs, search and filter opportunities, and submit CVs online.
- **Companies** can manage profiles, create job posts, and review received applications.

This backend handles the main business logic, authentication, data persistence, file uploads, and API communication for the platform.

## Highlights

- Built with `TypeScript`, `Node.js`, `Express.js`, `MongoDB`, and `Mongoose`
- Implemented `25+ API endpoints`
- Organized into `7 controllers`, `8 route files`, and `5 MongoDB collections`
- Supported `2 main user roles`: candidates and companies
- Implemented `JWT` authentication with cookies
- Integrated `Cloudinary` for media and CV upload handling

## Main Features

- Candidate registration, login, and profile management
- Company registration, login, and company profile management
- Job creation, editing, deletion, and listing
- CV submission and CV tracking
- Job search by keyword, company, city, position, working form, and technology
- Public company list, company detail, and job detail APIs

## API Domains

- `/auth`
- `/user`
- `/company`
- `/job`
- `/search`
- `/city`
- `/upload`

Health check:

- `/health`

## Tech Stack

`TypeScript` · `Node.js` · `Express.js` · `MongoDB` · `Mongoose` · `JWT` · `Joi` · `Cloudinary`

## Environment Variables

Create a `.env` file based on `.env.example`.

```env
DATABASE=
JWT_SECRET=
NODE_ENV=
PORT=
FRONTEND_URL=
CLOUDINARY_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

## Run Locally

Install dependencies:

```bash
yarn install
```

Start development mode:

```bash
yarn dev
```

Build production files:

```bash
yarn build
```

Run production build:

```bash
yarn start
```

Default local backend URL:

```text
http://localhost:4000
```

## Project Structure

```text
project-2-be/
|-- config/
|-- controllers/
|-- helpers/
|-- interfaces/
|-- middlewares/
|-- models/
|-- routes/
|-- validates/
|-- dist/
|-- .env.example
|-- index.ts
|-- package.json
`-- tsconfig.json
```

## Author

**Do Minh Khoi**

- GitHub: `https://github.com/Khoimin11`
- LinkedIn: `https://www.linkedin.com/in/do-minh-khoi-b403492bb`

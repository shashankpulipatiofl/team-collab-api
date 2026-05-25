# Team Collaboration API

A production-ready, enterprise-grade backend service built for secure, scalable team collaboration. This project demonstrates advanced backend architecture, robust security principles, automated CI/CD pipelines, and environment-independent testing.

## 🚀 Key Features

### 1. Robust Security & RBAC (Role-Based Access Control)

- **Granular Permissions:** Strict authorization mapping across `admin`, `owner`, and `viewer` roles.
- **Privilege Escalation Protection:** Complete mitigation of Insecure Direct Object Reference (IDOR) and unauthorized self-promotion exploits through strict call-chain validation.
- **Centralized Validation:** Comprehensive payload validation using Joi to prevent NoSQL/SQL injection and malformed inputs.
- **Audit Logging:** Centralized, compliant audit trails tracking every sensitive mutation (role changes, team deletions, etc.) across the system.

### 2. Production-Grade CI/CD & Testing

- **Environment-Independent Testing:** A fully containerized integration test suite leveraging `beforeAll` and `afterAll` seeding to ensure tests run reliably on any clean CI machine without relying on localized database state.
- **Automated Workflows:** GitHub Actions configured to run linting, unit tests, and integration tests on every push, ensuring zero regressions enter the `main` branch.
- **Strict Linting:** Enforced code quality and architectural coherence using custom ESLint rules.

### 3. Core Domain Capabilities

- **Team Management:** Create workspaces, invite members via email, and securely manage access levels.
- **Comment Threads & Mentions:** Real-time collaboration features on tasks and projects.
- **Activity Feeds:** WebSocket-enabled real-time activity streams tracking user actions across the platform.

### 4. Containerization & Infrastructure

- **Dockerized Environment:** `docker-compose` setup for immediate, reproducible local development and testing environments (Node.js API + MongoDB).
- **Environment Configuration:** Strict separation of environment variables (`.env.example`) to prevent secret leakage.

## 🏗️ Architecture

This project is built using a layered architecture to ensure separation of concerns:

- **Routes Layer:** Handles HTTP requests, authentication verification, and route-level validation.
- **Controller/Service Layer:** Contains the core business logic, decoupled from the HTTP transport.
- **Data Access Layer:** Mongoose models and database interaction logic.
- **Cross-Cutting Concerns:** Shared middleware for error handling (`src/utils/error.js`), permission checking (`src/permissions/check.js`), and input validation.

Check out the [DESIGN.md](./DESIGN.md) and [ARCHITECTURE.md](./ARCHITECTURE.md) for deeper system-level diagrams and decisions.

## 🛠️ Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB (via Mongoose)
- **Testing:** Jest & Supertest
- **Linting:** ESLint
- **CI/CD:** GitHub Actions
- **Containerization:** Docker & Docker Compose
- **Documentation:** OpenAPI (Swagger) `openapi.yaml`

## 🚦 Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js (v18+)

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/shashankpulipatiofl/team-collab-api.git
   cd team-collab-api
   ```
2. Set up your environment variables:
   ```bash
   cp .env.example .env
   ```
3. Start the application stack via Docker:
   ```bash
   docker-compose up --build
   ```
4. The API will be available at `http://localhost:3000`.

### Running Tests

To run the automated, environment-independent test suite:

```bash
npm install
npm test
```

## 📖 API Documentation

The complete OpenAPI specification is located in `openapi.yaml`. You can paste this into [Swagger Editor](https://editor.swagger.io/) or Postman to view all endpoints, request schemas, and response formats.

---

_Developed with a focus on security-first engineering and long-term maintainability._

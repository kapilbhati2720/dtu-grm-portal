# DTU Grievance Redressal Management (GRM) Portal

This is an end-to-end web application built as a B.Tech Mini Project. It provides a centralized platform for students and faculty at DTU to submit, track, and manage grievances efficiently.

## ✨ Features

* **Student Workflow:** User Registration with Email Verification, Login, Dashboard, Grievance Submission, View Grievance List & Details, Add Comments.
* **Nodal Officer Workflow:** Login, Role-Based Dashboard, View Assigned Grievances, Update Grievance Status, Add Official Comments.
* **Real-Time Notifications:** Students receive instant browser notifications when their grievance status is updated or an officer comments.
* **Security:** JWT-based authentication, protected routes, secure password hashing, and automated cleanup of unverified users.

## 🛠️ Tech Stack

* **Frontend:** React, Vite, React Router, Axios, Tailwind CSS, Socket.IO Client
* **Backend:** Node.js, Express.js, PostgreSQL, Socket.IO
* **Database:** PostgreSQL
* **Development Tools:** Nodemon, Concurrently, Mailtrap (for email testing)

## 🚀 Getting Started

### Prerequisites
- Node.js
- PostgreSQL

### Setup
1.  Clone the repository.
2.  Navigate to the `server` directory, run `npm install`.
3.  Navigate to the `client` directory, run `npm install`.
4.  Create a `.env` file in the `server` directory with the required environment variables.
5.  From the root directory, run `npm run dev` to start both servers.

### Environment Variables
Create a `.env` file in the `server` folder with the following variables:
`DATABASE_URL=...`
`JWT_SECRET=...`
`MAIL_HOST=...`
`MAIL_PORT=...`
`MAIL_USER=...`
`MAIL_PASS=...`

## Future Scope

* **Super Admin Role:** A top-level dashboard for a Super Admin to manage Nodal Officer accounts.
* **Analytics Dashboard:** Visual charts and metrics on grievance trends and resolution times.
* **Petition System:** Allow multiple students to support a single, high-impact grievance.
* **File Attachments:** Enable users to upload supporting documents and images.
* **AI-Powered Enhancements:** Use NLP/LLMs for automatic grievance categorization, summarization, and priority assessment.
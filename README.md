# BioSync Sentinel - Web Dashboard

![BioSync Sentinel](https://img.shields.io/badge/Project-FYP%20BioSync%20Sentinel-59B8FF)
![React](https://img.shields.io/badge/Frontend-React-blue)
![Firebase](https://img.shields.io/badge/Database-Firebase-orange)
![RBAC](https://img.shields.io/badge/Security-Role%20Based%20Access-green)

## Overview

**BioSync Sentinel** is a biometric-based attendance management platform designed to provide secure, automated, and real-time attendance monitoring.

The system integrates biometric authentication methods with a web dashboard to allow administrators, teachers, and students to manage and monitor attendance records efficiently.

The dashboard provides different access levels through **Role-Based Access Control (RBAC)** to ensure users can only access features according to their assigned roles.

---

# Features

## Role-Based Access Control (RBAC)

BioSync Sentinel implements three user roles:

### Administrator

Full system access.

Features:

- Dashboard monitoring
- User management
- Device management
- Attendance monitoring
- Audit logs
- System settings


### Teacher

Class-level management access.

Features:

- View attendance records
- Manage attendance disputes
- View analytics
- Monitor student attendance


### Student

Personal attendance access.

Features:

- View personal attendance
- Submit attendance disputes
- View attendance history
- Manage profile


---

# System Architecture
             +----------------+
             |     User       |
             +-------+--------+
                     |
                     |
              Firebase Auth
                     |
                     |
          +----------+----------+
          |
    Role Verification
          |
      +-------+-------+-------+
      |               |       |
    Admin          Teacher  Student
      |               |       |
      +---------------+-------+
                      |
              React Dashboard
                      |
                Firestore Database

---

# Technologies Used

## Frontend

- React.js
- Vite
- React Router
- JavaScript (JSX)
- CSS
- Lucide React Icons


## Backend / Cloud Services

- Firebase Authentication
- Cloud Firestore
- Firebase SDK


## Development Tools

- Visual Studio Code
- Git & GitHub
- Node.js
- npm

## Future Improvements
- Hardware biometric integration
- Real-time attendance synchronization
- Advanced analytics dashboard
- Multi-factor authentication
- Improved audit logging
- Mobile Web support

## Contributors
- BioSyncSentinal Team - Development Team
- FYP Project - German-Malaysian Institute

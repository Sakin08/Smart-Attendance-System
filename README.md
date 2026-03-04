# Smart Attendance System

A comprehensive QR code and GPS-based attendance tracking system for universities, built with React, Node.js, Express, and MongoDB.

## 🔐 Default Admin Access

**Admin Login Credentials** (Auto-created on server start):

- **Email**: `admin@smartattendance.edu`
- **Password**: `admin123`

⚠️ **Important**: Change the password after first login for security.

## Features

- 🎓 **Student Management**: Register students with SUST email validation and department parsing
- 👨‍🏫 **Teacher Dashboard**: Create courses, manage students, and track attendance
- 📱 **QR Code Scanning**: Students scan QR codes to mark attendance
- 📍 **GPS Verification**: Ensures students are physically present in the classroom
- ⏰ **Time-bound Sessions**: Attendance only valid during specified time windows
- 📊 **Reports & Analytics**: View attendance history, export to CSV/Excel
- 🔐 **Secure Authentication**: JWT-based authentication with role-based access control
- 🏛️ **Multi-Department Support**: 28 SUST departments across 6 faculties

## Tech Stack

### Frontend

- React 18
- Vite
- React Router
- Axios
- Tailwind CSS
- Leaflet (Maps)
- html5-qrcode (QR Scanner)
- qrcode (QR Generator)

### Backend

- Node.js
- Express
- MongoDB with Mongoose
- JWT Authentication
- bcryptjs (Password Hashing)
- ExcelJS & json2csv (Export)

## Project Structure

```
smart-attendance/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── context/       # React context (Auth)
│   │   ├── pages/         # Page components
│   │   ├── utils/         # Utility functions
│   │   ├── api.js         # Axios configuration
│   │   └── main.jsx       # Entry point
│   ├── vercel.json        # Vercel config
│   └── package.json
│
├── server/                # Node.js backend
│   ├── config/           # Database configuration
│   ├── middleware/       # Auth middleware
│   ├── models/           # Mongoose models
│   ├── routes/           # API routes
│   ├── utils/            # Utility functions
│   ├── index.js          # Server entry point
│   ├── seed.js           # Database seeder
│   ├── vercel.json       # Vercel config
│   └── package.json
│
├── vercel.json           # Root Vercel config (monorepo)
├── DEPLOYMENT_GUIDE.md   # Detailed deployment instructions
└── DEPLOYMENT_CHECKLIST.md # Step-by-step checklist

```

## Local Development

### Prerequisites

- Node.js 18+ and npm
- MongoDB (local or Atlas)
- Git

### Setup

1. **Clone the repository**

   ```bash
   git clone <your-repo-url>
   cd smart-attendance
   ```

2. **Setup Backend**

   ```bash
   cd server
   npm install
   cp .env.example .env
   # Edit .env with your MongoDB URI and JWT secret
   npm run dev
   ```

3. **Setup Frontend**

   ```bash
   cd client
   npm install
   npm run dev
   ```

4. **Seed Database (Optional)**

   ```bash
   cd server
   npm run seed
   ```

   Default accounts:
   - **Admin**: `admin@smartattendance.edu` / `admin123` (Auto-created on server start)
   - Teacher: `dr.rahman@sust.edu` / `teacher123`
   - Student: `2021331001@student.sust.edu` / `student123`

   **Note**: The admin account is automatically created when the server starts. You can login immediately with the credentials above.

### Environment Variables

#### Backend (.env)

```env
PORT=5001
MONGO_URI=mongodb://localhost:27017/attendance
JWT_SECRET=your-secret-key
CLIENT_URL=http://localhost:5173
```

#### Frontend (.env)

```env
VITE_API_URL=http://localhost:5001/api
```

## Deployment

### Quick Deploy to Vercel

1. **Deploy Backend**

   ```bash
   cd server
   vercel --prod
   ```

2. **Deploy Frontend**

   ```bash
   cd client
   vercel --prod
   ```

3. **Configure Environment Variables**
   - Add environment variables in Vercel dashboard
   - Update CORS settings

For detailed instructions, see [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

For step-by-step checklist, see [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)

## How It Works

### Attendance Flow

1. **Teacher Creates Session**
   - Selects course and location
   - Sets time window and radius
   - System generates unique QR code

2. **Student Marks Attendance**
   - Scans QR code with camera
   - System validates:
     - ✅ Valid QR token
     - ✅ Student enrolled in course
     - ✅ Within time window
     - ✅ Within GPS radius
     - ✅ Not already marked
   - Attendance recorded with timestamp & GPS

3. **View Reports**
   - Students see attendance history
   - Teachers view attendance sheets
   - Export to CSV/Excel

For detailed explanation, see [ATTENDANCE_FLOW.md](ATTENDANCE_FLOW.md)

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `GET /api/auth/departments` - Get department list

### Teacher Routes

- `POST /api/courses` - Create course
- `GET /api/courses` - List courses
- `PUT /api/courses/:id/students` - Manage students
- `POST /api/attendance-sessions` - Create session
- `GET /api/attendance-sessions/teacher` - List sessions
- `GET /api/attendance-sessions/:id` - View session
- `GET /api/attendance-sessions/:id/export` - Export CSV/Excel

### Student Routes

- `GET /api/attendance-sessions/active` - List active sessions
- `POST /api/attendance/mark` - Mark attendance
- `GET /api/attendance-sessions/history` - View history

### Admin Routes

- `GET /api/admin/users` - List all users
- `PUT /api/admin/users/:id/role` - Update user role
- `DELETE /api/admin/users/:id` - Delete user

## Features in Detail

### Student Registration

- Validates SUST email format (e.g., `2021331008@student.sust.edu`)
- Automatically extracts:
  - Registration number
  - Department (from code)
  - Batch/Year
  - Roll number
- Supports 28 departments across 6 faculties

### Course Management

- Create courses with department and batch
- Add/remove students by email
- View enrolled students list
- Track course statistics

### Attendance Sessions

- Set classroom location on map
- Define attendance radius (default 100m)
- Set time window for attendance
- Generate unique QR codes
- Real-time attendance tracking

### Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control
- QR token validation
- GPS location verification
- Time-bound sessions
- Duplicate prevention

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Note**: Camera access required for QR scanning

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

This project is licensed under the MIT License.

## Support

For issues and questions:

- Create an issue on GitHub
- Check [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for deployment help
- Review [ATTENDANCE_FLOW.md](ATTENDANCE_FLOW.md) for system explanation

## Acknowledgments

- SUST (Shahjalal University of Science and Technology)
- React and Vite teams
- MongoDB and Mongoose
- Vercel for hosting

---

**Live Demo**: [Add your deployment URL here]

**Documentation**: See `/docs` folder for detailed documentation

**Version**: 1.0.0

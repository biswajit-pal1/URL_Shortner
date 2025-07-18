# URL Shortener

A simple and efficient URL shortener application that allows users to generate short links for long URLs, track usage, and manage their links easily. Built with Node.js, Express, MongoDB, and EJS, this project provides a user-friendly interface and RESTful API support.

---

## Features

- **URL Shortening**: Generate short URLs for any valid link.
- **Redirects**: Automatically redirect users from short URLs to original URLs.
- **Click Tracking**: Track the number of clicks for each shortened URL.
- **QR Code Generation**: Generate QR codes for shortened URLs.
- **User Authentication**: Secure login and signup functionality using Passport.js.
- **URL Management**: View, copy, and delete your shortened URLs.
- **Toast Notifications**: Real-time feedback for actions like login, signup, URL copy, and deletion.
- **Responsive Design**: Optimized for both desktop and mobile devices.

---

## Technologies Used

- **Backend**: Node.js, Express.js
- **Frontend**: EJS, Bootstrap 5
- **Database**: MongoDB
- **Authentication**: Passport.js
- **QR Code Generation**: QRCode.js

---

## Getting Started

### Prerequisites

- Node.js and npm installed
- MongoDB running locally or remotely

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/url-shortener.git
   cd url-shortener
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory and add the following:
   ```env
   PORT=3000
   MONGO_URI=your_mongodb_connection_string
   SESSION_SECRET=your_session_secret
   ```

4. Start the application:
   ```bash
   npm start
   ```

5. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

---

## API Endpoints

### Public Endpoints
- `POST /login`: Authenticate user.
- `POST /signup`: Create a new user.

### Protected Endpoints
- `POST /shorten`: Shorten a URL.
- `GET /api/urls/user`: Fetch all URLs for the logged-in user.
- `DELETE /api/urls/:short`: Delete a specific URL.

### Example Requests

#### Create a Short URL
```bash
POST /shorten
Content-Type: application/json
Body: { "full": "https://example.com" }
```

#### Redirect to Original URL
```bash
GET /:shortId
```

#### Get Stats for a Short URL
```bash
GET /api/stats/:shortId
```

---

## Folder Structure

```
├── backend
│   ├── server.js          # Main server file
│   ├── models             # MongoDB models
│   └── routes             # API routes
├── frontend
│   ├── views              # EJS templates
│   │   ├── index.ejs      # Landing page
│   │   ├── profile.ejs    # Profile page
│   └── public             # Static assets (CSS, JS)
│       ├── script.js      # Frontend JavaScript
│       └── styles.css     # Custom styles
├── .env                   # Environment variables
├── package.json           # Project metadata
└── README.md              # Project documentation
```

---

## Screenshots

### Landing Page
![Landing Page](screenshots/landing-page.png)

### Profile Page
![Profile Page](screenshots/profile-page.png)

---

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

---

## License

This project is licensed under the [MIT License](LICENSE).

---

*Feel free to customize this README to better fit your project!*
🏫 Campus Market - Student Marketplace Web Application

Campus Market is a modern full-stack marketplace web application designed for students to buy and sell products within their campus community. It provides a secure, role-based system where verified sellers can list products and buyers can browse, purchase, and track orders in real time.

The platform is built using a serverless architecture powered by Firebase and Supabase, and deployed using Vercel for fast global access.

---

🌐 Live Demo

🔗 https://campusmarket.vercel.app

---

🎯 Project Objective

The goal of Campus Market is to simulate a real-world e-commerce platform within a controlled campus environment. It aims to:

- Provide students with a safe marketplace
- Enable easy product listing for sellers
- Allow buyers to discover and purchase items efficiently
- Demonstrate modern full-stack development using serverless tools

---

✨ Core Features

👨‍🎓 Seller Features

- ➕ Create and manage product listings
- 🖼️ Upload product images with preview support
- 📦 Manage stock and product availability
- 📋 View incoming customer orders
- 🔄 Update order status (Pending → Processing → Completed)
- ✅ Seller verification system before enabling selling access

---

🛍️ Buyer Features

- 🔍 Browse all available products in real-time
- 🧭 Filter products by category
- 🔎 Search products by name or description
- 🛒 Add items to cart with quantity control
- 📦 Checkout system with order confirmation
- 📜 View order history and tracking status

---

🚀 Tech Stack

🌐 Frontend

- HTML5
- CSS3
- JavaScript
- Tailwind CSS

🔥 Backend (Backend as a Service - BaaS)

- Firebase (Authentication & Seller Verification)
- Supabase (Database & Storage)

▲ Deployment

- Vercel

---

🧠 System Architecture

Client (Browser)
↓
Frontend (HTML / CSS / JS + Tailwind)
↓
Firebase (Authentication Layer)
↓
Supabase (Database + Storage Layer)
↓
Vercel (Hosting)

---

🔐 Security Notes

- Firebase Authentication controls user access
- Supabase Row Level Security (RLS) protects database
- No sensitive keys are exposed publicly

---

🔐 Environment Variables

VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project_id

VITE_SUPABASE_URL=your_url
VITE_SUPABASE_ANON_KEY=your_key

---

🧑‍💻 Installation

git clone https://github.com/Axzel-web/campusmarket.git
cd campusmarket
npm install
npm run dev

---

🚀 Deployment

1. Connect GitHub repo to Vercel
2. Add environment variables
3. Deploy

---

🚀 Future Improvements

- 💳 Payment integration
- 🔔 Notifications
- ⭐ Ratings & reviews
- 📱 Mobile support
- 📊 Admin dashboard

---

🧠 Learning Outcomes

- Full-stack development using cloud services
- Firebase authentication system
- Supabase database integration
- Serverless architecture design
- Frontend UI development with Tailwind CSS

---

👨‍💻 Author

Group 4

---

📄 License

MIT License

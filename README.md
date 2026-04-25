## Campus Market – Student Marketplace Web Application

Campus Market is a modern full-stack marketplace web application designed specifically for students to buy and sell products within their campus community.

It provides a secure, role-based system where verified sellers can list products, while buyers can browse, purchase, and track orders in real time.

The platform uses a serverless architecture powered by Firebase and Supabase, and is deployed via Vercel for fast and reliable global access.

---

## Project Objective

Campus Market aims to simulate a real-world e-commerce platform within a controlled campus environment. Its goals are to:

- Provide students with a safe and trusted marketplace  
- Enable sellers to easily list and manage products  
- Allow buyers to discover and purchase items efficiently  
- Demonstrate modern full-stack development using serverless technologies  

---

## Core Features

### Seller Features
- Create and manage product listings  
- Upload product images with preview support  
- Manage stock and product availability  
- View incoming customer orders  
- Update order status (Pending → Processing → Completed)  
- Seller verification system before gaining selling access  

### Buyer Features
- Browse available products in real time  
- Filter products by category  
- Search products by name or description  
- Add items to cart with quantity control  
- Checkout system with order confirmation  
- View order history and order tracking status  

---

## Tech Stack

### Frontend
- HTML5  
- CSS3  
- JavaScript  
- Tailwind CSS  

### Backend (Backend-as-a-Service)
- Firebase (Authentication and Seller Verification)  
- Supabase (Database and Storage)  

### Deployment
- Vercel  

---

## System Architecture

```text
Client (Browser)
       ↓
Frontend (HTML / CSS / JS + Tailwind)
       ↓
Firebase (Authentication Layer)
       ↓
Supabase (Database + Storage)
       ↓
Vercel (Hosting)

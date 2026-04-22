# 📌 CampusMarket – Cloud-Based Marketplace System

## 📖 Description
CampusMarket is a web-based marketplace platform designed for students to buy, sell, and browse items within the campus community. The system uses a modern cloud-based architecture that separates frontend, authentication, and database services for scalability, maintainability, and performance.

---

## ⚙️ System Architecture

```text
User → Vercel (Frontend Hosting)
         ↓
   Firebase (Authentication / Storage)
         ↓
   Supabase (Database / API)

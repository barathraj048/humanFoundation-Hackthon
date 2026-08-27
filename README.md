# CRM Dashboard - Human Foundation Hackathon 🚀

A comprehensive Customer Relationship Management (CRM) platform built for the Human Foundation Hackathon. This application centralizes sales data, inventory tracking, lead management, and scheduling into a single, intuitive dashboard to streamline business operations.

## ✨ Features

*   **📊 Sales Analytics:** Real-time visibility into total sales and revenue metrics.
*   **📦 Warehouse & Inventory Management:** Track the exact quantity and status of products currently available in the warehouse.
*   **🎯 Lead Management:** Monitor, track, and update the status of active leads in your sales pipeline.
*   **📅 Meeting Scheduler:** Maintain and organize client and team meetings directly within the platform.

## 🚀 Future Scope

*   **💬 Integrated SMS Chat:** An in-built messaging interface that routes communication directly to customers via standard SMS, enabling seamless, instant, and reliable customer engagement without leaving the CRM.

## 🛠️ Tech Stack

*   **Frontend:** React / Next.js / Tailwind CSS
*   **Backend:** Node.js / Express 
*   **Database:** PostgreSQL / Prisma
*   **Other:** Docker

## ⚙️ Getting Started

Follow these steps to set up the project locally.

### Prerequisites

*   Node.js (v18 or higher)
*   npm or yarn
*   PostgreSQL (or your chosen database)

### Installation

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/barathraj048/humanFoundation-Hackthon.git](https://github.com/barathraj048/humanFoundation-Hackthon.git)
   cd humanFoundation-Hackthon
Install dependencies:

Bash
npm install
# or
yarn install
Set up environment variables:
Create a .env file in the root directory and add your configuration details:

Code snippet
DATABASE_URL="your_database_connection_string"
PORT=3000
# Add future SMS API keys here (e.g., Twilio)
# TWILIO_ACCOUNT_SID="your_sid"
Run database migrations (if applicable):

Bash
npx prisma db push
# or your specific migration command
Start the development server:

Bash
npm run dev
 or
yarn dev
Open the application:
Navigate to http://localhost:3000 in your browser.

🤝 Contributing
This project was built specifically for the Human Foundation Hackathon. If you'd like to contribute, feel free to fork the repository and submit a pull request.

📄 License
This project is licensed under the MIT License.

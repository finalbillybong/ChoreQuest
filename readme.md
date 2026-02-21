ChoreQuest 🛡️🧹
ChoreQuest is a gamified chore-tracking application designed to turn household responsibilities into an engaging "quest" for children. Built with a modern React frontend, it allows families to manage tasks, track progress with a point-based system, and redeem rewards.

🌟 Key Features
Chore Management: Create, track, and complete chores. Each chore is assigned a point value.

Reward System: A dedicated shop where earned points can be exchanged for custom rewards.

Gamified Progress: Visual feedback and "Level Up" mechanics (via point accumulation) to keep users motivated.

Kid-Friendly UI: An intuitive, colorful interface built for ease of use by younger children.

Persistent Stats: Tracks "Available Points" for spending and "Lifetime Points" to showcase long-term achievement.

Sorting & Filtering: Quickly organize chores and rewards by point value or priority.

🚀 Tech Stack
Frontend: React.js (Hooks, Functional Components)

State Management: React Context API for global user data and point tracking.

Styling: Bootstrap 5 & Custom CSS.

Icons: Font Awesome.

Animations: Canvas Confetti for celebration effects upon task completion.

Routing: React Router for seamless navigation between the Dashboard, Chores, and Rewards.

📁 Project Structure
Plaintext
src/
├── components/        # Reusable UI components (Buttons, Modals, Cards)
├── context/           # Context providers for global state (Points, Chores)
├── pages/             # Main views (Dashboard, Chore List, Rewards Shop)
├── assets/            # Static images and icons
├── styles/            # CSS and Bootstrap overrides
└── App.js             # Main routing and application logic
🛠️ Getting Started
Prerequisites

Node.js (v14.0 or higher recommended)

npm

Installation

Clone the repository:

Bash
git clone https://github.com/finalbillybong/ChoreQuest.git
cd ChoreQuest
Install dependencies:

Bash
npm install
Start the development server:

Bash
npm start
Open http://localhost:3000 to view it in your browser.

🎮 How to Use
The Dashboard: View your current "Available Points" and "Total Points Earned."

Add a Chore: Navigate to the Chores section and use the "Add New" button. Set a name and a point reward.

Complete & Earn: Click "Complete" on a chore to trigger a celebration and add points to your balance.

Redeem Rewards: Go to the Rewards shop to spend your hard-earned points on custom prizes created by parents.

🔮 Future Roadmap
[ ] User Profiles: Multi-child support with individual avatars and stats.

[ ] Authentication: Secure login for parents to approve chore completion.

[ ] Backend Integration: Migration from local state to a database (Firebase or Node/Express) for cross-device syncing.

[ ] Mobile App: Wrapping the project in React Native for mobile-first household management.

License

This project is open-source. Feel free to fork and adapt it for your own family!

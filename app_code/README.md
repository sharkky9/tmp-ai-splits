# LLM Expense Splitting Application

An intelligent expense splitting application built with Next.js, Supabase, and OpenAI that automatically parses expense receipts and calculates fair splits among group members.

## 🚀 Live Deployment

### Production Application

**Primary URL:** [https://appcode-eta.vercel.app](https://appcode-eta.vercel.app)

### Alternative Production URLs

- https://appcode-chris-handels-projects.vercel.app
- https://appcode-cullyhandel-1289-chris-handels-projects.vercel.app
- https://appcode-n7i6xdo6m-chris-handels-projects.vercel.app

### Staging/Preview Environment

- **Preview URL:** https://appcode-awfqx6zkx-chris-handels-projects.vercel.app

## ✨ Key Features

- **AI-Powered Receipt Parsing**: Upload receipt images and let OpenAI automatically extract expense details
- **Smart Group Management**: Create and manage expense groups with multiple participants
- **Automatic Settlement Calculation**: Built-in algorithms to calculate who owes what and minimize transactions
- **Real-time Updates**: Live expense tracking and settlement updates across all group members
- **Secure Authentication**: User authentication and data protection with Row Level Security (RLS)
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## 🛠 Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL database, Edge Functions, Authentication)
- **AI Integration**: OpenAI o3 for advanced natural language reasoning and expense parsing
- **Deployment**: Vercel with automated CI/CD via GitHub Actions
- **Monitoring**: Sentry for error tracking, Vercel Analytics for performance

## 🏃‍♂️ Getting Started (Development)

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- Supabase account
- OpenAI API key

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd tmp-ai-splits/app_code
```

2. Install dependencies:

```bash
pnpm install
```

3. Set up environment variables:

   - Copy `.env.example` to `.env.local`
   - Add your Supabase URL and anon key
   - Add your OpenAI API key

4. Run the development server:

```bash
pnpm dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## 📱 How to Use the Application

### Getting Started

1. **Sign Up/Login**: Create an account or login at the deployed application
2. **Create a Group**: Start by creating an expense group and inviting members
3. **Add Expenses**: Upload receipt photos or manually enter expense details
4. **AI Processing**: The system automatically parses receipts and suggests expense splits
5. **Review & Confirm**: Review AI suggestions and make adjustments as needed
6. **Settlement**: View calculated settlements and track who owes what

### Core Workflows

- **Group Creation**: Groups → Create New Group → Add members
- **Expense Entry**: Within group → Add Expense → Upload receipt or enter manually
- **Settlement View**: Navigate to Settlement section to see calculations
- **Profile Management**: Update your profile and payment preferences

## 🔧 Development Information

### Project Structure

```
src/
├── app/              # Next.js app router pages
├── components/       # Reusable React components
├── lib/             # Utilities, database, and API helpers
├── contexts/        # React contexts for state management
├── hooks/           # Custom React hooks
└── types/           # TypeScript type definitions
```

### Testing

```bash
# Run the test suite
pnpm test

# Run tests in watch mode
pnpm test:watch
```

### Building for Production

```bash
pnpm build
```

## 🚀 Deployment & CI/CD

The application is automatically deployed via GitHub Actions:

- **Production**: Pushes to `main` branch deploy to production URLs
- **Staging**: Pushes to `develop` branch deploy to preview environment
- **Pipeline**: Includes linting, testing, and automated deployment to Vercel

### Environment Variables (Production)

Required environment variables are configured in Vercel:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `OPENAI_API_KEY`
- Sentry configuration variables for error tracking

## 📊 Current Application Status

### ✅ Fully Functional Features

- User authentication and registration
- Group creation and management
- Expense entry (manual and receipt upload)
- AI-powered receipt parsing via OpenAI
- Settlement calculation algorithms
- Real-time data synchronization
- Responsive UI across devices

### 🔄 Known Limitations (Current Version)

This is the initial production deployment focusing on core functionality. Some advanced features and optimizations are planned for future releases:

- Advanced expense categorization
- Bulk expense operations
- Export/reporting features
- Mobile app version
- Enhanced notification system

Future improvements will be prioritized based on user feedback and usage analytics.

## 🔍 Monitoring & Support

- **Error Tracking**: Sentry integration captures and reports application errors
- **Performance Monitoring**: Vercel Analytics tracks application performance and usage
- **Database**: Supabase provides real-time database monitoring and logs

## 🤝 Contributing

This is currently a prototype in active development. Feedback and bug reports are welcome through the GitHub repository issues.

## 📄 License

[License information to be added]

---

**Last Updated**: June 2025  
**Version**: 1.0.0 (Initial Production Release)  
**Status**: ✅ Live and operational

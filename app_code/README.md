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

### Quick Setup

1. **Clone and Setup**:

```bash
git clone <repository-url>
cd tmp-ai-splits
# Run the automated setup script
./setup-dev-environment.sh
```

### Manual Installation

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

## 👨‍💻 Development Workflow & Quality Gates

### Pre-commit Hooks

Our git hooks automatically run before commits to ensure code quality:

- **Code Formatting Check**: Ensures consistent code style with Prettier
- **Linting**: Catches potential issues with ESLint
- **Type Checking**: Validates TypeScript types

### Pre-push Hooks

Before code reaches the remote repository:

- **Tests**: All tests must pass
- **Build Verification**: Code must successfully build

### CI/CD Pipeline

Our GitHub Actions workflow includes multiple stages:

#### 1. Validation Stage (runs on all pushes and PRs)

- ✅ Type checking (`pnpm typecheck`)
- ✅ Code formatting validation (`pnpm format:check`)
- ✅ Linting (`pnpm lint`)
- ✅ Test suite (`pnpm test`)

#### 2. Deployment Stage (runs only on main/develop pushes)

- 🚀 Only deploys if validation passes
- 🏗️ Automated Vercel deployment
- 🔄 Environment-specific configuration

### Available Scripts

```bash
# Development
pnpm dev                 # Start development server
pnpm build              # Build for production
pnpm start              # Start production server

# Quality Assurance
pnpm lint               # Run ESLint
pnpm lint --fix         # Auto-fix linting issues
pnpm typecheck          # Run TypeScript type checking
pnpm format             # Auto-format code with Prettier
pnpm format:check       # Check if code is properly formatted
pnpm test               # Run test suite
pnpm test:watch         # Run tests in watch mode

# Deployment
pnpm deploy             # Deploy to production
pnpm deploy:preview     # Deploy to preview environment
```

### Why This Setup Prevents Deployment Failures

1. **Early Detection**: Issues are caught locally before reaching CI/CD
2. **Automated Validation**: No human error in running checks
3. **Staged Pipeline**: Validation runs before deployment, not during
4. **Clear Feedback**: Developers get immediate feedback on what needs fixing

### Troubleshooting Common Issues

If you encounter deployment failures:

1. **Run locally first**:

   ```bash
   cd app_code
   pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build
   ```

2. **Fix formatting issues**:

   ```bash
   pnpm format
   ```

3. **Fix linting issues**:

   ```bash
   pnpm lint --fix
   ```

4. **If git hooks aren't running**:
   ```bash
   # Re-run setup script
   ./setup-dev-environment.sh
   # Or manually
   cd app_code && pnpm exec husky install
   ```

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

The application is automatically deployed via GitHub Actions with comprehensive quality gates:

### Deployment Flow

1. **Developer pushes code** → Pre-commit hooks run locally
2. **Code reaches GitHub** → Validation pipeline runs (type-check, lint, test)
3. **Validation passes** → Deployment pipeline runs
4. **Successful deployment** → Application updates live

### Branch Strategy

- **`main`**: Production deployments (production URLs)
- **`develop`**: Staging deployments (preview environment)
- **Pull Requests**: Validation only (no deployment)

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

### For New Contributors

1. Run the setup script: `./setup-dev-environment.sh`
2. Make your changes following our quality standards
3. Git hooks will ensure your code meets standards before commit
4. Submit a pull request - our CI will validate everything

## 📄 License

[License information to be added]

---

**Last Updated**: June 2025  
**Version**: 1.0.0 (Initial Production Release)  
**Status**: ✅ Live and operational

# Deployment Guide - LLM Expense Splitting App

## Environment Configuration

### Required Environment Variables

Create a `.env.local` file in the app_code directory with the following variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OpenAI Configuration (for LLM expense parsing)
OPENAI_API_KEY=your_openai_api_key

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Performance Monitoring (optional)
NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING=true
```

### Production Environment Variables (Vercel)

For production deployment on Vercel, configure these environment variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key

# OpenAI Configuration
OPENAI_API_KEY=your_production_openai_api_key

# Application Configuration
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NODE_ENV=production

# Performance Monitoring
NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING=true
```

## Database Setup

### 1. Supabase Project Setup

1. Create a new Supabase project at https://supabase.com
2. Copy the project URL and anon key to your environment variables
3. Run the database migrations:

```bash
cd supabase
supabase db reset
```

### 2. Row Level Security (RLS) Policies

Ensure the following RLS policies are enabled:

- **Groups Table**: Users can only access groups they are members of
- **Group Members Table**: Users can only see members of their groups
- **Expenses Table**: Users can only access expenses from their groups

### 3. Edge Functions Deployment

Deploy the Supabase Edge Functions:

```bash
cd supabase
supabase functions deploy calculate-settlement
supabase functions deploy parse-expense
```

## Performance Optimization

### 1. Database Indexing

Ensure these indexes are created for optimal performance:

```sql
-- Index for group member lookups
CREATE INDEX idx_group_members_user_id ON group_members(user_id);
CREATE INDEX idx_group_members_group_id ON group_members(group_id);

-- Index for expense queries
CREATE INDEX idx_expenses_group_id ON expenses(group_id);
CREATE INDEX idx_expenses_date ON expenses(date_of_expense);
CREATE INDEX idx_expenses_status ON expenses(status);

-- Index for settlement calculations
CREATE INDEX idx_expenses_confirmed ON expenses(group_id, status) WHERE status = 'confirmed';
```

### 2. React Query Caching

The app uses React Query for optimal caching:

- **Stale Time**: 5 minutes for group data
- **Cache Time**: 10 minutes for expense data
- **Background Refetch**: Enabled for real-time updates

### 3. Bundle Optimization

- **Code Splitting**: Implemented for route-based chunks
- **Tree Shaking**: Enabled for unused code elimination
- **Image Optimization**: Next.js automatic optimization

## Deployment Steps

### Local Development

1. Clone the repository
2. Install dependencies:
   ```bash
   cd app_code
   npm install
   ```
3. Set up environment variables in `.env.local`
4. Start the development server:
   ```bash
   npm run dev
   ```

### Production Deployment (Vercel)

1. **Connect Repository**: Link your GitHub repository to Vercel
2. **Configure Environment Variables**: Add all production environment variables
3. **Build Settings**:
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`
4. **Deploy**: Vercel will automatically deploy on push to main branch

### Manual Deployment

If deploying manually:

1. Build the application:
   ```bash
   npm run build
   ```
2. Start the production server:
   ```bash
   npm start
   ```

## Monitoring and Analytics

### Performance Metrics

The app tracks these key metrics:

- **Expense Logging Time**: Target < 30 seconds
- **LLM Correction Rate**: Target < 20%
- **Success Rate**: Target > 90%
- **Settlement Calculation Time**: Target < 5 seconds

### Error Monitoring

Configure error monitoring with:

1. **Sentry** (recommended): Add Sentry DSN to environment variables
2. **Vercel Analytics**: Automatically enabled on Vercel
3. **Custom Logging**: Performance monitor tracks user interactions

### Health Checks

The app includes health check endpoints:

- `/api/health`: Basic application health
- `/api/health/database`: Database connectivity
- `/api/health/openai`: OpenAI API connectivity

## Security Configuration

### 1. CORS Settings

Configure CORS for Supabase Edge Functions:

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://your-app.vercel.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
```

### 2. API Rate Limiting

Implement rate limiting for:

- **OpenAI API**: 10 requests per minute per user
- **Settlement Calculations**: 5 requests per minute per group
- **Database Queries**: Standard Supabase limits

### 3. Data Validation

All user inputs are validated using:

- **Zod Schemas**: Type-safe validation
- **Sanitization**: XSS protection
- **Authorization**: RLS policies

## Troubleshooting

### Common Issues

1. **Build Failures**:

   - Check TypeScript errors: `npm run type-check`
   - Verify environment variables are set
   - Ensure all dependencies are installed

2. **Database Connection Issues**:

   - Verify Supabase URL and keys
   - Check RLS policies are correctly configured
   - Ensure database migrations are applied

3. **OpenAI API Issues**:

   - Verify API key is valid and has credits
   - Check rate limits haven't been exceeded
   - Ensure proper error handling for API failures

4. **Performance Issues**:
   - Check database query performance
   - Monitor bundle size and loading times
   - Verify caching strategies are working

### Support

For deployment support:

1. Check the application logs in Vercel dashboard
2. Monitor Supabase logs for database issues
3. Use the performance monitoring dashboard
4. Review error tracking in Sentry (if configured)

## Success Criteria Validation

Before marking deployment as complete, verify:

- ✅ All environment variables are configured
- ✅ Database migrations are applied
- ✅ Edge functions are deployed and working
- ✅ Performance metrics meet requirements
- ✅ Error monitoring is configured
- ✅ Security policies are in place
- ✅ Health checks are passing

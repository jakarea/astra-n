# Astra E-commerce Dashboard - Deployment Guide

This guide covers deploying the Astra E-commerce Dashboard to Vercel.

## 🚀 Quick Deploy to Vercel

### Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Repository**: Push your code to a GitHub repository
3. **Database**: Set up a Supabase project or PostgreSQL database

### Step 1: Prepare Environment Variables

1. Copy `.env.example` to `.env.local`
2. Fill in all required environment variables:

```bash
# Required variables
DATABASE_URL="your-database-url"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="https://your-app.vercel.app"

# Optional but recommended
NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-key"
```

### Step 2: Deploy to Vercel

#### Option A: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

#### Option B: Deploy via Vercel Dashboard

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Configure project settings:
   - **Framework**: Next.js
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`

### Step 3: Configure Environment Variables in Vercel

1. Go to your project settings in Vercel
2. Navigate to "Environment Variables"
3. Add all variables from your `.env.example` file
4. Set appropriate values for production

### Step 4: Database Setup

#### Using Supabase (Recommended)

1. Create a new project at [supabase.com](https://supabase.com)
2. Run database migrations:

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Push schema
supabase db push
```

#### Using External PostgreSQL

1. Set up your PostgreSQL database
2. Run the schema from `prisma/schema.prisma`:

```bash
npx prisma db push
```

### Step 5: Verify Deployment

1. Visit your deployed app
2. Test login functionality
3. Verify database connections
4. Check all features work correctly

## 🔧 Configuration Options

### Custom Domain

1. Go to your project settings in Vercel
2. Navigate to "Domains"
3. Add your custom domain
4. Update `NEXTAUTH_URL` environment variable

### Performance Optimization

The app is pre-configured with:
- ✅ Next.js optimization
- ✅ Image optimization
- ✅ Bundle analysis (`npm run analyze`)
- ✅ Code splitting
- ✅ CDN caching

### Security Headers

Security headers are configured in:
- `next.config.js`
- `vercel.json`

## 🧪 Testing Deployment

### Local Testing

```bash
# Build for production
npm run build

# Test production build locally
npm start

# Analyze bundle size
npm run analyze
```

### Environment Testing

```bash
# Test with production environment
NODE_ENV=production npm run dev
```

## 🔐 Security Checklist

Before deploying to production:

- [ ] All environment variables are set
- [ ] Database is properly secured
- [ ] CORS is configured correctly
- [ ] CSP headers are in place
- [ ] Rate limiting is enabled
- [ ] HTTPS is enforced
- [ ] Error logging is configured

## 📊 Monitoring

### Analytics

The app supports:
- Vercel Analytics
- Google Analytics
- Custom event tracking

### Error Monitoring

Consider adding:
- Sentry for error tracking
- LogRocket for session replay
- Custom logging endpoints

## 🚨 Troubleshooting

### Common Issues

#### Build Failures

```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

#### Environment Variable Issues

- Ensure all required variables are set
- Check variable names match exactly
- Verify no trailing spaces in values

#### Database Connection Issues

- Verify database URL format
- Check firewall/security group settings
- Ensure database is accessible from Vercel

#### Performance Issues

```bash
# Analyze bundle
npm run analyze

# Check for heavy dependencies
npx bundle-analyzer .next/static/chunks/*.js
```

## 🔄 Continuous Deployment

### GitHub Integration

Vercel automatically deploys when you push to:
- `main` branch → Production
- Other branches → Preview deployments

### Deployment Hooks

You can trigger deployments via webhook:

```bash
curl -X POST "https://api.vercel.com/v1/integrations/deploy/your-hook-id"
```

## 📈 Scaling Considerations

### Database Scaling

- Use connection pooling
- Consider read replicas for analytics
- Monitor query performance

### CDN Configuration

- Images are automatically optimized
- Static assets are cached
- API responses can be cached with appropriate headers

### Edge Functions

For advanced use cases, consider Vercel Edge Functions for:
- Authentication middleware
- Rate limiting
- A/B testing

## 🛡️ Production Best Practices

1. **Monitoring**: Set up proper monitoring and alerting
2. **Backups**: Regular database backups
3. **Updates**: Keep dependencies updated
4. **Security**: Regular security audits
5. **Performance**: Monitor Core Web Vitals

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section
2. Review Vercel deployment logs
3. Check database connectivity
4. Verify environment variables

## 🎯 Post-Deployment Tasks

After successful deployment:

1. [ ] Test all functionality
2. [ ] Set up monitoring
3. [ ] Configure domain and SSL
4. [ ] Set up backups
5. [ ] Document any customizations
6. [ ] Train users on the system

---

**Important**: This deployment guide assumes you're deploying a production-ready application. Ensure all security measures are in place before going live.
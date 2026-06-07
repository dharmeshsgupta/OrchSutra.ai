# OpenRouter Project - Frontend & Backend Integration Guide

Complete setup and integration instructions for running the full OpenRouter stack (Frontend + Backend).

## Project Structure Overview

```
OpenRouter/
├── primary-backend/        # FastAPI backend for main services
│   ├── src/
│   │   ├── main.py            # FastAPI app setup and CORS config
│   │   ├── apps.py            # Router imports
│   │   └── modules/
│   │       ├── apiKeys/       # API Keys management
│   │       ├── auth/          # Authentication
│   │       ├── models/        # Model information
│   │       └── payments/      # Billing and payments
│   └── requirements.txt        # Python dependencies
│
├── api-backend/            # (Optional) Additional API services
│   └── requirements.txt
│
└── dashboard-frontend/     # React + TypeScript + Vite frontend
    ├── src/
    │   ├── pages/            # Page components
    │   ├── components/       # Reusable components
    │   ├── services/         # API client services
    │   ├── context/          # React context
    │   ├── styles/           # CSS stylesheets
    │   └── App.tsx           # Main app with routing
    ├── package.json
    └── .env.local           # Environment configuration
```

## Prerequisites

- **Python 3.8+** (for backend)
- **Node.js 16+** (for frontend)
- **npm or yarn** (for frontend package management)
- **Git** (for version control)
- **Prisma ORM** (if using as database client)

## Backend Setup

### Step 1: Install Backend Dependencies

```bash
cd primary-backend
pip install -r requirements.txt
```

Required packages:
- fastapi
- uvicorn
- python-jose
- passlib
- bcrypt
- prisma
- pydantic
- python-multipart

### Step 2: Configure Environment Variables

Create `.env` file in `primary-backend/`:

```env
# JWT Configuration
JWT_SECRET=your-secret-key-here-change-in-production

# Database Configuration (if using Prisma)
DATABASE_URL=your-database-url

# Server Configuration
PORT=3001
HOST=0.0.0.0
```

### Step 3: Initialize Database (if applicable)

```bash
# Generate Prisma client
prisma generate

# Run migrations
prisma migrate dev --name init
```

### Step 4: Start Backend Server

```bash
cd primary-backend
python src/main.py
```

Or using uvicorn directly:

```bash
uvicorn src.main:app --host 0.0.0.0 --port 3001 --reload
```

**Backend URL**: `http://localhost:3001`

### Backend Verification

Check if backend is running:
```bash
curl http://localhost:3001/docs  # Swagger UI
curl http://localhost:3001/openapi.json  # OpenAPI schema
```

## Frontend Setup

### Step 1: Install Frontend Dependencies

```bash
cd dashboard-frontend
npm install
```

This installs:
- react@^19.2.0
- react-dom@^19.2.0
- react-router-dom@^7.0.0
- axios@^1.6.5
- And dev dependencies

### Step 2: Configure Environment

Create `.env.local` in `dashboard-frontend/`:

```env
VITE_API_URL=http://localhost:3001
```

**Note**: This must match your backend URL!

### Step 3: Start Frontend Development Server

```bash
cd dashboard-frontend
npm run dev
```

**Frontend URL**: `http://localhost:5173`

### Frontend Verification

Open browser and navigate to `http://localhost:5173`
- You should see the login page
- Navigation should work
- Console should show no CORS errors

## Full Stack Integration

### Running Both Servers

**Terminal 1 - Backend:**
```bash
cd primary-backend
python src/main.py
# Output: Uvicorn running on http://0.0.0.0:3001
```

**Terminal 2 - Frontend:**
```bash
cd dashboard-frontend
npm run dev
# Output: Local: http://localhost:5173
```

### Testing the Integration

1. **Login**: Navigate to `http://localhost:5173/login`
   - Use any email/password (demo mode)
   - You should be redirected to dashboard

2. **API Keys Page**: Navigate to `/api-keys`
   - Click "Create New Key"
   - Should see API key creation working
   - Check browser DevTools -> Network tab for API requests

3. **Models Page**: Navigate to `/models`
   - Should load list of models
   - Click on a model to see its providers
   - Check pricing information

4. **Billing Page**: Navigate to `/billing`
   - Click "Add Credits" button
   - Should process onramp successfully

5. **Check API Calls**: Open DevTools
   - Network tab should show requests to `http://localhost:3001`
   - All requests should include auth token
   - Status codes should be 200/201 for success

## API Implementation Checklist

### Required Backend Endpoints

**Authentication** (if not already implemented):
```
POST /auth/login         # Implement login endpoint
POST /auth/register      # (Optional) User registration
POST /auth/logout        # (Optional) Logout
```

**API Keys** (already implemented):
```
✓ POST   /api-keys/              
✓ GET    /api-keys/              
✓ PUT    /api-keys/              
✓ DELETE /api-keys/{id}          
```

**Models** (already implemented):
```
✓ GET /models/                    
✓ GET /models/providers           
✓ GET /models/{id}/providers      
```

**Payments** (already implemented):
```
✓ POST /payments/onramp          
```

### CORS Configuration

Backend (`primary-backend/src/main.py`) already has:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**For production**, change `allow_origins` to your frontend domain.

## Frontend to Backend Communication

### API Service Architecture

```
Frontend Request Flow:
1. Component calls service method
2. Service calls apiClient (axios instance)
3. Axios interceptor adds JWT token from localStorage
4. Request sent to backend API
5. Response received and returned to component
6. Component updates state/UI

Error Handling:
- 401 responses trigger logout and redirect to login
- Other errors are caught and displayed in UI
- All errors logged to browser console
```

### Example: Creating an API Key

**Frontend (ApiKeysPage.tsx)**:
```typescript
const newKey = await ApiKeysService.create('My Key');
setCreatedKey(newKey);
```

**Service Layer (apiKeysService.ts)**:
```typescript
export const ApiKeysService = {
  create: async (name: string) => {
    const response = await apiClient.post('/api-keys/', { name });
    return response.data;
  }
}
```

**Backend (router.py)**:
```python
@router.post("/", response_model=CreateApiKeyResponse)
async def create_api_key(
    body: CreateApiKeySchema,
    user_id: str = Depends(verify_jwt),
):
    result = await ApiKeyService.create_api_key(body.name, int(user_id))
    return CreateApiKeyResponse(**result)
```

## Development Workflow

### Making Changes

**Frontend Changes**:
```bash
# Edit files in src/
# Vite auto-reloads with HMR
# No need to restart server
```

**Backend Changes**:
```bash
# Edit files in src/modules/
# If using --reload flag, server auto-restarts
# May need manual refresh in browser
```

### Building for Production

**Frontend**:
```bash
cd dashboard-frontend
npm run build
# Creates optimized dist/ folder
npm run preview  # Preview production build locally
```

**Backend**:
```bash
# No build step needed, ready as-is
# Deploy using gunicorn/docker for production
```

## Troubleshooting

### CORS Errors

**Error**: `Access to XMLHttpRequest ... has been blocked by CORS policy`

**Solution**:
1. Check backend CORS configuration
2. Verify `allow_origins` includes frontend URL
3. Ensure `withCredentials: true` in axios config
4. Check browser console for exact error details

### 401 Unauthorized Errors

**Error**: `401: Not authenticated` or `Invalid token`

**Solution**:
1. Check JWT token in localStorage (DevTools -> Application)
2. Verify auth endpoint returns valid JWT
3. Check JWT_SECRET matches between requests
4. Ensure token is being sent in Authorization header

### API Endpoint Not Found (404)

**Error**: `404: Not found` on API calls

**Solution**:
1. Verify backend routers are included in main.py
2. Check route paths match frontend service calls
3. Verify backend is running and listening
4. Check for typos in endpoint URLs

### Frontend Won't Start

**Error**: Port already in use or dependency issues

**Solution**:
```bash
# Kill process on port 5173
lsof -ti :5173 | xargs kill -9

# Or clean install
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Backend Won't Start

**Error**: Port already in use or import errors

**Solution**:
```bash
# Kill process on port 3001
lsof -ti :3001 | xargs kill -9

# Check for import errors
python src/main.py

# Install missing dependencies
pip install -r requirements.txt
```

## Environment Variables Reference

### Frontend (.env.local)

```env
# Required
VITE_API_URL=http://localhost:3001

# Optional future additions
# VITE_API_TIMEOUT=5000
# VITE_ENABLE_LOGGING=true
```

### Backend (.env)

```env
# Required
JWT_SECRET=change-this-in-production
DATABASE_URL=postgresql://user:password@localhost/dbname

# Optional
PORT=3001
HOST=0.0.0.0
DEBUG=false
LOG_LEVEL=INFO
```

## Security Considerations

### Development

- ✓ JWT_SECRET is set (even if weak for dev)
- ✓ CORS is restrictive (specific origin)
- ✓ Credentials are required
- ✗ No HTTPS (OK for localhost)

### Production

- [ ] Use strong JWT_SECRET (use environment variable)
- [ ] Change CORS allow_origins to production domain
- [ ] Enable HTTPS
- [ ] Set secure cookie flags
- [ ] Implement rate limiting
- [ ] Add API key rotation
- [ ] Use environment variables for secrets
- [ ] Add request validation
- [ ] Implement audit logging
- [ ] Add two-factor authentication

## Performance Tips

### Frontend
- Use React DevTools Profiler to find slow components
- Check network waterfall in DevTools
- Lazy load components with React.lazy
- Implement React.memo for expensive renders
- Cache API responses with TanStack Query

### Backend
- Use async/await properly
- Implement database connection pooling
- Add request caching with Redis
- Monitor query performance
- Use middleware for logging/timing

## Deployment

### Frontend Deployment

**Vercel**:
```bash
npm install -g vercel
vercel
# Configure VITE_API_URL for production
```

**Netlify**:
```bash
npm run build
# Deploy dist/ folder
# Set environment variables in Netlify dashboard
```

**Docker**:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

### Backend Deployment

**Docker**:
```dockerfile
FROM python:3.10-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "3001"]
```

**Heroku/Railway**:
```bash
git push heroku main
# Set environment variables in dashboard
```

## Monitoring & Logging

### Frontend
- Browser console errors
- Network requests in DevTools
- localStorage for debugging
- Error boundary for crash reports

### Backend
- Uvicorn console output
- Application logs file
- Database query logs
- Sentry for error tracking

## Getting Help

1. **Documentation**
   - Frontend: `FRONTEND_README.md`
   - Backend: Swagger UI at `http://localhost:3001/docs`

2. **Debugging**
   - Check browser console (frontend)
   - Check terminal output (backend)
   - Use DevTools Network tab
   - Check Database logs

3. **Common Issues**
   - See Troubleshooting section above
   - Check GitHub issues
   - Review API documentation

## Next Steps

1. ✅ Complete backend implementation
2. ✅ Set up frontend
3. ✅ Verify integration works
4. 📝 Implement additional features
5. 🧪 Add automated tests
6. 📊 Set up monitoring
7. 🚀 Deploy to production

---

For detailed frontend documentation, see `FRONTEND_README.md`
For API documentation, visit `http://localhost:3001/docs` when backend is running

# OpenRouter Dashboard Frontend

A modern React + TypeScript + Vite frontend application for managing OpenRouter API keys, models, and billing.

## Features

- 🔐 **Authentication**: JWT-based authentication with login page
- 🔑 **API Key Management**: Create, view, update, and delete API keys
- 📊 **Model Browser**: Browse available AI models from different providers
- 💳 **Billing Management**: View credits and process onramp transactions
- 📱 **Responsive Design**: Fully responsive UI that works on all devices
- ⚡ **Fast Development**: Vite-based development server with HMR

## Tech Stack

- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **React Router v7** - Client-side routing
- **Axios** - HTTP client
- **CSS3** - Modern styling with flexbox and grid

## Quick Start

### Prerequisites

- Node.js 16+ and npm/yarn installed

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Create environment file**:
   ```bash
   cp .env.example .env.local
   ```
   Configure `VITE_API_URL=http://localhost:3001`

3. **Start development server**:
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:5173`

## Project Structure

```
src/
├── components/          # Reusable React components
│   └── Navigation.tsx   # Main navigation bar
├── context/            # React Context for state management
│   └── AuthContext.tsx # Authentication context
├── pages/              # Page components
│   ├── Dashboard.tsx       # Dashboard/home page
│   ├── ApiKeysPage.tsx     # API keys management
│   ├── ModelsPage.tsx      # Models browser
│   └── PaymentsPage.tsx    # Billing and payments
├── services/           # API client services
│   ├── apiClient.ts         # Axios instance with interceptors
│   ├── apiKeysService.ts    # API keys endpoints
│   ├── modelsService.ts     # Models endpoints
│   └── paymentsService.ts   # Payments endpoints
├── styles/             # CSS files
│   ├── Navigation.css
│   ├── ApiKeys.css
│   ├── Models.css
│   ├── Payments.css
│   └── Dashboard.css
├── App.tsx             # Main app component with routing
├── App.css             # Global styles
└── main.tsx           # React entry point
```

## Available Scripts

- `npm run dev` - Start development server with HMR
- `npm run build` - Build for production (TypeScript check + Vite build)
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build locally

## Pages & Features

### 1. **Dashboard** (`/`)
- Welcome page with feature overview
- Quick start guide
- Navigation to all features

### 2. **API Keys** (`/api-keys`)
- View all API keys
- Create new API keys
- Enable/disable API keys
- Delete API keys
- View credit consumption and last usage

### 3. **Models** (`/models`)
- Browse all available AI models
- View model details and company info
- Check providers for each model
- View pricing (input/output token costs)
- Access provider websites

### 4. **Billing** (`/billing`)
- View current credits
- Purchase credits (onramp)
- View pricing for different models
- Track credit usage

## API Integration Details

The frontend communicates with FastAPI backend at `http://localhost:3001`.

### API Endpoints

All endpoints require JWT authentication via auth cookie.

#### API Keys Module
```
POST   /api-keys/              # Create new API key
GET    /api-keys/              # Get all API keys
PUT    /api-keys/              # Update API key (enable/disable)
DELETE /api-keys/{id}          # Delete API key
```

#### Models Module
```
GET /models/                    # Get all models
GET /models/providers           # Get all providers
GET /models/{id}/providers      # Get providers for model
```

#### Payments Module
```
POST /payments/onramp          # Process credit onramp
```

## Authentication Flow

### Login Process

1. User navigates to `/login`
2. Enters email and password credentials
3. Frontend sends request to backend auth endpoint
4. Backend validates and returns JWT token
5. Token stored in `localStorage` with key `authToken`
6. User redirected to dashboard
7. All subsequent API requests include JWT token

### Protected Routes

Routes are protected using `ProtectedRoute` component that checks `useAuth()` context.
If user is not authenticated, they're redirected to `/login`.

### Token Management

- **Storage**: JWT stored in `localStorage` as `authToken`
- **Transmission**: Included in request headers via axios interceptor
- **Expiration**: 401 responses clear token and redirect to login
- **User ID**: Also stored in localStorage for quick reference

## Service Layer Usage

### API Keys Service

```typescript
import { ApiKeysService } from './services/apiKeysService';

// Create new API key
const result = await ApiKeysService.create('My Key');
// Returns: { id: string, apiKey: string }

// Get all API keys for user
const keys = await ApiKeysService.getAll();
// Returns: ApiKey[]

// Update API key (enable/disable)
await ApiKeysService.update(keyId, true);
// Returns: { message: string }

// Delete API key
await ApiKeysService.delete(keyId);
// Returns: { message: string }
```

### Models Service

```typescript
import { ModelsService } from './services/modelsService';

// Get all available models
const models = await ModelsService.getModels();
// Returns: Model[]

// Get all providers
const providers = await ModelsService.getProviders();
// Returns: Provider[]

// Get providers for a specific model
const modelProviders = await ModelsService.getModelProviders('model-id');
// Returns: ModelProvider[]
```

### Payments Service

```typescript
import { PaymentsService } from './services/paymentsService';

// Process onramp (add credits)
const result = await PaymentsService.onramp();
// Returns: { message: 'Onramp successful', credits: number }
```

## Authentication Context

### useAuth Hook

```typescript
import { useAuth } from './context/AuthContext';

function MyComponent() {
  const { user, isAuthenticated, isLoading, login, logout } = useAuth();

  if (isLoading) return <div>Loading...</div>;

  return (
    <>
      {isAuthenticated ? (
        <>
          <p>Welcome, {user?.userId}</p>
          <button onClick={logout}>Logout</button>
        </>
      ) : (
        <p>Please log in</p>
      )}
    </>
  );
}
```

## Environment Configuration

### Environment Variables

Create `.env.local` in the root directory:

```env
# API endpoint (required)
VITE_API_URL=http://localhost:3001

# Add other variables as needed
```

**Note**: All environment variables must be prefixed with `VITE_` to be accessible in the frontend code.

### Accessing Environment Variables

```typescript
const apiUrl = import.meta.env.VITE_API_URL;
```

## Frontend Styling

### Design System

- **Primary Color**: Purple gradient (#667eea → #764ba2)
- **Accent Color**: Light purple (#e8eaf6)
- **Text Colors**: Dark (#333), Medium (#666), Light (#999)
- **Border Radius**: 6-8px
- **Spacing Unit**: 1rem (16px)

### CSS Organization

- **Navigation.css** - Navigation bar styling
- **Dashboard.css** - Dashboard page styling
- **ApiKeys.css** - API keys page and button styles
- **Models.css** - Models page and cards
- **Payments.css** - Billing page and credit display
- **App.css** - Global styles, forms, alerts, responsive

### Responsive Breakpoints

- **Desktop**: 1400px max-width containers
- **Tablet**: 768px media query
- **Mobile**: 480px media query

## Building for Production

### Build Configuration

```bash
npm run build
```

This command:
1. Runs TypeScript compiler check (`tsc -b`)
2. Builds optimized production bundle with Vite
3. Output in `dist/` directory

### Production Build Tips

- TypeScript checking happens before build
- Vite tree-shakes unused code
- CSS is minified and bundled
- Assets are optimized

### Deployment

The `dist/` folder is production-ready and can be:
- Deployed to static hosting (Vercel, Netlify, GitHub Pages)
- Served by web server (Nginx, Apache)
- Containerized with Docker

## Backend Integration Checklist

- [ ] Backend running on `http://localhost:3001`
- [ ] CORS configured in backend for `http://localhost:3001`
- [ ] JWT authentication endpoint implemented
- [ ] API endpoints return correct response schemas
- [ ] Auth token properly set in response cookies
- [ ] All 4 modules integrated (auth, apiKeys, models, payments)

## Error Handling

### API Error Handling

- Axios interceptors handle 401 unauthorized (redirect to login)
- Try-catch blocks in service calls
- User-friendly error messages displayed
- Console logging for debugging

### Component Error States

- Loading states during async operations
- Error messages displayed in alerts
- Disabled buttons during loading
- Empty states for no data

## Performance Optimization

### Implemented Optimizations

- Code splitting via React Router
- Lazy loading of page components
- Axios request/response interceptors
- CSS minification in production
- Asset optimization via Vite

### Recommended Optimizations

- Implement React.memo for expensive components
- Add virtualization for large lists
- Cache API responses with TanStack Query
- Add Service Worker for offline support
- Implement component-level code splitting

## Development Workflow

### Adding a New Page

1. Create component in `src/pages/NewPage.tsx`
2. Create styles in `src/styles/NewPage.css`
3. Add route in `App.tsx`
4. Add navigation link in `Navigation.tsx`
5. Import styles in component

### Adding a New API Service

1. Create service file in `src/services/newService.ts`
2. Define TypeScript interfaces for requests/responses
3. Implement methods using `apiClient`
4. Export service object
5. Use in components via service imports

### Adding New Context

1. Create context file in `src/context/NewContext.tsx`
2. Define context type and initial value
3. Create provider component
4. Export custom hook using `useContext`
5. Wrap app or subtree with provider

## Troubleshooting

### CORS Errors
- Verify backend has CORS middleware configured
- Check `VITE_API_URL` matches backend origin
- Ensure credentials: 'include' in axios config

### 401 Unauthorized
- Check JWT token in localStorage
- Verify token hasn't expired
- Confirm auth endpoint returns valid JWT
- Check backend JWT secret matches

### API Connection Errors
- Verify backend server is running
- Check network tab in DevTools
- Try `http://localhost:3001` directly
- Check firewall/proxy settings

### Vite Build Errors
- Clear `dist/` and `node_modules/`
- Run `npm install` again
- Check for circular dependencies
- Look for ESLint errors with `npm run lint`

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (latest versions)

## Future Enhancements

- [ ] User profile and settings page
- [ ] Bell icon notifications
- [ ] Dashboard with usage charts
- [ ] API key usage analytics
- [ ] Webhook management
- [ ] Dark mode support
- [ ] Unit and integration tests
- [ ] Storybook for components
- [ ] E2E tests with Cypress
- [ ] Multi-language support (i18n)

## Contributing

1. Create feature branch
2. Make changes
3. Run linter: `npm run lint`
4. Build: `npm run build`
5. Submit pull request

## License

MIT License - See LICENSE file for details

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review API documentation
3. Check browser console for errors
4. Look at network requests in DevTools

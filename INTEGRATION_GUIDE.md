# Integration Guide - Adding Supabase to Year Wheel

## Overview
This guide shows you how to integrate Supabase authentication and database storage into your existing Year Wheel application.

## Prerequisites
- ✅ Completed SUPABASE_SETUP.md
- ✅ Supabase project created
- ✅ Database migrations run
- ✅ `.env` file configured
- ✅ `@supabase/supabase-js` installed

## File Structure

```
src/
├── lib/
│   └── supabase.js              # ✅ Created - Supabase client
├── services/
│   └── wheelService.js          # ✅ Created - Database operations
├── hooks/
│   └── useAuth.js              # 📋 To create - Authentication hook
├── components/
│   ├── auth/
│   │   ├── LoginForm.jsx       # 📋 To create
│   │   ├── SignupForm.jsx      # 📋 To create
│   │   └── AuthPage.jsx        # 📋 To create
│   └── dashboard/
│       ├── Dashboard.jsx        # 📋 To create
│       └── WheelCard.jsx        # 📋 To create
└── App.jsx                      # 📋 To modify
```

## Step 1: Create Authentication Hook

Create `src/hooks/useAuth.js`:

```javascript
import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for changes on auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Sign up with email and password
  const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  // Sign in with email and password
  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  // Sign out
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const value = {
    signUp,
    signIn,
    signOut,
    user,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

## Step 2: Create Authentication UI Components

### 2.1 Create Login Form

Create `src/components/auth/LoginForm.jsx`:

```javascript
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

function LoginForm({ onToggleMode }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white shadow-md rounded-lg px-8 pt-6 pb-8 mb-4">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-900">
          Logga in
        </h2>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
              E-post
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
              Lösenord
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Loggar in...' : 'Logga in'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={onToggleMode}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            Inget konto? Registrera dig
          </button>
        </div>
      </div>
    </div>
  );
}

export default LoginForm;
```

### 2.2 Create Signup Form

Create `src/components/auth/SignupForm.jsx`:

```javascript
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

function SignupForm({ onToggleMode }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { signUp } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setSuccess(false);

    if (password !== confirmPassword) {
      setError('Lösenorden matchar inte');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Lösenordet måste vara minst 6 tecken');
      setLoading(false);
      return;
    }

    try {
      await signUp(email, password);
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white shadow-md rounded-lg px-8 pt-6 pb-8 mb-4">
          <h2 className="text-2xl font-bold mb-6 text-center text-gray-900">
            Konto skapat!
          </h2>
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            Ditt konto har skapats. Du kan nu logga in.
          </div>
          <button
            onClick={onToggleMode}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Gå till inloggning
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white shadow-md rounded-lg px-8 pt-6 pb-8 mb-4">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-900">
          Skapa konto
        </h2>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
              E-post
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
              Lösenord
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              minLength={6}
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="confirmPassword">
              Bekräfta lösenord
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Skapar konto...' : 'Skapa konto'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={onToggleMode}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            Har du redan ett konto? Logga in
          </button>
        </div>
      </div>
    </div>
  );
}

export default SignupForm;
```

### 2.3 Create Auth Page

Create `src/components/auth/AuthPage.jsx`:

```javascript
import { useState } from 'react';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';

function AuthPage() {
  const [mode, setMode] = useState('login'); // 'login' or 'signup'

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            YearWheel
          </h1>
          <p className="text-gray-600">
            Visualisera ditt år i ett cirkulärt format
          </p>
        </div>

        {mode === 'login' ? (
          <LoginForm onToggleMode={() => setMode('signup')} />
        ) : (
          <SignupForm onToggleMode={() => setMode('login')} />
        )}
      </div>
    </div>
  );
}

export default AuthPage;
```

## Step 3: Update App.jsx

Replace your current `App.jsx` with this structure:

```javascript
import { useAuth, AuthProvider } from './hooks/useAuth';
import AuthPage from './components/auth/AuthPage';
import Dashboard from './components/dashboard/Dashboard';
// ... other imports

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-gray-600">Laddar...</div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return <Dashboard />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
```

## Step 4: Create Dashboard Component

Create `src/components/dashboard/Dashboard.jsx`:

```javascript
import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { fetchUserWheels, createWheel, deleteWheel } from '../../services/wheelService';
import WheelCard from './WheelCard';

function Dashboard() {
  const { user, signOut } = useAuth();
  const [wheels, setWheels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWheel, setSelectedWheel] = useState(null);

  useEffect(() => {
    loadWheels();
  }, []);

  const loadWheels = async () => {
    try {
      const data = await fetchUserWheels();
      setWheels(data);
    } catch (error) {
      console.error('Error loading wheels:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWheel = async () => {
    try {
      const newWheelId = await createWheel({
        title: 'Nytt hjul',
        year: new Date().getFullYear(),
      });
      loadWheels();
    } catch (error) {
      console.error('Error creating wheel:', error);
    }
  };

  const handleDeleteWheel = async (wheelId) => {
    if (!confirm('Är du säker på att du vill radera detta hjul?')) return;
    
    try {
      await deleteWheel(wheelId);
      loadWheels();
    } catch (error) {
      console.error('Error deleting wheel:', error);
    }
  };

  if (loading) {
    return <div className="p-8">Laddar hjul...</div>;
  }

  // If a wheel is selected, show the editor
  if (selectedWheel) {
    // Import and render your existing YearWheel editor here
    return <div>Editor for wheel {selectedWheel}</div>;
  }

  // Show dashboard with wheel list
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Mina hjul</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user?.email}</span>
            <button
              onClick={signOut}
              className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
            >
              Logga ut
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <button
            onClick={handleCreateWheel}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            + Skapa nytt hjul
          </button>
        </div>

        {wheels.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">Du har inga hjul ännu</p>
            <button
              onClick={handleCreateWheel}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Skapa ditt första hjul
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {wheels.map((wheel) => (
              <WheelCard
                key={wheel.id}
                wheel={wheel}
                onSelect={() => setSelectedWheel(wheel.id)}
                onDelete={() => handleDeleteWheel(wheel.id)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default Dashboard;
```

## Step 5: Create Wheel Card Component

Create `src/components/dashboard/WheelCard.jsx`:

```javascript
import { Trash2, ExternalLink } from 'lucide-react';

function WheelCard({ wheel, onSelect, onDelete }) {
  const formattedDate = new Date(wheel.updated_at).toLocaleDateString('sv-SE');

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow overflow-hidden">
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {wheel.title}
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          År: {wheel.year}
        </p>
        <p className="text-xs text-gray-500">
          Senast ändrad: {formattedDate}
        </p>
      </div>
      <div className="bg-gray-50 px-6 py-3 flex justify-between items-center">
        <button
          onClick={onSelect}
          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          <ExternalLink size={16} />
          Öppna
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="text-sm text-red-600 hover:text-red-800"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

export default WheelCard;
```

## Step 6: Test the Integration

1. Start your development server:
```bash
npm run dev
```

2. You should see the login/signup page

3. Create a new account with email/password

4. After signup, log in

5. You should see the dashboard

6. Create a new wheel and verify it appears

## Next Steps

1. ✅ Authentication working
2. ✅ Dashboard showing wheels
3. 📋 Integrate wheel editor with Dashboard
4. 📋 Add auto-save functionality
5. 📋 Add sharing features
6. 📋 Add export/import from database

## Troubleshooting

### Issue: "Invalid login credentials"
**Check**: Make sure email confirmations are disabled in Supabase Auth settings during development

### Issue: "Failed to fetch"
**Check**: Your `.env` file has correct VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

### Issue: User can't see their wheels
**Check**: RLS policies are correctly set up in database

---

**Integration Guide Version**: 1.0  
**Last Updated**: October 8, 2025

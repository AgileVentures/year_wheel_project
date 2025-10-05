# Supabase Implementation Guide

## Quick Start Checklist

### 1. Create Supabase Project
- [ ] Go to https://supabase.com
- [ ] Create new project
- [ ] Note down:
  - Project URL
  - Anon/Public API Key
  - Service Role Key (keep secret!)

### 2. Environment Setup

Create `.env` file in project root:
```env
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Add to `.gitignore`:
```
.env
.env.local
```

### 3. Install Dependencies

```bash
npm install @supabase/supabase-js
npm install @supabase/auth-ui-react @supabase/auth-ui-shared
```

### 4. Run Database Migrations

In Supabase Dashboard → SQL Editor, run these in order:

#### Migration 1: Create year_wheels table
```sql
-- Create year_wheels table
create table year_wheels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  year integer not null check (year >= 1900 and year <= 2100),
  colors jsonb not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  is_public boolean default false,
  share_token text unique
);

-- Enable RLS
alter table year_wheels enable row level security;

-- Policies
create policy "Users can view their own or public wheels"
  on year_wheels for select
  using (auth.uid() = user_id or is_public = true);

create policy "Users can create their own wheels"
  on year_wheels for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own wheels"
  on year_wheels for update
  using (auth.uid() = user_id);

create policy "Users can delete their own wheels"
  on year_wheels for delete
  using (auth.uid() = user_id);

-- Indexes
create index idx_year_wheels_user_id on year_wheels(user_id);
create index idx_year_wheels_share_token on year_wheels(share_token);

-- Function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_year_wheels_updated_at
  before update on year_wheels
  for each row
  execute function update_updated_at_column();
```

#### Migration 2: Create wheel_rings table
```sql
-- Create wheel_rings table
create table wheel_rings (
  id uuid primary key default gen_random_uuid(),
  wheel_id uuid references year_wheels(id) on delete cascade not null,
  ring_order integer not null check (ring_order >= 0),
  orientation text check (orientation in ('vertical', 'horizontal')) not null,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table wheel_rings enable row level security;

-- Policies
create policy "Users can view rings of accessible wheels"
  on wheel_rings for select
  using (
    exists (
      select 1 from year_wheels 
      where id = wheel_rings.wheel_id 
      and (user_id = auth.uid() or is_public = true)
    )
  );

create policy "Users can manage rings of their wheels"
  on wheel_rings for all
  using (
    exists (
      select 1 from year_wheels 
      where id = wheel_rings.wheel_id 
      and user_id = auth.uid()
    )
  );

-- Indexes
create index idx_wheel_rings_wheel_id on wheel_rings(wheel_id);
create index idx_wheel_rings_order on wheel_rings(wheel_id, ring_order);
```

#### Migration 3: Create ring_data table
```sql
-- Create ring_data table
create table ring_data (
  id uuid primary key default gen_random_uuid(),
  ring_id uuid references wheel_rings(id) on delete cascade not null,
  month_index integer check (month_index >= 0 and month_index < 12) not null,
  content text[] not null default '{}',
  created_at timestamp with time zone default now(),
  
  unique(ring_id, month_index)
);

-- Enable RLS
alter table ring_data enable row level security;

-- Policies
create policy "Users can view data of accessible wheels"
  on ring_data for select
  using (
    exists (
      select 1 from wheel_rings wr
      join year_wheels yw on yw.id = wr.wheel_id
      where wr.id = ring_data.ring_id 
      and (yw.user_id = auth.uid() or yw.is_public = true)
    )
  );

create policy "Users can manage data of their wheels"
  on ring_data for all
  using (
    exists (
      select 1 from wheel_rings wr
      join year_wheels yw on yw.id = wr.wheel_id
      where wr.id = ring_data.ring_id 
      and yw.user_id = auth.uid()
    )
  );

-- Indexes
create index idx_ring_data_ring_id on ring_data(ring_id);
```

#### Migration 4: Helper functions
```sql
-- Function to generate unique share token
create or replace function generate_share_token()
returns text as $$
declare
  token text;
  done bool;
begin
  done := false;
  while not done loop
    token := encode(gen_random_bytes(16), 'base64');
    token := replace(token, '/', '_');
    token := replace(token, '+', '-');
    done := not exists(select 1 from year_wheels where share_token = token);
  end loop;
  return token;
end;
$$ language plpgsql;

-- Function to get full wheel data
create or replace function get_wheel_full_data(wheel_id_param uuid)
returns json as $$
declare
  result json;
begin
  select json_build_object(
    'wheel', row_to_json(yw.*),
    'rings', (
      select json_agg(
        json_build_object(
          'id', wr.id,
          'ring_order', wr.ring_order,
          'orientation', wr.orientation,
          'data', (
            select json_agg(
              json_build_object(
                'month_index', rd.month_index,
                'content', rd.content
              ) order by rd.month_index
            )
            from ring_data rd
            where rd.ring_id = wr.id
          )
        ) order by wr.ring_order
      )
      from wheel_rings wr
      where wr.wheel_id = yw.id
    )
  ) into result
  from year_wheels yw
  where yw.id = wheel_id_param;
  
  return result;
end;
$$ language plpgsql security definer;
```

### 5. Create Supabase Client

Create `src/services/supabase.js`:
```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### 6. Create Auth Hook

Create `src/hooks/useAuth.js`:
```javascript
import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '../services/supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active sessions
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { data, error };
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });
    return { data, error };
  };

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
    signInWithGoogle,
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

### 7. Create Wheel Service

Create `src/services/wheelService.js`:
```javascript
import { supabase } from './supabase';

export const wheelService = {
  // Get all wheels for current user
  async getUserWheels() {
    const { data, error } = await supabase
      .from('year_wheels')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Get single wheel with full data
  async getWheel(wheelId) {
    const { data, error } = await supabase.rpc('get_wheel_full_data', {
      wheel_id_param: wheelId,
    });

    if (error) throw error;
    return data;
  },

  // Create new wheel
  async createWheel(wheelData) {
    const { title, year, colors } = wheelData;
    
    // Insert wheel
    const { data: wheel, error: wheelError } = await supabase
      .from('year_wheels')
      .insert([{ title, year, colors }])
      .select()
      .single();

    if (wheelError) throw wheelError;

    return wheel;
  },

  // Update wheel
  async updateWheel(wheelId, updates) {
    const { data, error } = await supabase
      .from('year_wheels')
      .update(updates)
      .eq('id', wheelId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete wheel
  async deleteWheel(wheelId) {
    const { error } = await supabase
      .from('year_wheels')
      .delete()
      .eq('id', wheelId);

    if (error) throw error;
  },

  // Save rings data
  async saveRings(wheelId, ringsData) {
    // Delete existing rings
    await supabase
      .from('wheel_rings')
      .delete()
      .eq('wheel_id', wheelId);

    // Insert new rings
    for (let i = 0; i < ringsData.length; i++) {
      const ring = ringsData[i];
      
      const { data: ringRecord, error: ringError } = await supabase
        .from('wheel_rings')
        .insert([{
          wheel_id: wheelId,
          ring_order: i,
          orientation: ring.orientation,
        }])
        .select()
        .single();

      if (ringError) throw ringError;

      // Insert ring data for each month
      const ringDataRecords = ring.data.map((content, monthIndex) => ({
        ring_id: ringRecord.id,
        month_index: monthIndex,
        content: Array.isArray(content) ? content : [content],
      }));

      const { error: dataError } = await supabase
        .from('ring_data')
        .insert(ringDataRecords);

      if (dataError) throw dataError;
    }
  },

  // Generate share token
  async generateShareToken(wheelId) {
    const { data, error } = await supabase.rpc('generate_share_token');
    if (error) throw error;

    const token = data;
    
    const { error: updateError } = await supabase
      .from('year_wheels')
      .update({ share_token: token, is_public: true })
      .eq('id', wheelId);

    if (updateError) throw updateError;

    return token;
  },

  // Get wheel by share token
  async getWheelByShareToken(token) {
    const { data, error } = await supabase
      .from('year_wheels')
      .select('id')
      .eq('share_token', token)
      .eq('is_public', true)
      .single();

    if (error) throw error;
    
    return this.getWheel(data.id);
  },
};
```

### 8. Update App.jsx

Wrap your app with AuthProvider in `src/main.jsx`:
```javascript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './hooks/useAuth';
import './style.scss';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
```

### 9. Create Auth Components

Create `src/components/auth/LoginForm.jsx`:
```javascript
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

function LoginForm({ onToggleMode }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signInWithGoogle } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await signIn(email, password);
    
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="auth-form">
      <h2>Sign In</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <div className="error">{error}</div>}
        <button type="submit" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
      
      <div className="divider">OR</div>
      
      <button onClick={handleGoogleSignIn} disabled={loading}>
        Sign in with Google
      </button>
      
      <p>
        Don't have an account?{' '}
        <button onClick={onToggleMode}>Sign Up</button>
      </p>
    </div>
  );
}

export default LoginForm;
```

### 10. Create Dashboard Component

Create `src/components/dashboard/Dashboard.jsx`:
```javascript
import { useState, useEffect } from 'react';
import { wheelService } from '../../services/wheelService';
import { useAuth } from '../../hooks/useAuth';

function Dashboard({ onSelectWheel, onCreateWheel }) {
  const [wheels, setWheels] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, signOut } = useAuth();

  useEffect(() => {
    loadWheels();
  }, []);

  const loadWheels = async () => {
    try {
      const data = await wheelService.getUserWheels();
      setWheels(data);
    } catch (error) {
      console.error('Error loading wheels:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (wheelId) => {
    if (!confirm('Are you sure you want to delete this wheel?')) return;
    
    try {
      await wheelService.deleteWheel(wheelId);
      setWheels(wheels.filter(w => w.id !== wheelId));
    } catch (error) {
      console.error('Error deleting wheel:', error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="dashboard">
      <header>
        <h1>My Year Wheels</h1>
        <div>
          <span>{user?.email}</span>
          <button onClick={signOut}>Sign Out</button>
        </div>
      </header>

      <button className="create-button" onClick={onCreateWheel}>
        + Create New Wheel
      </button>

      <div className="wheel-grid">
        {wheels.map(wheel => (
          <div key={wheel.id} className="wheel-card">
            <h3>{wheel.title || 'Untitled'}</h3>
            <p>Year: {wheel.year}</p>
            <p>Updated: {new Date(wheel.updated_at).toLocaleDateString()}</p>
            <div className="card-actions">
              <button onClick={() => onSelectWheel(wheel.id)}>Open</button>
              <button onClick={() => handleDelete(wheel.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;
```

### 11. Testing

1. **Test Authentication**:
   - Sign up with email
   - Sign in with email
   - Sign in with Google (requires OAuth setup in Supabase)
   - Sign out

2. **Test CRUD Operations**:
   - Create a new wheel
   - Update wheel title/year/colors
   - Save rings data
   - Delete wheel

3. **Test Sharing**:
   - Generate share link
   - Open share link in incognito window
   - Verify public access

### 12. Enable OAuth Providers (Optional)

In Supabase Dashboard → Authentication → Providers:

1. **Google**:
   - Enable Google provider
   - Get credentials from Google Cloud Console
   - Add redirect URL: `https://your-project.supabase.co/auth/v1/callback`

2. **GitHub**:
   - Enable GitHub provider
   - Create OAuth app in GitHub
   - Add redirect URL

## Common Issues & Solutions

### Issue: "User already registered"
**Solution**: User tried to sign up with existing email. Direct them to sign in.

### Issue: "Invalid API key"
**Solution**: Check that environment variables are correctly set and app is restarted.

### Issue: "Row Level Security" error
**Solution**: Ensure RLS policies are created and user is authenticated.

### Issue: Week numbers not displaying
**Solution**: Verify `generateWeeks()` fix was applied correctly.

## Next Steps After Setup

1. Implement auto-save functionality
2. Add loading states and error handling
3. Create share dialog UI
4. Add export functionality improvements
5. Implement undo/redo
6. Add mobile responsive design
7. Create user onboarding flow

---

**Need Help?**
- Supabase Docs: https://supabase.com/docs
- Discord: https://discord.supabase.com
- GitHub Issues: File issues in your repo

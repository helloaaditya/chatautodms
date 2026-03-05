import React, { ReactNode } from 'react';
import { useNavigate, NavLink, Link, useLocation } from 'react-router-dom';
import { supabase } from '../../api/supabase';
import { 
  LayoutDashboard, 
  Settings, 
  MessageSquare, 
  BarChart, 
  Users, 
  CreditCard, 
  Instagram,
  LogOut,
  ChevronRight,
  Sun,
  Moon,
  HelpCircle
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

const sidebarLinks = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Instagram Accounts', path: '/connect', icon: Instagram },
  { name: 'Automations', path: '/automations', icon: MessageSquare },
  { name: 'Leads', path: '/leads', icon: Users },
  { name: 'Analytics', path: '/analytics', icon: BarChart },
  { name: 'Billing', path: '/billing', icon: CreditCard },
  { name: 'Settings', path: '/settings', icon: Settings },
];

const THEME_KEY = 'chatautodms-theme';

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = React.useState<any>(null);
  const [dark, setDark] = React.useState(() => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'dark') return true;
    if (stored === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const isFlowSetup = location.pathname.startsWith('/automations/new');

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  React.useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [dark]);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem(THEME_KEY, 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem(THEME_KEY, 'light');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <MessageSquare className="text-white" size={20} />
            </div>
            <span className="text-xl font-bold tracking-tight">ChatAutoDMs</span>
          </Link>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {sidebarLinks.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                ${isActive 
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium' 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'}
              `}
            >
              <link.icon size={20} />
              <span>{link.name}</span>
            </NavLink>
          ))}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl cursor-pointer transition-colors group">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center overflow-hidden">
               {user?.user_metadata?.avatar_url ? (
                 <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
               ) : (
                 <Users className="text-blue-600 dark:text-blue-400" size={24} />
               )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{user?.user_metadata?.full_name || 'User'}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
            <ChevronRight size={16} className="text-gray-400 group-hover:text-gray-600" />
          </div>
          <button 
            onClick={handleLogout}
            className="mt-2 w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors font-semibold"
          >
            <LogOut size={20} />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto scroll-smooth">
        <header className="h-16 border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between px-8">
          <h1 className="text-lg font-semibold">Dashboard</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleDark}
              className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 transition-colors"
              title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {dark ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-gray-600 dark:text-gray-300" />}
            </button>
            <NavLink
              to="/settings"
              className={({ isActive }) => `p-2.5 rounded-xl border transition-colors ${isActive ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400' : 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'}`}
              title="Settings"
            >
              <Settings size={18} />
            </NavLink>
            <NavLink
              to="/connect"
              className={({ isActive }) => `p-2.5 rounded-xl border transition-colors ${isActive ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'} text-gray-700 dark:text-gray-300`}
              title="Instagram Accounts"
            >
              <Instagram size={18} className="text-pink-500" />
            </NavLink>
            <button
              type="button"
              className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
              title="Help"
              aria-label="Help"
            >
              <HelpCircle size={18} />
            </button>
          </div>
        </header>
        <div className={isFlowSetup ? 'min-h-full' : 'p-8 max-w-7xl mx-auto'}>
          {children}
        </div>
      </main>
    </div>
  );
};

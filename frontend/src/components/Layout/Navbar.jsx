import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { 
  Home, Users, BookOpen, BarChart3, User, Settings, LogOut, 
  ChevronLeft, ChevronRight, Menu
} from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '../ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Read initial collapsed state from localStorage
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });

  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', isCollapsed);
  }, [isCollapsed]);

  const handleLogout = async () => {
    await logout();
    navigate('/auth/login');
  };

  const isActive = (path) => {
    if (path === '/profile?tab=analytics') {
      return location.pathname === '/profile' && location.search.includes('tab=analytics');
    }
    if (path === '/profile?tab=settings') {
      return location.pathname === '/profile' && location.search.includes('tab=settings');
    }
    if (path === '/profile') {
      return location.pathname === '/profile' && !location.search.includes('tab=');
    }
    return location.pathname === path;
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: Home },
    { label: 'Study Room', path: '/dashboard', icon: BookOpen, subText: 'Rooms' },
    { label: 'Friends', path: '/friends', icon: Users },
    { label: 'Analytics', path: '/profile?tab=analytics', icon: BarChart3 },
    { label: 'Profile', path: '/profile', icon: User },
    { label: 'Settings', path: '/profile?tab=settings', icon: Settings },
  ];

  if (!user) return null;

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between bg-slate-950 border-b border-border p-4 text-white w-full sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-indigo-600 flex items-center justify-center font-display font-bold">
            S
          </div>
          <span className="font-display font-bold tracking-tight">StudySync</span>
        </div>
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-1 hover:bg-slate-900 rounded"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Sidebar Navigation */}
      <nav
        className={cn(
          "bg-slate-950 border-r border-border text-slate-300 flex flex-col justify-between transition-all duration-300 z-50 sticky top-0 h-screen",
          isCollapsed ? "w-16" : "w-64",
          // Mobile responsive behaviour
          "fixed md:sticky left-0 top-0 h-screen",
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex flex-col gap-6 pt-6">
          {/* Sidebar Header Brand */}
          <div className="px-4 flex items-center justify-between">
            <Link to="/dashboard" className="flex items-center gap-3 overflow-hidden select-none" onClick={() => setIsMobileOpen(false)}>
              <div className="w-8 h-8 rounded bg-indigo-600 flex items-center justify-center font-display font-bold text-white shrink-0">
                S
              </div>
              {!isCollapsed && (
                <span className="font-display font-bold tracking-tight text-white text-lg animate-fade-in whitespace-nowrap">
                  StudySync
                </span>
              )}
            </Link>

            {/* Toggle collapse for desktop */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden md:flex p-1 hover:bg-slate-900 rounded text-slate-400 hover:text-white"
            >
              {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>

          {/* Navigation Items */}
          <div className="flex flex-col gap-1 px-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              
              const linkContent = (
                <Link
                  to={item.path}
                  onClick={() => setIsMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all select-none duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500",
                    active 
                      ? "bg-indigo-600/10 text-indigo-400 border-l-2 border-indigo-500 rounded-l-none" 
                      : "hover:bg-white/[0.04] hover:text-white"
                  )}
                >
                  <Icon size={18} className={cn(active ? "text-indigo-400" : "text-slate-400")} />
                  {!isCollapsed && (
                    <span className="animate-fade-in whitespace-nowrap">{item.label}</span>
                  )}
                </Link>
              );

              if (isCollapsed) {
                return (
                  <Tooltip key={item.label} delayDuration={100}>
                    <TooltipTrigger asChild>
                      {linkContent}
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return <div key={item.label}>{linkContent}</div>;
            })}
          </div>
        </div>

        {/* User Account / Bottom Section */}
        <div className="p-3 border-t border-border/40">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center justify-between p-2 rounded-md hover:bg-white/[0.04] transition-all text-left focus:outline-none cursor-pointer">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative w-8 h-8 rounded-full bg-indigo-600/30 text-indigo-400 flex items-center justify-center font-bold text-sm shrink-0 border border-indigo-500/25">
                    {(user.username?.[0] || 'U').toUpperCase()}
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-950 rounded-full" />
                  </div>
                  {!isCollapsed && (
                    <div className="flex flex-col min-w-0 animate-fade-in">
                      <span className="text-sm font-semibold text-white truncate leading-none mb-1">
                        {user.username}
                      </span>
                      <span className="text-xs text-slate-500 truncate leading-none">
                        {user.email}
                      </span>
                    </div>
                  )}
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 mb-2" side={isCollapsed ? "right" : "top"} align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                <User className="mr-2 h-4 w-4" />
                <span>View Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/profile?tab=analytics')}>
                <BarChart3 className="mr-2 h-4 w-4" />
                <span>Analytics</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/profile?tab=settings')}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-400 hover:text-red-300 focus:bg-red-500/10">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>
      
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div 
          onClick={() => setIsMobileOpen(false)}
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30"
        />
      )}
    </>
  );
};

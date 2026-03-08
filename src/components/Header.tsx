import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { LogOut, Settings, User, Menu, Home, Trophy } from 'lucide-react';
import logo from '@/assets/logo.png';

const Header = () => {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const NavItems = ({ mobile = false }: { mobile?: boolean }) => {
    const baseClass = mobile
      ? 'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors'
      : '';
    const activeClass = mobile ? 'bg-primary/10 text-primary' : '';
    const inactiveClass = mobile ? 'text-muted-foreground hover:bg-muted hover:text-foreground' : '';

    if (!user) {
      return (
        <>
          {mobile ? (
            <>
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className={`${baseClass} ${isActive('/login') ? activeClass : inactiveClass}`}
              >
                <User className="h-5 w-5" />
                Entrar
              </Link>
              <Link
                to="/register"
                onClick={() => setOpen(false)}
                className={`${baseClass} ${isActive('/register') ? activeClass : inactiveClass}`}
              >
                <Trophy className="h-5 w-5" />
                Cadastrar
              </Link>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  Entrar
                </Button>
              </Link>
              <Link to="/register">
                <Button size="sm" className="bg-gradient-green hover:opacity-90 text-primary-foreground">
                  Cadastrar
                </Button>
              </Link>
            </>
          )}
        </>
      );
    }

    return (
      <>
        {mobile ? (
          <>
            <Link
              to="/"
              onClick={() => setOpen(false)}
              className={`${baseClass} ${isActive('/') ? activeClass : inactiveClass}`}
            >
              <Home className="h-5 w-5" />
              Início
            </Link>
            <Link
              to="/dashboard"
              onClick={() => setOpen(false)}
              className={`${baseClass} ${isActive('/dashboard') ? activeClass : inactiveClass}`}
            >
              <User className="h-5 w-5" />
              Meus Bolões
            </Link>
            {isAdmin && (
              <Link
                to="/admin"
                onClick={() => setOpen(false)}
                className={`${baseClass} ${isActive('/admin') ? activeClass : inactiveClass}`}
              >
                <Settings className="h-5 w-5" />
                Painel Admin
              </Link>
            )}
            <button
              onClick={() => { signOut(); setOpen(false); }}
              className={`${baseClass} ${inactiveClass} w-full text-left`}
            >
              <LogOut className="h-5 w-5" />
              Sair
            </button>
          </>
        ) : (
          <>
            <Link to="/dashboard">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <User className="mr-1.5 h-4 w-4" />
                Meus Bolões
              </Button>
            </Link>
            {isAdmin && (
              <Link to="/admin">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  <Settings className="mr-1.5 h-4 w-4" />
                  Admin
                </Button>
              </Link>
            )}
            <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground hover:text-foreground">
              <LogOut className="mr-1.5 h-4 w-4" />
              Sair
            </Button>
          </>
        )}
      </>
    );
  };

  return (
    <header className="sticky top-0 z-50 glass">
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="Sorte Compartilhada" className="h-14 sm:h-16 w-auto" />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-3">
          <NavItems />
        </nav>

        {/* Mobile hamburger */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="sm:hidden">
            <Button variant="ghost" size="icon" className="text-foreground">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 bg-card border-border p-0">
            <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-2 p-4 border-b border-border">
                <img src={logo} alt="Sorte Compartilhada" className="h-8 w-auto" />
              </div>
              <nav className="flex-1 flex flex-col gap-1 p-3">
                <NavItems mobile />
              </nav>
              {user && (
                <div className="p-4 border-t border-border">
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
};

export default Header;

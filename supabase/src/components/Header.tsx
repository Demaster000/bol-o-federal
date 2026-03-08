import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Trophy, LogOut, Settings, User, Menu, X } from 'lucide-react';

const Header = () => {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogoClick = () => {
    navigate('/');
    setMobileMenuOpen(false);
  };

  const handleNavClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 glass">
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        {/* Logo - Clicável em todas as telas */}
        <button
          onClick={handleLogoClick}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-green">
            <Trophy className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-lg sm:text-xl font-bold text-gradient-gold">
            BolãoVIP
          </span>
        </button>

        {/* Desktop Navigation */}
        <nav className="hidden sm:flex items-center gap-3">
          {user ? (
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
        </nav>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="sm:hidden p-2 hover:bg-muted rounded-lg transition-colors"
        >
          {mobileMenuOpen ? (
            <X className="h-6 w-6 text-foreground" />
          ) : (
            <Menu className="h-6 w-6 text-foreground" />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-border bg-card/95 backdrop-blur-sm">
          <nav className="flex flex-col gap-1 px-4 py-3">
            {user ? (
              <>
                <Link to="/dashboard" onClick={handleNavClick}>
                  <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-foreground">
                    <User className="mr-2 h-4 w-4" />
                    Meus Bolões
                  </Button>
                </Link>
                {isAdmin && (
                  <Link to="/admin" onClick={handleNavClick}>
                    <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-foreground">
                      <Settings className="mr-2 h-4 w-4" />
                      Admin
                    </Button>
                  </Link>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    signOut();
                    handleNavClick();
                  }}
                  className="w-full justify-start text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </Button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={handleNavClick}>
                  <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-foreground">
                    Entrar
                  </Button>
                </Link>
                <Link to="/register" onClick={handleNavClick}>
                  <Button size="sm" className="w-full bg-gradient-green hover:opacity-90 text-primary-foreground">
                    Cadastrar
                  </Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;

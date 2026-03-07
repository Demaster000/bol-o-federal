import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

/**
 * Componente de redirecionamento para manter compatibilidade com rotas antigas.
 * Redireciona para /login?mode=register preservando os parâmetros de query.
 */
const Register = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Preservar parâmetros de query ao redirecionar
    const redirect = searchParams.get('redirect');
    const pool = searchParams.get('pool');
    
    let redirectPath = '/login?mode=register';
    
    if (pool) {
      redirectPath += `&pool=${pool}`;
    } else if (redirect) {
      redirectPath += `&redirect=${encodeURIComponent(redirect)}`;
    }
    
    navigate(redirectPath, { replace: true });
  }, [navigate, searchParams]);

  return null;
};

export default Register;

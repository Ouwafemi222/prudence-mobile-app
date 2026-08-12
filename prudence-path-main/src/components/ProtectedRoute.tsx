import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, isEmailConfirmed } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireApproval?: boolean;
  allowedRoles?: string[];
}

function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/20">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

export function ProtectedRoute({
  children,
  requireApproval = true,
  allowedRoles,
}: ProtectedRouteProps) {
  const { user, profile, userRole, loading, userDataLoading, isApproved } = useAuth();
  const location = useLocation();

  // Block only until session is restored (INITIAL_SESSION). Profile loads in background.
  if (loading) {
    return <LoadingScreen message="Loading..." />;
  }

  if (user && isEmailConfirmed(user) && userDataLoading && !profile) {
    return <LoadingScreen message="Loading your profile..." />;
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (!isEmailConfirmed(user)) {
    return <Navigate to="/auth" state={{ from: location, needsConfirmation: true }} replace />;
  }

  if (!profile) {
    return <LoadingScreen message="Setting up your profile..." />;
  }

  if (profile.approval_status === 'rejected') {
    return <Navigate to="/account-rejected" replace />;
  }

  if (requireApproval && !isApproved) {
    return <Navigate to="/waiting-approval" replace />;
  }

  if (allowedRoles) {
    if (!userRole && userDataLoading) {
      return <LoadingScreen message="Loading permissions..." />;
    }
    if (userRole && !allowedRoles.includes(userRole.role)) {
      return <Navigate to="/dashboard" replace />;
    }
    if (!userRole && !userDataLoading) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
}

export function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, userDataLoading, isApproved, emailConfirmed } = useAuth();
  const location = useLocation();

  // Boot only — never block the login form on background profile refresh
  if (loading) {
    return <LoadingScreen message="Loading..." />;
  }

  if (user && emailConfirmed && profile) {
    if (isApproved) {
      const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
      return <Navigate to={from || '/dashboard'} replace />;
    }
    return <Navigate to="/waiting-approval" replace />;
  }

  return <>{children}</>;
}

export function WaitingApprovalRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, userDataLoading, isApproved, emailConfirmed } = useAuth();

  if (loading) {
    return <LoadingScreen message="Loading..." />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!emailConfirmed) {
    return <Navigate to="/auth" replace />;
  }

  if (!profile && userDataLoading) {
    return <LoadingScreen message="Loading your profile..." />;
  }

  if (!profile) {
    return <LoadingScreen message="Setting up your profile..." />;
  }

  if (profile.approval_status === 'rejected') {
    return <Navigate to="/account-rejected" replace />;
  }

  if (isApproved) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

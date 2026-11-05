import type { RouteObject } from 'react-router-dom';
import { createBrowserRouter } from 'react-router-dom';

import { HomePage } from '@/features/home/HomePage';
import { PasswordRecoveryPage } from '@/features/password-recovery/PasswordRecoveryPage';
import { RegistrationPage } from '@/features/registration/RegistrationPage';
import { UsersPage } from '@/features/users/UsersPage';
import { NotFoundPage } from '@/shared/components/NotFoundPage';

export const routes: RouteObject[] = [
  { path: '/recuperar-senha', element: <PasswordRecoveryPage /> },
  { path: '/usuarios', element: <UsersPage /> },
  { path: '/cadastro', element: <RegistrationPage /> },
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
];

export const router = createBrowserRouter(routes);

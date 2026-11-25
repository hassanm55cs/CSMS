import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { VisitsProvider } from './context/VisitsContext';
import { AppRoutes } from './routes/AppRoutes';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <VisitsProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </VisitsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

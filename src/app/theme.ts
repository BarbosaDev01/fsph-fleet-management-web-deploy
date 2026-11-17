import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#243e90',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#157f65',
    },
    background: {
      default: '#f7f8fa',
      paper: '#ffffff',
    },
    text: { primary: '#17243a', secondary: '#64748b' },
    divider: '#d8e0eb',
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: (theme) => ({
        ':root': {
          '--fsph-primary': theme.palette.primary.main,
          '--fsph-sidebar': theme.palette.primary.dark,
          '--fsph-text': theme.palette.text.primary,
          '--fsph-muted': theme.palette.text.secondary,
          '--fsph-border': theme.palette.divider,
          '--fsph-background': theme.palette.background.default,
          '--fsph-font': theme.typography.fontFamily,
        },
      }),
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { textTransform: 'none', fontWeight: 600 } },
    },
    MuiTableHead: { styleOverrides: { root: { backgroundColor: '#f8fafc' } } },
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily: 'Arial, "Segoe UI", sans-serif',
    h1: {
      fontSize: 'clamp(2rem, 5vw, 3.25rem)',
      fontWeight: 700,
      letterSpacing: '-0.03em',
    },
  },
});

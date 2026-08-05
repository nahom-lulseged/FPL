import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

void i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  resources: {
    en: {
      translation: {
        nav: { home: 'Home', team: 'Team', leagues: 'Leagues', wallet: 'Wallet', profile: 'Profile' },
        common: { deposit: 'Deposit', withdraw: 'Withdraw', viewAll: 'View all' },
      },
    },
  },
});

export default i18n;


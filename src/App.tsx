import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './state/AuthProvider';
import { AuthScreen } from './screens/AuthScreen';
import { CampaignScreen } from './screens/CampaignScreen';
import { DailyScreen } from './screens/DailyScreen';
import { DifficultyScreen } from './screens/DifficultyScreen';
import { HelpScreen } from './screens/HelpScreen';
import { HomeScreen } from './screens/HomeScreen';
import { PlayScreen } from './screens/PlayScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { ShopScreen } from './screens/ShopScreen';

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/auth" element={<AuthScreen />} />
          <Route path="/single" element={<DifficultyScreen />} />
          <Route path="/campaign" element={<CampaignScreen />} />
          <Route path="/daily" element={<DailyScreen />} />
          <Route path="/profile" element={<ProfileScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="/help" element={<HelpScreen />} />
          <Route path="/shop" element={<ShopScreen />} />
          <Route path="/play/single/:difficulty" element={<PlayScreen />} />
          <Route path="/play/campaign/:level/:index" element={<PlayScreen />} />
          <Route path="/play/daily" element={<PlayScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

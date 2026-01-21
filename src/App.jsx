import { useState, useEffect } from 'react';
import { Home, PlusCircle, Book, User } from 'lucide-react';
import HomeScreen from './screens/HomeScreen';
import AddDreamScreen from './screens/AddDreamScreen';
import ArchiveScreen from './screens/ArchiveScreen';
import DreamDetailScreen from './screens/DreamDetailScreen';
import ProfileScreen from './screens/ProfileScreen';
import LoginScreen from './screens/LoginScreen';
import ModelsScreen from './screens/ModelsScreen';
import { useDreamStore } from './hooks/useDreamStore';
import { t } from './utils/translations';

function App() {
    // Get state from store (currentUser drives auth state)
    const { language, currentUser } = useDreamStore();

    // Derived state for clarity
    const isLoggedIn = !!currentUser;

    const [navState, setNavState] = useState({ screen: 'home', params: null });

    const navigate = (screen, params = null) => {
        setNavState({ screen, params });
    };

    const renderScreen = () => {
        switch (navState.screen) {
            case 'home':
                return <HomeScreen onNavigate={navigate} />;
            case 'add':
                // Pass navState.params as initialMode ('record' or 'write')
                return <AddDreamScreen onNavigate={navigate} initialMode={navState.params} />;
            case 'archive':
                return <ArchiveScreen onNavigate={navigate} />;
            case 'models':
                return <ModelsScreen onNavigate={navigate} />;
            case 'detail':
                return <DreamDetailScreen dreamId={navState.params} onBack={() => navigate('archive')} />;
            case 'profile':
                return <ProfileScreen onNavigate={navigate} />;
            default:
                return <HomeScreen onNavigate={navigate} />;
        }
    };

    const NavIcon = ({ icon: Icon, label, screen }) => (
        <button
            onClick={() => navigate(screen)}
            className={`flex flex-col items-center justify-center w-16 h-16 transition-colors ${navState.screen === screen ? 'text-primary' : 'text-gray-600'}`}
        >
            <Icon className={`w-6 h-6 ${navState.screen === screen ? 'drop-shadow-[0_0_8px_rgba(233,216,166,0.6)]' : ''}`} />
            <span className="text-[10px] mt-1 font-sans">{label}</span>
        </button>
    );

    // AUTH GUARD
    if (!isLoggedIn) {
        // LoginScreen updates the store directly, causing re-render
        return <LoginScreen onLogin={() => { }} />;
    }

    return (
        <div className="h-screen w-full flex flex-col bg-background text-primary font-sans overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-surface to-background transition-colors duration-500">

            {/* Main Content */}
            <main className={`flex-1 w-full relative ${navState.screen === 'home' ? 'h-full overflow-hidden flex flex-col' : 'overflow-y-auto no-scrollbar pt-safe-top pb-24 px-4'}`}>
                {renderScreen()}
            </main>

            {/* Bottom Nav */}
            {navState.screen !== 'detail' && (
                <nav className="h-20 bg-surface/90 backdrop-blur-md border-t border-border/30 flex justify-around items-center z-50 rounded-t-2xl shadow-glow pb-safe-bottom absolute bottom-0 w-full left-0 animate-slide-up">
                    <NavIcon icon={Home} label={t(language, 'home')} screen="home" />
                    <NavIcon icon={PlusCircle} label={t(language, 'add')} screen="add" />
                    <NavIcon icon={Book} label={t(language, 'journal')} screen="archive" />
                    <NavIcon icon={User} label={t(language, 'profile')} screen="profile" />
                </nav>
            )}
        </div>
    );
}

export default App;

import { useState } from 'react';
import { Home, PlusCircle, Book, User } from 'lucide-react';
import HomeScreen from './screens/HomeScreen';
import AddDreamScreen from './screens/AddDreamScreen';
import ArchiveScreen from './screens/ArchiveScreen';
import DreamDetailScreen from './screens/DreamDetailScreen';
import ProfileScreen from './screens/ProfileScreen';

function App() {
    const [navState, setNavState] = useState({ screen: 'home', params: null });

    const navigate = (screen, params = null) => {
        setNavState({ screen, params });
    };

    const renderScreen = () => {
        switch (navState.screen) {
            case 'home':
                return <HomeScreen onNavigate={navigate} />;
            case 'add':
                return <AddDreamScreen onNavigate={navigate} />;
            case 'archive':
                return <ArchiveScreen onNavigate={navigate} />;
            case 'detail':
                return <DreamDetailScreen dreamId={navState.params} onBack={() => navigate('archive')} />;
            case 'profile':
                return <ProfileScreen />;
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

    return (
        <div className="h-screen w-full flex flex-col bg-background text-primary font-sans overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-surface to-background transition-colors duration-500">
            {/* Main Content: Overflow handled per screen */}
            {/* Home screen gets strict h-full and NO scrolling. Other screens get scrolling. */}
            <main className={`flex-1 w-full relative ${navState.screen === 'home' ? 'h-full overflow-hidden flex flex-col' : 'overflow-y-auto no-scrollbar pt-safe-top pb-24 px-4'}`}>
                {renderScreen()}
            </main>

            {/* Bottom Nav (Hidden on Home per 'Zero Scroll' request) */}
            {navState.screen !== 'detail' && navState.screen !== 'home' && (
                <nav className="h-20 bg-surface/90 backdrop-blur-md border-t border-border/30 flex justify-around items-center z-50 rounded-t-2xl shadow-glow pb-safe-bottom absolute bottom-0 w-full left-0 animate-slide-up">
                    <NavIcon icon={Home} label="Home" screen="home" />
                    <NavIcon icon={PlusCircle} label="Add" screen="add" />
                    <NavIcon icon={Book} label="Journal" screen="archive" />
                    <NavIcon icon={User} label="Profile" screen="profile" />
                </nav>
            )}
        </div>
    );
}

export default App;

import React, { useState } from 'react';
import LandingPage from './components/LandingPage';
import MainApp from './MainApp';
import ErrorBoundary from './components/ErrorBoundary';

const App = () => {
    const [appState, setAppState] = useState<'landing' | 'app'>('landing');

    if (appState === 'landing') {
        return <LandingPage onEnter={() => setAppState('app')} />;
    }

    return (
      <ErrorBoundary>
        <MainApp />
      </ErrorBoundary>
    );
};

export default App;
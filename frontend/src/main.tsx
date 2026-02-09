import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles/app.css';

const rootElement: HTMLElement | null = document.getElementById('root');

if (!rootElement) {
    throw new Error('Root element not found');
}

const root: ReactDOM.Root = ReactDOM.createRoot(rootElement);

root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);

import { useState } from 'react';
import axios from 'axios';
import ChatBubble from './components/ChatBubble';

interface Message {
  role: 'user' | 'bot';
  content: string;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', content: 'Hi! Describe a product and I’ll find its HSC code.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [chatStarted, setChatStarted] = useState<boolean>(false);

  const theme = {
    background: darkMode ? '#1a202c' : '#f5f5f7', // light gray Apple-like background
    cardBackground: darkMode ? '#2d3748' : '#ffffff',
    text: darkMode ? '#f7fafc' : '#1c1c1e', // Apple dark text
    inputBackground: darkMode ? '#4a5568' : '#f0f0f3',
    inputBorder: darkMode ? '#718096' : '#d1d1d6',
    buttonBackground: darkMode ? '#4a90e2' : '#007aff', // Apple blue
    buttonColor: '#fff'
  };

  // Modified sendMessage to enable chatStarted only after message is confirmed
  const sendMessage = async () => {
    if (!input.trim()) return;

    const newMessages: Message[] = [...messages, { role: 'user', content: input }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await axios.post('http://localhost:8000/get-hsc', {
        description: input
      });

      const reply: Message = {
        role: 'bot',
        content: `The HSC code for "${res.data.description}" is ${res.data.hsc_code}.`
      };

      setMessages([...newMessages, reply]);
      if (!chatStarted) setChatStarted(true); // Trigger only after response
    } catch (error) {
      setMessages([...newMessages, { role: 'bot', content: 'Error fetching HSC code.' }]);
      if (!chatStarted) setChatStarted(true);
    } finally {
      setLoading(false);
    }
  };

  // Remove chatStarted change from handleInputChange
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  // Remove chatStarted change from handleKeyDown
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') sendMessage();
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-end',
        fontFamily: "'Inter', sans-serif",
        background: theme.background,
        padding: '1rem',
        transition: 'all 0.5s ease'
      }}
    >
      <button
        onClick={() => setDarkMode(!darkMode)}
        style={{
          position: 'absolute',
          top: '1rem',
          left: '1rem',
          padding: '0.5rem 1rem',
          borderRadius: '8px',
          backgroundColor: theme.buttonBackground,
          color: theme.buttonColor,
          border: 'none',
          cursor: 'pointer',
          fontWeight: 500
        }}
      >
        {darkMode ? '☀️' : '🌙'}
      </button>

      {chatStarted ? (
        <div
          style={{
            width: '100%',
            maxWidth: 600,
            borderRadius: '16px',
            backgroundColor: theme.cardBackground,
            padding: '1.5rem',
            boxShadow: '0 12px 25px rgba(0, 0, 0, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            marginBottom: '1rem',
            maxHeight: '80vh',
            overflow: 'hidden'
          }}
        >
          <h1 style={{
            marginBottom: '1rem',
            fontSize: '1.5rem',
            fontWeight: 600,
            color: theme.text
          }}>HSC Code Finder</h1>

          <div style={{
            flex: 1,
            overflowY: 'auto',
            paddingRight: '0.25rem',
            marginBottom: '1rem'
          }}>
            {messages.map((msg, idx) => (
              <ChatBubble key={idx} role={msg.role} content={msg.content} />
            ))}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Describe your product..."
              style={{
                flex: 1,
                padding: '1rem 1.25rem', // Increased vertical padding
                borderRadius: '12px',
                border: `1px solid ${theme.inputBorder}`,
                backgroundColor: theme.inputBackground,
                color: theme.text,
                fontSize: '1.1rem' // Slightly larger text
              }}
            />
            <button
              onClick={sendMessage}
              disabled={loading}
              style={{
                width: '3rem',
                height: '3rem',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: theme.buttonBackground,
                color: theme.buttonColor,
                fontSize: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease-in-out'
              }}
            >
              {loading ? 'Loading...' : '↗️'}
            </button>
          </div>
        </div>
      ) : (
        <div
          style={{
            width: '100%',
            maxWidth: 950,
            borderRadius: '16px',
            backgroundColor: theme.cardBackground,
            padding: '1rem',
            boxShadow: '0 8px 20px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.5s ease',
            margin: '0 auto'
          }}
        >
          <h2 style={{ marginBottom: '1rem', color: theme.text }}>Start your HSC search</h2>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="text"
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="e.g. leather wallet"
              style={{
                flex: 1,
                padding: '1rem 1.25rem',
                borderRadius: '12px',
                border: `1px solid ${theme.inputBorder}`,
                backgroundColor: theme.inputBackground,
                color: theme.text,
                fontSize: '1.1rem'
              }}
            />
            <button
              onClick={sendMessage}
              disabled={loading}
              style={{
                width: '3rem',
                height: '3rem',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: theme.buttonBackground,
                color: theme.buttonColor,
                fontSize: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease-in-out'
              }}
            >
              {loading ? 'Loading...' : '↗️'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
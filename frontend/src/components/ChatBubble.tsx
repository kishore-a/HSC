import React from 'react';

interface ChatBubbleProps {
  role: 'user' | 'bot';
  content: string;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ role, content }) => {
  const isUser = role === 'user';

  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: '12px'
    }}>
      <div style={{
        background: isUser ? '#007aff' : '#e2e8f0',
        color: isUser ? '#fff' : '#1c1c1e',
        padding: '12px 16px',
        borderRadius: '20px',
        maxWidth: '75%',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.08)',
        fontSize: '0.95rem',
        lineHeight: '1.4'
      }}>
        {content}
      </div>
    </div>
  );
};

export default ChatBubble;
import React from 'react';

interface ChatBubbleProps {
  role: 'user' | 'bot';
  content: string;
  fileName?: string;
  fileUrl?: string;
  darkMode?: boolean;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ role, content, fileName, fileUrl, darkMode = false }) => {
  const isUser = role === 'user';
  const background = isUser
    ? darkMode ? '#10a37f' : '#007aff'
    : darkMode ? '#444654' : '#f1f1f0';
  const color = darkMode
    ? '#ffffff'
    : isUser
      ? '#ffffff'
      : '#1c1c1e';

  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: '12px'
    }}>
      <div style={{
        background,
        color,
        padding: '12px 16px',
        borderRadius: '10px',
        maxWidth: '75%',
        fontSize: '0.95rem',
        lineHeight: '1.4'
      }}>
        {content}
        {fileUrl && (
          <a
            href={fileUrl}
            download={fileName}
            style={{
              display: 'inline-block',
              marginTop: '0.5rem',
              color,
              textDecoration: 'underline'
            }}
          >
            {fileName}
          </a>
        )}
      </div>
    </div>
  );
};

export default ChatBubble;
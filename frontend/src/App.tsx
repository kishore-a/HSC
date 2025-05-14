import { useState } from 'react';
import axios from 'axios';
import ChatBubble from './components/ChatBubble';
import Spinner from './components/Spinner';
import { useAuth } from './AuthContext'
import Login from './components/Login'
import * as XLSX from 'xlsx';

// Types for Excel QA and chat sessions
interface TableRow { description: string; hsc_code: string; confidence: number; }
interface ChatSession {
  id: string;
  name: string;
  messages: Message[];
  uploadedRows: TableRow[];
}

interface Message {
  role: 'user' | 'bot';
  content: string;
  fileName?: string;
  fileUrl?: string;
}

function App() {
  const { session, signOut } = useAuth()
  // redirect to login if not authenticated
  if (!session) {
    return <Login />
  }
  const initialSession: ChatSession = {
    id: Date.now().toString(),
    name: 'HSC code for product',
    messages: [ { role: 'bot', content: 'Hi! Describe a product and I’ll find its HSC code.' } ],
    uploadedRows: []
  };
  const [sessions, setSessions] = useState<ChatSession[]>([initialSession]);
  const [currentSessionIndex, setCurrentSessionIndex] = useState<number>(0);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  // Sidebar open/close state for toggling
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);

  const theme = {
    background: darkMode ? '#343541' : '#f7f7f8',
    sidebarBackground: darkMode ? '#202123' : '#f6f7f8',
    cardBackground: darkMode ? '#444654' : '#ffffff',
    text: darkMode ? '#d1d1e0' : '#1c1c1e',
    inputBackground: darkMode ? '#40414f' : '#ffffff',
    inputBorder: darkMode ? '#40414f' : '#e5e7eb',
    buttonBackground: darkMode ? '#10a37f' : '#007aff',
    buttonColor: '#ffffff'
  };
  // always show chat panel
  const chatStarted = true;
  // Current chat session data
  const currentSession = sessions[currentSessionIndex];
  const messages = currentSession.messages;
  const uploadedRows = currentSession.uploadedRows;
  // Determine mode based on session name
  const isBulkMode = currentSession.name === 'Bulk processor for files';

  // Create a new chat session and switch to it
  const handleNewChat = () => {
    const newId = Date.now().toString();
    const newName = 'HSC code for product';
    const newSession: ChatSession = {
      id: newId,
      name: newName,
      messages: [{ role: 'bot', content: 'Hi! Describe a product and I’ll find its HSC code.' }],
      uploadedRows: []
    };
    setSessions(prev => [...prev, newSession]);
    setCurrentSessionIndex(sessions.length);
    setInput('');
    setLoading(false);
  };
  // Update the name of a chat session
  const updateSessionName = (index: number, newName: string) => {
    setSessions(prev => prev.map((sess, idx) => idx === index ? { ...sess, name: newName } : sess));
  };
  const sendMessage = async () => {
    if (!input.trim()) return;

    // Add user message to current session
    const userMsg: Message = { role: 'user', content: input };
    const newMessagesUser = [...messages, userMsg];
    setSessions(prev => prev.map((sess, idx) => idx === currentSessionIndex ? { ...sess, messages: newMessagesUser } : sess));
    setInput('');
    setLoading(true);

    try {
      if (isBulkMode) {
        // QA on uploaded Excel data
        const res = await axios.post('/ask', {
          question: input,
          table: uploadedRows
        });
        const reply: Message = { role: 'bot', content: res.data.answer };
        const newMessagesBot = [...newMessagesUser, reply];
        setSessions(prev => prev.map((sess, idx) => idx === currentSessionIndex ? { ...sess, messages: newMessagesBot } : sess));
      } else {
        // Single description HSC lookup
        const res = await axios.post('/get-hsc', { description: input });
        const reply: Message = {
          role: 'bot',
          content: `The HSC code for \"${res.data.description}\" is ${res.data.hsc_code}.`
        };
        const newMessagesBot = [...newMessagesUser, reply];
        setSessions(prev => prev.map((sess, idx) => idx === currentSessionIndex ? { ...sess, messages: newMessagesBot } : sess));
      }
    } catch (error) {
      const errMsg = isBulkMode ? 'Error answering question.' : 'Error fetching HSC code.';
      const errorMsg: Message = { role: 'bot', content: errMsg };
      const newMessagesErr = [...newMessagesUser, errorMsg];
      setSessions(prev => prev.map((sess, idx) => idx === currentSessionIndex ? { ...sess, messages: newMessagesErr } : sess));
      setLoading(false);
    }
  };

  // Remove chatStarted change from handleInputChange
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    setInput(e.target.value);
  };

  // Remove chatStarted change from handleKeyDown
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
  
  // Handle Excel file upload to batch-generate HSC codes
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Show uploaded file in chat as user message
    const userFileUrl = URL.createObjectURL(file);
    // Add file upload as user message in current session
    const userFileMsg: Message = { role: 'user', content: file.name, fileName: file.name, fileUrl: userFileUrl };
    setSessions(prev => prev.map((sess, idx) => idx === currentSessionIndex ? { ...sess, messages: [...sess.messages, userFileMsg] } : sess));
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await axios.post('/upload-excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const { filename, rows } = res.data as { filename: string; rows: Array<{ description: string; hsc_code: string; confidence?: number }>; };
      // Store uploaded table for QA in current session
      const typedRows = rows as { description: string; hsc_code: string; confidence: number }[];
      setSessions(prev => prev.map((sess, idx) => idx === currentSessionIndex ? { ...sess, uploadedRows: typedRows } : sess));
      // Read original workbook
      const buf = await file.arrayBuffer();
      const workbook = XLSX.read(buf, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      // Append HSC Code and Confidence headers
      if (data.length > 0) {
        data[0] = [...data[0], 'HSC Code', 'Confidence'];
      }
      // Fill rows
      for (let i = 1; i < data.length; i++) {
        const rowResult = rows[i - 1] || {};
        data[i] = [...(data[i] || []), rowResult.hsc_code || '', rowResult.confidence != null ? rowResult.confidence : ''];
      }
      // Generate new sheet and workbook
      const newSheet = XLSX.utils.aoa_to_sheet(data);
      workbook.Sheets[sheetName] = newSheet;
      const out = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([out], { type: 'application/octet-stream' });
      const blobUrl = URL.createObjectURL(blob);
      const processedName = `processed_${filename}`;
      // Add processed file link as bot message in current session
      const botFileMsg: Message = { role: 'bot', content: 'Here is your processed file:', fileName: processedName, fileUrl: blobUrl };
      setSessions(prev => prev.map((sess, idx) => idx === currentSessionIndex ? { ...sess, messages: [...sess.messages, botFileMsg] } : sess));
    } catch (error) {
      console.error('File upload error', error);
      // Add error message to current session
      const errorMsg: Message = { role: 'bot', content: 'Error processing Excel file.' };
      setSessions(prev => prev.map((sess, idx) => idx === currentSessionIndex ? { ...sess, messages: [...sess.messages, errorMsg] } : sess));
    } finally {
      setLoading(false);
      // reset input
      e.target.value = '';
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',    // layout: sidebar + main chat
        flexDirection: 'row',
        fontFamily: "'Inter', sans-serif",
        background: theme.background,
        transition: 'all 0.5s ease'
      }}
    >
      {/* Sidebar */}
      <div style={{
        width: sidebarOpen ? '250px' : '40px',
        transition: 'width 0.3s ease',
        overflow: 'hidden',
        backgroundColor: theme.sidebarBackground,
        padding: sidebarOpen ? '1rem' : '0.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem'
      }}>
        {/* Sidebar collapse toggle */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              border: 'none',
              background: 'transparent',
              color: theme.text,
              fontSize: '1.25rem',
              cursor: 'pointer'
            }}
          >
            {sidebarOpen ? '◀️' : '▶️'}
          </button>
        </div>
        {sidebarOpen && (
          <>
            <button onClick={handleNewChat} style={{
              padding: '0.5rem',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: theme.buttonBackground,
              color: theme.buttonColor,
              cursor: 'pointer',
              fontWeight: 500,
              textAlign: 'left'
            }}>
              + New Chat
            </button>
            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {sessions.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => setCurrentSessionIndex(i)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    const newName = window.prompt('Rename chat', s.name);
                    if (newName && newName.trim()) {
                      updateSessionName(i, newName.trim());
                    }
                  }}
                  style={{
                    textAlign: 'left',
                    padding: '0.5rem',
                    borderRadius: '6px',
                    backgroundColor: i === currentSessionIndex ? theme.buttonBackground : 'transparent',
                    color: i === currentSessionIndex ? theme.buttonColor : theme.text,
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 500
                  }}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      {/* Main chat area */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: theme.background,
        position: 'relative'
      }}>

      {chatStarted ? (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100%'
        }}>
          {/* Chat header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.75rem 1rem',
            borderBottom: `1px solid ${theme.inputBorder}`,
            backgroundColor: theme.cardBackground
          }}>
            <select
              value={currentSession.name}
              onChange={(e) => updateSessionName(currentSessionIndex, e.target.value)}
              style={{
                display: 'inline-block',
                width: 'auto',
                padding: '0.5rem 0.75rem',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: theme.inputBackground,
                color: theme.text,
                fontSize: '1rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="HSC code for product">HSC code for product</option>
              <option value="Bulk processor for files">Bulk processor for files</option>
            </select>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <button
                onClick={() => setDarkMode(!darkMode)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: theme.text,
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                {darkMode ? '☀️' : '🌙'}
              </button>
              <button
                onClick={() => signOut()}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: theme.text,
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                  padding: 0,
                  marginLeft: '1rem'
                }}
              >
                Logout
              </button>
            </div>
          </div>
          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1rem'
          }}>
            {messages.map((msg, idx) => (
              <ChatBubble
                key={idx}
                role={msg.role}
                content={msg.content}
                fileName={msg.fileName}
                fileUrl={msg.fileUrl}
                darkMode={darkMode}
              />
            ))}
          </div>
          {/* Input area */}
          <div style={{
            padding: '0.75rem 1rem',
            borderTop: `1px solid ${theme.inputBorder}`,
            backgroundColor: theme.cardBackground,
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'flex-end'
          }}>
          {isBulkMode && (
            <>
              <label
                htmlFor="file-input"
                style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  borderRadius: '6px',
                  backgroundColor: theme.inputBackground,
                  color: theme.text,
                  fontSize: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: loading ? 'default' : 'pointer',
                  transition: 'background-color 0.2s ease-in-out'
                }}
                title="Upload Excel"
              >
                📎
              </label>
              <input
                type="file"
                id="file-input"
                accept=".xlsx"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
            </>
          )}
            <textarea
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={isBulkMode ? (uploadedRows.length > 0 ? 'Ask a question about the uploaded file...' : 'Upload an Excel file to start...') : 'Describe your product...'}
              rows={1}
              disabled={isBulkMode && uploadedRows.length === 0}
              style={{
                flex: 1,
                padding: '0.75rem 1rem',
                borderRadius: '6px',
                border: `1px solid ${theme.inputBorder}`,
                backgroundColor: theme.inputBackground,
                color: theme.text,
                fontSize: '1rem',
                resize: 'none',
                overflow: 'hidden',
                lineHeight: '1.5'
              }}
            />
            <button
              onClick={sendMessage}
              disabled={loading || (isBulkMode && uploadedRows.length === 0)}
              style={{
                width: '2.5rem',
                height: '2.5rem',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: theme.buttonBackground,
                color: theme.buttonColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: loading ? 'default' : 'pointer'
              }}
              aria-label="send message"
            >
              {loading ? <Spinner size={20} color={theme.buttonColor} /> : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20px" height="20px">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              )}
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
            <label
              htmlFor="file-input"
              style={{
                width: '3rem',
                height: '3rem',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: theme.inputBackground,
                color: theme.text,
                fontSize: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: loading ? 'default' : 'pointer',
                transition: 'background-color 0.2s ease-in-out'
              }}
              title="Upload Excel"
            >
              📎
            </label>
            <input
              type="file"
              id="file-input"
              accept=".xlsx"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
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
                cursor: loading ? 'default' : 'pointer',
                transition: 'background-color 0.2s ease-in-out'
              }}
              aria-label="send message"
            >
              {loading ? <Spinner size={20} color={theme.buttonColor} /> : '↗️'}
            </button>
          </div>
        </div>
      )}
      </div> {/* end Main chat area */}
    </div>
  );
}

export default App;
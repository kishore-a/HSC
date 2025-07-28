import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';

interface TableRow {
  description: string;
  hsc_code: string;
  confidence: number;
}

interface BulkHSCResult {
  description: string;
  hsc_code: string;
  confidence: number;
  category: string;
  title: string;
}

interface ChatMessage {
  role: 'user' | 'bot';
  content: string;
  fileName?: string;
  fileUrl?: string;
  timestamp: Date;
}

interface AdvancedSearchProps {
  theme: {
    background: string;
    cardBackground: string;
    text: string;
    inputBackground: string;
    inputBorder: string;
    buttonBackground: string;
    buttonColor: string;
  };
}

const AdvancedSearch: React.FC<AdvancedSearchProps> = ({ theme }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'bot',
      content: 'Welcome to Advanced Search! I can help you with:\n\n1. **Upload Excel files** and ask questions about your products\n2. **Generate HSC codes** for all products in your file\n3. **Analyze your data** and provide insights\n4. **Export results** in various formats\n\n**💡 Quick Tips:**\n• Upload an Excel file with a "Description" column\n• Type "generate HSC code for all" to process everything\n• Ask questions like "What products have the highest confidence?"\n• Use "analyze my data" for insights\n\nUpload an Excel file or ask me anything about HSC codes!',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadedRows, setUploadedRows] = useState<TableRow[]>([]);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addMessage = (message: Omit<ChatMessage, 'timestamp'>) => {
    setMessages(prev => [...prev, { ...message, timestamp: new Date() }]);
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    addMessage({ role: 'user', content: userMessage });
    setInput('');
    setLoading(true);

    try {
      // Check for specific commands
      const lowerMessage = userMessage.toLowerCase();
      
      if (lowerMessage.includes('generate hsc code') && 
          (lowerMessage.includes('all') || lowerMessage.includes('everything'))) {
        await generateHSCForAll();
      } else if (lowerMessage.includes('analyze') && lowerMessage.includes('data')) {
        await analyzeData();
      } else if (lowerMessage.includes('export') || lowerMessage.includes('download')) {
        await exportData();
      } else if (uploadedRows.length > 0) {
        // Regular QA on uploaded data
        const response = await axios.post('/ask', {
          question: userMessage,
          table: uploadedRows
        });
        addMessage({ role: 'bot', content: response.data.answer });
      } else {
        // General HSC lookup
        const response = await axios.post('/get-hsc', { description: userMessage });
        addMessage({
          role: 'bot',
          content: `**HSC Code Found:**\n\n**Product:** ${response.data.description}\n**HSC Code:** ${response.data.hsc_code}\n**Confidence:** ${response.data.match || 'N/A'}%\n\n**Category:** ${response.data.category || 'N/A'}\n**Title:** ${response.data.title || 'N/A'}`
        });
      }
    } catch (error) {
      console.error('Error processing message:', error);
      addMessage({
        role: 'bot',
        content: 'Sorry, I encountered an error processing your request. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const generateHSCForAll = async () => {
    if (!currentFile || uploadedRows.length === 0) {
      addMessage({
        role: 'bot',
        content: 'No file uploaded or no data available. Please upload an Excel file first.'
      });
      return;
    }

    addMessage({
      role: 'bot',
      content: `Generating HSC codes for all ${uploadedRows.length} products... This may take a few moments.`
    });

    try {
      // Extract descriptions that need HSC codes
      const descriptionsToProcess = uploadedRows
        .filter(row => row.description && !row.hsc_code)
        .map(row => row.description);

      if (descriptionsToProcess.length === 0) {
        addMessage({
          role: 'bot',
          content: 'All products already have HSC codes assigned.'
        });
        return;
      }

      // Show progress message
      addMessage({
        role: 'bot',
        content: `Processing ${descriptionsToProcess.length} products... Please wait.`
      });

      // Use bulk endpoint for better performance
      const response = await axios.post('/bulk-hsc', {
        descriptions: descriptionsToProcess,
        country: 'US'
      });

      const { results, total_processed, successful } = response.data;
      
      // Update uploaded rows with new HSC codes
      const processedRows = uploadedRows.map(row => {
        if (row.description && !row.hsc_code) {
          const result = results.find((r: BulkHSCResult) => r.description === row.description);
          if (result) {
            return {
              ...row,
              hsc_code: result.hsc_code,
              confidence: result.confidence
            };
          }
        }
        return row;
      });

      // Update uploaded rows with new HSC codes
      setUploadedRows(processedRows);

      // Generate Excel file with results
      const workbook = XLSX.utils.book_new();
      const worksheetData = [
        ['Description', 'HSC Code', 'Confidence', 'Category', 'Title']
      ];

      processedRows.forEach(row => {
        worksheetData.push([
          row.description,
          row.hsc_code,
          row.confidence,
          '', // Category placeholder
          ''  // Title placeholder
        ]);
      });

      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'HSC Codes');

      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const fileUrl = URL.createObjectURL(blob);

      addMessage({
        role: 'bot',
        content: `✅ **HSC Codes Generated Successfully!**\n\n📊 **Summary:**\n• Total processed: ${total_processed}\n• Successful: ${successful}\n• Failed: ${total_processed - successful}\n\n**Download your results:**`,
        fileName: `HSC_Codes_${new Date().toISOString().split('T')[0]}.xlsx`,
        fileUrl: fileUrl
      });

    } catch (error) {
      console.error('Error generating HSC codes:', error);
      addMessage({
        role: 'bot',
        content: '❌ Error generating HSC codes. Please try again or contact support if the issue persists.'
      });
    }
  };

  const analyzeData = async () => {
    if (uploadedRows.length === 0) {
      addMessage({
        role: 'bot',
        content: 'No data to analyze. Please upload an Excel file first.'
      });
      return;
    }

    const totalProducts = uploadedRows.length;
    const productsWithCodes = uploadedRows.filter(r => r.hsc_code && r.hsc_code !== 'Error').length;
    const averageConfidence = uploadedRows
      .filter(r => r.confidence > 0)
      .reduce((sum, r) => sum + r.confidence, 0) / Math.max(1, uploadedRows.filter(r => r.confidence > 0).length);

    addMessage({
      role: 'bot',
      content: `📊 **Data Analysis Report**\n\n**Summary:**\n• Total products: ${totalProducts}\n• Products with HSC codes: ${productsWithCodes}\n• Success rate: ${((productsWithCodes / totalProducts) * 100).toFixed(1)}%\n• Average confidence: ${averageConfidence.toFixed(1)}%\n\n**Recommendations:**\n${productsWithCodes < totalProducts ? '• Consider generating HSC codes for remaining products\n' : ''}${averageConfidence < 70 ? '• Some classifications have low confidence - review manually\n' : ''}• Export results for further analysis`
    });
  };

  const exportData = async () => {
    if (uploadedRows.length === 0) {
      addMessage({
        role: 'bot',
        content: 'No data to export. Please upload an Excel file first.'
      });
      return;
    }

    try {
      const workbook = XLSX.utils.book_new();
      const worksheetData = [
        ['Description', 'HSC Code', 'Confidence', 'Category', 'Title']
      ];

      uploadedRows.forEach(row => {
        worksheetData.push([
          row.description,
          row.hsc_code,
          String(row.confidence),
          '', // Category placeholder
          ''  // Title placeholder
        ]);
      });

      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'HSC Data');

      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const fileUrl = URL.createObjectURL(blob);

      addMessage({
        role: 'bot',
        content: `📤 **Data Exported Successfully!**\n\nExported ${uploadedRows.length} products with their HSC codes.\n\n**Download your data:**`,
        fileName: `HSC_Export_${new Date().toISOString().split('T')[0]}.xlsx`,
        fileUrl: fileUrl
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      addMessage({
        role: 'bot',
        content: '❌ Error exporting data. Please try again.'
      });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      addMessage({
        role: 'bot',
        content: 'Please upload an Excel (.xlsx) file.'
      });
      return;
    }

    setCurrentFile(file);
    addMessage({
      role: 'user',
      content: `📁 Uploaded: ${file.name}`,
      fileName: file.name
    });

    setLoading(true);

    try {
      // Read the Excel file
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
             const data = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];

      // Extract descriptions from the data
      const descriptions = data.map(row => {
        // Try to find description column
        const descKey = Object.keys(row).find(key => 
          key.toLowerCase().includes('description') || 
          key.toLowerCase().includes('product') ||
          key.toLowerCase().includes('name')
        );
        return descKey ? row[descKey] : Object.values(row)[0];
      }).filter(desc => desc && typeof desc === 'string');

      if (descriptions.length === 0) {
        addMessage({
          role: 'bot',
          content: 'No product descriptions found in the file. Please ensure your Excel file has a column with product descriptions.'
        });
        return;
      }

             // Create table rows
       const rows: TableRow[] = descriptions.map(desc => ({
         description: String(desc),
         hsc_code: '',
         confidence: 0
       }));

      setUploadedRows(rows);

      addMessage({
        role: 'bot',
        content: `📊 **File Processed Successfully!**\n\nFound ${descriptions.length} products in your file.\n\nYou can now:\n• Ask questions about your products\n• Type "generate HSC code for all" to process everything\n• Ask for analysis or insights about your data`
      });

    } catch (error) {
      console.error('Error processing file:', error);
      addMessage({
        role: 'bot',
        content: 'Error processing the Excel file. Please check the file format and try again.'
      });
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessage = (content: string) => {
    return content.split('\n').map((line, index) => (
      <div key={index} style={{ marginBottom: '4px' }}>
        {line.startsWith('**') && line.endsWith('**') ? (
          <strong>{line.slice(2, -2)}</strong>
        ) : line.startsWith('•') ? (
          <div style={{ marginLeft: '20px' }}>• {line.slice(1)}</div>
        ) : (
          line
        )}
      </div>
    ));
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      backgroundColor: theme.background,
      color: theme.text
    }}>
      {/* Header */}
      <div style={{
        padding: '20px',
        borderBottom: `1px solid ${theme.inputBorder}`,
        backgroundColor: theme.cardBackground
      }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
          🔍 Advanced Search & Chatbot
        </h1>
        <p style={{ margin: '8px 0 0 0', opacity: 0.8 }}>
          Upload Excel files, ask questions, and generate HSC codes
        </p>
      </div>

      {/* Messages Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        {messages.map((message, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
              marginBottom: '16px'
            }}
          >
            <div style={{
              maxWidth: '70%',
              padding: '12px 16px',
              borderRadius: '12px',
              backgroundColor: message.role === 'user' ? theme.buttonBackground : theme.cardBackground,
              color: message.role === 'user' ? theme.buttonColor : theme.text,
              border: `1px solid ${theme.inputBorder}`,
              whiteSpace: 'pre-wrap'
            }}>
              {message.fileName && (
                <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>
                  📎 {message.fileName}
                </div>
              )}
              {formatMessage(message.content)}
              {message.fileUrl && (
                <div style={{ marginTop: '12px' }}>
                  <a
                    href={message.fileUrl}
                    download={message.fileName}
                    style={{
                      color: theme.buttonBackground,
                      textDecoration: 'none',
                      padding: '8px 12px',
                      border: `1px solid ${theme.buttonBackground}`,
                      borderRadius: '6px',
                      display: 'inline-block'
                    }}
                  >
                    📥 Download File
                  </a>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{
            display: 'flex',
            justifyContent: 'flex-start',
            marginBottom: '16px'
          }}>
            <div style={{
              padding: '12px 16px',
              borderRadius: '12px',
              backgroundColor: theme.cardBackground,
              border: `1px solid ${theme.inputBorder}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="spinner" style={{
                  width: '16px',
                  height: '16px',
                  border: `2px solid ${theme.inputBorder}`,
                  borderTop: `2px solid ${theme.buttonBackground}`,
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                Processing...
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{
        padding: '20px',
        borderTop: `1px solid ${theme.inputBorder}`,
        backgroundColor: theme.cardBackground
      }}>
              {/* File Upload and Quick Actions */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '8px' }}>
          <input
            type="file"
            accept=".xlsx"
            onChange={handleFileUpload}
            style={{
              display: 'none'
            }}
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            style={{
              display: 'inline-block',
              padding: '10px 16px',
              backgroundColor: theme.buttonBackground,
              color: theme.buttonColor,
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            📁 Upload Excel File
          </label>
          {uploadedRows.length > 0 && (
            <button
              onClick={generateHSCForAll}
              disabled={loading}
              style={{
                padding: '10px 16px',
                backgroundColor: loading ? theme.inputBorder : '#28a745',
                color: theme.buttonColor,
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              🚀 Generate All HSC Codes
            </button>
          )}
        </div>
        {uploadedRows.length > 0 && (
          <div style={{ fontSize: '14px', opacity: 0.8 }}>
            📊 {uploadedRows.length} products loaded • 
            {uploadedRows.filter(r => r.hsc_code && r.hsc_code !== 'Error').length} with HSC codes
          </div>
        )}
      </div>

        {/* Message Input */}
        <div style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-end'
        }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything about your products or type 'generate HSC code for all'..."
            style={{
              flex: 1,
              minHeight: '44px',
              maxHeight: '120px',
              padding: '12px',
              borderRadius: '8px',
              border: `1px solid ${theme.inputBorder}`,
              backgroundColor: theme.inputBackground,
              color: theme.text,
              fontSize: '14px',
              resize: 'vertical',
              fontFamily: 'inherit'
            }}
            rows={1}
          />
          <button
            onClick={handleSendMessage}
            disabled={loading || !input.trim()}
            style={{
              padding: '12px 20px',
              backgroundColor: loading || !input.trim() ? theme.inputBorder : theme.buttonBackground,
              color: theme.buttonColor,
              border: 'none',
              borderRadius: '8px',
              cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Send
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AdvancedSearch; 
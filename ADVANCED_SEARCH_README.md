# Advanced Search & Chatbot Feature

## Overview
The Advanced Search feature provides a powerful chatbot interface for processing Excel files and generating HSC codes in bulk. This feature enhances the existing HSC classification application with intelligent file processing and conversational AI capabilities.

## Features

### 🔍 **Advanced Search Interface**
- **Chatbot Interface**: Natural language interaction for file processing and HSC code generation
- **Excel File Upload**: Drag-and-drop or click-to-upload Excel files
- **Real-time Processing**: Live feedback during file processing and HSC code generation
- **Progress Tracking**: Visual indicators for processing status

### 📊 **Smart File Processing**
- **Automatic Column Detection**: Intelligently identifies product description columns
- **Batch Processing**: Process multiple products simultaneously
- **Error Handling**: Graceful handling of processing errors with detailed feedback
- **Data Validation**: Ensures file format and data quality

### 🤖 **Intelligent Chatbot Commands**
- **"Generate HSC code for all"**: Process all products in uploaded file
- **"Analyze my data"**: Get insights and statistics about your data
- **"Export data"**: Download processed results in Excel format
- **Natural Language Queries**: Ask questions about your products and classifications

### 📈 **Data Analysis & Insights**
- **Success Rate Tracking**: Monitor HSC code generation success rates
- **Confidence Scoring**: Track classification confidence levels
- **Statistical Reports**: Get detailed analysis of your data
- **Recommendations**: Receive suggestions for improving classifications

### 🚀 **Performance Optimizations**
- **Bulk API Endpoint**: New `/bulk-hsc` endpoint for efficient batch processing
- **Parallel Processing**: Handle multiple requests simultaneously
- **Caching**: Optimized response times for repeated queries
- **Memory Management**: Efficient handling of large datasets

## Usage Guide

### 1. **Accessing Advanced Search**
- Click the "🔍 Advanced Search" button in the sidebar
- Switch between regular chat and advanced search modes

### 2. **Uploading Files**
- Click "📁 Upload Excel File" button
- Ensure your Excel file has a column with product descriptions
- Supported formats: `.xlsx` files
- Column names: "Description", "Product", or "Name"

### 3. **Generating HSC Codes**
- **Method 1**: Click "🚀 Generate All HSC Codes" button
- **Method 2**: Type "generate HSC code for all" in the chat
- **Method 3**: Ask specific questions about individual products

### 4. **Analyzing Data**
- Type "analyze my data" to get insights
- View success rates, confidence levels, and recommendations
- Get suggestions for improving classifications

### 5. **Exporting Results**
- Type "export data" or "download results"
- Download processed Excel files with HSC codes
- Files include: Description, HSC Code, Confidence, Category, Title

## Technical Implementation

### Backend Enhancements
```python
# New bulk processing endpoint
@app.post("/bulk-hsc")
async def bulk_hsc_generation(
    descriptions: List[str],
    country: str = "US"
):
    """Generate HSC codes for multiple descriptions in batch"""
```

### Frontend Components
- **AdvancedSearch.tsx**: Main component with chatbot interface
- **File Upload**: Drag-and-drop Excel file processing
- **Progress Tracking**: Real-time status updates
- **Data Visualization**: Charts and statistics display

### Key Features
- **TypeScript Interfaces**: Strong typing for data structures
- **Error Handling**: Comprehensive error management
- **Responsive Design**: Works on desktop and mobile devices
- **Theme Support**: Dark/light mode compatibility

## API Endpoints

### New Endpoints
- `POST /bulk-hsc`: Batch HSC code generation
- Enhanced `/ask`: Improved QA capabilities
- Enhanced `/upload-excel`: Better file processing

### Request/Response Formats
```typescript
// Bulk HSC Request
{
  descriptions: string[],
  country: string
}

// Bulk HSC Response
{
  results: BulkHSCResult[],
  total_processed: number,
  successful: number
}
```

## Benefits

### For Users
- **Faster Processing**: Bulk operations reduce processing time
- **Better UX**: Intuitive chatbot interface
- **Comprehensive Analysis**: Detailed insights and recommendations
- **Flexible Export**: Multiple export formats and options

### For Developers
- **Modular Architecture**: Easy to extend and maintain
- **Type Safety**: Full TypeScript support
- **Error Handling**: Robust error management
- **Performance**: Optimized for large datasets

## Future Enhancements

### Planned Features
- **Real-time Collaboration**: Multi-user file processing
- **Advanced Analytics**: Machine learning insights
- **Custom Templates**: User-defined export formats
- **API Integration**: Third-party system connections
- **Mobile App**: Native mobile application

### Technical Improvements
- **WebSocket Support**: Real-time updates
- **Caching Layer**: Redis integration for performance
- **Microservices**: Service-oriented architecture
- **Containerization**: Docker deployment support

## Troubleshooting

### Common Issues
1. **File Upload Errors**: Ensure Excel format (.xlsx) and proper column names
2. **Processing Failures**: Check internet connection and API availability
3. **Slow Performance**: Large files may take longer to process
4. **Export Issues**: Verify browser download permissions

### Support
- Check browser console for error messages
- Verify file format and structure
- Contact support for persistent issues

## Conclusion

The Advanced Search feature transforms the HSC classification application into a comprehensive, intelligent platform for bulk processing and analysis. With its chatbot interface, smart file processing, and detailed analytics, users can efficiently handle large datasets and gain valuable insights into their HSC classifications. 
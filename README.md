# ISEE Vocabulary Quiz - Enhanced Multi-Word-List Version

## Overview
This enhanced version of the ISEE Vocabulary Quiz supports three different word lists:
1. **Original** - The original 300 words (standard difficulty)
2. **Enhanced Set 1** - 300 new words at standard difficulty
3. **Enhanced Set 2** - 300 new words at advanced/harder difficulty

## Files Included

### Core Application Files
- `isee_vocab.html` - Main HTML file with word list dropdown selector
- `isee_app.js` - Enhanced application logic with multi-list support and analytics
- `isee_styles.css` - CSS styling (unchanged from original)

### Data Files
- `isee_vocab_data.js` - Original 300 words (keep your existing file)
- `isee_vocab_enhanced1.js` - Template for enhanced set 1 (standard difficulty)
- `isee_vocab_enhanced2.js` - Template for enhanced set 2 (advanced difficulty)

## Implementation Instructions

### Step 1: Update Your Enhanced Data Files
You mentioned you already generated `isee_vocab_enhanced1.js` and `isee_vocab_enhanced2.js`. 
Update these files to follow this structure:

```javascript
// For isee_vocab_enhanced1.js:
window.DEFINITIONS_ENHANCED1 = {
  WORD1: "definition — Example: example sentence.",
  WORD2: "definition — Example: example sentence.",
  // ... all 300 words
};

window.QUESTIONS_ENHANCED1 = [
  { number: 1, word: "WORD1", choices: { A:"...", B:"...", C:"...", D:"..." }, answer:"C" },
  { number: 2, word: "WORD2", choices: { A:"...", B:"...", C:"...", D:"..." }, answer:"B" },
  // ... all 300 questions
];

window.__VOCAB_ENHANCED1_LOADED__ = true;
```

```javascript
// For isee_vocab_enhanced2.js:
window.DEFINITIONS_ENHANCED2 = {
  WORD1: "definition — Example: example sentence.",
  WORD2: "definition — Example: example sentence.",
  // ... all 300 words
};

window.QUESTIONS_ENHANCED2 = [
  { number: 1, word: "WORD1", choices: { A:"...", B:"...", C:"...", D:"..." }, answer:"C" },
  { number: 2, word: "WORD2", choices: { A:"...", B:"...", C:"...", D:"..." }, answer:"B" },
  // ... all 300 questions
];

window.__VOCAB_ENHANCED2_LOADED__ = true;
```

### Step 2: Keep Your Original Data File
Your existing `isee_vocab_data.js` should remain unchanged with:
```javascript
window.DEFINITIONS = { ... };
window.QUESTIONS = [ ... ];
```

### Step 3: Upload All Files
Upload these files to your web hosting:
1. `isee_vocab.html`
2. `isee_app.js`
3. `isee_styles.css` (your existing file)
4. `isee_vocab_data.js` (your existing file with original 300 words)
5. `isee_vocab_enhanced1.js` (your new file with 300 standard-difficulty words)
6. `isee_vocab_enhanced2.js` (your new file with 300 advanced-difficulty words)

## Key Changes from Original

### User Interface
- **New Word List Dropdown**: Users must now select both a user AND a word list before building a quiz
- **Enhanced Status Messages**: Shows selected user and word list in the status area
- **Build Button Validation**: Disabled until both user and word list are selected

### Analytics Enhancement
The word list selection is now tracked in Google Sheets analytics:
- **New Column**: `wordList` is added as the LAST column in your Google Sheet
- **All Events Track Word List**: quiz_start, question_answer, and quiz_complete events include the selected word list
- **Values**: "original", "enhanced1", or "enhanced2"

### Data Architecture
- Word lists are isolated in separate namespace variables
- The app dynamically loads the correct definitions and questions based on selection
- All three word lists can coexist without conflicts

## Google Sheets Analytics Update

### New Column
Your Google Sheet will now have a new **last column** named `wordList` with these possible values:
- `original` - User selected the original word list
- `enhanced1` - User selected enhanced set 1 (standard difficulty)
- `enhanced2` - User selected enhanced set 2 (advanced difficulty)

### Why Last Column?
The `wordList` parameter is intentionally added as the last parameter in all analytics calls to ensure:
1. **Backward Compatibility**: Existing data structure remains unchanged
2. **Clean Data**: New column appears at the end without disrupting existing columns
3. **Easy Analysis**: You can filter/analyze performance across different word lists

### Example Google Sheets Row
```
event | sessionId | user | userAgent | referrer | ipAddress | timestamp | numQuestions | ... | wordList
quiz_start | session_123 | Bryant | Mozilla/5.0... | | 1.2.3.4 | 2025-10-15T14:30:00.000Z | 10 | ... | enhanced2
```

## Testing Instructions

### Test Each Word List
1. Open `isee_vocab.html` in a browser
2. Select a user (e.g., "Bryant")
3. Select "Original (Standard)"
4. Build quiz and answer a few questions
5. Check Google Sheets for `wordList: original`
6. Repeat with "Enhanced Set 1" and "Enhanced Set 2"

### Verify Analytics
Check your Google Sheet has these columns (in order):
- event
- sessionId
- user
- userAgent
- referrer
- ipAddress
- timestamp
- (other existing fields)
- **wordList** (new, last column)

## Troubleshooting

### Word List Not Loading
**Problem**: Selected word list shows no questions
**Solution**: 
1. Check browser console for errors
2. Verify `window.DEFINITIONS_ENHANCED1` and `window.QUESTIONS_ENHANCED1` are defined
3. Ensure all script tags load in correct order in HTML
4. Check that variable names match exactly

### Build Button Stays Disabled
**Problem**: Can't click "Build quiz"
**Solution**: 
1. Select both a user AND a word list
2. Check that both dropdowns have valid selections (not placeholder text)

### Analytics Not Recording Word List
**Problem**: `wordList` column is empty in Google Sheets
**Solution**: 
1. Verify `selectedWordList` variable is set when selections change
2. Check browser console for analytics errors
3. Test with a simple word list selection to verify tracking

### Definition Not Showing
**Problem**: Word definitions don't appear after answering
**Solution**: 
1. Verify definitions follow format: `"definition — Example: example sentence."`
2. Check that word keys in DEFINITIONS match word values in QUESTIONS
3. Ensure proper capitalization match

## Browser Compatibility
- Chrome 90+
- Safari 14+
- Firefox 88+
- Edge 90+

## Performance Notes
- All three word list files are loaded on page load (~5-10KB each)
- No performance impact from loading all three lists
- Quiz only uses data from selected list during gameplay
- Audio system compatible with Safari and other browsers

## Future Enhancements
Potential improvements for future versions:
- Allow users to combine words from multiple lists
- Add difficulty indicators in UI
- Track per-word-list performance over time
- Export wrong answers by word list
- Add more word lists (e.g., themed vocabulary sets)

## Questions or Issues?
If you encounter any problems:
1. Check browser console for error messages
2. Verify all files are uploaded and loading correctly
3. Test with original word list first to isolate issues
4. Review Google Sheets to confirm analytics are working

---

**Build Date**: October 15, 2025
**Version**: 2.0 (Multi-Word-List)

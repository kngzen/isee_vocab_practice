# ISEE Quiz Enhanced - Quick Reference

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     User Interface                          │
│  [User Dropdown] [Word List Dropdown] [Build Quiz Button]  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  Application Logic                          │
│                   (isee_app.js)                             │
│                                                             │
│  ┌──────────────────────────────────────────────┐          │
│  │  Word List Selection Logic                   │          │
│  │  • selectedUser = "Bryant"                   │          │
│  │  • selectedWordList = "enhanced2"            │          │
│  └──────────────────────────────────────────────┘          │
│                       │                                     │
│                       ▼                                     │
│  ┌──────────────────────────────────────────────┐          │
│  │  Data Loading (getWordListData)              │          │
│  │  • Load DEFINITIONS_ENHANCED2                │          │
│  │  • Load QUESTIONS_ENHANCED2                  │          │
│  └──────────────────────────────────────────────┘          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    Data Files                               │
│                                                             │
│  ┌────────────────┐  ┌──────────────────┐  ┌─────────────┐│
│  │ Original       │  │ Enhanced Set 1   │  │Enhanced Set2││
│  │ isee_vocab_    │  │ isee_vocab_      │  │isee_vocab_  ││
│  │ data.js        │  │ enhanced1.js     │  │enhanced2.js ││
│  │                │  │                  │  │             ││
│  │ DEFINITIONS    │  │ DEFINITIONS_     │  │DEFINITIONS_ ││
│  │ QUESTIONS      │  │ ENHANCED1        │  │ENHANCED2    ││
│  │                │  │ QUESTIONS_       │  │QUESTIONS_   ││
│  │                │  │ ENHANCED1        │  │ENHANCED2    ││
│  │                │  │                  │  │             ││
│  │ 300 words      │  │ 300 words        │  │300 words    ││
│  │ Standard       │  │ Standard         │  │Advanced     ││
│  └────────────────┘  └──────────────────┘  └─────────────┘│
└─────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Google Sheets Analytics                        │
│                                                             │
│  Row: [event | sessionId | user | ... | wordList]          │
│       [quiz_start | sess_123 | Bryant | ... | enhanced2]   │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

```
User Action → Selection Validation → Data Loading → Quiz Display → Answer Submission → Analytics Tracking
     ↓              ↓                     ↓              ↓               ↓                  ↓
Select User   Both selected?     Load correct    Show question   Track correct/     Send to Google
Select List   Enable Build       DEFINITIONS     & choices       incorrect         Sheets with
              button             & QUESTIONS                                        wordList param
```

## Word List Options

| Option | Internal Value | Difficulty | Variable Names |
|--------|---------------|------------|----------------|
| Original (Standard) | `original` | Standard | `DEFINITIONS`, `QUESTIONS` |
| Enhanced Set 1 (Standard) | `enhanced1` | Standard | `DEFINITIONS_ENHANCED1`, `QUESTIONS_ENHANCED1` |
| Enhanced Set 2 (Advanced) | `enhanced2` | Advanced | `DEFINITIONS_ENHANCED2`, `QUESTIONS_ENHANCED2` |

## Variable Naming Convention

```javascript
// Original Word List
window.DEFINITIONS = { WORD: "def — Example: sentence.", ... };
window.QUESTIONS = [ { number: 1, word: "WORD", choices: {...}, answer: "C" }, ... ];

// Enhanced Set 1
window.DEFINITIONS_ENHANCED1 = { WORD: "def — Example: sentence.", ... };
window.QUESTIONS_ENHANCED1 = [ { number: 1, word: "WORD", choices: {...}, answer: "C" }, ... ];

// Enhanced Set 2
window.DEFINITIONS_ENHANCED2 = { WORD: "def — Example: sentence.", ... };
window.QUESTIONS_ENHANCED2 = [ { number: 1, word: "WORD", choices: {...}, answer: "C" }, ... ];
```

## Analytics Parameters

### All Events Include:
```
Standard Parameters:
- event (quiz_start | question_answer | quiz_complete)
- sessionId (unique session identifier)
- user (selected user name)
- userAgent (browser info)
- referrer (referring page)
- ipAddress (user IP)
- timestamp (ISO timestamp)

NEW: wordList (always last parameter)
- Values: "original" | "enhanced1" | "enhanced2"
```

### Event-Specific Parameters:

**quiz_start**
```javascript
{
  event: 'quiz_start',
  numQuestions: 10,
  shuffleChoices: true,
  wordList: 'enhanced2'  // NEW - last param
}
```

**question_answer**
```javascript
{
  event: 'question_answer',
  questionNumber: 5,
  word: 'ELOQUENT',
  correct: true,
  selectedAnswer: 'B',
  correctAnswer: 'B',
  wordList: 'enhanced2'  // NEW - last param
}
```

**quiz_complete**
```javascript
{
  event: 'quiz_complete',
  numQuestions: 10,
  shuffleChoices: true,
  score: 8,
  accuracy: 80,
  timeSpent: 120,
  questionsAnswered: 10,
  wordList: 'enhanced2'  // NEW - last param
}
```

## Google Sheets Column Order

```
Column Order (wordList is LAST):
┌──────┬───────────┬──────┬───────────┬──────────┬───────────┬───────────┬─────────┬──────────┐
│event │ sessionId │ user │ userAgent │ referrer │ ipAddress │ timestamp │   ...   │ wordList │
├──────┼───────────┼──────┼───────────┼──────────┼───────────┼───────────┼─────────┼──────────┤
│start │ sess_123  │Bryant│ Chrome... │          │ 1.2.3.4   │2025-10... │   ...   │enhanced2 │
├──────┼───────────┼──────┼───────────┼──────────┼───────────┼───────────┼─────────┼──────────┤
│answer│ sess_123  │Bryant│ Chrome... │          │ 1.2.3.4   │2025-10... │   ...   │enhanced2 │
└──────┴───────────┴──────┴───────────┴──────────┴───────────┴───────────┴─────────┴──────────┘
                                                                                         ↑
                                                                                    Last Column
```

## File Dependencies

```
HTML loads these scripts in order:
1. isee_vocab_data.js       (defines DEFINITIONS & QUESTIONS)
2. isee_vocab_enhanced1.js  (defines DEFINITIONS_ENHANCED1 & QUESTIONS_ENHANCED1)
3. isee_vocab_enhanced2.js  (defines DEFINITIONS_ENHANCED2 & QUESTIONS_ENHANCED2)
4. isee_app.js              (uses all of the above)
```

## Build Button Logic

```
Build Button Enabled When:
  ✓ User selected (not empty)
  AND
  ✓ Word List selected (not empty)

Build Button Disabled When:
  ✗ User not selected
  OR
  ✗ Word List not selected
```

## Status Messages

```
State 1: Initial
└─ "Ready. Please select a user and word list first."
   Build Button: DISABLED

State 2: User only
└─ "User: Bryant. Please select a word list."
   Build Button: DISABLED

State 3: Word List only
└─ "Word List: Enhanced Set 2 (Advanced). Please select a user."
   Build Button: DISABLED

State 4: Both selected
└─ "User: Bryant | Word List: Enhanced Set 2 (Advanced). Ready to build quiz."
   Build Button: ENABLED

State 5: Quiz built
└─ "User: Bryant | Word List: Enhanced Set 2 (Advanced). Using 10 question(s) out of 300. Randomized order."
   Quiz Section: VISIBLE
```

## Quick Debugging

### Check if word lists are loaded:
```javascript
// In browser console:
console.log('Original:', typeof window.DEFINITIONS, typeof window.QUESTIONS);
console.log('Enhanced1:', typeof window.DEFINITIONS_ENHANCED1, typeof window.QUESTIONS_ENHANCED1);
console.log('Enhanced2:', typeof window.DEFINITIONS_ENHANCED2, typeof window.QUESTIONS_ENHANCED2);

// Should all show: object object
```

### Check selected values:
```javascript
// In browser console after making selections:
console.log('User:', selectedUser);
console.log('Word List:', selectedWordList);
```

### Check current quiz data:
```javascript
// In browser console during quiz:
console.log('Questions:', QUIZ.length);
console.log('Definitions:', Object.keys(CURRENT_DEFINITIONS).length);
console.log('Current word list:', selectedWordList);
```

## Common Patterns

### Adding a New Word List
1. Create `isee_vocab_enhanced3.js`
2. Define `window.DEFINITIONS_ENHANCED3` and `window.QUESTIONS_ENHANCED3`
3. Add script tag to HTML before `isee_app.js`
4. Update dropdown in HTML: `<option value="enhanced3">Enhanced Set 3</option>`
5. Update `getWordListData()` function in `isee_app.js`
6. Update `getWordListDisplayName()` function in `isee_app.js`

### Changing Analytics URL
```javascript
// In isee_app.js, line ~8:
const ANALYTICS_URL = 'https://script.google.com/macros/s/YOUR_NEW_URL/exec';
```

### Disabling Analytics
```javascript
// In isee_app.js, line ~7:
const ANALYTICS_URL = ''; // Empty string disables tracking
```

---

**Quick Start**: Select user → Select word list → Build quiz → Answer questions
**Analytics**: All events automatically include wordList as last parameter
**Data Files**: Three separate JS files, each with 300 words

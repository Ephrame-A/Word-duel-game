# Word Duel ⚔️

A high-performance word chain game built with Python Flask, leveraging Trie data structures for efficient word operations.

## Features

- **Trie-Powered Gameplay**: Utilizes prefix trees for instant word validation and AI moves
- **Dual Difficulty Modes**: 
  - Easy: Chain words by last letter
  - Hard: Chain words by last two letters
- **Competitive Mechanics**:
  - Score based on word length
  - Time bonuses for quick responses
  - Penalties for invalid words
- **Persistent High Scores**: Local storage of best performance
## Performance Comparison

| Operation        | Complexity (List) | Complexity (Trie) | Real-world Performance (274k words) |
|-----------------|------------------|------------------|------------------------------------|
| Word Validation | O(n)             | O(k)             | 274,000 ops → 8 ops                |
| Prefix Search   | O(n)             | O(k + m)         | Full scan → Direct traversal       |

*Where:*
- *k = word length (avg 8-10)*
- *n = dictionary size (274,000 words)*
- *m = number of matching words*

## Installation and setup
# 1. Clone repository
git clone https://github.com/Ephrame-A/Word-duel-game
cd word-duel-game

# 2. Install dependencies
pip install flask

# 3. Launch game
python app.py

# 4. Words
I used Jeremy Rifkin's Wordlist which have over 274k words
https://github.com/jeremy-rifkin/Wordlist/blob/master/res/e.txt


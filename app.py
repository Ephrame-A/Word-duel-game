# app.py

from flask import Flask, render_template, request, jsonify
import random
import os
from trie import Trie  

# --- Flask Application ---
app = Flask(__name__)

trie = Trie()
DICTIONARY_FILE = 'words.txt'
HIGHSCORE_FILE = 'highscore.txt'

def load_dictionary():
    # Get the absolute path to the script's directory for a robust file path
    base_dir = os.path.dirname(os.path.abspath(__file__))
    file_path = os.path.join(base_dir, DICTIONARY_FILE)
    
    try:
        with open(file_path, 'r') as file:
            words = [word.strip().lower() for word in file if len(word.strip()) > 2]
            for word in words:
                trie.insert(word)
        print(f"Loaded {len(words)} words into the Trie.")
        return words
    except FileNotFoundError:
        print(f"Error: {DICTIONARY_FILE} not found. Please place it in the same folder as app.py.")
        return []

def get_highscore():
    if os.path.exists(HIGHSCORE_FILE):
        with open(HIGHSCORE_FILE, 'r') as file:
            try:
                return int(file.read())
            except (ValueError, IndexError):
                return 0
    return 0

def update_highscore(score):
    current_highscore = get_highscore()
    if score > current_highscore:
        with open(HIGHSCORE_FILE, 'w') as file:
            file.write(str(score))
        return True
    return False

game_state = {
    'previous_word': '',
    'game_over': True,
    'last_prefix': '',
    'current_time_remaining': 0,
    'score': 0,
    'played_words': set(),
    'difficulty': 'easy',
    'hints_remaining': 2
}

all_words = load_dictionary()

@app.route('/')
def index():
    highscore = get_highscore()
    return render_template('index.html', highscore=highscore)

@app.route('/start_game', methods=['POST'])
def start_game():
    if not all_words:
        return jsonify({'error': 'Dictionary not loaded.'}), 500
    
    difficulty = request.json.get('difficulty', 'easy')
    
    time_limits = {'easy': 45, 'hard': 30}
    initial_time_limit = time_limits.get(difficulty, 45)
    
    first_word = random.choice(all_words)

    # Completely reset game state for a new game
    game_state['difficulty'] = difficulty
    game_state['previous_word'] = first_word
    game_state['game_over'] = False
    game_state['last_prefix'] = first_word[-1:]
    game_state['score'] = 0
    game_state['played_words'] = {first_word}
    game_state['current_time_remaining'] = initial_time_limit
    game_state['hints_remaining'] = 2

    return jsonify({
        'status': 'success',
        'word': first_word,
        'next_turn': 'user',
        'time_limit': initial_time_limit,
        'score': game_state['score'],
        'prefix': game_state['last_prefix'],
        'hints_remaining': game_state['hints_remaining']
    })

@app.route('/user_turn', methods=['POST'])
def user_turn():
    user_word = request.json.get('word', '').lower()
    last_prefix = game_state['last_prefix']
    
    time_remaining_from_client = request.json.get('time_remaining')
    if time_remaining_from_client is not None:
        game_state['current_time_remaining'] = time_remaining_from_client

    if game_state['current_time_remaining'] <= 0:
        game_state['game_over'] = True
        did_break_highscore = update_highscore(game_state['score'])
        return jsonify({
            'status': 'timeout',
            'message': 'Time\'s up! You lose.',
            'final_score': game_state['score'],
            'new_highscore': did_break_highscore
        })
    
    if not user_word.startswith(last_prefix):
        game_state['current_time_remaining'] -= 5
        return jsonify({
            'status': 'invalid',
            'message': f"Your word must start with '{last_prefix.upper()}', not '{user_word[:len(last_prefix)]}'.",
            'new_time_remaining': max(0, game_state['current_time_remaining']),
            'penalty_message': f"-5s penalty for incorrect start letters.",
            'new_score': game_state['score']
        })
    
    if not trie.search(user_word):
        game_state['current_time_remaining'] -= 5
        return jsonify({
            'status': 'invalid',
            'message': f"'{user_word}' is not in the dictionary.",
            'new_time_remaining': max(0, game_state['current_time_remaining']),
            'penalty_message': f"-5s penalty for a non-existent word.",
            'new_score': game_state['score']
        })

    if user_word in game_state['played_words']:
        game_state['current_time_remaining'] -= 10
        return jsonify({
            'status': 'invalid',
            'message': f"'{user_word}' has already been used. Please try another word.",
            'new_time_remaining': max(0, game_state['current_time_remaining']),
            'penalty_message': f"-10s penalty for a redundant word.",
            'new_score': game_state['score']
        })

    score_earned = len(user_word)
    game_state['score'] += score_earned
    
    time_taken = request.json.get('time_taken', 0)
    time_boost = max(0, 10 - time_taken)
    game_state['current_time_remaining'] = min(60, game_state['current_time_remaining'] + time_boost)

    game_state['previous_word'] = user_word
    
    prefix_length = 2 if game_state['difficulty'] == 'hard' and len(user_word) >= 2 else 1
    game_state['last_prefix'] = user_word[-prefix_length:]

    game_state['played_words'].add(user_word)

    return jsonify({
        'status': 'success',
        'word': user_word,
        'next_turn': 'program',
        'score_earned': score_earned,
        'new_score': game_state['score'],
        'time_boost': round(time_boost, 2),
        'new_time_remaining': round(game_state['current_time_remaining']),
        'prefix': game_state['last_prefix']
    })

@app.route('/program_turn', methods=['POST'])
def program_turn():
    if game_state['game_over']:
        return jsonify({'status': 'game_over', 'message': 'Game has ended.'})

    last_prefix = game_state['last_prefix']
    
    program_word = trie.get_next_word(last_prefix, game_state['played_words'])

    if not program_word:
        game_state['game_over'] = True
        did_break_highscore = update_highscore(game_state['score'])
        return jsonify({
            'status': 'program_loses',
            'message': f"No words starting with '{last_prefix.upper()}' found. You win!",
            'final_score': game_state['score'],
            'new_highscore': did_break_highscore
        })

    game_state['previous_word'] = program_word
    
    prefix_length = 2 if game_state['difficulty'] == 'hard' and len(program_word) >= 2 else 1
    game_state['last_prefix'] = program_word[-prefix_length:]
    
    game_state['played_words'].add(program_word)

    return jsonify({
        'status': 'success',
        'word': program_word,
        'next_turn': 'user',
        'new_time_remaining': round(game_state['current_time_remaining']),
        'prefix': game_state['last_prefix'],
        'hints_remaining': game_state['hints_remaining']
    })

@app.route('/interrupt_game', methods=['POST'])
def interrupt_game():
    game_state['game_over'] = True
    final_score = game_state['score']
    did_break_highscore = update_highscore(final_score)
    return jsonify({
        'status': 'interrupted',
        'message': 'Game interrupted by user.',
        'final_score': final_score,
        'new_highscore': did_break_highscore
    })

@app.route('/get_hint', methods=['POST'])
def get_hint():
    if game_state['hints_remaining'] > 0:
        last_prefix = game_state['last_prefix']
        available_words = trie.get_all_words_with_prefix(last_prefix)
        unplayed_words = [word for word in available_words if word not in game_state['played_words']]
        
        if unplayed_words:
            # Provide a random hint from the available words
            hint = random.choice(unplayed_words)
            game_state['hints_remaining'] -= 1
            return jsonify({
                'status': 'success',
                'hint': hint,
                'hints_remaining': game_state['hints_remaining']
            })
        else:
            return jsonify({
                'status': 'no_words',
                'message': 'No words found for this prefix.'
            })
    else:
        return jsonify({
            'status': 'no_hints',
            'message': 'No hints remaining.'
        })


if __name__ == '__main__':
    app.run(debug=True)
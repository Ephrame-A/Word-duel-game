# trie.py

import random

class TrieNode:
    """A node in the Trie data structure."""
    def __init__(self):
        self.children = {}
        self.is_end_of_word = False

class Trie:
    """The Trie data structure."""
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word: str):
        """Inserts a word into the Trie."""
        node = self.root
        for char in word:
            if char not in node.children:
                node.children[char] = TrieNode()
            node = node.children[char]
        node.is_end_of_word = True

    def search(self, word: str) -> bool:
        """Checks if a word exists in the Trie."""
        node = self.root
        for char in word:
            if char not in node.children:
                return False
            node = node.children[char]
        return node.is_end_of_word

    def _get_all_words_from_node(self, node, prefix: str, words: list):
        """Helper function to find all words from a given node."""
        if node.is_end_of_word:
            words.append(prefix)
        for char, child_node in node.children.items():
            self._get_all_words_from_node(child_node, prefix + char, words)

    def get_all_words_with_prefix(self, prefix: str) -> list:
        """Returns a list of all words that start with the given prefix."""
        node = self.root
        for char in prefix:
            if char not in node.children:
                return []
            node = node.children[char]
        
        all_possible_words = []
        self._get_all_words_from_node(node, prefix, all_possible_words)
        return all_possible_words

    def get_next_word(self, prefix: str, played_words: set) -> str:
        """
        Finds a valid, unplayed word starting with the prefix.
        It returns a word as soon as it finds one, avoiding a long search.
        """
        all_possible_words = self.get_all_words_with_prefix(prefix)
        
        # Filter out already played words
        available_words = [word for word in all_possible_words if word not in played_words]

        # Return a random word from the available list for variety
        if available_words:
            return random.choice(available_words)
        
        # If no words are found, return an empty string
        return ""
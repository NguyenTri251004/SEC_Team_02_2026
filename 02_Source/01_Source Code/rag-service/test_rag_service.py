import unittest

from main import deterministic_embedding, lexical_overlap_score, split_text


class RagServiceCoreTests(unittest.TestCase):
    def test_deterministic_embedding_is_stable(self) -> None:
        first = deterministic_embedding("quarantine lots")
        second = deterministic_embedding("quarantine lots")
        self.assertEqual(len(first), len(second))
        self.assertEqual(first, second)

    def test_split_text_respects_chunking(self) -> None:
        text = "A" * 2500
        chunks = split_text(text, chunk_size=900, overlap=150)
        self.assertGreaterEqual(len(chunks), 3)
        self.assertTrue(all(len(chunk) <= 900 for chunk in chunks))

    def test_lexical_overlap_score_non_zero_for_similar_terms(self) -> None:
        score = lexical_overlap_score("lots in quarantine", "The lots remain in quarantine area")
        self.assertGreater(score, 0)


if __name__ == "__main__":
    unittest.main()

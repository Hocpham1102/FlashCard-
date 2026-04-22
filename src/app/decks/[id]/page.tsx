"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface Deck {
  _id: string;
  title: string;
  description: string;
  cardCount: number;
  createdAt: string;
  updatedAt: string;
}

interface CardItem {
  _id: string;
  deckId: string;
  front: string;
  back: string;
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReview: string;
  createdAt: string;
}

export default function DeckDetailPage() {
  const params = useParams();
  const router = useRouter();
  const deckId = params.id as string;

  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<CardItem[]>([]);
  const [deckLoading, setDeckLoading] = useState(true);
  const [cardsLoading, setCardsLoading] = useState(true);
  const [deckError, setDeckError] = useState<string | null>(null);
  const [cardsError, setCardsError] = useState<string | null>(null);

  const [isEditingDeck, setIsEditingDeck] = useState(false);
  const [editDeckTitle, setEditDeckTitle] = useState("");
  const [editDeckDescription, setEditDeckDescription] = useState("");
  const [isSavingDeck, setIsSavingDeck] = useState(false);
  const [isDeletingDeck, setIsDeletingDeck] = useState(false);

  const [newFront, setNewFront] = useState("");
  const [newBack, setNewBack] = useState("");
  const [isAddingCard, setIsAddingCard] = useState(false);

  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editCardFront, setEditCardFront] = useState("");
  const [editCardBack, setEditCardBack] = useState("");
  const [isSavingCard, setIsSavingCard] = useState(false);
  const [isDeletingCardId, setIsDeletingCardId] = useState<string | null>(null);

  const fetchDeck = useCallback(async () => {
    setDeckLoading(true);
    setDeckError(null);
    try {
      const res = await fetch(`/api/decks/${deckId}`);
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("Deck not found");
        }
        throw new Error("Failed to fetch deck");
      }
      const data: Deck = await res.json();
      setDeck(data);
      setEditDeckTitle(data.title);
      setEditDeckDescription(data.description || "");
    } catch (err) {
      setDeckError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setDeckLoading(false);
    }
  }, [deckId]);

  const fetchCards = useCallback(async () => {
    setCardsLoading(true);
    setCardsError(null);
    try {
      const res = await fetch(`/api/decks/${deckId}/cards`);
      if (!res.ok) {
        throw new Error("Failed to fetch cards");
      }
      const data: CardItem[] = await res.json();
      setCards(data);
    } catch (err) {
      setCardsError(
        err instanceof Error ? err.message : "Something went wrong",
      );
    } finally {
      setCardsLoading(false);
    }
  }, [deckId]);

  useEffect(() => {
    if (!deckId) return;
    fetchDeck();
    fetchCards();
  }, [deckId, fetchDeck, fetchCards]);

  async function handleSaveDeck() {
    if (!editDeckTitle.trim()) return;
    setIsSavingDeck(true);
    try {
      const res = await fetch(`/api/decks/${deckId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editDeckTitle.trim(),
          description: editDeckDescription.trim(),
        }),
      });
      if (!res.ok) {
        throw new Error("Failed to update deck");
      }
      const updated: Deck = await res.json();
      setDeck(updated);
      setIsEditingDeck(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSavingDeck(false);
    }
  }

  function handleCancelEditDeck() {
    if (deck) {
      setEditDeckTitle(deck.title);
      setEditDeckDescription(deck.description || "");
    }
    setIsEditingDeck(false);
  }

  async function handleDeleteDeck() {
    if (
      !window.confirm(
        "Are you sure you want to delete this deck? All cards will be removed.",
      )
    ) {
      return;
    }
    setIsDeletingDeck(true);
    try {
      const res = await fetch(`/api/decks/${deckId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error("Failed to delete deck");
      }
      router.push("/");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong");
      setIsDeletingDeck(false);
    }
  }

  async function handleAddCard(e: React.FormEvent) {
    e.preventDefault();
    if (!newFront.trim() || !newBack.trim()) return;
    setIsAddingCard(true);
    try {
      const res = await fetch(`/api/decks/${deckId}/cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ front: newFront.trim(), back: newBack.trim() }),
      });
      if (!res.ok) {
        throw new Error("Failed to add card");
      }
      setNewFront("");
      setNewBack("");
      await fetchCards();
      if (deck) {
        setDeck({ ...deck, cardCount: deck.cardCount + 1 });
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsAddingCard(false);
    }
  }

  function startEditCard(card: CardItem) {
    setEditingCardId(card._id);
    setEditCardFront(card.front);
    setEditCardBack(card.back);
  }

  function cancelEditCard() {
    setEditingCardId(null);
    setEditCardFront("");
    setEditCardBack("");
  }

  async function handleSaveCard(cardId: string) {
    if (!editCardFront.trim() || !editCardBack.trim()) return;
    setIsSavingCard(true);
    try {
      const res = await fetch(`/api/cards/${cardId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          front: editCardFront.trim(),
          back: editCardBack.trim(),
        }),
      });
      if (!res.ok) {
        throw new Error("Failed to update card");
      }
      setEditingCardId(null);
      await fetchCards();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSavingCard(false);
    }
  }

  async function handleDeleteCard(cardId: string) {
    if (!window.confirm("Are you sure you want to delete this card?")) {
      return;
    }
    setIsDeletingCardId(cardId);
    try {
      const res = await fetch(`/api/cards/${cardId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error("Failed to delete card");
      }
      await fetchCards();
      if (deck) {
        setDeck({ ...deck, cardCount: Math.max(0, deck.cardCount - 1) });
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsDeletingCardId(null);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        href="/"
        className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800 mb-6 transition-colors"
      >
        <span className="mr-1">&larr;</span> Back to Home
      </Link>

      {deckLoading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
          <div className="text-gray-500">Loading deck...</div>
        </div>
      )}

      {deckError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-8">
          <p className="font-medium">Error</p>
          <p className="text-sm">{deckError}</p>
          <button
            onClick={fetchDeck}
            className="mt-2 text-sm font-semibold underline hover:text-red-800"
          >
            Retry
          </button>
        </div>
      )}

      {!deckLoading && !deckError && deck && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8 mb-8">
          {isEditingDeck ? (
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="deck-title"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Title
                </label>
                <input
                  id="deck-title"
                  type="text"
                  value={editDeckTitle}
                  onChange={(e) => setEditDeckTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                  placeholder="Deck title"
                />
              </div>
              <div>
                <label
                  htmlFor="deck-description"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Description
                </label>
                <textarea
                  id="deck-description"
                  value={editDeckDescription}
                  onChange={(e) => setEditDeckDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 resize-none"
                  placeholder="Optional description..."
                />
              </div>
              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  onClick={handleSaveDeck}
                  disabled={isSavingDeck || !editDeckTitle.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  {isSavingDeck ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={handleCancelEditDeck}
                  className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 font-semibold py-2 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                    {deck.title}
                  </h1>
                  <p className="text-gray-600">
                    {deck.description || "No description"}
                  </p>
                  <div className="mt-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                      {deck.cardCount} card{deck.cardCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href={`/decks/${deckId}/study`}
                    className="inline-flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  >
                    Study
                  </Link>
                  <button
                    onClick={() => setIsEditingDeck(true)}
                    className="inline-flex items-center justify-center bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 font-semibold py-2 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
                  >
                    Edit
                  </button>
                  <button
                    onClick={handleDeleteDeck}
                    disabled={isDeletingDeck}
                    className="inline-flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-semibold py-2 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 disabled:opacity-50"
                  >
                    {isDeletingDeck ? "Deleting..." : "Delete Deck"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Cards</h2>

        <form
          onSubmit={handleAddCard}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label
                htmlFor="new-front"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Front
              </label>
              <input
                id="new-front"
                type="text"
                value={newFront}
                onChange={(e) => setNewFront(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                placeholder="Front side"
              />
            </div>
            <div>
              <label
                htmlFor="new-back"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Back
              </label>
              <input
                id="new-back"
                type="text"
                value={newBack}
                onChange={(e) => setNewBack(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                placeholder="Back side"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isAddingCard || !newFront.trim() || !newBack.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              {isAddingCard ? "Adding..." : "Add Card"}
            </button>
          </div>
        </form>

        {cardsLoading && (
          <div className="text-gray-500 py-8">Loading cards...</div>
        )}

        {cardsError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            <p className="font-medium">Error</p>
            <p className="text-sm">{cardsError}</p>
            <button
              onClick={fetchCards}
              className="mt-2 text-sm font-semibold underline hover:text-red-800"
            >
              Retry
            </button>
          </div>
        )}

        {!cardsLoading && !cardsError && cards.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-gray-500">
              No cards yet. Add your first card above.
            </p>
          </div>
        )}

        {!cardsLoading && !cardsError && cards.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Front
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Back
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {cards.map((card) => (
                    <tr
                      key={card._id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      {editingCardId === card._id ? (
                        <>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={editCardFront}
                              onChange={(e) => setEditCardFront(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 text-sm"
                              placeholder="Front"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={editCardBack}
                              onChange={(e) => setEditCardBack(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 text-sm"
                              placeholder="Back"
                            />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleSaveCard(card._id)}
                                disabled={
                                  isSavingCard ||
                                  !editCardFront.trim() ||
                                  !editCardBack.trim()
                                }
                                className="text-indigo-600 hover:text-indigo-800 text-sm font-semibold disabled:opacity-50"
                              >
                                {isSavingCard ? "Saving..." : "Save"}
                              </button>
                              <button
                                onClick={cancelEditCard}
                                className="text-gray-600 hover:text-gray-800 text-sm font-semibold"
                              >
                                Cancel
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 text-sm text-gray-900 whitespace-pre-wrap">
                            {card.front}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 whitespace-pre-wrap">
                            {card.back}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-3">
                              <button
                                onClick={() => startEditCard(card)}
                                className="text-indigo-600 hover:text-indigo-800 text-sm font-semibold transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteCard(card._id)}
                                disabled={isDeletingCardId === card._id}
                                className="text-red-600 hover:text-red-800 text-sm font-semibold transition-colors disabled:opacity-50"
                              >
                                {isDeletingCardId === card._id
                                  ? "Deleting..."
                                  : "Delete"}
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
              Total: {cards.length} card{cards.length !== 1 ? "s" : ""}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

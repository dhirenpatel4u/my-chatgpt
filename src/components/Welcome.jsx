export default function Welcome({ onSuggestion }) {
  const suggestions = [
    "Explain quantum computing simply",
    "Write a Python program for a calculator",
    "Give me 5 startup ideas",
    "Help me learn JavaScript",
  ];

  return (
    <div className="welcome">
      <div className="welcome-logo">
        ✦
      </div>

      <h1>How can I help you?</h1>

      <p>
        Ask anything. Your AI assistant is ready.
      </p>

      <div className="suggestions">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() =>
              onSuggestion(suggestion)
            }
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}

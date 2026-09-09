import { useEffect, useRef } from "react";

export default function ChatInput({
  input,
  setInput,
  onSend,
  onStop,
  loading,
}) {
  const textareaRef = useRef(null);

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) return;

    textarea.style.height = "auto";

    textarea.style.height =
      Math.min(textarea.scrollHeight, 180) +
      "px";
  }, [input]);

  function handleKeyDown(event) {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      if (!loading) {
        onSend();
      }
    }
  }

  return (
    <div className="input-container">
      <div className="input-box">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) =>
            setInput(e.target.value)
          }
          onKeyDown={handleKeyDown}
          placeholder="Message My AI..."
          rows={1}
        />

        {loading ? (
          <button
            className="stop-button"
            onClick={onStop}
            title="Stop generating"
          >
            ■
          </button>
        ) : (
          <button
            className="send-button"
            onClick={onSend}
            disabled={!input.trim()}
            title="Send"
          >
            ↑
          </button>
        )}
      </div>

      <div className="input-note">
        My AI can make mistakes. Check important
        information.
      </div>
    </div>
  );
}

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function Message({
  message,
  onCopy,
  onRegenerate,
}) {
  const isUser = message.role === "user";

  return (
    <div
      className={`message-row ${
        isUser ? "user-message" : "assistant-message"
      }`}
    >
      <div className="message-avatar">
        {isUser ? "U" : "✦"}
      </div>

      <div className="message-body">
        <div className="message-role">
          {isUser ? "You" : "My AI"}
        </div>

        <div className="message-text">
          {isUser ? (
            <div className="plain-text">
              {message.content}
            </div>
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({
                  inline,
                  className,
                  children,
                  ...props
                }) {
                  if (inline) {
                    return (
                      <code
                        className="inline-code"
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  }

                  return (
                    <div className="code-wrapper">
                      <div className="code-header">
                        <span>Code</span>

                        <button
                          onClick={() =>
                            onCopy(
                              String(children).replace(
                                /\n$/,
                                ""
                              )
                            )
                          }
                        >
                          Copy
                        </button>
                      </div>

                      <pre className={className}>
                        <code {...props}>
                          {children}
                        </code>
                      </pre>
                    </div>
                  );
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}
        </div>

        {!isUser && !message.streaming && (
          <div className="message-actions">
            <button
              onClick={() =>
                onCopy(message.content)
              }
            >
              Copy
            </button>

            <button onClick={onRegenerate}>
              Regenerate
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Sidebar({
  chats,
  activeChat,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  onRenameChat,
  mobileOpen,
  onClose,
}) {
  return (
    <>
      {mobileOpen && (
        <div
          className="mobile-overlay"
          onClick={onClose}
        />
      )}

      <aside
        className={`sidebar ${
          mobileOpen ? "sidebar-mobile-open" : ""
        }`}
      >
        <div className="sidebar-header">
          <div className="brand">
            <div className="brand-icon">✦</div>
            <span>My AI</span>
          </div>

          <button
            className="close-sidebar"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <button
          className="new-chat-button"
          onClick={onNewChat}
        >
          <span>＋</span>
          New chat
        </button>

        <div className="history-title">
          Chats
        </div>

        <div className="chat-history">
          {chats.length === 0 ? (
            <div className="empty-history">
              No conversations yet
            </div>
          ) : (
            chats.map((chat) => (
              <div
                key={chat.id}
                className={`history-item ${
                  activeChat === chat.id
                    ? "active"
                    : ""
                }`}
              >
                <button
                  className="history-select"
                  onClick={() =>
                    onSelectChat(chat.id)
                  }
                >
                  <span className="history-icon">
                    ◇
                  </span>

                  <span className="history-name">
                    {chat.title || "New chat"}
                  </span>
                </button>

                <div className="history-actions">
                  <button
                    onClick={() =>
                      onRenameChat(chat.id)
                    }
                    title="Rename"
                  >
                    ✎
                  </button>

                  <button
                    onClick={() =>
                      onDeleteChat(chat.id)
                    }
                    title="Delete"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="sidebar-footer">
          <div className="provider">
            <span className="status-dot" />
            APInex connected
          </div>

          <div className="model-small">
            Gemini
          </div>
        </div>
      </aside>
    </>
  );
}

import { useEffect, useRef, useState } from "react";

import Sidebar from "./components/Sidebar";
import Welcome from "./components/Welcome";
import Message from "./components/Message";
import ChatInput from "./components/ChatInput";

const MODEL = "free/gemini-3.8-flash";

const STORAGE_KEY = "my-ai-chats";

function createChat() {
  return {
    id: crypto.randomUUID(),
    title: "New chat",
    messages: [],
    createdAt: Date.now(),
  };
}

function loadChats() {
  try {
    const saved = localStorage.getItem(
      STORAGE_KEY
    );

    if (!saved) {
      return [createChat()];
    }

    const parsed = JSON.parse(saved);

    if (!Array.isArray(parsed) || !parsed.length) {
      return [createChat()];
    }

    return parsed;
  } catch {
    return [createChat()];
  }
}

export default function App() {
  const [chats, setChats] = useState(() =>
    loadChats()
  );

  const [activeChat, setActiveChat] =
    useState(() => chats[0]?.id);

  const [input, setInput] = useState("");

  const [loading, setLoading] =
    useState(false);

  const [mobileSidebar, setMobileSidebar] =
    useState(false);

  const abortController =
    useRef(null);

  const currentChat =
    chats.find(
      (chat) => chat.id === activeChat
    ) || chats[0];

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(chats)
    );
  }, [chats]);

  function updateChat(chatId, updater) {
    setChats((previous) =>
      previous.map((chat) =>
        chat.id === chatId
          ? updater(chat)
          : chat
      )
    );
  }

  function newChat() {
    const chat = createChat();

    setChats((previous) => [
      chat,
      ...previous,
    ]);

    setActiveChat(chat.id);
    setInput("");
    setMobileSidebar(false);
  }

  function selectChat(id) {
    setActiveChat(id);
    setInput("");
    setMobileSidebar(false);
  }

  function deleteChat(id) {
    const remaining = chats.filter(
      (chat) => chat.id !== id
    );

    if (remaining.length === 0) {
      const fresh = createChat();

      setChats([fresh]);
      setActiveChat(fresh.id);
      return;
    }

    setChats(remaining);

    if (activeChat === id) {
      setActiveChat(remaining[0].id);
    }
  }

  function renameChat(id) {
    const chat = chats.find(
      (item) => item.id === id
    );

    if (!chat) return;

    const title = window.prompt(
      "Chat name:",
      chat.title
    );

    if (!title?.trim()) return;

    updateChat(id, (item) => ({
      ...item,
      title: title.trim(),
    }));
  }

  function updateMessage(
    chatId,
    messageIndex,
    content,
    extra = {}
  ) {
    updateChat(chatId, (chat) => {
      const messages = [...chat.messages];

      messages[messageIndex] = {
        ...messages[messageIndex],
        content,
        ...extra,
      };

      return {
        ...chat,
        messages,
      };
    });
  }

  async function sendMessage(
    customText = null
  ) {
    const text =
      customText ?? input.trim();

    if (!text || loading) return;

    if (!currentChat) return;

    const userMessage = {
      role: "user",
      content: text,
    };

    const assistantMessage = {
      role: "assistant",
      content: "",
      streaming: true,
    };

    const oldMessages =
      currentChat.messages;

    const newMessages = [
      ...oldMessages,
      userMessage,
      assistantMessage,
    ];

    const assistantIndex =
      newMessages.length - 1;

    updateChat(
      currentChat.id,
      (chat) => ({
        ...chat,
        title:
          chat.messages.length === 0
            ? text.slice(0, 45)
            : chat.title,
        messages: newMessages,
      })
    );

    setInput("");
    setLoading(true);

    const controller =
      new AbortController();

    abortController.current = controller;

    try {
      const response = await fetch(
        "/api/chat",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: MODEL,
            messages: [
              {
                role: "system",
                content:
                  "You are My AI, a helpful, accurate, friendly AI assistant. Use Markdown when useful.",
              },
              ...oldMessages,
              userMessage,
            ],
          }),
        }
      );

      if (!response.ok) {
        const errorData =
          await response.json().catch(
            () => ({})
          );

        throw new Error(
          errorData.error ||
            `Request failed: ${response.status}`
        );
      }

      if (!response.body) {
        throw new Error(
          "No response stream received."
        );
      }

      const reader =
        response.body.getReader();

      const decoder =
        new TextDecoder();

      let buffer = "";
      let assistantText = "";

      while (true) {
        const { done, value } =
          await reader.read();

        if (done) break;

        buffer += decoder.decode(
          value,
          { stream: true }
        );

        const lines =
          buffer.split("\n");

        buffer =
          lines.pop() || "";

        for (const line of lines) {
          const trimmed =
            line.trim();

          if (!trimmed) continue;

          if (
            !trimmed.startsWith("data:")
          ) {
            continue;
          }

          const data =
            trimmed.slice(5).trim();

          if (data === "[DONE]") {
            continue;
          }

          try {
            const parsed =
              JSON.parse(data);

            const delta =
              parsed.choices?.[0]?.delta
                ?.content;

            if (delta) {
              assistantText += delta;

              updateMessage(
                currentChat.id,
                assistantIndex,
                assistantText,
                {
                  streaming: true,
                }
              );
            }
          } catch {
            // Ignore incomplete SSE chunks.
          }
        }
      }

      updateMessage(
        currentChat.id,
        assistantIndex,
        assistantText ||
          "The model returned an empty response.",
        {
          streaming: false,
        }
      );
    } catch (error) {
      if (
        error.name === "AbortError"
      ) {
        updateMessage(
          currentChat.id,
          assistantIndex,
          "Generation stopped.",
          {
            streaming: false,
          }
        );
      } else {
        updateMessage(
          currentChat.id,
          assistantIndex,
          `Error: ${error.message}`,
          {
            streaming: false,
          }
        );
      }
    } finally {
      setLoading(false);
      abortController.current = null;
    }
  }

  function stopGeneration() {
    abortController.current?.abort();
  }

  function copyText(text) {
    navigator.clipboard
      ?.writeText(text)
      .catch(() => {});
  }

  async function regenerate(
    messageIndex
  ) {
    if (loading) return;

    const chat = currentChat;

    const previousUser =
      chat.messages
        .slice(0, messageIndex)
        .reverse()
        .find(
          (message) =>
            message.role === "user"
        );

    if (!previousUser) return;

    const messagesBefore =
      chat.messages.slice(0, messageIndex);

    const replacement = {
      role: "assistant",
      content: "",
      streaming: true,
    };

    updateChat(
      chat.id,
      (item) => ({
        ...item,
        messages: [
          ...messagesBefore,
          replacement,
        ],
      })
    );

    setLoading(true);

    const controller =
      new AbortController();

    abortController.current = controller;

    try {
      const response = await fetch(
        "/api/chat",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: MODEL,
            messages: [
              {
                role: "system",
                content:
                  "You are My AI, a helpful and accurate AI assistant.",
              },
              ...messagesBefore,
            ],
          }),
        }
      );

      if (!response.ok) {
        const data =
          await response.json().catch(
            () => ({})
          );

        throw new Error(
          data.error ||
            "Regeneration failed."
        );
      }

      const reader =
        response.body.getReader();

      const decoder =
        new TextDecoder();

      let buffer = "";
      let text = "";

      while (true) {
        const { done, value } =
          await reader.read();

        if (done) break;

        buffer += decoder.decode(
          value,
          { stream: true }
        );

        const lines =
          buffer.split("\n");

        buffer =
          lines.pop() || "";

        for (const line of lines) {
          if (
            !line.startsWith("data:")
          )
            continue;

          const data =
            line.slice(5).trim();

          if (data === "[DONE]")
            continue;

          try {
            const json =
              JSON.parse(data);

            const delta =
              json.choices?.[0]?.delta
                ?.content;

            if (delta) {
              text += delta;

              updateMessage(
                chat.id,
                messagesBefore.length,
                text,
                {
                  streaming: true,
                }
              );
            }
          } catch {
            // Ignore malformed/incomplete chunks.
          }
        }
      }

      updateMessage(
        chat.id,
        messagesBefore.length,
        text ||
          "No response generated.",
        {
          streaming: false,
        }
      );
    } catch (error) {
      updateMessage(
        chat.id,
        messagesBefore.length,
        `Error: ${error.message}`,
        {
          streaming: false,
        }
      );
    } finally {
      setLoading(false);
      abortController.current = null;
    }
  }

  return (
    <div className="app">
      <Sidebar
        chats={chats}
        activeChat={activeChat}
        onNewChat={newChat}
        onSelectChat={selectChat}
        onDeleteChat={deleteChat}
        onRenameChat={renameChat}
        mobileOpen={mobileSidebar}
        onClose={() =>
          setMobileSidebar(false)
        }
      />

      <main className="main">
        <header className="topbar">
          <button
            className="mobile-menu"
            onClick={() =>
              setMobileSidebar(true)
            }
          >
            ☰
          </button>

          <div className="topbar-title">
            {currentChat?.title ||
              "New chat"}
          </div>

          <div className="model-badge">
            Gemini Flash
          </div>
        </header>

        <div className="chat-area">
          {!currentChat ||
          currentChat.messages.length === 0 ? (
            <Welcome
              onSuggestion={(text) =>
                sendMessage(text)
              }
            />
          ) : (
            <div className="messages">
              {currentChat.messages.map(
                (message, index) => (
                  <Message
                    key={index}
                    message={message}
                    onCopy={copyText}
                    onRegenerate={() =>
                      regenerate(index)
                    }
                  />
                )
              )}
            </div>
          )}
        </div>

        <ChatInput
          input={input}
          setInput={setInput}
          onSend={() => sendMessage()}
          onStop={stopGeneration}
          loading={loading}
        />
      </main>
    </div>
  );
}

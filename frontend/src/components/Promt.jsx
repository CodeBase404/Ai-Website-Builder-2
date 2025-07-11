import { useState, useEffect, useRef } from "react";
import { ArrowUp, Globe, Bot, Loader2, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { tomorrow as codeTheme } from "react-syntax-highlighter/dist/esm/styles/prism";
import axiosClient from "../utils/axiosClient";
import { useNavigate, useParams } from "react-router";
import ProgressiveLoader from "./ProgressiveLoader";

function Promt({
  promt,
  setPromt,
  onPromptComplete,
  setInitialFiles,
  setIsSidebarOpen,
  chatLoading,
  setChatLoading,
  codeLoading,
  setMode,
  mode,
}) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const promtEndRef = useRef(null);
  const textareaRef = useRef(null);
  const navigate = useNavigate();
  const { chatId: paramChatId } = useParams();
  const [chatId, setChatId] = useState(paramChatId || null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  useEffect(() => {
    promtEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [promt]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!loading) {
        handleSendPrompt();
      }
    }
  };

  useEffect(() => {
    const loadChat = async () => {
      if (!paramChatId) {
        setChatId(null);
        setPromt([]);
        return;
      }

      setChatLoading(true);
      setPromt([]);

      try {
        const res = await axiosClient.get(`/chat/info/${paramChatId}`);

        if (res.data.success) {
          const fetchedChat = res.data.chat;

          const formattedMessages = fetchedChat.messages.map((m) => ({
            role: m.role === "user" ? "user" : "model",
            content: m.parts?.[0]?.text || "",
          }));

          if (fetchedChat.messages) {
            const lastModelMessageWithFiles = [...fetchedChat.messages]
              .reverse()
              .find(
                (msg) =>
                  msg.role === "model" && msg.files && msg.files.length > 0
              );

            if (lastModelMessageWithFiles) {
              const extractedFiles = {};
              for (const file of lastModelMessageWithFiles.files) {
                extractedFiles[file.path] = { code: file.content };
              }

              setInitialFiles(extractedFiles);
            }
          }

          console.log(formattedMessages);

          setPromt(formattedMessages);
          setChatId(paramChatId);
        }
      } catch (err) {
        console.error("Failed to load chat:", err);
        setPromt([
          {
            role: "model",
            content: "⚠️ Failed to load this chat.",
          },
        ]);
      } finally {
        setChatLoading(false);
      }
    };

    loadChat();
  }, [paramChatId]);

  const handleSendPrompt = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    setPromt((prev) => [
      ...prev,
      { role: "user", content: trimmedInput },
      { role: "model", content: "" },
    ]);

    setInput("");
    setLoading(true);

    const controller = new AbortController();
    const signal = controller.signal;

    try {
      const endpoint = chatId ? `/chat/explain/${chatId}` : "/chat/explain";
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}${endpoint}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            message: trimmedInput,
          }),
          signal,
        }
      );

      if (!response.ok || !response.body) {
        throw new Error("Failed to fetch or stream response.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let accumulated = "";

      // ✅ Fix: use buffer + flush to avoid too many setPromt calls
      let buffer = "";
      let flushTimeout = null;

      const flushBuffer = () => {
        if (!buffer) return;
        setPromt((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last.role === "model") {
            last.content += buffer;
          }
          return [...updated.slice(0, -1), last];
        });
        buffer = "";
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          flushBuffer(); // flush remaining buffer
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;

        for (let char of chunk) {
          buffer += char;
          await new Promise((resolve) => setTimeout(resolve, 5));

          if (!flushTimeout) {
            flushTimeout = setTimeout(() => {
              flushBuffer();
              flushTimeout = null;
            }, 50);
          }
        }
      }

      const newChatId = response.headers.get("X-Chat-Id");
      const effectiveChatId = newChatId || chatId;

      if (newChatId) {
        setChatId(newChatId);
        await navigate(`/chat/${newChatId}`);
      }

      if (onPromptComplete && trimmedInput) {
        onPromptComplete(trimmedInput, effectiveChatId);
      }
      setIsSidebarOpen((prev) => ({
        ...prev,
        workflowBar: true,
      }));
    } catch (error) {
      console.error("Chat error:", error.message || error);
      setPromt((prev) => [
        ...prev,
        { role: "model", content: "⚠️ Failed to fetch response." },
      ]);
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  };

  if (chatLoading)
    return (
      <div
        className={`flex ${
          promt.length === 0 ? "" : " w-full md:w-[80%] mx-auto lg:w-120"
        } h-full flex-col gap-3 pt-5 p-2`}
      >
        <div className="flex justify-end ">
          <div className="skeleton h-13.5 w-[50%] bg-white/20"></div>
        </div>
        <div className="skeleton h-30 w-[80%] bg-white/20"></div>
        <div className="flex justify-end">
          <div className="skeleton h-20 w-[40%] bg-white/20"></div>
        </div>
        <div className="skeleton h-25 w-[70%] bg-white/20"></div>
        <div className="flex justify-end">
          <div className="skeleton h-20 w-[60%] bg-white/20"></div>
        </div>
        <div className="skeleton h-18 w-[70%] bg-white/20"></div>
        <div className="flex justify-center mt-3">
          <div className="skeleton h-30 w-[100%] bg-white/20"></div>
        </div>
      </div>
    );

  return (
    <div
      className={`flex flex-col items-center justify-between flex-1 ${
        promt.length == 0 ? "" : "h-full"
      } w-full px-4 pb-4`}
    >
      <div
        className={` text-center ${promt.length == 0 ? "" : "hidden"} ${
          paramChatId ? "hidden" : ""
        } mb-15`}
      >
        <div className="flex items-center gap-3 text-2xl md:text-4xl font-semibold text-white mb-3">
          What do you want to build?
        </div>
        <p className="text-gray-400 text-sm md:text-[16px] mt-4">
          Create stunning apps & websites by chatting with AI.
        </p>
      </div>

      {/* Chat Section */}
      <div
        className={`w-full max-w-2xl lg:max-w-md ml-3 flex-1 overflow-y-auto scroll-hidden ${
          promt.length == 0 ? "" : "pt-6 pb-25"
        }  space-y-4 max-h-[75vh] px-1`}
      >
        {promt.map((msg, index) => (
          <div
            key={index}
            className={`w-full flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {msg.role === "model" ? (
              <div className="w-full  text-white rounded-xl py-3 text-[16px] whitespace-pre-wrap">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ node, inline, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || "");
                      return !inline && match ? (
                        <SyntaxHighlighter
                          style={codeTheme}
                          language={match[1]}
                          PreTag="div"
                          className="rounded-lg mt-2"
                          {...props}
                        >
                          {String(children).replace(/\n$/, "")}
                        </SyntaxHighlighter>
                      ) : (
                        <code
                          className="bg-gray-800 px-1 py-0.5 rounded"
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
                {index === promt.length - 1 &&
                  loading &&
                  msg.role === "model" &&
                  msg.content === "" && (
                    <ProgressiveLoader codeLoading={loading} />
                  )}
              </div>
            ) : (
              <div className="max-w-[80%] bg-blue-600 text-white rounded-lg p-3 text-sm whitespace-pre-wrap self-start">
                {msg.content}
              </div>
            )}
          </div>
        ))}
        {codeLoading && <ProgressiveLoader codeLoading={codeLoading} />}
        <div ref={promtEndRef} />
      </div>

      <div
        className={`max-w-2xl px-1 lg:max-w-110 ${
          promt.length === 0 ? "max-w-xl!" : ""
        } ${paramChatId ? "fixed bottom-5 mr-1" : ""} w-[96%] md:w-[100%]`}
      >
        <div
          className={`relative shadow shadow-purple-200  rounded-xl px-4 py-4`}
        >
          <div className="absolute -top-7 right-5 flex gap-2">
            <button
              onClick={() => setMode("game")}
              className={`px-3 py-1 cursor-pointer rounded-t-lg text-sm font-medium shadow transition ${
                mode === "game"
                  ? "bg-white text-black"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              🎮 Game
            </button>
            <button
              onClick={() => setMode("website")}
              className={`px-3 py-1 cursor-pointer rounded-t-lg text-sm font-medium shadow transition ${
                mode === "website"
                  ? "bg-white text-black"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              🌐 Website
            </button>
          </div>

          <textarea
            type="text"
            ref={textareaRef}
            value={input}
            autoFocus
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your idea and we'll bring it to life"
            className="flex-1 bg-transparent w-full text-white placeholder-gray-500 text-sm outline-none resize-none overflow-y-auto max-h-40 p-4"
            onKeyDown={handleKeyDown}
          />

          <button
            onClick={handleSendPrompt}
            disabled={loading || input.trim().length === 0}
            className={`absolute top-7 right-5 p-2 rounded-full text-white transition 
                ${
                  loading || input.trim().length === 0
                    ? "hidden"
                    : "bg-blue-600 hover:bg-blue-700 cursor-pointer"
                }`}
          >
            <ArrowUp className="w-4 h-4 " />
          </button>
        </div>
      </div>
    </div>
  );
}

export default Promt;

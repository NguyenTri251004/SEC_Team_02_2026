import { useMemo, useRef, useState } from "react";
import {
  Alert,
  Button,
  Drawer,
  Empty,
  FloatButton,
  Input,
  Space,
  Tag,
  Typography,
} from "antd";
import { MessageOutlined, RobotOutlined, SendOutlined, UserOutlined } from "@ant-design/icons";
import { chatApi } from "../../services/api";
import type { ChatCitation } from "../../types";

const { Text, Paragraph } = Typography;

interface ChatAssistantProps {
  enabled?: boolean;
}

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  citations?: ChatCitation[];
};

const MAX_QUESTION_LENGTH = 1000;

function buildMessageId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
}

export default function ChatAssistant({ enabled = true }: ChatAssistantProps) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const canSubmit = useMemo(
    () => question.trim().length > 0 && question.trim().length <= MAX_QUESTION_LENGTH && !isLoading,
    [isLoading, question],
  );

  if (!enabled) {
    return null;
  }

  const scrollToBottom = () => {
    window.requestAnimationFrame(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      }
    });
  };

  const handleSend = async () => {
    const normalizedQuestion = question.trim();

    if (!normalizedQuestion || normalizedQuestion.length > MAX_QUESTION_LENGTH || isLoading) {
      return;
    }

    const userMessage: ChatMessage = {
      id: buildMessageId(),
      role: "user",
      content: normalizedQuestion,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");
    setError(null);
    setIsLoading(true);
    scrollToBottom();

    try {
      const response = await chatApi.ask({
        question: normalizedQuestion,
        locale: "vi-VN",
      });

      const answer = response.data;
      const assistantMessage: ChatMessage = {
        id: buildMessageId(),
        role: "assistant",
        content: answer.answer,
        createdAt: answer.generated_at,
        citations: answer.citations,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      scrollToBottom();
    } catch {
      setError("Không thể gửi câu hỏi tới chatbot. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <FloatButton
        icon={<MessageOutlined />}
        type="primary"
        tooltip={<div>Chat với IMS Assistant</div>}
        onClick={() => setOpen(true)}
        style={{ right: 24, bottom: 24 }}
      />

      <Drawer
        title={
          <Space>
            <RobotOutlined />
            <span>IMS Chatbot Assistant</span>
          </Space>
        }
        placement="right"
        width={420}
        open={open}
        onClose={() => setOpen(false)}
        destroyOnClose={false}
        extra={
          <Button
            size="small"
            onClick={() => {
              setMessages([]);
              setError(null);
            }}
            disabled={isLoading || messages.length === 0}
          >
            Xóa hội thoại
          </Button>
        }
      >
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          {error ? <Alert type="error" showIcon message={error} /> : null}

          <div
            ref={scrollContainerRef}
            role="log"
            aria-live="polite"
            aria-relevant="additions text"
            style={{
              maxHeight: "52vh",
              overflowY: "auto",
              paddingRight: 4,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {messages.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Đặt câu hỏi về tồn kho, lô hàng, QC, giao dịch..."
              />
            ) : (
              messages.map((message) => {
                const isUser = message.role === "user";

                return (
                  <div
                    key={message.id}
                    style={{
                      alignSelf: isUser ? "flex-end" : "flex-start",
                      maxWidth: "92%",
                      background: isUser ? "#e6f4ff" : "#f6ffed",
                      border: "1px solid #d9d9d9",
                      borderRadius: 12,
                      padding: "10px 12px",
                    }}
                  >
                    <Space size={6} style={{ marginBottom: 4 }}>
                      {isUser ? <UserOutlined /> : <RobotOutlined />}
                      <Text strong>{isUser ? "Bạn" : "Assistant"}</Text>
                    </Space>
                    <Paragraph style={{ marginBottom: 4, whiteSpace: "pre-wrap" }}>{message.content}</Paragraph>

                    {message.citations && message.citations.length > 0 ? (
                      <Space wrap size={[6, 6]}>
                        {message.citations.slice(0, 3).map((citation) => (
                          <Tag key={citation.chunk_id} color="blue">
                            {citation.source_uri}
                          </Tag>
                        ))}
                      </Space>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>

          <Input.TextArea
            placeholder="Nhập câu hỏi cho chatbot..."
            autoSize={{ minRows: 3, maxRows: 6 }}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onPressEnter={(event) => {
              if (!event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                void handleSend();
              }
            }}
            maxLength={MAX_QUESTION_LENGTH}
            disabled={isLoading}
          />

          <Space style={{ width: "100%", justifyContent: "space-between" }}>
            <Text type="secondary">{question.trim().length}/{MAX_QUESTION_LENGTH}</Text>
            <Button type="primary" icon={<SendOutlined />} onClick={() => void handleSend()} loading={isLoading} disabled={!canSubmit}>
              Gửi
            </Button>
          </Space>
        </Space>
      </Drawer>
    </>
  );
}

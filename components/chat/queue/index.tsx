// MessageQueue — shows pending sub-agent tasks and queued user messages.
// Uses the official AI Elements Queue component with the QueueTodo shape.
// https://elements.ai-sdk.dev/components/queue
//
// Pattern follows the official Queue example exactly:
//   - Queue wraps everything
//   - QueueSection with QueueSectionTrigger + QueueSectionContent
//   - QueueList + QueueItem + QueueItemIndicator + QueueItemContent + etc.
//
// We use the official QueueTodo type for sub-agent tasks and add a
// separate "queued messages" section for user messages pending
// submission while the current response is streaming.

"use client";

import {
  Queue,
  QueueSection,
  QueueSectionTrigger,
  QueueSectionLabel,
  QueueSectionContent,
  QueueList,
  QueueItem,
  QueueItemIndicator,
  QueueItemContent,
  QueueItemDescription,
  QueueItemActions,
  QueueItemAction,
  type QueueTodo,
} from "@/components/ai-elements/queue";
import { ClockIcon, ListChecksIcon, Trash2 } from "lucide-react";

export interface QueuedMessage {
  id: string;
  text: string;
}

export interface MessageQueueProps {
  // Sub-agent tasks / todos
  todos: QueueTodo[];
  // Queued user messages (sent while previous response is streaming)
  messages: QueuedMessage[];
  onRemoveTodo?: (id: string) => void;
  onRemoveMessage?: (id: string) => void;
}

export default function MessageQueue({
  todos,
  messages,
  onRemoveTodo,
  onRemoveMessage,
}: MessageQueueProps) {
  const todoCount = todos.length;
  const msgCount = messages.length;

  if (todoCount === 0 && msgCount === 0) return null;

  return (
    <Queue className="mx-2 sm:mx-3 md:mx-0 not-prose">
      {/* Sub-agent todos / tasks */}
      {todoCount > 0 && (
        <QueueSection defaultOpen>
          <QueueSectionTrigger>
            <QueueSectionLabel
              count={todoCount}
              label={todoCount === 1 ? "task" : "tasks"}
              icon={<ListChecksIcon className="size-3.5 text-teal" />}
            />
          </QueueSectionTrigger>
          <QueueSectionContent>
            <QueueList>
              {todos.map((todo) => {
                const isCompleted = todo.status === "completed";
                return (
                  <QueueItem key={todo.id}>
                    <div className="flex items-center gap-2">
                      <QueueItemIndicator completed={isCompleted} />
                      <QueueItemContent completed={isCompleted}>
                        {todo.title}
                      </QueueItemContent>
                      {onRemoveTodo && (
                        <QueueItemActions>
                          <QueueItemAction
                            onClick={() => onRemoveTodo(todo.id)}
                            aria-label="Remove task"
                          >
                            <Trash2 className="size-3" />
                          </QueueItemAction>
                        </QueueItemActions>
                      )}
                    </div>
                    {todo.description && (
                      <QueueItemDescription completed={isCompleted}>
                        {todo.description}
                      </QueueItemDescription>
                    )}
                  </QueueItem>
                );
              })}
            </QueueList>
          </QueueSectionContent>
        </QueueSection>
      )}

      {/* Queued user messages */}
      {msgCount > 0 && (
        <QueueSection defaultOpen>
          <QueueSectionTrigger>
            <QueueSectionLabel
              count={msgCount}
              label={msgCount === 1 ? "queued message" : "queued messages"}
              icon={<ClockIcon className="size-3.5 text-muted-foreground" />}
            />
          </QueueSectionTrigger>
          <QueueSectionContent>
            <QueueList>
              {messages.map((m) => {
                const preview = m.text.length > 80 ? `${m.text.slice(0, 80)}…` : m.text;
                return (
                  <QueueItem key={m.id}>
                    <div className="flex items-center gap-2">
                      <QueueItemIndicator />
                      <QueueItemContent title={m.text}>
                        {preview}
                      </QueueItemContent>
                      {onRemoveMessage && (
                        <QueueItemActions>
                          <QueueItemAction
                            onClick={() => onRemoveMessage(m.id)}
                            aria-label="Remove from queue"
                          >
                            <Trash2 className="size-3" />
                          </QueueItemAction>
                        </QueueItemActions>
                      )}
                    </div>
                  </QueueItem>
                );
              })}
            </QueueList>
          </QueueSectionContent>
        </QueueSection>
      )}
    </Queue>
  );
}

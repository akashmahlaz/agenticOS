// ChatHeader — Gemini-style top bar
// Three sections: hamburger (left) | model picker (center) | sparkle (right)
// Model picker uses official AI Elements ModelSelector (Dialog + Command).

"use client";

import { useState } from "react";
import {
  MenuIcon,
  ChevronDownIcon,
  SparklesIcon,
  XIcon,
  CheckIcon,
} from "lucide-react";
import {
  ModelSelector,
  ModelSelectorTrigger,
  ModelSelectorContent,
  ModelSelectorInput,
  ModelSelectorList,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorItem,
  ModelSelectorName,
  ModelSelectorShortcut,
} from "@/components/ai-elements/model-selector";
import { GeminiSparkle } from "@/components/icons/gemini-sparkle";
import { MiniMaxMark } from "@/components/icons/minimax-mark";
import { getGroupedModels, getModel } from "@/lib/models";

export interface ChatHeaderProps {
  onMenuClick?: () => void;
  isTempMode: boolean;
  isShared: boolean;
  hasSession: boolean;
  onExitTemp: () => void;
  onStartTemp: () => void;
  onToggleShare: () => void;
  // Model picker
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  // Right action (new chat)
  onRightAction?: () => void;
}

export default function ChatHeader(props: ChatHeaderProps) {
  const [modelOpen, setModelOpen] = useState(false);
  const currentModel = getModel(props.selectedModel);
  const grouped = getGroupedModels();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-2 md:px-4 h-12 flex-shrink-0 bg-background">
      {/* Left — hamburger menu */}
      <div className="flex items-center justify-start w-12">
        {props.onMenuClick && (
          <button
            onClick={props.onMenuClick}
            className="h-10 w-10 flex items-center justify-center rounded-full text-foreground hover:bg-muted/40 transition-colors"
            aria-label="Open menu"
          >
            <MenuIcon size={22} strokeWidth={1.75} />
          </button>
        )}
      </div>

      {/* Center — model picker */}
      <div className="flex items-center justify-center flex-1 min-w-0">
        {props.isTempMode ? (
          <button
            onClick={props.onExitTemp}
            className="flex items-center gap-1 h-9 px-3 rounded-full text-foreground hover:bg-muted/40 transition-colors"
          >
            <XIcon size={14} />
            <span className="text-[13px] font-medium">Temporary chat</span>
          </button>
        ) : (
          <ModelSelector open={modelOpen} onOpenChange={setModelOpen}>
            <ModelSelectorTrigger asChild>
              <button
                className="flex items-center gap-1.5 h-9 px-3 rounded-full text-foreground hover:bg-muted/40 transition-colors"
                aria-label="Select model"
              >
                <SparklesIcon size={15} className="text-teal" />
                <span className="text-[15px] font-medium">{currentModel.name}</span>
                <ChevronDownIcon size={15} className="text-muted-foreground" />
              </button>
            </ModelSelectorTrigger>
            <ModelSelectorContent
              title="Select a model"
              className="sm:max-w-md"
            >
              <ModelSelectorInput placeholder="Search models…" />
              <ModelSelectorList>
                <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
                {grouped.map(({ group, models }) => (
                  <ModelSelectorGroup heading={group} key={group}>
                    {models.map((m) => (
                      <ModelSelectorItem
                        key={m.id}
                        value={m.id}
                        onSelect={() => {
                          props.onModelChange(m.id);
                          setModelOpen(false);
                        }}
                        className="flex items-center gap-2 py-2"
                      >
                        <MiniMaxMark size={20} />
                        <div className="flex flex-col flex-1 min-w-0">
                          <ModelSelectorName className="text-sm font-medium">
                            {m.name}
                          </ModelSelectorName>
                          <span className="text-[11px] text-muted-foreground">
                            {m.description}
                          </span>
                        </div>
                        {m.badge && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal/15 text-teal font-medium uppercase tracking-wide">
                            {m.badge}
                          </span>
                        )}
                        {m.id === props.selectedModel && (
                          <CheckIcon
                            size={14}
                            className="text-teal flex-shrink-0"
                          />
                        )}
                        {m.badge && (
                          <ModelSelectorShortcut className="hidden">
                            {m.badge}
                          </ModelSelectorShortcut>
                        )}
                      </ModelSelectorItem>
                    ))}
                  </ModelSelectorGroup>
                ))}
              </ModelSelectorList>
            </ModelSelectorContent>
          </ModelSelector>
        )}
      </div>

      {/* Right — sparkle / new chat */}
      <div className="flex items-center justify-end w-12">
        <button
          onClick={props.onRightAction}
          className="h-10 w-10 flex items-center justify-center rounded-full text-foreground hover:bg-muted/40 transition-colors"
          aria-label="New chat"
        >
          <GeminiSparkle size={20} idPrefix="header-sparkle" />
        </button>
      </div>
    </header>
  );
}

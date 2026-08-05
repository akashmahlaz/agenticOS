// ChatHeader — top bar with model selector, share button, menu, etc.

"use client";

import { useState } from "react";
import {
  MenuIcon,
  ShareIcon,
  CheckIcon,
  SparklesIcon,
  MessageCircleDashedIcon,
  XIcon,
  CopyIcon,
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
} from "@/components/ai-elements/model-selector";
import { Button } from "@/components/ui/button";

const MODELS = [
  { id: "MiniMax-M2", name: "M2", logo: <SparklesIcon size={12} />, provider: "agenticOS" },
];

export interface ChatHeaderProps {
  onMenuClick: () => void;
  isTempMode: boolean;
  onExitTemp: () => void;
  onStartTemp: () => void;
  model: string;
  onModelChange: (model: string) => void;
  isShared: boolean;
  shareToken: string | null;
  onToggleShare: () => void;
  showShareBanner: boolean;
  copied: boolean;
  onCopyShare: () => void;
}

export default function ChatHeader(props: ChatHeaderProps) {
  const [modelOpen, setModelOpen] = useState(false);

  return (
    <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <Button
          variant="ghost"
          size="icon"
          onClick={props.onMenuClick}
          className="md:hidden -ml-1.5"
        >
          <MenuIcon size={18} />
        </Button>

        <ModelSelector open={modelOpen} onOpenChange={setModelOpen}>
          <ModelSelectorTrigger>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2.5 gap-1.5 rounded-full hover:bg-muted font-medium"
            >
              <SparklesIcon size={14} className="text-primary" />
              <span className="text-[13px]">
                {MODELS.find((m) => m.id === props.model)?.name || "M2"}
              </span>
            </Button>
          </ModelSelectorTrigger>
          <ModelSelectorContent>
            <ModelSelectorInput placeholder="Search models…" />
            <ModelSelectorList>
              <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
              <ModelSelectorGroup heading="agenticOS">
                {MODELS.map((m) => (
                  <ModelSelectorItem
                    key={m.id}
                    value={m.id}
                    onSelect={() => {
                      props.onModelChange(m.id);
                      setModelOpen(false);
                    }}
                  >
                    <span className="mr-2">{m.logo}</span>
                    <ModelSelectorName>{m.name}</ModelSelectorName>
                    {props.model === m.id && (
                      <CheckIcon size={12} className="ml-auto" />
                    )}
                  </ModelSelectorItem>
                ))}
              </ModelSelectorGroup>
            </ModelSelectorList>
          </ModelSelectorContent>
        </ModelSelector>

        {props.isTempMode && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-warning/10 text-warning text-xs font-medium">
            <MessageCircleDashedIcon size={12} />
            <span>Temp</span>
            <button
              onClick={props.onExitTemp}
              className="ml-1 hover:opacity-70"
              aria-label="Exit temp"
            >
              <XIcon size={11} />
            </button>
          </div>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          {!props.isTempMode && (
            <Button
              variant={props.isShared ? "default" : "ghost"}
              size="sm"
              onClick={props.onToggleShare}
              className="h-8 px-2.5 gap-1.5 rounded-full text-xs"
            >
              {props.isShared ? (
                <>
                  <CheckIcon size={12} />
                  <span>Shared</span>
                </>
              ) : (
                <>
                  <ShareIcon size={12} />
                  <span>Share</span>
                </>
              )}
            </Button>
          )}
          {!props.isTempMode && !props.isShared && (
            <Button
              variant="ghost"
              size="icon"
              onClick={props.onStartTemp}
              className="h-8 w-8 rounded-full"
              aria-label="Temporary chat"
            >
              <MessageCircleDashedIcon size={14} />
            </Button>
          )}
        </div>
      </div>

      {/* Share banner */}
      {props.showShareBanner && props.shareToken && (
        <div className="px-3 py-2 bg-primary/10 border-t border-primary/20 flex items-center gap-2 text-xs">
          <span className="text-muted-foreground flex-1 truncate font-mono">
            {typeof window !== "undefined" ? window.location.origin : ""}/share/{props.shareToken}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={props.onCopyShare}
            className="h-6 px-2 text-xs"
          >
            {props.copied ? <CheckIcon size={11} /> : <CopyIcon size={11} />}
            <span className="ml-1">{props.copied ? "Copied" : "Copy"}</span>
          </Button>
        </div>
      )}
    </div>
  );
}

// ChatHeader — simple top bar with menu button + model name

"use client";

import {
  MenuIcon,
  MessageCircleDashedIcon,
  XIcon,
  SparklesIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useShell } from "./shell-context";

export interface ChatHeaderProps {
  onMenuClick?: () => void;
  isTempMode: boolean;
  onExitTemp: () => void;
  onStartTemp: () => void;
  model: string;
}

export default function ChatHeader(props: ChatHeaderProps) {
  const shell = useShell();
  const handleMenuClick = props.onMenuClick ?? shell.openDrawer;
  return (
    <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleMenuClick}
          className="md:hidden -ml-1.5"
        >
          <MenuIcon size={18} />
        </Button>

        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-muted/40">
          <SparklesIcon size={14} className="text-primary" />
          <span className="text-[13px] font-medium">agenticOS</span>
        </div>

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
              variant="ghost"
              size="icon"
              onClick={props.onStartTemp}
              className="h-8 w-8 rounded-full"
              aria-label="Temporary chat"
              title="Temporary chat"
            >
              <MessageCircleDashedIcon size={14} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

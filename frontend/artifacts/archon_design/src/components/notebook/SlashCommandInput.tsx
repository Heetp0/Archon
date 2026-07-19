import React, { useState, useRef, useEffect } from "react";
import { SLASH_COMMANDS, type SlashCommand } from "@/types/notebook";
import { PaperPlaneRight } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SlashCommandInputProps {
  onSend: (text: string, command?: SlashCommand) => void;
  disabled?: boolean;
}

export default function SlashCommandInput({ onSend, disabled }: SlashCommandInputProps) {
  const [value, setValue] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [menuIndex, setMenuIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const commandList = Object.entries(SLASH_COMMANDS) as [SlashCommand, string][];
  const filteredCommands = commandList.filter(([cmd]) => {
    if (!value.startsWith("/")) return false;
    const partial = value.substring(1).toLowerCase();
    return cmd.startsWith(partial);
  });

  useEffect(() => {
    if (value.startsWith("/") && filteredCommands.length > 0) {
      setShowMenu(true);
    } else {
      setShowMenu(false);
      setMenuIndex(0);
    }
  }, [value, filteredCommands.length]);

  const selectCommand = (cmd: SlashCommand) => {
    setValue(`/${cmd} `);
    setShowMenu(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showMenu) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMenuIndex((prev) => (prev + 1) % filteredCommands.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setMenuIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        selectCommand(filteredCommands[menuIndex][0]);
      } else if (e.key === "Escape") {
        setShowMenu(false);
      }
      return;
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!value.trim() || disabled) return;

    let text = value.trim();
    let command: SlashCommand | undefined;

    // Check if starts with a valid command
    if (text.startsWith("/")) {
      const match = text.match(/^\/(\w+)\s*(.*)/);
      if (match) {
        const potentialCmd = match[1] as SlashCommand;
        if (SLASH_COMMANDS[potentialCmd]) {
          command = potentialCmd;
          text = match[2];
        }
      }
    }

    onSend(text, command);
    setValue("");
  };

  return (
    <div className="relative w-full">
      {/* Autocomplete Menu */}
      {showMenu && (
        <div
          ref={menuRef}
          className="absolute bottom-full left-0 w-full mb-1 bg-panel-bg border border-border-core rounded-lg shadow-xl max-h-48 overflow-y-auto z-50 p-1 space-y-0.5"
        >
          {filteredCommands.map(([cmd, desc], idx) => (
            <button
              key={cmd}
              onClick={() => selectCommand(cmd)}
              className={cn(
                "w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-left text-xs transition-colors",
                idx === menuIndex ? "bg-border-core text-text-primary" : "text-text-secondary hover:bg-border-core/40 hover:text-text-primary"
              )}
            >
              <span className="font-mono text-accent-emerald font-medium">/{cmd}</span>
              <span className="text-[10px] text-text-muted truncate ml-4">{desc}</span>
            </button>
          ))}
        </div>
      )}

      {/* Input row */}
      <div className="relative flex items-center w-full bg-app-bg border border-border-core rounded-xl px-2 py-1.5 focus-within:border-accent-emerald/60 transition-colors">
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question or use /command..."
          className="flex-1 bg-transparent border-0 ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-text-primary text-xs h-7 px-1.5"
          disabled={disabled}
        />
        <Button
          onClick={handleSubmit}
          disabled={!value.trim() || disabled}
          size="icon"
          className="w-7 h-7 rounded-lg bg-accent-emerald hover:bg-accent-emerald/80 text-text-on-accent flex-shrink-0"
        >
          <PaperPlaneRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

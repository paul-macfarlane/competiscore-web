"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { ReactNode, useState } from "react";

interface IconOption {
  name: string;
  src: string;
}

interface IconSelectorProps {
  options: readonly IconOption[];
  value: string | undefined;
  onChange: (value: string) => void;
  trigger: ReactNode;
  title: string;
  renderIcon: (option: IconOption, isSelected: boolean) => ReactNode;
}

export function IconSelector({
  options,
  value,
  onChange,
  trigger,
  title,
  renderIcon,
}: IconSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] w-[calc(100%-2rem)] max-w-md overflow-y-auto sm:max-w-lg md:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-4 gap-2 py-2 sm:gap-3 sm:py-4 md:grid-cols-5">
          {options.map((option) => {
            const isSelected = value === option.src;
            return (
              <div
                key={option.name}
                className={cn(
                  "hover:bg-accent flex cursor-pointer flex-col items-center gap-1 rounded-lg p-1.5 transition-all sm:gap-2 sm:p-2",
                  isSelected && "bg-accent ring-primary ring-2",
                )}
                onClick={() => {
                  onChange(option.src);
                  setIsOpen(false);
                }}
              >
                {renderIcon(option, isSelected)}
                <span className="text-center text-[10px] font-medium leading-tight sm:text-xs">
                  {option.name}
                </span>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface SimpleIconSelectorProps {
  options: readonly IconOption[];
  value: string | undefined;
  onChange: (value: string) => void;
  trigger: ReactNode;
  title: string;
  iconClassName?: string;
}

export function SimpleIconSelector({
  options,
  value,
  onChange,
  trigger,
  title,
  iconClassName = "h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14",
}: SimpleIconSelectorProps) {
  return (
    <IconSelector
      options={options}
      value={value}
      onChange={onChange}
      trigger={trigger}
      title={title}
      renderIcon={(option) => (
        <div className={cn("relative", iconClassName)}>
          <Image src={option.src} alt={option.name} fill className="p-1" />
        </div>
      )}
    />
  );
}

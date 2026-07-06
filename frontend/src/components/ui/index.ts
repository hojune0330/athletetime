// Barrel export for the AthleteTime / TRAINORACLE UI kit.
// shadcn primitives + TRAINORACLE domain primitives.

export { Button, buttonVariants, type ButtonProps } from './button';
export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from './card';
export { Badge, badgeVariants, type BadgeProps } from './badge';
export { Input } from './input';
export { Separator } from './separator';
export { Skeleton } from './skeleton';
export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './dialog';
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
} from './dropdown-menu';
export { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';
export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from './command';

// TRAINORACLE domain primitives
export {
  ENERGY,
  EnergyTag,
  MainMark,
  Verdict,
  MetricCell,
  SectionHeader,
  type EnergySystem,
  type VerdictKind,
} from './trainoracle';
